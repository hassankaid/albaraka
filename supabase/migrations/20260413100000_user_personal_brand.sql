-- Personal Brand — questionnaire + profils Instagram générés
-- 1 ligne par user (upsert). Le "prompt personnalisé" est dérivé côté client
-- depuis answers, pas stocké.

create table public.user_personal_brand (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  generated_profiles jsonb,
  profiles_generated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_personal_brand enable row level security;

create policy user_personal_brand_own on public.user_personal_brand
  for all using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo')
  );
