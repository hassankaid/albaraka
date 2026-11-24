import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { aujourdhuiParis, echeanceFollowUp, getLeadStatusListForLevel, LEAD_STATUS_LABELS } from "@/lib/leadConfig";
import { BadgeFollowUp, dateCourte } from "./FollowUp";
import { trierFollowUps, type LigneFollowUp } from "@/components/calls/MesFollowUps";

describe("follow-up (22/11/2026)", () => {
  it("échéance : en retard, aujourd'hui, à venir", () => {
    expect(echeanceFollowUp("2026-11-20", "2026-11-22")).toBe("retard");
    expect(echeanceFollowUp("2026-11-22", "2026-11-22")).toBe("aujourdhui");
    expect(echeanceFollowUp("2026-11-29", "2026-11-22")).toBe("a_venir");
    expect(echeanceFollowUp(null, "2026-11-22")).toBeNull();
  });

  it("date du jour à Paris, même à 23 h 30 UTC", () => {
    expect(aujourdhuiParis(new Date("2026-11-22T23:30:00Z"))).toBe("2026-11-23");
  });

  it("statut proposé aux setters, avec son libellé", () => {
    expect(LEAD_STATUS_LABELS.follow_up).toBe("Follow-up");
    for (const [role, niveau] of [["collaborateur", "intermediaire"], ["collaborateur", "confirme"], ["ceo", null]] as const) {
      expect(getLeadStatusListForLevel(role, niveau).map((s) => s.value)).toContain("follow_up");
    }
  });

  it("badge : date courte et échéance", () => {
    const auj = aujourdhuiParis();
    render(<BadgeFollowUp le={auj} motif="Paiement en fin de mois" />);
    expect(screen.getByTestId("badge-follow-up").textContent).toContain(dateCourte(auj));
    expect(screen.getByTestId("badge-follow-up").textContent).toContain("aujourd'hui");
  });

  it("Mes follow-up : sans date d'abord, puis par date", () => {
    const l = (cle: string, le: string | null): LigneFollowUp => ({ cle, type: "call", nom: cle, telephone: null, le, note: null, contactId: null });
    expect(trierFollowUps([l("b", "2026-12-05"), l("a", "2026-11-28"), l("x", null)]).map((x) => x.cle)).toEqual(["x", "a", "b"]);
  });
});
