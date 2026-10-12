-- ─────────────────────────────────────────────────────────────────────────
-- Masquer aux élèves les anciennes formations et l'ancien Parcours Al Baraka
-- (décision de Hassan du 12/10/2026, après l'ouverture des parcours CM et
-- Setting/Closing).
--
-- « Masqué » veut dire : absent de la page Formation et inaccessible par un
-- ancien lien pour un élève ; le CEO les voit toujours (badge « Masquée aux
-- élèves »). Rien n'est supprimé ni dépublié : progression, synchronisation
-- avec les parcours, certificats (« Mes certificats ») et déblocages restent.
-- Réversible depuis Gestion des formations / Gestion des parcours.
--
-- Formations masquées : les 8 de l'ancien parcours (access_mode 'parcours').
-- Restent visibles : les 2 parcours, Estimaction (libre), Offer Creation et
-- Copywriting (Liberty), et le Parcours Liberty.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.formations
  add column if not exists masquee_eleves boolean not null default false;

alter table public.parcours
  add column if not exists masque_eleves boolean not null default false;

comment on column public.formations.masquee_eleves is
  'Vrai : la formation n''apparaît plus aux élèves (CEO seul). Données, progression et certificats intacts.';
comment on column public.parcours.masque_eleves is
  'Vrai : le parcours n''apparaît plus aux élèves (CEO seul). Données et progression intactes.';

update public.formations
set masquee_eleves = true
where slug in ('muslim-mindset', 'personal-branding', 'storytelling', 'marketing-digital',
               'community-management', 'setting', 'closing', 'administratif');

update public.parcours
set masque_eleves = true
where slug = 'al-baraka';
