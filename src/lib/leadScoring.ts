// Lead Scoring — définition des questions + barème de scoring
// =====================================================================
// IMPORTANT : ce fichier est la SOURCE DE VÉRITÉ pour le quiz scoring.
// Il est partagé entre :
//   - le frontend (page /scoring/quiz qui rend le quiz)
//   - l'edge function submit-scoring-quiz (qui calcule le score serveur-side)
// Les 2 doivent être alignés. Si tu modifies les options ou les scores ici,
// fais aussi la copie dans `supabase/functions/submit-scoring-quiz/scoring.ts`
// (Deno ne peut pas importer depuis src/).
//
// Score max possible : 70 points (7 questions × 10).
// =====================================================================

export interface QuizOption {
  code: string;       // identifiant stable (utilisé dans answers jsonb)
  label: string;      // texte affiché au lead
  score: number;      // points attribués si choisi
  flag?: string;      // optionnel : flag à pousser dans le tableau flags (alerte setter)
}

export interface QuizQuestion {
  id: string;         // q1, q2, q3...
  title: string;      // énoncé court (utilisé dans le récap admin)
  prompt: string;     // énoncé complet présenté au lead
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    title: "Situation pro",
    prompt: "Quelle est ta situation professionnelle aujourd'hui ?",
    options: [
      { code: "salarie",        label: "Salarié en CDI ou CDD",                          score: 10 },
      { code: "etudiant",       label: "Étudiant",                                        score: 5 },
      { code: "reconversion",   label: "En reconversion / Entre deux emplois",            score: 8 },
      { code: "independant",    label: "Indépendant / Freelance",                         score: 4 },
      { code: "sans_activite",  label: "Sans activité professionnelle actuellement",      score: 2 },
    ],
  },
  {
    id: "q2",
    title: "Âge",
    prompt: "Tu as quel âge ?",
    options: [
      { code: "18_24", label: "18 - 24 ans",       score: 5 },
      { code: "25_35", label: "25 - 35 ans",       score: 10 },
      { code: "36_45", label: "36 - 45 ans",       score: 8 },
      { code: "46_plus", label: "46 ans et plus",  score: 0, flag: "age_hors_cible" },
    ],
  },
  {
    id: "q3",
    title: "Motivation",
    prompt: "Pourquoi tu veux lancer une activité en ligne ?",
    options: [
      { code: "revenu_complement",   label: "Je veux un revenu complémentaire à côté de mon emploi",        score: 7 },
      { code: "quitter_emploi",      label: "Je veux quitter mon emploi et devenir indépendant",            score: 10 },
      { code: "nomade",              label: "Je veux pouvoir travailler depuis n'importe où",               score: 5 },
      { code: "halal_aligne",        label: "Je veux construire quelque chose de halal et aligné avec mes valeurs", score: 7 },
      { code: "subvenir_famille",    label: "Je veux subvenir à ma famille sans dépendre d'un patron",      score: 10 },
      { code: "hijra",               label: "Je veux pouvoir m'expatrier et faire ma hijra dans un pays musulman", score: 10 },
    ],
  },
  {
    id: "q4",
    title: "Budget",
    prompt: "Si tu trouves la bonne méthode pour changer ta situation, combien es-tu prêt à investir pour y arriver ?",
    options: [
      { code: "moins_500",  label: "Moins de 500€",       score: 0, flag: "investissement_faible" },
      { code: "500_1000",   label: "Entre 500 et 1 000€", score: 2 },
      { code: "1000_2000",  label: "Entre 1 000€ et 2 000€", score: 5 },
      { code: "2000_3000",  label: "Entre 2 000€ et 3 000€", score: 8 },
      { code: "plus_3000",  label: "Plus de 3 000€",      score: 10 },
    ],
  },
  {
    id: "q5",
    title: "Temps dispo",
    prompt: "Combien de temps par semaine tu peux consacrer à construire ton business ?",
    options: [
      { code: "moins_3h",  label: "Moins de 3h par semaine",      score: 1 },
      { code: "3_7h",      label: "Entre 3h et 7h par semaine",   score: 5 },
      { code: "7_15h",     label: "Entre 7h et 15h par semaine",  score: 8 },
      { code: "plus_15h",  label: "Plus de 15h par semaine",      score: 10 },
    ],
  },
  {
    id: "q6",
    title: "Aisance relationnelle",
    prompt: "Est-ce que tu es à l'aise avec les gens ?",
    options: [
      { code: "tres_alaise",   label: "Oui, très à l'aise, j'aime naturellement le contact humain",  score: 10 },
      { code: "plutot_alaise", label: "Oui, plutôt à l'aise, ça se passe bien en général",          score: 7 },
      { code: "pas_toujours",  label: "Pas toujours, mais je suis prêt à travailler là-dessus",     score: 4 },
      { code: "pas_du_tout",   label: "Non, pas du tout, je ne veux pas être au contact de l'humain", score: 0, flag: "desalignement_humain" },
    ],
  },
  {
    id: "q7",
    title: "Avancement projet",
    prompt: "Où en es-tu dans ta réflexion par rapport à ton projet ?",
    options: [
      { code: "curiosite",        label: "Simple curiosité, je regarde ce qui se fait",                   score: 1 },
      { code: "informe",          label: "Plutôt avancé, je me suis informé et je cherche la bonne méthode", score: 5 },
      { code: "deja_teste",       label: "Très avancé, j'ai déjà testé des choses qui n'ont pas abouti",     score: 8 },
      { code: "pret_action",      label: "Je cherche un accompagnement concret, je suis prêt à passer à l'action", score: 10, flag: "appel_prioritaire" },
    ],
  },
];

