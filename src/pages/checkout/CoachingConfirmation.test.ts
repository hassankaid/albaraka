import { describe, it, expect } from "vitest";
import { lireReservation } from "./CoachingConfirmation";

describe("confirmation du coaching (03/11/2026)", () => {
  it("lit la réservation transmise par Calendly, en heure de Paris", () => {
    const r = lireReservation("?invitee_full_name=Abdellah%20Barrada&assigned_to=Sabrina%20Da%20cunha&event_start_time=2026-11-04T10%3A00%3A00%2B01%3A00");
    expect(r).toMatchObject({ prenom: "Abdellah", coach: "Sabrina Da cunha", jour: "4", mois: "novembre", jourSemaine: "mercredi", heure: "10:00" });
  });

  it("reste lisible sans paramètres", () => {
    expect(lireReservation("").jour).toBeNull();
  });
});
