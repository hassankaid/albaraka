// L'écran du coach au format de Sabrina (référentiel v0.6, 24/11/2026) : la note reste visible
// pour le coach, le retour de l'élève se corrige bloc par bloc.
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ValidationAppel } from "./ValidationAppel";
import type { Analyse } from "@/lib/appels/retour";

vi.mock("@/hooks/useAppels", () => ({ enregistrerCorrections: vi.fn(() => Promise.resolve()), validerAppel: vi.fn(() => Promise.resolve()) }));

const ia: Analyse = {
  erreurs_critiques: [],
  etapes: [{ code: "P1", nom: "Connexion", poids: 100, note: 7, justification: "Bonne ouverture." }],
  regles: [],
  objections: [],
  analyse_globale: "",
  points_forts: [],
  axes: [],
  conseil_prioritaire: { texte: "" },
  encouragement: "",
  note_etapes: 70,
  penalite: 0,
  note_globale: 70,
  prospect_absent: true,
  retour: {
    verdict: "Globalement, ton appel est plutôt pas mal 👏",
    point_principal: null,
    reussites: [{ texte: "Le groupe WhatsApp est vérifié." }],
    points: [{ titre: "Le replay", constat: "Tu as parlé du lundi.", formulation: "« Le replay est disponible le dimanche après-midi. »", moins_grave: false }],
    priorites: ["Le replay.", "Le conjoint.", "Une question à la fin."],
  },
};

describe("écran du coach, format coach", () => {
  it("affiche la note pour le coach et le retour de l'élève en blocs", () => {
    render(<ValidationAppel appelId="x" ia={ia} initial={null} exempleInitial={false} prenomEleve="Yanis" onEcouter={() => {}} onValide={() => {}} />);
    expect(screen.getByTestId("note-globale").textContent).toBe("70");
    expect(screen.getByText(/l'élève ne la voit pas/)).toBeTruthy();
    expect(screen.getByText("Globalement, ton appel est plutôt pas mal 👏")).toBeTruthy();
    expect(screen.getByText(/Prospect absent à la conférence/)).toBeTruthy();
    const bloc = screen.getByTestId("retour-coach");
    expect(within(bloc).getByText("Le groupe WhatsApp est vérifié.")).toBeTruthy();
    expect(within(bloc).getByText("Le replay")).toBeTruthy();
    expect(within(bloc).getByText("« Le replay est disponible le dimanche après-midi. »")).toBeTruthy();
    expect(within(bloc).getByText("Une question à la fin.")).toBeTruthy();
    expect(screen.queryByText("Axes d'amélioration")).toBeNull();
    expect(screen.getByText("La fiche pour le closer")).toBeTruthy();
  });
});
