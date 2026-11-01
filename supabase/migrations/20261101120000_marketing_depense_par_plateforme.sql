-- Le tableau de bord marketing rangeait toute la dépense sous Meta Ads, et dans le
-- tunnel « ancien webinaire » dès que le nom de campagne ne citait pas son tunnel.
-- Sans conséquence tant que la table ads ne contenait que Meta ; faux depuis l'arrivée
-- de Snap et de Google (import du 31/10/2026). Les totaux ne changent pas : seule la
-- répartition par canal et par tunnel est corrigée.
-- Appliqué en base le 01/11/2026.

create or replace function public.marketing_perf(p_mode text, p_from date, p_to date)
returns table(canal text, tunnel text, leads bigint, ventes bigint, ca numeric, depense numeric)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_role text := coalesce(public.get_user_role(), '');
begin
  -- coalesce indispensable : sans lui, un appelant sans profil (anonyme) passe.
  if v_role not in ('ceo', 'agence') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  if p_mode not in ('conference', 'calendrier') then
    raise exception 'mode_inconnu: %', p_mode;
  end if;

  return query
  with l as (
    select case when a.canal = 'apporteur' and a.tunnel = 'quiz_apporteur' then 'tunnel_quiz_apporteurs' else a.canal end as canal,
           coalesce(a.tunnel, 'autre') as tunnel,
           count(*)::bigint as n
    from public.leads x
    cross join lateral public.lead_attribution(x.source, x.source_detail, x.utm_source) a
    where case p_mode
            when 'conference' then x.conference_date between p_from and p_to
            else (x.created_at at time zone 'Europe/Paris')::date between p_from and p_to
          end
    group by 1, 2
  ),
  v as (
    select case when x.id is null then 'non_attribue'
                when a.canal = 'apporteur' and a.tunnel = 'quiz_apporteur' then 'tunnel_quiz_apporteurs'
                else a.canal end as canal,
           case when x.id is null then 'non_attribue' else coalesce(a.tunnel, 'autre') end as tunnel,
           count(*)::bigint as n,
           sum(va.amount_ht)::numeric as ca
    from public.marketing_ventes_attribuees va
    left join public.leads x on x.id = va.lead_id
    left join lateral public.lead_attribution(x.source, x.source_detail, x.utm_source) a on x.id is not null
    where case p_mode
            when 'conference' then va.conference_date between p_from and p_to
            else (va.sold_at at time zone 'Europe/Paris')::date between p_from and p_to
          end
    group by 1, 2
  ),
  -- Le tunnel d'une campagne, d'après les leads qu'elle a amenés : utm_campaign porte son
  -- identifiant. Les noms des campagnes actuelles ne citent plus leur tunnel.
  c as (
    select x.utm_campaign as campagne_id,
           mode() within group (order by coalesce(a.tunnel, 'autre')) as tunnel
    from public.leads x
    cross join lateral public.lead_attribution(x.source, x.source_detail, x.utm_source) a
    where x.utm_campaign in (select ad.campaign_id from public.ads ad)
    group by 1
  ),
  d as (
    select case a.plateforme when 'snap' then 'snap_ads' when 'google' then 'google_ads' else 'meta_ads' end as canal,
           case
             -- Le tunnel écrit dans le nom de la campagne reste prioritaire.
             when public.marketing_tunnel_depense(a.campaign_name, a.channel) in ('whatsapp', 'vsl')
               then public.marketing_tunnel_depense(a.campaign_name, a.channel)
             when c.tunnel is not null then c.tunnel
             -- Google ne transmet pas d'UTM : ses leads n'ont aucun lien avec sa campagne,
             -- et ils viennent tous du tunnel WhatsApp.
             when a.plateforme <> 'meta' then 'whatsapp'
             else public.marketing_tunnel_depense(a.campaign_name, a.channel)
           end as tunnel,
           sum(a.amount_spent)::numeric as depense
    from public.ads a
    left join c on c.campagne_id = a.campaign_id
    where case p_mode
            when 'conference'
              then public.next_sunday_noon_paris_after(a.date::timestamp at time zone 'Europe/Paris')
                   between p_from and p_to
            else a.date between p_from and p_to
          end
    group by 1, 2
  ),
  tout as (
    select l.canal, l.tunnel, l.n as leads, 0::bigint as ventes, 0::numeric as ca, 0::numeric as depense from l
    union all
    select v.canal, v.tunnel, 0::bigint, v.n, v.ca, 0::numeric from v
    union all
    select d.canal, d.tunnel, 0::bigint, 0::bigint, 0::numeric, d.depense from d
  )
  select t.canal, t.tunnel,
         sum(t.leads)::bigint,
         sum(t.ventes)::bigint,
         round(sum(t.ca), 2),
         round(sum(t.depense), 2)
  from tout t
  group by t.canal, t.tunnel
  order by sum(t.leads) desc, t.canal, t.tunnel;
end;
$function$;

-- Dernier jour dont la dépense est complète pour TOUS les comptes suivis. Make envoie
-- chaque matin les jours jusqu'à la veille : un compte en retard fait reculer la date.
-- La dernière réception sert de repère, car un compte sans dépense n'a aucune ligne.
create or replace function public.marketing_depenses_connues_jusqu_au()
returns date
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_jour date;
begin
  if coalesce(public.get_user_role(), '') not in ('ceo', 'agence') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  select min(r.dernier_jour) into v_jour
  from (
    select (select max(i.recu_le at time zone 'Europe/Paris')::date - 1
              from public.ads_imports i
             where i.plateforme = c.plateforme and i.compte_id = c.compte_id and i.erreur is null) as dernier_jour
    from public.ads_comptes c
    where c.actif
  ) r;

  return v_jour;
end;
$function$;
revoke execute on function public.marketing_depenses_connues_jusqu_au() from public, anon;
grant execute on function public.marketing_depenses_connues_jusqu_au() to authenticated;
