-- Performance par créa (demande de Skalesy, 03/11/2026) — lot 2.
--
-- 1) ads_pubs : la dépense par PUB et par jour, envoyée chaque matin par Make (un
--    scénario par compte, à côté de celui des campagnes). La table ads, par campagne,
--    reste la référence des totaux du tableau de bord : rien n'y change.
-- 2) ads_imports.niveau : distingue les deux remontées, pour que la surveillance
--    et la mention « dépenses connues jusqu'au » ne se masquent pas l'une l'autre.
-- 3) marketing_par_crea / marketing_crea_detail : une ligne par pub sur une période,
--    et le détail de ses leads. Les ventes sont celles des leads arrivés sur la
--    période, QUELLE QUE SOIT la date de la vente : c'est ce qui dit ce qu'une créa
--    a rapporté (une vente arrive en moyenne 3 jours après le lead).
--
-- Appliqué en base le 03/11/2026.

create table if not exists public.ads_pubs (
  date date not null,
  plateforme text not null,
  compte_id text not null,
  pub_id text not null,
  pub_nom text,
  groupe_id text,
  groupe_nom text,
  campagne_id text,
  campagne_nom text,
  depense numeric(12, 2) not null default 0,
  impressions integer not null default 0,
  clics integer not null default 0,
  devise text not null default 'EUR',
  importe_le timestamptz not null default now(),
  primary key (plateforme, date, pub_id)
);

comment on table public.ads_pubs is
  'Dépense par pub et par jour (Make, chaque matin, 7 derniers jours). Jour du fuseau du compte (Snap : UTC+4). Les totaux du tableau de bord restent sur ads (par campagne).';

create index if not exists ads_pubs_pub_idx on public.ads_pubs(plateforme, pub_id);

-- Lue seulement par les fonctions ci-dessous (security definer) ; écrite par la réception Make.
alter table public.ads_pubs enable row level security;

alter table public.ads_imports add column if not exists niveau text not null default 'campagne';

