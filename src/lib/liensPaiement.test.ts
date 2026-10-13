import { describe, expect, it } from "vitest";
import { lienOffre, offresParCategorie } from "./liensPaiement";

const base = { min_installments_count: 1, formation_id: null, created_at: "", updated_at: "" };
const o = (id: string, category: string, slug: string, status = "active") =>
  ({ ...base, id, slug, category, label: slug, status, default_price_ht: 500, max_installments_count: 3 }) as any;

describe("liens de paiement des élèves", () => {
  it("range les offres actives : pass d'abord, archivées exclues", () => {
    const groupes = offresParCategorie([o("1", "a_la_carte", "closing"), o("2", "al_baraka", "al-baraka"), o("3", "liberty", "liberty", "archived")]);
    expect(groupes.map((g) => g.categorie)).toEqual(["al_baraka", "a_la_carte"]);
  });

  it("construit le lien public, sans mode test", () => {
    const lien = lienOffre(o("1", "a_la_carte", "closing"), 3);
    expect(lien).toMatch(/\/checkout\/formation\/closing\/3$/);
    expect(lien).not.toContain("test");
    expect(lienOffre(o("2", "al_baraka", "al-baraka"), 8, "2026-11-01")).toMatch(/\/checkout\/8\?start=2026-11-01$/);
  });
});
