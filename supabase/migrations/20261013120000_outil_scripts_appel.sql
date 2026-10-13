-- ─────────────────────────────────────────────────────────────────────────
-- Outil « Construire mon script d'appel » (cahier des charges de Sidali du
-- 12/10/2026) : appel découverte et appel de transformation, en PDF et Word.
--
-- 1. scripts_appel : les réponses de l'élève, enregistrées automatiquement.
--    Version Setter/Closer : un projet par infopreneur ou par niche (créer,
--    renommer, dupliquer, supprimer). Version Liberty : un seul projet, celui de
--    son offre. Chaque élève ne voit que ses projets ; le CEO les voit tous.
-- 2. formation_chapitres.outil : un chapitre peut ouvrir un outil. Le module
--    « Construire un script millimétré » du parcours Setting/Closing ouvre la
--    version Setter/Closer. La version Liberty sera branchée sur la copie du
--    Closing du futur parcours Liberty.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.scripts_appel (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  version text not null check (version in ('setter_closer', 'liberty')),
  nom text not null check (length(trim(nom)) between 1 and 120),
  reponses jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scripts_appel_user_idx on public.scripts_appel (user_id, version);

alter table public.scripts_appel enable row level security;

drop policy if exists scripts_appel_select on public.scripts_appel;
create policy scripts_appel_select on public.scripts_appel
  for select using (user_id = auth.uid() or public.is_ceo(auth.uid()));

drop policy if exists scripts_appel_insert on public.scripts_appel;
create policy scripts_appel_insert on public.scripts_appel
  for insert with check (user_id = auth.uid());

drop policy if exists scripts_appel_update on public.scripts_appel;
create policy scripts_appel_update on public.scripts_appel
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists scripts_appel_delete on public.scripts_appel;
create policy scripts_appel_delete on public.scripts_appel
  for delete using (user_id = auth.uid());

drop trigger if exists scripts_appel_updated_at on public.scripts_appel;
create trigger scripts_appel_updated_at
  before update on public.scripts_appel
  for each row execute function public.set_updated_at();

alter table public.formation_chapitres
  add column if not exists outil text
  check (outil is null or outil in ('script_appel_setter_closer', 'script_appel_liberty'));

comment on column public.formation_chapitres.outil is
  'Outil ouvert à la fin du chapitre (ex. script_appel_setter_closer : « Construire mon script d''appel »).';

update public.formation_chapitres ch
set outil = 'script_appel_setter_closer'
from public.formation_modules m
join public.formations f on f.id = m.formation_id
where m.id = ch.module_id
  and f.slug = 'parcours-setter-closer'
  and ch.titre ilike '%Construire un script millim%';
