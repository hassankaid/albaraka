import { describe, it, expect } from "vitest";
import { bornesPeriode, nomPub, regrouper, total, trier, type PubBrute } from "./creas";

const pub = (p: Partial<PubBrute>): PubBrute => ({
  plateforme: "snap", pub_id: "a", pub_nom: "Vidéo 4", groupe_nom: null, campagne_nom: null,
  depense: 0, impressions: 0, clics: 0, leads: 0, inscrits: 0, rdv: 0, ventes: 0, ca: 0, ...p,
});

describe("regroupement par créa", () => {
  it("additionne les pubs d'une même créa avant de calculer les taux", () => {
    const [v4] = regrouper([
      pub({ pub_id: "a", depense: 100, leads: 10, ventes: 1, ca: 2000 }),
      pub({ pub_id: "b", pub_nom: " vidéo 4 ", depense: 300, leads: 10, ventes: 0, ca: 0 }),
    ]);
    expect(v4.pubIds).toEqual(["a", "b"]);
    expect(v4.depense).toBe(400);
    expect(v4.cpl).toBe(20);
    expect(v4.coutParVente).toBe(400);
    expect(v4.roas).toBe(5);
  });

  it("garde les plateformes séparées, et les pubs séparées en mode « par pub »", () => {
    const lignes = [pub({ pub_id: "a" }), pub({ pub_id: "b" }), pub({ plateforme: "meta", pub_id: "c" })];
    expect(regrouper(lignes)).toHaveLength(2);
    expect(regrouper(lignes, true)).toHaveLength(3);
  });

  it("ne fusionne jamais deux pubs sans nom", () => {
    const lignes = regrouper([pub({ pub_id: "x1", pub_nom: null }), pub({ pub_id: "x2", pub_nom: null })]);
    expect(lignes).toHaveLength(2);
    expect(nomPub({ pub_id: null, pub_nom: null })).toBe("Pub non identifiée");
  });

  it("laisse vide ce qui ne se calcule pas, et le range en bas du tri", () => {
    const lignes = regrouper([
      pub({ pub_id: "a", pub_nom: "A", depense: 0, leads: 3 }),
      pub({ pub_id: "b", pub_nom: "B", depense: 50, leads: 5, ventes: 1, ca: 2000 }),
    ]);
    const a = lignes.find((l) => l.nom === "A")!;
    expect(a.cpl).toBeNull();
    expect(a.roas).toBeNull();
    expect(trier(lignes, "roas", false).map((l) => l.nom)).toEqual(["B", "A"]);
    expect(total(lignes).cpl).toBe(50 / 8);
  });
});

describe("périodes", () => {
  const le3novembre = new Date("2026-11-03T20:00:00Z");
  it.each([
    ["7j", "2026-10-27", "2026-11-02"],
    ["30j", "2026-10-04", "2026-11-02"],
    ["mois", "2026-11-01", "2026-11-02"],
    ["mois_prec", "2026-10-01", "2026-10-31"],
  ] as const)("%s → du %s au %s", (p, from, to) => {
    expect(bornesPeriode(p, le3novembre)).toEqual({ from, to });
  });

  it("compte en jours de Paris, et s'arrête à hier", () => {
    // 23 h 30 UTC le 03/11 = 00 h 30 le 04/11 à Paris
    expect(bornesPeriode("7j", new Date("2026-11-03T23:30:00Z")).to).toBe("2026-11-03");
  });

  it("le 1er du mois, le mois en cours se réduit à ce jour", () => {
    expect(bornesPeriode("mois", new Date("2026-12-01T10:00:00Z"))).toEqual({ from: "2026-12-01", to: "2026-12-01" });
  });
});
