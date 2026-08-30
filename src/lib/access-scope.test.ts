import { describe, it, expect } from "vitest";
import {
  isApporteurScopedPath,
  isEffectiveApporteur,
  isLockedOut,
} from "./access-scope";

describe("isApporteurScopedPath", () => {
  it.each([
    "/my-space",
    "/my-space/leads",
    "/my-space/profile",
    "/my-space/coaching-calendar",
    "/training",
    "/training/closing",
    "/training/certificats",
    "/training/closing/chapitre/abc",
    "/mon-coaching",
    "/mon-coaching/session/abc",
    "/coaching/calendar",
    "/working/activity",
    "/working/organisation",
    "/working/personal-brand",
    // Ouvert aux apporteurs le 15/04/2026 (« Agent IA accessible aux apporteurs
    // avec pass actif »). Cette fonction ne dit QUE si le chemin appartient à la
    // navigation apporteur ; c'est `FeatureGate feature="working_activity"` qui
    // décide, sur la route elle-même, si la personne y a droit. Sans pass, elle
    // voit un écran verrouillé — pas l'outil.
    "/working/agent",
    "/parcours/al-baraka",
    "/onboarding",
  ])("allows %s", (path) => {
    expect(isApporteurScopedPath(path)).toBe(true);
  });

  it.each([
    "/dashboard",
    "/leads",
    "/calls",
    "/sales",
    "/payments",
    "/my-commissions",
    "/admin/team",
    "/admin/coaching",
    "/coaching",
    "/coaching/session/123",
    "/working/settings",
  ])("blocks %s", (path) => {
    expect(isApporteurScopedPath(path)).toBe(false);
  });
});

describe("isEffectiveApporteur", () => {
  it("returns false for null / CEO / agence / apporteur_active with dual role already on dashboard", () => {
    expect(isEffectiveApporteur(null)).toBe(false);
    expect(isEffectiveApporteur({ role: "ceo", is_active: true })).toBe(false);
    expect(isEffectiveApporteur({ role: "agence", is_active: true })).toBe(false);
  });

  it("is true for any role=apporteur (regardless of flags)", () => {
    expect(isEffectiveApporteur({ role: "apporteur" })).toBe(true);
    expect(isEffectiveApporteur({ role: "apporteur", is_also_apporteur: false })).toBe(true);
    expect(isEffectiveApporteur({ role: "apporteur", is_also_apporteur: true })).toBe(true);
  });

  it("is true for inactive collaborateur with is_also_apporteur (Sonia)", () => {
    expect(
      isEffectiveApporteur({ role: "collaborateur", is_active: false, is_also_apporteur: true })
    ).toBe(true);
  });

  it("is false for active collaborateur even with is_also_apporteur", () => {
    expect(
      isEffectiveApporteur({ role: "collaborateur", is_active: true, is_also_apporteur: true })
    ).toBe(false);
  });

  it("is false for inactive collaborateur without is_also_apporteur (these are locked out instead)", () => {
    expect(
      isEffectiveApporteur({ role: "collaborateur", is_active: false, is_also_apporteur: false })
    ).toBe(false);
  });
});

describe("isLockedOut", () => {
  it("locks out inactive collab without is_also_apporteur", () => {
    expect(
      isLockedOut({ role: "collaborateur", is_active: false, is_also_apporteur: false })
    ).toBe(true);
    expect(
      isLockedOut({ role: "collaborateur", is_active: false, is_also_apporteur: null })
    ).toBe(true);
  });

  it("does NOT lock out when is_also_apporteur=true (Sonia)", () => {
    expect(
      isLockedOut({ role: "collaborateur", is_active: false, is_also_apporteur: true })
    ).toBe(false);
  });

  it("does NOT lock out active collaborateurs", () => {
    expect(
      isLockedOut({ role: "collaborateur", is_active: true, is_also_apporteur: false })
    ).toBe(false);
  });

  it("does NOT lock out other roles", () => {
    expect(isLockedOut({ role: "ceo", is_active: true })).toBe(false);
    expect(isLockedOut({ role: "agence", is_active: false })).toBe(false);
    expect(isLockedOut({ role: "apporteur", is_active: false })).toBe(false);
    expect(isLockedOut(null)).toBe(false);
  });
});
