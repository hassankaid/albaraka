import { describe, expect, it } from "vitest";
import {
  apresReglage,
  coupeA,
  debutsDansLeMontage,
  horsDesMots,
  minute,
  motsDeLaCoupe,
  phrasesRetireesAutour,
  resumeCoupe,
  supprimerCoupe,
  versMontage,
  versSource,
} from "./coupesParCoupe";
import { deplacerBord, type Plage } from "./coupes";

// trois coupes gardées dans une vidéo de 20 s : 1 → 4, 6 → 10, 12 → 15
const plages: Plage[] = [
  [1, 4],
  [6, 10],
  [12, 15],
];

describe("la vidéo finale, coupe par coupe", () => {
  it("place les coupes bout à bout", () => {
    expect(debutsDansLeMontage(plages)).toEqual([0, 3, 7]);
  });

  it("donne le numéro de la coupe qu'on entend, même dans une partie retirée (la lecture saute à la suivante)", () => {
    expect(coupeA(plages, 0.5)).toBe(0);
    expect(coupeA(plages, 2)).toBe(0);
    expect(coupeA(plages, 5)).toBe(1);
    expect(coupeA(plages, 13)).toBe(2);
    expect(coupeA(plages, 19)).toBe(2);
    expect(coupeA([], 3)).toBe(-1);
  });

  it("passe du temps d'origine au temps de la vidéo finale, et retour (curseur qu'on glisse)", () => {
    expect(versMontage(plages, 7)).toBe(4);
    expect(versMontage(plages, 11)).toBe(7); // dans la partie retirée : début de la coupe suivante
    expect(versSource(plages, 4)).toBe(7);
    expect(versSource(plages, 7.5)).toBe(12.5);
    expect(versSource(plages, 99)).toBe(15);
    for (const x of [0, 2.9, 3, 6.2, 9.9]) expect(versMontage(plages, versSource(plages, x))).toBeCloseTo(x);
  });
});

describe("le texte des coupes", () => {
  const mots = [
    { text: "Beaucoup", start: 6.1, end: 6.5 },
    { text: "de", start: 6.55, end: 6.65 },
    { text: "gens", start: 6.7, end: 7 },
    { text: "euh", start: 10.5, end: 10.9 },
  ];
  it("garde les mots entendus dans la coupe", () => {
    expect(motsDeLaCoupe(mots, [6, 10])).toEqual(["Beaucoup", "de", "gens"]);
  });
  it("résume une longue coupe par ses premiers et derniers mots", () => {
    expect(resumeCoupe(["a", "b", "c"])).toBe("a b c");
    expect(resumeCoupe("un deux trois quatre cinq six sept huit neuf dix".split(" "), 3)).toBe("un deux trois … huit neuf dix");
  });
  it("signale une phrase recommencée retirée juste après la coupe", () => {
    const r = phrasesRetireesAutour(plages, 1, { mots, retires: [3] }, 20);
    expect(r).toEqual({ avant: false, apres: true });
  });
});

describe("régler une coupe", () => {
  it("deux coupes qui se touchent sont réunies (décision C), et la coupe réunie reste ouverte", () => {
    const apres = deplacerBord(plages, 1, "fin", 12.5, 20);
    expect(apres).toHaveLength(2);
    expect(apresReglage(plages, apres, 8)).toEqual({ coupe: 1, reunies: true });
    const debutRecule = deplacerBord(plages, 1, "debut", 3, 20);
    expect(apresReglage(plages, debutRecule, 8)).toEqual({ coupe: 0, reunies: true });
    expect(apresReglage(plages, deplacerBord(plages, 1, "fin", 9, 20), 8)).toEqual({ coupe: 1, reunies: false });
  });

  it("un point de coupe lâché dans un mot est ramené au bord le plus proche du mot", () => {
    const mots = [{ text: "Beaucoup", start: 6.1, end: 6.5 }];
    expect(horsDesMots(mots, 6.2)).toBeCloseTo(6.05);
    expect(horsDesMots(mots, 6.45)).toBeCloseTo(6.55);
    expect(horsDesMots(mots, 5.9)).toBe(5.9);
  });

  it("supprime une coupe entière, jamais la dernière", () => {
    const sans = supprimerCoupe(plages, 1);
    expect(sans).toEqual([
      [1, 4],
      [12, 15],
    ]);
    expect(debutsDansLeMontage(sans)).toEqual([0, 3]);
    expect(supprimerCoupe(plages, 5)).toBe(plages);
    expect(supprimerCoupe([[1, 4]], 0)).toEqual([[1, 4]]);
  });

  it("affiche le temps de la vidéo finale à la seconde", () => {
    expect(minute(27.4)).toBe("0:27");
    expect(minute(96.6)).toBe("1:37");
  });
});
