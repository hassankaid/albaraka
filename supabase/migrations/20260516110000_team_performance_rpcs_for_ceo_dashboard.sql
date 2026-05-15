-- =====================================================================
-- Dashboard CEO : nouvel onglet "Équipe"
-- =====================================================================
-- 3 RPCs SECURITY DEFINER gatées CEO uniquement, qui agrègent :
--   1. Activité          : nb leads touchés par membre dans la période
--   2. Qualification     : leads inscrits conf / call bookés vs traités, taux
--   3. Classements ventes: top setters / closers / apporteurs sur la période
--      (basé sur la table commissions où Sidali saisit explicitement le rôle
--       de chaque bénéficiaire de la vente)
--
-- "Lead traité" = lead avec au moins une activity (status_change, call,
-- note, etc.) dans la période, par ce user (cf. lead_activities).
-- "Lead qualifié" = passé en 'inscrit_conference' ou 'call_booke' (via
-- status_change) dans la période, par ce user.

-- 1) Activité par membre sur la période
CREATE OR REPLACE FUNCTION public.team_activity_stats(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  role TEXT,
  collaborateur_level TEXT,
  nb_leads_handled INT,
  nb_activities INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  IF NOT is_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé au CEO';
  END IF;
  RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.role,
      p.collaborateur_level,
      count(DISTINCT la.lead_id)::int,
      count(*)::int
    FROM public.lead_activities la
    JOIN public.profiles p ON p.id = la.user_id
    WHERE la.created_at >= p_from AND la.created_at < p_to
      AND p.is_active = true
    GROUP BY p.id, p.full_name, p.role, p.collaborateur_level
    ORDER BY count(DISTINCT la.lead_id) DESC;
END;
$func$;

-- 2) Qualification par membre sur la période
CREATE OR REPLACE FUNCTION public.team_qualification_stats(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  role TEXT,
  collaborateur_level TEXT,
  nb_leads_handled INT,
  nb_inscrit_conf INT,
  nb_call_booke INT,
  taux_qualif NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  IF NOT is_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé au CEO';
  END IF;
  RETURN QUERY
    WITH handled AS (
      SELECT
        p.id AS user_id,
        p.full_name,
        p.role,
        p.collaborateur_level,
        count(DISTINCT la.lead_id) AS leads_handled
      FROM public.lead_activities la
      JOIN public.profiles p ON p.id = la.user_id
      WHERE la.created_at >= p_from AND la.created_at < p_to
        AND p.is_active = true
      GROUP BY p.id, p.full_name, p.role, p.collaborateur_level
    ),
    qualif AS (
      SELECT
        la.user_id,
        count(DISTINCT CASE WHEN la.new_value = 'inscrit_conference' THEN la.lead_id END) AS inscrit_conf,
        count(DISTINCT CASE WHEN la.new_value = 'call_booke'         THEN la.lead_id END) AS call_booke
      FROM public.lead_activities la
      WHERE la.created_at >= p_from AND la.created_at < p_to
        AND la.action = 'status_change'
        AND la.new_value IN ('inscrit_conference','call_booke')
      GROUP BY la.user_id
    )
    SELECT
      h.user_id,
      h.full_name,
      h.role,
      h.collaborateur_level,
      h.leads_handled::int,
      COALESCE(q.inscrit_conf, 0)::int,
      COALESCE(q.call_booke, 0)::int,
      CASE WHEN h.leads_handled > 0
        THEN ROUND((COALESCE(q.inscrit_conf,0) + COALESCE(q.call_booke,0))::numeric / h.leads_handled, 4)
        ELSE 0 END
    FROM handled h
    LEFT JOIN qualif q ON q.user_id = h.user_id
    ORDER BY h.leads_handled DESC;
END;
$func$;

-- 3) Classements ventes par rôle (setter / closer / apporteur)
-- agence_marketing volontairement exclu (commission technique, pas un performer)
CREATE OR REPLACE FUNCTION public.team_sales_rankings(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE (
  role TEXT,
  user_id UUID,
  full_name TEXT,
  nb_ventes INT,
  montant_total_ht NUMERIC,
  montant_commissions NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  IF NOT is_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé au CEO';
  END IF;
  RETURN QUERY
    SELECT
      c.role,
      c.beneficiary_user_id,
      p.full_name,
      count(DISTINCT c.sale_id)::int,
      SUM(s.amount_ht)::numeric,
      SUM(c.amount)::numeric
    FROM public.commissions c
    JOIN public.sales s    ON s.id = c.sale_id
    JOIN public.profiles p ON p.id = c.beneficiary_user_id
    WHERE c.role IN ('setter','closer','apporteur')
      AND c.beneficiary_user_id IS NOT NULL
      AND s.sold_at IS NOT NULL
      AND s.sold_at >= p_from
      AND s.sold_at < p_to
    GROUP BY c.role, c.beneficiary_user_id, p.full_name
    ORDER BY c.role, count(DISTINCT c.sale_id) DESC;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.team_activity_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_qualification_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_sales_rankings(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
