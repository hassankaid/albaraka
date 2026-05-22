import { describe, it, expect } from "vitest";
import { getSpaces, detectCurrentSpaceId } from "./SpaceSwitcher";

describe("getSpaces", () => {
  it("returns empty for null profile", () => {
    expect(getSpaces(null, false)).toEqual([]);
  });

  it("CEO gets 4 spaces including ADMIN", () => {
    const s = getSpaces({ role: "ceo" }, false);
    expect(s.map((x) => x.id)).toEqual(["working", "training", "coaching", "admin"]);
    expect(s.find((x) => x.id === "working")!.path).toBe("/dashboard");
    // Depuis le 20/05/2026 : l'espace coaching pointe toujours sur le calendrier.
    expect(s.find((x) => x.id === "coaching")!.path).toBe("/coaching/calendar");
  });

  it("active collaborateur (non-coach) routes coaching to the calendar", () => {
    const s = getSpaces({ role: "collaborateur", is_active: true }, false);
    expect(s.find((x) => x.id === "coaching")!.path).toBe("/coaching/calendar");
  });

  it("active collaborateur with pass routes coaching to /coaching/calendar", () => {
    const s = getSpaces({ role: "collaborateur", is_active: true }, true);
    expect(s.find((x) => x.id === "coaching")!.path).toBe("/coaching/calendar");
  });

  it("coach routes coaching to the calendar", () => {
    const s = getSpaces({ role: "collaborateur", is_active: true, is_coach: true }, false);
    expect(s.find((x) => x.id === "coaching")!.path).toBe("/coaching/calendar");
  });

  it("pure apporteur routes working to /my-space (not /working/activity)", () => {
    const s = getSpaces({ role: "apporteur", is_also_apporteur: false }, false);
    expect(s.find((x) => x.id === "working")!.path).toBe("/my-space");
  });

  it("pure apporteur with pass routes coaching to /my-space/coaching-calendar", () => {
    const s = getSpaces({ role: "apporteur", is_also_apporteur: false }, true);
    expect(s.find((x) => x.id === "coaching")!.path).toBe("/my-space/coaching-calendar");
  });

  it("pure apporteur without pass still routes coaching to /my-space/coaching-calendar", () => {
    // Le calendrier est protégé par PassGuard : un apporteur sans pass y est
    // bloqué proprement (plus de fallback /mon-coaching depuis le 20/05/2026).
    const s = getSpaces({ role: "apporteur", is_also_apporteur: false }, false);
    expect(s.find((x) => x.id === "coaching")!.path).toBe("/my-space/coaching-calendar");
  });

  it("pure apporteur still sees TRAINING space (no dead-end)", () => {
    const s = getSpaces({ role: "apporteur", is_also_apporteur: false }, false);
    expect(s.map((x) => x.id)).toContain("training");
    expect(s.find((x) => x.id === "training")!.path).toBe("/training");
  });

  it("inactive collaborateur with is_also_apporteur (Sonia case) routes working to /my-space", () => {
    const s = getSpaces(
      { role: "collaborateur", is_active: false, is_also_apporteur: true },
      false
    );
    expect(s.find((x) => x.id === "working")!.path).toBe("/my-space");
  });
});

describe("detectCurrentSpaceId", () => {
  it("detects training from /training", () => {
    expect(detectCurrentSpaceId("/training")).toBe("training");
    expect(detectCurrentSpaceId("/training/formation-closing")).toBe("training");
    expect(detectCurrentSpaceId("/training/certificats")).toBe("training");
  });

  it("detects coaching from /coaching, /mon-coaching, and /my-space/coaching-calendar", () => {
    expect(detectCurrentSpaceId("/coaching")).toBe("coaching");
    expect(detectCurrentSpaceId("/coaching/calendar")).toBe("coaching");
    expect(detectCurrentSpaceId("/mon-coaching")).toBe("coaching");
    expect(detectCurrentSpaceId("/my-space/coaching-calendar")).toBe("coaching");
  });

  it("detects coaching from /admin/coaching", () => {
    expect(detectCurrentSpaceId("/admin/coaching")).toBe("coaching");
  });

  it("detects training from admin training/scripts/quizzes/role-play", () => {
    expect(detectCurrentSpaceId("/admin/training/manage")).toBe("training");
    expect(detectCurrentSpaceId("/admin/scripts")).toBe("training");
    expect(detectCurrentSpaceId("/admin/role-play")).toBe("training");
    expect(detectCurrentSpaceId("/admin/quizzes")).toBe("training");
  });

  it("detects admin from other /admin/* paths", () => {
    expect(detectCurrentSpaceId("/admin/team")).toBe("admin");
    expect(detectCurrentSpaceId("/admin/invoices")).toBe("admin");
  });

  it("defaults to working for /my-space and /dashboard", () => {
    expect(detectCurrentSpaceId("/my-space")).toBe("working");
    expect(detectCurrentSpaceId("/my-space/leads")).toBe("working");
    expect(detectCurrentSpaceId("/dashboard")).toBe("working");
    expect(detectCurrentSpaceId("/working/activity")).toBe("working");
  });
});
