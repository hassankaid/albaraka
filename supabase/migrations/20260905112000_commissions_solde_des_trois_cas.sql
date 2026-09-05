-- ═══════════════════════════════════════════════════════════════════════
-- Solde des 10 dernières lignes de commissions non conformes.
--
-- Ce sont les résidus de l'ancien calcul au prorata, supprimé le 05/09/2026 par
-- `20260905103000_commissions_regle_par_echeance`. La plus récente date du
-- 13/05/2026 : rien après, et rien ne peut se reproduire.
--
-- DEUX GESTES DIFFÉRENTS, et les confondre coûterait 166,67 € à quelqu'un.
--
-- ── 1. ZAKARIYA HEBBAR : on RÉPARTIT, on n'aligne pas ──
--
-- Le closer HEDI Abrikh a UNE seule ligne de 200,00 € portée par la 1re
-- échéance, alors que la vente en compte trois. Or 200,00 € = 10 % de 2 000 €
-- exactement : son total est JUSTE. Ce n'est pas un montant arbitraire, c'est sa
-- commission entière mal rangée.
--
-- L'aligner sur la règle la ramènerait à 33,33 € et lui retirerait 166,67 €
-- qu'il a gagnés et perçus le 31/01/2026. On la répartit donc sur les trois
-- échéances, à total rigoureusement inchangé :
--     333,34 € -> 33,33     1 000,00 € -> 100,00     666,66 € -> 66,67
--
-- Les deux lignes créées héritent du statut, de la date de versement et du
-- bénéficiaire de l'originale : l'argent est déjà parti, on ne fait que dire où.
--
-- ── 2. SOFIANE ALI MESSIAD et KHADRA AOUINI : on aligne ──
--
-- Messiad : l'agence a touché 433,33 € pour 400,00 € dus, soit 33,33 € de trop.
-- L'apporteur a le bon total (100,00 €), seule la répartition entre échéances
-- était fausse — l'aligner ne change pas un centime de ce qu'il touche.
--
-- Aouini : les 6 premières lignes du closer sont figées à 18,15 €, soit
-- 199,70 / 11. Elles ont été calculées quand le plan comptait 11 échéances ; il
-- est passé à 12, les suivantes ont suivi, pas celles-là. 9,06 € de trop.
--
-- Ces deux régularisations portent sur des commissions DÉJÀ VERSÉES. Hassan les
-- a validées en connaissance de cause le 05/09/2026. Aouini ayant encore
-- 100,10 € de commissions à verser, sa régularisation peut se déduire des
-- prochains versements plutôt que d'être réclamée.
--
-- RESTE OUVERT, indépendant de cette migration : il existe DEUX comptes au nom
-- de Sonia Razouane — razouanesonia@gmail.com (collaborateur, 11 lignes) et
-- renauzasonia@gmail.com (apporteur, 1 ligne, la 7e échéance). Le second email
-- ressemble à une inversion de lettres du premier. À trancher : même personne
-- avec un doublon, ou deux personnes ?
-- ═══════════════════════════════════════════════════════════════════════

-- 1a. La ligne existante ne porte plus que la part de SA propre échéance.
update commissions
set amount = 33.33
where id = 'f48aa987-8aa9-4892-be96-3307201495fe'
  and amount = 200.00;

-- 1b. Les deux parts manquantes, clonées sur l'originale.
insert into commissions
  (sale_id, payment_id, beneficiary_user_id, beneficiary_external,
   percentage, amount, role, status, paid_at)
values
  ('97568bc1-adce-4c7b-90db-99e5f4dc3f95', 'b19319c5-a694-4d9e-8376-9213b3b7d36a',
   '533b3a7f-cec4-4d44-8300-a8cd806ddad3', null,
   10.00, 100.00, 'closer', 'paid', '2026-01-31 23:00:00+00'),
  ('97568bc1-adce-4c7b-90db-99e5f4dc3f95', '5429df3f-5725-41ee-9516-346ec9dbdbe6',
   '533b3a7f-cec4-4d44-8300-a8cd806ddad3', null,
   10.00, 66.67, 'closer', 'paid', '2026-01-31 23:00:00+00');

-- 2. Tout ce qui reste non conforme : Messiad (3 lignes) et Aouini (6 lignes).
--    La ligne de Hebbar traitée ci-dessus est désormais conforme, elle n'est
--    donc plus concernée.
update commissions c
set amount = round(p.amount * c.percentage / 100, 2)
from payments p
where p.id = c.payment_id
  and c.percentage is not null
  and c.amount is distinct from round(p.amount * c.percentage / 100, 2);
