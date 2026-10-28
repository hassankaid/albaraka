import { describe, expect, it } from "vitest";
import { comparerOrdreAppel, infosScoring, reponsesCles } from "./leadScoring";

describe("score /100 : affichage", () => {
  it("résume la situation pro et le budget", () => {
    expect(reponsesCles({ q1: "salarie", q4: "500_1000", q2: "25_35" })).toBe("Salarié · 500 à 1 000 €");
    expect(reponsesCles(null)).toBeNull();
  });

  it("supprime l'alerte d'âge et rend le budget faible neutre", () => {
    const r = infosScoring(["age_hors_cible", "investissement_faible", "desalignement_humain"]);
    expect(r.alertes).toEqual(["⚠️ Refuse contact humain"]);
    expect(r.infos).toEqual(["Budget déclaré : moins de 500 €"]);
  });
});

describe("ordre de la file d'appel", () => {
  const l = (status: string, quiz_priorite: string | null, created_at: string) => ({ status, quiz_priorite, created_at });

  it("à qualifier d'abord, de A à D puis non scoré, le plus ancien en premier", () => {
    const leads = [
      l("a_qualifier", "B", "2026-10-27T10:00:00Z"),
      l("perdu", "A", "2026-10-28T10:00:00Z"),
      l("a_qualifier", null, "2026-10-20T10:00:00Z"),
      l("a_qualifier", "A", "2026-10-28T09:00:00Z"),
      l("a_qualifier", "A", "2026-10-26T09:00:00Z"),
      l("a_relancer", "A", "2026-10-25T10:00:00Z"),
    ];
    const tries = [...leads].sort(comparerOrdreAppel).map((x) => `${x.status}/${x.quiz_priorite}/${x.created_at.slice(5, 10)}`);
    expect(tries).toEqual([
      "a_qualifier/A/10-26",
      "a_qualifier/A/10-28",
      "a_qualifier/B/10-27",
      "a_qualifier/null/10-20",
      "perdu/A/10-28",
      "a_relancer/A/10-25",
    ]);
  });
});
