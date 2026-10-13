-- ─────────────────────────────────────────────────────────────────────────
-- Espace Training « Ressources » (Sidali, 13/10/2026) : dans Setting et Closing,
-- les scripts sont séparés en « scripts internes AL BARAKA » et « scripts
-- templates ». La rubrique se règle ressource par ressource dans l'éditeur de
-- chapitre ; null = autre ressource (support, fiche, objections…).
-- Premier classement ci-dessous, à valider par Sidali.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.chapitre_ressources
  add column if not exists rubrique text;

alter table public.chapitre_ressources
  drop constraint if exists chapitre_ressources_rubrique_check;
alter table public.chapitre_ressources
  add constraint chapitre_ressources_rubrique_check
  check (rubrique is null or rubrique in ('script_interne', 'script_template'));

with sc as (
  select r.id, r.titre
  from public.chapitre_ressources r
  join public.formation_chapitres c on c.id = r.chapitre_id
  join public.formation_modules m on m.id = c.module_id
  join public.formations f on f.id = m.formation_id
  where f.slug = 'parcours-setter-closer'
)
update public.chapitre_ressources r
set rubrique = case
  when sc.titre in (
    'SCRIPT DM AL BARAKA',
    'Script - Appel découverte organique',
    'Script - Appel découverte ADS',
    'M15 SCRIPTS DM ALBARAKA',
    'SCRIPT CLOSING A LA CARTE',
    'SCRIPT CLOSING PASS AL BARAKA',
    'SCRIPT LIBERTY'
  ) then 'script_interne'
  when sc.titre in (
    'M08 TEMPLATES DM',
    'M08 SEQUENCE 7 MESSAGES VIERGE',
    'M10 SCRIPT APPEL TELEPHONIQUE',
    'M10 SCRIPT APPEL DECOUVERTE ADS',
    'M12 SCRIPTS SITUATIONS COMPLEXES',
    'M15 SCRIPT APPEL DECOUVERTE ORGANIQUE'
  ) then 'script_template'
end
from sc
where sc.id = r.id and r.rubrique is null;
