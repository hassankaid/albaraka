export type TaskCategory =
  | "business" | "formation" | "coaching" | "emploi" | "perso"
  | "religion" | "sport" | "repos" | "admin" | "custom" | "blocked";

export interface TacheApprentissage {
  id: string;
  label: string;
  /** durée proposée, en minutes ; l'élève la change comme il veut */
  dureeDefaut: number;
  cat: TaskCategory;
}

export const TACHES_APPRENTISSAGE: TacheApprentissage[] = [
  { id: "task_formation", label: "📚 Formation", dureeDefaut: 60, cat: "formation" },
  { id: "task_roleplay", label: "🎭 Roleplay", dureeDefaut: 45, cat: "business" },
  { id: "task_setting_tel", label: "📞 Setting téléphonique", dureeDefaut: 30, cat: "business" },
  { id: "task_creation_contenu", label: "✍️ Création de contenu", dureeDefaut: 60, cat: "business" },
  { id: "task_prospection", label: "🔍 Prospection", dureeDefaut: 45, cat: "business" },
];

export const PARCOURS = ["Setter / Closer", "Community Management", "Les deux"] as const;

/** Le Pass donne accès aux deux parcours : c'est l'élève qui dit sur lequel il se concentre. LIBERTY : son pass suffit. */
export function tachesDuParcours(pack: "al_baraka" | "liberty", parcours?: string): TacheApprentissage[] {
  const setter = ["task_formation", "task_roleplay", "task_setting_tel"];
  const contenu = ["task_formation", "task_creation_contenu", "task_prospection"];
  const ids = pack === "liberty" || parcours === "Community Management"
    ? contenu
    : parcours === "Les deux"
    ? [...setter, ...contenu.slice(1)]
    : setter;
  return ids.map((id) => TACHES_APPRENTISSAGE.find((t) => t.id === id)!);
}

export const ALL_DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"] as const;
export type DayName = typeof ALL_DAYS[number];

export const CAT_LABELS: Record<TaskCategory, string> = {
  business: "Pratique",
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
