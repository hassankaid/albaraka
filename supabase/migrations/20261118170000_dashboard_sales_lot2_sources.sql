-- Dashboard Sales, lot 2 (18/11/2026) : performance des ventes par source, du canal
-- jusqu'à la créa, et profil des acheteurs.
--
-- Ouvert au CEO ET à l'agence (décision E de Hassan) : ces fonctions ne renvoient ni
-- nom, ni e-mail, ni téléphone de client, ni commission. Les ventes nominatives et les
-- commissions restent dans sales_dashboard_ventes (CEO seul).
--
-- Même périmètre que le reste de l'onglet Sales et que l'onglet Marketing :
--   • ventes : bons de commande dont la conférence de rattachement est dans la période ;
--   • leads : leads dont la conférence est dans la période ;
--   • dépense : jours rattachés à la conférence par next_sunday_noon_paris_after, la
--     règle de marketing_perf (les totaux par canal sont donc ceux de l'onglet Marketing).
--
-- La source d'un lead : son canal (leads_enriched_base), puis pour Meta et Snap la pub
-- (utm_content, ou l'identifiant Meta du clic), et le groupe et la campagne de cette pub
-- d'après la dernière ligne connue de ads_pubs. À défaut de pub, la campagne vient de
-- utm_campaign.
--
-- p_from / p_to à NULL : pas de borne.
--
-- Appliqué en base le 18/11/2026.

-- Source détaillée d'un lead (canal → campagne → groupe → pub).
create or replace function public.source_detaillee_lead(p_lead_id uuid)
returns table(canal text, plateforme text, campagne_id text, campagne_nom text,
              groupe_id text, groupe_nom text, pub_id text, pub_nom text)
language sql
stable security definer
set search_path to 'public'
as $function$
  with b as (
    select b.canal,
           case b.canal when 'snap_ads' then 'snap' when 'meta_ads' then 'meta' when 'google_ads' then 'google' end as plateforme,
           case when b.canal in ('snap_ads', 'meta_ads')
                then coalesce(nullif(btrim(l.utm_content), ''),
                              case when b.canal = 'meta_ads' then public.meta_pub_par_adid(l.clic_pub ->> 'meta_adid') end)
           end as pub_id,
           nullif(btrim(l.utm_campaign), '') as utm_campaign
      from public.leads_enriched_base b
      join public.leads l on l.id = b.id
     where b.id = p_lead_id
  )
  select b.canal, b.plateforme,
         coalesce(p.campagne_id, case when b.plateforme is not null then b.utm_campaign end),
         coalesce(p.campagne_nom, c.campaign_name),
         p.groupe_id, p.groupe_nom, b.pub_id, p.pub_nom
    from b
    left join lateral (
      select a.campagne_id, a.campagne_nom, a.groupe_id, a.groupe_nom, a.pub_nom
        from public.ads_pubs a
       where a.plateforme = b.plateforme and a.pub_id = b.pub_id
       order by a.date desc
       limit 1
    ) p on b.pub_id is not null
    left join lateral (
      select a.campaign_name
        from public.ads a
       where a.campaign_id = coalesce(p.campagne_id, b.utm_campaign)
       order by a.date desc
       limit 1
    ) c on b.plateforme is not null
$function$;

revoke all on function public.source_detaillee_lead(uuid) from public, anon, authenticated;

-- Ventes de la période, sans donnée personnelle ni commission.
create or replace function public.sales_sources_ventes(p_from date, p_to date)
returns table(
  vente_id uuid, vendu_le timestamptz, conference_date date, montant_ht numeric, encaisse numeric,
  perdue boolean, nb_echeances integer, lead_cree_le timestamptz,
  canal text, canal_libelle text, tunnel text, plateforme text,
  campagne_id text, campagne_nom text, groupe_id text, groupe_nom text, pub_id text, pub_nom text,
  quiz_priorite text, reinscrit boolean, signal_jeu_ven boolean
)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  if coalesce(public.get_user_role(), '') not in ('ceo', 'agence') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  return query
  with v as (
    select s.id, s.sold_at, s.conference_date, s.amount_ht, s.payment_status, va.lead_id
      from public.sales s
      left join public.marketing_ventes_attribuees va on va.vente_id = s.id
     where s.sale_type = 'bon_commande'
       and (p_from is null or s.conference_date >= p_from)
       and (p_to is null or s.conference_date <= p_to)
  ),
  pay as (
    select p.sale_id, count(*)::int as n,
           coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as paye
      from public.payments p
     where p.sale_id in (select v.id from v)
     group by 1
  )
  select v.id, v.sold_at, v.conference_date, v.amount_ht, coalesce(pay.paye, 0),
         v.payment_status = 'lost', coalesce(pay.n, 0), b.created_at,
         coalesce(src.canal, case when v.lead_id is null then 'non_attribue' end),
         lc.libelle, b.tunnel, src.plateforme,
         src.campagne_id, src.campagne_nom, src.groupe_id, src.groupe_nom, src.pub_id, src.pub_nom,
         b.quiz_priorite, b.reinscrit_de is not null, coalesce(b.signal_jeu_ven, false)
    from v
    left join pay on pay.sale_id = v.id
    left join public.leads_enriched_base b on b.id = v.lead_id
    left join lateral public.source_detaillee_lead(v.lead_id) src on v.lead_id is not null
    left join public.lead_canaux lc on lc.cle = src.canal
   order by v.sold_at desc;
end;
$function$;

-- Entonnoir et dépense par source. Une ligne par (canal, campagne, groupe, pub, priorité)
-- pour les leads ; la dépense arrive sur deux colonnes :
--   • depense_campagne : par campagne (table ads, la référence des totaux), sur des
--     lignes sans groupe ni pub ;
--   • depense_pub : par pub (ads_pubs, Meta et Snap), sur les lignes de la pub.
-- L'écran prend la première pour les canaux et les campagnes, la seconde en dessous.
create or replace function public.sales_sources_entonnoir(p_from date, p_to date)
returns table(
  canal text, canal_libelle text, plateforme text,
  campagne_id text, campagne_nom text, groupe_id text, groupe_nom text, pub_id text, pub_nom text,
  quiz_priorite text,
  leads bigint, inscrits bigint, rdv bigint, rdv_tenus bigint,
  depense_campagne numeric, depense_pub numeric
)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  if coalesce(public.get_user_role(), '') not in ('ceo', 'agence') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  return query
  with l as (
    select x.id, x.contact_id, x.created_at, b.status, b.quiz_priorite
      from public.leads x
      join public.leads_enriched_base b on b.id = x.id
     where x.conference_date is not null
       and (p_from is null or x.conference_date >= p_from)
       and (p_to is null or x.conference_date <= p_to)
  ),
  suivi as (
    select src.canal, src.plateforme, src.campagne_id, src.campagne_nom, src.groupe_id, src.groupe_nom,
           src.pub_id, src.pub_nom, l.quiz_priorite,
           (l.status in ('inscrit_conference', 'call_booke', 'close', 'envoi_rediffusion', 'pas_de_reponse_post_conference')
            or exists (select 1 from public.lead_activities h
                        where h.lead_id = l.id and h.action = 'status_change' and h.new_value = 'inscrit_conference')) as inscrit,
           exists (select 1 from public.calls c
                    where c.status <> 'annule'
                      and (c.lead_id = l.id or (c.contact_id = l.contact_id and c.created_at >= l.created_at))) as rdv,
           exists (select 1 from public.calls c
                    where c.status in ('close', 'non_close', 'follow_up', 'disqualifie', 'renvoye_conference', 'rediffusion')
                      and (c.lead_id = l.id or (c.contact_id = l.contact_id and c.created_at >= l.created_at))) as tenu
      from l
      cross join lateral public.source_detaillee_lead(l.id) src
  ),
  noms_campagnes as (
    select distinct on (a.campaign_id) a.campaign_id, a.campaign_name
      from public.ads a
     order by a.campaign_id, a.date desc
  ),
  dc as (
    select case a.plateforme when 'snap' then 'snap_ads' when 'google' then 'google_ads' else 'meta_ads' end as canal,
           coalesce(a.plateforme, 'meta') as plateforme, a.campaign_id, sum(a.amount_spent)::numeric as depense
      from public.ads a
     where (p_from is null or public.next_sunday_noon_paris_after(a.date::timestamp at time zone 'Europe/Paris') >= p_from)
       and (p_to is null or public.next_sunday_noon_paris_after(a.date::timestamp at time zone 'Europe/Paris') <= p_to)
     group by 1, 2, 3
  ),
  dp as (
    select case a.plateforme when 'snap' then 'snap_ads' else 'meta_ads' end as canal, a.plateforme,
           a.campagne_id, a.groupe_id, a.pub_id, sum(a.depense)::numeric as depense
      from public.ads_pubs a
     where (p_from is null or public.next_sunday_noon_paris_after(a.date::timestamp at time zone 'Europe/Paris') >= p_from)
       and (p_to is null or public.next_sunday_noon_paris_after(a.date::timestamp at time zone 'Europe/Paris') <= p_to)
     group by 1, 2, 3, 4, 5
  ),
  noms_pubs as (
    select distinct on (a.plateforme, a.pub_id) a.plateforme, a.pub_id, a.pub_nom, a.groupe_nom, a.campagne_nom
      from public.ads_pubs a
     where (a.plateforme, a.pub_id) in (select dp.plateforme, dp.pub_id from dp)
     order by a.plateforme, a.pub_id, a.date desc
  ),
  tout as (
    select s.canal, s.plateforme, s.campagne_id, s.campagne_nom, s.groupe_id, s.groupe_nom, s.pub_id, s.pub_nom,
           s.quiz_priorite, 1 as leads, s.inscrit::int as inscrits, s.rdv::int as rdv, s.tenu::int as tenus,
           0::numeric as dep_c, 0::numeric as dep_p
      from suivi s
    union all
    select dc.canal, dc.plateforme, dc.campaign_id, nc.campaign_name, null, null, null, null,
           null, 0, 0, 0, 0, dc.depense, 0
      from dc left join noms_campagnes nc on nc.campaign_id = dc.campaign_id
    union all
    select dp.canal, dp.plateforme, dp.campagne_id, coalesce(np.campagne_nom, nc.campaign_name), dp.groupe_id, np.groupe_nom,
           dp.pub_id, np.pub_nom, null, 0, 0, 0, 0, 0, dp.depense
      from dp
      left join noms_pubs np on np.plateforme = dp.plateforme and np.pub_id = dp.pub_id
      left join noms_campagnes nc on nc.campaign_id = dp.campagne_id
  )
  select t.canal, lc.libelle, t.plateforme, t.campagne_id, max(t.campagne_nom), t.groupe_id, max(t.groupe_nom),
         t.pub_id, max(t.pub_nom), t.quiz_priorite,
         sum(t.leads)::bigint, sum(t.inscrits)::bigint, sum(t.rdv)::bigint, sum(t.tenus)::bigint,
         round(sum(t.dep_c), 2), round(sum(t.dep_p), 2)
    from tout t
    left join public.lead_canaux lc on lc.cle = t.canal
   group by t.canal, lc.libelle, t.plateforme, t.campagne_id, t.groupe_id, t.pub_id, t.quiz_priorite;
end;
$function$;

revoke all on function public.sales_sources_ventes(date, date) from public, anon;
revoke all on function public.sales_sources_entonnoir(date, date) from public, anon;
grant execute on function public.sales_sources_ventes(date, date) to authenticated;
grant execute on function public.sales_sources_entonnoir(date, date) to authenticated;
