// COPIE de src/lib/leadScoring.ts pour Deno (Edge function).
// Si tu modifies l'un, n'oublie pas l'autre — sinon le score affiché côté
// client peut différer du score stocké côté serveur.

export interface QuizOption {
  code: string;
  label: string;
  score: number;
  flag?: string;
}

export interface QuizQuestion {
  id: string;
  title: string;
  prompt: string;
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

export function categoryFromScore(score: number): Category {
  if (score >= 56) return "chaud";
  if (score >= 39) return "tiede";
  if (score >= 21) return "froid";
  return "hors_cible";
}

export interface ScoringResult {
  score: number;
  category: Category;
  flags: string[];
}

export function computeScoring(answers: Record<string, string>): ScoringResult {
  let total = 0;
  const flags: string[] = [];

  for (const q of QUIZ_QUESTIONS) {
    const code = answers[q.id];
    if (!code) throw new Error(`Réponse manquante pour ${q.id} (${q.title})`);
    const option = q.options.find((o) => o.code === code);
    if (!option) throw new Error(`Option inconnue "${code}" pour ${q.id} (${q.title})`);
    total += option.score;
    if (option.flag) flags.push(option.flag);
  }

  return {
    score: total,
    category: categoryFromScore(total),
    flags,
  };
}
