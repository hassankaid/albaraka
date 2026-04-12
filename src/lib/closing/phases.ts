export interface Phase {
  id: 1 | 2 | 3;
  name: string;
  range: string;
  target: string;
  weeks: number[];
  goals: string[];
}

export const PHASES: Phase[] = [
  {
    id: 1,
    name: "Fondations",
    range: "Semaines 1–4",
    target: "10–15 %",
    weeks: [1, 2, 3, 4],
    goals: ["Scripts par cœur", "5 role plays/jour", "Enregistrer chaque appel"],
  },
  {
    id: 2,
    name: "Traction",
    range: "Semaines 5–8",
    target: "25–35 %",
    weeks: [5, 6, 7, 8],
    goals: ["12 objections sans script", "3 zones/semaine", "Silences maîtrisés"],
  },
  {
    id: 3,
    name: "Performance",
    range: "Semaines 9–12",
    target: "35–50 %",
    weeks: [9, 10, 11, 12],
    goals: ["Adapter le script", "Pré-anticiper", "Former d'autres closers"],
  },
];

export function getPhaseForWeek(weekNumber: number): Phase {
  return PHASES.find((p) => p.weeks.includes(weekNumber)) ?? PHASES[0];
}

export const TARGETS = { rpDecouverte: 4, rpClosing: 3 } as const;
export const TOTAL_WEEKS = 12;
