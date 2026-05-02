-- Permet à un apporteur de modifier le statut d'un lead qu'il a apporté.
-- Cas d'usage : sécurité en cas d'oubli du collaborateur ou d'erreur.
--
-- Statuts autorisés (= "intermédiaire" sans les recyclages instantanés) :
--   a_qualifier, inscrit_conference, faux_numero, pas_qualifie, a_relancer,
--   perdu, call_booke, close
--
-- Statuts interdits aux apporteurs :
--   pas_de_reponse, pas_de_reponse_post_conference (recyclage instantané).
--
-- L'apporteur n'a toujours AUCUN droit d'UPDATE direct sur la table leads.
-- Tout passe par cette RPC SECURITY DEFINER qui filtre :
--   - Le rôle (apporteur uniquement)
--   - La propriété du lead (apporteur_id = auth.uid())
--   - Le nouveau statut (whitelist)
--   - Les colonnes modifiables (uniquement status, pas assigned_to, etc.)

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
  v_old_status text;
  v_allowed_statuses text[] := ARRAY[
    'a_qualifier',
    'inscrit_conference',
    'faux_numero',
    'pas_qualifie',
    'a_relancer',
    'perdu',
    'call_booke',
    'close'
  ];
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller;
  IF v_caller_role <> 'apporteur' THEN
    RAISE EXCEPTION 'Cette fonction est réservée aux apporteurs (rôle actuel: %)', v_caller_role;
  END IF;

  IF NOT (p_new_status = ANY(v_allowed_statuses)) THEN
    RAISE EXCEPTION 'Statut "%" non autorisé pour les apporteurs. Statuts permis: %',
      p_new_status, array_to_string(v_allowed_statuses, ', ');
  END IF;

  SELECT apporteur_id, status INTO v_lead_apporteur, v_old_status
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

  UPDATE leads
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_lead_id;

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

  RETURN jsonb_build_object(
    'ok', true,
    'changed', true,
    'lead_id', p_lead_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apporteur_update_lead_status(uuid, text, text) TO authenticated;