export type Category = "chaud" | "tiede" | "froid" | "hors_cible";

export interface ScoringResult {
  score: number;
  category: Category;
  flags: string[];
  per_question: Array<{ question_id: string; option_code: string; option_label: string; points: number }>;
}

// Calcul de la catégorie à partir du score (sur 70).
// Seuils définis par le user dans le brief :
//   56-70 → chaud, 39-55 → tiede, 21-38 → froid, 0-20 → hors_cible
export function categoryFromScore(score: number): Category {
  if (score >= 56) return "chaud";
  if (score >= 39) return "tiede";
  if (score >= 21) return "froid";
  return "hors_cible";
}

export const CATEGORY_LABELS: Record<Category, string> = {
  chaud:       "Lead chaud",
  tiede:       "Lead tiède",
  froid:       "Lead froid",
  hors_cible:  "Hors cible",
};

export const CATEGORY_DETAILS: Record<Category, string> = {
  chaud:       "Avatar parfait — appel prioritaire absolu",
  tiede:       "Potentiel à confirmer — à éduquer en setting",
  froid:       "Hors cible partielle — à requalifier",
  hors_cible:  "Hors cible — à informer le setter",
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  chaud:       "🟢",
  tiede:       "🟡",
  froid:       "🟠",
  hors_cible:  "🔴",
};

export const CATEGORY_BADGES: Record<Category, string> = {
  chaud:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  tiede:      "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  froid:      "bg-orange-500/20 text-orange-300 border-orange-500/40",
  hors_cible: "bg-red-500/20 text-red-300 border-red-500/40",
};

export const FLAG_LABELS: Record<string, string> = {
  age_hors_cible:           "⚠️ Âge hors cible (46+)",
  investissement_faible:    "⚠️ Investissement faible (<500€)",
  desalignement_humain:     "⚠️ Refuse contact humain",
  appel_prioritaire:        "🚨 Prêt à passer à l'action",
};

// Calcule le score à partir des réponses { q1: "code", q2: "code", ... }.
// Renvoie aussi les flags (alertes setter) et le détail par question.
// Validation : refuse si une réponse manque ou si un code est inconnu.
export function computeScoring(answers: Record<string, string>): ScoringResult {
  let total = 0;
  const flags: string[] = [];
  const perQuestion: ScoringResult["per_question"] = [];

  for (const q of QUIZ_QUESTIONS) {
    const code = answers[q.id];
    if (!code) {
      throw new Error(`Réponse manquante pour ${q.id} (${q.title})`);
    }
    const option = q.options.find((o) => o.code === code);
    if (!option) {
      throw new Error(`Option inconnue "${code}" pour ${q.id} (${q.title})`);
    }
    total += option.score;
    if (option.flag) flags.push(option.flag);
    perQuestion.push({
      question_id: q.id,
      option_code: option.code,
      option_label: option.label,
      points: option.score,
    });
  }

  return {
    score: total,
    category: categoryFromScore(total),
    flags,
    per_question: perQuestion,
  };
}