create or replace function public.importer_depenses_pub_par_pub(p_plateforme text, p_compte text, p_lignes jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_min date;
  v_max date;
  v_lignes int := 0;
  v_effacees int := 0;
begin
  if jsonb_typeof(p_lignes) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Lignes attendues sous forme de liste.';
  end if;

  select min((l ->> 'jour')::date), max((l ->> 'jour')::date) into v_min, v_max
    from jsonb_array_elements(p_lignes) l;

  insert into public.ads_pubs (date, plateforme, compte_id, pub_id, pub_nom, groupe_id, groupe_nom, campagne_id, campagne_nom,
                               depense, impressions, clics, devise, importe_le)
  select (l ->> 'jour')::date, p_plateforme, p_compte, l ->> 'pub_id',
         nullif(btrim(l ->> 'pub'), ''), nullif(l ->> 'groupe_id', ''), nullif(btrim(l ->> 'groupe'), ''),
         nullif(l ->> 'campagne_id', ''), nullif(btrim(l ->> 'campagne'), ''),
         round(coalesce(nullif(l ->> 'montant', '')::numeric, 0), 2),
         coalesce(nullif(l ->> 'impressions', '')::numeric, 0)::int, coalesce(nullif(l ->> 'clics', '')::numeric, 0)::int,
         upper(coalesce(nullif(btrim(l ->> 'devise'), ''), 'EUR')), now()
    from jsonb_array_elements(p_lignes) l
   where coalesce(nullif(l ->> 'montant', '')::numeric, 0) > 0
  on conflict (plateforme, date, pub_id) do update
    set pub_nom = excluded.pub_nom, groupe_id = excluded.groupe_id, groupe_nom = excluded.groupe_nom,
        campagne_id = excluded.campagne_id, campagne_nom = excluded.campagne_nom,
        depense = excluded.depense, impressions = excluded.impressions, clics = excluded.clics,
        compte_id = excluded.compte_id, devise = excluded.devise, importe_le = excluded.importe_le;
  get diagnostics v_lignes = row_count;

  -- Une pub dont la plateforme a annulé la dépense d'un jour disparaît de ce jour.
  if v_min is not null then
    delete from public.ads_pubs a
     where a.plateforme = p_plateforme and a.compte_id = p_compte and a.date between v_min and v_max
       and not exists (
         select 1 from jsonb_array_elements(p_lignes) l
          where (l ->> 'jour')::date = a.date and l ->> 'pub_id' = a.pub_id
            and coalesce(nullif(l ->> 'montant', '')::numeric, 0) > 0);
    get diagnostics v_effacees = row_count;
  end if;

  insert into public.ads_imports (plateforme, compte_id, lignes, effacees, niveau) values (p_plateforme, p_compte, v_lignes, v_effacees, 'pub');
  return jsonb_build_object('niveau', 'pub', 'lignes', v_lignes, 'effacees', v_effacees, 'du', v_min, 'au', v_max);
end
$function$;

revoke all on function public.importer_depenses_pub_par_pub(text, text, jsonb) from public, anon, authenticated;

-- Surveillance : les comptes Meta et Snap ont aussi leur remontée par pub, suivie à part.
create or replace function public.statut_depenses_pub()
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  with c as (
    select c.plateforme, c.compte_id, c.nom, 'campagne'::text as niveau
      from public.ads_comptes c where c.actif
    union all
    select c.plateforme, c.compte_id, c.nom || ' (par pub)', 'pub'
      from public.ads_comptes c where c.actif and c.plateforme in ('meta', 'snap')
  ),
  s as (
    select c.*,
           (select max(i.recu_le) from public.ads_imports i
             where i.plateforme = c.plateforme and i.compte_id = c.compte_id and i.niveau = c.niveau) dernier_import,
           case when c.niveau = 'pub'
                then (select max(a.date) from public.ads_pubs a where a.plateforme = c.plateforme and a.compte_id = c.compte_id)
                else (select max(a.date) from public.ads a where a.plateforme = c.plateforme and a.compte_id = c.compte_id)
           end dernier_jour
      from c
  )
  select jsonb_build_object(
    'comptes', coalesce(jsonb_agg(jsonb_build_object('plateforme', plateforme, 'compte', compte_id, 'nom', nom, 'niveau', niveau,
                                                     'dernier_import', dernier_import, 'dernier_jour', dernier_jour)), '[]'::jsonb),
    'en_retard', coalesce(string_agg(nom, ', ') filter (where dernier_import is null or dernier_import < now() - interval '36 hours'), ''),
    'nb_en_retard', count(*) filter (where dernier_import is null or dernier_import < now() - interval '36 hours'))
  from s
$function$;

-- La mention « dépenses connues jusqu'au » suit la remontée par campagne, qui fait les totaux.
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
             where i.plateforme = c.plateforme and i.compte_id = c.compte_id and i.erreur is null
               and i.niveau = 'campagne') as dernier_jour
    from public.ads_comptes c
    where c.actif
  ) r;

  return v_jour;
end;
$function$;

-- Leads payants de la période, avec la pub qui les a amenés. Meta et Snap seulement :
-- Google ne transmet pas d'identifiant de pub.
create or replace function public.marketing_leads_par_pub(p_from date, p_to date)
returns table(lead_id uuid, contact_id uuid, plateforme text, pub_id text, cree_le timestamptz, statut text, nom text)
language sql
stable security definer
set search_path to 'public'
as $function$
  select l.id, l.contact_id,
         case a.canal when 'snap_ads' then 'snap' else 'meta' end,
         nullif(btrim(l.utm_content), ''),
         l.created_at, l.status, l.raw_full_name
  from public.leads l
  cross join lateral public.lead_attribution(l.source, l.source_detail, l.utm_source) a
  where a.canal in ('meta_ads', 'snap_ads')
    and (l.created_at at time zone 'Europe/Paris')::date between p_from and p_to
$function$;

revoke all on function public.marketing_leads_par_pub(date, date) from public, anon, authenticated;

