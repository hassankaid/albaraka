// ─────────────────────────────────────────────────────────────────────────
// Questionnaire clients AL BARAKA — les 29 questions.
//
// Les textes viennent du cahier des charges de Sidali (chapitre 5) et sont
// repris À L'IDENTIQUE : libellés, options, ordre. Le critère de recette n°1
// porte là-dessus, et le n°3 interdit explicitement d'ajouter le moindre
// exemple sous la Q18 — une indication y orienterait les réponses, et cette
// question est celle qui doit révéler les blocages réels.
// ─────────────────────────────────────────────────────────────────────────

export const THEME = {
  bg: "#0A0A0A",
  bgSoft: "#111111",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDim: "rgba(201,160,78,0.18)",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
  danger: "#E08A6A",
};

export const INTRO =
  "Salam ! Ce questionnaire prend environ 5 minutes. Tes réponses sont confidentielles et vont nous permettre de mieux t'accompagner et d'améliorer AL BARAKA pour toute la communauté. Sois le plus honnête possible : il n'y a pas de bonne ou de mauvaise réponse.";

export const CONFIDENTIALITE =
  "Tes réponses ne sont accessibles qu'à l'équipe AL BARAKA. Tu peux demander leur suppression à tout moment en écrivant à ethicarena@outlook.com.";

export const REMERCIEMENT = {
  titre: "Merci du fond du cœur pour ta sincérité.",
  texte: "Chaque retour nous aide à construire un accompagnement toujours plus utile.",
  signature: "Gagne ta liberté. C'est ça la vraie baraka.",
};

export type TypeQuestion = "unique" | "multiple" | "texte" | "texte_long" | "echelle";

export interface Question {
  id: string;
  numero: number;
  titre: string;
  type: TypeQuestion;
  options?: string[];
  /** Bornes de l'échelle. La Q26 (NPS) part de 0, les autres de 1. */
  min?: number;
  max?: number;
  /** Texte d'aide sous la question. Absent = rien, et c'est voulu pour la Q18. */
  aide?: string;
  /** Les réponses libres sont facultatives, sauf la Q18. */
  obligatoire: boolean;
}

export interface Section {
  titre: string;
  questions: Question[];
}

