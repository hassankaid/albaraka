-- ─────────────────────────────────────────────────────────────────────────
-- Studio, outil Voix off (cahier des charges de Sidali du 29/09/2026, sections 3, 7, 8).
--
-- 1. studio_montages : le script lu par l'élève et le thème (détecté par l'IA,
--    modifiable). Le script sert à repérer les phrases ratées et à écrire les
--    sous-titres avec la bonne orthographe.
-- 2. La banque de vidéos :
--    - studio_banque_videos : une vidéo importée (admin, puis Google Drive) ;
--    - studio_banque_plans : ses plans (découpage par changement de scène), leur
--      fiche décrite par l'IA et un vecteur de sens (1024, qwen3-embedding via
--      OpenRouter) pour la recherche « par le sens » ;
--    - studio_banque_themes : les 20 thèmes proposés dans le cahier, à ajuster par Sidali.
--    Le cahier prévoit aussi un vecteur image-texte (CLIP) : non disponible chez notre
--    fournisseur ; la fiche décrite par l'IA à partir de 3 images le remplace.
-- 3. L'indexation tourne sur une machine de montage (Vercel Sandbox) : elle n'a qu'un
--    jeton d'indexation, et écrit par les fonctions studio_banque_job_*.
-- 4. Recherche des plans pour un montage : studio_job_chercher_plans (jeton du montage).
--
-- Tout est réservé au CEO tant que le Studio n'est pas ouvert aux élèves.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists vector with schema extensions;

-- 1. le script et le thème du montage Voix off
alter table public.studio_montages add column if not exists script text;
alter table public.studio_montages add column if not exists theme text;
do $$ begin
  alter table public.studio_montages add constraint studio_montages_script_longueur
    check (script is null or char_length(script) <= 5000);
exception when duplicate_object then null; end $$;

-- 2. la banque
create table if not exists public.studio_banque_themes (
  id text primary key,
  nom text not null,
  ordre integer not null default 0,
  actif boolean not null default true
);

insert into public.studio_banque_themes (id, nom, ordre) values
  ('argent', 'Argent et revenus', 1),
  ('liberte_financiere', 'Liberté financière', 2),
  ('salariat', 'Salariat et routine', 3),
  ('galere', 'Galère et fin de mois difficile', 4),
  ('declic', 'Déclic et prise de décision', 5),
  ('entrepreneuriat', 'Entrepreneuriat', 6),
  ('business_en_ligne', 'Business en ligne et e-commerce', 7),
  ('travail_ecran', 'Travail sur ordinateur et téléphone', 8),
  ('reseaux_sociaux', 'Réseaux sociaux et création de contenu', 9),
  ('vente', 'Vente et appels clients', 10),
  ('formation', 'Apprentissage et formation', 11),
  ('discipline', 'Discipline et sport', 12),
  ('reussite', 'Réussite et célébration', 13),
  ('famille', 'Famille et proches', 14),
  ('foi', 'Foi et spiritualité', 15),
  ('voyage', 'Voyage et liberté géographique', 16),
  ('dubai', 'Dubaï et lifestyle', 17),
  ('nature', 'Nature et sérénité', 18),
  ('ville', 'Ville et énergie urbaine', 19),
  ('temps', 'Temps qui passe', 20)
on conflict (id) do nothing;

