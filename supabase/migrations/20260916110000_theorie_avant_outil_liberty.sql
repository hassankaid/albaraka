-- La théorie avant la pratique, dans le parcours Liberty
--
-- Le parcours Liberty ne contenait que les 20 outils interactifs, ouverts dès
-- le premier jour. Les élèves construisaient donc leur offre sans avoir vu les
-- modules de la formation OFFER CREATION, qui portent pourtant exactement la
-- même numérotation (MODULE 3 ↔ M3). On relie les deux : l'outil MN ne s'ouvre
-- qu'une fois le MODULE N validé.
--
-- Rien n'est retiré à personne : un chapitre déjà terminé reste accessible
-- (règle appliquée côté application, voir src/lib/parcoursAcces.ts).

alter table public.parcours_chapitres
  add column if not exists theorie_chapitre_id uuid
  references public.formation_chapitres(id) on delete set null;

comment on column public.parcours_chapitres.theorie_chapitre_id is
  'Chapitre de formation (théorie) à valider avant d''ouvrir ce chapitre de parcours. Null = aucun prérequis.';

-- Liaison M1..M20 (parcours liberty) ↔ MODULE 1..20 (formation OFFER CREATION).
-- MODULE 9 est en brouillon et sans vidéo : il est volontairement exclu, sinon
-- l'élève resterait bloqué devant un module qu'il ne peut pas voir.
update public.parcours_chapitres pc
set theorie_chapitre_id = t.id
from (
  select fc.id, (regexp_match(fc.titre, '^MODULE ([0-9]+)'))[1]::int as numero
  from public.formation_chapitres fc
  join public.formation_modules fm on fm.id = fc.module_id
  join public.formations f on f.id = fm.formation_id
  where f.slug = 'offer-creation'
    and fc.status = 'published'
    and fm.status = 'published'
) t
where pc.phase_id in (
    select ph.id from public.parcours_phases ph
    join public.parcours p on p.id = ph.parcours_id
    where p.slug = 'liberty'
  )
  and pc.titre ~ '^M[0-9]+'
  and (regexp_match(pc.titre, '^M([0-9]+)'))[1]::int = t.numero;
