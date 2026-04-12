import { ALL_DAYS } from "./predefinedTasks";

export type QuestionType =
  | "select" | "multi" | "number" | "time" | "text"
  | "blocked_slots" | "coaching_select" | "task_select" | "custom_tasks";

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  subtitle?: string;
  options?: string[];
  condition?: (answers: Record<string, any>) => boolean;
  taskFilter?: "baraka" | "liberty";
}

export const BARAKA_QUESTIONS: Question[] = [
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
  { id: "morning_routine", type: "select", label: "Routine matinale ?", options: ["Non", "~30 min", "~1h", "+1h"] },
  { id: "religious", type: "select", label: "Obligations religieuses à horaires fixes ?", options: ["Non", "Oui, 5 prières", "Oui, méditation", "Oui, autre"] },
  { id: "sport", type: "select", label: "Sport régulier ?", options: ["Non", "1-2x/sem", "3-4x/sem", "Tous les jours"] },
  { id: "sport_duration", type: "select", label: "Durée séance sport ?", options: ["30 min", "1h", "1h30", "2h+"], condition: (a) => a.sport && a.sport !== "Non" },
  { id: "peak_energy", type: "select", label: "Pic de concentration ?", options: ["Tôt le matin (5h-8h)", "Matinée (8h-12h)", "Après-midi (13h-17h)", "Soirée (18h-21h)", "Nuit (21h+)"] },
  { id: "daily_hours", type: "select", label: "Heures/jour pour ton activité ?", options: ["1h", "1h30", "2h", "2h30", "3h", "4h", "5h+"] },
  { id: "weekend_work", type: "select", label: "Dispo le week-end ?", options: ["Non", "Samedi", "Dimanche", "Samedi et Dimanche"] },
  { id: "rest_day", type: "select", label: "Jour de repos ?", options: ["Aucun", "Vendredi", "Samedi", "Dimanche"] },
  { id: "blocked_slots", type: "blocked_slots", label: "Créneaux bloqués chaque semaine ?", subtitle: "Cours, activités, obligations fixes..." },
  { id: "coachings", type: "coaching_select", label: "À quels coachings participer ?", subtitle: "Fortement recommandés." },
  { id: "selected_tasks", type: "task_select", label: "Tâches à intégrer à ton planning ?", subtitle: "Coche et indique la durée pour chaque tâche.", taskFilter: "baraka" },
  { id: "custom_tasks", type: "custom_tasks", label: "Tâches personnalisées ?", subtitle: "Crée tes propres tâches avec jour, heure, durée." },
  { id: "planning_preference", type: "select", label: "Planning strict ou flexible ?", options: ["Strict à la demi-heure", "Semi-flexible par blocs", "Flexible avec priorités"] },
  { id: "main_blocker", type: "text", label: "Qu'est-ce qui t'empêche d'avancer aujourd'hui ?" },
];

