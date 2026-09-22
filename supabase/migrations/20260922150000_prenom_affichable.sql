-- Le prénom tel qu'on l'écrit à quelqu'un.
--
-- `profiles.full_name` est saisi à la main et arrive presque toujours en
-- capitales : sur les 327 clients, 319 sont en CAPITALES, 1 en minuscules,
-- 7 seulement sont déjà présentables. « Salam ABDELAZIZ » dans un mail signé
-- Sidali, ça se voit.
--
-- Trois nettoyages, dans cet ordre :
--   1. Les marques de direction et espaces invisibles. Deux clients en ont une
--      collée devant leur prénom : invisible à l'écran, mais elle survit à
--      initcap et se retrouverait dans l'objet du mail.
--   2. Les espaces en trop, y compris les doubles.
--   3. Le premier mot, puis la casse. `initcap` gère correctement les accents
--      (ANGÉLIQUE → Angélique, CHAÏMA → Chaïma) et les traits d'union
--      (MOHAMED-ILIYES → Mohamed-Iliyes) : vérifié sur les cas réels.
--
-- Renvoie NULL si rien d'exploitable, pour que l'appelant puisse se rabattre
-- sur une formule sans prénom plutôt que d'écrire « Salam , ».
create or replace function public.prenom_affichable(p_nom_complet text)
returns text
language sql
immutable
as $$
  select nullif(
    initcap(
      split_part(
        btrim(regexp_replace(
          regexp_replace(coalesce(p_nom_complet, ''),
                         '[​-‏‪-‮⁠﻿]', '', 'g'),
          '\s+', ' ', 'g')),
        ' ', 1)
    ),
  '');
$$;

grant execute on function public.prenom_affichable(text) to anon, authenticated, service_role;
