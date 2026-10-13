import { describe, expect, it } from "vitest";
import { rangerRessources, type FormationSource, type RessourceSource } from "./ressourcesPhases";

let n = 0;
const res = (titre: string, rubrique: RessourceSource["rubrique"] = null): RessourceSource => ({
  id: `r${++n}`, titre, type: "fichier", url: "x", ordre: n, rubrique,
});
const chap = (titre: string, ressources: RessourceSource[], status = "published") => ({
  id: `c${++n}`, titre, ordre: n, status, chapitre_ressources: ressources,
});
const mod = (titre: string, chapitres: ReturnType<typeof chap>[], status = "published") => ({
  id: `m${++n}`, titre, ordre: n, status, formation_chapitres: chapitres,
});

const sc: FormationSource = {
  id: "sc",
  slug: "parcours-setter-closer",
  formation_modules: [
    mod("PARTIE 0 — MUSLIM MINDSET", [chap("Intro", [res("Rien")])]),
    mod("PARTIE 1 — SETTING", [
      chap("M08", [res("M08 TEMPLATES DM", "script_template"), res("M08 SEQUENCE")]),
      chap("DM AL BARAKA", [res("SCRIPT DM AL BARAKA", "script_interne")]),
      chap("Brouillon", [res("Caché")], "draft"),
    ]),
    mod("PARTIE 2 — CLOSING", [chap("M12", [res("SCRIPT CLOSING PASS AL BARAKA", "script_interne")])]),
    mod("PARTIE 3 — ADMINISTRATIF", [chap("URSSAF", [res("Site")])]),
  ],
};

const cm: FormationSource = {
  id: "cm",
  slug: "parcours-community-management",
  formation_modules: [
    mod("PARTIE 1 — PERSONAL BRANDING", [chap("PB", [res("Fiche PB")])]),
    mod("PARTIE 2 — STORYTELLING", [chap("ST", [])]),
    mod("PARTIE 4 — COMMUNITY MANAGEMENT", [chap("CM", [res("Calendrier")])]),
  ],
};

describe("rangerRessources", () => {
  it("range par phase dans l'ordre de Sidali, sans Mindset ni Administratif", () => {
    const phases = rangerRessources([sc, cm]);
    expect(phases.map((p) => p.phase.titre)).toEqual([
      "Personal Branding",
      "Community Management",
      "Setting",
      "Closing",
    ]);
  });

  it("sépare les scripts internes, les templates et les autres ressources", () => {
    const setting = rangerRessources([sc]).find((p) => p.phase.cle === "setting")!;
    expect(setting.scriptsInternes.map((r) => r.titre)).toEqual(["SCRIPT DM AL BARAKA"]);
    expect(setting.scriptsTemplates.map((r) => r.titre)).toEqual(["M08 TEMPLATES DM"]);
    expect(setting.autres.map((r) => r.titre)).toEqual(["M08 SEQUENCE"]);
    expect(setting.total).toBe(3); // le chapitre brouillon est exclu
  });

  it("n'affiche que les parcours de l'élève", () => {
    expect(rangerRessources([cm]).some((p) => p.phase.cle === "setting")).toBe(false);
    expect(rangerRessources([])).toEqual([]);
    // formation publiée lisible sans inscription, mais modules filtrés par la RLS
    expect(rangerRessources([{ ...sc, formation_modules: [] }])).toEqual([]);
  });

  it("Estimaction : toute la formation", () => {
    const est: FormationSource = {
      id: "e", slug: "estimaction",
      formation_modules: [mod("COMPRENDRE", [chap("a", [res("Lien 1")])]), mod("AUGMENTER", [chap("b", [res("Lien 2")])])],
    };
    const [p] = rangerRessources([est]);
    expect(p.phase.titre).toBe("Estimaction");
    expect(p.autres).toHaveLength(2);
  });
});
