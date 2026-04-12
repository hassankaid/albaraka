export type TaskCategory =
  | "business" | "formation" | "coaching" | "emploi" | "perso"
  | "religion" | "sport" | "repos" | "admin" | "custom" | "blocked";

export interface PredefinedTask {
  id: string;
  label: string;
  defaultDur: number;
  defaultFreq: "quotidien" | "3x/semaine" | "2-3x/semaine" | "1x/semaine" | "avant coaching" | "après coaching";
  cat: TaskCategory;
}

export const PREDEFINED_TASKS: PredefinedTask[] = [
  { id: "task_tournage", label: "🎬 Tournage vidéos", defaultDur: 60, defaultFreq: "3x/semaine", cat: "business" },
  { id: "task_creation_contenu", label: "✍️ Création de contenu", defaultDur: 60, defaultFreq: "quotidien", cat: "business" },
  { id: "task_montage", label: "🎞 Montage vidéo", defaultDur: 60, defaultFreq: "3x/semaine", cat: "business" },
  { id: "task_sourcing_videos", label: "🔍 Sourcing vidéos", defaultDur: 30, defaultFreq: "quotidien", cat: "business" },
  { id: "task_sourcing_infopreneur", label: "🔍 Sourcing infopreneurs", defaultDur: 30, defaultFreq: "quotidien", cat: "business" },
  { id: "task_setting_dm", label: "💬 Setting DM", defaultDur: 45, defaultFreq: "quotidien", cat: "business" },
  { id: "task_setting_tel", label: "📞 Setting téléphonique", defaultDur: 45, defaultFreq: "quotidien", cat: "business" },
  { id: "task_closing", label: "🤝 Appel closing", defaultDur: 30, defaultFreq: "2-3x/semaine", cat: "business" },
  { id: "task_formation_video", label: "📚 Formation vidéo", defaultDur: 45, defaultFreq: "quotidien", cat: "formation" },
  { id: "task_engagement", label: "💛 Engagement communautaire", defaultDur: 20, defaultFreq: "quotidien", cat: "business" },
  { id: "task_veille", label: "👀 Veille / Étude de marché", defaultDur: 30, defaultFreq: "2-3x/semaine", cat: "business" },
  { id: "task_sav", label: "📩 SAV / Suivi client", defaultDur: 20, defaultFreq: "quotidien", cat: "admin" },
  { id: "task_technique", label: "⚙️ Mise en place technique", defaultDur: 45, defaultFreq: "1x/semaine", cat: "admin" },
  { id: "task_bilan", label: "📊 Bilan hebdomadaire", defaultDur: 30, defaultFreq: "1x/semaine", cat: "admin" },
  { id: "task_planif", label: "📋 Planification semaine", defaultDur: 20, defaultFreq: "1x/semaine", cat: "admin" },
  { id: "task_prep_coaching", label: "📝 Prépa coaching", defaultDur: 20, defaultFreq: "avant coaching", cat: "coaching" },
  { id: "task_post_coaching", label: "🚀 Application post-coaching", defaultDur: 30, defaultFreq: "après coaching", cat: "formation" },
  { id: "task_notes", label: "📓 Notes / Révision", defaultDur: 20, defaultFreq: "quotidien", cat: "formation" },
  // Liberty-specific
  { id: "task_management", label: "👥 Management équipe", defaultDur: 30, defaultFreq: "quotidien", cat: "admin" },
  { id: "task_tunnel", label: "🔧 Optimisation tunnel de vente", defaultDur: 45, defaultFreq: "2-3x/semaine", cat: "business" },
  { id: "task_email_seq", label: "📧 Séquences email / Nurturing", defaultDur: 30, defaultFreq: "2-3x/semaine", cat: "business" },
  { id: "task_pub", label: "📣 Publicité / Ads", defaultDur: 30, defaultFreq: "quotidien", cat: "business" },
  { id: "task_comptabilite", label: "💰 Comptabilité / Finances", defaultDur: 30, defaultFreq: "1x/semaine", cat: "admin" },
  { id: "task_strategie", label: "🧠 Stratégie / Brainstorm", defaultDur: 45, defaultFreq: "1x/semaine", cat: "admin" },
];

export const BARAKA_TASK_IDS = [
  "task_tournage","task_creation_contenu","task_montage","task_sourcing_videos",
  "task_sourcing_infopreneur","task_setting_dm","task_setting_tel","task_closing",
  "task_formation_video","task_engagement","task_veille","task_sav","task_technique",
  "task_bilan","task_planif","task_prep_coaching","task_post_coaching","task_notes",
];

export const LIBERTY_TASK_IDS = [
  ...BARAKA_TASK_IDS,
  "task_management","task_tunnel","task_email_seq","task_pub","task_comptabilite","task_strategie",
];

export const ALL_DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"] as const;
export type DayName = typeof ALL_DAYS[number];

export const CAT_LABELS: Record<TaskCategory, string> = {
  business: "Activité",
  formation: "Formation",
  coaching: "Coaching",
  emploi: "Emploi / Études",
  perso: "Vie perso",
  religion: "Spiritualité",
  sport: "Sport",
  repos: "Repos",
  admin: "Admin",
  custom: "Tâche perso",
  blocked: "Créneau bloqué",
};

// Tailwind classes par catégorie (reste neutre vs thème app ; rebrand gold OK)
export const CAT_CLASSES: Record<TaskCategory, { bg: string; text: string; border: string; dot: string }> = {
  business:  { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", border: "border-l-amber-500", dot: "bg-amber-500" },
  formation: { bg: "bg-sky-500/15",   text: "text-sky-600 dark:text-sky-400",     border: "border-l-sky-500",   dot: "bg-sky-500" },
  coaching:  { bg: "bg-violet-500/15",text: "text-violet-600 dark:text-violet-400",border: "border-l-violet-500",dot: "bg-violet-500" },
  emploi:    { bg: "bg-slate-500/15", text: "text-slate-600 dark:text-slate-400", border: "border-l-slate-500", dot: "bg-slate-500" },
  perso:     { bg: "bg-muted",        text: "text-muted-foreground",              border: "border-l-muted-foreground/30", dot: "bg-muted-foreground/50" },
  religion:  { bg: "bg-emerald-500/15",text: "text-emerald-600 dark:text-emerald-400",border: "border-l-emerald-500",dot: "bg-emerald-500" },
  sport:     { bg: "bg-orange-500/15",text: "text-orange-600 dark:text-orange-400",border: "border-l-orange-500", dot: "bg-orange-500" },
  repos:     { bg: "bg-purple-500/15",text: "text-purple-600 dark:text-purple-400",border: "border-l-purple-500", dot: "bg-purple-500" },
  admin:     { bg: "bg-pink-500/15",  text: "text-pink-600 dark:text-pink-400",   border: "border-l-pink-500",   dot: "bg-pink-500" },
  custom:    { bg: "bg-cyan-500/15",  text: "text-cyan-600 dark:text-cyan-400",   border: "border-l-cyan-500",   dot: "bg-cyan-500" },
  blocked:   { bg: "bg-rose-500/15",  text: "text-rose-600 dark:text-rose-400",   border: "border-l-rose-500",   dot: "bg-rose-500" },
};
