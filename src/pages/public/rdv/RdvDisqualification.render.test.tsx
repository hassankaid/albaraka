/**
 * Funnel /rdv : « Être rappelé(e) » au lieu d'un refus (22/11/2026).
 *
 * Ce qui doit tenir :
 *  • question 2 (« pas encore décidé(e) ») et question 5 (budget) mènent à une
 *    page « Parlons-en », plus à « Réservation impossible » ;
 *  • « Être rappelé(e) » envoie l'action « rappel » avec la bonne question, puis
 *    confirme à la personne ;
 *  • aucun prix ni modalité de paiement sur les pages « Parlons-en » ; la question 5
 *    propose en plus « Je réserve mon appel » qui mène à Calendly ;
 *  • les autres refus (1, 3, 4) restent des refus, sans l'encadré « Pour rappel ».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    rpc: vi.fn(async () => ({ data: [], error: null })),
  },
}));

import RdvDisqualification from "./RdvDisqualification";
import { RDV_LEAD_ID_KEY } from "./rdvShared";

vi.setConfig({ testTimeout: 20_000 });

function Ici() {
  const l = useLocation();
  return <div data-testid="ici">{l.pathname + l.search}</div>;
}

function monter(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/rdv/disqualification/${slug}`]}>
      <Routes>
        <Route path="/rdv/disqualification/:slug" element={<RdvDisqualification />} />
        <Route path="*" element={<Ici />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(RDV_LEAD_ID_KEY, "11111111-2222-3333-4444-555555555555");
  invoke.mockReset();
  invoke.mockResolvedValue({ data: { ok: true }, error: null });
});

afterEach(() => cleanup());

describe("question 2 : pas encore décidé(e)", () => {
  it("propose d'être rappelé(e), sans refus ni prix", () => {
    monter("b");
    expect(screen.getByText("Parlons-en")).toBeTruthy();
    expect(screen.getByText("Pas encore décidé(e) ?")).toBeTruthy();
    expect(screen.queryByText("Réservation impossible")).toBeNull();
    expect(screen.queryByText(/250 €/)).toBeNull();
    expect(screen.queryByText(/réserve mon appel/)).toBeNull();
    expect(screen.queryByText("Pour rappel")).toBeNull();
  });

  it("envoie la demande de rappel et confirme", async () => {
    monter("b");
    fireEvent.click(screen.getByText("Être rappelé(e) par l'équipe"));
    await screen.findByText("C'est noté !");
    expect(invoke).toHaveBeenCalledWith("rdv-funnel-submit", {
      body: { action: "rappel", lead_id: "11111111-2222-3333-4444-555555555555", question_index: 2 },
    });
    expect(screen.queryByText("Être rappelé(e) par l'équipe")).toBeNull();
  });

  it("affiche une erreur si l'envoi échoue", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("réseau") });
    monter("b");
    fireEvent.click(screen.getByText("Être rappelé(e) par l'équipe"));
    await screen.findByText("Une erreur est survenue. Merci de réessayer.");
  });
});

describe("question 5 : budget", () => {
  it("propose les deux choix, sans aucun prix ni modalité de paiement", () => {
    monter("e");
    expect(screen.getByText("Le budget vous freine ?")).toBeTruthy();
    expect(screen.getByText("Je réserve mon appel")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/€|plusieurs fois|par mois|paiement/i);
    expect(screen.getByText("Être rappelé(e) par l'équipe")).toBeTruthy();
    expect(screen.queryByText("Pas de budget")).toBeNull();
  });

  it("« je réserve » enregistre Oui à la question 5, qualifie et ouvre Calendly", async () => {
    monter("e");
    fireEvent.click(screen.getByText("Je réserve mon appel"));
    await waitFor(() => expect(screen.getByTestId("ici").textContent).toBe("/rdv/calendly"));
    expect(invoke).toHaveBeenNthCalledWith(1, "rdv-funnel-submit", {
      body: { action: "answer", lead_id: "11111111-2222-3333-4444-555555555555", question_index: 5, answer: "yes" },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "rdv-funnel-submit", {
      body: { action: "qualified", lead_id: "11111111-2222-3333-4444-555555555555" },
    });
  });

  it("le rappel part avec la question 5", async () => {
    monter("e");
    fireEvent.click(screen.getByText("Être rappelé(e) par l'équipe"));
    await screen.findByText("C'est noté !");
    expect(invoke).toHaveBeenCalledWith("rdv-funnel-submit", {
      body: { action: "rappel", lead_id: "11111111-2222-3333-4444-555555555555", question_index: 5 },
    });
  });
});

describe("autres questions : refus inchangé, sans encadré", () => {
  for (const slug of ["a", "c", "d"]) {
    it(`page ${slug}`, () => {
      monter(slug);
      expect(screen.getByText("Réservation impossible")).toBeTruthy();
      expect(screen.getByText("Modifier ma réponse")).toBeTruthy();
      expect(screen.queryByText("Pour rappel")).toBeNull();
      expect(screen.queryByText(/budget raisonnable/)).toBeNull();
      expect(screen.queryByText("Être rappelé(e) par l'équipe")).toBeNull();
    });
  }
});
