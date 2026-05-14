-- ═══════════════════════════════════════════════════════════════════════════
-- Durcissement : un apporteur ne peut PLUS modifier le statut d'un lead qu'il
-- a apporté si ce lead est en cours de traitement par quelqu'un d'autre
-- (assigned_to défini et différent du caller).
--
-- AVANT
--   La RPC laissait passer toute modif tant que caller = apporteur OU caller
--   = assignee. Si Neylla apporte un lead via son quiz et que SABA est en
--   train de le traiter, Neylla pouvait écraser le statut → double saisie.
--
-- APRÈS
--   Le caller peut modifier le statut dans 2 cas seulement :
--     1) Il est l'assigné du lead (= il est en charge du traitement)
--     2) Il est l'apporteur ET le lead n'est pas encore assigné (NULL)
--   Sinon → exception explicite (message clair côté UI).
--
-- Cohérent avec la nouvelle UX frontend (ApporteurLeads : l'apporteur voit
-- le lead, voit qui est assigné, mais ne peut pas toucher au statut).
--
-- À NOTER
--   La RPC apporteur_update_lead_source reste inchangée : l'apporteur peut
--   continuer à corriger la SOURCE de son lead même si quelqu'un d'autre le
--   traite — c'est sa propre donnée d'apporteur.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.apporteur_update_lead_status(p_lead_id uuid, p_new_status text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Règle d'autorisation durcie (anti double-saisie) :
  --   - Caller assigné au lead → OK (il est en charge du traitement)
  --   - Caller apporteur ET lead non assigné → OK (personne ne traite encore)
  --   - Sinon (apporteur d'un lead assigné ailleurs) → bloqué
  IF NOT (
    v_lead_assignee = v_caller
    OR (v_lead_assignee IS NULL AND v_lead_apporteur = v_caller)
  ) THEN
    IF v_lead_apporteur = v_caller AND v_lead_assignee IS NOT NULL THEN
      RAISE EXCEPTION 'Ce lead est en cours de traitement par un autre collaborateur. Tu ne peux pas modifier son statut pour éviter d''écraser son travail.';
    ELSE
      RAISE EXCEPTION 'Vous ne pouvez modifier que les leads qui vous sont affectés (ou que vous avez apportés et qui ne sont pas encore assignés).';
    END IF;
  END IF;

  IF v_old_status = p_new_status AND (p_note IS NULL OR length(trim(p_note)) = 0) THEN
    RETURN jsonb_build_object('ok', true, 'changed', false, 'lead_id', p_lead_id, 'status', p_new_status);
  END IF;

  v_should_recycle := p_new_status = ANY(v_instant_recycle_statuses);

  IF v_should_recycle THEN
    UPDATE leads SET status = p_new_status, assigned_to = NULL, assigned_at = NULL, recycled_at = v_now, updated_at = v_now WHERE id = p_lead_id;
  ELSE
    UPDATE leads SET status = p_new_status, updated_at = v_now WHERE id = p_lead_id;
  END IF;

  IF v_old_status IS DISTINCT FROM p_new_status THEN
    INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note)
    VALUES (
      p_lead_id, v_caller, 'status_change', v_old_status, p_new_status,
      CASE WHEN p_note IS NOT NULL AND length(trim(p_note)) > 0
        THEN 'Modification — ' || trim(p_note)
        ELSE 'Modification'
      END
    );
  ELSIF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO lead_activities (lead_id, user_id, action, note)
    VALUES (p_lead_id, v_caller, 'note_added', 'Note — ' || trim(p_note));
  END IF;

  IF v_should_recycle THEN
    IF v_lead_assignee IS NOT NULL THEN
      INSERT INTO lead_activities (lead_id, user_id, action, old_value, note)
      VALUES (p_lead_id, v_caller, 'unassigned', v_lead_assignee::text, 'Désaffecté automatiquement suite au statut "' || p_new_status || '"');
    END IF;
    INSERT INTO lead_activities (lead_id, user_id, action, note)
    VALUES (p_lead_id, v_caller, 'recycled', 'Recyclage instantané — statut "' || p_new_status || '"');
  END IF;

  RETURN jsonb_build_object('ok', true, 'changed', true, 'recycled', v_should_recycle, 'lead_id', p_lead_id, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$function$;
