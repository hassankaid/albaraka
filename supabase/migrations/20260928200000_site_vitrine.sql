-- ─────────────────────────────────────────────────────────────────────────
-- Site vitrine AL BARAKA Écosystème (albarakaecosysteme.com).
--
-- 1. Les demandes de rendez-vous du site arrivent dans les leads avec la
--    source `site_vitrine` (libellé CRM « Site vitrine »), comme les tunnels :
--    non assignées, au statut « à qualifier ». Décision de Hassan le 28/09/2026.
--
--    Trois endroits vont ensemble, sinon le filet SILENCIEUX de
--    `tunnel-lead-submit` range la demande en `webi_wa_direct` — un inscrit à
--    la conférence venu en direct :
--      - `leads_source_check` (ici) ;
--      - `ALLOWED_SOURCES` dans supabase/functions/tunnel-lead-submit ;
--      - `marketing_canal` / `marketing_tunnel` (ici), pour les statistiques.
--
-- 2. Le site est ORGANIQUE : aucune publicité n'y mène. `marketing_canal` le
--    classe explicitement AVANT le test sur `utm_source` — sans quoi un
--    visiteur arrivé d'un post Instagram avec `utm_source=instagram` serait
--    compté en Meta Ads.
--
-- 3. Les témoignages vidéo du carrousel (cahier §5) : une liste modifiable
--    depuis la plateforme, sans toucher au code. Lecture publique des seules
--    lignes visibles — le site n'est pas connecté —, écriture réservée au CEO.
--
-- Les définitions de `marketing_canal` et `marketing_tunnel` reprennent celles
-- de PRODUCTION du 28/09/2026 (lues en base), pas celles des anciennes
-- migrations du repo : `marketing_canal` y a gagné `youtube_organic` depuis.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Source autorisée ───────────────────────────────────────────────────

alter table public.leads drop constraint if exists leads_source_check;

alter table public.leads add constraint leads_source_check check (
  source = any (array[
    -- Origines historiques
    'vsl_a', 'vsl_b', 'webi',
    'instagram_ads', 'whatsapp_ads', 'instagram_organic', 'meta_ads', 'autre',
    -- Apporteurs
    'apporteur_facebook', 'apporteur_whatsapp', 'apporteur_instagram',
    'apporteur_linkedin', 'apporteur_recommandation', 'apporteur_telegram',
    'apporteur_tiktok', 'apporteur_autre', 'apporteur_quiz',
    -- Tunnel WhatsApp
    'webi_wa_ads', 'webi_wa_instagram_organic', 'webi_wa_tiktok_organic',
    'webi_wa_youtube_organic', 'webi_wa_direct',
    -- Tunnel VSL
    'webi_vsl_ads', 'webi_vsl_instagram_organic', 'webi_vsl_tiktok_organic',
    'webi_vsl_youtube_organic', 'webi_vsl_direct',
    -- Tunnel Liberty
    'liberty_ads', 'liberty_instagram_organic', 'liberty_tiktok_organic',
    'liberty_youtube_organic', 'liberty_direct',
    -- Site vitrine (28/09/2026)
    'site_vitrine'
  ])
);

-- 2. Classement marketing ───────────────────────────────────────────────

create or replace function public.marketing_canal(p_source text, p_utm_source text)
returns text
language sql
immutable
as $function$
  select case
    when p_source is null                              then 'autre'
    when p_source = 'apporteur_quiz'                   then 'tunnel_quiz_apporteurs'
    when p_source like 'apporteur%'                    then 'apporteur'
    -- Organique par nature : AVANT le test sur utm_source, qui le rangerait
    -- en Meta Ads au premier lien Instagram tagué.
    when p_source = 'site_vitrine'                     then 'site_vitrine_organic'
    when p_source like '%\_ads'                        then 'meta_ads'
    when p_source like '%instagram_organic'            then 'instagram_organic'
    when p_source like '%tiktok_organic'               then 'tiktok_organic'
    when p_source like '%youtube_organic'              then 'youtube_organic'
    when p_source like '%\_direct'                     then 'direct'
    when lower(coalesce(p_utm_source,'')) in ('fb','facebook','ig','instagram') then 'meta_ads'
    when p_source in ('vsl_a','vsl_b','webi')          then 'meta_ads'
    else 'autre'
  end;
$function$;

create or replace function public.marketing_tunnel(p_source text)
returns text
language sql
immutable
as $function$
  select case
    when p_source is null              then 'autre'
    when p_source = 'apporteur_quiz'   then 'quiz'
    when p_source like 'apporteur%'    then 'apporteur'
    when p_source like 'webi_wa%'      then 'wa'
    when p_source like 'webi_vsl%'     then 'vsl'
    when p_source in ('vsl_a','vsl_b') then 'vsl'
    when p_source = 'whatsapp_ads'     then 'wa'
    when p_source = 'webi'             then 'webinaire_legacy'
    when p_source = 'site_vitrine'     then 'vitrine'
    else 'autre'
  end;
$function$;

-- 3. Témoignages du site vitrine ────────────────────────────────────────

create table if not exists public.temoignages_vitrine (
  id          uuid primary key default gen_random_uuid(),
  -- Identifiant numérique Vimeo : c'est lui qui compose l'URL du lecteur.
  vimeo_id    text not null check (vimeo_id ~ '^[0-9]{5,12}$'),
  -- Le `h=` d'une vidéo « masquée de Vimeo ». Sans lui, le lecteur refuse de
  -- démarrer. Il se lit dans `player_embed_url`, jamais dans `link`.
  hash        text check (hash is null or hash ~ '^[0-9a-f]{6,20}$'),
  -- Miniature enregistrée à la saisie : la page n'appelle pas Vimeo avant
  -- le clic, donc aucun cookie Vimeo avant que le visiteur l'ait voulu.
  miniature   text check (miniature is null or miniature ~ '^https://i\.vimeocdn\.com/'),
  prenom      text not null check (length(btrim(prenom)) between 1 and 40),
  activite    text not null check (length(btrim(activite)) between 1 and 80),
  ordre       integer not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.temoignages_vitrine is
  'Carrousel « Les retours de nos membres » du site vitrine (cahier §5). Lecture publique des lignes visibles, écriture CEO.';

create index if not exists temoignages_vitrine_ordre on public.temoignages_vitrine (ordre) where visible;

alter table public.temoignages_vitrine enable row level security;

-- Le site vitrine n'est pas connecté : il lit avec la clé publique.
drop policy if exists temoignages_vitrine_lecture_publique on public.temoignages_vitrine;
create policy temoignages_vitrine_lecture_publique on public.temoignages_vitrine
  for select to anon, authenticated
  using (visible);

drop policy if exists temoignages_vitrine_ceo on public.temoignages_vitrine;
create policy temoignages_vitrine_ceo on public.temoignages_vitrine
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo'));

grant select on public.temoignages_vitrine to anon;
grant select, insert, update, delete on public.temoignages_vitrine to authenticated;

create or replace function public.temoignages_vitrine_horodater()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists temoignages_vitrine_horodater on public.temoignages_vitrine;
create trigger temoignages_vitrine_horodater
  before update on public.temoignages_vitrine
  for each row execute function public.temoignages_vitrine_horodater();
