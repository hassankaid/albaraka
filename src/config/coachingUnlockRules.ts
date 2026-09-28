// Libellés d'affichage des règles de coaching.
//
// ⚠️ CE FICHIER NE DÉCIDE PLUS RIEN depuis le 28/09/2026.
//
// La règle est descendue en base : coaching_weekly_slots.formation_requise_id
// porte la condition, et public.coachings_de() la résout — dérogation manuelle
// d'abord, complétion de la formation ensuite. Le hook useCoachingUnlocks lit
// ce résultat et n'évalue plus rien.
//
// Ce qui reste ici : les libellés et les slugs, pour le message affiché à
// l'élève (« Termine la formation Setting », lien vers /training/setting).
// Si vous changez la formation requise d'un créneau, c'est en base qu'il faut
// le faire — modifier ce fichier ne changerait que le texte.
//
// Clé = id du créneau dans coaching_weekly_slots (stable, lisible) :
//   setting-telephonique · creation-contenus · setting-message · closing

export interface CoachingUnlockRule {
  /** UUID de la formation requise (table public.formations). */
  formationId: string;
  /** Libellé court affiché à l'élève dans le message de verrouillage. */
  formationLabel: string;
  /** Slug de la formation pour le lien « Voir la formation » (/training/:slug). */
  formationSlug: string;
}

export const COACHING_UNLOCK_RULES: Record<string, CoachingUnlockRule> = {
  // Vendredi — Création de contenu → formation MARKETING DIGITAL
  "creation-contenus": {
    formationId: "4949ffda-77d2-450e-adad-83554645af32",
    formationLabel: "Marketing Digital",
    formationSlug: "marketing-digital",
  },
  // Samedi — Setting Message → formation SETTING
  "setting-message": {
    formationId: "e9b91eb6-2612-45eb-b28d-947bfdaad974",
    formationLabel: "Setting",
    formationSlug: "setting",
  },
  // Lundi — Setting Téléphonique → formation SETTING
  "setting-telephonique": {
    formationId: "e9b91eb6-2612-45eb-b28d-947bfdaad974",
    formationLabel: "Setting",
    formationSlug: "setting",
  },
  // Dimanche — Closing → formation CLOSING
  closing: {
    formationId: "7e533baa-7b5e-42cf-8473-6a9fd19c318f",
    formationLabel: "Closing",
    formationSlug: "closing",
  },
};

/** Liste dédupliquée des formations requises par au moins un coaching. */
export const REQUIRED_FORMATION_IDS: string[] = Array.from(
  new Set(Object.values(COACHING_UNLOCK_RULES).map((r) => r.formationId)),
);
