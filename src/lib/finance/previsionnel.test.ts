import { describe, it, expect } from "vitest";
import { ymd, computePrevisionnel, tauxRealisationObserve, type ForecastPayment } from "./previsionnel";

const p = (amount: number, status: string, due_date: string): ForecastPayment => ({ amount, status, due_date });

const AOUT = new Date(2026, 7, 13); // 13 août 2026, heure locale

describe("ymd", () => {
  it("rend la date LOCALE, pas la date UTC", () => {
    // Le bug corrigé : toISOString() sur un 1er août à minuit heure de Paris (UTC+2)
    // renvoie "2026-07-31", ce qui décalait toutes les périodes d'un jour en arrière.
    expect(ymd(new Date(2026, 7, 1))).toBe("2026-08-01");
    expect(ymd(new Date(2026, 7, 31))).toBe("2026-08-31");
    expect(ymd(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("tauxRealisationObserve", () => {
  it("mesure paid/(paid+lost) sur les 3 mois clos précédents", () => {
    const all = [
      p(900, "paid", "2026-06-10"),
      p(100, "lost", "2026-06-15"),
      p(500, "paid", "2026-07-10"),
      p(500, "lost", "2026-07-20"),
    ];
    // 1400 encaissés sur 2000 dus → 70 %
    expect(tauxRealisationObserve(all, AOUT)).toBeCloseTo(0.7, 6);
  });

  it("ignore les échéances encore ouvertes plutôt que de les compter comme perdues", () => {
    const all = [
      p(900, "paid", "2026-06-10"),
      p(100, "lost", "2026-06-15"),
      p(5000, "pending", "2026-06-20"),
      p(5000, "late", "2026-06-25"),
    ];
    expect(tauxRealisationObserve(all, AOUT)).toBeCloseTo(0.9, 6);
  });

  it("exclut le mois en cours et les mois hors fenêtre", () => {
    const all = [
      p(1000, "paid", "2026-04-10"), // trop ancien
      p(1000, "lost", "2026-08-05"), // mois en cours
      p(800, "paid", "2026-07-10"),
      p(200, "lost", "2026-07-20"),
    ];
    expect(tauxRealisationObserve(all, AOUT)).toBeCloseTo(0.8, 6);
  });

  it("retombe sur 1 quand il n'y a aucun historique soldé", () => {
    expect(tauxRealisationObserve([], AOUT)).toBe(1);
  });
});

describe("computePrevisionnel", () => {
  const base = {
    caCollecte: 1000,
    allPayments: [p(900, "paid", "2026-07-10"), p(100, "lost", "2026-07-20")], // taux = 90 %
    today: AOUT,
  };

  it("additionne encaissé + reste, et exclut les échéances perdues", () => {
    const r = computePrevisionnel({
      ...base,
      periodPayments: [
        p(1000, "paid", "2026-08-05"),
        p(200, "pending", "2026-08-20"), // à venir
        p(50, "pending", "2026-08-12"), // échue, prélèvement en cours
        p(30, "late", "2026-08-03"), // en retard
        p(999, "lost", "2026-08-04"), // exclu
      ],
    });
    expect(r.aVenir).toBe(200);
    expect(r.echu).toBe(50);
    expect(r.retard).toBe(30);
    expect(r.perdu).toBe(999);
    expect(r.previsionnel).toBe(1000 + 200 + 50 + 30);
  });

  it("place une échéance due aujourd'hui dans « échu », pas dans « à venir »", () => {
    const r = computePrevisionnel({ ...base, periodPayments: [p(500, "pending", "2026-08-13")] });
    expect(r.echu).toBe(500);
    expect(r.aVenir).toBe(0);
  });

  it("calcule le dû à date sur les seules échéances échues, hors perdues", () => {
    const r = computePrevisionnel({
      ...base,
      periodPayments: [
        p(1000, "paid", "2026-08-05"), // échue
        p(30, "late", "2026-08-03"), // échue
        p(200, "pending", "2026-08-20"), // pas encore due
        p(999, "lost", "2026-08-04"), // échue mais perdue
      ],
    });
    expect(r.duADate).toBe(1030);
    // 1000 encaissés contre 1030 attendus à ce jour → 30 de retard sur l'échéancier
    expect(r.ecartADate).toBe(-30);
  });

  it("signale une avance quand l'encaissé dépasse le dû à date", () => {
    const r = computePrevisionnel({
      ...base,
      caCollecte: 1200,
      periodPayments: [p(1000, "paid", "2026-08-05"), p(500, "pending", "2026-08-25")],
    });
    expect(r.ecartADate).toBe(200);
  });

  it("pondère le reste par le taux de réalisation pour l'atterrissage", () => {
    const r = computePrevisionnel({ ...base, periodPayments: [p(500, "pending", "2026-08-20")] });
    expect(r.tauxRealisation).toBeCloseTo(0.9, 6);
    expect(r.atterrissage).toBeCloseTo(1000 + 500 * 0.9, 6);
  });

  it("trie le reste à encaisser du plus urgent au plus lointain", () => {
    const r = computePrevisionnel({
      ...base,
      periodPayments: [
        p(1, "pending", "2026-08-28"),
        p(2, "late", "2026-08-02"),
        p(3, "pending", "2026-08-11"),
        p(4, "paid", "2026-08-01"),
      ],
    });
    expect(r.resteList.map((x) => x.due_date)).toEqual(["2026-08-02", "2026-08-11", "2026-08-28"]);
  });

  it("sur une période sans échéance, l'objectif se réduit à l'encaissé", () => {
    const r = computePrevisionnel({ ...base, periodPayments: [] });
    expect(r.previsionnel).toBe(1000);
    expect(r.duADate).toBe(0);
    expect(r.resteList).toEqual([]);
  });

  it("sur une période future, l'objectif est le total planifié et l'encaissé nul", () => {
    const r = computePrevisionnel({
      ...base,
      caCollecte: 0,
      periodPayments: [p(14450.77, "pending", "2026-09-15")],
    });
    expect(r.previsionnel).toBeCloseTo(14450.77, 2);
    expect(r.duADate).toBe(0);
  });

  // Verrouille les chiffres réels d'août 2026 relevés en base le 13/08/2026.
  it("reproduit la structure réelle d'août 2026", () => {
    const r = computePrevisionnel({
      caCollecte: 10883.24, // paid_at du 01/08 au 13/08
      periodPayments: [
        p(10433.91, "paid", "2026-08-06"),
        p(999.61, "pending", "2026-08-13"),
        p(9877.07, "pending", "2026-08-22"),
        p(499.5, "late", "2026-08-04"),
        p(3157.66, "lost", "2026-08-07"),
      ],
      allPayments: [p(114743.05, "paid", "2026-07-15"), p(13636.99, "lost", "2026-07-16")],
      today: AOUT,
    });
    expect(r.previsionnel).toBeCloseTo(22259.42, 2);
    expect(r.duADate).toBeCloseTo(11933.02, 2);
    expect(r.ecartADate).toBeCloseTo(-1049.78, 2);
    expect(r.perdu).toBeCloseTo(3157.66, 2);
    expect(r.tauxRealisation).toBeCloseTo(0.89378, 5);
    expect(r.atterrissage).toBeCloseTo(21051.0, 2);
  });
});
