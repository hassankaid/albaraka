export type EmotionCategory = "positive" | "neutre" | "negatif";

export interface Emotion {
  id: string;
  label: string;
  emoji: string;
  cat: EmotionCategory;
  energy: 1 | 2 | 3 | 4 | 5;
  color: string;
}

export const EMOTIONS: Emotion[] = [
  { id: "enthousiaste", label: "Enthousiaste", emoji: "🔥", cat: "positive", energy: 5, color: "#E8A838" },
  { id: "determine", label: "Déterminé", emoji: "💪", cat: "positive", energy: 5, color: "#C9A84C" },
  { id: "motive", label: "Motivé", emoji: "🚀", cat: "positive", energy: 4, color: "#D4B966" },
  { id: "confiant", label: "Confiant", emoji: "😎", cat: "positive", energy: 4, color: "#4CAF50" },
  { id: "serein", label: "Serein", emoji: "🧘", cat: "positive", energy: 3, color: "#5B9BD5" },
  { id: "concentre", label: "Concentré", emoji: "🎯", cat: "neutre", energy: 3, color: "#7A8FA6" },
  { id: "curieux", label: "Curieux", emoji: "🤔", cat: "neutre", energy: 3, color: "#9B8EC4" },
  { id: "neutre", label: "Neutre", emoji: "😐", cat: "neutre", energy: 2, color: "#7A7060" },
  { id: "fatigue", label: "Fatigué", emoji: "😴", cat: "negatif", energy: 1, color: "#8C7B6B" },
  { id: "indifferent", label: "Indifférent", emoji: "🤷", cat: "negatif", energy: 1, color: "#6B6B6B" },
  { id: "impatient", label: "Impatient", emoji: "⚡", cat: "negatif", energy: 4, color: "#E8A040" },
  { id: "stresse", label: "Stressé", emoji: "😰", cat: "negatif", energy: 3, color: "#D4764E" },
  { id: "anxieux", label: "Anxieux", emoji: "😟", cat: "negatif", energy: 3, color: "#C4694A" },
  { id: "peur", label: "Peur", emoji: "😨", cat: "negatif", energy: 2, color: "#B85C5C" },
  { id: "frustre", label: "Frustré", emoji: "😤", cat: "negatif", energy: 4, color: "#C45050" },
  { id: "decourage", label: "Découragé", emoji: "😞", cat: "negatif", energy: 1, color: "#8B5E5E" },
  { id: "demotive", label: "Démotivé", emoji: "😮‍💨", cat: "negatif", energy: 1, color: "#7A6060" },
];

export const EMOTION_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Énergie positive", ids: ["enthousiaste", "determine", "motive", "confiant"] },
  { label: "Calme / Focus", ids: ["serein", "concentre", "curieux", "neutre"] },
  { label: "Tension / Blocage", ids: ["impatient", "stresse", "anxieux", "peur", "frustre"] },
  { label: "Basse énergie", ids: ["fatigue", "indifferent", "decourage", "demotive"] },
];

export const EMOTIONS_BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));
