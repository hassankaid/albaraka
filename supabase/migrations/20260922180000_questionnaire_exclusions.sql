-- Écarter un client de la campagne sans effacer son invitation.
--
-- On marque plutôt qu'on supprime : la ligne garde son jeton, donc la décision
-- est réversible d'un UPDATE, et on sait toujours QUI a été écarté et pourquoi
-- au moment de lire les résultats.
alter table public.questionnaire_invitations
  add column if not exists exclu boolean not null default false,
  add column if not exists motif_exclusion text;

comment on column public.questionnaire_invitations.exclu is
  'Écarté de la campagne (client perdu, demande de suppression…). Conserve son jeton.';

-- Les clients perdus : vente soldée « lost » et aucune vente vivante.
--
-- Un pass révoqué ne suffit PAS. Cinq clients en ont un, mais gardent un pass
-- ACTIF à côté — c'est un changement de formule, pas un départ. Les écarter
-- aurait privé de parole cinq élèves toujours en cours.
update public.questionnaire_invitations i
set exclu = true, motif_exclusion = 'client perdu — vente soldée « lost », aucune vente vivante'
from (
  select lower(trim(c.email)) as email
  from public.sales s join public.contacts c on c.id = s.contact_id
  where c.email is not null
  group by 1
  having count(*) filter (where s.payment_status = 'lost') > 0
     and count(*) filter (where s.payment_status in ('paid','in_progress','late')) = 0
) p
where i.email = p.email and i.test = false;
