-- Fix : "column reference 'role' is ambiguous" au chargement du dashboard Équipe
-- Cause : le paramètre OUT 'role' du RETURNS TABLE entre en conflit avec la
-- colonne 'role' des CTE (sales_totals, handled, etc.). PostgreSQL ne sait
-- plus lequel choisir lors de l'évaluation.
--
-- Fix : renommer toutes les colonnes intermédiaires des CTE avec un préfixe
-- (r_role, u_id, etc.) pour qu'aucune ne porte le même nom qu'un OUT param.

DROP FUNCTION IF EXISTS public.team_sales_rankings(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.team_qualification_stats(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE FUNCTION public.team_sales_rankings(
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
    RAISE EXCEPTION 'Reserve au CEO';
  END IF;
  RETURN QUERY
    WITH unique_sales AS (
      SELECT DISTINCT
        c.role AS r_role,
        c.beneficiary_user_id AS r_user,
        c.sale_id,
        s.amount_ht
      FROM public.commissions c
      JOIN public.sales s ON s.id = c.sale_id
      WHERE c.role IN ('setter','closer','apporteur')
        AND c.beneficiary_user_id IS NOT NULL
        AND s.sold_at IS NOT NULL
        AND s.sold_at >= p_from
        AND s.sold_at < p_to
    ),
    sales_totals AS (
      SELECT
        us.r_role,
        us.r_user,
        count(*)::int           AS n_ventes,
        SUM(us.amount_ht)::numeric AS m_ht
      FROM unique_sales us
      GROUP BY us.r_role, us.r_user
    ),
    commissions_totals AS (
      SELECT
        c.role AS r_role,
        c.beneficiary_user_id AS r_user,
        SUM(c.amount)::numeric AS m_comm
      FROM public.commissions c
      JOIN public.sales s ON s.id = c.sale_id
      WHERE c.role IN ('setter','closer','apporteur')
        AND c.beneficiary_user_id IS NOT NULL
        AND s.sold_at IS NOT NULL
        AND s.sold_at >= p_from
        AND s.sold_at < p_to
      GROUP BY c.role, c.beneficiary_user_id
    )
    SELECT
      st.r_role,
      st.r_user,
      pr.full_name,
      st.n_ventes,
      st.m_ht,
      ct.m_comm
    FROM sales_totals st
    JOIN commissions_totals ct ON ct.r_role = st.r_role AND ct.r_user = st.r_user
    JOIN public.profiles pr ON pr.id = st.r_user
    ORDER BY st.r_role, st.n_ventes DESC, st.m_ht DESC;
END;
$func$;

CREATE FUNCTION public.team_qualification_stats(
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
  taux_qualif NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  IF NOT is_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve au CEO';
  END IF;
  RETURN QUERY
    WITH handled AS (
      SELECT
        pr.id                AS u_id,
        pr.full_name         AS u_full_name,
        pr.role              AS u_role,
        pr.collaborateur_level AS u_level,
        count(DISTINCT la.lead_id) AS leads_handled
      FROM public.lead_activities la
      JOIN public.profiles pr ON pr.id = la.user_id
      WHERE la.created_at >= p_from AND la.created_at < p_to
        AND pr.is_active = true
      GROUP BY pr.id, pr.full_name, pr.role, pr.collaborateur_level
    ),
    qualif AS (
      SELECT
        la.user_id AS u_id,
        count(DISTINCT la.lead_id) AS inscrit_conf
      FROM public.lead_activities la
      WHERE la.created_at >= p_from AND la.created_at < p_to
        AND la.action = 'status_change'
        AND la.new_value = 'inscrit_conference'
      GROUP BY la.user_id
    )
    SELECT
      h.u_id,
      h.u_full_name,
      h.u_role,
      h.u_level,
      h.leads_handled::int,
      COALESCE(q.inscrit_conf, 0)::int,
      CASE WHEN h.leads_handled > 0
        THEN ROUND(COALESCE(q.inscrit_conf, 0)::numeric / h.leads_handled, 4)
        ELSE 0 END
    FROM handled h
    LEFT JOIN qualif q ON q.u_id = h.u_id
    ORDER BY h.leads_handled DESC;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.team_sales_rankings(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_qualification_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
