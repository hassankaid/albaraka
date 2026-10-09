import { describe, expect, it } from "vitest";
import {
  completerReglages,
  enTraitement,
  etapesDuMontage,
  lienDuMontage,
  REGLAGES_PAR_DEFAUT,
  verifierFichier,
} from "./reglages";

describe("import d'une vidéo", () => {
  it("accepte MP4 et MOV jusqu'à 1 Go", () => {
    expect(verifierFichier({ name: "a.mp4", type: "video/mp4", size: 5e6 })).toBeNull();
    expect(verifierFichier({ name: "IMG_0001.MOV", type: "video/quicktime", size: 9e8 })).toBeNull();
    // certains navigateurs ne donnent pas le type : l'extension suffit
    expect(verifierFichier({ name: "rush.mov", type: "", size: 1e6 })).toBeNull();
  });

  it("refuse les autres formats et ce qui dépasse 1 Go", () => {
    expect(verifierFichier({ name: "a.avi", type: "video/x-msvideo", size: 1e6 })).toMatch(/MP4 ou MOV/);
    expect(verifierFichier({ name: "a.mp4", type: "video/mp4", size: 1024 ** 3 + 1 })).toMatch(/1 Go/);
  });
});

describe("réglages", () => {
  it("complète les réglages enregistrés avec les valeurs par défaut du cahier des charges", () => {
    expect(completerReglages({})).toEqual(REGLAGES_PAR_DEFAUT);
    const r = completerReglages({ visage: { flouter: true } as never });
    expect(r.visage).toMatchObject({ flouter: true, style: "flou", couleur: "#C9A45C", intensite: 3 });
    expect(r.son).toEqual({ ameliorer: true, niveau: "normal" });
    expect(r.sous_titres).toEqual({ texte: "#FFFFFF", contour: "#000000", ombre: "#000000" });
  });

  it("n'affiche l'étape de floutage que si l'élève l'a demandé", () => {
    expect(etapesDuMontage({}).map((e) => e.id)).not.toContain("floutage");
    expect(etapesDuMontage({ visage: { ...REGLAGES_PAR_DEFAUT.visage, flouter: true } }).map((e) => e.id)).toContain(
      "floutage",
    );
  });
});

describe("parcours d'un montage", () => {
  it("une préparation lancée par l'élève s'affiche comme un montage en cours", () => {
    expect(enTraitement({ statut: "preparation", lance: true })).toBe(true);
    expect(enTraitement({ statut: "preparation", lance: false })).toBe(false);
    expect(enTraitement({ statut: "en_cours", lance: true })).toBe(true);
    expect(enTraitement({ statut: "termine", lance: false })).toBe(false);
  });

  it("un montage pas encore lancé renvoie vers ses réglages, les autres vers leur écran", () => {
    expect(lienDuMontage({ id: "x", statut: "pret", lance: false })).toBe("/studio/face-camera?id=x");
    expect(lienDuMontage({ id: "x", statut: "preparation", lance: false })).toBe("/studio/face-camera?id=x");
    expect(lienDuMontage({ id: "x", statut: "preparation", lance: true })).toBe("/studio/montage/x");
    expect(lienDuMontage({ id: "x", statut: "termine", lance: false })).toBe("/studio/montage/x");
  });
});
