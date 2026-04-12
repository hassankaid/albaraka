-- Parcours AL BARAKA / LIBERTY — schéma
-- Mini-LMS structuré en phases → chapitres, avec gating séquentiel et
-- chapitres de type 'redirect_formation' qui débloquent une formation du catalogue.
-- user_feature_unlocks : flags de features déverrouillées (ex: quiz_organisation,
-- working_activity) à la complétion d'une formation pivot (Marketing Digital).

-- ─────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────

create table public.parcours (
  id uuid primary key default gen_random_uuid(),
  pass_type public.pass_type not null,
  slug text not null unique,
  titre text not null,
  subtitle text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parcours_phases (
  id uuid primary key default gen_random_uuid(),
  parcours_id uuid not null references public.parcours(id) on delete cascade,
  numero int not null,
  titre text not null,
  emoji text,
  description text,
  ordre int not null,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  unique (parcours_id, numero)
);
create index parcours_phases_parcours_ordre_idx on public.parcours_phases(parcours_id, ordre);

create table public.parcours_chapitres (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.parcours_phases(id) on delete cascade,
  numero int not null,
  titre text not null,
  type text not null check (type in ('video','redirect_formation','milestone')),
  ordre int not null,
  -- type='video'
  vimeo_id text,
  video_url text,
  duree_estimee_minutes int,
  description text,
  -- type='redirect_formation'
  formation_id uuid references public.formations(id) on delete restrict,
  -- type='milestone'
  milestone_message text,
  milestone_emoji text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  constraint chapitre_type_coherent check (
    (type = 'redirect_formation' and formation_id is not null)
    or (type = 'milestone' and milestone_message is not null)
    or (type = 'video')
  )
);
create index parcours_chapitres_phase_ordre_idx on public.parcours_chapitres(phase_id, ordre);
create index parcours_chapitres_formation_idx on public.parcours_chapitres(formation_id) where formation_id is not null;

create table public.parcours_enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  parcours_id uuid not null references public.parcours(id) on delete cascade,
  granted_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, parcours_id)
);

create table public.parcours_chapitre_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapitre_id uuid not null references public.parcours_chapitres(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, chapitre_id)
);
create index parcours_chapitre_progress_user_idx on public.parcours_chapitre_progress(user_id);

create table public.user_feature_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  unlocked_at timestamptz not null default now(),
  unlocked_by text,
  primary key (user_id, feature)
);

-- ─────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────

alter table public.parcours enable row level security;
alter table public.parcours_phases enable row level security;
alter table public.parcours_chapitres enable row level security;
alter table public.parcours_enrollments enable row level security;
alter table public.parcours_chapitre_progress enable row level security;
alter table public.user_feature_unlocks enable row level security;

-- Lecture catalogue parcours/phases/chapitres : tout user authentifié
create policy parcours_read_auth on public.parcours
  for select using (auth.role() = 'authenticated' and status = 'published');
create policy parcours_phases_read_auth on public.parcours_phases
  for select using (auth.role() = 'authenticated' and status = 'published');
create policy parcours_chapitres_read_auth on public.parcours_chapitres
  for select using (auth.role() = 'authenticated' and status = 'published');

-- Écriture catalogue : CEO uniquement
create policy parcours_write_ceo on public.parcours
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );
create policy parcours_phases_write_ceo on public.parcours_phases
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );
create policy parcours_chapitres_write_ceo on public.parcours_chapitres
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

-- parcours_enrollments : user lit/insère les siens ; CEO tout
create policy parcours_enrollments_read_own on public.parcours_enrollments
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );
create policy parcours_enrollments_insert_own on public.parcours_enrollments
  for insert with check (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );
create policy parcours_enrollments_update_own on public.parcours_enrollments
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

-- parcours_chapitre_progress : user CRUD ses rows
create policy parcours_progress_read_own on public.parcours_chapitre_progress
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );
create policy parcours_progress_insert_own on public.parcours_chapitre_progress
  for insert with check (user_id = auth.uid());
create policy parcours_progress_delete_own on public.parcours_chapitre_progress
  for delete using (user_id = auth.uid());

-- user_feature_unlocks : user lit les siens ; écriture via triggers/CEO
create policy unlocks_read_own on public.user_feature_unlocks
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );
create policy unlocks_write_ceo on public.user_feature_unlocks
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

-- ─────────────────────────────────────────────────────────────
-- 3. FONCTIONS
-- ─────────────────────────────────────────────────────────────

