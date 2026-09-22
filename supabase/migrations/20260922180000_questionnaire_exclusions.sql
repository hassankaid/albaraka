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

-- Les clients perdus : une vente au statut « lost ».
--
-- Critère unique, posé par Hassan : une vente perdue est un échec de paiement,
-- donc un dossier en recouvrement. On n'interroge pas quelqu'un sur sa
-- satisfaction pendant qu'on le relance sur son impayé.
--
-- Un pass révoqué N'EST PAS un critère. Cinq clients en ont un, mais gardent
-- un pass actif à côté — changement de formule, pas départ. Les écarter aurait
-- privé de parole cinq élèves toujours en cours.
update public.questionnaire_invitations i
set exclu = true,
    motif_exclusion = 'vente au statut « perdu » — échec de paiement, en recouvrement'
from (
  select distinct lower(trim(c.email)) as email
  from public.sales s join public.contacts c on c.id = s.contact_id
  where s.payment_status = 'lost' and c.email is not null
) p
where i.email = p.email and i.test = false;
