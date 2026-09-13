/**
 * Le lien des SMS garde le groupe du jour jusqu'à midi, heure de Paris.
 *
 * Le 06/09/2026, le SMS de 11h15 envoyait vers le groupe de la semaine
 * suivante : la bascule suivait l'heure de début (11h). Ces cas figent la règle
 * fixée le 13/09/2026, heure d'été comme heure d'hiver.
 */

import { describe, it, expect } from "vitest";
import { conferenceDuJourAvantMidi } from "../../supabase/functions/r-sms/bascule";

describe("conferenceDuJourAvantMidi", () => {
  it.each([
    ["dimanche 01h30 à Paris (samedi 23h30 UTC)", "2026-09-12T23:30:00Z", "2026-09-13"],
    ["dimanche 10h50, SMS M-10", "2026-09-13T08:50:00Z", "2026-09-13"],
    ["dimanche 11h15, SMS M+15 — le cas du 06/09", "2026-09-13T09:15:00Z", "2026-09-13"],
    ["dimanche 11h59", "2026-09-13T09:59:00Z", "2026-09-13"],
    ["dimanche 11h30 en heure d'hiver", "2026-11-01T10:30:00Z", "2026-11-01"],
  ])("%s → groupe du jour", (_cas, instant, attendu) => {
    expect(conferenceDuJourAvantMidi(new Date(instant))).toBe(attendu);
  });

  it.each([
    ["dimanche 12h00 pile", "2026-09-13T10:00:00Z"],
    ["dimanche 14h42, le retardataire du 30/08", "2026-09-13T12:42:00Z"],
    ["dimanche 12h00 en heure d'hiver", "2026-11-01T11:00:00Z"],
    ["samedi 23h30 à Paris", "2026-09-12T21:30:00Z"],
    ["lundi 10h", "2026-09-14T08:00:00Z"],
  ])("%s → règle habituelle (conférence courante)", (_cas, instant) => {
    expect(conferenceDuJourAvantMidi(new Date(instant))).toBeNull();
  });
});