-- Retourne le prochain chapitre accessible (1er non-complété dont tous les précédents le sont).
create or replace function public.parcours_next_chapitre(p_user_id uuid, p_parcours_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_chapitre_id uuid;
begin
  with ordered as (
    select c.id, c.phase_id, c.ordre as chap_ordre, ph.ordre as phase_ordre,
           row_number() over (order by ph.ordre, c.ordre) as rn
    from public.parcours_chapitres c
    join public.parcours_phases ph on ph.id = c.phase_id
    where ph.parcours_id = p_parcours_id
      and c.status = 'published'
      and ph.status = 'published'
  ),
  with_progress as (
    select o.*, pr.completed_at is not null as done
    from ordered o
    left join public.parcours_chapitre_progress pr
      on pr.chapitre_id = o.id and pr.user_id = p_user_id
  )
  select id into v_chapitre_id
  from with_progress
  where done = false
  order by rn
  limit 1;
  return v_chapitre_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Auto-enroll au parcours correspondant quand un pass est accordé
create or replace function public.auto_enroll_parcours_on_pass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parcours_id uuid;
begin
  select id into v_parcours_id
  from public.parcours
  where pass_type = NEW.pass_type and status = 'published'
  limit 1;
  if v_parcours_id is not null then
    insert into public.parcours_enrollments (user_id, parcours_id)
    values (NEW.user_id, v_parcours_id)
    on conflict (user_id, parcours_id) do nothing;
  end if;
  return NEW;
end;
$$;

create trigger user_passes_auto_enroll_parcours
  after insert on public.user_passes
  for each row
  when (NEW.revoked_at is null)
  execute function public.auto_enroll_parcours_on_pass();

-- Unlock features quand la formation Marketing Digital atteint 100%.
-- Formation Marketing Digital ID : 4949ffda-77d2-450e-adad-83554645af32
create or replace function public.unlock_features_on_marketing_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marketing_id uuid := '4949ffda-77d2-450e-adad-83554645af32';
  v_formation_id uuid;
  v_progress numeric;
begin
  -- chapitre vient de quelle formation ?
  select f.id into v_formation_id
  from public.formation_chapitres ch
  join public.formation_modules m on m.id = ch.module_id
  join public.formations f on f.id = m.formation_id
  where ch.id = NEW.chapitre_id;

  if v_formation_id is null or v_formation_id <> v_marketing_id then
    return NEW;
  end if;

  select public.get_formation_progress(NEW.user_id, v_marketing_id) into v_progress;
  if v_progress is null or v_progress < 100 then
    return NEW;
  end if;

  insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
  values
    (NEW.user_id, 'quiz_organisation', 'marketing_digital_complete'),
    (NEW.user_id, 'working_activity',  'marketing_digital_complete')
  on conflict (user_id, feature) do nothing;

  return NEW;
end;
$$;

create trigger chapitre_progress_unlock_features
  after insert on public.chapitre_progress
  for each row
  execute function public.unlock_features_on_marketing_complete();

-- ─────────────────────────────────────────────────────────────
-- 5. BACKFILL — users ayant déjà terminé Marketing Digital
-- ─────────────────────────────────────────────────────────────

insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
select distinct cp.user_id, 'quiz_organisation', 'backfill_marketing_complete'
from public.chapitre_progress cp
join public.formation_chapitres ch on ch.id = cp.chapitre_id
join public.formation_modules m on m.id = ch.module_id
where m.formation_id = '4949ffda-77d2-450e-adad-83554645af32'
  and public.get_formation_progress(cp.user_id, '4949ffda-77d2-450e-adad-83554645af32') >= 100
on conflict (user_id, feature) do nothing;

insert into public.user_feature_unlocks (user_id, feature, unlocked_by)
select distinct cp.user_id, 'working_activity', 'backfill_marketing_complete'
from public.chapitre_progress cp
join public.formation_chapitres ch on ch.id = cp.chapitre_id
join public.formation_modules m on m.id = ch.module_id
where m.formation_id = '4949ffda-77d2-450e-adad-83554645af32'
  and public.get_formation_progress(cp.user_id, '4949ffda-77d2-450e-adad-83554645af32') >= 100
on conflict (user_id, feature) do nothing;

-- Backfill parcours_enrollments : tout user avec un pass actif sera enrollé au parcours
-- correspondant dès qu'un parcours existe (seed dans la migration suivante).
