// La liste déroulante du tableau de bord avait perdu la conférence du jour :
// elle s'arrêtait à la dernière conférence PASSÉE, alors que tous les inscrits
// de la semaine sont rattachés à celle qui vient. Ces cas verrouillent la
// distinction entre les deux.
import { describe, expect, it } from "vitest";
import { buildConferenceList, conferenceEnCours, currentOrPrevSunday } from "./conferenceFilter";

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

describe("sélection par défaut du tableau de bord", () => {
  // La liste déroulante monte jusqu'à la conférence qui collecte encore des
  // inscriptions, mais on ouvre sur la dernière qui a EU LIEU : c'est celle
  // dont on vient lire les résultats.
  function listeEtDefaut(ref: Date) {
    const borneHaute = conferenceEnCours(ref);
    const liste = buildConferenceList(ref, 26, 2).filter((d) => d <= borneHaute).reverse();
    const derniereTenue = currentOrPrevSunday(ref);
    return { liste, parDefaut: liste.includes(derniereTenue) ? derniereTenue : liste[0] };
  }

  it.each([
    ["samedi 29/08 (veille)", "2026-08-29T10:00:00Z", "2026-08-23", "2026-08-30"],
    ["dimanche 30/08 à 10h00, avant le début", "2026-08-30T08:00:00Z", "2026-08-23", "2026-08-30"],
    ["dimanche 30/08 à 11h00 pile", "2026-08-30T09:00:00Z", "2026-08-30", "2026-09-06"],
    ["dimanche 30/08 à 15h00", "2026-08-30T13:00:00Z", "2026-08-30", "2026-09-06"],
    ["mardi 01/09", "2026-09-01T10:00:00Z", "2026-08-30", "2026-09-06"],
  ])("%s → défaut %s", (_nom, iso, attenduDefaut, attendueEnTete) => {
    const { liste, parDefaut } = listeEtDefaut(new Date(iso));
    expect(parDefaut).toBe(attenduDefaut);
    // La conférence à venir reste proposée, elle n'est simplement pas choisie.
    expect(liste[0]).toBe(attendueEnTete);
  });
});