export const SECTIONS: Section[] = [
  {
    titre: "Ton profil",
    questions: [
      { id: "q1", numero: 1, obligatoire: true, type: "unique",
        titre: "Quel âge as-tu ?",
        options: ["Moins de 18 ans", "18-24 ans", "25-34 ans", "35-44 ans", "45 ans et plus"] },
      { id: "q2", numero: 2, obligatoire: true, type: "texte",
        titre: "Dans quel pays vis-tu ?" },
      { id: "q3", numero: 3, obligatoire: true, type: "unique",
        titre: "Quelle est ta situation familiale ?",
        options: ["Célibataire", "En couple", "Marié(e) sans enfant", "Marié(e) avec enfant(s)"] },
      { id: "q4", numero: 4, obligatoire: true, type: "unique",
        titre: "Quel est ton niveau d'études ?",
        options: ["Sans diplôme", "Bac", "Bac+2 / Bac+3", "Bac+5 et plus"] },
    ],
  },
  {
    titre: "Ta situation professionnelle et financière",
    questions: [
      { id: "q5", numero: 5, obligatoire: true, type: "unique",
        titre: "Quelle est ta situation actuelle ?",
        options: ["Salarié en CDI", "Salarié en CDD / intérim", "Indépendant / auto-entrepreneur",
                  "Chef d'entreprise", "Étudiant", "Sans emploi ou au foyer"] },
      { id: "q6", numero: 6, obligatoire: true, type: "texte",
        titre: "Quel est ton domaine d'activité (ou ton dernier métier) ?" },
      { id: "q7", numero: 7, obligatoire: true, type: "unique",
        titre: "Quel est ton revenu mensuel actuel, tous revenus confondus ?",
        options: ["Moins de 1 000 €", "1 000 - 2 000 €", "2 000 - 3 500 €",
                  "3 500 - 5 000 €", "Plus de 5 000 €"] },
      { id: "q8", numero: 8, obligatoire: true, type: "unique",
        titre: "Avais-tu déjà une expérience d'entrepreneuriat ou d'activité en ligne avant AL BARAKA ?",
        options: ["Jamais", "Oui, sans résultat", "Oui, avec quelques résultats", "Oui, avec de bons résultats"] },
      { id: "q9", numero: 9, obligatoire: true, type: "unique",
        titre: "Combien d'heures par semaine peux-tu consacrer à ta formation ?",
        options: ["Moins de 3h", "3 à 5h", "5 à 10h", "10 à 20h", "Plus de 20h"] },
    ],
  },
  {
    titre: "Ton arrivée chez AL BARAKA",
    questions: [
      // Masquée quand la formation est connue par le lien : voir §4.1.
      { id: "q10", numero: 10, obligatoire: true, type: "unique",
        titre: "Quelle formation as-tu rejoint ?",
        options: ["PASS AL-BARAKA", "LIBERTY"] },
      { id: "q11", numero: 11, obligatoire: true, type: "unique",
        titre: "Depuis combien de temps es-tu dans le programme ?",
        options: ["Moins d'1 mois", "1 à 3 mois", "3 à 6 mois", "Plus de 6 mois"] },
      { id: "q12", numero: 12, obligatoire: true, type: "unique",
        titre: "Comment as-tu connu AL BARAKA ?",
        options: ["Instagram", "TikTok", "YouTube", "Publicité Instagram",
                  "Publicité Facebook", "Bouche-à-oreille", "Autre"] },
      { id: "q13", numero: 13, obligatoire: true, type: "unique",
        titre: "Depuis combien de temps me suivais-tu avant de rejoindre ?",
        options: ["Moins d'1 semaine", "1 à 4 semaines", "1 à 6 mois", "Plus de 6 mois"] },
      { id: "q14", numero: 14, obligatoire: true, type: "unique",
        titre: "Quel était ton objectif principal en rejoignant le programme ?",
        options: ["Quitter mon emploi", "Avoir un complément de revenu", "Lancer mon propre business",
                  "Apprendre un métier digital", "Atteindre la liberté financière",
                  "Faire mon expatriation", "Autre"] },
      { id: "q15", numero: 15, obligatoire: false, type: "texte_long",
        titre: "Qu'est-ce qui t'a décidé à passer à l'action et à nous rejoindre ?" },
    ],
  },
  {
    titre: "Ta progression et tes blocages",
    questions: [
      { id: "q16", numero: 16, obligatoire: false, type: "texte_long",
        titre: "Où en es-tu dans ta formation aujourd'hui ?" },
      { id: "q17", numero: 17, obligatoire: true, type: "echelle", min: 1, max: 10,
        titre: "Sur une échelle de 1 à 10, à quel point es-tu satisfait(e) de ta progression ?" },
      // Aucune aide ici, volontairement : critère de recette n°3.
      { id: "q18", numero: 18, obligatoire: true, type: "texte_long",
        titre: "Qu'est-ce qui t'empêche d'avancer plus vite aujourd'hui ?" },
      { id: "q19", numero: 19, obligatoire: true, type: "unique",
        titre: "As-tu déjà pensé à abandonner ?",
        options: ["Jamais", "Une fois", "Plusieurs fois", "Oui, actuellement"] },
      { id: "q20", numero: 20, obligatoire: false, type: "texte_long",
        titre: "Quelle partie de la formation te pose le plus de difficulté ?" },
    ],
  },
  {
    titre: "Tes résultats",
    questions: [
      { id: "q21", numero: 21, obligatoire: true, type: "unique",
        titre: "As-tu terminé ta formation jusqu'à la fin ?",
        options: ["Oui", "Non"] },
      // Affichée uniquement si Q21 = « Oui » : §4.3 et critère n°2.
      { id: "q22", numero: 22, obligatoire: false, type: "texte_long",
        titre: "Quels résultats as-tu obtenus depuis ton arrivée ?",
        aide: "Premiers pas, premiers clients, premiers revenus... même si c'est petit, dis-le nous." },
      { id: "q23", numero: 23, obligatoire: false, type: "texte_long",
        titre: "Quel est ton objectif principal dans les 6 prochains mois ?" },
    ],
  },
  {
    titre: "Ton avis sur l'accompagnement",
    questions: [
      { id: "q24", numero: 24, obligatoire: true, type: "echelle", min: 1, max: 10,
        titre: "Comment évalues-tu la qualité du contenu de la formation ?" },
      { id: "q25", numero: 25, obligatoire: true, type: "echelle", min: 1, max: 10,
        titre: "Comment évalues-tu le suivi et l'accompagnement (coachs, appels, Discord) ?" },
      { id: "q26", numero: 26, obligatoire: true, type: "echelle", min: 0, max: 10,
        titre: "Quelle est la probabilité que tu recommandes AL BARAKA à un proche ?" },
      { id: "q27", numero: 27, obligatoire: true, type: "multiple",
        titre: "Quels formats t'aident le plus à avancer ?",
        options: ["Vidéos de formation", "Lives", "Discord / communauté", "Exercices pratiques",
                  "Rôle-plays", "Études de cas pendant les coachings", "Autre"] },
    ],
  },
  {
    titre: "Tes idées d'amélioration",
    questions: [
      { id: "q28", numero: 28, obligatoire: false, type: "texte_long",
        titre: "Qu'est-ce que tu apprécies le plus dans AL BARAKA ?" },
      { id: "q29", numero: 29, obligatoire: false, type: "texte_long",
        titre: "Qu'est-ce qui manque ou pourrait être amélioré dans l'accompagnement pour t'aider à avancer plus vite ?",
        aide: "Critique, idée, suggestion, message personnel. Sois franc(he), c'est comme ça qu'on progresse." },
    ],
  },
];

export type Reponses = Record<string, string | string[] | undefined>;

/**
 * Les questions réellement affichées, une fois les deux règles appliquées :
 * la Q10 disparaît si le lien connaît déjà la formation, la Q22 n'apparaît
 * que si la Q21 vaut « Oui ».
 */
export function questionsVisibles(
  section: Section,
  reponses: Reponses,
  demanderFormation: boolean,
): Question[] {
  return section.questions.filter((q) => {
    if (q.id === "q10" && !demanderFormation) return false;
    if (q.id === "q22" && reponses.q21 !== "Oui") return false;
    return true;
  });
}

/** Une question obligatoire sans réponse bloque le passage à la suite. */
export function manquantes(
  section: Section,
  reponses: Reponses,
  demanderFormation: boolean,
): Question[] {
  return questionsVisibles(section, reponses, demanderFormation).filter((q) => {
    if (!q.obligatoire) return false;
    const v = reponses[q.id];
    if (Array.isArray(v)) return v.length === 0;
    return v === undefined || String(v).trim() === "";
  });
}
