-- ═══════════════════════════════════════════════════════════════════════════
-- Bug fix : auto_assign_new_lead_to_contact_collab cassait l'INSERT du lead.
--
-- SYMPTÔME
--   Plusieurs apporteurs remontaient une erreur "Un problème est survenu" à
--   la soumission du formulaire quiz apporteur. L'edge function
--   submit-quiz-lead retournait un 500.
--
-- CAUSE
--   Le trigger BEFORE INSERT `auto_assign_new_lead_to_contact_collab` tente
--   un `INSERT INTO lead_activities (lead_id, ...) VALUES (NEW.id, ...)`
--   AVANT que la ligne `leads` ne soit insérée. La FK
--   `lead_activities_lead_id_fkey` est NOT DEFERRABLE, donc elle échoue
--   immédiatement avec 23503 :
--     "Key (lead_id)=(...) is not present in table 'leads'"
--   et l'ensemble de l'INSERT du lead rollback.
--
--   Cette branche ne se déclenche QUE quand un autre lead actif (non recyclé)
--   du même contact possède déjà un `assigned_to`. Pour un contact nouveau,
--   pas de bug ; pour un contact déjà connu du CRM, 500 systématique.
--
--   Reproduction confirmée en base via une transaction de test (rollbackée).
--   Aucune ligne `lead_activities` n'a jamais été créée avec le wording
--   actuel ("est déjà attribué") — la branche n'a JAMAIS fonctionné en prod.
--
-- FIX
--   On scinde la responsabilité du trigger :
--     1. BEFORE INSERT : modifie `NEW.assigned_to` / `NEW.assigned_at` et
--        stocke la source d'héritage dans un GUC local transactionnel
--        (visible uniquement par les triggers de la même transaction).
--     2. AFTER INSERT  : lit le GUC, insère la lead_activity maintenant que
--        `leads.id` existe (la FK est satisfaite).
--
--   Le GUC est local (3e arg `true` de set_config) donc auto-nettoyé en fin
--   de transaction, pas de fuite d'état entre requêtes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Trigger BEFORE INSERT : ne fait plus que muter NEW ───
CREATE OR REPLACE FUNCTION public.auto_assign_new_lead_to_contact_collab()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing_assignee uuid;
  v_has_recycled boolean;
  v_inherit_source text;
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Règle 1 : autre lead non-recyclé du contact avec assignee
  SELECT assigned_to INTO v_existing_assignee
  FROM leads
  WHERE contact_id = NEW.contact_id
    AND assigned_to IS NOT NULL
    AND recycled_at IS NULL
  ORDER BY assigned_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_existing_assignee IS NOT NULL THEN
    NEW.assigned_to := v_existing_assignee;
    NEW.assigned_at := now();
    v_inherit_source := 'lead';
  ELSE
    -- Règle 2 : reset volontaire détecté → ne pas hériter du call
    SELECT EXISTS(
      SELECT 1 FROM leads
      WHERE contact_id = NEW.contact_id
        AND recycled_at IS NOT NULL
    ) INTO v_has_recycled;

    IF NOT v_has_recycled THEN
      -- Règle 3 : fallback sur les calls non-cancelled
      SELECT assigned_to INTO v_existing_assignee
      FROM calls
      WHERE contact_id = NEW.contact_id
        AND assigned_to IS NOT NULL
        AND status IS DISTINCT FROM 'cancelled'
      ORDER BY scheduled_at DESC NULLS LAST, created_at DESC
      LIMIT 1;

      IF v_existing_assignee IS NOT NULL THEN
        NEW.assigned_to := v_existing_assignee;
        NEW.assigned_at := now();
        v_inherit_source := 'call';
      END IF;
    END IF;
  END IF;

  -- Stocke la source dans un GUC local transactionnel pour le trigger AFTER.
  -- Le 3e arg `true` = LOCAL (auto-nettoyé en fin de transaction).
  IF NEW.assigned_to IS NOT NULL AND v_inherit_source IS NOT NULL THEN
    PERFORM set_config(
      'app.auto_assign_inherit_source',
      NEW.id::text || ':' || v_inherit_source,
      true
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ─── 2. Nouveau trigger AFTER INSERT : logge l'activity maintenant que leads.id existe ───
CREATE OR REPLACE FUNCTION public.log_auto_assigned_lead_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_guc text;
  v_parts text[];
  v_lead_id_str text;
  v_inherit_source text;
BEGIN
  v_guc := current_setting('app.auto_assign_inherit_source', true);
  IF v_guc IS NULL OR v_guc = '' THEN
    RETURN NULL;
  END IF;

  -- Format stocké : "<lead_id>:<source>"
  v_parts := string_to_array(v_guc, ':');
  IF array_length(v_parts, 1) < 2 THEN
    RETURN NULL;
  END IF;

  v_lead_id_str := v_parts[1];
  v_inherit_source := v_parts[2];

  -- Sécurité : ne logge que pour le lead courant (un même INSERT batch
  -- pourrait écraser le GUC ; on s'assure qu'on parle bien du lead en cours).
  IF v_lead_id_str <> NEW.id::text THEN
    RETURN NULL;
  END IF;

  INSERT INTO lead_activities (lead_id, user_id, action, new_value, note)
  VALUES (
    NEW.id,
    NEW.assigned_to,
    'assigned',
    NEW.assigned_to::text,
    CASE
      WHEN v_inherit_source = 'lead' THEN
        'Auto-assigné par cohérence : un autre lead du contact est déjà attribué à ce collaborateur'
      WHEN v_inherit_source = 'call' THEN
        'Auto-assigné par cohérence : un appel Calendly avec ce contact est déjà attribué à ce collaborateur'
      ELSE
        'Auto-assigné par cohérence'
    END
  );

  -- Reset du GUC pour ne pas re-logger en cas de second INSERT dans la même
  -- transaction (rare, mais on reste safe).
  PERFORM set_config('app.auto_assign_inherit_source', '', true);

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_log_auto_assigned_lead ON public.leads;
CREATE TRIGGER trg_log_auto_assigned_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_auto_assigned_lead_activity();
