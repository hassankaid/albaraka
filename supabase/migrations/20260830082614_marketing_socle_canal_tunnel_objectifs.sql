-- Socle du tableau de bord Marketing V2. Applique en production le 30/08/2026.
--
-- Trois choses n'existaient nulle part :
--   1. la classification CANAL x TUNNEL d'un lead et d'une depense ;
--   2. le rattachement des ventes qui n'ont pas de lead ;
--   3. les objectifs mensuels, saisissables par le CEO et l'agence.
--
-- Aucune donnee existante n'est reecrite : tout est en vues et fonctions.

create or replace function public.marketing_canal(p_source text, p_utm_source text)
returns text language sql immutable as $$
  select case
    when p_source is null                              then 'autre'
    when p_source like 'apporteur%'                    then 'apporteur'
    when p_source like '%\_ads'                        then 'meta_ads'
    when p_source like '%instagram_organic'            then 'instagram_organic'
    when p_source like '%tiktok_organic'               then 'tiktok_organic'
    when p_source like '%\_direct'                     then 'direct'
    when lower(coalesce(p_utm_source,'')) in ('fb','facebook','ig','instagram') then 'meta_ads'
    when p_source in ('vsl_a','vsl_b','webi')          then 'meta_ads'
    else 'autre'
  end;
$$;

comment on function public.marketing_canal(text, text) is
  'Canal d''acquisition d''un lead. Depuis le 24/08/2026 le libelle de source le porte ; avant, il se lit dans l''UTM (3 625 des 3 753 leads « webi » portent fb ou ig).';

create or replace function public.marketing_tunnel(p_source text)
returns text language sql immutable as $$
  select case
    when p_source is null              then 'autre'
    when p_source like 'apporteur%'    then 'apporteur'
    when p_source like 'webi_wa%'      then 'wa'
    when p_source like 'webi_vsl%'     then 'vsl'
    when p_source in ('vsl_a','vsl_b') then 'vsl'
    when p_source = 'whatsapp_ads'     then 'wa'
    when p_source = 'webi'             then 'webinaire_legacy'
    else 'autre'
  end;
$$;

create or replace function public.marketing_tunnel_campagne(p_campaign text, p_channel text)
returns text language sql immutable as $$
  select case
    when p_campaign ilike '%(%whatsapp%)%' then 'wa'
    when p_campaign ilike '%(%vsl%)%'      then 'vsl'
    when upper(coalesce(p_channel,'')) = 'WHATSAPP'  then 'wa'
    when upper(coalesce(p_channel,'')) = 'VSL'       then 'vsl'
    when upper(coalesce(p_channel,'')) = 'WEBINAIRE' then 'webinaire_legacy'
    else 'autre'
  end;
$$;

comment on function public.marketing_tunnel_campagne(text, text) is
  'Tunnel d''une ligne de depense, lu dans le nom de campagne. Avant le 24/08/2026 les campagnes ne distinguaient pas WhatsApp de VSL : la depense anterieure ressort en webinaire_legacy, non ventilable.';

create table if not exists public.marketing_objectifs (
  id          uuid primary key default gen_random_uuid(),
  mois        date not null,
  kpi         text not null check (kpi in ('leads','cpl','ventes','ca','cout_par_vente','budget','roi')),
  valeur      numeric not null,
  updated_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (mois, kpi)
);

comment on table public.marketing_objectifs is
  'Objectif mensuel par KPI. `mois` est le 1er du mois. Saisi par le CEO et l''agence depuis l''onglet Marketing.';

alter table public.marketing_objectifs enable row level security;

drop policy if exists marketing_objectifs_select on public.marketing_objectifs;
create policy marketing_objectifs_select on public.marketing_objectifs
  for select to authenticated
  using (public.get_user_role() in ('ceo','agence'));

drop policy if exists marketing_objectifs_write on public.marketing_objectifs;
create policy marketing_objectifs_write on public.marketing_objectifs
  for all to authenticated
  using (public.get_user_role() in ('ceo','agence'))
  with check (public.get_user_role() in ('ceo','agence'));

create or replace function public.tg_marketing_objectifs_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_marketing_objectifs_touch on public.marketing_objectifs;
create trigger trg_marketing_objectifs_touch
  before insert or update on public.marketing_objectifs
  for each row execute function public.tg_marketing_objectifs_touch();
