// ─────────────────────────────────────────────────────────────────────────
// Le calcul d'une commission, en un seul endroit.
//
//   commission = montant de l'échéance × taux, arrondi à la 2e décimale
//
// Règle posée par Hassan le 03/09/2026. La base l'applique déjà d'elle-même
// (`rebalance_commission_group`, migration du 05/09) ; ce module existe pour que
// le front écrive exactement la même chose, au lieu d'écraser le calcul de la
// base avec le sien.
//
// POURQUOI PAS `Math.round(euros * taux) / 100`.
//
// C'est la formule qui traînait dans `ReschedulePaymentsModal` et dans
// `adjust-stripe-subscription-amount`. Elle passe par un flottant, et un
// flottant ne représente pas exactement les décimaux : quand la valeur exacte
// tombe pile sur un demi-centime, elle atterrit parfois juste en dessous et
// l'arrondi bascule du mauvais côté.
//
// Sur 200 000 montants testés :
//     5 %, 10 %, 20 %, 35 %, 40 %  →  aucun écart
//     15 %                          →  137 écarts
//     30 %                          →  273 écarts
//     25 %                          →  2 294 écarts
//
// 25 % est le taux apporteur : le plus utilisé, et le plus touché. D'où
// l'arithmétique entière ci-dessous, où rien n'est approché.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Commission due sur une échéance, en centimes.
 *
 * Tout reste entier : le taux est mis à l'échelle du millième pour couvrir les
 * taux décimaux (7,5 % → 7500), et le `+ 50_000` réalise l'arrondi
 * demi-supérieur avant la division. Les valeurs restent très en dessous de
 * 2^53, donc exactes.
 *
 * @param montantCents montant de l'échéance, en centimes
 * @param pourcentage  taux en pourcent (20 pour 20 %)
 */
export function commissionCents(montantCents: number, pourcentage: number): number {
  const tauxMilliemes = Math.round(pourcentage * 1000);
  return Math.floor((montantCents * tauxMilliemes + 50_000) / 100_000);
}

/**
 * Même calcul, à partir d'un montant en euros et rendu en euros — la forme
 * attendue par `commissions.amount`, que Postgres stocke en `numeric`.
 */
export function commissionEuros(montantEuros: number, pourcentage: number): number {
  return commissionCents(Math.round(montantEuros * 100), pourcentage) / 100;
}
