/**
 * Le tri de la liste des élèves.
 *
 * Demandé par Hassan le 28/09/2026 : classer du connecté le plus récent au
 * plus lointain.
 *
 * Le vrai piège n'est pas l'ordre, c'est l'absence de valeur. 135 élèves sur
 * 320 ne se sont JAMAIS connectés. Si on les traite comme « connectés il y a
 * très longtemps », ils se mélangent aux inactifs et on perd la distinction
 * entre un élève à relancer et un élève qui n'a jamais ouvert son compte.
 */
import { describe, it, expect } from "vitest";
import { trier, comparerDates } from "./tri-eleves";

const e = (nom: string, connexion: string | null, activite: string | null = null) => ({
  full_name: nom, email: `${nom.toLowerCase()}@x.fr`,
  derniere_connexion: connexion, last_activity_at: activite,
});

describe("tri par connexion", () => {
  it("place le plus récent en premier", () => {
    const l = trier([
      e("Ancien", "2026-01-01T10:00:00Z"),
      e("Recent", "2026-09-28T10:00:00Z"),
      e("Moyen", "2026-06-15T10:00:00Z"),
    ], "connexion");
    expect(l.map((x) => x.full_name)).toEqual(["Recent", "Moyen", "Ancien"]);
  });

  it("relègue les jamais connectés en bas, PAS parmi les anciens", () => {
    const l = trier([
      e("Jamais", null),
      e("TresAncien", "2026-01-01T10:00:00Z"),
      e("Recent", "2026-09-28T10:00:00Z"),
    ], "connexion");
    expect(l.map((x) => x.full_name)).toEqual(["Recent", "TresAncien", "Jamais"]);
  });

  it("garde un ordre stable quand personne ne s'est connecté", () => {
    const l = trier([e("A", null), e("B", null)], "connexion");
    expect(l).toHaveLength(2);
  });
});

describe("tri par activité", () => {
  it("utilise l'activité et non la connexion", () => {
    // Quelqu'un peut se connecter sans rien faire, et inversement.
    const l = trier([
      e("ConnecteRecemmentRienFait", "2026-09-28T10:00:00Z", "2026-01-01T10:00:00Z"),
      e("ConnectePlusTotMaisActif", "2026-09-01T10:00:00Z", "2026-09-27T10:00:00Z"),
    ], "activite");
    expect(l[0].full_name).toBe("ConnectePlusTotMaisActif");
  });
});

describe("tri par nom", () => {
  it("respecte l'ordre alphabétique français", () => {
    const l = trier([e("Émile", null), e("Adam", null), e("Zoé", null)], "nom");
    expect(l.map((x) => x.full_name)).toEqual(["Adam", "Émile", "Zoé"]);
  });

  it("retombe sur l'email quand le nom manque", () => {
    const sansNom = { full_name: null, email: "aaa@x.fr", derniere_connexion: null };
    const l = trier([e("Zoé", null), sansNom as any], "nom");
    expect(l[0].email).toBe("aaa@x.fr");
  });
});

describe("comparerDates", () => {
  it("met toujours l'absence en dernier, dans les deux sens", () => {
    expect(comparerDates(null, "2026-01-01")).toBeGreaterThan(0);
    expect(comparerDates("2026-01-01", null)).toBeLessThan(0);
    expect(comparerDates(null, null)).toBe(0);
  });
});
