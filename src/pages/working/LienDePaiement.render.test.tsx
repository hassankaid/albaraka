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

const offre = {
  id: "1", slug: "al-baraka", category: "al_baraka", label: "PASS AL BARAKA",
  default_price_ht: 3000, min_installments_count: 1, max_installments_count: 8,
  formation_id: null, status: "active", created_at: "", updated_at: "",
};

function monter({ pass, debloque, role = "apporteur" }: { pass: boolean; debloque: boolean; role?: string }) {
  vi.doMock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { role }, user: { id: "u1" } }) }));
  vi.doMock("@/hooks/useOffers", () => ({ useOffers: () => ({ data: [offre], isLoading: false }) }));
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
