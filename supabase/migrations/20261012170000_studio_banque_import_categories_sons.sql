-- Studio, Voix off : la banque de Sidali (OneDrive) entre dans la plateforme.
--
-- 1. Import en lot : un job « import » (jeton à usage unique) donne des liens de dépôt
--    sous originaux/ et sons/ ; chaque fichier est rangé par son empreinte (sha256),
--    un même fichier présent dans deux dossiers n'est importé qu'une fois.
-- 2. Deux niveaux de classement : la catégorie = le dossier de Sidali (CASH, WORKING…),
--    les thèmes du discours = les 20 thèmes du cahier. La recherche donne un bonus aux
--    plans des catégories que l'IA juge utiles pour le moment de la voix.
-- 3. Les sons (Humming, Nasheed, Maher Zain, bruitages) : « Fond sonore » sous la voix.
-- L'indexation passe de 200 à 500 vidéos par lancement.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. import
alter table public.studio_banque_jobs add column if not exists type text not null default 'indexation';
do $$ begin
  alter table public.studio_banque_jobs add constraint studio_banque_jobs_type check (type in ('indexation', 'import'));
exception when duplicate_object then null; end $$;

alter table public.studio_banque_videos add column if not exists empreinte text;
create unique index if not exists studio_banque_videos_empreinte on public.studio_banque_videos (empreinte);
create index if not exists studio_banque_videos_dossier on public.studio_banque_videos (dossier);

-- 3. les sons
create table if not exists public.studio_sons (
  id uuid primary key default gen_random_uuid(),
  categorie text not null check (categorie in ('humming', 'nasheed', 'maher_zain', 'sfx')),
  nom text not null,
  chemin text not null,                 -- bucket studio-banque, sons/<empreinte>.<ext>
  empreinte text unique,
  duree numeric,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.studio_sons enable row level security;
drop policy if exists studio_sons_ceo on public.studio_sons;
create policy studio_sons_ceo on public.studio_sons for all to authenticated
  using (public.is_ceo(auth.uid())) with check (public.is_ceo(auth.uid()));
revoke all on public.studio_sons from anon;

-- l'indexation : 500 vidéos par lancement, jobs d'indexation seulement
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
           limit 500) s;
  if cardinality(v_videos) = 0 then
    return jsonb_build_object('job', null, 'videos', 0);
  end if;
  insert into studio_banque_jobs (jeton_hash, videos, type)
  values (encode(digest(v_jeton, 'sha256'), 'hex'), v_videos, 'indexation')
  returning id into v_job;
  update studio_banque_videos set statut = 'indexation', erreur = null, updated_at = now()
   where id = any(v_videos);
  return jsonb_build_object('job', v_job, 'jeton', v_jeton, 'videos', cardinality(v_videos));
end $$;

-- 2. les catégories présentes dans la banque (pour l'IA qui choisit les plans)
create or replace function public.studio_job_categories(p_id uuid, p_jeton text)
returns table (dossier text, plans bigint)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  m studio_montages := public._studio_job(p_id, p_jeton);
begin
  return query
  select vi.dossier, count(*)
    from studio_banque_plans pl join studio_banque_videos vi on vi.id = pl.video_id
   where vi.dossier is not null and not pl.exclu and not vi.exclue and vi.statut = 'indexee'
   group by vi.dossier
   order by vi.dossier;
end $$;

-- la recherche : sens 65 %, mots-clés et thèmes en commun 20 %, catégorie demandée 15 %
drop function if exists public.studio_job_chercher_plans(uuid, text, text, text[], text[], numeric, uuid[], integer);
create or replace function public.studio_job_chercher_plans(
  p_id uuid, p_jeton text, p_embedding text, p_mots text[], p_themes text[],
  p_duree numeric, p_exclure uuid[], p_limite integer default 10, p_dossiers text[] default null)
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
    select pl.*, vi.chemin_travail as chemin, vi.dossier as categorie, 1 - (pl.embedding <=> v) as sens
      from studio_banque_plans pl
      join studio_banque_videos vi on vi.id = pl.video_id
     where not pl.exclu and not vi.exclue and vi.statut = 'indexee' and vi.chemin_travail is not null
       and pl.embedding is not null
       and coalesce(pl.qualite, 'nette') = 'nette'
       and (pl.fin - pl.debut) >= p_duree + 0.2
       and not (pl.id = any(coalesce(p_exclure, '{}')))
     order by pl.embedding <=> v
     limit 300
  )
  select c.id, c.video_id, c.chemin, c.debut, c.fin, c.description, c.ambiance,
         round((0.65 * c.sens
           + 0.2 * least(1, (
               (select count(*) from unnest(c.mots_cles) k where lower(k) = any(select lower(x) from unnest(coalesce(p_mots, '{}')) x))::numeric / 3
             + (select count(*) from unnest(c.themes) t where t = any(coalesce(p_themes, '{}')))::numeric / 2))
           + 0.15 * (case when c.categorie = any(coalesce(p_dossiers, '{}')) then 1 else 0 end))::numeric, 4)
    from candidats c
   order by 8 desc
   limit greatest(1, least(p_limite, 50));
end $$;

-- 3. un fond sonore pour le montage (au hasard dans la catégorie choisie par l'élève)
create or replace function public.studio_job_fond_sonore(p_id uuid, p_jeton text, p_categorie text)
returns table (id uuid, nom text, chemin text, duree numeric)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  m studio_montages := public._studio_job(p_id, p_jeton);
begin
  return query
  select s.id, s.nom, s.chemin, s.duree from studio_sons s
   where s.actif and s.categorie = p_categorie and p_categorie <> 'sfx'
   order by random()
   limit 1;
end $$;

grant execute on function public.studio_job_categories(uuid, text) to anon, authenticated;
grant execute on function public.studio_job_chercher_plans(uuid, text, text, text[], text[], numeric, uuid[], integer, text[]) to anon, authenticated;
grant execute on function public.studio_job_fond_sonore(uuid, text, text) to anon, authenticated;
