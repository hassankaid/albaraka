import { describe, expect, it } from "vitest";
import { conferencesEntre, entonnoir, fenetre, objectifPeriode, recommander, REGLAGES_DEFAUT } from "./pilotage";
import { deriver, type Mesures, type NoeudSource } from "./sources";

function crea(nom: string, m: Partial<Mesures>): NoeudSource {
  return {
    ...deriver({
      depense: 0, leads: 0, inscrits: 0, rdv: 0, rdvTenus: 0, ventes: 0, perdues: 0, caSigne: 0, caNet: 0, encaisse: 0, ...m,
    }),
    cle: nom, niveau: "crea", nom, plateforme: "snap", enfants: [],
  };
}

const reference = deriver({
  depense: 4000, leads: 400, inscrits: 100, rdv: 40, rdvTenus: 30, ventes: 10, perdues: 0, caSigne: 20000, caNet: 20000, encaisse: 0,
});

describe("recommander", () => {
  const creas = [
    crea("Sans vente chère", { depense: 900, leads: 80, rdv: 2 }),           // ≥ 2 × 400 sans vente → couper
    crea("Trop chère", { depense: 1700, leads: 150, rdv: 6, ventes: 2, caNet: 4000 }), // 850 €/vente → couper
    crea("Star", { depense: 750, leads: 90, rdv: 8, ventes: 3, caNet: 6000 }),        // 250 € ≤ 280 → pousser
    crea("Un peu chère", { depense: 1050, leads: 100, rdv: 5, ventes: 2, caNet: 4000 }), // 525 € ≥ 500 → surveiller
    crea("Rien du tout", { depense: 450, leads: 30, rdv: 0 }),               // ≥ cible, ni vente ni RDV → surveiller
    crea("Jeune", { depense: 150, leads: 12, rdv: 1 }),                      // trop tôt
    crea("Correcte", { depense: 400, leads: 40, rdv: 3, ventes: 1, caNet: 2000 }), // garder
    crea("Perdue", { depense: 900, leads: 50, ventes: 1, perdues: 1, caSigne: 2000 }), // vente perdue = sans vente → couper
    crea("Sans dépense", { leads: 5, ventes: 1 }),                            // ignorée
  ];
  const recos = recommander(creas, new Set(["Star"]), REGLAGES_DEFAUT, reference);
  const v = Object.fromEntries(recos.map((r) => [r.noeud.nom, r.verdict]));

  it("classe chaque créa selon les seuils, cible = coût par vente moyen", () => {
    expect(v["Sans vente chère"]).toBe("couper");
    expect(v["Trop chère"]).toBe("couper");
    expect(v["Perdue"]).toBe("couper");
    expect(v["Star"]).toBe("pousser");
    expect(v["Un peu chère"]).toBe("surveiller");
    expect(v["Rien du tout"]).toBe("surveiller");
    expect(v["Jeune"]).toBe("attendre");
    expect(v["Correcte"]).toBe("garder");
    expect(v["Sans dépense"]).toBeUndefined();
    expect(recos[0].verdict).toBe("couper");
    expect(recos.find((r) => r.noeud.nom === "Star")!.active).toBe(true);
  });

  it("une cible fixée remplace la moyenne", () => {
    const r = recommander([crea("Star", { depense: 750, ventes: 3, caNet: 6000 })], new Set(), { ...REGLAGES_DEFAUT, cpa_cible: 200 }, reference);
    expect(r[0].verdict).toBe("surveiller"); // 250 € ≥ 1,25 × 200
  });
});

describe("objectifs", () => {
  it("additionne objectif propre et objectif par défaut, mesure par mesure", () => {
    const confs = conferencesEntre("2026-11-01", "2026-11-15");
    expect(confs).toEqual(["2026-11-01", "2026-11-08", "2026-11-15"]);
    const objectifs = [
      { conference_date: null, ventes: 8, ca: 16000, rdv: null, budget: 4000 },
      { conference_date: "2026-11-08", ventes: 12, ca: null, rdv: null, budget: null },
    ];
    expect(objectifPeriode(confs, objectifs, "ventes")).toBe(28);
    expect(objectifPeriode(confs, objectifs, "ca")).toBe(48000);
    expect(objectifPeriode(confs, objectifs, "rdv")).toBeNull();
  });

  it("fenêtre glissante", () => {
    expect(fenetre("2026-11-15", 4)).toEqual({ from: "2026-10-25", to: "2026-11-15" });
  });
});

describe("entonnoir", () => {
  it("taux de passage d'une étape à l'autre", () => {
    const e = entonnoir(reference);
    expect(e.map((x) => x.valeur)).toEqual([400, 100, 40, 30, 10]);
    expect(e[0].taux).toBeNull();
    expect(e[1].taux).toBe(0.25);
    expect(e[4].taux).toBeCloseTo(1 / 3);
  });
});
