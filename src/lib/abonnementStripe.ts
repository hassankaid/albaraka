/**
 * Une vente a-t-elle encore un abonnement Stripe qui prélève ?
 *
 * POURQUOI « EN RETARD » COMPTE AUTANT QUE « EN ATTENTE ». Une mensualité en
 * retard est une facture Stripe OUVERTE, que Stripe continue de relancer tout
 * seul pendant des jours. Ne regarder que les mensualités en attente faisait
 * disparaître le bouton « Stopper les prélèvements » alors que Stripe prélevait
 * encore : OMAR SGHIR OUARDI a été passé en « Perdu » le 07/09/2026 sur la
 * plateforme pendant que Stripe retentait sa facture du 05/09 — quatre essais,
 * un cinquième programmé le 12/09, et une nouvelle facture prévue le 05/10.
 *
 * Les mensualités payées ou perdues ne comptent pas : l'identifiant d'abonnement
 * qu'elles portent peut être celui d'un ancien abonnement, remplacé depuis par
 * un replan.
 */

export type EcheanceStripe = {
  status: string | null;
  stripe_subscription_id: string | null;
};

/** Mensualité encore due : en attente, ou en retard (facture Stripe ouverte). */
export function estNonReglee(echeance: Pick<EcheanceStripe, "status">): boolean {
  return echeance.status === "pending" || echeance.status === "late";
}

/** L'abonnement Stripe qui prélève encore cette vente, ou null s'il n'y en a plus. */
export function abonnementStripeEnCours(echeances: EcheanceStripe[]): string | null {
  return echeances.find((e) => estNonReglee(e) && e.stripe_subscription_id)?.stripe_subscription_id ?? null;
}
