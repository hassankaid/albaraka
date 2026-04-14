-- Tracking d'assiduité aux coachings + replays
-- Source de vérité des 4 slots : src/config/coachingSlots.ts (hardcodé côté client)

-- 1. Occurrences concrètes des coachings (créées paresseusement)
create table public.coaching_occurrences (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null,
  occurrence_date date not null,
  started_at timestamptz not null,
  duration_minutes int not null default 90,
  replay_url text,
  replay_password text,
  replay_added_at timestamptz,
  replay_available_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, occurrence_date)
);

create index coaching_occurrences_started_at_idx
  on public.coaching_occurrences (started_at desc);

-- Trigger : set replay_added_at au 1er renseignement de replay_url
create or replace function public.set_replay_added_at()
returns trigger language plpgsql as $$
begin
  if new.replay_url is not null and (old is null or old.replay_url is null) then
    new.replay_added_at := now();
    new.replay_available_until := now() + interval '30 days';
  end if;
  if new.replay_url is null then
    new.replay_added_at := null;
    new.replay_available_until := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_coaching_occurrences_replay_added_at
  before insert or update on public.coaching_occurrences
  for each row execute function public.set_replay_added_at();

-- 2. Présence (une ligne = présent, l'heure du clic dans joined_at)
create table public.coaching_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurrence_id uuid not null references public.coaching_occurrences(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (user_id, occurrence_id)
);

create index coaching_attendance_user_idx on public.coaching_attendance (user_id);
create index coaching_attendance_occurrence_idx on public.coaching_attendance (occurrence_id);

-- 3. Visionnages de replays (dédupliqués)
create table public.coaching_replay_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurrence_id uuid not null references public.coaching_occurrences(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, occurrence_id)
);

create index coaching_replay_views_user_idx on public.coaching_replay_views (user_id);
create index coaching_replay_views_occurrence_idx on public.coaching_replay_views (occurrence_id);

-- 4. RLS
alter table public.coaching_occurrences enable row level security;
alter table public.coaching_attendance enable row level security;
alter table public.coaching_replay_views enable row level security;

-- coaching_occurrences : tout authenticated lit ; CEO seul écrit
create policy "coaching_occurrences_select_authenticated"
  on public.coaching_occurrences for select to authenticated using (true);

create policy "coaching_occurrences_insert_ceo"
  on public.coaching_occurrences for insert to authenticated
  with check (public.get_user_role() = 'ceo');

create policy "coaching_occurrences_update_ceo"
  on public.coaching_occurrences for update to authenticated
  using (public.get_user_role() = 'ceo')
  with check (public.get_user_role() = 'ceo');

create policy "coaching_occurrences_delete_ceo"
  on public.coaching_occurrences for delete to authenticated
  using (public.get_user_role() = 'ceo');

-- coaching_attendance : user voit et upsert ses lignes, CEO voit tout
create policy "coaching_attendance_select_own_or_ceo"
  on public.coaching_attendance for select to authenticated
  using (user_id = auth.uid() or public.get_user_role() = 'ceo');

create policy "coaching_attendance_insert_own"
  on public.coaching_attendance for insert to authenticated
  with check (user_id = auth.uid());

-- coaching_replay_views : idem attendance
create policy "coaching_replay_views_select_own_or_ceo"
  on public.coaching_replay_views for select to authenticated
  using (user_id = auth.uid() or public.get_user_role() = 'ceo');

create policy "coaching_replay_views_insert_own"
  on public.coaching_replay_views for insert to authenticated
  with check (user_id = auth.uid());

-- 5. RPC ensure_coaching_occurrence — création paresseuse idempotente
create or replace function public.ensure_coaching_occurrence(
  p_slot_id text,
  p_occurrence_date date,
  p_started_at timestamptz,
  p_duration_minutes int default 90
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.coaching_occurrences (slot_id, occurrence_date, started_at, duration_minutes)
  values (p_slot_id, p_occurrence_date, p_started_at, p_duration_minutes)
  on conflict (slot_id, occurrence_date) do update
    set started_at = excluded.started_at
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.ensure_coaching_occurrence(text, date, timestamptz, int) to authenticated;
