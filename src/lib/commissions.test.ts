/**
 * Le calcul des commissions doit donner EXACTEMENT ce que la base produit.
 *
 * La base applique `round(payments.amount * percentage / 100, 2)` en `numeric`,
 * donc en décimal exact avec arrondi demi-supérieur. Le front doit s'aligner,
 * sinon il écrase le calcul de la base avec une valeur qui en diffère d'un
 * centime — et l'écart tombe précisément sur le taux apporteur de 25 %.
 */

import { describe, it, expect } from "vitest";
import { commissionCents, commissionEuros } from "./commissions";

/** L'ancienne formule, gardée ici pour prouver qu'elle diverge. */
const ancienneFormule = (euros: number, taux: number) => Math.round(euros * taux) / 100;

describe("commission d'une échéance", () => {
  it("applique le taux au montant, arrondi à la 2e décimale", () => {
    expect(commissionEuros(250, 20)).toBe(50);
    expect(commissionEuros(250, 10)).toBe(25);
    expect(commissionEuros(250, 5)).toBe(12.5);
    expect(commissionEuros(150, 20)).toBe(30);
    expect(commissionEuros(210, 25)).toBe(52.5);
  });

  it("arrondit au demi-supérieur, comme l'exemple posé par Hassan", () => {
    // 285,71 x 15 % = 42,8565 -> 42,86
    expect(commissionEuros(285.71, 15)).toBe(42.86);
    // Et le cas symétrique : 42,8545 doit descendre.
    expect(commissionCents(28563, 15)).toBe(4284); // 42,8445 -> 42,84
  });

  it("tombe juste sur les montants tordus des échéanciers réels", () => {
    expect(commissionEuros(244.89, 5)).toBe(12.24);
    expect(commissionEuros(244.95, 10)).toBe(24.5);
    expect(commissionEuros(249.63, 25)).toBe(62.41);
    expect(commissionEuros(166.42, 10)).toBe(16.64);
    expect(commissionEuros(96.19, 10)).toBe(9.62);
  });

  it("gère les taux décimaux", () => {
    expect(commissionEuros(200, 7.5)).toBe(15);
    expect(commissionEuros(333.33, 7.5)).toBe(25); // 24,999... -> 25,00
  });

  it("ne rend jamais de fraction de centime", () => {
    for (const montant of [96.19, 124.82, 166.42, 199.7, 244.89, 285.71, 312.5]) {
      for (const taux of [5, 10, 15, 20, 25, 30]) {
        const v = commissionEuros(montant, taux);
        expect(Number.isInteger(Math.round(v * 100))).toBe(true);
        expect(v).toBe(Math.round(v * 100) / 100);
      }
    }
  });

  it("diverge de l'ancienne formule là où elle était fausse", () => {
    // 4,10 x 15 % = 0,6150 exactement. L'ancienne descend à 0,61 parce que le
    // flottant tombe juste en dessous du demi-centime.
    expect(commissionEuros(4.1, 15)).toBe(0.62);
    expect(ancienneFormule(4.1, 15)).toBe(0.61);

    // 33,30 x 15 % = 4,9950 -> 5,00
    expect(commissionEuros(33.3, 15)).toBe(5);
    expect(ancienneFormule(33.3, 15)).toBe(4.99);
  });

  it("reste d'accord avec l'ancienne formule sur les taux qui ne divergent pas", () => {
    // 5, 10 et 20 % n'ont jamais divergé : la correction ne doit rien déplacer
    // sur l'écrasante majorité des lignes existantes.
    for (const montant of [250, 150, 166.42, 244.89, 312.5, 499.26]) {
      for (const taux of [5, 10, 20]) {
        expect(commissionEuros(montant, taux)).toBe(ancienneFormule(montant, taux));
      }
    }
  });
});
