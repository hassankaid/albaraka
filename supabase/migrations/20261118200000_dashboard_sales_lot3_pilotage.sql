-- Dashboard Sales, lot 3 (18/11/2026) : seuils des recommandations « couper /
-- pousser » et objectifs par semaine (par conférence).
--
-- Lecture : CEO et agence (les deux voient les recommandations et les objectifs).
-- Écriture : CEO seul (Sidali fixe les seuils et les objectifs).
--
-- Appliqué en base le 18/11/2026.

-- Une seule ligne de réglages (id = true).
create table if not exists public.sales_pilotage_reglages (
  id boolean primary key default true check (id),
  -- Coût par vente visé. NULL : on prend le coût par vente moyen de la fenêtre.
  cpa_cible numeric(10, 2),
  -- À couper : dépensé au moins N × la cible sans vente, ou coût par vente au-delà de N × la cible.
  couper_multiple numeric(4, 2) not null default 2 check (couper_multiple >= 1),
  -- À pousser : coût par vente au plus R × la cible…
  pousser_ratio numeric(4, 2) not null default 0.7 check (pousser_ratio > 0 and pousser_ratio <= 1),
  -- … avec au moins ce nombre de ventes.
  ventes_min integer not null default 3 check (ventes_min >= 1),
  -- Nombre de conférences regardées (la dernière comprise).
  fenetre_conferences integer not null default 4 check (fenetre_conferences between 1 and 12),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.sales_pilotage_reglages (id) values (true) on conflict (id) do nothing;

-- Objectifs par conférence. conference_date NULL : objectif par défaut de chaque semaine.
create table if not exists public.sales_objectifs (
  id uuid primary key default gen_random_uuid(),
  conference_date date,
  ventes integer check (ventes >= 0),
  ca numeric(12, 2) check (ca >= 0),
  rdv integer check (rdv >= 0),
  budget numeric(12, 2) check (budget >= 0),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create unique index if not exists sales_objectifs_conference_uidx
  on public.sales_objectifs (coalesce(conference_date, 'infinity'::date));

alter table public.sales_pilotage_reglages enable row level security;
alter table public.sales_objectifs enable row level security;

drop policy if exists sales_pilotage_reglages_lecture on public.sales_pilotage_reglages;
create policy sales_pilotage_reglages_lecture on public.sales_pilotage_reglages
  for select to authenticated
  using ((select public.get_user_role()) in ('ceo', 'agence'));

drop policy if exists sales_pilotage_reglages_ecriture on public.sales_pilotage_reglages;
create policy sales_pilotage_reglages_ecriture on public.sales_pilotage_reglages
  for update to authenticated
  using ((select public.is_ceo((select auth.uid()))))
  with check ((select public.is_ceo((select auth.uid()))));

drop policy if exists sales_objectifs_lecture on public.sales_objectifs;
create policy sales_objectifs_lecture on public.sales_objectifs
  for select to authenticated
  using ((select public.get_user_role()) in ('ceo', 'agence'));

drop policy if exists sales_objectifs_ecriture on public.sales_objectifs;
create policy sales_objectifs_ecriture on public.sales_objectifs
  for all to authenticated
  using ((select public.is_ceo((select auth.uid()))))
  with check ((select public.is_ceo((select auth.uid()))));

revoke all on public.sales_pilotage_reglages from anon;
revoke all on public.sales_objectifs from anon;
grant select, update on public.sales_pilotage_reglages to authenticated;
grant select, insert, update, delete on public.sales_objectifs to authenticated;
