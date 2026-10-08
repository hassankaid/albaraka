import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aExplicationsParReponse,
  explicationAffichee,
  nettoyerQuestion,
  quizAuNouveauFormat,
  scoreQuiz,
} from "./quizExplications";

const nouvelle = {
  options: ["Rouge", "Vert", "Bleu", "Jaune"],
  explication: "Bleu, voir le cours.",
  explications: [
    "Mauvaise réponse. Pas rouge.",
    "Mauvaise réponse. Pas vert.",
    "Bonne réponse ! Bleu.",
    "Mauvaise réponse. Pas jaune.",
  ],
};
const ancienne = { options: ["Oui", "Non", "Peut-être"], explication: "Parce que." };

describe("explication affichée après validation", () => {
  it("donne l'explication de LA réponse choisie (index réel, pas la position à l'écran)", () => {
    expect(explicationAffichee(nouvelle, 2)).toEqual({ texte: nouvelle.explications[2], parReponse: true });
    expect(explicationAffichee(nouvelle, 0)?.texte).toBe(nouvelle.explications[0]);
    expect(explicationAffichee(nouvelle, 3)?.texte).toBe(nouvelle.explications[3]);
  });

  it("garde l'explication unique pour les questions au format historique", () => {
    expect(aExplicationsParReponse(ancienne)).toBe(false);
    expect(explicationAffichee(ancienne, 1)).toEqual({ texte: "Parce que.", parReponse: false });
    expect(explicationAffichee({ options: ["a", "b"], explication: "" }, 0)).toBeNull();
  });

  it("retombe sur l'explication générale si la réponse choisie n'a pas la sienne", () => {
    const partielle = { ...nouvelle, explications: [nouvelle.explications[0], "", "", ""] };
    expect(explicationAffichee(partielle, 1)).toEqual({ texte: "Bleu, voir le cours.", parReponse: false });
  });

  it("ignore des explications mal alignées plutôt que d'afficher celle d'une autre réponse", () => {
    const decalee = { ...nouvelle, explications: nouvelle.explications.slice(0, 3) };
    expect(aExplicationsParReponse(decalee)).toBe(false);
    expect(explicationAffichee(decalee, 2)?.parReponse).toBe(false);
  });

  it("repère un quiz au nouveau format", () => {
    expect(quizAuNouveauFormat([ancienne, nouvelle])).toBe(true);
    expect(quizAuNouveauFormat([ancienne])).toBe(false);
  });
});

describe("score", () => {
  it("Setting : 18 questions, 3 erreurs max = 15 bonnes réponses minimum (80 %)", () => {
    expect(scoreQuiz(18, 3, 3)).toEqual({ bonnes: 15, total: 18, pourcentage: 83, minimum: 15, valide: true });
    expect(scoreQuiz(18, 4, 3)).toMatchObject({ bonnes: 14, pourcentage: 78, valide: false });
  });

  it("Closing : 20 questions, 4 erreurs max = 16 bonnes réponses minimum (80 %)", () => {
    expect(scoreQuiz(20, 4, 4)).toMatchObject({ bonnes: 16, pourcentage: 80, minimum: 16, valide: true });
    expect(scoreQuiz(20, 5, 4)).toMatchObject({ bonnes: 15, valide: false });
  });
});

describe("saisie admin", () => {
  it("retire les options vides sans décaler explications ni bonne réponse", () => {
    const r = nettoyerQuestion(["A", " ", "C", "D"], ["ea", "", "ec", "ed"], 2);
    expect(r).toEqual({ options: ["A", "C", "D"], explications: ["ea", "ec", "ed"], correct_index: 1 });
  });

  it("sans aucune explication par réponse, reste au format historique", () => {
    expect(nettoyerQuestion(["A", "B"], ["", " "], 0)).toEqual({ options: ["A", "B"], explications: null, correct_index: 0 });
  });

  it("refuse une bonne réponse vide ou moins de deux options", () => {
    expect(nettoyerQuestion(["A", "", "C"], [], 1)).toEqual({ erreur: "L'option correcte doit exister." });
    expect(nettoyerQuestion(["A", ""], [], 0)).toEqual({ erreur: "Au moins 2 options requises." });
  });
});

describe("branchements", () => {
  it("la page du quiz utilise l'explication de la réponse choisie et affiche le score", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/training/QuizPage.tsx"), "utf-8");
    expect(page).toContain("explicationAffichee(currentQuestion, selectedOption)");
    expect(page).toContain("scoreQuiz(questions.length, finalErrors, maxErrors)");
  });

  it("la base garde les explications alignées sur les réponses", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20261008120000_quiz_explications_par_reponse.sql"), "utf-8");
    expect(sql).toContain("jsonb_array_length(explications) = jsonb_array_length(options)");
  });
});
