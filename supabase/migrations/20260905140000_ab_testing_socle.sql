-- ═══════════════════════════════════════════════════════════════════════
-- A/B testing des tunnels — socle de données.
--
-- CE QUI MANQUAIT. Les tunnels servent 6 variantes vidéo via `?v=1..6` depuis
-- le début, mais la variante ne quittait jamais le navigateur : ni `leads` ni
-- aucune table ne la conservait. On pouvait donc servir six vidéos sans jamais
-- savoir laquelle produisait quel inscrit. Et personne ne comptait les visites,
-- donc aucun taux de conversion n'était calculable — seulement des volumes,
-- qui trompent dès que le trafic n'est pas réparti à parts égales.
--
-- TROIS OBJETS, ET C'EST TOUT.
--
--   ab_tests      la définition d'un test : tunnel, canal, variantes, poids
--   ab_exposures  un visiteur vu une fois par test — le dénominateur
--   leads.ab_*    la variante et le test qui ont produit l'inscrit — le numérateur
--
-- POURQUOI UN CODE DE TEST DANS LE LIEN plutôt que la liste des variantes.
-- Un lien `?ab=3-5` laisserait n'importe qui fabriquer `?ab=1-2-3-4-5-6`, et
-- surtout : changer les variantes en cours de route mélangerait silencieusement
-- les résultats d'avant et d'après. Avec un code, le périmètre est figé —
-- changer les variantes oblige à créer un nouveau test, ce qui est la bonne
-- discipline.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.ab_tests (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{4,8}$'),
  libelle       text not null,
  tunnel        text not null check (tunnel in ('wa','vsl')),
  canal         text check (canal in ('ads','ig','tiktok','youtube')),
  variants      text[] not null check (array_length(variants, 1) between 2 and 6),
  weights       int[] not null check (0 < all(weights)),
  metrique      text not null default 'lead' check (metrique in ('lead','vente')),
  statut        text not null default 'running' check (statut in ('running','stopped')),
  demarre_le    timestamptz not null default now(),
  arrete_le     timestamptz,
  conclusion    text,
  cree_par      uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  constraint ab_tests_poids_coherents check (array_length(weights, 1) = array_length(variants, 1))
);

comment on table public.ab_tests is
  'Un test A/B sur un tunnel. Le code voyage dans l''URL (?ab=CODE).';

create index if not exists ab_tests_code_running_idx
  on public.ab_tests (code) where statut = 'running';

create table if not exists public.ab_exposures (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references public.ab_tests(id) on delete cascade,
  visitor_id  text not null,
  variant     text not null,
  tunnel      text not null,
  src         text,
  created_at  timestamptz not null default now(),
  unique (test_id, visitor_id)
);

create index if not exists ab_exposures_test_idx on public.ab_exposures (test_id, variant);

alter table public.leads
  add column if not exists tunnel_variant text,
  add column if not exists ab_test_code   text,
  add column if not exists visitor_id     text;

comment on column public.leads.tunnel_variant is
  'Variante vidéo affichée au visiteur (clé de tunnels/variants.ts). Renseignée même hors test.';
comment on column public.leads.ab_test_code is
  'Code du test A/B en cours lors de la visite, s''il y en avait un.';
comment on column public.leads.visitor_id is
  'Identifiant anonyme du navigateur, pour rattacher l''inscrit à son exposition.';

create index if not exists leads_ab_test_idx on public.leads (ab_test_code) where ab_test_code is not null;

alter table public.ab_tests     enable row level security;
alter table public.ab_exposures enable row level security;

create policy ab_tests_select_staff on public.ab_tests
  for select using (coalesce(get_user_role(), '') in ('ceo','agence'));
create policy ab_tests_insert_staff on public.ab_tests
  for insert with check (coalesce(get_user_role(), '') in ('ceo','agence'));
create policy ab_tests_update_staff on public.ab_tests
  for update using (coalesce(get_user_role(), '') in ('ceo','agence'));

create policy ab_exposures_select_staff on public.ab_exposures
  for select using (coalesce(get_user_role(), '') in ('ceo','agence'));
