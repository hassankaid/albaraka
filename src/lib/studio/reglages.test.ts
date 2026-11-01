import { describe, expect, it } from "vitest";
import {
  cleSon,
  completerReglages,
  couleursDesign,
  enTraitement,
  etapesAffichees,
  etapesDuMontage,
  lienDuMontage,
  messageErreur,
  REGLAGES_PAR_DEFAUT,
  verifierFichier,
  correctionsEnAttente,
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
    expect(r.visage).toMatchObject({ flouter: true, style: "naturel", intensite: 3 });
    // un montage réglé avec une ancienne bulle colorée repasse au flou naturel
    expect(completerReglages({ visage: { flouter: true, style: "sticker" } as never }).visage.style).toBe("naturel");
    expect(r.son).toEqual({ ameliorer: true, niveau: "normal" });
    // les fonds sonores ont été retirés : un ancien réglage est ignoré
    expect(completerReglages({ son: { fond: "nasheed" } as never }).son).toEqual({ ameliorer: true, niveau: "normal" });
    expect(r.sous_titres).toEqual({ texte: "#FFFFFF", contour: "#000000", ombre: "#000000" });
  });

  it("n'affiche l'étape de floutage que si l'élève l'a demandé", () => {
    expect(etapesDuMontage({}).map((e) => e.id)).not.toContain("floutage");
    const sansDesign = { ...REGLAGES_PAR_DEFAUT.design, actif: false };
    expect(etapesDuMontage({ visage: { ...REGLAGES_PAR_DEFAUT.visage, flouter: true }, design: sansDesign }).map((e) => e.id)).toContain(
      "floutage",
    );
  });

  it("floutage et animations ne font qu'une étape : « Animations » quand le motion design est actif", () => {
    const ids = etapesDuMontage({ visage: { ...REGLAGES_PAR_DEFAUT.visage, flouter: true } }).map((e) => e.id);
    expect(ids).toContain("motion_design");
    expect(ids).not.toContain("floutage");
    expect(etapesDuMontage({ design: { ...REGLAGES_PAR_DEFAUT.design, actif: false } }).map((e) => e.id)).not.toContain(
      "motion_design",
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

describe("écran d'attente", () => {
  const base = { reglages: {}, travail_pret: false, audio_prepare: null };
  it("suit l'étape en cours de la machine", () => {
    const { etapes, courant } = etapesAffichees({ ...base, etape: "transcription" });
    expect(etapes[courant].id).toBe("transcription");
  });

  it("quand seul le rendu est relancé, la préparation est déjà cochée", () => {
    const m = { ...base, travail_pret: true, audio_prepare: "normal" };
    expect(etapesAffichees({ ...m, etape: "file" }).etapes[etapesAffichees({ ...m, etape: "file" }).courant].id).toBe(
      "motion_design",
    );
    const sansDesign = { ...m, reglages: { design: { ...REGLAGES_PAR_DEFAUT.design, actif: false } }, etape: "file" };
    expect(etapesAffichees(sansDesign).etapes[etapesAffichees(sansDesign).courant].id).toBe("incrustation");
    const flou = { ...m, reglages: { visage: { ...REGLAGES_PAR_DEFAUT.visage, flouter: true } }, etape: "reception" };
    expect(etapesAffichees(flou).etapes[etapesAffichees(flou).courant].id).toBe("motion_design");
  });

  it("si le son a changé, tout est refait", () => {
    const m = { ...base, travail_pret: true, audio_prepare: "normal", reglages: { son: { ameliorer: true, niveau: "fort" as const } } };
    expect(cleSon(m.reglages)).toBe("fort");
    expect(etapesAffichees({ ...m, etape: "son" }).etapes[etapesAffichees({ ...m, etape: "son" }).courant].id).toBe("son");
  });

  it("coupes changées seulement : le son renettoyé n'affiche pas une transcription à refaire", () => {
    const m = { ...base, travail_pret: true, audio_prepare: "normal", reglages: {} };
    const r = etapesAffichees({ ...m, etape: "son" });
    expect(r.etapes[r.courant].id).toBe("coupes");
  });
});

describe("motion design", () => {
  it("est actif par défaut, palette Or & Noir, sans carte tant qu'aucun prénom n'est donné", () => {
    expect(REGLAGES_PAR_DEFAUT.design).toMatchObject({ actif: true, palette: "or_noir", prenom: "" });
  });

  it("donne les couleurs de la palette choisie, ou les couleurs libres en « Personnalisé »", () => {
    const d = REGLAGES_PAR_DEFAUT.design;
    expect(couleursDesign({ ...d, palette: "emeraude" })).toMatchObject({ principale: "#10B981", fond: "#0B2E24" });
    expect(couleursDesign({ ...d, palette: "personnalise", principale: "#123456", fond: "#FFFFFF", texte: "#000000" })).toEqual({
      principale: "#123456",
      fond: "#FFFFFF",
      texte: "#000000",
    });
  });
});

describe("motion design Hyperframes", () => {
  it("laisse l'IA choisir le style par défaut, et garde un style choisi par l'élève", () => {
    expect(REGLAGES_PAR_DEFAUT.design.style).toBe("auto");
    expect(completerReglages({ design: { ...REGLAGES_PAR_DEFAUT.design, style: "sobre" } }).design.style).toBe("sobre");
    // un montage enregistré avant l'arrivée du style passe en « auto »
    const ancien = { ...REGLAGES_PAR_DEFAUT.design } as Partial<typeof REGLAGES_PAR_DEFAUT.design>;
    delete ancien.style;
    expect(completerReglages({ design: ancien as typeof REGLAGES_PAR_DEFAUT.design }).design.style).toBe("auto");
  });

  it("affiche la vérification de la mise en page seulement avec le motion design", () => {
    expect(etapesDuMontage({}).map((e) => e.id)).toContain("verification");
    const sans = etapesDuMontage({ design: { ...REGLAGES_PAR_DEFAUT.design, actif: false } }).map((e) => e.id);
    expect(sans).not.toContain("verification");
    expect(sans).not.toContain("motion_design");
  });

  it("Voix off : la réception est celle de la voix, et le choix des plans apparaît", () => {
    const ids = etapesDuMontage({}, "voix_off");
    expect(ids[0].nom).toBe("Réception de ta voix");
    expect(ids.map((e) => e.id)).toContain("plans");
    expect(etapesDuMontage({}).map((e) => e.id)).not.toContain("plans");
  });
});

describe("erreurs du montage", () => {
  it("garde les messages prévus et simplifie les pannes techniques", () => {
    expect(messageErreur("La vidéo dépasse 5 minutes. Coupe-la en plusieurs parties.")).toEqual({
      texte: "La vidéo dépasse 5 minutes. Coupe-la en plusieurs parties.",
      detail: null,
    });
    const t = messageErreur("Erreur pendant le montage (KeyError: 'duration')");
    expect(t.texte).toMatch(/souci technique/);
    expect(t.detail).toBe("KeyError: 'duration'");
  });
});

describe("version gratuite (29/10/2026)", () => {
  it("annonce la durée maximale en mots simples", async () => {
    const { minutes, messageDureeGratuite } = await import("./reglages");
    expect([minutes(60), minutes(120), minutes(45)]).toEqual(["1 minute", "2 minutes", "45 secondes"]);
    expect(messageDureeGratuite(60)).toContain("La version gratuite accepte 1 minute de vidéo");
  });
});

describe("corrections en attente", () => {
  const base = completerReglages({});
  it("ne signale rien sans changement, ni pour un ancien fond sonore", () => {
    expect(correctionsEnAttente(base, null)).toEqual([]);
    expect(correctionsEnAttente(base, { ...base })).toEqual([]);
    expect(correctionsEnAttente({ son: { fond: "nasheed" } as never }, base)).toEqual([]);
  });
  it("nomme ce qui attend le prochain montage", () => {
    const attente = {
      ...base,
      sous_titres: { ...base.sous_titres, corrections: [{ small_ia: "a", big_ia: "b", small: "a", big: "c" }] },
      coupes: { ...base.coupes, plages: [[0, 10]] as [number, number][] },
      son: { ...base.son, niveau: "fort" as const },
    };
    expect(correctionsEnAttente(base, attente)).toEqual(["Sous-titres", "Coupes", "Réglages"]);
    expect(correctionsEnAttente(base, { ...base, voix_off: { remplacements: { "1": "x" } } })).toEqual(["Plans"]);
  });
});

describe("format hybride", () => {
  it("passe par le choix des plans et le floutage, et revient à sa page de réglages", () => {
    const ids = etapesDuMontage({ visage: { flouter: true } as never, design: { actif: false } as never }, "hybride").map((e) => e.id);
    expect(ids).toContain("plans");
    expect(ids).toContain("floutage");
    expect(etapesDuMontage({}, "face_camera").map((e) => e.id)).not.toContain("plans");
    expect(lienDuMontage({ id: "x", statut: "pret", lance: false, outil: "hybride" })).toBe("/studio/hybride?id=x");
  });
});
