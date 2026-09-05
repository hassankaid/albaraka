-- ═══════════════════════════════════════════════════════════════════════
-- Les commissions se calculent désormais échéance par échéance.
--
--   commission = montant de l'échéance x taux, arrondi à la 2e décimale
--
-- Règle posée par Hassan le 03/09/2026, appliquée le 05/09/2026.
--
-- CE QUI CHANGE, ET POURQUOI ÇA COMPTE.
--
-- `rebalance_commission_group` répartissait jusqu'ici `sales.amount_ht x taux`
-- entre les échéances AU PRORATA de leur montant, la dernière absorbant le
-- reliquat. Résultat identique quand tout est cohérent — mais le calcul de
-- CHAQUE ligne dépendait de TOUTES les autres.
--
-- Or la fonction est déclenchée à chaque changement de montant d'une SEULE
-- échéance. Quand un échéancier est réécrit ligne à ligne, elle tourne donc sur
-- des états intermédiaires où la somme des échéances est fausse, et fige des
-- montants faux — y compris sur des commissions DÉJÀ PAYÉES.
--
-- Constaté trois fois le 05/09/2026 :
--   Khady Gueye   — une commission réglée le 01/09 passée de 14,29 à 16,28 €
--   Bamar Gueye   — une ligne payée portée à 133,33 € au lieu de 100,00 €
--   Naïma Boumaza — 55,15 € de trop-versé sur cinq échéances déjà encaissées,
--                   la somme des échéances étant tombée à 1 700 € au lieu de
--                   2 000 € pendant la boucle d'écriture
--
-- La nouvelle règle ne regarde plus que l'échéance de la ligne. Un état
-- intermédiaire ne peut donc plus rien corrompre : le défaut devient
-- structurellement impossible, ce qui vaut mieux que de le rattraper après coup.
-- Vérifié sur données réelles dans une transaction annulée : en faisant passer
-- une échéance de 150 à 50 €, seules SES deux commissions bougent ; les cinq
-- échéances déjà payées restent à 12,50 et 50,00 €.
--
-- L'arrondi est exact sans précaution particulière : `payments.amount` et
-- `commissions.percentage` sont des `numeric`, Postgres calcule en décimal et
-- son `round(numeric, 2)` arrondit au demi-supérieur. 285,71 x 15 % = 42,8565
-- donne bien 42,86. Aucune virgule flottante n'intervient — contrairement au
-- `Math.round(euros x taux)` du code TypeScript, qui diverge sur les
-- demi-centimes exacts (0 écart à 5/10/20 %, mais 137 à 15 % et 2 294 à 25 %).
--
-- Les six fonctions qui l'appellent (création de vente, insertion d'échéance,
-- suppression, changement de taux, éclatement d'une commission globale, mise à
-- jour de montant) héritent du nouveau comportement sans être modifiées.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.rebalance_commission_group(
  p_sale_id uuid,
  p_beneficiary_user_id uuid,
  p_beneficiary_external text,
  p_role text
)
returns void
language sql
set search_path to 'public'
as $function$
  update commissions c
  set amount = round(p.amount * c.percentage / 100, 2)
  from payments p
  where p.id = c.payment_id
    and c.sale_id = p_sale_id
    and c.role = p_role
    and c.beneficiary_user_id   is not distinct from p_beneficiary_user_id
    and c.beneficiary_external  is not distinct from p_beneficiary_external
    and c.percentage is not null
    and c.amount is distinct from round(p.amount * c.percentage / 100, 2);
$function$;

-- ── Réalignement de l'existant ─────────────────────────────────────────
--
-- On aligne TOUT ce qui s'écarte de la règle de 1 € ou moins : 205 lignes pour
-- 1,34 € au total, dont 145 déjà payées. Hassan a tranché en faveur d'une base
-- cohérente partout plutôt que d'un historique figé.
--
-- MAIS ON ÉPARGNE les écarts de plus d'un euro : 10 lignes, 209,06 €, chez
-- trois clients seulement.
--   Zakariya Hebbar     — closer à 200,00 € sur une échéance de 333,34 €
--   Sofiane Ali Messiad — agence à 133,33 € sur une échéance de 500 €
--   Khadra Aouini       — closer à 18,15 € sur six échéances de 166,42 €
-- Les montants ronds et les fractions nettes (133,33 = 400/3) trahissent des
-- décisions prises à la main, pas des accidents. Les écraser ferait disparaître
-- une intention sans laisser de trace. Elles restent en l'état, à arbitrer.
update commissions c
set amount = round(p.amount * c.percentage / 100, 2)
from payments p
where p.id = c.payment_id
  and c.percentage is not null
  and c.amount is distinct from round(p.amount * c.percentage / 100, 2)
  and abs(round(p.amount * c.percentage / 100, 2) - c.amount) <= 1;
