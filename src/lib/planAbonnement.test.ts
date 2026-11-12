/**
 * Plan d'abonnement recréé sur la carte enregistrée (outil « Replanifier »,
 * supabase/functions/_shared/plan_abonnement.ts).
 *
 * Ce qui ne doit jamais dériver :
 *  • exactement N prélèvements : arrêt à la fin EXACTE de la N-ième période ;
 *  • 1er prélèvement à la date de la 1re échéance (09:00 UTC), jamais dans le passé ;
 *  • les centimes de reste uniquement sur la 1re échéance ;
 *  • refus d'un plan que Stripe ne sait pas reproduire (montants ou dates irréguliers).
 */
import { describe, it, expect } from "vitest";
import {
  ajouterMoisUTC,
  calculerPlan,
  carteExpireeAvant,
} from "../../supabase/functions/_shared/plan_abonnement";

const ts = (iso: string) => Date.parse(iso) / 1000;
const iso = (t: number) => new Date(t * 1000).toISOString();

describe("ajouterMoisUTC", () => {
  it("garde le jour et l'heure", () => {
    expect(ajouterMoisUTC(new Date("2026-12-15T09:00:00Z"), 7).toISOString()).toBe("2027-07-15T09:00:00.000Z");
  });
  it("ramène au dernier jour du mois", () => {
    expect(ajouterMoisUTC(new Date("2027-01-31T09:00:00Z"), 1).toISOString()).toBe("2027-02-28T09:00:00.000Z");
  });
});

describe("calculerPlan", () => {
  const avant = new Date("2026-11-12T11:00:00Z");

  it("Lahcen : 7 × 250 € à partir du 15/12 → arrêt le 15/07", () => {
    const echeances = ["2026-12-15", "2027-01-15", "2027-02-15", "2027-03-15", "2027-04-15", "2027-05-15", "2027-06-15"]
      .map((d) => ({ amount: 250, due_date: d }));
    const r = calculerPlan(echeances, avant);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.mensuelCents).toBe(25000);
    expect(r.plan.supplementPremiereCents).toBe(0);
    expect(r.plan.nombre).toBe(7);
    expect(iso(r.plan.trialEnd)).toBe("2026-12-15T09:00:00.000Z");
    expect(iso(r.plan.cancelAt)).toBe("2027-07-15T09:00:00.000Z");
  });

  it("met les centimes de reste sur la 1re échéance", () => {
    const echeances = [151.56, 151.51, 151.51].map((a, i) => ({
      amount: a,
      due_date: ["2026-12-05", "2027-01-05", "2027-02-05"][i],
    }));
    const r = calculerPlan(echeances, avant);
    expect(r.ok && r.plan.mensuelCents).toBe(15151);
    expect(r.ok && r.plan.supplementPremiereCents).toBe(5);
  });

  it("échéance déjà due : 1er prélèvement 15 min plus tard, pas dans le passé", () => {
    const r = calculerPlan([{ amount: 500, due_date: "2026-11-10" }, { amount: 500, due_date: "2026-12-10" }], avant);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.trialEnd).toBe(ts("2026-11-12T11:15:00Z"));
    expect(iso(r.plan.cancelAt)).toBe("2027-01-12T11:15:00.000Z");
  });

  it("refuse des montants irréguliers", () => {
    const r = calculerPlan([{ amount: 500, due_date: "2026-12-10" }, { amount: 300, due_date: "2027-01-10" }, { amount: 500, due_date: "2027-02-10" }], avant);
    expect(r.ok).toBe(false);
  });

  it("refuse une 1re échéance plus petite que les suivantes", () => {
    const r = calculerPlan([{ amount: 100, due_date: "2026-12-10" }, { amount: 500, due_date: "2027-01-10" }], avant);
    expect(r.ok).toBe(false);
  });

  it("refuse des dates qui ne se suivent pas de mois en mois", () => {
    const r = calculerPlan([{ amount: 250, due_date: "2026-12-10" }, { amount: 250, due_date: "2027-01-20" }], avant);
    expect(r.ok).toBe(false);
  });

  it("refuse un plan vide", () => {
    expect(calculerPlan([], avant).ok).toBe(false);
  });
});

describe("carteExpireeAvant", () => {
  const dec2026 = ts("2026-12-15T09:00:00Z");
  it("carte valable jusqu'au mois du prélèvement inclus", () => {
    expect(carteExpireeAvant(12, 2026, dec2026)).toBe(false);
  });
  it("carte expirée le mois d'avant", () => {
    expect(carteExpireeAvant(11, 2026, dec2026)).toBe(true);
    expect(carteExpireeAvant(9, 2025, dec2026)).toBe(true);
  });
});
