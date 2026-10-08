/**
 * Explication par réponse et score des quiz (08/10/2026, parcours setter/closer).
 *
 * Historique : une question porte UNE explication (`explication`), la même
 * quelle que soit la réponse cliquée. Les quiz de fin du parcours setter/closer
 * en demandent une PAR RÉPONSE, affichée telle qu'écrite (« Bonne réponse ! … »
 * ou « Mauvaise réponse. … »). Elles vivent dans `explications`, un tableau
 * aligné sur `options` : explications[i] commente options[i].
 *
 * Une question sans `explications` garde exactement l'affichage d'avant.
 */

export interface QuestionAvecExplications {
  options: string[];
  explication?: string | null;
  explications?: (string | null)[] | null;
}

/** Vrai si la question commente chacune de ses réponses. */
export function aExplicationsParReponse(q: QuestionAvecExplications): boolean {
  return Array.isArray(q.explications)
    && q.explications.length === q.options.length
    && q.explications.some((e) => !!e?.trim());
}

/**
 * Texte à afficher une fois la réponse validée. `choisie` est l'index RÉEL de
 * l'option (avant mélange), jamais sa position à l'écran.
 */
export function explicationAffichee(
  q: QuestionAvecExplications,
  choisie: number,
): { texte: string; parReponse: boolean } | null {
  if (aExplicationsParReponse(q)) {
    const propre = q.explications![choisie]?.trim();
    if (propre) return { texte: propre, parReponse: true };
  }
  const generale = q.explication?.trim();
  return generale ? { texte: generale, parReponse: false } : null;
}

/** Vrai si au moins une question du quiz commente chacune de ses réponses. */
export function quizAuNouveauFormat(questions: QuestionAvecExplications[]): boolean {
  return questions.some(aExplicationsParReponse);
}

/** Score d'une tentative, et le minimum de bonnes réponses pour valider. */
export function scoreQuiz(total: number, erreurs: number, maxErreurs: number) {
  const bonnes = Math.max(0, total - erreurs);
  return {
    bonnes,
    total,
    pourcentage: total === 0 ? 0 : Math.round((bonnes / total) * 100),
    minimum: Math.max(0, total - maxErreurs),
    valide: erreurs <= maxErreurs,
  };
}

/**
 * Prépare une question saisie dans l'admin : retire les options vides SANS
 * décaler les explications ni la bonne réponse. `explications` vaut null si
 * aucune n'est renseignée (la question reste au format historique).
 */
export function nettoyerQuestion(
  options: string[],
  explications: string[],
  correctIndex: number,
): { options: string[]; explications: string[] | null; correct_index: number } | { erreur: string } {
  const gardees = options
    .map((texte, i) => ({ texte: texte.trim(), explication: (explications[i] ?? "").trim(), i }))
    .filter((o) => o.texte);
  if (gardees.length < 2) return { erreur: "Au moins 2 options requises." };
  const correct = gardees.findIndex((o) => o.i === correctIndex);
  if (correct === -1) return { erreur: "L'option correcte doit exister." };
  const avecExplication = gardees.some((o) => o.explication);
  return {
    options: gardees.map((o) => o.texte),
    explications: avecExplication ? gardees.map((o) => o.explication) : null,
    correct_index: correct,
  };
}