create or replace function public.marketing_par_crea(p_from date, p_to date)
returns table(
  plateforme text, pub_id text, pub_nom text, groupe_nom text, campagne_nom text,
  depense numeric, impressions bigint, clics bigint,
  leads bigint, inscrits bigint, rdv bigint, ventes bigint, ca numeric,
  premier_jour date, dernier_jour date
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
  with l as (select * from public.marketing_leads_par_pub(p_from, p_to)),
  suivi as (
    select l.plateforme, l.pub_id, l.lead_id,
           (l.statut in ('inscrit_conference', 'call_booke', 'close', 'envoi_rediffusion', 'pas_de_reponse_post_conference')
            or exists (select 1 from public.lead_activities h
                        where h.lead_id = l.lead_id and h.action = 'status_change' and h.new_value = 'inscrit_conference')) as inscrit,
           exists (select 1 from public.calls c
                    where c.status <> 'annule'
                      and (c.lead_id = l.lead_id or (c.contact_id = l.contact_id and c.created_at >= l.cree_le))) as rdv
    from l
  ),
  v as (
    select l.plateforme, l.pub_id, count(va.vente_id)::bigint as n, coalesce(sum(va.amount_ht), 0)::numeric as ca
    from l join public.marketing_ventes_attribuees va on va.lead_id = l.lead_id
    group by 1, 2
  ),
  d as (
    select a.plateforme, a.pub_id, sum(a.depense)::numeric as depense,
           sum(a.impressions)::bigint as impressions, sum(a.clics)::bigint as clics,
           min(a.date) as premier, max(a.date) as dernier
    from public.ads_pubs a
    where a.date between p_from and p_to
    group by 1, 2
  ),
  -- Le nom le plus récent connu de la pub, même hors période.
  noms as (
    select distinct on (a.plateforme, a.pub_id) a.plateforme, a.pub_id, a.pub_nom, a.groupe_nom, a.campagne_nom
    from public.ads_pubs a
    order by a.plateforme, a.pub_id, a.date desc
  ),
  cles as (
    select s.plateforme, s.pub_id from suivi s
    union
    select d.plateforme, d.pub_id from d
  )
  select k.plateforme, k.pub_id, n.pub_nom, n.groupe_nom, n.campagne_nom,
         coalesce(d.depense, 0), coalesce(d.impressions, 0), coalesce(d.clics, 0),
         (select count(*) from suivi s where s.plateforme = k.plateforme and s.pub_id is not distinct from k.pub_id)::bigint,
         (select count(*) from suivi s where s.plateforme = k.plateforme and s.pub_id is not distinct from k.pub_id and s.inscrit)::bigint,
         (select count(*) from suivi s where s.plateforme = k.plateforme and s.pub_id is not distinct from k.pub_id and s.rdv)::bigint,
         coalesce(v.n, 0), coalesce(v.ca, 0),
         d.premier, d.dernier
  from cles k
  left join d on d.plateforme = k.plateforme and d.pub_id = k.pub_id
  left join v on v.plateforme = k.plateforme and v.pub_id is not distinct from k.pub_id
  left join noms n on n.plateforme = k.plateforme and n.pub_id = k.pub_id
  order by coalesce(v.ca, 0) desc, coalesce(d.depense, 0) desc;
end;
$function$;

create or replace function public.marketing_crea_detail(p_plateforme text, p_pub_id text, p_from date, p_to date)
returns table(lead_id uuid, nom text, cree_le timestamptz, statut text, inscrit boolean, rdv boolean,
              ventes bigint, ca numeric, vendu_le timestamptz)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  if coalesce(public.get_user_role(), '') not in ('ceo', 'agence') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;

  return query
  select l.lead_id, l.nom, l.cree_le, l.statut,
         (l.statut in ('inscrit_conference', 'call_booke', 'close', 'envoi_rediffusion', 'pas_de_reponse_post_conference')
          or exists (select 1 from public.lead_activities h
                      where h.lead_id = l.lead_id and h.action = 'status_change' and h.new_value = 'inscrit_conference')),
         exists (select 1 from public.calls c
                  where c.status <> 'annule'
                    and (c.lead_id = l.lead_id or (c.contact_id = l.contact_id and c.created_at >= l.cree_le))),
         (select count(*) from public.marketing_ventes_attribuees va where va.lead_id = l.lead_id)::bigint,
         (select coalesce(sum(va.amount_ht), 0) from public.marketing_ventes_attribuees va where va.lead_id = l.lead_id)::numeric,
         (select min(va.sold_at) from public.marketing_ventes_attribuees va where va.lead_id = l.lead_id)
  from public.marketing_leads_par_pub(p_from, p_to) l
  where l.plateforme = p_plateforme and l.pub_id is not distinct from nullif(p_pub_id, '')
  order by l.cree_le desc;
end;
$function$;

revoke all on function public.marketing_par_crea(date, date) from public, anon;
revoke all on function public.marketing_crea_detail(text, text, date, date) from public, anon;
grant execute on function public.marketing_par_crea(date, date) to authenticated;
grant execute on function public.marketing_crea_detail(text, text, date, date) to authenticated;
