-- Onglet Équipe du tableau de bord CEO : statistiques par conférence (18/11/2026).
--
-- Constat (Sidali, 17/11) : les « leads traités » et les taux des setters ne
-- reflétaient pas le travail réel. L'ancien calcul (team_qualification_stats)
-- comptait comme « traité » tout lead touché par une action quelconque :
-- redistribution (remise en « À qualifier »), attribution, suivi après la
-- conférence, bascule DM… Sabrina affichait 282 leads traités et 12 % sur la
-- semaine du 10/11 ; sur les leads qu'elle a réellement appelés : 106 et 31 %.
--
-- Décisions de Hassan (17/11) :
--   A. « Leads appelés » = leads que le membre a fait passer d'un statut
--      d'appel (À qualifier, À relancer, Pas de réponse, ou statuts DM) à un
--      résultat, ou sur lesquels il a noté une relance. « Inscrits » = parmi
--      ces passages, ceux vers Inscrit conférence ou Call booké.
--   B. Ajouter les calls et les ventes de chaque setter.
--   C. Période = une conférence : du début de la conférence précédente au
--      début de celle-ci (c'est la semaine où l'on inscrit à cette conférence).
--
-- Les anciennes fonctions team_qualification_stats et team_sales_rankings
-- restent en place (non utilisées par l'écran) pour ne rien casser.

create or replace function public.debut_conference(p_conference date)
returns timestamp with time zone
language sql
stable
set search_path = public
as $function$
  select ((p_conference + coalesce((select c.starts_at_local from public.conferences c
                                     where c.conference_date = p_conference), time '11:00'))
          at time zone 'Europe/Paris');
$function$;

comment on function public.debut_conference(date) is
  'Instant de début d''une conférence (heure de la fiche, 11h00 par défaut), heure de Paris.';

create or replace function public.equipe_qualification_conference(p_conference date)
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
  v_debut timestamptz := public.debut_conference(p_conference - 7);
  v_fin   timestamptz := public.debut_conference(p_conference);
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
  appel AS (   -- A : passages d'un statut d'appel à un résultat, ou relance notée
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
  calls_ok AS (   -- B : inscrits qui ont ensuite pris un rendez-vous (non annulé)
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
  ventes AS (     -- B : ventes de cette conférence où le membre est setter
    SELECT x.u, count(*) AS n, sum(x.amount_ht) AS ca
      FROM (SELECT DISTINCT cm.beneficiary_user_id AS u, s.id, s.amount_ht
              FROM public.commissions cm
              JOIN public.sales s ON s.id = cm.sale_id
             WHERE cm.role = 'setter'
               AND cm.beneficiary_user_id IS NOT NULL
               AND s.conference_date = p_conference
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

comment on function public.equipe_qualification_conference(date) is
  'Onglet Équipe : par membre, leads appelés, inscrits, calls, ventes (setter), suivi post-conférence et gestion, pour la semaine d''inscription à une conférence. Règles du 17/11/2026.';

create or replace function public.equipe_classement_conference(p_conference date)
returns table (role text, user_id uuid, full_name text, nb_ventes integer, montant_total_ht numeric, montant_commissions numeric)
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
  WITH c AS (
    SELECT cm.role AS r_role, cm.beneficiary_user_id AS r_user, cm.sale_id, cm.amount, s.amount_ht
      FROM public.commissions cm
      JOIN public.sales s ON s.id = cm.sale_id
     WHERE cm.role IN ('setter', 'closer', 'apporteur')
       AND cm.beneficiary_user_id IS NOT NULL
       AND s.conference_date = p_conference
       AND s.sale_type IS DISTINCT FROM 'studio'
  ),
  ventes AS (
    SELECT x.r_role, x.r_user, count(*)::int AS n, sum(x.amount_ht)::numeric AS ht
      FROM (SELECT DISTINCT c.r_role, c.r_user, c.sale_id, c.amount_ht FROM c) x
     GROUP BY 1, 2
  ),
  comm AS (
    SELECT c.r_role, c.r_user, sum(c.amount)::numeric AS m FROM c GROUP BY 1, 2
  )
  SELECT v.r_role, v.r_user, pr.full_name, v.n, v.ht, coalesce(cm.m, 0)
    FROM ventes v
    JOIN public.profiles pr ON pr.id = v.r_user
    LEFT JOIN comm cm ON cm.r_role = v.r_role AND cm.r_user = v.r_user
   ORDER BY v.r_role, v.n DESC, v.ht DESC;
END;
$function$;

comment on function public.equipe_classement_conference(date) is
  'Onglet Équipe : top setters, closers et apporteurs sur les ventes rattachées à une conférence.';

revoke all on function public.equipe_qualification_conference(date) from public, anon;
revoke all on function public.equipe_classement_conference(date) from public, anon;
grant execute on function public.equipe_qualification_conference(date) to authenticated;
grant execute on function public.equipe_classement_conference(date) to authenticated;
