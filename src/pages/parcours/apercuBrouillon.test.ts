/**
 * Un parcours en brouillon (ex. parcours setter/closer, 08/10/2026) :
 * le CEO le prévisualise, tous les autres voient « arrive bientôt ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "src/pages/parcours/ParcoursView.tsx"), "utf-8");

describe("parcours en brouillon", () => {
  it("n'est prévisualisable que par le CEO", () => {
    expect(page).toContain('const apercuBrouillon = parcours.status !== "published" && profile?.role === "ceo";');
    expect(page).toContain('(parcours.status !== "published" && !apercuBrouillon)');
  });

  it("affiche un bandeau qui rappelle que c'est un brouillon", () => {
    expect(page).toContain("Aucun élève ne voit ce parcours.");
  });
});
