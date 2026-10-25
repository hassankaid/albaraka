import { describe, expect, it } from "vitest";
import { avecVoix, compterCorrections, duree, mmss, prenom, recalculer, texteEleve, tourA, type Analyse, type Tour } from "./retour";

const ia: Analyse = {
  erreurs_critiques: [],
  etapes: [
    { code: "P1", nom: "Connexion", poids: 10, note: 8, justification: "Rappel du formulaire fait." },
    { code: "P3A", nom: "Budget", poids: 25, note: 8, justification: "Fourchette obtenue." },
    { code: "P3B/D", nom: "Profil", poids: 15, note: 6, justification: "Conjoint non abordé." },
    { code: "P4", nom: "Motiver + Invitation", poids: 50, note: 8, justification: "Présence confirmée." },
  ],
  regles: [],
  objections: [],
  analyse_globale: "Appel fluide.",
  points_forts: [{ titre: "Fourchette de budget", pourquoi: "Sans pression.", citation: "plutôt vers 500, 1000", horodatage: 241 }],
  axes: [
    { titre: "Le conjoint", probleme: "Pas abordé.", formulation_ideale: "« Ta famille sait que tu t'intéresses à ça ? »" },
    { titre: "Le temps", probleme: "Seuil non rappelé.", formulation_ideale: "Il faut 2-3h par jour." },
  ],
  conseil_prioritaire: { etape: "P3B/D", texte: "Pose la question du conjoint." },
  encouragement: "Continue comme ça.",
  note_etapes: 77,
  penalite: 3,
  note_globale: 74,
  alerte_duree: "Appel de 6 min 24 : trop court (norme 8 à 15 min)",
};

describe("la note", () => {
  it("se recalcule avec les poids, moins la pénalité", () => {
    expect(recalculer(ia).note_etapes).toBe(77);
    expect(recalculer(ia).note_globale).toBe(74);
    const corrige = recalculer({ ...ia, etapes: ia.etapes.map((e) => (e.code === "P3B/D" ? { ...e, note: 8 } : e)) });
    expect(corrige.note_etapes).toBe(80);
    expect(corrige.note_globale).toBe(77);
    expect(recalculer({ ...ia, penalite: 0 }).note_globale).toBe(77);
  });
});

describe("les corrections du coach", () => {
  it("compte chaque note, texte ou axe changé", () => {
    expect(compterCorrections(ia, ia)).toBe(0);
    const coach: Analyse = {
      ...ia,
      etapes: ia.etapes.map((e) => (e.code === "P3B/D" ? { ...e, note: 7 } : e)),
      axes: ia.axes.map((x, i) => (i === 1 ? { ...x, retire: true } : x)),
      penalite: 0,
    };
    expect(compterCorrections(ia, coach)).toBe(3);
  });
});

describe("le texte pour l'élève", () => {
  it("reprend la note finale, les points forts et les axes gardés", () => {
    const t = texteEleve({ ...ia, axes: ia.axes.map((x, i) => (i === 1 ? { ...x, retire: true } : x)) }, "Yanis");
    expect(t.startsWith("Note : 74/100 (77 sur les étapes, −3 car le prospect n'a pas été prévenu de l'enregistrement). Appel de 6 min 24")).toBe(true);
    expect(t).toContain("Salam Yanis");
    expect(t).toContain("1. Le conjoint : Pas abordé.");
    expect(t).toContain("À dire la prochaine fois : « Ta famille sait que tu t'intéresses à ça ? »");
    expect(t).not.toContain("Le temps");
    expect(t).toContain("• P3B/D Profil : 6/10");
  });
});

describe("outils", () => {
  it("formate les durées et les prénoms", () => {
    expect(mmss(384.1)).toBe("6:24");
    expect(duree(384.1)).toBe("6 min 24");
    expect(prenom("YANIS BENALI")).toBe("Yanis");
  });
  it("inverse les voix et retrouve le tour en cours", () => {
    const tours: Tour[] = [
      { n: 1, loc: "PROSPECT", texte: "Allô", t0: 6.6, t1: 7 },
      { n: 2, loc: "SETTER", texte: "Salam", t0: 7.2, t1: 8 },
    ];
    expect(avecVoix(tours, true).map((t) => t.loc)).toEqual(["SETTER", "PROSPECT"]);
    expect(tourA(tours, 7.5)).toBe(2);
    expect(tourA(tours, 1)).toBe(-1);
  });
});
