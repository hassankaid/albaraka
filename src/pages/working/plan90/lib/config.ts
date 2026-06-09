/**
 * Plan 90 jours — tracker d'entraînement closing AL BARAKA.
 * Portage React fidèle de la source (config/EMOTIONS/PHASES verbatim) ; persistance cloud Supabase.
 */

export interface DayData {
  rpD: string;
  rpC: string;
  ventes: string;
  emotions: string[];
  feeling: string;
  learning: string;
}
export interface WeekData {
  week: number;
  days: Record<number, DayData>;
}
export type Plan90Data = Record<number, WeekData>;

export interface Emotion {
  id: string;
  label: string;
  emoji: string;
  cat: "positive" | "neutre" | "negatif";
  energy: number;
  color: string;
}
export interface Phase {
  id: number;
  name: string;
  range: string;
  target: string;
  weeks: number[];
  goals: string[];
}

export const TARGETS = { rpDecouverte: 4, rpClosing: 3 };
export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const PHASES: Phase[] = [
  { id: 1, name: "Fondations", range: "Semaines 1–4", target: "10–15 %", weeks: [1, 2, 3, 4], goals: ["Scripts par cœur", "5 role plays/jour", "Enregistrer chaque appel"] },
  { id: 2, name: "Traction", range: "Semaines 5–8", target: "25–35 %", weeks: [5, 6, 7, 8], goals: ["12 objections sans script", "3 zones/semaine", "Silences maîtrisés"] },
  { id: 3, name: "Performance", range: "Semaines 9–12", target: "35–50 %", weeks: [9, 10, 11, 12], goals: ["Adapter le script", "Pré-anticiper", "Former d'autres closers"] },
];

// Emotional states grouped by energy/valence
export const EMOTIONS: Emotion[] = [
  // High energy positive
  { id: "enthousiaste", label: "Enthousiaste", emoji: "🔥", cat: "positive", energy: 5, color: "#E8A838" },
  { id: "determine", label: "Déterminé", emoji: "💪", cat: "positive", energy: 5, color: "#C9A84C" },
  { id: "motive", label: "Motivé", emoji: "🚀", cat: "positive", energy: 4, color: "#D4B966" },
  { id: "confiant", label: "Confiant", emoji: "😎", cat: "positive", energy: 4, color: "#4CAF50" },
  // Calm positive
  { id: "serein", label: "Serein", emoji: "🧘", cat: "positive", energy: 3, color: "#5B9BD5" },
  { id: "concentre", label: "Concentré", emoji: "🎯", cat: "neutre", energy: 3, color: "#7A8FA6" },
  { id: "curieux", label: "Curieux", emoji: "🤔", cat: "neutre", energy: 3, color: "#9B8EC4" },
  // Neutral / Low
  { id: "neutre", label: "Neutre", emoji: "😐", cat: "neutre", energy: 2, color: "#7A7060" },
  { id: "fatigue", label: "Fatigué", emoji: "😴", cat: "negatif", energy: 1, color: "#8C7B6B" },
  { id: "indifferent", label: "Indifférent", emoji: "🤷", cat: "negatif", energy: 1, color: "#6B6B6B" },
  // Negative / Tension
  { id: "impatient", label: "Impatient", emoji: "⚡", cat: "negatif", energy: 4, color: "#E8A040" },
  { id: "stresse", label: "Stressé", emoji: "😰", cat: "negatif", energy: 3, color: "#D4764E" },
  { id: "anxieux", label: "Anxieux", emoji: "😟", cat: "negatif", energy: 3, color: "#C4694A" },
  { id: "peur", label: "Peur", emoji: "😨", cat: "negatif", energy: 2, color: "#B85C5C" },
  { id: "frustre", label: "Frustré", emoji: "😤", cat: "negatif", energy: 4, color: "#C45050" },
  { id: "decourage", label: "Découragé", emoji: "😞", cat: "negatif", energy: 1, color: "#8B5E5E" },
  { id: "demotive", label: "Démotivé", emoji: "😮‍💨", cat: "negatif", energy: 1, color: "#7A6060" },
];

export const emptyDay = (): DayData => ({ rpD: "", rpC: "", ventes: "", emotions: [], feeling: "", learning: "" });
export const emptyWeek = (n: number): WeekData => {
  const days: Record<number, DayData> = {};
  for (let d = 0; d < 7; d++) days[d] = emptyDay();
  return { week: n, days };
};
export const emptyPlan = (): Plan90Data => {
  const d: Plan90Data = {};
  for (let w = 1; w <= 12; w++) d[w] = emptyWeek(w);
  return d;
};

export const LEGACY_SK = "albaraka_plan90_v3";

export const C = {
  bg: "#080808", card: "#0D0D0F", card2: "#111111", border: "#1A1A1A",
  gold: "#C9A84C", goldD: "#B8963E", white: "#FFFFFF", light: "#E0E0E0",
  gray: "#7A7060", dGray: "#3A3A3A", green: "#4CAF50", red: "#E84040",
};

export const inp: React.CSSProperties = {
  background: C.card2, border: "1px solid " + C.border, borderRadius: "6px",
  color: C.light, padding: "8px 10px", fontSize: "13px",
  fontFamily: "Calibri, sans-serif", outline: "none", width: "100%", boxSizing: "border-box",
};
