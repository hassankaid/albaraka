import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  apresRelance,
  derniereRelance,
  etapeFinale,
  etapeRelance,
  finitEnPerdu,
  libelleBouton,
  libelleEtape,
  messageRelance,
  passageRelance,
} from "./relances";

describe("etapeRelance", () => {
  it("donne l'étape d'un lead à relancer, bornée de 1 à 6", () => {
    expect(etapeRelance({ status: "a_relancer", relance_etape: 2 })).toBe(2);
    expect(etapeRelance({ status: "a_relancer", relance_etape: null })).toBe(1);
    expect(etapeRelance({ status: "a_relancer", relance_etape: 5 })).toBe(5);
    expect(etapeRelance({ status: "a_relancer", relance_etape: 9 })).toBe(6);
  });
  it("renvoie null hors relance", () => {
    expect(etapeRelance({ status: "call_booke", relance_etape: 2 })).toBeNull();
    expect(etapeRelance(null)).toBeNull();
  });
});

describe("derniereRelance", () => {
  const maintenant = new Date("2026-10-15T08:00:00Z"); // 10h00 à Paris
  it("donne le jour et l'heure de la dernière relance (heure de Paris)", () => {
    expect(derniereRelance(null, maintenant)).toBeNull();
    expect(derniereRelance("2026-10-15T06:05:00Z", maintenant)).toBe("faite aujourd'hui à 08h05");
    expect(derniereRelance("2026-10-14T21:30:00Z", maintenant)).toBe("faite hier à 23h30");
    expect(derniereRelance("2026-10-11T07:12:00Z", maintenant)).toBe("faite le 11 oct. à 09h12");
  });
  it("suit le fuseau du membre", () => {
    expect(derniereRelance("2026-10-15T06:05:00Z", maintenant, "America/Montreal")).toBe("faite aujourd'hui à 02h05");
  });
});

describe("libellés", () => {
  it("bouton, étape finale et message", () => {
    expect(libelleBouton(2)).toBe("Relance 2 faite");
    expect(etapeFinale(2)).toBe(false);
    expect(etapeFinale(3)).toBe(true);
    expect(etapeFinale(5)).toBe(false);
    expect(etapeFinale(6)).toBe(true);
    expect(finitEnPerdu(3)).toBe(false);
    expect(finitEnPerdu(6)).toBe(true);
    expect(messageRelance({ ok: true, changed: true, etape: 2 }, 1)).toBe("Relance 1 faite : prochaine étape, Relance 2.");
    expect(messageRelance({ ok: true, changed: true, etape: null, recycle: true }, 3)).toContain("À recycler");
    expect(messageRelance({ ok: true, changed: false, etape: 2 }, 1)).toBe("Cette relance était déjà validée.");
    expect(messageRelance({ ok: true, changed: true, etape: null, perdu: true }, 6)).toContain("« Perdu »");
  });
});

describe("2e passage", () => {
  it("affiche Relance 4/6 et le passage", () => {
    expect(passageRelance(3)).toBe(1);
    expect(passageRelance(4)).toBe(2);
    expect(libelleEtape(2)).toBe("Relance 2/3");
    expect(libelleEtape(4)).toBe("Relance 4/6 · 2ᵉ passage");
  });
});

describe("apresRelance", () => {
  const lead = { id: "1", status: "a_relancer", relance_etape: 1, relance_derniere_le: null, assigned_to: "u", recycled_at: null };
  it("avance l'étape tout de suite", () => {
    expect(apresRelance(lead, { ok: true, changed: true, etape: 2 }, "T")).toMatchObject({ relance_etape: 2, relance_derniere_le: "T" });
  });
  it("recycle après la dernière", () => {
    expect(apresRelance(lead, { ok: true, changed: true, etape: null, recycle: true }, "T")).toMatchObject({
      status: "pas_de_reponse",
      assigned_to: null,
      recycled_at: "T",
      relance_etape: null,
    });
  });
  it("classe en Perdu après la 6e, sans désaffecter", () => {
    const l6 = { ...lead, relance_etape: 6 };
    expect(apresRelance(l6, { ok: true, changed: true, etape: null, perdu: true }, "T")).toMatchObject({
      status: "perdu",
      assigned_to: "u",
      relance_etape: null,
      recycled_at: null,
    });
  });
  it("ne change rien si la relance était déjà validée", () => {
    expect(apresRelance(lead, { ok: true, changed: false, etape: 2 })).toBe(lead);
  });
});
