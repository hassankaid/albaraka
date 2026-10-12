import { describe, expect, it } from "vitest";
import { couvertureThemes, filtrerPlans, planUtilisable, verifierVideoBanque, type PlanBanque } from "./banque";

const plan = (p: Partial<PlanBanque>): PlanBanque => ({
  id: "p",
  video_id: "v",
  rang: 0,
  debut: 0,
  fin: 3,
  images: [],
  description: "Un homme compte des billets",
  themes: ["argent"],
  mots_cles: ["billets", "argent"],
  ambiance: "calme",
  qualite: "nette",
  logo: false,
  texte_ecran: false,
  visage_reconnaissable: false,
  exclu: false,
  secours: false,
  ...p,
});

describe("banque de vidéos", () => {
  it("un plan exclu, flou ou trop sombre n'est pas utilisable", () => {
    expect(planUtilisable(plan({}))).toBe(true);
    expect(planUtilisable(plan({ exclu: true }))).toBe(false);
    expect(planUtilisable(plan({ qualite: "floue" }))).toBe(false);
    expect(planUtilisable(plan({ qualite: null }))).toBe(true);
  });

  it("compte les plans utilisables par thème et signale ceux sous 30", () => {
    const themes = [
      { id: "argent", nom: "Argent", ordre: 1, actif: true },
      { id: "foi", nom: "Foi", ordre: 2, actif: true },
      { id: "dubai", nom: "Dubaï", ordre: 3, actif: false },
    ];
    const plans = [
      ...Array.from({ length: 31 }, () => plan({})),
      plan({ themes: ["foi"] }),
      plan({ themes: ["foi"], exclu: true }),
    ];
    const c = couvertureThemes(themes, plans);
    expect(c.map((t) => [t.id, t.plans, t.manque])).toEqual([
      ["foi", 1, true],
      ["argent", 31, false],
    ]);
  });

  it("filtre par thème, par état et par mots", () => {
    const plans = [plan({ id: "a" }), plan({ id: "b", themes: ["foi"], description: "Une mosquée au lever du soleil", mots_cles: ["prière"] }), plan({ id: "c", exclu: true }), plan({ id: "d", secours: true })];
    expect(filtrerPlans(plans, { theme: "foi", recherche: "", voir: "tous" }).map((p) => p.id)).toEqual(["b"]);
    expect(filtrerPlans(plans, { theme: null, recherche: "mosquée soleil", voir: "tous" }).map((p) => p.id)).toEqual(["b"]);
    expect(filtrerPlans(plans, { theme: null, recherche: "", voir: "exclus" }).map((p) => p.id)).toEqual(["c"]);
    expect(filtrerPlans(plans, { theme: null, recherche: "", voir: "secours" }).map((p) => p.id)).toEqual(["d"]);
    expect(filtrerPlans(plans, { theme: null, recherche: "", voir: "utilisables" }).map((p) => p.id)).toEqual(["a", "b", "d"]);
  });

  it("accepte les vidéos MP4, MOV et WebM jusqu'à 2 Go", () => {
    expect(verifierVideoBanque({ name: "plan.MOV", size: 10 })).toBeNull();
    expect(verifierVideoBanque({ name: "plan.avi", size: 10 })).toMatch(/format/);
    expect(verifierVideoBanque({ name: "plan.mp4", size: 3 * 1024 ** 3 })).toMatch(/2 Go/);
  });
});
