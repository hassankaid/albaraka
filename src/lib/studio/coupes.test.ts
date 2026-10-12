import { describe, expect, it } from "vitest";
import {
  coupesEntre,
  deplacerBord,
  dureeGardee,
  garderCoupe,
  memesPlages,
  minutage,
  natureCoupe,
  normaliser,
  tempsDeLecture,
  type Plage,
} from "./coupes";

const plages: Plage[] = [
  [1, 3],
  [4, 6],
  [8, 9],
];

describe("vérification des coupes", () => {
  it("liste les coupes entre les passages gardés, début et fin compris", () => {
    expect(coupesEntre(plages, 10)).toEqual([
      [0, 1],
      [3, 4],
      [6, 8],
      [9, 10],
    ]);
    expect(dureeGardee(plages)).toBe(5);
  });

  it("« Garder ce passage » rejoint les deux passages voisins", () => {
    expect(garderCoupe(plages, [3, 4], 10)).toEqual([
      [1, 6],
      [8, 9],
    ]);
  });

  it("la poignée prolonge un passage, sans dépasser la vidéo ni descendre sous 0,1 s", () => {
    expect(deplacerBord(plages, 1, "fin", 7, 10)).toEqual([
      [1, 3],
      [4, 7],
      [8, 9],
    ]);
    expect(deplacerBord(plages, 2, "fin", 12, 10)[2]).toEqual([8, 10]);
    expect(deplacerBord(plages, 0, "fin", 0.5, 10)[0]).toEqual([1, 1.1]);
  });

  it("deux passages qui se touchent fusionnent", () => {
    expect(deplacerBord(plages, 0, "fin", 4.5, 10)).toEqual([
      [1, 6],
      [8, 9],
    ]);
  });

  it("normalise des plages en désordre ou trop courtes", () => {
    expect(normaliser([[5, 4], [0, 0.05], [3.5, 4.2], [7, 12]], 10)).toEqual([
      [3.5, 5],
      [7, 10],
    ]);
  });

  it("la lecture « comme le montage » saute les coupes", () => {
    expect(tempsDeLecture(0.2, plages)).toBe(1);
    expect(tempsDeLecture(2, plages)).toBe(2);
    expect(tempsDeLecture(3.5, plages)).toBe(4);
    expect(tempsDeLecture(9.5, plages)).toBeNull();
  });

  it("reconnaît une phrase recommencée et donne le contexte", () => {
    const travail = {
      mots: [
        { text: "la", start: 0.1, end: 0.3 },
        { text: "même", start: 0.4, end: 0.8 },
        { text: "la", start: 1.2, end: 1.4 },
        { text: "pluie", start: 1.5, end: 1.9 },
      ],
      retires: [0, 1],
    };
    const n = natureCoupe([0, 1.1], travail);
    expect(n.phraseRatee).toBe(true);
    expect(n.mots).toBe("la même");
    expect(n.apres).toBe("la pluie");
    expect(natureCoupe([0.85, 1.15], travail).phraseRatee).toBe(false);
  });

  it("compare des plages au millième et formate le temps", () => {
    expect(memesPlages([[1, 2]], [[1.0004, 2]])).toBe(true);
    expect(memesPlages([[1, 2]], null)).toBe(false);
    expect(memesPlages(null, undefined)).toBe(true);
    expect(minutage(72.44)).toBe("1:12,4");
    expect(minutage(3)).toBe("0:03,0");
  });
});
