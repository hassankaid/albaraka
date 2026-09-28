-- ─────────────────────────────────────────────────────────────────────────
-- Dérogations manuelles aux règles d'accès automatiques.
-- Appliqué en base le 28/09/2026.
--
-- Le système existant ne savait qu'ACCORDER : pass, inscriptions, déblocages.
-- Rien ne savait bloquer, et les coachings n'avaient aucun levier du tout —
-- leur verrou se calculait dans le navigateur, sans possibilité d'y déroger.
--
-- UNE table pour les quatre domaines et UNE règle de résolution : une décision
-- manuelle active l'emporte, sinon l'automatique s'applique. Dupliquer cette
-- règle par domaine la ferait diverger — c'est déjà arrivé avec les deux
-- définitions concurrentes de « formation terminée », unifiées au passage.
--
-- Le motif est obligatoire, contraint en base et pas seulement dans le
-- formulaire : dans six mois, « pourquoi cette personne a-t-elle cet accès ? »
-- sera la vraie question.
--
-- Objets créés (définitions faisant foi en base) :
--   acces_manuels                 table + RLS (CEO écrit, chacun lit les siens)
--   acces_manuel(user,dom,cible)  la décision en vigueur, ou NULL
--   coachings_de(user)            état des créneaux, dérogation puis formation
--   mes_coachings()               raccourci sur auth.uid()
--   acces_de(user)                les 4 domaines d'un coup, avec l'origine
--   definir_acces_manuel(...)     pose une dérogation (CEO, motif exigé)
--   retirer_acces_manuel(...)     retour au régime automatique
--   acces_manuels_actifs()        la revue des dérogations en vigueur
--
-- coaching_weekly_slots gagne formation_requise_id : la condition descend de
-- src/config/coachingUnlockRules.ts vers la base. Ce fichier ne garde que les
-- libellés d'affichage.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.acces_manuels (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  domaine       text not null check (domaine in ('coaching','formation','fonctionnalite','pass')),
  cible         text not null,
  decision      text not null check (decision in ('autorise','bloque')),
  motif         text not null check (length(btrim(motif)) >= 3),
  expire_le     timestamptz,
  accorde_par   uuid references public.profiles(id),
  accorde_le    timestamptz not null default now(),
  revoque_le    timestamptz,
  revoque_par   uuid references public.profiles(id)
);

create unique index if not exists acces_manuels_actif_unique
  on public.acces_manuels (user_id, domaine, cible) where revoque_le is null;
create index if not exists acces_manuels_user_idx
  on public.acces_manuels (user_id) where revoque_le is null;

alter table public.acces_manuels enable row level security;

drop policy if exists "acces_manuels_ceo" on public.acces_manuels;
create policy "acces_manuels_ceo" on public.acces_manuels for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ceo'));

drop policy if exists "acces_manuels_lit_les_siens" on public.acces_manuels;
create policy "acces_manuels_lit_les_siens" on public.acces_manuels
  for select using (user_id = auth.uid());

alter table public.coaching_weekly_slots
  add column if not exists formation_requise_id uuid references public.formations(id);

-- Les fonctions sont volontairement omises ici : leur définition de référence
-- est en base, et l'historique Supabase les conserve. Les recopier ici les
-- ferait diverger au premier correctif appliqué directement.
