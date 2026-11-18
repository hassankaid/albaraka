-- Dashboard Sales, lot 1 (18/11/2026).
--
-- Demande de Sidali, décisions de Hassan du 18/11 :
--   - se baser sur les ventes réellement saisies (sales, PASS) et sur les
--     commissions saisies à la main pour savoir qui a closé et qui a setté ;
--   - période : même sélecteur que le Marketing (conférence par défaut) ;
--   - ventes perdues : comptées, et mises en avant à part ;
--   - commissions affichées dans les classements ;
--   - l'agence verra la partie « par source » (lot 2, fonction à part : celle-ci
--     contient les commissions de chacun et reste réservée au CEO).
--
-- Le passage automatique du call en « Closé » à la vente existe déjà
-- (update_lead_call_on_sale) : les calls sans résultat sont tous des personnes
-- qui n'ont pas acheté, d'où le compteur « à renseigner » par closer.

-- ── 1. Statistiques setters sur une plage de conférences ────────────────────
-- Même calcul que equipe_qualification_conference (décisions A-B-C du 17/11),
-- étendu à plusieurs conférences : du début de la conférence qui précède la
-- première au début de la dernière.
create or replace function public.equipe_qualification_plage(p_conf_from date, p_conf_to date)
returns table (
  user_id uuid,
  full_name text,
  role text,
  collaborateur_level text,
  nb_appeles integer,
  nb_inscrits integer,
  taux_inscription numeric,
  nb_calls integer,
  nb_ventes integer,
  montant_ventes_ht numeric,
  nb_post_conference integer,
  nb_gestion integer
)
language plpgsql
stable
security definer
set search_path = public
as $function$
DECLARE
  v_from  date := coalesce(p_conf_from, date '2025-01-05');
  v_to    date := coalesce(p_conf_to, public.next_sunday_noon_paris_after(now()));
  v_debut timestamptz := public.debut_conference(v_from - 7);
  v_fin   timestamptz := public.debut_conference(v_to);
BEGIN
  IF NOT is_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve au CEO';
  END IF;

  RETURN QUERY
  WITH act AS (
    SELECT la.user_id AS u, la.lead_id, la.action, la.old_value, la.new_value, la.created_at
      FROM public.lead_activities la
     WHERE la.created_at >= v_debut AND la.created_at < v_fin
       AND la.user_id IS NOT NULL
  ),
  appel AS (
    SELECT a.u, a.lead_id, a.action, a.new_value, a.created_at
      FROM act a
     WHERE (a.action = 'status_change'
            AND a.old_value IN ('a_qualifier', 'a_relancer', 'pas_de_reponse',
                                'dm_a_contacter', 'contact_dm1', 'relance_dm1', 'relance_dm2')
            AND a.new_value NOT IN ('a_qualifier', 'dm_a_contacter'))
        OR a.action = 'relance_faite'
  ),
  inscr AS (
    SELECT p.u, p.lead_id, min(p.created_at) AS inscrit_le
      FROM appel p
     WHERE p.action = 'status_change' AND p.new_value IN ('inscrit_conference', 'call_booke')
     GROUP BY 1, 2
  ),
  calls_ok AS (
    SELECT i.u, count(DISTINCT i.lead_id) AS n
      FROM inscr i
      JOIN public.leads l ON l.id = i.lead_id
     WHERE EXISTS (
       SELECT 1 FROM public.calls k
        WHERE k.status IS DISTINCT FROM 'annule'
          AND (k.lead_id = i.lead_id OR (l.contact_id IS NOT NULL AND k.contact_id = l.contact_id))
          AND k.created_at >= i.inscrit_le
          AND k.created_at < v_fin + interval '7 days')
     GROUP BY 1
  ),
  ventes AS (
    SELECT x.u, count(*) AS n, sum(x.amount_ht) AS ca
      FROM (SELECT DISTINCT cm.beneficiary_user_id AS u, s.id, s.amount_ht
              FROM public.commissions cm
              JOIN public.sales s ON s.id = cm.sale_id
             WHERE cm.role = 'setter'
               AND cm.beneficiary_user_id IS NOT NULL
               AND s.conference_date BETWEEN v_from AND v_to
               AND s.sale_type IS DISTINCT FROM 'studio') x
     GROUP BY 1
  ),
  post AS (
    SELECT a.u, count(DISTINCT a.lead_id) AS n
      FROM act a
     WHERE a.action = 'status_change'
       AND a.old_value IN ('inscrit_conference', 'envoi_rediffusion', 'pas_de_reponse_post_conference')
     GROUP BY 1
  ),
  gestion AS (
    SELECT a.u, count(DISTINCT a.lead_id) AS n
      FROM act a
     WHERE (a.action = 'status_change' AND a.new_value IN ('a_qualifier', 'dm_a_contacter'))
        OR a.action IN ('reassigned', 'dm_bascule')
        OR (a.action = 'assigned' AND a.new_value IS DISTINCT FROM a.u::text)
     GROUP BY 1
  ),
  stats AS (
    SELECT p.u, count(DISTINCT p.lead_id) AS appeles,
           (SELECT count(*) FROM inscr i WHERE i.u = p.u) AS inscrits
      FROM appel p
     GROUP BY 1
  ),
  membres AS (
    SELECT u FROM stats UNION SELECT u FROM ventes UNION SELECT u FROM post
  )
  SELECT pr.id, pr.full_name, pr.role, pr.collaborateur_level,
         coalesce(st.appeles, 0)::int,
         coalesce(st.inscrits, 0)::int,
         CASE WHEN coalesce(st.appeles, 0) > 0
              THEN round(st.inscrits::numeric / st.appeles, 4) ELSE 0 END,
         coalesce(co.n, 0)::int,
         coalesce(v.n, 0)::int,
         coalesce(v.ca, 0)::numeric,
         coalesce(po.n, 0)::int,
         coalesce(g.n, 0)::int
    FROM membres m
    JOIN public.profiles pr ON pr.id = m.u
    LEFT JOIN stats st ON st.u = m.u
    LEFT JOIN calls_ok co ON co.u = m.u
    LEFT JOIN ventes v ON v.u = m.u
    LEFT JOIN post po ON po.u = m.u
    LEFT JOIN gestion g ON g.u = m.u
   ORDER BY coalesce(st.inscrits, 0) DESC, coalesce(v.n, 0) DESC, coalesce(st.appeles, 0) DESC;
