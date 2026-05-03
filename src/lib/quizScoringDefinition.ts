// Définition partagée du Quiz Scoring (7 questions, score sur 70).
//
// IMPORTANT : la même structure est dupliquée côté edge function
// `submit-funnel-quiz` (Deno ne peut pas importer depuis src/). Si tu modifies
// ici, mets aussi à jour `supabase/functions/submit-funnel-quiz/quiz.ts`.
//
// Le scoring final est TOUJOURS recalculé côté serveur — le front envoie les
// codes de réponse, jamais le score. Ça évite qu'un utilisateur malveillant
// pousse un score arbitraire dans la base.

export interface QuizOption {
  code: string;        // identifiant stable, ce qui est stocké en BDD
  label: string;       // texte affiché à l'utilisateur
  score: number;       // points attribués si cette réponse est choisie
}

export interface QuizQuestion {
  id: string;          // q1, q2, ...
  title: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    title: "Quelle est ta situation professionnelle aujourd'hui ?",
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
    title: "Tu as quel âge ?",
    options: [
      { code: "25_35", label: "25 - 35 ans",      score: 10 },
      { code: "36_45", label: "36 - 45 ans",      score: 8 },
      { code: "18_24", label: "18 - 24 ans",      score: 5 },
      { code: "46_plus", label: "46 ans et plus", score: 0 },
    ],
  },
  {
    id: "q3",
    title: "Pourquoi tu veux lancer une activité en ligne ?",
    options: [
      { code: "quitter_emploi",  label: "Je veux quitter mon emploi et devenir indépendant",            score: 10 },
      { code: "subvenir_famille", label: "Je veux subvenir à ma famille sans dépendre d'un patron",     score: 10 },
      { code: "hijra",           label: "Je veux pouvoir m'expatrier et faire ma hijra",                score: 10 },
      { code: "revenu_complementaire", label: "Je veux un revenu complémentaire à côté de mon emploi", score: 7 },
      { code: "halal_aligne",    label: "Je veux construire quelque chose de halal et aligné avec mes valeurs", score: 7 },
      { code: "nomade",          label: "Je veux pouvoir travailler depuis n'importe où",              score: 5 },
    ],
  },
  {
    id: "q4",
    title: "Si tu trouves la bonne méthode, combien es-tu prêt à investir pour y arriver ?",
    options: [
      { code: "plus_3000",   label: "Plus de 3 000 €",                  score: 10 },
      { code: "2000_3000",   label: "Entre 2 000 € et 3 000 €",         score: 8 },
      { code: "1000_2000",   label: "Entre 1 000 € et 2 000 €",         score: 5 },
      { code: "500_1000",    label: "Entre 500 € et 1 000 €",           score: 2 },
      { code: "moins_500",   label: "Moins de 500 €",                   score: 0 },
    ],
  },
  {
    id: "q5",
    title: "Combien de temps par semaine tu peux consacrer à construire ton business ?",
    options: [
      { code: "plus_15h", label: "Plus de 15h par semaine",       score: 10 },
      { code: "7_15h",    label: "Entre 7h et 15h par semaine",   score: 8 },
      { code: "3_7h",     label: "Entre 3h et 7h par semaine",    score: 5 },
      { code: "moins_3h", label: "Moins de 3h par semaine",       score: 1 },
    ],
  },
  {
    id: "q6",
    title: "Est-ce que tu es à l'aise avec les gens ?",
    options: [
      { code: "tres_alaise",      label: "Oui, très à l'aise, j'aime naturellement le contact humain",     score: 10 },
      { code: "plutot_alaise",    label: "Oui, plutôt à l'aise, ça se passe bien en général",              score: 7 },
      { code: "pas_toujours",     label: "Pas toujours, mais je suis prêt à travailler là-dessus",         score: 4 },
      { code: "pas_du_tout",      label: "Non, pas du tout, je ne veux pas être au contact de l'humain",   score: 0 },
    ],
  },
  {
    id: "q7",
    title: "Où en es-tu dans ta réflexion par rapport à ton projet ?",
    options: [
      { code: "pret_action",   label: "Je cherche un accompagnement concret, je suis prêt à passer à l'action", score: 10 },
      { code: "deja_teste",    label: "Très avancé, j'ai déjà testé des choses qui n'ont pas abouti",            score: 8 },
      { code: "informe",       label: "Plutôt avancé, je me suis informé et je cherche la bonne méthode",       score: 5 },
      { code: "curiosite",     label: "Simple curiosité, je regarde ce qui se fait",                             score: 1 },
    ],
  },
];

export type QuizAnswers = Record<string, string>; // { q1: "salarie", q2: "25_35", ... }

export type QuizCategory = "chaud" | "tiede" | "froid" | "hors_cible";

export interface QuizResult {
  score: number;
  category: QuizCategory;
}

/**
 * Calcule le score à partir des réponses brutes. Renvoie aussi la catégorie.
 * Les réponses inconnues / manquantes valent 0 (le quiz est invalide tant que
 * toutes les questions ne sont pas répondues, mais on ne lève pas d'exception
 * ici — c'est l'appelant qui valide la complétude).
 */
export function computeQuizResult(answers: QuizAnswers): QuizResult {
  let score = 0;
  for (const q of QUIZ_QUESTIONS) {
    const answerCode = answers[q.id];
    if (!answerCode) continue;
    const option = q.options.find((o) => o.code === answerCode);
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

export const QUIZ_CATEGORY_META: Record<QuizCategory, { label: string; emoji: string; color: string }> = {
  chaud:      { label: "Lead chaud",      emoji: "🟢", color: "emerald" },
  tiede:      { label: "Lead tiède",      emoji: "🟡", color: "yellow" },
  froid:      { label: "Lead froid",      emoji: "🟠", color: "orange" },
  hors_cible: { label: "Hors cible",      emoji: "🔴", color: "red" },
};
