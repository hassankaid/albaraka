-- Étapes d'un parcours (09/10/2026, parcours setter/closer).
--
-- Sidali veut des « parcours » linéaires : une seule formation, découpée en
-- étapes (Étape 1 : Setting, Étape 2 : Closing), chaque étape regroupant ses
-- modules. `etape` est le titre affiché au-dessus des modules qui la portent ;
-- les modules consécutifs de même étape sont regroupés. Null = formation
-- classique, affichage inchangé.

alter table public.formation_modules add column if not exists etape text;

comment on column public.formation_modules.etape is
  'Titre de l''étape (parcours) affiché au-dessus du module ; modules consécutifs de même étape regroupés. Null = pas d''étape.';
