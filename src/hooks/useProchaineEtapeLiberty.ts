import { useLocation } from "react-router-dom";
import { useParcours } from "@/hooks/useParcours";
import { abregerTitreModule } from "@/lib/parcoursAcces";
import {
  getLibertyChapitreTitreForRoute,
  getLibertyToolRouteForChapitre,
} from "@/pages/parcours/liberty/liberty-tool-routes";

export interface ProchaineEtapeLiberty {
  route: string;
  libelle: string;
  /** L'étape suivante est un module de théorie de la formation. */
  estTheorie: boolean;
}

const RETOUR_PARCOURS: ProchaineEtapeLiberty = {
  route: "/parcours/liberty",
  libelle: "Retour au parcours",
  estTheorie: false,
};

/**
 * Où envoyer l'élève quand il vient de terminer un outil Liberty.
 *
 * L'enchaînement voulu est théorie → outil → théorie : à la sortie de l'outil
 * MN, on l'emmène sur le MODULE N+1 de la formation, et non sur le sommaire du
 * parcours. Si ce module est déjà vu, on saute directement à l'outil suivant.
 *
 * Le module courant est déduit de l'URL (/parcours/liberty/mN), donc ce hook
 * ne marche qu'à l'intérieur d'un outil.
 */
export function useProchaineEtapeLiberty(): ProchaineEtapeLiberty {
  const location = useLocation();
  const titre = getLibertyChapitreTitreForRoute(location.pathname);
  const { parcours, progress } = useParcours("liberty");

  if (!parcours || !titre) return RETOUR_PARCOURS;

  const ordonnes = parcours.phases.flatMap((p) => p.chapitres);
  const index = ordonnes.findIndex((c) => c.titre === titre);
  const suivant = index >= 0 && index < ordonnes.length - 1 ? ordonnes[index + 1] : null;
  if (!suivant) return RETOUR_PARCOURS;

  const theorie = progress?.theoriePour(suivant.id) ?? null;
  if (theorie) {
    return {
      route: theorie.route,
      libelle: `Passer à ${abregerTitreModule(theorie.titre)}`,
      estTheorie: true,
    };
  }

  return {
    route:
      getLibertyToolRouteForChapitre("liberty", suivant.titre) ??
      `/parcours/liberty/chapitre/${suivant.id}`,
    libelle: "Passer au module suivant",
    estTheorie: false,
  };
}
