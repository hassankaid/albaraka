import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { derniereRelance, etapeFinale, etapeRelance, libelleBouton, messageRelance } from "./relances";

describe("etapeRelance", () => {
  it("donne l'étape d'un lead à relancer, bornée de 1 à 3", () => {
    expect(etapeRelance({ status: "a_relancer", relance_etape: 2 })).toBe(2);
    expect(etapeRelance({ status: "a_relancer", relance_etape: null })).toBe(1);
    expect(etapeRelance({ status: "a_relancer", relance_etape: 7 })).toBe(3);
  });
  it("renvoie null hors relance", () => {
    expect(etapeRelance({ status: "call_booke", relance_etape: 2 })).toBeNull();
    expect(etapeRelance(null)).toBeNull();
  });
});

describe("derniereRelance", () => {
  const maintenant = new Date(2026, 9, 15, 10, 0);
  it("formule la date de la dernière relance", () => {
    expect(derniereRelance(null, maintenant)).toBeNull();
    expect(derniereRelance(new Date(2026, 9, 15, 8, 0).toISOString(), maintenant)).toBe("faite aujourd'hui");
    expect(derniereRelance(new Date(2026, 9, 14, 23, 0).toISOString(), maintenant)).toBe("faite hier");
    expect(derniereRelance(new Date(2026, 9, 11, 9, 0).toISOString(), maintenant)).toBe("faite il y a 4 j");
  });
});

describe("libellés", () => {
  it("bouton, étape finale et message", () => {
    expect(libelleBouton(2)).toBe("Relance 2 faite");
    expect(etapeFinale(2)).toBe(false);
    expect(etapeFinale(3)).toBe(true);
    expect(messageRelance({ ok: true, changed: true, etape: 2 }, 1)).toBe("Relance 1 faite : prochaine étape, Relance 2.");
    expect(messageRelance({ ok: true, changed: true, etape: null, recycle: true }, 3)).toContain("À recycler");
    expect(messageRelance({ ok: true, changed: false, etape: 2 }, 1)).toBe("Cette relance était déjà validée.");
  });
});
