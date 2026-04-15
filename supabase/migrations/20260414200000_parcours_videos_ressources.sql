-- Aligner parcours sur formations : permettre plusieurs vidéos + ressources
-- par chapitre de parcours (avant : une seule vidéo stockée directement sur
-- parcours_chapitres.vimeo_id).

create table if not exists public.parcours_chapitre_videos (
  id uuid primary key default gen_random_uuid(),
  chapitre_id uuid not null references public.parcours_chapitres(id) on delete cascade,
  titre text not null default 'Vidéo',
  url text,
  vimeo_id text,
  notes text,
  duree_secondes integer,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parcours_chapitre_videos_chapitre_idx
  on public.parcours_chapitre_videos (chapitre_id, ordre);

create table if not exists public.parcours_chapitre_ressources (
  id uuid primary key default gen_random_uuid(),
  chapitre_id uuid not null references public.parcours_chapitres(id) on delete cascade,
  video_id uuid references public.parcours_chapitre_videos(id) on delete cascade,
  titre text not null,
  type text not null check (type in ('pdf', 'image', 'link')),
  url text not null,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists parcours_chapitre_ressources_chapitre_idx
  on public.parcours_chapitre_ressources (chapitre_id, ordre);

-- RLS
alter table public.parcours_chapitre_videos enable row level security;
alter table public.parcours_chapitre_ressources enable row level security;

-- SELECT : tout utilisateur authentifié (la gate d'accès est faite au
-- niveau du parcours via parcours_enrollments côté client/page).
create policy "parcours_videos_select_authenticated"
  on public.parcours_chapitre_videos for select to authenticated using (true);

create policy "parcours_ressources_select_authenticated"
  on public.parcours_chapitre_ressources for select to authenticated using (true);

-- INSERT/UPDATE/DELETE : CEO seulement
create policy "parcours_videos_write_ceo"
  on public.parcours_chapitre_videos for all to authenticated
  using (public.get_user_role() = 'ceo')
  with check (public.get_user_role() = 'ceo');

create policy "parcours_ressources_write_ceo"
  on public.parcours_chapitre_ressources for all to authenticated
  using (public.get_user_role() = 'ceo')
  with check (public.get_user_role() = 'ceo');

-- Migration des données existantes : pour chaque chapitre de parcours avec
-- un vimeo_id ou video_url, créer la ligne miroir dans la nouvelle table.
insert into public.parcours_chapitre_videos (chapitre_id, titre, url, vimeo_id, duree_secondes, ordre)
select id, 'Vidéo', video_url, vimeo_id,
  case when duree_estimee_minutes is not null then duree_estimee_minutes * 60 else null end,
  0
from public.parcours_chapitres
where (vimeo_id is not null or video_url is not null)
  and not exists (
    select 1 from public.parcours_chapitre_videos v where v.chapitre_id = public.parcours_chapitres.id
  );
