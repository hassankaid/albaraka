// La liste déroulante du tableau de bord avait perdu la conférence du jour :
// elle s'arrêtait à la dernière conférence PASSÉE, alors que tous les inscrits
// de la semaine sont rattachés à celle qui vient. Ces cas verrouillent la
// distinction entre les deux.
import { describe, expect, it } from "vitest";
import { conferenceEnCours, currentOrPrevSunday } from "./conferenceFilter";

describe("conférences : dernière passée vs en cours", () => {
  it.each([
    ["dimanche 30/08 09h00 Paris (avant le début)", "2026-08-30T07:00:00Z", "2026-08-23", "2026-08-30"],
    ["dimanche 30/08 12h00 Paris (après le début)", "2026-08-30T10:00:00Z", "2026-08-30", "2026-09-06"],
    ["lundi 31/08 09h00 Paris", "2026-08-31T07:00:00Z", "2026-08-30", "2026-09-06"],
    ["mercredi 02/09 15h00 Paris", "2026-09-02T13:00:00Z", "2026-08-30", "2026-09-06"],
  ])("%s", (_nom, iso, attendueDerniere, attendueEnCours) => {
    const d = new Date(iso);
    expect(currentOrPrevSunday(d)).toBe(attendueDerniere);
    expect(conferenceEnCours(d)).toBe(attendueEnCours);
  });

  it("la conférence en cours est toujours postérieure à la dernière passée", () => {
    const d = new Date("2026-08-30T07:00:00Z");
    expect(conferenceEnCours(d) > currentOrPrevSunday(d)).toBe(true);
  });
});
