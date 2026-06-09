-- Plan 90 jours — tracker d'entraînement closing (≠ funnel d'acquisition activity_*).
-- 1 ligne par utilisateur, structure complète (12 semaines × 7 jours) stockée en JSONB.
create table if not exists public.closing_plan90 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.closing_plan90 enable row level security;

drop policy if exists "closing_plan90_select_own" on public.closing_plan90;
drop policy if exists "closing_plan90_insert_own" on public.closing_plan90;
drop policy if exists "closing_plan90_update_own" on public.closing_plan90;
drop policy if exists "closing_plan90_delete_own" on public.closing_plan90;

create policy "closing_plan90_select_own" on public.closing_plan90
  for select using (auth.uid() = user_id);
create policy "closing_plan90_insert_own" on public.closing_plan90
  for insert with check (auth.uid() = user_id);
create policy "closing_plan90_update_own" on public.closing_plan90
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "closing_plan90_delete_own" on public.closing_plan90
  for delete using (auth.uid() = user_id);
