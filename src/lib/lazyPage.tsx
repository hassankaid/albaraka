import { lazy, type ComponentType } from "react";

/**
 * React.lazy + rechargement automatique quand le fichier d'une page a disparu.
 *
 * Depuis le 11/11/2026, chaque page est un fichier séparé dont le nom change à
 * chaque mise en ligne, et seuls les fichiers de la DERNIÈRE version existent
 * en production. Un onglet ouvert avant une mise en ligne qui ouvre une page
 * pas encore visitée réclame donc un fichier qui n'existe plus : sans ce
 * filet, la page restait noire. On recharge alors une fois (la nouvelle
 * version arrive avec ses bons fichiers) ; si le rechargement a déjà été tenté
 * il y a moins de 10 s, on laisse l'erreur remonter plutôt que de boucler.
 */
const CLE = "alb_rechargement_version";

export function rechargerUneFois(): boolean {
  try {
    const dernier = Number(sessionStorage.getItem(CLE) || 0);
    if (Date.now() - dernier < 10_000) return false;
    sessionStorage.setItem(CLE, String(Date.now()));
  } catch {
    // stockage indisponible : on recharge quand même
  }
  window.location.reload();
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(charger: () => Promise<{ default: T }>) {
  return lazy(() =>
    charger().catch((erreur) => {
      if (rechargerUneFois()) return new Promise<{ default: T }>(() => {}); // la page se recharge
      throw erreur;
    }),
  );
}
