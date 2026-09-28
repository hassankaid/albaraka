import { useLocation } from "react-router-dom";
import BandeauCookies from "./BandeauCookies";
import { afficherPiedDePage } from "./afficher-pied-de-page";
import { isRunningInImpersonation } from "@/lib/impersonation";

/**
 * Le bandeau cookies, côté APPLICATION.
 *
 * Même règle que le pied de page, et pour une raison de fond : on ne demande
 * un consentement que là où l'on dépose quelque chose. Le seul traceur de
 * l'application est le pixel Meta de src/lib/metaPixel.ts, utilisé uniquement
 * par les pages /scoring — qui sont publiques, donc couvertes.
 *
 * Le back-office ne mesure rien : y afficher une demande de consentement
 * serait du bruit, et un consentement demandé sans objet est plutôt un défaut
 * qu'une précaution.
 *
 * Conséquence assumée : quelqu'un qui n'irait JAMAIS sur une page publique ne
 * se voit jamais poser la question. C'est correct — rien ne le suit.
 */
export default function BandeauCookiesApplication() {
  const { pathname } = useLocation();
  if (!afficherPiedDePage(pathname, isRunningInImpersonation())) return null;
  return <BandeauCookies />;
}
