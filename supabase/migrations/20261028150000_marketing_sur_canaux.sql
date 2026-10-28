-- ─────────────────────────────────────────────────────────────────────────
-- Le tableau de bord marketing parle le même langage que la page Leads (28/10/2026).
--
-- marketing_perf classait les leads avec ses propres règles (marketing_canal,
-- marketing_tunnel). Une source créée par Sidali dans « Gérer les sources »
-- (lien ?src=…) y serait apparue en « Accès direct ». Désormais le canal et le
-- tunnel viennent de lead_attribution, comme dans la page Leads, et les noms
-- affichés de lead_canaux / lead_tunnels (un renommage vaut partout).
--
-- Deux exceptions, propres au tableau de bord :
--   • le quiz des apporteurs reste un canal marketing à part (tunnel_quiz_apporteurs) :
--     c'est une landing, il se compare aux campagnes ; les autres apports d'apporteur non ;
--   • une vente sans lead rattaché est « non attribuée ».
--
-- Correction du classement : les anciens tunnels Systeme.io (webi, vsl_a, vsl_b)
-- étaient alimentés par Meta. Le tableau de bord et l'ancien filtre de la page Leads
-- les comptaient en Ads ; la migration 20261028120000 les avait mis en « Sans source ».
-- ─────────────────────────────────────────────────────────────────────────

update public.lead_sources_map set canal = 'meta_ads' where source in ('webi', 'vsl_a', 'vsl_b');

-- Précision d'un lead Meta : Instagram / Facebook d'après utm_source, sinon celle de la
-- correspondance (VSL A / VSL B pour les anciens tunnels Systeme.io).
create or replace function public.lead_attribution(p_source text, p_detail text, p_utm_source text)
returns table (canal text, tunnel text, canal_precision text)
language sql stable set search_path = public
as $$
  with m as (select * from lead_sources_map where source = p_source),
       lien as (
         select coalesce(
                  (select a.canal from lead_canaux_alias a where a.ancien = lower(btrim(p_detail))),
                  (select c.cle from lead_canaux c where c.cle = lower(btrim(p_detail)))) as cle),
       brut as (
         select case when coalesce((select m.canal from m), 'sans_source') = 'sans_source' and (select cle from lien) is not null
                     then (select cle from lien)
                     else coalesce((select m.canal from m), case when p_source is null then 'autre' else 'sans_source' end)
                end as canal)
  select coalesce((select a.canal from lead_canaux_alias a where a.ancien = brut.canal), brut.canal) as canal,
         (select m.tunnel from m) as tunnel,
         case
           when coalesce((select a.canal from lead_canaux_alias a where a.ancien = brut.canal), brut.canal) = 'meta_ads'
             then case when lower(coalesce(p_utm_source, '')) in ('ig', 'instagram') then 'Instagram'
                       when lower(coalesce(p_utm_source, '')) in ('fb', 'facebook') then 'Facebook'
                       else (select m.canal_precision from m) end
           else (select m.canal_precision from m)
         end as canal_precision
  from brut
$$;


-- Tunnel d'une dépense Meta, d'après le nom de la campagne (mêmes clés que lead_tunnels).
create or replace function public.marketing_tunnel_depense(p_campaign text, p_channel text)
returns text
language sql immutable
as $$
  select case public.marketing_tunnel_campagne(p_campaign, p_channel)
           when 'wa' then 'whatsapp'
           when 'webinaire_legacy' then 'ancien_webinaire'
           else public.marketing_tunnel_campagne(p_campaign, p_channel)
         end
$$;

create or replace function public.marketing_perf(p_mode text, p_from date, p_to date)
returns table(canal text, tunnel text, leads bigint, ventes bigint, ca numeric, depense numeric)
language plpgsql stable security definer set search_path to 'public'
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
  d as (
    select 'meta_ads'::text as canal,
           public.marketing_tunnel_depense(a.campaign_name, a.channel) as tunnel,
           sum(a.amount_spent)::numeric as depense
    from public.ads a
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
