-- Quiz Organisation — tables de persistance
-- user_organisation_profile : réponses au questionnaire (1 ligne par user, upsert)
-- user_organisation_plans : historique versionné des plannings générés

create table public.user_organisation_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pack public.pass_type not null,
  answers jsonb not null default '{}'::jsonb,
  committed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_organisation_profile enable row level security;

create policy user_org_profile_own on public.user_organisation_profile
  for all using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

create table public.user_organisation_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null default 1,
  pack public.pass_type not null,
  plan jsonb not null,
  selected_recurrence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index user_organisation_plans_user_created_idx
  on public.user_organisation_plans(user_id, created_at desc);

alter table public.user_organisation_plans enable row level security;

create policy user_org_plans_own on public.user_organisation_plans
  for all using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );

-- Fonction helper : calcule la prochaine version pour un user
create or replace function public.next_organisation_plan_version(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(version), 0) + 1
  from public.user_organisation_plans
  where user_id = p_user_id;
$$;
