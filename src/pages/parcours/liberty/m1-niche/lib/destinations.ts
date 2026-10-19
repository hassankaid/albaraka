// Où l'outil M1 Niche renvoie l'élève (Sidali, 19/10/2026).
//
// Ouvert depuis l'ancien parcours Liberty (/parcours/liberty/m1), il y renvoie.
// Ouvert depuis le nouveau parcours (bouton « Je n'ai pas encore d'idée d'offre »
// sous la première vidéo), il renvoie au nouveau parcours et, une fois la niche
// trouvée, à l'Outil 1 où l'élève la reporte : l'ancien parcours sera masqué.
import { createContext, useContext } from "react";

export interface DestinationsNiche {
  retour: string;
  libelleRetour: string;
  /** l'étape d'après, une fois l'outil terminé (absente : la suite de l'ancien parcours) */
  suite?: { route: string; libelle: string };
}

export const DESTINATIONS_ANCIEN_PARCOURS: DestinationsNiche = {
  retour: "/parcours/liberty",
  libelleRetour: "Retour au parcours LIBERTY",
};

export const DESTINATIONS_NOUVEAU_PARCOURS: DestinationsNiche = {
  retour: "/training/parcours-liberty",
  libelleRetour: "Retour au parcours Liberty",
  suite: {
    route: "/training/parcours-liberty/outil/liberty_niche_avatar",
    libelle: "Reporter ma niche dans l'Outil 1",
  },
};

export const DestinationsNicheContext = createContext<DestinationsNiche>(DESTINATIONS_ANCIEN_PARCOURS);

export const useDestinationsNiche = () => useContext(DestinationsNicheContext);
