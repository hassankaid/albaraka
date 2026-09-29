/**
 * Les textes du site vitrine sont ceux du cahier de Sidali, mot pour mot.
 *
 * « Les textes sont définitifs : les reprendre mot pour mot » (cahier §1.3).
 * Chaque texte de `contenu.ts` doit donc figurer TEL QUEL dans le document
 * d'origine — apostrophes typographiques et accolades comprises. Ce test est
 * celui qui aurait empêché d'« améliorer » une phrase sans le dire.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as C from "./contenu";
import { morceaux } from "./composants/Or";

const CAHIER = readFileSync(resolve(__dirname, "__fixtures__/cahier-site-v1.txt"), "utf-8");

/** Toutes les chaînes d'un objet, à plat. */
function chaines(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(chaines);
  if (v && typeof v === "object") return Object.values(v).flatMap(chaines);
  return [];
}

describe("textes repris mot pour mot du cahier", () => {
  const blocs = {
    MENU: C.MENU,
    ACCUEIL: C.ACCUEIL,
    RETOURS: C.RETOURS,
    RENDEZ_VOUS: C.RENDEZ_VOUS,
    MERCI: C.MERCI,
    PIED_DE_PAGE: C.PIED_DE_PAGE,
    REFERENCEMENT: C.REFERENCEMENT,
    champs: C.FORMULAIRE.champs,
    situations: C.FORMULAIRE.situations,
    bouton: C.FORMULAIRE.bouton,
    // Le seul message d'erreur que le cahier écrit lui-même (§6.1).
    exemple: C.FORMULAIRE.erreurs.email,
    // Pour l'histoire : on vérifie tout sauf les morceaux de chiffres, qui
    // sont découpés (« 340 » + « + ») et contrôlés plus bas.
    histoire: [C.HISTOIRE.etiquette, C.HISTOIRE.titre, C.HISTOIRE.nom, C.HISTOIRE.fonction, C.HISTOIRE.paragraphes, C.HISTOIRE.signature],
    mission: [
      C.MISSION.etiquette,
      C.MISSION.phrase,
      C.MISSION.engagements,
      C.MISSION.piliers.map((p) => [`${p.titre} — ${p.description}`, p.competences]),
    ],
  };

  for (const [nom, bloc] of Object.entries(blocs)) {
    it(`${nom} : chaque texte figure tel quel dans le cahier`, () => {
      for (const t of chaines(bloc)) {
        if (["maison", "cible", "coche"].includes(t)) continue; // noms d'icônes
        if (["histoire", "mission", "retours"].includes(t)) continue; // ancres
        if (C.TEXTES_HORS_CAHIER.includes(t)) continue; // réécrits le 29/09/2026 (agenda Calendly)
        expect(CAHIER.includes(t), `absent du cahier : « ${t} »`).toBe(true);
      }
    });
  }

  it("l'exemption se limite aux textes réécrits pour l'agenda, et ceux-ci ne parlent plus de rappel", () => {
    expect(C.TEXTES_HORS_CAHIER).toHaveLength(6);
    for (const t of C.TEXTES_HORS_CAHIER) {
      expect(CAHIER.includes(t), `déjà dans le cahier, l'exemption est inutile : « ${t} »`).toBe(false);
      expect(t).not.toMatch(/coordonnées|recontacte|WhatsApp|convenir d’un échange/);
    }
  });

  it("les chiffres de « Notre histoire » recomposent les lignes du cahier", () => {
    for (const c of C.HISTOIRE.chiffres) {
      const chiffre = `${c.valeur}${c.or}`;
      expect(CAHIER).toContain(`${chiffre} — ${c.libelle} (mobile : ${c.libelleMobile})`);
    }
  });

  it("la case de consentement redonne exactement la phrase du cahier", () => {
    const k = C.FORMULAIRE.consentement;
    const phrase = `${k.avant}${k.parenthese}${k.milieu}${k.lien}${k.apres}`;
    expect(CAHIER).toContain(`« ${phrase} »`);
  });

  it("l'étiquette mobile de l'accueil est celle du cahier", () => {
    expect(CAHIER).toContain(`${C.ACCUEIL.etiquette} (mobile : ${C.ACCUEIL.etiquetteMobile})`);
  });

  it("la raison sociale n'est jamais « AL BARAKA » dans le consentement", () => {
    expect(C.FORMULAIRE.consentement.parenthese).toBe("(by ETHICARENA L.L.C-FZ)");
  });
});

describe("mots en or", () => {
  it("les accolades désignent les mots en or et disparaissent à l'affichage", () => {
    expect(morceaux("Bâtissez une activité qui vous {ressemble.}")).toEqual([
      { texte: "Bâtissez une activité qui vous ", or: false },
      { texte: "ressemble.", or: true },
    ]);
    for (const t of chaines(C)) {
      const affiche = morceaux(t).map((m) => m.texte).join("");
      expect(affiche).not.toMatch(/[{}]/);
    }
  });
});