export const LIBERTY_QUESTIONS: Question[] = [
  { id: "activity_type", type: "select", label: "Quelle est ton activité en ligne ?", options: ["E-commerce / Dropshipping", "Coaching / Consulting", "Freelance / Prestation", "Affiliation", "Agence", "Création de contenu / Infoproduit", "Autre"] },
  { id: "activity_since", type: "select", label: "Depuis combien de temps es-tu lancé ?", options: ["< 3 mois", "3-6 mois", "6-12 mois", "1-2 ans", "+ 2 ans"] },
  { id: "activity_main", type: "select", label: "C'est ton activité principale ?", options: ["Oui, à 100%", "Oui mais j'ai un emploi à côté", "Non, c'est un side-project"] },
  { id: "has_job", type: "select", label: "As-tu encore un emploi salarié ?", options: ["Non", "Oui, temps plein", "Oui, temps partiel"], condition: (a) => a.activity_main !== "Oui, à 100%" },
  { id: "work_days", type: "multi", label: "Jours de travail salarié ?", options: [...ALL_DAYS], condition: (a) => a.has_job && a.has_job !== "Non" },
  { id: "work_start", type: "time", label: "Heure début travail salarié ?", condition: (a) => a.has_job && a.has_job !== "Non" },
  { id: "work_end", type: "time", label: "Heure fin travail salarié ?", condition: (a) => a.has_job && a.has_job !== "Non" },
  { id: "legal_status", type: "select", label: "Statut juridique ?", options: ["Auto-entrepreneur", "EURL / SASU", "SAS / SARL", "Rien encore", "Autre"] },
  { id: "current_ca", type: "select", label: "Chiffre d'affaires mensuel actuel ?", options: ["0 - pas encore de CA", "1€ - 500€", "500€ - 1 000€", "1 000€ - 3 000€", "3 000€ - 5 000€", "5 000€ - 10 000€", "+ 10 000€"] },
  { id: "goal_30", type: "text", label: "Objectif de CA à 30 jours ?" },
  { id: "goal_90", type: "text", label: "Objectif de CA à 90 jours ?" },
  { id: "goal_income", type: "text", label: "Revenu mensuel pour vivre confortablement ?" },
  { id: "team", type: "select", label: "Travailles-tu seul ou avec une équipe ?", options: ["Seul", "1-2 prestataires", "Petite équipe (3-5)", "Équipe structurée (5+)"] },
  { id: "team_time", type: "select", label: "Temps de management par jour ?", options: ["0 — je suis seul", "15-30 min", "30 min - 1h", "1h - 2h", "+ 2h"], condition: (a) => a.team && a.team !== "Seul" },
  { id: "tools", type: "multi", label: "Outils utilisés au quotidien ?", options: ["Notion", "Google Calendar", "Trello / Asana", "CRM", "Mailerlite / Brevo", "Shopify", "Systeme.io", "ClickFunnels", "Canva", "CapCut", "Autre"] },
  { id: "has_tunnel", type: "select", label: "Tunnel de vente en place ?", options: ["Non, pas encore", "En cours de création", "Oui, basique", "Oui, optimisé"] },
  { id: "has_email_seq", type: "select", label: "Séquences email en place ?", options: ["Non", "Oui, basique", "Oui, avancé"] },
  { id: "prospection_channels", type: "multi", label: "Canaux de prospection ?", options: ["DM Instagram", "DM TikTok", "LinkedIn", "Email", "Téléphone", "Publicité payante", "Autre"] },
  { id: "nb_prospects_day", type: "select", label: "Messages de prospection par jour ?", options: ["0 - pas encore", "1-5", "5-15", "15-30", "30+"] },
  { id: "closing_calls", type: "select", label: "Appels closing par semaine ?", options: ["0", "1-3", "3-5", "5-10", "10+"] },
  { id: "content_platforms", type: "multi", label: "Plateformes de contenu ?", options: ["Instagram", "TikTok", "YouTube", "LinkedIn", "Blog", "Podcast", "Aucune pour l'instant"] },
  { id: "content_per_week", type: "select", label: "Contenus publiés par semaine ?", options: ["0", "1-3", "3-5", "5-7", "7+"] },
  { id: "content_batching", type: "select", label: "Tu fais du batching ?", options: ["Non, au jour le jour", "Oui, 1-2 jours dédiés", "Oui, production groupée"] },
  { id: "admin_time", type: "select", label: "Temps admin par semaine (factures, compta, SAV) ?", options: ["< 1h", "1-2h", "2-4h", "4h+"] },
  { id: "has_comptable", type: "select", label: "As-tu un comptable ?", options: ["Non, je gère seul", "Oui"] },
  { id: "situation", type: "select", label: "Situation familiale ?", options: ["Célibataire", "En couple sans enfant", "En couple avec enfant(s)", "Parent solo"] },
  { id: "wake_week", type: "time", label: "Réveil en semaine ?" },
  { id: "wake_weekend", type: "time", label: "Réveil le week-end ?" },
  { id: "sleep_week", type: "time", label: "Coucher en semaine ?" },
  { id: "sleep_weekend", type: "time", label: "Coucher le week-end ?" },
  { id: "morning_routine", type: "select", label: "Routine matinale ?", options: ["Non", "~30 min", "~1h", "+1h"] },
  { id: "religious", type: "select", label: "Obligations religieuses à horaires fixes ?", options: ["Non", "Oui, 5 prières", "Oui, méditation", "Oui, autre"] },
  { id: "sport", type: "select", label: "Sport régulier ?", options: ["Non", "1-2x/sem", "3-4x/sem", "Tous les jours"] },
  { id: "sport_duration", type: "select", label: "Durée séance sport ?", options: ["30 min", "1h", "1h30", "2h+"], condition: (a) => a.sport && a.sport !== "Non" },
  { id: "peak_energy", type: "select", label: "Pic de concentration ?", options: ["Tôt le matin (5h-8h)", "Matinée (8h-12h)", "Après-midi (13h-17h)", "Soirée (18h-21h)", "Nuit (21h+)"] },
  { id: "daily_hours", type: "select", label: "Heures/jour sur ton activité ?", options: ["2h", "3h", "4h", "5h", "6h", "8h", "10h+"] },
  { id: "weekend_work", type: "select", label: "Dispo le week-end ?", options: ["Non", "Samedi", "Dimanche", "Samedi et Dimanche"] },
  { id: "rest_day", type: "select", label: "Jour de repos ?", options: ["Aucun", "Vendredi", "Samedi", "Dimanche"] },
  { id: "blocked_slots", type: "blocked_slots", label: "Créneaux bloqués chaque semaine ?", subtitle: "RDV clients, calls fixes, obligations..." },
  { id: "coachings", type: "coaching_select", label: "À quels coachings participer ?", subtitle: "Fortement recommandés." },
  { id: "selected_tasks", type: "task_select", label: "Tâches à intégrer à ton planning ?", subtitle: "Coche et indique la durée.", taskFilter: "liberty" },
  { id: "custom_tasks", type: "custom_tasks", label: "Tâches personnalisées ?", subtitle: "Crée tes propres tâches." },
  { id: "bottleneck", type: "select", label: "Plus gros goulot d'étranglement ?", options: ["Manque de temps", "Trop de tâches, pas de priorisation", "Procrastination", "Pas assez de prospects", "Pas assez de contenu", "Technique / outils", "Mindset / motivation"] },
  { id: "planning_preference", type: "select", label: "Planning strict ou flexible ?", options: ["Strict à la demi-heure", "Semi-flexible par blocs", "Flexible avec priorités"] },
];
