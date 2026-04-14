-- ============================================================================
-- Notifications génériques + module Annonces CEO + rappel activité quotidien
-- ============================================================================

-- ─── Table notifications ────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_created
  on public.notifications (user_id, created_at desc);
create index idx_notifications_user_unread
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (
    user_id = auth.uid()
    or public.get_user_role() = 'ceo'
  );

create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── Table announcements ────────────────────────────────────────────────────
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  target_roles text[] not null default array['ceo','collaborateur','apporteur']::text[],
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_announcements_published
  on public.announcements (published_at desc) where published_at is not null;

alter table public.announcements enable row level security;

create policy announcements_select on public.announcements
  for select using (
    public.get_user_role() = 'ceo'
    or published_at is not null
  );

create policy announcements_insert on public.announcements
  for insert with check (public.get_user_role() = 'ceo' and author_id = auth.uid());
create policy announcements_update on public.announcements
  for update using (public.get_user_role() = 'ceo');
create policy announcements_delete on public.announcements
  for delete using (public.get_user_role() = 'ceo');

create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute function public.update_updated_at_column();

-- ─── Fan-out : annonce publiée → notifications ──────────────────────────────
create or replace function public.fanout_announcement_to_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.published_at is not null
     and (old.published_at is null or old.published_at is distinct from new.published_at)
  then
    insert into public.notifications (user_id, type, title, body, link, metadata)
    select p.id,
           'announcement',
           new.title,
           left(new.body, 280),
           '/announcements/' || new.id::text,
           jsonb_build_object('announcement_id', new.id)
    from public.profiles p
    where p.is_active = true
      and p.role = any(new.target_roles);
  end if;
  return new;
end;
$$;

create trigger trg_announcements_fanout
  after insert or update of published_at on public.announcements
  for each row execute function public.fanout_announcement_to_notifications();

-- ─── Rappel activité quotidien ──────────────────────────────────────────────
create or replace function public.enqueue_activity_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paris_hour int := extract(hour from now() at time zone 'Europe/Paris')::int;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_count int;
begin
  -- Gate : on ne fire que si l'heure Paris est >= 19h (couvre CET + CEST)
  if v_paris_hour < 19 then
    return 0;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  select p.id,
         'activity_reminder',
         'Rappel : ton activité du jour',
         'Tu n''as pas encore saisi ton activité aujourd''hui. Prends 30 secondes pour la compléter.',
         '/working/activity'
  from public.profiles p
  where p.is_active = true
    and (
      p.role in ('ceo','collaborateur')
      or (
        p.role = 'apporteur'
        and exists (
          select 1 from public.user_passes up
          where up.user_id = p.id
            and up.revoked_at is null
            and up.pass_type in ('al_baraka','liberty')
        )
        and exists (
          select 1 from public.user_feature_unlocks ufu
          where ufu.user_id = p.id
            and ufu.feature = 'working_activity'
        )
      )
    )
    and not exists (
      select 1 from public.activity_daily_kpis a
      where a.user_id = p.id
        and a.entry_date = v_today
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p.id
        and n.type = 'activity_reminder'
        and (n.created_at at time zone 'Europe/Paris')::date = v_today
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ─── pg_cron : exécution quotidienne ────────────────────────────────────────
-- Schedule à 17h UTC (= 19h Paris CEST) et 18h UTC (= 19h Paris CET).
-- Le gate v_paris_hour < 19 empêche un envoi trop tôt. L'idempotence empêche
-- les doublons quand les 2 crons firent le même jour.
select cron.schedule(
  'activity_reminders_1700utc',
  '0 17 * * *',
  $cron$ select public.enqueue_activity_reminders(); $cron$
);
select cron.schedule(
  'activity_reminders_1800utc',
  '0 18 * * *',
  $cron$ select public.enqueue_activity_reminders(); $cron$
);

-- ─── Realtime : activer sur notifications ───────────────────────────────────
alter publication supabase_realtime add table public.notifications;
