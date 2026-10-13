-- ─────────────────────────────────────────────────────────────────────────
-- Studio : bibliothèque de scripts vidéo (Sidali, 13/10/2026).
-- Des scripts qui ont fait leurs preuves, classés par thème (les thèmes de la
-- banque du Studio) et cherchables. Sidali les ajoute lui-même (rôle CEO).
-- Ouverte aux membres en même temps que le Studio : studio_ouvert() est le seul
-- endroit à changer ce jour-là (aujourd'hui : CEO seulement, comme le Studio).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.studio_ouvert(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_ceo(p_user_id);
$$;

-- Texte de recherche sans accents ni majuscules (« echec » trouve « échec »).
create or replace function public.texte_recherche(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      replace(replace(lower(coalesce(p, '')), 'œ', 'oe'), 'æ', 'ae'),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ’',
      'aaaaaaceeeeiiiinooooouuuuyy'''),
    '\s+', ' ', 'g');
$$;

create table if not exists public.studio_scripts (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (length(trim(titre)) > 0),
  accroche text,
  texte text not null check (length(trim(texte)) > 0),
  theme_id text references public.studio_banque_themes(id) on update cascade,
  mis_en_avant boolean not null default false,
  publie boolean not null default true,
  recherche text generated always as (
    public.texte_recherche(titre || ' ' || coalesce(accroche, '') || ' ' || texte)
  ) stored,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_scripts_liste_idx
  on public.studio_scripts (publie, mis_en_avant desc, created_at desc);
create index if not exists studio_scripts_theme_idx on public.studio_scripts (theme_id);

drop trigger if exists studio_scripts_updated_at on public.studio_scripts;
create trigger studio_scripts_updated_at
  before update on public.studio_scripts
  for each row execute function public.update_updated_at_column();

alter table public.studio_scripts enable row level security;

drop policy if exists studio_scripts_select on public.studio_scripts;
create policy studio_scripts_select on public.studio_scripts
  for select to authenticated
  using (public.is_ceo(auth.uid()) or (publie and public.studio_ouvert(auth.uid())));

drop policy if exists studio_scripts_write_ceo on public.studio_scripts;
create policy studio_scripts_write_ceo on public.studio_scripts
  for all to authenticated
  using (public.is_ceo(auth.uid()))
  with check (public.is_ceo(auth.uid()));
