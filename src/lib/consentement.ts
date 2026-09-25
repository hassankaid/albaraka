// ─────────────────────────────────────────────────────────────────────────
// Le consentement aux cookies — la mémoire, séparée de l'affichage.
//
// Cahier des charges Ethicarena §6, et politique de confidentialité §9, qui
// est publiée et nous engage : « Les cookies de mesure d'audience et
// publicitaires ne sont déposés qu'APRÈS votre consentement. »
//
// Ce n'est pas une préférence : tant qu'un visiteur n'a pas cliqué, le pixel
// Meta ne doit pas se charger. Pas « ne pas envoyer d'évènement » — ne pas
// charger du tout, parce que le script dépose lui-même des identifiants.
//
// Trois règles qui viennent du texte publié, et qu'on ne peut donc plus
// changer sans changer aussi la politique :
//   - refuser est aussi simple qu'accepter, et n'empêche pas l'accès au site ;
//   - le choix est conservé 6 mois, puis on redemande ;
//   - il est modifiable à tout moment par « Gérer les cookies ».
//
// Ce module ne connaît ni React ni le pixel : il mémorise un choix et
// prévient qui veut bien l'écouter. Le pixel s'y abonne de son côté.
// ─────────────────────────────────────────────────────────────────────────

const CLE = "alb_consentement_cookies";
const VERSION = 1;

/** Six mois, comme annoncé dans la politique de confidentialité. */
const DUREE_MS = 183 * 24 * 60 * 60 * 1000;

/** L'évènement émis à chaque choix. Le pixel s'y abonne. */
export const EVENEMENT_CHANGEMENT = "alb:cookies:change";

/** L'évènement qui rouvre le bandeau, émis par « Gérer les cookies ». */
export const EVENEMENT_OUVRIR = "alb:cookies:ouvrir";

export interface Consentement {
  /** Mesure d'audience. */
  mesure: boolean;
  /** Publicité — c'est cette catégorie qui gouverne le pixel Meta. */
  publicite: boolean;
  /** Quand le choix a été fait, en millisecondes. */
  date: number;
  version: number;
}

/**
 * Le choix en cours, ou `null` si personne n'a encore répondu — ou si la
 * réponse a plus de six mois.
 *
 * Toute lecture est protégée : en navigation privée stricte, `localStorage`
 * lève au lieu de renvoyer vide. Dans le doute, on répond « pas de
 * consentement » : ne rien charger est toujours le choix sûr.
 */
export function lireConsentement(): Consentement | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const c = JSON.parse(brut) as Consentement;
    if (c.version !== VERSION) return null;
    if (!Number.isFinite(c.date) || Date.now() - c.date > DUREE_MS) return null;
    return { mesure: !!c.mesure, publicite: !!c.publicite, date: c.date, version: c.version };
  } catch {
    return null;
  }
}

/** A-t-on le droit de charger les traceurs publicitaires ? */
export function consentPublicite(): boolean {
  return lireConsentement()?.publicite === true;
}

/** A-t-on le droit de mesurer l'audience ? */
export function consentMesure(): boolean {
  return lireConsentement()?.mesure === true;
}

/**
 * Enregistre un choix et prévient le reste de l'application.
 *
 * L'évènement part même si l'écriture échoue : le visiteur a cliqué, son
 * choix doit s'appliquer à la visite en cours, même si on ne saura pas le
 * lui rappeler demain.
 */
export function enregistrerConsentement(choix: { mesure: boolean; publicite: boolean }): void {
  const c: Consentement = { ...choix, date: Date.now(), version: VERSION };
  try {
    localStorage.setItem(CLE, JSON.stringify(c));
  } catch {
    /* navigation privée stricte : on continue sans mémoire */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENEMENT_CHANGEMENT, { detail: c }));
  }
}

/** Efface le choix — utilisé par la recette, pas par l'interface. */
export function oublierConsentement(): void {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien à faire */
  }
}
