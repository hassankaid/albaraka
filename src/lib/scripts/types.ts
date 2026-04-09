export interface ScriptCase {
  type: "pos" | "neg";
  label: string;
  lines: string[];
}

export interface ScriptPhase {
  label: string;
  voix: string;
  lines: string[];
  cases?: ScriptCase[];
  lines2?: string[];
  cases2?: ScriptCase[];
}

export interface Script {
  id: string;
  nom: string;
  icon: string;
  couleur: string;
  cat: "messages" | "calls";
  description: string;
  phases: ScriptPhase[];
}

export interface Objection {
  id: string;
  situation: string;
  reponse: string;
  verbatim?: string;
  etapes?: string[];
}

export interface ObjectionCategory {
  id: string;
  label: string;
  icon: string;
  objections: Objection[];
}

export const VOIX_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  raison: { label: "\u{1F9E0} Voix de la raison", color: "text-slate-600 dark:text-slate-300", bgColor: "bg-slate-100 dark:bg-slate-800" },
  enthousiasme: { label: "\u{1F525} Voix de l'enthousiasme", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  sincerite: { label: "\u{1F49A} Voix de la sinc\u00e9rit\u00e9", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  curiosite: { label: "\u{1F914} Voix de la curiosit\u00e9", color: "text-gold-500 dark:text-gold-300", bgColor: "bg-gold-100 dark:bg-gold-900/30" },
  mystere: { label: "\u{1F319} Voix du myst\u00e8re", color: "text-gold-600 dark:text-gold-300", bgColor: "bg-gold-100 dark:bg-gold-900/30" },
  empathie: { label: "\u{1F49C} Voix de l'empathie", color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  certitude: { label: "\u{1F4AA} Voix de la certitude", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  evidence: { label: "\u{2728} Voix de l'\u00e9vidence", color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
  decontracte: { label: "\u{1F60E} Voix d\u00e9contract\u00e9e", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  directive: { label: "\u{1F3AF} Voix directive", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
};
