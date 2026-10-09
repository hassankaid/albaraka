import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { debutEtape } from "./etapes";

describe("étapes d'un parcours", () => {
  const modules = [
    { etape: "ÉTAPE 1 — SETTING" },
    { etape: "ÉTAPE 2 — CLOSING" },
    { etape: "ÉTAPE 2 — CLOSING" },
    { etape: "ÉTAPE 2 — CLOSING " },
  ];

  it("affiche le titre d'étape au début de chaque groupe, une seule fois", () => {
    expect(modules.map((_, i) => debutEtape(modules, i))).toEqual(["ÉTAPE 1 — SETTING", "ÉTAPE 2 — CLOSING", null, null]);
  });

  it("ne change rien pour une formation sans étape", () => {
    const classiques = [{ etape: null }, {}, { etape: "" }];
    expect(classiques.map((_, i) => debutEtape(classiques, i))).toEqual([null, null, null]);
  });

  it("est branché dans la page de la formation, le menu des chapitres et l'éditeur", () => {
    const lire = (f: string) => readFileSync(resolve(process.cwd(), f), "utf-8");
    expect(lire("src/pages/training/FormationDetail.tsx")).toContain("debutEtape(modules, idx)");
    expect(lire("src/components/training/ChapterSidebar.tsx")).toContain("debutEtape(data.modules, idx)");
    expect(lire("src/components/training/admin/editor/EditModuleDialog.tsx")).toContain("etape: etape.trim() || null");
    expect(lire("supabase/migrations/20261009180000_formation_modules_etape.sql")).toContain("add column if not exists etape text");
  });

  it("l'admin peut placer un quiz à la fin d'un chapitre", () => {
    const admin = readFileSync(resolve(process.cwd(), "src/pages/admin/quizzes/AdminQuizList.tsx"), "utf-8");
    expect(admin).toContain('chapitre_id: attachmentKind === "chapitre" ? chapitreId : null');
    expect(admin).toContain('label: "Fin de chapitre"');
  });
});
