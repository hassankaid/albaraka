-- Ressources déposées sur la plateforme (20261011121000) : type « fichier », chemin du
-- stockage privé dans `url` (« stockage:… »). La contrainte n'acceptait pas ce type.
-- Appliqué en base le 11/10/2026.
alter table public.chapitre_ressources drop constraint chapitre_ressources_type_check;
alter table public.chapitre_ressources add constraint chapitre_ressources_type_check
  check (type = any (array['pdf', 'link', 'image', 'video', 'doc', 'other', 'fichier']));
