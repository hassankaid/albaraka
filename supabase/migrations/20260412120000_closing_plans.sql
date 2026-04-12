-- ══════════════════════════════════════════════════════════════
-- Suivi d'activité · Vente — Plan 90 jours Closing
-- Tables : closing_plans, closing_daily_logs
-- Trigger auto-création à l'activation d'un Pass Al Baraka/Liberty
-- ══════════════════════════════════════════════════════════════

-- ─── closing_plans ────────────────────────────────────────────
create table if not exists public.closing_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pass_type public.pass_type not null,
  started_at date not null default (now() at time zone 'Europe/Paris')::date,
  targets jsonb not null default '{"rp_d":4,"rp_c":3}'::jsonb,
  status text not null default 'active' check (status in ('active','paused','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists closing_plans_one_active_per_user
  on public.closing_plans(user_id) where status = 'active';

create index if not exists closing_plans_user_id_idx on public.closing_plans(user_id);

-- ─── closing_daily_logs ───────────────────────────────────────
create table if not exists public.closing_daily_logs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.closing_plans(id) on delete cascade,
  entry_date date not null,
  rp_d int not null default 0 check (rp_d >= 0),
  rp_c int not null default 0 check (rp_c >= 0),
  emotions text[] not null default '{}',
  feeling text,
  learning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, entry_date)
);

create index if not exists closing_daily_logs_plan_id_idx on public.closing_daily_logs(plan_id);
create index if not exists closing_daily_logs_entry_date_idx on public.closing_daily_logs(entry_date);

-- ─── trigger updated_at ───────────────────────────────────────
create or replace function public.tg_closing_plans_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists closing_plans_updated_at on public.closing_plans;
create trigger closing_plans_updated_at
  before update on public.closing_plans
  for each row execute function public.tg_closing_plans_updated_at();

drop trigger if exists closing_daily_logs_updated_at on public.closing_daily_logs;
create trigger closing_daily_logs_updated_at
  before update on public.closing_daily_logs
  for each row execute function public.tg_closing_plans_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────
alter table public.closing_plans enable row level security;
alter table public.closing_daily_logs enable row level security;

-- closing_plans : propriétaire lit le sien, CEO lit tout
drop policy if exists closing_plans_select on public.closing_plans;
create policy closing_plans_select on public.closing_plans
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

-- Pas d'INSERT direct par user : uniquement via trigger ou CEO
drop policy if exists closing_plans_insert on public.closing_plans;
create policy closing_plans_insert on public.closing_plans
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

-- Propriétaire peut modifier (pas le status), CEO peut tout modifier
drop policy if exists closing_plans_update on public.closing_plans;
create policy closing_plans_update on public.closing_plans
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

drop policy if exists closing_plans_delete on public.closing_plans;
create policy closing_plans_delete on public.closing_plans
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

-- closing_daily_logs : propriétaire via plan, CEO lit tout
drop policy if exists closing_daily_logs_select on public.closing_daily_logs;
create policy closing_daily_logs_select on public.closing_daily_logs
  for select using (
    exists (
      select 1 from public.closing_plans cp
      where cp.id = plan_id
        and (cp.user_id = auth.uid()
             or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo'))
    )
  );

drop policy if exists closing_daily_logs_insert on public.closing_daily_logs;
create policy closing_daily_logs_insert on public.closing_daily_logs
  for insert with check (
    exists (
      select 1 from public.closing_plans cp
      where cp.id = plan_id
        and cp.user_id = auth.uid()
        and cp.status = 'active'
    )
  );

drop policy if exists closing_daily_logs_update on public.closing_daily_logs;
create policy closing_daily_logs_update on public.closing_daily_logs
  for update using (
    exists (
      select 1 from public.closing_plans cp
      where cp.id = plan_id
        and cp.user_id = auth.uid()
        and cp.status = 'active'
    )
  );

drop policy if exists closing_daily_logs_delete on public.closing_daily_logs;
create policy closing_daily_logs_delete on public.closing_daily_logs
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

-- ─── Trigger auto-création / reprise du plan à l'activation d'un pass ──
create or replace function public.tg_user_passes_sync_closing_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_active uuid;
  v_paused uuid;
begin
  -- Cas 1 : INSERT d'un nouveau pass actif
  if (tg_op = 'INSERT' and new.revoked_at is null) then
    select id into v_existing_active
    from public.closing_plans
    where user_id = new.user_id and status = 'active'
    limit 1;

    if v_existing_active is null then
      -- Reprendre un plan paused si < 90 jours écoulés, sinon créer un nouveau
      select id into v_paused
      from public.closing_plans
      where user_id = new.user_id
        and status = 'paused'
        and started_at >= (now() at time zone 'Europe/Paris')::date - 90
      order by started_at desc
      limit 1;

      if v_paused is not null then
        update public.closing_plans set status = 'active' where id = v_paused;
      else
        insert into public.closing_plans (user_id, pass_type, started_at)
        values (new.user_id, new.pass_type, (now() at time zone 'Europe/Paris')::date);
      end if;
    end if;
  end if;

  -- Cas 2 : UPDATE avec revoked_at qui devient non null → mettre le plan en paused
  if (tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null) then
    update public.closing_plans
    set status = 'paused'
    where user_id = new.user_id and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists user_passes_sync_closing_plan on public.user_passes;
create trigger user_passes_sync_closing_plan
  after insert or update on public.user_passes
  for each row execute function public.tg_user_passes_sync_closing_plan();

-- ══════════════════════════════════════════════════════════════