END;
$function$;

comment on function public.equipe_qualification_plage(date, date) is
  'Statistiques setters (appelés, inscrits, calls, ventes, post-conférence, gestion) sur une plage de conférences ; bornes nulles = tout l''historique.';

-- La version « une conférence » devient un cas particulier : un seul calcul.
create or replace function public.equipe_qualification_conference(p_conference date)
returns table (
  user_id uuid, full_name text, role text, collaborateur_level text,
  nb_appeles integer, nb_inscrits integer, taux_inscription numeric,
  nb_calls integer, nb_ventes integer, montant_ventes_ht numeric,
  nb_post_conference integer, nb_gestion integer
)
language sql
stable
security definer
set search_path = public
as $function$
  select * from public.equipe_qualification_plage(p_conference, p_conference);
$function$;

-- ── 2. Une ligne par vente PASS, avec qui, d'où et combien ──────────────────
create or replace function public.sales_dashboard_ventes(p_from date, p_to date)
returns table (
  vente_id uuid,
  vendu_le timestamptz,
  conference_date date,
  client text,
  email text,
  telephone text,
  produit text,
  montant_ht numeric,
  statut_paiement text,
  nb_echeances integer,
  encaisse numeric,
  en_retard numeric,
  reste_a_encaisser numeric,
  intervenants jsonb,
  lead_id uuid,
  lead_cree_le timestamptz,
  canal text,
  canal_libelle text,
  tunnel text,
  pub_plateforme text,
  pub_id text,
  pub_nom text,
  groupe_nom text,
  campagne_nom text,
  quiz_priorite text
)
language plpgsql
stable
security definer
set search_path = public
as $function$
BEGIN
  IF NOT is_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve au CEO';
  END IF;

  RETURN QUERY
  WITH v AS (
    SELECT s.*, va.lead_id AS l_id
      FROM public.sales s
      LEFT JOIN public.marketing_ventes_attribuees va ON va.vente_id = s.id
     WHERE s.sale_type = 'bon_commande'
       AND (p_from IS NULL OR s.conference_date >= p_from)
       AND (p_to IS NULL OR s.conference_date <= p_to)
  ),
  pay AS (
    SELECT p.sale_id,
           count(*)::int AS n,
           coalesce(sum(p.amount) FILTER (WHERE p.status = 'paid'), 0) AS paye,
           coalesce(sum(p.amount) FILTER (WHERE p.status = 'late'
                                           OR (p.status = 'pending' AND p.due_date < current_date)), 0) AS retard,
           coalesce(sum(p.amount) FILTER (WHERE p.status IN ('pending', 'late')), 0) AS reste
      FROM public.payments p
     WHERE p.sale_id IN (SELECT v.id FROM v)
     GROUP BY 1
  ),
  inter AS (   -- une entrée par personne et par rôle, toutes échéances cumulées
    SELECT x.sale_id,
           jsonb_agg(jsonb_build_object(
             'role', x.role, 'user_id', x.uid, 'nom', x.nom,
             'montant', x.montant, 'verse', x.verse) ORDER BY x.role, x.nom) AS j
      FROM (SELECT cm.sale_id, cm.role, cm.beneficiary_user_id AS uid,
                   coalesce(pr.full_name, cm.beneficiary_external, '?') AS nom,
                   sum(cm.amount) FILTER (WHERE cm.status <> 'cancelled') AS montant,
                   sum(cm.amount) FILTER (WHERE cm.status = 'paid') AS verse
              FROM public.commissions cm
              LEFT JOIN public.profiles pr ON pr.id = cm.beneficiary_user_id
             WHERE cm.sale_id IN (SELECT v.id FROM v)
             GROUP BY 1, 2, 3, 4) x
     GROUP BY 1
  )
  SELECT v.id, v.sold_at, v.conference_date,
         coalesce(c.full_name, le.raw_full_name),
         coalesce(c.email, le.raw_email),
         coalesce(c.phone_original, c.phone_normalized, le.raw_phone),
         v.product, v.amount_ht, v.payment_status,
         coalesce(pay.n, 0), coalesce(pay.paye, 0), coalesce(pay.retard, 0),
         CASE WHEN v.payment_status = 'lost' THEN 0 ELSE coalesce(pay.reste, 0) END,
         coalesce(inter.j, '[]'::jsonb),
         v.l_id, le.created_at, le.canal, lc.libelle, le.tunnel,
         pub.plateforme, pub.pub_id, n.pub_nom, n.groupe_nom, n.campagne_nom,
         le.quiz_priorite
    FROM v
    LEFT JOIN public.contacts c ON c.id = v.contact_id
    LEFT JOIN public.leads_enriched le ON le.id = v.l_id
    LEFT JOIN public.leads l ON l.id = v.l_id
    LEFT JOIN public.lead_canaux lc ON lc.cle = le.canal
    LEFT JOIN pay ON pay.sale_id = v.id
    LEFT JOIN inter ON inter.sale_id = v.id
    LEFT JOIN LATERAL (
      SELECT CASE le.canal WHEN 'snap_ads' THEN 'snap' WHEN 'meta_ads' THEN 'meta' END AS plateforme,
             coalesce(nullif(btrim(l.utm_content), ''),
                      CASE WHEN le.canal = 'meta_ads' THEN public.meta_pub_par_adid(l.clic_pub->>'meta_adid') END) AS pub_id
    ) pub ON le.canal IN ('snap_ads', 'meta_ads')
    LEFT JOIN LATERAL (
      SELECT a.pub_nom, a.groupe_nom, a.campagne_nom
        FROM public.ads_pubs a
       WHERE a.plateforme = pub.plateforme AND a.pub_id = pub.pub_id
       ORDER BY a.date DESC
       LIMIT 1
    ) n ON true
   ORDER BY v.sold_at DESC;
