-- Délégation des droits d'affectation de leads.
--
-- Permet à des collaborateurs spécifiques (flag can_assign_leads=true) d'avoir
-- les mêmes pouvoirs d'affectation que le CEO, sans pour autant donner les
-- autres droits CEO. Les apporteurs deviennent assignables (cas où on leur
-- confie des leads à traiter, comme un collaborateur intermédiaire).
--
-- Effets de bord :
--  - leads_update_team étendu : assigners (CEO + délégués) peuvent assigner
--    n'importe quel lead à n'importe qui ; apporteurs peuvent UPDATE leurs
--    propres leads ET les leads qui leur sont affectés.
--  - leads_select_apporteur étendu : apporteurs voient aussi les leads
--    assigned_to=eux (en plus de apporteur_id=eux).
--  - apporteur_update_lead_status étendue : autorise les apporteurs sur les
--    leads où ils sont apporteur OU assigné.

-- 1) Ajout du flag can_assign_leads dans profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_assign_leads boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.can_assign_leads IS
  'Si true, ce user (typiquement collaborateur) a les mêmes droits d''affectation de leads que le CEO. CEO l''a implicitement.';

-- 2) Sabrina Da Cunha promue avec ce droit
UPDATE profiles SET can_assign_leads = true
WHERE id = '071078ef-04ff-4ddc-9a38-f6ba8e6748c4';

-- 3) Fonction helper SECURITY DEFINER pour les RLS et le frontend
CREATE OR REPLACE FUNCTION public.can_assign_leads_now()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (role = 'ceo' OR can_assign_leads = true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_assign_leads_now() TO authenticated;

-- 4) Étend la policy UPDATE leads pour inclure les "assigners délégués"
DROP POLICY IF EXISTS leads_update_team ON leads;
CREATE POLICY leads_update_team ON leads
  FOR UPDATE
  USING (
    can_assign_leads_now()
    OR (
      get_user_role() = 'collaborateur'
      AND (
        assigned_to = auth.uid()
        OR (
          assigned_to IS NULL
          AND recycled_at IS NULL
          AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.collaborateur_level = 'confirme')
        )
      )
    )
    OR (
      get_user_role() = 'apporteur'
      AND (apporteur_id = auth.uid() OR assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    can_assign_leads_now()
    OR (
      get_user_role() = 'collaborateur'
      AND (assigned_to = auth.uid() OR assigned_to IS NULL)
    )
    OR (
      get_user_role() = 'apporteur'
      AND (apporteur_id = auth.uid() OR assigned_to = auth.uid())
    )
  );

-- 5) Étend la policy SELECT apporteur (voit aussi ses leads affectés)
DROP POLICY IF EXISTS leads_select_apporteur ON leads;
CREATE POLICY leads_select_apporteur ON leads
  FOR SELECT
  USING (
    get_user_role() = 'apporteur'
    AND (apporteur_id = auth.uid() OR assigned_to = auth.uid())
  );

-- 6) Permet aux délégués (can_assign_leads_now) de voir TOUS les leads
CREATE POLICY leads_select_assigner ON leads
  FOR SELECT
  USING (can_assign_leads_now());

-- 7) Étend la RPC apporteur_update_lead_status pour autoriser
--    aussi les leads où l'apporteur est assigned_to (pas seulement apporteur_id)
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

  -- Autorise si caller est apporteur du lead OU assigné au lead
  IF v_lead_apporteur IS DISTINCT FROM v_caller AND v_lead_assignee IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Vous ne pouvez modifier que les leads que vous avez apportés ou qui vous sont affectés';
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
$$;
