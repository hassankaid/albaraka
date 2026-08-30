-- Agregation du tableau de bord Marketing, et fermeture de deux trous de
-- securite introduits par sa premiere version. Applique en production le
-- 30/08/2026 (versions 20260830082709, 083402 et 083434 : ce fichier consolide
-- l'etat final, plus lisible que les trois fragments).
--
-- LES DEUX TROUS, pour qu'ils ne soient pas refaits :
--
--   1. Le garde d'acces s'ecrivait `if get_user_role() not in ('ceo','agence')`.
--      Pour un appelant anonyme, get_user_role() renvoie NULL et
--      `NULL not in (...)` vaut NULL, pas TRUE : la condition ne se declenchait
--      jamais. Verifie par un appel reel : HTTP 200, chiffre d'affaires rendu a
--      la cle anonyme. D'ou le coalesce.
--
--   2. Une vue Postgres s'execute avec les droits de son PROPRIETAIRE : la vue
--      d'attribution contournait le RLS de `sales` et PostgREST la servait a
--      l'anonyme. D'ou security_invoker.
--
-- Dans les deux cas, la revocation explicite pour `anon` est doublee : Supabase
-- re-accorde l'acces par defaut sur tout nouvel objet du schema public.

create or replace view public.marketing_ventes_attribuees as
select
  s.id            as vente_id,
  s.sold_at,
  s.conference_date,
  s.amount_ht,
  s.product,
  s.contact_id,
  coalesce(
    s.lead_id,
    (select c.lead_id from public.calls c where c.id = s.call_id),
    (select l.id from public.leads l
      where l.contact_id = s.contact_id
        and (s.sold_at is null or l.created_at <= s.sold_at)
      order by l.created_at desc limit 1)
  ) as lead_id,
  case
    when s.lead_id is not null then 'direct'
    when (select c.lead_id from public.calls c where c.id = s.call_id) is not null then 'via_appel'
    when exists (select 1 from public.leads l
                  where l.contact_id = s.contact_id
                    and (s.sold_at is null or l.created_at <= s.sold_at)) then 'deduit'
    else 'non_attribue'
  end as mode_attribution
from public.sales s;

comment on view public.marketing_ventes_attribuees is
  'Une ligne par vente, avec le lead retrouve et la maniere dont il l''a ete. `sales.lead_id` n''est jamais reecrit : la deduction est recalculee a chaque lecture, donc auditable.';

alter view public.marketing_ventes_attribuees set (security_invoker = on);
revoke all on public.marketing_ventes_attribuees from anon;
grant select on public.marketing_ventes_attribuees to authenticated;

create or replace function public.marketing_perf(p_mode text, p_from date, p_to date)
returns table (canal text, tunnel text, leads bigint, ventes bigint, ca numeric, depense numeric)
language plpgsql stable security definer set search_path = public
as $$
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
    select public.marketing_canal(x.source, x.utm_source) as canal,
           public.marketing_tunnel(x.source)              as tunnel,
           count(*)::bigint                               as n
    from public.leads x
    where case p_mode
            when 'conference' then x.conference_date between p_from and p_to
            else (x.created_at at time zone 'Europe/Paris')::date between p_from and p_to
          end
    group by 1, 2
  ),
  v as (
    select coalesce(public.marketing_canal(x.source, x.utm_source), 'non_attribue') as canal,
           coalesce(public.marketing_tunnel(x.source), 'non_attribue')              as tunnel,
           count(*)::bigint                                                          as n,
           sum(va.amount_ht)::numeric                                                as ca
    from public.marketing_ventes_attribuees va
    left join public.leads x on x.id = va.lead_id
    where case p_mode
            when 'conference' then va.conference_date between p_from and p_to
            else (va.sold_at at time zone 'Europe/Paris')::date between p_from and p_to
          end
    group by 1, 2
  ),
  d as (
    -- La depense d'un jour est rattachee a la conference vers laquelle elle
    -- poussait : la premiere a partir de ce jour-la, meme regle que les leads.
    select 'meta_ads'::text                                             as canal,
           public.marketing_tunnel_campagne(a.campaign_name, a.channel) as tunnel,
           sum(a.amount_spent)::numeric                                 as depense
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
         sum(t.leads)::bigint, sum(t.ventes)::bigint,
         round(sum(t.ca), 2), round(sum(t.depense), 2)
  from tout t
  group by t.canal, t.tunnel
  order by sum(t.leads) desc, t.canal, t.tunnel;
end;
$$;

comment on function public.marketing_perf(text, date, date) is
  'Performance marketing agregee par canal x tunnel. Reserve au CEO et a l''agence. Les CPL, cout par vente et ROI se calculent cote client a partir de ces quatre mesures brutes, pour qu''un sous-total ne puisse jamais contredire le total.';

revoke all on function public.marketing_perf(text, date, date) from public, anon;
grant execute on function public.marketing_perf(text, date, date) to authenticated;
