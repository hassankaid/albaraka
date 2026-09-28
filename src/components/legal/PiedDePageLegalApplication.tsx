import { useLocation } from "react-router-dom";
import PiedDePageLegal from "./PiedDePageLegal";
import { afficherPiedDePage } from "./afficher-pied-de-page";
import { isRunningInImpersonation } from "@/lib/impersonation";

/**
 * Le pied de page légal, côté APPLICATION.
 *
 * Sur les tunnels (TunnelOnlyApp) il est monté sans condition : toutes les
 * pages y sont publiques. Ici non — la plateforme mélange un back-office et
 * des pages publiques servies au même endroit, d'où ce filtre par chemin.
 *
 * Voir afficher-pied-de-page.ts pour la règle et sa justification.
 */
export default function PiedDePageLegalApplication() {
  const { pathname } = useLocation();
  if (!afficherPiedDePage(pathname, isRunningInImpersonation())) return null;
  return <PiedDePageLegal />;
}
