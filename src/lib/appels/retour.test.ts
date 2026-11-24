import { describe, expect, it } from "vitest";
import { avecVoix, compterCorrections, duree, mmss, prenom, recalculer, texteEleve, tourA, type Analyse, type Axe, type Tour } from "./retour";

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
    expect(t).toContain("Salamou ‘alaykoum Yanis");
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

describe("étape à liste (fin d'appel, référentiel v0.5)", () => {
  it("le texte de l'élève dit ce qui manquait", () => {
    const base = texteEleve(ia, "Yanis");
    const avec = texteEleve(
      {
        ...ia,
        etapes: ia.etapes.map((e, i) =>
          i === ia.etapes.length - 1
            ? { ...e, note: 3, justification: "3 explications sur 8 données au prospect. Il manquait : application Zoom.", liste: [{ n: 1, libelle: "application Zoom", fait: "non" as const }] }
            : e,
        ),
      },
      "Yanis",
    );
    expect(base).not.toContain("Il manquait");
    expect(avec).toContain(": 3/10 (3 explications sur 8 données au prospect. Il manquait : application Zoom)");
  });
});

describe("format de la coach (référentiel v0.6, 24/11/2026)", () => {
  const coach: Analyse = {
    ...ia,
    points_forts: [],
    axes: [],
    analyse_globale: "",
    retour: {
      verdict: "Globalement, ton appel est plutôt pas mal 👏",
      point_principal: null,
      reussites: [{ texte: "La question du temps est bien amenée." }, { texte: "Retirée", retire: true }],
      points: [
        { titre: "Le conjoint", constat: "Tu as demandé « il est au courant ? ».", formulation: "👉 « Est-ce qu'aujourd'hui ton époux te soutient dans ce projet ? »" },
        { titre: "Pas de phrases administratives", constat: "Évite « je vais reprendre le dossier ».", formulation: "", moins_grave: true },
        { titre: "Point retiré", constat: "x", retire: true },
      ],
      priorites: ["Le conjoint.", "Une discussion fluide.", "Finir par une question."],
    },
  };

  it("le texte de l'élève suit sa structure, sans note ni étapes (décision 1)", () => {
    const t = texteEleve(coach, "Yanis");
    expect(t.startsWith("📞 Analyse de ton appel\n\nSalamou ‘alaykoum Yanis,\n\nGlobalement, ton appel est plutôt pas mal 👏")).toBe(true);
    expect(t).toContain("✅ Ce qui a bien marché\n• La question du temps est bien amenée.");
    expect(t).not.toContain("Retirée");
    expect(t).toContain("1. Le conjoint\nTu as demandé « il est au courant ? ».\n👉 « Est-ce qu'aujourd'hui ton époux te soutient dans ce projet ? »");
    expect(t).not.toContain("👉 👉");
    expect(t).toContain("2. Pas de phrases administratives (moins grave)");
    expect(t).not.toContain("Point retiré");
    expect(t).toContain("🎯 Pour ton prochain appel, en priorité\n1. Le conjoint.");
    expect(t).not.toMatch(/\/100|\/10|Note/);
  });

  it("le point principal remplace le verdict seul quand il domine l'appel", () => {
    const t = texteEleve({ ...coach, retour: { ...coach.retour!, verdict: "", reussites: [], point_principal: { titre: "il y avait des signaux de disqualification", texte: "Son budget." } } }, "Yanis");
    expect(t).toContain("⚠️ Le point principal : il y avait des signaux de disqualification\nSon budget.");
    expect(t).not.toContain("Ce qui a bien marché");
  });

  it("compte les corrections du coach dans le retour", () => {
    expect(compterCorrections(coach, coach)).toBe(0);
    const r = structuredClone(coach.retour!);
    r.verdict = "L'appel est très déstructuré.";
    r.points[1].retire = true;
    r.points.push({ titre: "Son accent", constat: "À aborder directement." });
    r.priorites[2] = "Pas de blanc.";
    expect(compterCorrections(coach, { ...coach, retour: r })).toBe(4);
  });
});

describe("analyses incomplètes de l'IA", () => {
  it("un axe sans « problème » ne fait plus planter la page (appel du 04/11)", () => {
    const axe = { titre: "Garder l'offre pour après", formulation_ideale: "Tu le verras en conférence." } as unknown as Axe;
    const t = texteEleve({ ...ia, axes: [axe] }, "Samira");
    expect(t).toContain("1. Garder l'offre pour après\n   À dire la prochaine fois : « Tu le verras en conférence. »");
  });
});
