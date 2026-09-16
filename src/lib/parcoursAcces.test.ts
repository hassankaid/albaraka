import { describe, it, expect } from "vitest";
import { calculerAccesChapitres, abregerTitreModule } from "./parcoursAcces";

const outils = [
  { id: "m1", theorie_chapitre_id: "mod1" },
  { id: "m2", theorie_chapitre_id: "mod2" },
  { id: "m3", theorie_chapitre_id: "mod3" },
];

describe("calculerAccesChapitres", () => {
  it("garde la progression linéaire quand aucune théorie n'est exigée", () => {
    const sansTheorie = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const acces = calculerAccesChapitres(sansTheorie, new Set(["a"]), new Set());
    expect(acces.get("a")!.accessible).toBe(true);
    expect(acces.get("b")!.accessible).toBe(true);
    expect(acces.get("c")!.accessible).toBe(false);
  });

  it("ferme l'outil tant que son module de théorie n'est pas validé", () => {
    const acces = calculerAccesChapitres(outils, new Set(), new Set());
    expect(acces.get("m1")!.accessible).toBe(false);
    expect(acces.get("m1")!.theorieManquante).toBe("mod1");
  });

  it("ouvre l'outil dès que le module est validé", () => {
    const acces = calculerAccesChapitres(outils, new Set(), new Set(["mod1"]));
    expect(acces.get("m1")!.accessible).toBe(true);
    expect(acces.get("m1")!.theorieManquante).toBeNull();
  });

  it("laisse ouvert un outil déjà terminé, même sans sa théorie", () => {
    const acces = calculerAccesChapitres(outils, new Set(["m1", "m2"]), new Set());
    expect(acces.get("m1")!.accessible).toBe(true);
    expect(acces.get("m2")!.accessible).toBe(true);
    expect(acces.get("m2")!.theorieManquante).toBeNull();
  });

  it("n'annonce la théorie que sur l'étape courante", () => {
    const acces = calculerAccesChapitres(outils, new Set(), new Set());
    expect(acces.get("m2")!.theorieManquante).toBeNull();
    expect(acces.get("m3")!.theorieManquante).toBeNull();
  });

  it("le cas Hedi : 11 outils faits sans théorie, rien ne recule", () => {
    const vingt = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i + 1}`,
      theorie_chapitre_id: `mod${i + 1}`,
    }));
    const faits = new Set(Array.from({ length: 11 }, (_, i) => `m${i + 1}`));
    const acces = calculerAccesChapitres(vingt, faits, new Set());

    for (let i = 1; i <= 11; i += 1) {
      expect(acces.get(`m${i}`)!.accessible).toBe(true);
    }
    expect(acces.get("m12")!.accessible).toBe(false);
    expect(acces.get("m12")!.theorieManquante).toBe("mod12");
  });

  it("un chapitre sans théorie reste ouvert au milieu de la chaîne (cas M9)", () => {
    const avecTrou = [
      { id: "m8", theorie_chapitre_id: "mod8" },
      { id: "m9", theorie_chapitre_id: null },
      { id: "m10", theorie_chapitre_id: "mod10" },
    ];
    const acces = calculerAccesChapitres(avecTrou, new Set(["m8"]), new Set(["mod8"]));
    expect(acces.get("m9")!.accessible).toBe(true);
    expect(acces.get("m9")!.theorieManquante).toBeNull();
  });
});

describe("abregerTitreModule", () => {
  it("garde le numéro et jette le sous-titre", () => {
    expect(abregerTitreModule("MODULE 4 : L'ÉCOSYSTÈME D'OFFRES & LA VALUE LADDER")).toBe("MODULE 4");
    expect(abregerTitreModule("MODULE 12 : NAMING & POSITIONNEMENT D\u2019OFFRE")).toBe("MODULE 12");
    expect(abregerTitreModule("MODULE 7 : GARANTIE HIGH-TICKET — TERMES ET CONDITIONS")).toBe("MODULE 7");
  });

  it("laisse intact un titre déjà court", () => {
    expect(abregerTitreModule("MODULE 13")).toBe("MODULE 13");
  });
});
