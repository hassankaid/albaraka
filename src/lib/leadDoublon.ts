/**
 * Traduction du refus de doublon en message lisible.
 *
 * Depuis le 09/09/2026, un index en base interdit deux fiches pour le même
 * contact, sur la même source, le même jour — la protection qui existait dans
 * l'ancien webhook Systeme.io et que la réécriture avait perdue.
 *
 * Les tunnels automatiques FUSIONNENT quand ils rencontrent ce cas : le
 * prospect ne doit jamais voir d'erreur pour une inscription qui a bien abouti.
 *
 * Les formulaires manuels, eux, doivent le DIRE. Quand un membre de l'équipe
 * saisit deux fois la même personne, fusionner en silence lui laisserait croire
 * qu'il vient de créer une fiche qui existait déjà — et il chercherait ensuite
 * la seconde. Mieux vaut l'informer et le laisser ouvrir celle qui existe.
 *
 * Sans cette traduction, Postgres renverrait tel quel :
 *   « duplicate key value violates unique constraint
 *     "leads_un_par_contact_source_et_jour" »
 */

/** Code Postgres d'une violation de contrainte d'unicité. */
const VIOLATION_UNICITE = "23505";
const INDEX_ANTI_DOUBLON = "leads_un_par_contact_source_et_jour";

export const MESSAGE_DOUBLON =
  "Cette personne a déjà une fiche pour cette source aujourd'hui. " +
  "Ouvrez la fiche existante plutôt que d'en créer une seconde — " +
  "elle porte déjà l'historique.";

/** Le refus vient-il de la protection anti-doublon ? */
export function estUnDoublon(erreur: unknown): boolean {
  if (!erreur || typeof erreur !== "object") return false;
  const e = erreur as { code?: string; message?: string };
  return e.code === VIOLATION_UNICITE || Boolean(e.message?.includes(INDEX_ANTI_DOUBLON));
}

/**
 * Le message à afficher : celui du doublon s'il s'agit d'un doublon, sinon
 * l'erreur d'origine — qu'on ne masque jamais, elle dit autre chose.
 */
export function messageErreurLead(erreur: unknown): string {
  if (estUnDoublon(erreur)) return MESSAGE_DOUBLON;
  const e = erreur as { message?: string } | null;
  return e?.message ?? "Une erreur inattendue est survenue.";
}