create table if not exists public.studio_banque_videos (
  id uuid primary key default gen_random_uuid(),
  origine text not null default 'import' check (origine in ('import', 'drive')),
  drive_id text unique,
  dossier text,                         -- dossier d'origine (Drive) : « NE PAS UTILISER », « AMBIANCE AL BARAKA »…
  nom text not null,
  chemin_original text not null,        -- bucket studio-banque
  chemin_travail text,                  -- 1080×1920, 30 i/s, sans son
  duree numeric,
  largeur integer,
  hauteur integer,
  statut text not null default 'a_indexer' check (statut in ('a_indexer', 'indexation', 'indexee', 'erreur')),
  erreur text,
  exclue boolean not null default false,
  ajoutee_par uuid default auth.uid() references auth.users(id) on delete set null,
  modifiee_le_drive timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_banque_plans (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.studio_banque_videos(id) on delete cascade,
  rang integer not null,
  debut numeric not null,
  fin numeric not null,
  images text[] not null default '{}',  -- 3 images clés (25, 50, 75 %)
  description text,
  themes text[] not null default '{}',
  mots_cles text[] not null default '{}',
  lieu text,
  ambiance text,
  personnes boolean,
  visage_reconnaissable boolean,
  texte_ecran boolean,
  logo boolean,
  qualite text check (qualite in ('nette', 'floue', 'sombre')),
  exclu boolean not null default false,
  secours boolean not null default false,  -- sélection « ambiance AL BARAKA »
  embedding extensions.vector(1024),
  created_at timestamptz not null default now(),
  unique (video_id, rang)
);

create index if not exists studio_banque_plans_vecteur on public.studio_banque_plans
  using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists studio_banque_plans_themes on public.studio_banque_plans using gin (themes);
create index if not exists studio_banque_videos_statut on public.studio_banque_videos (statut);

create table if not exists public.studio_banque_jobs (
  id uuid primary key default gen_random_uuid(),
  jeton_hash text not null,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'termine', 'erreur')),
  videos uuid[] not null default '{}',
  rapport jsonb,
  lance_par uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_banque_themes enable row level security;
alter table public.studio_banque_videos enable row level security;
alter table public.studio_banque_plans enable row level security;
alter table public.studio_banque_jobs enable row level security;

drop policy if exists studio_banque_themes_lire on public.studio_banque_themes;
create policy studio_banque_themes_lire on public.studio_banque_themes for select to authenticated using (true);
drop policy if exists studio_banque_themes_ceo on public.studio_banque_themes;
create policy studio_banque_themes_ceo on public.studio_banque_themes for all to authenticated
  using (public.is_ceo(auth.uid())) with check (public.is_ceo(auth.uid()));

drop policy if exists studio_banque_videos_ceo on public.studio_banque_videos;
create policy studio_banque_videos_ceo on public.studio_banque_videos for all to authenticated
  using (public.is_ceo(auth.uid())) with check (public.is_ceo(auth.uid()));

drop policy if exists studio_banque_plans_ceo on public.studio_banque_plans;
create policy studio_banque_plans_ceo on public.studio_banque_plans for all to authenticated
  using (public.is_ceo(auth.uid())) with check (public.is_ceo(auth.uid()));

drop policy if exists studio_banque_jobs_ceo on public.studio_banque_jobs;
create policy studio_banque_jobs_ceo on public.studio_banque_jobs for select to authenticated
  using (public.is_ceo(auth.uid()));

revoke all on public.studio_banque_videos, public.studio_banque_plans, public.studio_banque_jobs, public.studio_banque_themes from anon;

-- stockage de la banque (privé ; les machines reçoivent des liens signés)
insert into storage.buckets (id, name, public, file_size_limit)
values ('studio-banque', 'studio-banque', false, 2147483648)
on conflict (id) do nothing;

drop policy if exists studio_banque_lire on storage.objects;
create policy studio_banque_lire on storage.objects for select to authenticated
  using (bucket_id = 'studio-banque' and public.is_ceo(auth.uid()));
drop policy if exists studio_banque_deposer on storage.objects;
create policy studio_banque_deposer on storage.objects for insert to authenticated
  with check (bucket_id = 'studio-banque' and public.is_ceo(auth.uid()));
drop policy if exists studio_banque_maj on storage.objects;
create policy studio_banque_maj on storage.objects for update to authenticated
  using (bucket_id = 'studio-banque' and public.is_ceo(auth.uid()));

