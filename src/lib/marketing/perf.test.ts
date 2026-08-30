// Le cas qui compte : tant qu'aucune vente n'est tombée, tous les segments
// valent zéro. Couronner le premier de la liste donnerait un « meilleur canal »
// arbitraire, sur lequel on arbitrerait pourtant du budget.
import { describe, expect, it } from "vitest";
import { classer, parCanal, type PerfBrute } from "./perf";

const ligne = (canal: string, leads: number, ventes = 0, ca = 0, depense = 0): PerfBrute =>
  ({ canal, tunnel: "wa", leads, ventes, ca, depense });

describe("classement des segments", () => {
  it("ne désigne ni meilleur ni pire quand aucune vente n'est encore tombée", () => {
    const c = classer(parCanal([
      ligne("meta_ads", 81, 0, 0, 350.72),
      ligne("direct", 14),
      ligne("instagram_organic", 8),
    ]));
    expect(c.motif).toBe("aucun_ecart");
    expect(c.meilleur).toBeNull();
    expect(c.pire).toBeNull();
    // Les segments restent listés : on montre les volumes, pas un gagnant.
    expect(c.compares).toHaveLength(3);
  });

  it("classe dès qu'un segment se détache", () => {
    const c = classer(parCanal([
      ligne("meta_ads", 81, 3, 7200, 350.72),
      ligne("direct", 14, 1, 1800),
      ligne("instagram_organic", 8, 0, 0),
    ]));
    expect(c.motif).toBe("classe");
    expect(c.meilleur?.cle).toBe("direct");        // 128,57 € de CA par lead
    expect(c.pire?.cle).toBe("instagram_organic"); // 0 €
  });

  it("écarte les segments trop petits plutôt que de les noyer", () => {
    const c = classer(parCanal([
      ligne("meta_ads", 81, 3, 7200, 350.72),
      ligne("tiktok_organic", 2, 1, 2000),
    ]));
    expect(c.compares.map((s) => s.cle)).toEqual(["meta_ads"]);
    expect(c.ecartes[0].libelle).toBe("Organique TikTok");
  });

  it("bascule sur le CA par lead dès qu'un segment n'a pas de dépense", () => {
    const payant = classer(parCanal([
      ligne("meta_ads", 81, 3, 7200, 350.72),
      ligne("instagram_ads", 20, 1, 2000, 100),
    ]));
    expect(payant.critere).toBe("roi");

    const mixte = classer(parCanal([
      ligne("meta_ads", 81, 3, 7200, 350.72),
      ligne("direct", 14, 1, 1800),
    ]));
    expect(mixte.critere).toBe("caParLead");
  });
});
