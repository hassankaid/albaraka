/**
 * La double condition d'accès aux liens de paiement.
 *
 * La page n'est visible qu'avec une session d'élève : je ne peux pas l'ouvrir
 * dans un navigateur. Sans ces tests, son premier affichage réel serait aussi
 * son premier essai.
 *
 * Deux erreurs sont possibles ici, et aucune ne se voit :
 *
 *  • trop fermé — un élève qui a terminé Setting reste bloqué, et personne ne
 *    le signale parce qu'il croit que c'est normal ;
 *  • trop ouvert — le déblocage dans user_feature_unlocks est DÉFINITIF alors
 *    qu'un pass se révoque. Sans la vérification du pass, un ancien membre
 *    garderait la main sur les liens de paiement à vie.
 *
 * Le troisième test verrouille l'absence du mode test : un lien `?test=1`
 * n'encaisse rien, et l'élève comme le client s'en apercevraient trop tard.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

const base = {
  min_installments_count: 1, formation_id: null, status: "active",
  created_at: "", updated_at: "",
};

// Volontairement dans le DESORDRE : c'est la page qui doit les remettre
// dans l'ordre, pas la base de donnees.
const offres = [
  { ...base, id: "9", slug: "closing", category: "a_la_carte", label: "Closing",
    default_price_ht: 500, max_installments_count: 3 },
  { ...base, id: "3", slug: "liberty", category: "liberty", label: "LIBERTY",
    default_price_ht: 5000, max_installments_count: 10 },
  { ...base, id: "1", slug: "al-baraka", category: "al_baraka", label: "PASS AL BARAKA",
    default_price_ht: 3000, max_installments_count: 8 },
  { ...base, id: "2", slug: "al-baraka-200", category: "al_baraka_200", label: "AL BARAKA 200",
    default_price_ht: 2400, max_installments_count: 12 },
];

function monter({ pass, debloque, role = "apporteur", sansALaCarte = false }:
  { pass: boolean; debloque: boolean; role?: string; sansALaCarte?: boolean }) {
  const jeu = sansALaCarte ? offres.filter((o) => o.category !== "a_la_carte") : offres;
  vi.doMock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { role }, user: { id: "u1" } }) }));
  vi.doMock("@/hooks/useOffers", () => ({ useOffers: () => ({ data: jeu, isLoading: false }) }));
  vi.doMock("@/hooks/useUserPass", () => ({ useUserPass: () => ({ hasAnyPass: pass, isLoading: false }) }));
  vi.doMock("@/hooks/useFeatureUnlock", () => ({
    useFeatureUnlocks: () => ({ isLoading: false, has: (k: string) => debloque && k === "payment_links" }),
  }));
  vi.doMock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }));
  return import("./LienDePaiement");
}

afterEach(() => { cleanup(); vi.resetModules(); vi.restoreAllMocks(); });

describe("l'accès à la page", () => {
  it("refuse sans pass, même si Setting est terminée", async () => {
    const { default: Page } = await monter({ pass: false, debloque: true });
    render(<Page />);
    expect(screen.getByText(/Réservé aux membres/i)).toBeInTheDocument();
    expect(screen.queryByText("PASS AL BARAKA")).not.toBeInTheDocument();
  });

  it("refuse avec un pass mais sans avoir terminé Setting", async () => {
    const { default: Page } = await monter({ pass: true, debloque: false });
    render(<Page />);
    expect(screen.getByText(/Termine la formation Setting/i)).toBeInTheDocument();
  });

  it("ouvre quand les DEUX conditions sont réunies", async () => {
    const { default: Page } = await monter({ pass: true, debloque: true });
    render(<Page />);
    expect(screen.getByText("PASS AL BARAKA")).toBeInTheDocument();
  });

  it("laisse passer le CEO, qui n'a ni pass ni déblocage", async () => {
    const { default: Page } = await monter({ pass: false, debloque: false, role: "ceo" });
    render(<Page />);
    expect(screen.getByText("PASS AL BARAKA")).toBeInTheDocument();
  });
});

describe("les liens produits", () => {
  it("ne contiennent JAMAIS le mode test", async () => {
    const { default: Page } = await monter({ pass: true, debloque: true });
    const { container } = render(<Page />);
    expect(container.textContent).not.toMatch(/test=1/);
  });

  it("portent le nombre de mensualités choisi", async () => {
    const { default: Page } = await monter({ pass: true, debloque: true });
    const { container } = render(<Page />);
    // Par défaut le maximum de l'offre, soit 8 mensualités.
    expect(container.textContent).toMatch(/\/checkout\/8/);
  });
});

describe("l'ordre d'affichage", () => {
  it("place les pass avant les formations à la carte", async () => {
    // Demande de Hassan le 28/09 : un mur de douze cartes en vrac noyait les
    // trois offres qui comptent, à 3 000 / 2 400 / 5 000 € contre 500 €.
    const { default: Page } = await monter({ pass: true, debloque: true });
    const { container } = render(<Page />);
    const titres = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(titres).toEqual([
      "Pass AL BARAKA",
      "Al Baraka 200 €/mois",
      "Liberty",
      "Formations à la carte",
    ]);
  });

  it("n'affiche pas une section vide", async () => {
    const { default: Page } = await monter({ pass: true, debloque: true, sansALaCarte: true });
    const { container } = render(<Page />);
    const titres = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(titres).not.toContain("Formations à la carte");
  });
});