END;
$function$;

comment on function public.sales_dashboard_ventes(date, date) is
  'Dashboard Sales : une ligne par vente PASS rattachée aux conférences de la plage (bornes nulles = tout), avec paiements, intervenants (commissions saisies) et source du lead. Réservé au CEO.';

-- ── 3. Une ligne par call, rattaché à sa conférence ─────────────────────────
-- Conférence d'un call : celle de son lead ; à défaut, la sienne, sauf un call
-- de rediffusion, rangé sur la conférence SUIVANTE par set_call_conference_date
-- alors qu'il vient de la précédente.
create or replace function public.sales_dashboard_calls(p_from date, p_to date)
returns table (
  call_id uuid,
  closer_id uuid,
  closer text,
  statut text,
  prevu_le timestamptz,
  client text,
  conference_date date,
  achete boolean
)
language plpgsql
stable
security definer
set search_path = public
as $function$
BEGIN
  IF NOT is_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve au CEO';
  END IF;

  RETURN QUERY
  SELECT x.id, x.assigned_to, x.nom_closer, x.status, x.scheduled_at, x.client, x.conf,
         EXISTS (SELECT 1 FROM public.sales s
                  WHERE s.contact_id = x.contact_id AND s.sale_type = 'bon_commande'
                    AND s.sold_at >= x.created_at)
    FROM (
      SELECT k.id, k.assigned_to, pr.full_name AS nom_closer, k.status, k.scheduled_at, k.created_at,
             k.contact_id,
             coalesce(c.full_name, k.raw_full_name) AS client,
             coalesce(l.conference_date,
                      CASE WHEN k.event_type = 'rediffusion_conference' THEN k.conference_date - 7
                           ELSE k.conference_date END) AS conf
        FROM public.calls k
        LEFT JOIN public.leads l ON l.id = k.lead_id
        LEFT JOIN public.contacts c ON c.id = k.contact_id
        LEFT JOIN public.profiles pr ON pr.id = k.assigned_to
    ) x
   WHERE (p_from IS NULL OR x.conf >= p_from)
     AND (p_to IS NULL OR x.conf <= p_to)
   ORDER BY x.scheduled_at DESC NULLS LAST;
END;
$function$;

comment on function public.sales_dashboard_calls(date, date) is
  'Dashboard Sales : calls rattachés aux conférences de la plage (bornes nulles = tout), avec closer, statut et achat ensuite. Réservé au CEO.';

revoke all on function public.equipe_qualification_plage(date, date) from public, anon;
revoke all on function public.sales_dashboard_ventes(date, date) from public, anon;
revoke all on function public.sales_dashboard_calls(date, date) from public, anon;
grant execute on function public.equipe_qualification_plage(date, date) to authenticated;
grant execute on function public.sales_dashboard_ventes(date, date) to authenticated;
grant execute on function public.sales_dashboard_calls(date, date) to authenticated;
