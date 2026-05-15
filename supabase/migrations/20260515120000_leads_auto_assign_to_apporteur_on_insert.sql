-- Étend le trigger BEFORE INSERT auto_assign_new_lead_to_contact_collab pour
-- ajouter une 4e règle : auto-assignation à l'apporteur du lead.
--
-- Règle 4 (à partir du 2026-05-18 00:00 Europe/Paris) :
--   Si après les règles 1-3 le lead n'a toujours pas d'assignee
--   ET qu'il a un apporteur_id → on l'auto-assigne à cet apporteur.
--   Le cron hebdomadaire (release_overdue_apported_leads) prendra le relais :
--   si le lead reste 'a_qualifier' au lundi de la semaine suivante, son
--   assigned_to bascule à NULL et il rejoint le pool "À affecter".
--
-- Le cutoff 2026-05-18 garantit qu'on n'introduit aucun changement de
-- comportement avant cette date (pour les leads créés entre l'application
-- de cette migration et le 18 mai, l'ancien comportement s'applique).
--
-- log_auto_assigned_lead_activity reçoit aussi un libellé dédié pour la
-- nouvelle source 'apporteur'.

CREATE OR REPLACE FUNCTION public.auto_assign_new_lead_to_contact_collab()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
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

  -- Règle 4 (à partir du 2026-05-18) : auto-assignation à l'apporteur
  IF NEW.assigned_to IS NULL
     AND NEW.apporteur_id IS NOT NULL
     AND now() >= TIMESTAMPTZ '2026-05-18 00:00:00+02' THEN
    NEW.assigned_to := NEW.apporteur_id;
    NEW.assigned_at := now();
    v_inherit_source := 'apporteur';
  END IF;

  IF NEW.assigned_to IS NOT NULL AND v_inherit_source IS NOT NULL THEN
    PERFORM set_config(
      'app.auto_assign_inherit_source',
      NEW.id::text || ':' || v_inherit_source,
      true
    );
  END IF;

  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.log_auto_assigned_lead_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
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

  v_parts := string_to_array(v_guc, ':');
  IF array_length(v_parts, 1) < 2 THEN
    RETURN NULL;
  END IF;

  v_lead_id_str := v_parts[1];
  v_inherit_source := v_parts[2];

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
      WHEN v_inherit_source = 'apporteur' THEN
        'Auto-assigné à l''apporteur (sera libéré au pool s''il reste à qualifier à la fin de la semaine)'
      ELSE
        'Auto-assigné par cohérence'
    END
  );

  PERFORM set_config('app.auto_assign_inherit_source', '', true);

  RETURN NULL;
END;
$func$;
