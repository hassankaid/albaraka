import { describe, expect, it } from "vitest";
import { delaiTraitement, dureeCourte } from "./delaiTraitement";

describe("dureeCourte", () => {
  it("minutes, heures, jours", () => {
    expect(dureeCourte(12 * 60_000)).toBe("12 min");
    expect(dureeCourte(2 * 3_600_000 + 5 * 60_000)).toBe("2 h 05");
    expect(dureeCourte(3 * 3_600_000)).toBe("3 h");
    expect(dureeCourte(3 * 86_400_000 + 4 * 3_600_000)).toBe("3 j 4 h");
    expect(dureeCourte(-5)).toBe("0 min");
  });
});

describe("delaiTraitement", () => {
  const maintenant = new Date("2026-10-15T15:00:00Z");
  it("délai jusqu'à la première action", () => {
    expect(
      delaiTraitement({ created_at: "2026-10-15T10:00:00Z", premiere_action_le: "2026-10-15T12:15:00Z", status: "a_relancer" }),
    ).toEqual({ texte: "traité en 2 h 15", enAttente: false });
  });
  it("lead pas encore traité", () => {
    expect(delaiTraitement({ created_at: "2026-10-15T10:00:00Z", status: "a_qualifier" }, maintenant)).toEqual({
      texte: "en attente depuis 5 h",
      enAttente: true,
    });
  });
  it("rien sans date ou sans action hors « À qualifier »", () => {
    expect(delaiTraitement({ created_at: null })).toBeNull();
    expect(delaiTraitement({ created_at: "2026-10-15T10:00:00Z", status: "close" })).toBeNull();
  });
});
