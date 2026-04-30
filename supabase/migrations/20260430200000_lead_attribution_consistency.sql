-- Cohérence d'attribution des leads par contact
--
-- Règle métier : un même contact ne doit jamais être travaillé en parallèle
-- par 2 collaborateurs. Tous ses leads non-recyclés doivent converger vers
-- un seul collab. Le recyclage par le CEO reste l'exception légitime
-- (désaffectation volontaire, prête à être réaffectée).
--
-- Symétrique des triggers existants update_leads_on_call_created (call) et
-- update_lead_call_on_sale (vente) qui propagent déjà le statut + assignation
-- aux autres leads du contact. On ajoute les 2 moments-clés manquants :
--
--   FIX A — BEFORE INSERT : si le contact a déjà un lead assigné non-recyclé,
--           le nouveau lead hérite de l'assigned_to de ce collab.
--
--   FIX B — AFTER UPDATE OF assigned_to : quand un collab prend manuellement
--           un lead, on propage aux autres leads "libres" du même contact
--           (mode strict : on ne touche pas aux leads déjà chez un autre collab,
--           pour éviter les conflits / ping-pong).
--
-- Anti-récursion : le trigger B utilise pg_trigger_depth() < 2 pour ne s'exécuter
-- qu'au top-level (le UPDATE en cascade ne re-déclenchera pas la propagation).

-- ============================================================
-- FIX A : Auto-assign à la création
-- ============================================================

CREATE OR REPLACE FUNCTION auto_assign_new_lead_to_contact_collab()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_assignee uuid;
BEGIN
  -- Si on a déjà un assigné explicite (ex: création manuelle CEO ou bulk),
  -- on ne touche à rien.
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Cherche le dernier collab actif sur ce contact (lead non-recyclé,
  -- assigned_to non-null). Si plusieurs leads, on prend le plus récemment
  -- assigné — c'est le plus représentatif de l'état courant.
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_new_lead ON leads;

CREATE TRIGGER trg_auto_assign_new_lead
BEFORE INSERT ON leads
FOR EACH ROW
WHEN (NEW.contact_id IS NOT NULL AND NEW.recycled_at IS NULL)
EXECUTE FUNCTION auto_assign_new_lead_to_contact_collab();

-- ============================================================
-- FIX B : Propagation à l'assignation manuelle
-- ============================================================

CREATE OR REPLACE FUNCTION propagate_lead_assignment_to_siblings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Pour chaque autre lead du même contact qui est libre (assigned_to NULL
  -- et non-recyclé), on l'attribue au même collab. Mode strict : on ne
  -- touche pas aux leads déjà chez un autre collab.
  FOR r IN
    SELECT id FROM leads
    WHERE contact_id = NEW.contact_id
      AND id <> NEW.id
      AND assigned_to IS NULL
      AND recycled_at IS NULL
    FOR UPDATE
  LOOP
    UPDATE leads
    SET assigned_to = NEW.assigned_to,
        assigned_at = now(),
        updated_at  = now()
    WHERE id = r.id;

    INSERT INTO lead_activities (lead_id, user_id, action, new_value, note)
    VALUES (
      r.id,
      NEW.assigned_to,
      'assigned',
      NEW.assigned_to::text,
      'Auto-assigné par cohérence : un autre lead du contact vient d''être pris par ce collaborateur'
    );
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_lead_assignment ON leads;

-- pg_trigger_depth() = 1 au top-level (action utilisateur), >= 2 en cascade.
-- On limite donc la propagation au tout premier niveau pour éviter la récursion.
CREATE TRIGGER trg_propagate_lead_assignment
AFTER UPDATE OF assigned_to ON leads
FOR EACH ROW
WHEN (
  NEW.assigned_to IS NOT NULL
  AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
  AND NEW.contact_id IS NOT NULL
  AND pg_trigger_depth() < 2
)
EXECUTE FUNCTION propagate_lead_assignment_to_siblings();
