/**
 * Les garde-fous de l'A/B testing.
 *
 * Ce fichier vérifie surtout ce que l'outil doit REFUSER de faire : annoncer un
 * gagnant sur trop peu de monde, ignorer une répartition anormale, ou changer
 * la variante d'un visiteur en cours de route. Un outil d'A/B testing qui
 * conclut trop vite est pire que pas d'outil du tout — il donne une caution
 * chiffrée à une décision prise au hasard.
 */

import { describe, it, expect } from "vitest";
import {
  attribuerVariante, controleRepartition, comparerProportions,
  khiDeuxPValeur, analyser, VISITEURS_MINIMUM, type ResultatBrut,
} from "./abtest";

const brut = (variant: string, poids: number, visiteurs: number, leads: number, ventes = 0, ca = 0): ResultatBrut =>
  ({ variant, poids, visiteurs, leads, ventes, ca });

describe("attribution d'une variante", () => {
  it("rend toujours la même variante au même visiteur", () => {
    for (const id of ["v-abc", "v-def", "v-123456", ""]) {
      const premier = attribuerVariante(id, "K7X2", ["3", "5"], [50, 50]);
      for (let i = 0; i < 50; i++) {
        expect(attribuerVariante(id, "K7X2", ["3", "5"], [50, 50])).toBe(premier);
      }
    }
  });

  it("répartit indépendamment d'un test à l'autre", () => {
    // Sans le code du test dans le hachage, un visiteur toujours dans le
    // premier groupe le serait dans TOUS les tests, et les biais s'ajouteraient.
    const ids = Array.from({ length: 400 }, (_, i) => `v-${i}`);
    const a = ids.map((id) => attribuerVariante(id, "TEST1", ["1", "2"], [50, 50]));
    const b = ids.map((id) => attribuerVariante(id, "TEST2", ["1", "2"], [50, 50]));
    const identiques = a.filter((v, i) => v === b[i]).length;
    // Deux répartitions indépendantes coïncident sur ~50 % des visiteurs.
    expect(identiques).toBeGreaterThan(150);
    expect(identiques).toBeLessThan(250);
  });

  it("respecte les poids sur un grand nombre de visiteurs", () => {
    const ids = Array.from({ length: 4000 }, (_, i) => `visiteur-${i}`);
    const tirages = ids.map((id) => attribuerVariante(id, "K7X2", ["A", "B"], [80, 20]));
    const partA = tirages.filter((v) => v === "A").length / tirages.length;
    expect(partA).toBeGreaterThan(0.77);
    expect(partA).toBeLessThan(0.83);
  });

  it("sait répartir sur plus de deux variantes", () => {
    const ids = Array.from({ length: 3000 }, (_, i) => `u${i}`);
    const t = ids.map((id) => attribuerVariante(id, "T", ["1", "2", "3"], [1, 1, 1]));
    for (const v of ["1", "2", "3"]) {
      const part = t.filter((x) => x === v).length / t.length;
      expect(part).toBeGreaterThan(0.29);
      expect(part).toBeLessThan(0.37);
    }
  });

  it("refuse une configuration incohérente", () => {
    expect(() => attribuerVariante("v", "T", ["1", "2"], [50])).toThrow();
    expect(() => attribuerVariante("v", "T", [], [])).toThrow();
    expect(() => attribuerVariante("v", "T", ["1"], [0])).toThrow();
  });
});

describe("loi du khi-deux", () => {
  it("retrouve les valeurs critiques connues", () => {
    // Valeurs de table : p = 0,05.
    expect(khiDeuxPValeur(3.841, 1)).toBeCloseTo(0.05, 3);
    expect(khiDeuxPValeur(5.991, 2)).toBeCloseTo(0.05, 3);
    expect(khiDeuxPValeur(7.815, 3)).toBeCloseTo(0.05, 3);
    // p = 0,001.
    expect(khiDeuxPValeur(10.828, 1)).toBeCloseTo(0.001, 4);
  });
});

describe("contrôle de répartition (SRM)", () => {
  it("ne s'alarme pas d'un écart normal", () => {
    // 520/480 sur 1000 : parfaitement banal pour un tirage équitable.
    expect(controleRepartition([520, 480], [50, 50]).conforme).toBe(true);
  });

  it("détecte un déséquilibre qui trahit un bug", () => {
    // 700/300 sur 1000 alors qu'on voulait 50/50 : ce n'est pas la chance.
    const c = controleRepartition([700, 300], [50, 50]);
    expect(c.conforme).toBe(false);
    expect(c.pValeur).toBeLessThan(0.001);
  });

  it("accepte un déséquilibre voulu", () => {
    expect(controleRepartition([800, 200], [80, 20]).conforme).toBe(true);
  });

  it("s'abstient quand les effectifs sont trop faibles", () => {
    // Sur 10 visites, 8/2 est courant : crier au bug serait une fausse alerte.
    expect(controleRepartition([8, 2], [50, 50]).conforme).toBe(true);
  });
});

