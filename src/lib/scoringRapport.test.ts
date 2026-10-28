import { describe, expect, it } from "vitest";
import { zipClasseur, colonne } from "./classeurXlsx";
import { feuillesExport, ligneRapport, ordonner, pct, type LigneRapport } from "./scoringRapport";

const l = (cle: string, leads: number, axe: LigneRapport["axe"] = "priorite"): LigneRapport =>
  ({ axe, cle, leads, inscrits: 10, pas_qualifies: 2, injoignables: 1, rdv: 3, ventes: 1, ca: 2000 });

describe("rapport du lead scoring", () => {
  it("range les priorités, puis les tags, puis le total", () => {
    const r = ordonner([l("total", 100, "total"), l("jeu_ven", 5, "tag"), l("non_score", 20), l("B", 30), l("A", 40), l("saisi_setter", 3)]);
    expect(r.map((x) => x.cle)).toEqual(["A", "B", "saisi_setter", "non_score", "jeu_ven", "total"]);
  });

  it("calcule les pourcentages à une décimale", () => {
    expect(pct(63, 142)).toBe(44.4);
    expect(pct(1, 0)).toBeNull();
    expect(ligneRapport(l("A", 40))).toEqual(["A — Appeler en premier", 40, 10, 25, 2, 5, 1, 2.5, 3, 7.5, 1, 2000]);
  });
});

describe("classeur Excel", () => {
  it("nomme les colonnes au-delà de Z", () => {
    expect([colonne(0), colonne(25), colonne(26), colonne(27)]).toEqual(["A", "Z", "AA", "AB"]);
  });

  it("produit deux feuilles, nombres en nombres et texte échappé", async () => {
    const zip = zipClasseur(feuillesExport("Conférence <test>", [l("A", 40)], []));
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(["xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/styles.xml"]));
    const f1 = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(f1).toContain('<c r="B2"><v>40</v></c>');
    expect(f1).toContain("Conférence &lt;test&gt;");
    const wb = await zip.file("xl/workbook.xml")!.async("string");
    expect(wb).toContain('name="Rapport"');
    expect(wb).toContain('name="Leads"');
  });
});
