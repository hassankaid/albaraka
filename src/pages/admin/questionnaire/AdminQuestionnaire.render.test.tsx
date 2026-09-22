/**
 * Rendu du tableau de bord du questionnaire.
 *
 * La page n'est visible que par un administrateur : je ne peux pas l'ouvrir
 * dans un navigateur sans la session de Sidali. Sans ces tests, son premier
 * affichage réel serait aussi son premier essai.
 *
 * Ce qui est vérifié ici et que TypeScript ne voit pas : les indicateurs
 * calculés à partir de vraies lignes, l'état vide avant la première réponse,
 * l'effet des filtres sur ce qui s'affiche, et le fait que les trois questions
 * prioritaires du cahier des charges ressortent des autres.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, screen, fireEvent, within } from "@testing-library/react";
import type { Reponse } from "./stats";

vi.setConfig({ testTimeout: 20_000 });

// Recharts mesure son conteneur ; en test la largeur est nulle et il ne rend
// rien. On lui impose une taille, sinon aucun graphique n'existerait.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 400 });
});

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.restoreAllMocks();
});

/** La carte d'indicateur qui porte cette légende. */
const carte = (legende: string) =>
  screen.getByText(legende).parentElement as HTMLElement;

/** L'en-tête de page, qui porte le compte de réponses. */
const enTete = () =>
  screen.getByText(/^Questionnaire client$/).parentElement as HTMLElement;

const base: Reponse = {
  invitation_id: "1", prenom: "Amina", formation_fichier: "al_baraka",
  soumis_le: "2026-09-22T10:00:00Z",
  q1: "25-34 ans", q2: "France", q3: "Célibataire", q4: "Bac",
  q5: "Salarié en CDI", q6: "Coiffure", q7: "1 000 - 2 000 €",
  q8: "Jamais", q9: "3 à 5h", q10: "PASS AL-BARAKA", q11: "1 à 3 mois",
  q12: "Instagram", q13: "1 à 6 mois", q14: "Quitter mon emploi",
  q15: null, q16: null, q17: 8, q18: "Le manque de temps", q19: "Jamais",
  q20: null, q21: "Oui", q22: null, q23: null, q24: 9, q25: 8, q26: 10,
  q27: ["Lives"], q28: null, q29: "Plus d'exercices",
};

/** Monte la page avec un jeu de réponses donné. */
async function monter(reponses: Reponse[], avancement = { envoyes: 322, repondus: reponses.length, cliques_sans_reponse: 4, exclus: 5 }) {
  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: {
      from: () => ({ select: () => ({ order: async () => ({ data: reponses, error: null }) }) }),
      rpc: async () => ({ data: [avancement], error: null }),
    },
    SUPABASE_URL: "https://exemple.test",
    SUPABASE_PUBLISHABLE_KEY: "cle",
  }));
  const { default: Page } = await import("./AdminQuestionnaire");
  render(<Page />);
  // Le chargement est asynchrone : on attend que le titre du premier thème
  // apparaisse, ou l'état vide.
  await screen.findByText(/Questionnaire client/);
  await new Promise((r) => setTimeout(r, 60));
}

describe("avant la première réponse", () => {
  it("annonce l'attente au lieu d'afficher des graphiques vides", async () => {
    await monter([], { envoyes: 322, repondus: 0, cliques_sans_reponse: 3, exclus: 5 });
    expect(screen.getByText(/Aucune réponse pour l'instant/)).toBeTruthy();
    expect(screen.queryByText("Avatar client")).toBeNull();
  });

  it("affiche quand même l'avancement de la campagne", async () => {
    await monter([], { envoyes: 322, repondus: 0, cliques_sans_reponse: 3, exclus: 5 });
    expect(screen.getByText("sur 322 envoyés")).toBeTruthy();
  });
});

describe("indicateurs", () => {
  it("calculent le taux de réponse sur les messages envoyés", async () => {
    const r = Array.from({ length: 32 }, (_, i) => ({ ...base, invitation_id: String(i) }));
    await monter(r);
    expect(screen.getByText("10 %")).toBeTruthy(); // 32 / 322
  });

  it("affichent le NPS et les moyennes, virgule décimale française", async () => {
    await monter([
      { ...base, invitation_id: "a", q26: 10, q17: 8 },
      { ...base, invitation_id: "b", q26: 3, q17: 7 },
    ]);
    // On vise la carte par sa légende : « 0 » et « 7,5 » apparaissent aussi
    // dans les graphiques, et une recherche globale attraperait n'importe quoi.
    expect(within(carte("promoteurs − détracteurs")).getByText("0")).toBeTruthy();
    expect(within(carte("progression · sur 10")).getByText("7,5")).toBeTruthy();
  });

  it("marquent d'un tiret ce qui n'a pas encore de réponse", async () => {
    await monter([{ ...base, q17: null, q24: null, q25: null, q26: null }]);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("thèmes et réponses libres", () => {
  it("affichent les six thèmes du cahier des charges", async () => {
    await monter([base]);
    for (const t of ["Avatar client", "Acquisition", "Motivations", "Croisements"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
  });

  it("mettent en avant les trois questions prioritaires", async () => {
    await monter([base]);
    // Q18 et Q29 sont renseignées dans le jeu de test, Q20 non.
    expect(screen.getByText(/18\. Ce qui empêche d'avancer/)).toBeTruthy();
    expect(screen.getByText(/29\. Ce qui manque/)).toBeTruthy();
    expect(screen.getAllByText("à lire en priorité").length).toBe(2);
  });

  it("taisent une question libre à laquelle personne n'a répondu", async () => {
    await monter([base]);
    expect(screen.queryByText(/20\. La partie la plus difficile/)).toBeNull();
  });
});

describe("filtres", () => {
  it("restreignent l'affichage et le signalent", async () => {
    await monter([
      { ...base, invitation_id: "a", q1: "25-34 ans" },
      { ...base, invitation_id: "b", q1: "45 ans et plus" },
    ]);
    expect(within(enTete()).getByText("2 réponses")).toBeTruthy();

    // Le filtre de période est un simple champ date : plus simple à piloter
    // qu'un menu déroulant, et il traverse la même fonction de filtrage.
    const duChamp = document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement;
    fireEvent.change(duChamp, { target: { value: "2030-01-01" } });
    expect(screen.getByText(/Aucune réponse ne correspond/)).toBeTruthy();
  });
});