describe("comparaison de deux proportions", () => {
  it("ne voit pas de différence là où il n'y en a pas", () => {
    const c = comparerProportions(100, 1000, 105, 1000)!;
    expect(c.significatif).toBe(false);
    expect(c.ic95[0]).toBeLessThan(0);
    expect(c.ic95[1]).toBeGreaterThan(0); // l'intervalle contient zéro
  });

  it("détecte un écart franc sur un gros volume", () => {
    const c = comparerProportions(100, 1000, 160, 1000)!;
    expect(c.significatif).toBe(true);
    expect(c.lift).toBeCloseTo(60, 0);
    expect(c.ic95[0]).toBeGreaterThan(0); // l'intervalle exclut zéro
  });

  it("reste prudent sur un petit échantillon, même à écart apparent énorme", () => {
    // 2/10 contre 5/10 : le double, et pourtant rien de concluant.
    const c = comparerProportions(2, 10, 5, 10)!;
    expect(c.significatif).toBe(false);
  });

  it("rend null sans effectif", () => {
    expect(comparerProportions(0, 0, 0, 0)).toBeNull();
  });
});

describe("verdict d'ensemble", () => {
  it("refuse de conclure sous le seuil de visiteurs", () => {
    const a = analyser([brut("3", 50, 40, 20), brut("5", 50, 38, 4)]);
    expect(a.verdict.type).toBe("pas_assez");
    // Malgré un écart de 1 à 5, on ne dit rien.
  });

  it("annonce combien il manque", () => {
    const a = analyser([brut("3", 50, 150, 30), brut("5", 50, 60, 20)]);
    expect(a.verdict.type).toBe("pas_assez");
    if (a.verdict.type === "pas_assez") {
      expect(a.verdict.message).toContain(String(VISITEURS_MINIMUM - 60));
    }
  });

  it("ne couronne personne quand les variantes se valent", () => {
    const a = analyser([brut("3", 50, 1000, 100), brut("5", 50, 1000, 104)]);
    expect(a.verdict.type).toBe("aucun_ecart");
  });

  it("désigne la gagnante quand l'écart est réel", () => {
    const a = analyser([brut("3", 50, 1000, 100), brut("5", 50, 1000, 170)]);
    expect(a.verdict.type).toBe("gagnante");
    if (a.verdict.type === "gagnante") {
      expect(a.verdict.variant).toBe("5");
      expect(a.verdict.pValeur).toBeLessThan(0.05);
    }
  });

  it("ne couronne pas une variante significativement PIRE", () => {
    const a = analyser([brut("3", 50, 1000, 170), brut("5", 50, 1000, 100)]);
    expect(a.verdict.type).toBe("aucun_ecart");
  });

  it("change de conclusion selon la métrique choisie", () => {
    // La variante 5 apporte plus d'inscrits mais moins de clients : selon ce
    // qu'on optimise, la réponse s'inverse. D'où le choix AVANT le lancement.
    const donnees = [
      brut("3", 50, 1000, 100, 30, 60000),
      brut("5", 50, 1000, 170, 12, 24000),
    ];
    const surLeads = analyser(donnees, "lead");
    expect(surLeads.verdict.type).toBe("gagnante");
    if (surLeads.verdict.type === "gagnante") expect(surLeads.verdict.variant).toBe("5");

    const surVentes = analyser(donnees, "vente");
    expect(surVentes.verdict.type).toBe("aucun_ecart"); // la 5 est pire, on ne la couronne pas
  });

  it("remonte un déséquilibre de répartition dans l'analyse", () => {
    const a = analyser([brut("3", 50, 700, 70), brut("5", 50, 300, 30)]);
    expect(a.repartition.conforme).toBe(false);
  });

  it("calcule les taux sans planter sur une variante à zéro visiteur", () => {
    const a = analyser([brut("3", 50, 500, 50), brut("5", 50, 0, 0)]);
    expect(a.variantes[1].tauxConversion).toBeNull();
    expect(a.verdict.type).toBe("pas_assez");
  });
});
