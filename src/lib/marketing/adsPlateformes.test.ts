import { describe, expect, it } from "vitest";
import { libellePlateforme, resumePlateformes } from "./adsPlateformes";

describe("resumePlateformes", () => {
  it("regroupe par plateforme, de la plus grosse dépense à la plus petite", () => {
    const r = resumePlateformes([
      { date: "2026-10-01", amount_spent: 10, plateforme: "meta" },
      { date: "2026-10-02", amount_spent: 5.5, plateforme: "meta" },
      { date: "2026-10-01", amount_spent: 40, plateforme: "snap" },
    ]);
    expect(r.map((x) => [x.libelle, x.total])).toEqual([["Snapchat", 40], ["Meta", 15.5]]);
  });

  it("ne date la dernière remontée que sur un jour avec dépense", () => {
    const [meta] = resumePlateformes([
      { date: "2026-10-01", amount_spent: 10, plateforme: "meta" },
      { date: "2026-10-05", amount_spent: 0, plateforme: "meta" },
    ]);
    expect(meta.dernierJour).toBe("2026-10-01");
  });

  it("considère l'historique sans plateforme comme du Meta", () => {
    expect(resumePlateformes([{ date: "2026-01-01", amount_spent: 3 }])[0].libelle).toBe("Meta");
    expect(libellePlateforme(null)).toBe("Meta");
  });
});
