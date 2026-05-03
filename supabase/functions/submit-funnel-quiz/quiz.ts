// ⚠ Copie miroir de src/lib/quizScoringDefinition.ts (Deno ne peut pas
// importer depuis src/). Si tu modifies l'un, mets aussi l'autre à jour.
//
// Le scoring est recalculé serveur-side : le front envoie les codes de
// réponse, jamais le score, pour éviter qu'un attaquant pousse un score
// arbitraire en base.

export interface QuizOption {
  code: string;
  label: string;
  score: number;
}

export interface QuizQuestion {
  id: string;
  title: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    title: "Situation professionnelle",
    options: [
      { code: "salarie",       label: "Salarié en CDI ou CDD",                    score: 10 },
      { code: "reconversion",  label: "En reconversion / Entre deux emplois",     score: 8 },
      { code: "etudiant",      label: "Étudiant",                                 score: 5 },
      { code: "independant",   label: "Indépendant / Freelance",                  score: 4 },
      { code: "sans_activite", label: "Sans activité professionnelle actuellement", score: 2 },
    ],
  },
  {
    id: "q2",
    title: "Âge",
    options: [
      { code: "25_35",   label: "25 - 35 ans",      score: 10 },
      { code: "36_45",   label: "36 - 45 ans",      score: 8 },
      { code: "18_24",   label: "18 - 24 ans",      score: 5 },
      { code: "46_plus", label: "46 ans et plus",   score: 0 },
    ],
  },
  {
    id: "q3",
    title: "Motivation",
    options: [
      { code: "quitter_emploi",        label: "Quitter mon emploi", score: 10 },
      { code: "subvenir_famille",      label: "Subvenir à ma famille", score: 10 },
      { code: "hijra",                 label: "Hijra / expatriation", score: 10 },
      { code: "revenu_complementaire", label: "Revenu complémentaire", score: 7 },
      { code: "halal_aligne",          label: "Halal et aligné", score: 7 },
      { code: "nomade",                label: "Travailler depuis n'importe où", score: 5 },
    ],
  },
  {
    id: "q4",
    title: "Budget",
    options: [
      { code: "plus_3000", label: "Plus de 3 000 €",         score: 10 },
      { code: "2000_3000", label: "Entre 2 000 et 3 000 €",  score: 8 },
      { code: "1000_2000", label: "Entre 1 000 et 2 000 €",  score: 5 },
      { code: "500_1000",  label: "Entre 500 et 1 000 €",    score: 2 },
      { code: "moins_500", label: "Moins de 500 €",          score: 0 },
    ],
  },
  {
    id: "q5",
    title: "Temps disponible",
    options: [
      { code: "plus_15h", label: "Plus de 15h/semaine",  score: 10 },
      { code: "7_15h",    label: "Entre 7 et 15h/semaine", score: 8 },
      { code: "3_7h",     label: "Entre 3 et 7h/semaine", score: 5 },
      { code: "moins_3h", label: "Moins de 3h/semaine",   score: 1 },
    ],
  },
  {
    id: "q6",
    title: "Aisance sociale",
    options: [
      { code: "tres_alaise",    label: "Très à l'aise",                      score: 10 },
      { code: "plutot_alaise",  label: "Plutôt à l'aise",                    score: 7 },
      { code: "pas_toujours",   label: "Pas toujours, prêt à travailler",    score: 4 },
      { code: "pas_du_tout",    label: "Pas du tout, je ne veux pas humain", score: 0 },
    ],
  },
  {
    id: "q7",
    title: "Maturité projet",
    options: [
      { code: "pret_action", label: "Prêt à passer à l'action",        score: 10 },
      { code: "deja_teste",  label: "Déjà testé, cherche accompagnement", score: 8 },
      { code: "informe",     label: "Informé, cherche la bonne méthode",  score: 5 },
      { code: "curiosite",   label: "Simple curiosité",                   score: 1 },
    ],
  },
];

export type QuizAnswers = Record<string, string>;
export type QuizCategory = "chaud" | "tiede" | "froid" | "hors_cible";

export function computeQuizResult(answers: QuizAnswers): { score: number; category: QuizCategory } {
  let score = 0;
  for (const q of QUIZ_QUESTIONS) {
    const code = answers[q.id];
    if (!code) continue;
    const option = q.options.find((o) => o.code === code);
    if (option) score += option.score;
  }
  return { score, category: scoreToCategory(score) };
}

export function scoreToCategory(score: number): QuizCategory {
  if (score >= 56) return "chaud";
  if (score >= 39) return "tiede";
  if (score >= 21) return "froid";
  return "hors_cible";
}

export function isQuizComplete(answers: QuizAnswers): boolean {
  return QUIZ_QUESTIONS.every((q) => {
    const code = answers[q.id];
    return !!code && q.options.some((o) => o.code === code);
  });
}
