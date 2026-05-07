-- Élargit la RPC apporteur_update_lead_status aux collaborateurs.
-- Contexte : tous les collaborateurs sont aussi apporteurs de leurs propres
-- leads. Le check `role = 'apporteur'` les bloquait à tort. La sécurité réelle
-- (caller = apporteur du lead) reste assurée par le check v_lead_apporteur.

CREATE OR REPLACE FUNCTION apporteur_update_lead_status(
  p_lead_id uuid,
  p_new_status text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_lead_apporteur uuid;
  v_lead_assignee uuid;
  v_old_status text;
  v_now timestamptz := now();
  v_allowed_statuses text[] := ARRAY[
    'a_qualifier',
    'inscrit_conference',
    'faux_numero',
    'pas_qualifie',
    'a_relancer',
    'perdu',
    'call_booke',
    'close',
    'pas_de_reponse',
    'pas_de_reponse_post_conference'
  ];
  v_instant_recycle_statuses text[] := ARRAY[
    'pas_de_reponse',
    'pas_de_reponse_post_conference'
  ];
  v_should_recycle boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller;
  -- Autorise apporteur ET collaborateur (les collaborateurs sont aussi
  -- apporteurs de leurs leads). La sécurité réelle reste assurée par le
  -- check v_lead_apporteur = v_caller plus bas.
  IF v_caller_role NOT IN ('apporteur', 'collaborateur') THEN
    RAISE EXCEPTION 'Cette fonction est réservée aux apporteurs et collaborateurs (rôle actuel: %)', v_caller_role;
  END IF;

  IF NOT (p_new_status = ANY(v_allowed_statuses)) THEN
    RAISE EXCEPTION 'Statut "%" non autorisé. Statuts permis: %',
      p_new_status, array_to_string(v_allowed_statuses, ', ');
  END IF;

  SELECT apporteur_id, status, assigned_to INTO v_lead_apporteur, v_old_status, v_lead_assignee
  FROM leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead introuvable';
  END IF;

  IF v_lead_apporteur IS NULL OR v_lead_apporteur <> v_caller THEN
    RAISE EXCEPTION 'Vous ne pouvez modifier que les leads que vous avez apportés';
  END IF;

  IF v_old_status = p_new_status AND (p_note IS NULL OR length(trim(p_note)) = 0) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'changed', false,
      'lead_id', p_lead_id,
      'status', p_new_status
    );
  END IF;

  v_should_recycle := p_new_status = ANY(v_instant_recycle_statuses);

  IF v_should_recycle THEN
    UPDATE leads
    SET status = p_new_status,
        assigned_to = NULL,
        assigned_at = NULL,
        recycled_at = v_now,
        updated_at = v_now
    WHERE id = p_lead_id;
  ELSE
    UPDATE leads
    SET status = p_new_status,
        updated_at = v_now
    WHERE id = p_lead_id;
  END IF;

  IF v_old_status IS DISTINCT FROM p_new_status THEN
    INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note)
    VALUES (
      p_lead_id,
      v_caller,
      'status_change',
      v_old_status,
      p_new_status,
      CASE
        WHEN p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
          'Modification par l''apporteur — ' || trim(p_note)
        ELSE
          'Modification par l''apporteur'
      END
    );
  ELSIF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO lead_activities (lead_id, user_id, action, note)
    VALUES (
      p_lead_id,
      v_caller,
      'note_added',
      'Note de l''apporteur — ' || trim(p_note)
    );
  END IF;

  IF v_should_recycle THEN
    IF v_lead_assignee IS NOT NULL THEN
      INSERT INTO lead_activities (lead_id, user_id, action, old_value, note)
      VALUES (
        p_lead_id,
        v_caller,
        'unassigned',
        v_lead_assignee::text,
        'Désaffecté automatiquement suite au statut "' || p_new_status || '" appliqué par l''apporteur'
      );
    END IF;
    INSERT INTO lead_activities (lead_id, user_id, action, note)
    VALUES (
      p_lead_id,
      v_caller,
      'recycled',
      'Recyclage instantané — statut "' || p_new_status || '" appliqué par l''apporteur'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'changed', true,
    'recycled', v_should_recycle,
    'lead_id', p_lead_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  );
END;
$$;