-- 3. l'indexation : lancement (CEO), puis la machine, avec son jeton
create or replace function public.studio_banque_lancer_indexation(p_videos uuid[] default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_jeton text := encode(gen_random_bytes(24), 'hex');
  v_job uuid;
  v_videos uuid[];
begin
  if not public.is_ceo(auth.uid()) then
    raise exception 'Réservé au CEO';
  end if;
  select coalesce(array_agg(id order by created_at), '{}') into v_videos
    from (select id, created_at from studio_banque_videos
           where not exclue
             and (case when p_videos is null then statut in ('a_indexer', 'erreur') else id = any(p_videos) end)
           order by created_at
           limit 200) s;
  if cardinality(v_videos) = 0 then
    return jsonb_build_object('job', null, 'videos', 0);
  end if;
  insert into studio_banque_jobs (jeton_hash, videos)
  values (encode(digest(v_jeton, 'sha256'), 'hex'), v_videos)
  returning id into v_job;
  update studio_banque_videos set statut = 'indexation', erreur = null, updated_at = now()
   where id = any(v_videos);
  return jsonb_build_object('job', v_job, 'jeton', v_jeton, 'videos', cardinality(v_videos));
end $$;

create or replace function public._studio_banque_job(p_job uuid, p_jeton text)
returns studio_banque_jobs
language plpgsql security definer set search_path = public, extensions
as $$
declare
  j studio_banque_jobs;
begin
  select * into j from studio_banque_jobs
   where id = p_job and statut = 'en_cours'
     and jeton_hash = encode(digest(coalesce(p_jeton, ''), 'sha256'), 'hex');
  if not found then
    raise exception 'Jeton invalide';
  end if;
  return j;
end $$;

-- les vidéos du job (la machine reçoit les liens signés de l'edge function studio-banque)
create or replace function public.studio_banque_job_videos(p_job uuid, p_jeton text)
returns table (id uuid, nom text, chemin_original text)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  j studio_banque_jobs := public._studio_banque_job(p_job, p_jeton);
begin
  return query select v.id, v.nom, v.chemin_original from studio_banque_videos v
    where v.id = any(j.videos) order by v.created_at;
end $$;

-- une vidéo indexée : ses informations et ses plans (remplace les plans précédents)
create or replace function public.studio_banque_job_ecrire(
  p_job uuid, p_jeton text, p_video uuid, p_infos jsonb, p_plans jsonb)
returns integer
language plpgsql security definer set search_path = public, extensions
as $$
declare
  j studio_banque_jobs := public._studio_banque_job(p_job, p_jeton);
  p jsonb;
  n integer := 0;
  v_choix jsonb;
begin
  if not (p_video = any(j.videos)) then
    raise exception 'Vidéo hors du job';
  end if;
  update studio_banque_videos set
    chemin_travail = p_infos->>'chemin_travail',
    duree = (p_infos->>'duree')::numeric,
    largeur = (p_infos->>'largeur')::integer,
    hauteur = (p_infos->>'hauteur')::integer,
    statut = 'indexee', erreur = null, updated_at = now()
   where id = p_video;
  -- on garde les choix de l'équipe (exclu, secours) d'une indexation à l'autre, par rang
  select coalesce(jsonb_object_agg(rang::text, jsonb_build_object('exclu', exclu, 'secours', secours)), '{}')
    into v_choix from studio_banque_plans where video_id = p_video;
  delete from studio_banque_plans where video_id = p_video;
  for p in select * from jsonb_array_elements(p_plans) loop
    insert into studio_banque_plans (
      video_id, rang, debut, fin, images, description, themes, mots_cles, lieu, ambiance,
      personnes, visage_reconnaissable, texte_ecran, logo, qualite, embedding, exclu, secours)
    values (
      p_video, (p->>'rang')::integer, (p->>'debut')::numeric, (p->>'fin')::numeric,
      coalesce(array(select jsonb_array_elements_text(p->'images')), '{}'),
      p->>'description',
      coalesce(array(select jsonb_array_elements_text(p->'themes')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p->'mots_cles')), '{}'),
      p->>'lieu', p->>'ambiance',
      (p->>'personnes')::boolean, (p->>'visage_reconnaissable')::boolean,
      (p->>'texte_ecran')::boolean, (p->>'logo')::boolean,
      case when p->>'qualite' in ('nette', 'floue', 'sombre') then p->>'qualite' end,
      case when jsonb_typeof(p->'embedding') = 'array' then (p->>'embedding')::extensions.vector end,
      coalesce((v_choix->(p->>'rang')->>'exclu')::boolean, false) or coalesce((p->>'logo')::boolean, false),
      coalesce((v_choix->(p->>'rang')->>'secours')::boolean, false));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.studio_banque_job_erreur(p_job uuid, p_jeton text, p_video uuid, p_message text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  j studio_banque_jobs := public._studio_banque_job(p_job, p_jeton);
begin
  if p_video is null then
    update studio_banque_jobs set statut = 'erreur', rapport = jsonb_build_object('erreur', left(p_message, 1000)),
           updated_at = now() where id = j.id;
    update studio_banque_videos set statut = 'erreur', erreur = left(p_message, 1000), updated_at = now()
     where id = any(j.videos) and statut = 'indexation';
  else
    update studio_banque_videos set statut = 'erreur', erreur = left(p_message, 1000), updated_at = now()
     where id = p_video and id = any(j.videos);
  end if;
end $$;

create or replace function public.studio_banque_job_terminer(p_job uuid, p_jeton text, p_rapport jsonb)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  j studio_banque_jobs := public._studio_banque_job(p_job, p_jeton);
begin
  update studio_banque_jobs set statut = 'termine', rapport = p_rapport, updated_at = now() where id = j.id;
  update studio_banque_videos set statut = 'a_indexer', updated_at = now()
   where id = any(j.videos) and statut = 'indexation';
end $$;

-- 4. recherche de plans pour un montage Voix off (jeton du montage).
-- Score : sens de la fiche 70 % + mots-clés et thèmes en commun 30 % (le cahier prévoyait
-- 50 / 30 image-texte / 20 ; sans modèle image-texte, son poids est reporté sur la fiche).
create or replace function public.studio_job_chercher_plans(
  p_id uuid, p_jeton text, p_embedding text, p_mots text[], p_themes text[],
  p_duree numeric, p_exclure uuid[], p_limite integer default 10)
returns table (id uuid, video_id uuid, chemin_travail text, debut numeric, fin numeric,
               description text, ambiance text, score numeric)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  m studio_montages := public._studio_job(p_id, p_jeton);
  v extensions.vector := p_embedding::extensions.vector;
begin
  return query
  with candidats as (
    select pl.*, vi.chemin_travail as chemin, 1 - (pl.embedding <=> v) as sens
      from studio_banque_plans pl
      join studio_banque_videos vi on vi.id = pl.video_id
     where not pl.exclu and not vi.exclue and vi.statut = 'indexee' and vi.chemin_travail is not null
       and pl.embedding is not null
       and coalesce(pl.qualite, 'nette') = 'nette'
       and (pl.fin - pl.debut) >= p_duree + 0.2
       and not (pl.id = any(coalesce(p_exclure, '{}')))
     order by pl.embedding <=> v
     limit 200
  )
  select c.id, c.video_id, c.chemin, c.debut, c.fin, c.description, c.ambiance,
         round((0.7 * c.sens
           + 0.3 * least(1, (
               (select count(*) from unnest(c.mots_cles) k where lower(k) = any(select lower(x) from unnest(coalesce(p_mots, '{}')) x))::numeric / 3
             + (select count(*) from unnest(c.themes) t where t = any(coalesce(p_themes, '{}')))::numeric / 2)))::numeric, 4)
    from candidats c
   order by 8 desc
   limit greatest(1, least(p_limite, 50));
end $$;

-- plans de secours (« ambiance AL BARAKA ») quand rien n'atteint le score minimum
create or replace function public.studio_job_plans_secours(p_id uuid, p_jeton text, p_duree numeric, p_exclure uuid[])
returns table (id uuid, video_id uuid, chemin_travail text, debut numeric, fin numeric, description text, ambiance text)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  m studio_montages := public._studio_job(p_id, p_jeton);
begin
  return query
  select pl.id, pl.video_id, vi.chemin_travail, pl.debut, pl.fin, pl.description, pl.ambiance
    from studio_banque_plans pl join studio_banque_videos vi on vi.id = pl.video_id
   where pl.secours and not pl.exclu and not vi.exclue and vi.statut = 'indexee'
     and (pl.fin - pl.debut) >= p_duree + 0.2
     and not (pl.id = any(coalesce(p_exclure, '{}')))
   order by random()
   limit 5;
end $$;

grant execute on function public.studio_banque_lancer_indexation(uuid[]) to authenticated;
grant execute on function public.studio_banque_job_videos(uuid, text) to anon, authenticated;
grant execute on function public.studio_banque_job_ecrire(uuid, text, uuid, jsonb, jsonb) to anon, authenticated;
grant execute on function public.studio_banque_job_erreur(uuid, text, uuid, text) to anon, authenticated;
grant execute on function public.studio_banque_job_terminer(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.studio_job_chercher_plans(uuid, text, text, text[], text[], numeric, uuid[], integer) to anon, authenticated;
grant execute on function public.studio_job_plans_secours(uuid, text, numeric, uuid[]) to anon, authenticated;
revoke execute on function public._studio_banque_job(uuid, text) from public, anon, authenticated;
