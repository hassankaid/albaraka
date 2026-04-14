-- Colonnes de suivi d'activation d'accès pour les apporteurs/collaborateurs
alter table public.profiles
  add column if not exists access_opened_at timestamptz,
  add column if not exists last_access_sent_at timestamptz,
  add column if not exists access_sent_count int not null default 0;

create index if not exists profiles_access_opened_at_idx
  on public.profiles (access_opened_at);
