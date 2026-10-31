import { ALL_DAYS, PARCOURS } from "./predefinedTasks";

export type QuestionType =
  | "select" | "multi" | "number" | "time" | "text"
  | "blocked_slots" | "taches_parcours" | "custom_tasks"
  | "day_overrides";

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  subtitle?: string;
  options?: string[];
  condition?: (answers: Record<string, any>) => boolean;
}

// Le questionnaire de vie, le même pour le Pass et LIBERTY (décision de Sidali du 31/10/2026) :
// un élève LIBERTY démarre de zéro, les questions sur une activité existante ont disparu.
const QUESTIONS_DE_VIE: Question[] = [
  { id: "profile", type: "select", label: "Quel est ton profil actuel ?", options: ["Salarié(e)", "Étudiant(e)", "Mère/Père au foyer", "Demandeur d'emploi", "Retraité(e)", "Autre"] },
  { id: "age", type: "number", label: "Quel est ton âge ?" },
  { id: "situation", type: "select", label: "Situation familiale ?", options: ["Célibataire", "En couple sans enfant", "En couple avec enfant(s)", "Parent solo"] },
  { id: "dependents", type: "select", label: "Personnes à charge ?", options: ["Non", "Oui, enfants en bas âge", "Oui, parent dépendant", "Oui, plusieurs"] },
  { id: "contract", type: "select", label: "Type de contrat ?", options: ["CDI temps plein", "CDI temps partiel", "CDD", "Intérim", "Fonction publique"], condition: (a) => a.profile === "Salarié(e)" },
  { id: "work_days", type: "multi", label: "Jours de travail ?", options: [...ALL_DAYS], condition: (a) => a.profile === "Salarié(e)" },
  { id: "work_start", type: "time", label: "Heure début travail ?", condition: (a) => a.profile === "Salarié(e)" },
  { id: "work_end", type: "time", label: "Heure fin travail ?", condition: (a) => a.profile === "Salarié(e)" },
  { id: "work_break", type: "select", label: "Pauses exploitables ?", options: ["Non", "Oui, 30 min", "Oui, 1h", "Oui, +1h"], condition: (a) => a.profile === "Salarié(e)" },
  { id: "commute", type: "select", label: "Trajet aller-retour ?", options: ["< 30 min", "30 min à 1h", "1h à 2h", "> 2h"], condition: (a) => a.profile === "Salarié(e)" },
  { id: "commute_productive", type: "select", label: "Productif pendant le trajet ?", options: ["Non", "Oui, audios", "Oui, lire/écrire", "Oui, laptop"], condition: (a) => a.profile === "Salarié(e)" },
  { id: "study_days", type: "multi", label: "Jours de cours ?", options: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"], condition: (a) => a.profile === "Étudiant(e)" },
  { id: "study_start", type: "time", label: "Heure début cours ?", condition: (a) => a.profile === "Étudiant(e)" },
  { id: "study_end", type: "time", label: "Heure fin cours ?", condition: (a) => a.profile === "Étudiant(e)" },
  { id: "study_gaps", type: "select", label: "Trous dans l'EDT ?", options: ["Non", "~1h/jour", "~2h/jour", "+2h/jour"], condition: (a) => a.profile === "Étudiant(e)" },
  { id: "kids_school", type: "select", label: "Enfants scolarisés ?", options: ["Non, à la maison", "En partie", "Oui, tous"], condition: (a) => a.profile === "Mère/Père au foyer" },
  { id: "nap_time", type: "select", label: "Sieste des enfants ?", options: ["Non", "~1h", "~2h"], condition: (a) => a.profile === "Mère/Père au foyer" },
  { id: "job_search", type: "select", label: "Recherche active d'emploi ?", options: ["Oui, priorité emploi", "Oui mais online d'abord", "Non, 100% online"], condition: (a) => a.profile === "Demandeur d'emploi" },
  { id: "wake_week", type: "time", label: "Réveil en semaine ?" },
  { id: "wake_weekend", type: "time", label: "Réveil le week-end ?" },
  { id: "sleep_week", type: "time", label: "Coucher en semaine ?" },
  { id: "sleep_weekend", type: "time", label: "Coucher le week-end ?" },
  {
    id: "day_overrides",
    type: "day_overrides",
    label: "Tes horaires varient selon les jours ?",
    subtitle: "Optionnel. Si tes horaires habituels te conviennent pour toute la semaine, tu peux passer cette étape. Sinon, personnalise jour par jour.",
  },
  { id: "morning_routine", type: "select", label: "Routine matinale ?", options: ["Non", "~30 min", "~1h", "+1h"] },
  { id: "religious", type: "select", label: "Obligations religieuses à horaires fixes ?", options: ["Non", "Oui, 5 prières", "Oui, méditation", "Oui, autre"] },
  { id: "sport", type: "select", label: "Sport régulier ?", options: ["Non", "1-2x/sem", "3-4x/sem", "Tous les jours"] },
  { id: "sport_duration", type: "select", label: "Durée séance sport ?", options: ["30 min", "1h", "1h30", "2h+"], condition: (a) => a.sport && a.sport !== "Non" },
  { id: "peak_energy", type: "select", label: "Pic de concentration ?", options: ["Tôt le matin (5h-8h)", "Matinée (8h-12h)", "Après-midi (13h-17h)", "Soirée (18h-21h)", "Nuit (21h+)"] },
  { id: "daily_hours", type: "select", label: "Combien d'heures par jour peux-tu consacrer à ton apprentissage ?", subtitle: "Coachings compris. Aucun minimum : indique ce qui est réaliste pour toi.", options: ["1h", "1h30", "2h", "2h30", "3h", "4h", "5h+"] },
  { id: "weekend_work", type: "select", label: "Dispo le week-end ?", options: ["Non", "Samedi", "Dimanche", "Samedi et Dimanche"] },
  { id: "rest_day", type: "select", label: "Jour de repos ?", options: ["Aucun", "Vendredi", "Samedi", "Dimanche"] },
  { id: "blocked_slots", type: "blocked_slots", label: "Créneaux bloqués chaque semaine ?", subtitle: "Cours, activités, obligations fixes..." },
  { id: "taches_parcours", type: "taches_parcours", label: "Tes tâches d'apprentissage", subtitle: "Coche celles que tu veux et indique leur durée. Les jours sont facultatifs : sans jour choisi, on les répartit dans le temps que tu as indiqué." },
  { id: "custom_tasks", type: "custom_tasks", label: "Tâches personnalisées ?", subtitle: "Crée tes propres tâches avec jour, heure, durée." },
  { id: "planning_preference", type: "select", label: "Planning strict ou flexible ?", options: ["Strict à la demi-heure", "Semi-flexible par blocs", "Flexible avec priorités"] },
  { id: "main_blocker", type: "text", label: "Qu'est-ce qui t'empêche d'avancer aujourd'hui ?" },
];

export const BARAKA_QUESTIONS: Question[] = [
  { id: "parcours", type: "select", label: "Sur quel parcours tu te concentres en ce moment ?", subtitle: "Tes tâches en dépendent. Tu pourras changer à tout moment dans « Ajuster mon planning ».", options: [...PARCOURS] },
  ...QUESTIONS_DE_VIE,
];

export const LIBERTY_QUESTIONS: Question[] = QUESTIONS_DE_VIE;
