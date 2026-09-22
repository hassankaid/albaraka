// Les chiffres du tableau de bord servent à décider. Une moyenne fausse ne se
// voit pas sur un graphique — d'où ces contrôles sur les calculs eux-mêmes.
import { describe, it, expect } from "vitest";
import {
  filtrer, moyenne, nps, part, repartition, repartitionMultiple, croiser,
  normaliserPays, versCSV, FILTRES_VIDES, type Reponse,
} from "./stats";

const vide: Reponse = {
  invitation_id: "x", prenom: null, formation_fichier: "al_baraka", soumis_le: "2026-09-22T10:00:00Z",
  q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: null, q8: null, q9: null,
  q10: null, q11: null, q12: null, q13: null, q14: null, q15: null, q16: null, q17: null,
  q18: null, q19: null, q20: null, q21: null, q22: null, q23: null, q24: null, q25: null,
  q26: null, q27: null, q28: null, q29: null,
};
const r = (p: Partial<Reponse>): Reponse => ({ ...vide, ...p });

describe("NPS", () => {
  it("soustrait les détracteurs aux promoteurs, en ignorant 7 et 8", () => {
    // 2 promoteurs (10, 9), 1 passif (8), 1 détracteur (3) sur 4 → 50 − 25 = 25
    expect(nps([r({ q26: 10 }), r({ q26: 9 }), r({ q26: 8 }), r({ q26: 3 })])).toBe(25);
  });

  it("descend jusqu'à −100 quand tout le monde est détracteur", () => {
    expect(nps([r({ q26: 0 }), r({ q26: 6 })])).toBe(-100);
  });

  it("compte 6 comme détracteur et 9 comme promoteur — les bornes exactes", () => {
    expect(nps([r({ q26: 6 })])).toBe(-100);
    expect(nps([r({ q26: 9 })])).toBe(100);
    expect(nps([r({ q26: 7 })])).toBe(0);
  });

  it("ne renvoie rien sans réponse exploitable", () => {
    expect(nps([])).toBeNull();
    expect(nps([r({ q26: null })])).toBeNull();
  });
});

describe("moyennes", () => {
  it("ignore les questions laissées vides plutôt que de les compter zéro", () => {
    expect(moyenne([r({ q17: 8 }), r({ q17: 6 }), r({ q17: null })], "q17")).toBe(7);
  });
  it("ne renvoie rien quand personne n'a répondu", () => {
    expect(moyenne([r({ q17: null })], "q17")).toBeNull();
  });
});

describe("parts", () => {
  it("compte ceux qui ont pensé à abandonner, « Jamais » excepté", () => {
    const g = [r({ q19: "Jamais" }), r({ q19: "Une fois" }), r({ q19: "Plusieurs fois" }), r({ q19: "Jamais" })];
    expect(part(g, (x) => x.q19 !== "Jamais")).toBe(50);
  });
  it("ne renvoie rien sur un ensemble vide", () => {
    expect(part([], () => true)).toBeNull();
  });
});

describe("répartition", () => {
  it("suit l'ordre des options quand il est donné, pas l'effectif", () => {
    const g = [r({ q1: "45 ans et plus" }), r({ q1: "18-24 ans" }), r({ q1: "45 ans et plus" })];
    const ordre = ["Moins de 18 ans", "18-24 ans", "25-34 ans", "35-44 ans", "45 ans et plus"];
    expect(repartition(g, "q1", ordre).map((x) => x.valeur)).toEqual(["18-24 ans", "45 ans et plus"]);
  });

  it("regroupe les pays écrits différemment", () => {
    const g = [r({ q2: "France" }), r({ q2: "  france " }), r({ q2: "FRANCE" }), r({ q2: "Belgique" })];
    const res = repartition(g, "q2");
    expect(res[0]).toEqual({ valeur: "France", n: 3, pct: 75 });
  });

  it("compte chaque option cochée du choix multiple", () => {
    const g = [r({ q27: ["Lives", "Rôle-plays"] }), r({ q27: ["Lives"] })];
    const res = repartitionMultiple(g);
    expect(res.find((x) => x.valeur === "Lives")).toEqual({ valeur: "Lives", n: 2, pct: 100 });
    expect(res.find((x) => x.valeur === "Rôle-plays")?.n).toBe(1);
  });
});

describe("filtres", () => {
  const g = [
    r({ q10: "LIBERTY", q1: "25-34 ans", q21: "Oui", soumis_le: "2026-09-22T10:00:00Z" }),
    r({ q10: "PASS AL-BARAKA", q1: "25-34 ans", q21: "Non", soumis_le: "2026-09-24T10:00:00Z" }),
  ];

  it("se combinent", () => {
    expect(filtrer(g, { ...FILTRES_VIDES, age: "25-34 ans", termine: "Oui" })).toHaveLength(1);
  });

  it("bornent la période sur le jour, inclus des deux côtés", () => {
    expect(filtrer(g, { ...FILTRES_VIDES, du: "2026-09-24" })).toHaveLength(1);
    expect(filtrer(g, { ...FILTRES_VIDES, au: "2026-09-22" })).toHaveLength(1);
    expect(filtrer(g, { ...FILTRES_VIDES, du: "2026-09-22", au: "2026-09-24" })).toHaveLength(2);
  });

  it("laissent tout passer par défaut", () => {
    expect(filtrer(g, FILTRES_VIDES)).toHaveLength(2);
  });
});

describe("croisement", () => {
  it("calcule chaque indicateur par groupe", () => {
    const g = [
      r({ q12: "Instagram", q17: 8, q21: "Oui", q19: "Jamais", q26: 10 }),
      r({ q12: "Instagram", q17: 6, q21: "Non", q19: "Une fois", q26: 3 }),
      r({ q12: "TikTok", q17: 9, q21: "Oui", q19: "Jamais", q26: 9 }),
    ];
    const lignes = croiser(g, "q12");
    const insta = lignes.find((l) => l.valeur === "Instagram")!;
    expect(insta.n).toBe(2);
    expect(insta.satisfaction).toBe(7);
    expect(insta.termine).toBe(50);
    expect(insta.abandon).toBe(50);
    expect(insta.nps).toBe(0); // 1 promoteur, 1 détracteur
  });
});

describe("export CSV", () => {
  const csv = versCSV([r({ prenom: "Hassan", q2: "France", q27: ["Lives", "Rôle-plays"] })]);

  it("commence par le BOM, sans lequel Excel casse les accents", () => {
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("sépare par point-virgule, sinon Excel français met tout en une colonne", () => {
    expect(csv.split("\r\n")[0]).toContain("prenom;formation_fichier");
  });

  it("aplatit le choix multiple en une seule cellule lisible", () => {
    expect(csv).toContain("Lives | Rôle-plays");
  });

  it("protège les réponses qui contiennent un point-virgule ou un retour ligne", () => {
    const c = versCSV([r({ q18: 'le temps; et le "doute"\nsurtout' })]);
    expect(c).toContain('"le temps; et le ""doute""\nsurtout"');
  });
});

describe("normalisation des pays", () => {
  it("rend une forme unique, et marque l'absence", () => {
    expect(normaliserPays("  BELGIQUE ")).toBe("Belgique");
    expect(normaliserPays("côte d'ivoire")).toBe("Côte d'ivoire");
    expect(normaliserPays(null)).toBe("—");
  });
});
