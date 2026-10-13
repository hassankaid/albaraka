import { describe, expect, it } from "vitest";
import { calculerTaux, formaterTaux, presents } from "./activiteTaux";

describe("taux de Mon Activité", () => {
  it("déduit les présents des no-show", () => {
    expect(presents(10, 3)).toBe(7);
    expect(presents(2, 5)).toBe(0);
  });

  it("calcule les trois taux sur la période", () => {
    const t = calculerTaux([
      { replies_received: 30, appointments: 6, no_shows: 1, sales_made: 1 },
      { replies_received: 20, appointments: 4, no_shows: 1, sales_made: 1 },
    ]);
    expect(t).toMatchObject({ conversations: 50, rdv: 10, noShows: 2, presents: 8, ventes: 2 });
    expect(t.tauxPriseRdv).toBe(20);
    expect(t.tauxPresence).toBe(80);
    expect(t.tauxClosing).toBe(25); // 2 ventes ÷ 8 présents, et non ÷ 10 RDV
  });

  it("anciennes saisies sans no-show : présents = RDV", () => {
    const t = calculerTaux([{ replies_received: 9, appointments: 3, sales_made: 1 }]);
    expect(t.presents).toBe(3);
    expect(t.tauxPresence).toBe(100);
    expect(t.tauxPriseRdv).toBe(33.3);
  });

  it("pas de dénominateur : pas de taux", () => {
    const t = calculerTaux([]);
    expect(t.tauxPriseRdv).toBeNull();
    expect(t.tauxPresence).toBeNull();
    expect(t.tauxClosing).toBeNull();
    expect(formaterTaux(null)).toBe("—");
    expect(formaterTaux(33.3)).toBe("33,3 %");
  });
});
