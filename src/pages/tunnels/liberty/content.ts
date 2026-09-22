// ─────────────────────────────────────────────────────────────────────────
// Tunnel Liberty — copy des trois pages.
//
// Texte repris MOT POUR MOT du document de l'équipe marketing
// (« Copy tunnel de vente »), y compris la ponctuation et les majuscules.
// Toute reformulation se décide avec eux, pas ici.
// ─────────────────────────────────────────────────────────────────────────

export const BANDEAU =
  "Pour les musulmans qui ont une vraie compétence ou une vraie passion (cake design, coaching, nutrition, psychologie, peu importe) et veulent enfin en vivre";

export const TITRE =
  "Remplace ton salaire en monétisant ta compétence ou ta passion, en ligne, halal";

export const SOUS_TITRE = "même si tu pars de 0 en business";

export const CTA_LANDING = "Je découvre l'opportunité";

export const CTA_RDV = "Je réserve un appel";

export interface Decouverte {
  n: string;
  texte: string;
}

/** Bloc « TU VAS DÉCOUVRIR », les quatre points du document. */
export const DECOUVERTES: Decouverte[] = [
  {
    n: "01",
    texte:
      "Le vrai piège qui garde la plupart des gens compétents bloqués entre « je sais faire » et « j'en vis chaque mois ».",
  },
  {
    n: "02",
    texte:
      "Le Process Al Baraka pour transformer n'importe quelle compétence sérieuse, cake design, coaching sportif, nutrition, psychologie, langue arabe etc.. en offre claire, vendable, à plusieurs milliers d'euros.",
  },
  {
    n: "03",
    texte:
      "Comment construire ton identité et ta visibilité en ligne pour que les bonnes personnes viennent vers toi naturellement, sans jamais avoir besoin de mendier l'attention ou d'avoir des milliers d'abonnés.",
  },
  {
    n: "04",
    texte:
      "Comment ton activité peut continuer à tourner et générer des revenus même quand tu es en vacances, en voyage, ou installé dans un tout autre pays, sans jamais dépendre d'un employeur.",
  },
];

/** Copy du pop-in de capture : ce tunnel ne vend pas une conférence datée. */
export const OPTIN = {
  titre: "Accède à la vidéo maintenant",
  texte: "Veuillez renseigner les informations ci-dessous",
  bouton: "Je découvre l'opportunité",
} as const;

/**
 * Agenda Calendly du tunnel Liberty — événement DISTINCT des autres tunnels,
 * pour que ces rendez-vous soient identifiables dans `calls.event_type`.
 */
export const CALENDLY_URL = "https://calendly.com/d/dv7b-mbd-5zk/liberty";
