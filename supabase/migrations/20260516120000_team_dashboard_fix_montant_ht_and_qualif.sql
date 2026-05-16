-- Corrige le bug d'inflation du montant_total_ht dans team_sales_rankings :
-- les commissions sont saisies PAR ÉCHÉANCE (1 par mensualité) → SUM(amount_ht)
-- sur les commissions multiplie le montant de la vente par le nb d'échéances.
-- Fix : dédupliquer par sale_id avant de sommer.
--
-- Simplifie aussi team_qualification_stats :
--   - taux_qualif = inscrit_conference / leads_handled (sans call_booke)
--   - retrait de la colonne nb_call_booke (non utilisée côté UI)

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
    RAISE EXCEPTION 'Réservé au CEO';
  END IF;
  RETURN QUERY
    WITH unique_sales AS (
      SELECT DISTINCT
        c.role,
        c.beneficiary_user_id,
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
        role,
        beneficiary_user_id,
        count(*)::int          AS nb_ventes,
        SUM(amount_ht)::numeric AS montant_total_ht
      FROM unique_sales
      GROUP BY role, beneficiary_user_id
    ),
    commissions_totals AS (
      SELECT
        c.role,
        c.beneficiary_user_id,
        SUM(c.amount)::numeric AS montant_commissions
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
      st.role,
      st.beneficiary_user_id,
      p.full_name,
      st.nb_ventes,
      st.montant_total_ht,
      ct.montant_commissions
    FROM sales_totals st
    JOIN commissions_totals ct
      ON ct.role = st.role AND ct.beneficiary_user_id = st.beneficiary_user_id
    JOIN public.profiles p ON p.id = st.beneficiary_user_id
    ORDER BY st.role, st.nb_ventes DESC, st.montant_total_ht DESC;
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
        count(DISTINCT la.lead_id) AS inscrit_conf
      FROM public.lead_activities la
      WHERE la.created_at >= p_from AND la.created_at < p_to
        AND la.action = 'status_change'
        AND la.new_value = 'inscrit_conference'
      GROUP BY la.user_id
    )
    SELECT
      h.user_id,
      h.full_name,
      h.role,
      h.collaborateur_level,
      h.leads_handled::int,
      COALESCE(q.inscrit_conf, 0)::int,
      CASE WHEN h.leads_handled > 0
        THEN ROUND(COALESCE(q.inscrit_conf, 0)::numeric / h.leads_handled, 4)
        ELSE 0 END
    FROM handled h
    LEFT JOIN qualif q ON q.user_id = h.user_id
    ORDER BY h.leads_handled DESC;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.team_sales_rankings(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_qualification_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
