// Règles de déverrouillage des coachings hebdomadaires (demande CEO 20/05/2026).
//
// Chaque coaching du calendrier ne se débloque que lorsque l'élève a TERMINÉ
// la formation associée (tous chapitres + tous quiz validés — cf.
// isFormationCompleteForUser dans src/lib/certificateEligibility.ts).
//
// Le verrou ne s'applique qu'aux ÉLÈVES (role = apporteur). Le CEO et le
// staff (collaborateur / coach) voient tous les coachings déverrouillés.
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
