import { describe, it, expect } from "vitest";
import { pickSharedLayout } from "./SharedLayout";

describe("pickSharedLayout", () => {
  it("defaults to dashboard when no profile", () => {
    expect(pickSharedLayout(null)).toBe("dashboard");
  });

  it("picks dashboard for CEO", () => {
    expect(pickSharedLayout({ role: "ceo", is_active: true })).toBe("dashboard");
  });

  it("picks dashboard for active collaborateur", () => {
    expect(pickSharedLayout({ role: "collaborateur", is_active: true })).toBe("dashboard");
  });

  it("picks apporteur layout for pure apporteur (role=apporteur, is_also_apporteur=false)", () => {
    expect(pickSharedLayout({ role: "apporteur", is_also_apporteur: false })).toBe("apporteur");
  });

  it("picks dashboard for apporteur with is_also_apporteur flag (dual-role)", () => {
    // Edge interpretation: is_also_apporteur on an apporteur row is uncommon,
    // but if present we treat the user as having the collaborateur side, so
    // show DashboardLayout to preserve access to /dashboard.
    expect(pickSharedLayout({ role: "apporteur", is_also_apporteur: true })).toBe("dashboard");
  });

  it("picks apporteur layout for inactive collaborateur with is_also_apporteur (Sonia edge case)", () => {
    expect(
      pickSharedLayout({ role: "collaborateur", is_active: false, is_also_apporteur: true })
    ).toBe("apporteur");
  });

  it("picks dashboard for inactive collaborateur without is_also_apporteur", () => {
    // Existing ProtectedRoute logic handles their redirect elsewhere; we
    // don't want SharedLayout to silently send them to an apporteur space.
    expect(
      pickSharedLayout({ role: "collaborateur", is_active: false, is_also_apporteur: false })
    ).toBe("dashboard");
  });

  it("picks dashboard for agence role", () => {
    expect(pickSharedLayout({ role: "agence" })).toBe("dashboard");
  });
});
