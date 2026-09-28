// Liens internes du site vitrine.
//
// Le site est servi à la racine de `albarakaecosysteme.com`, mais sous
// `/site-vitrine` partout ailleurs (local, aperçus Vercel) : à la racine de
// ces domaines-là, il y a la plateforme. Les liens passent donc par le
// routeur (`useHref`), qui connaît le préfixe — jamais de chemin en dur.
import { useHref, useLocation } from "react-router-dom";

/**
 * Lien vers une section de l'accueil. Depuis l'accueil, une simple ancre
 * (défilement doux, sans rechargement) ; depuis une autre page, l'accueil
 * suivi de l'ancre, que `useDefilementVersAncre` rejoint à l'arrivée.
 */
export function useAncre(): (ancre: string) => string {
  const { pathname } = useLocation();
  const accueil = useHref("/");
  const surAccueil = pathname === "/" || pathname === "";
  return (ancre) => (surAccueil ? `#${ancre}` : `${accueil.replace(/\/$/, "")}/#${ancre}`);
}
