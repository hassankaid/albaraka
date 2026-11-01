import { describe, expect, it } from "vitest";
import { equipeProposee, estCoachActif, estCollaborateurActif, nomEquipe, type ProfilEquipe } from "./equipe";

const p = (id: string, role: string, is_active?: boolean | null): ProfilEquipe => ({ id, full_name: id.toUpperCase(), role, is_active });

const profils = [
  p("sidali", "ceo"),
  p("sabrina", "collaborateur", true),
  p("saba", "collaborateur", false),
  p("ancien", "collaborateur", null),
  p("apporteur", "apporteur", true),
];

describe("estCollaborateurActif", () => {
  it("suit le statut de la fiche Équipe", () => {
    expect(estCollaborateurActif(p("a", "collaborateur", true))).toBe(true);
    expect(estCollaborateurActif(p("a", "collaborateur", false))).toBe(false);
    expect(estCollaborateurActif(p("a", "collaborateur", null))).toBe(true);
    expect(estCollaborateurActif(p("a", "apporteur", true))).toBe(false);
  });
});

describe("equipeProposee", () => {
  it("propose le CEO et les collaborateurs actifs, pas les désactivés ni les apporteurs", () => {
    expect(equipeProposee(profils).map((x) => x.id)).toEqual(["sidali", "sabrina", "ancien"]);
  });

  it("garde la personne déjà choisie même si elle a été désactivée depuis", () => {
    expect(equipeProposee(profils, "saba").map((x) => x.id)).toEqual(["sidali", "sabrina", "saba", "ancien"]);
  });
});

describe("nomEquipe", () => {
  it("signale un collaborateur désactivé", () => {
    expect(nomEquipe(p("saba", "collaborateur", false))).toBe("SABA (inactif)");
    expect(nomEquipe(p("sabrina", "collaborateur", true))).toBe("SABRINA");
  });
});

describe("estCoachActif", () => {
  it("propose les coachs actifs, y compris un CEO coach", () => {
    expect(estCoachActif({ is_coach: true, is_active: true })).toBe(true);
    expect(estCoachActif({ is_coach: true, is_active: null })).toBe(true);
  });
  it("écarte un coach désactivé et les profils qui ne sont pas coachs", () => {
    expect(estCoachActif({ is_coach: true, is_active: false })).toBe(false);
    expect(estCoachActif({ is_coach: false, is_active: true })).toBe(false);
    expect(estCoachActif({ is_coach: null, is_active: true })).toBe(false);
  });
});
