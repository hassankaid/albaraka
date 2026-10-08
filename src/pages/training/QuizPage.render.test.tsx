/**
 * Quiz au format « une explication par réponse » (parcours setter/closer).
 * Les réponses sont mélangées à chaque passage : ce test clique sur chaque
 * réponse là où elle apparaît, et vérifie que l'explication affichée est la
 * sienne, puis que l'écran de fin donne le score.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mutateAsync = vi.fn(async () => ({}));

const QUESTIONS = [
  {
    id: "q1", quiz_id: "z", question: "Quelle couleur ?", contexte: "Thème · exemple", ordre: 1,
    options: ["Rouge", "Vert", "Bleu", "Jaune"], correct_index: 2,
    explication: "Bonne réponse ! Bleu.",
    explications: ["Mauvaise réponse. Pas rouge.", "Mauvaise réponse. Pas vert.", "Bonne réponse ! Bleu.", "Mauvaise réponse. Pas jaune."],
  },
  {
    id: "q2", quiz_id: "z", question: "Deuxième question ?", contexte: "", ordre: 2,
    options: ["Un", "Deux", "Trois", "Quatre"], correct_index: 0,
    explication: "Bonne réponse ! Un.",
    explications: ["Bonne réponse ! Un.", "Mauvaise réponse. Deux.", "Mauvaise réponse. Trois.", "Mauvaise réponse. Quatre."],
  },
];

let quiz: Record<string, unknown>;

vi.mock("@/hooks/useQuizzes", () => ({
  useQuizWithQuestions: () => ({ data: quiz, isLoading: false }),
  useCreateQuizAttempt: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import QuizPage from "./QuizPage";

function monter() {
  return render(<MemoryRouter><QuizPage /></MemoryRouter>);
}

/** Clique la réponse `texte`, valide, et renvoie l'explication affichée. */
function repondre(texte: string): string {
  fireEvent.click(screen.getByText(texte));
  fireEvent.click(screen.getByText("Valider"));
  return screen.getByTestId("explication-reponse").textContent ?? "";
}

beforeEach(() => {
  quiz = { id: "z", titre: "Quiz de fin de formation — Setting", description: "", max_errors: 1, formation_id: null, chapitre_id: null, questions: QUESTIONS };
  mutateAsync.mockClear();
});
afterEach(cleanup);

describe("explication par réponse", () => {
  it("affiche, pour chaque réponse cliquée, SON explication malgré le mélange", () => {
    QUESTIONS[0].options.forEach((opt, i) => {
      cleanup();
      monter();
      expect(repondre(opt)).toBe(QUESTIONS[0].explications[i]);
    });
  });

  it("affiche le score à la fin et enregistre la tentative", async () => {
    monter();
    repondre("Jaune");
    fireEvent.click(screen.getByText("Question suivante"));
    repondre("Un");
    fireEvent.click(screen.getByText("Voir les résultats"));
    expect((await screen.findByTestId("quiz-score")).textContent).toBe("1/2 bonnes réponses · 50 %");
    expect(screen.getByText("Quiz validé !")).toBeTruthy();
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ errors_count: 1, total_questions: 2, validated: true }));
    expect(screen.getByText("Recommencer")).toBeTruthy();
  });

  it("un quiz au format historique garde son affichage d'avant", async () => {
    quiz = { ...quiz, questions: QUESTIONS.map(({ explications, ...q }) => q) };
    monter();
    fireEvent.click(screen.getByText("Rouge"));
    fireEvent.click(screen.getByText("Valider"));
    expect(screen.queryByTestId("explication-reponse")).toBeNull();
    expect(screen.getByText("💡 Explication")).toBeTruthy();
    fireEvent.click(screen.getByText("Question suivante"));
    fireEvent.click(screen.getByText("Un"));
    fireEvent.click(screen.getByText("Valider"));
    fireEvent.click(screen.getByText("Voir les résultats"));
    expect(await screen.findByText("1 erreur sur 2 questions")).toBeTruthy();
    expect(screen.queryByTestId("quiz-score")).toBeNull();
  });
});
