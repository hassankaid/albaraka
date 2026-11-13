// ─────────────────────────────────────────────────────────────────────────
// Les textes publiés sont-ils EXACTEMENT ceux qu'Ethicarena a validés ?
//
// Le cahier des charges est formel : « repris mot pour mot, sans
// reformulation ». Ce n'est pas une exigence de style. Un texte publié qui
// diffère de celui qu'a validé le juriste n'engage plus la société de la
// même façon, et personne ne s'en apercevrait — une page légale, on ne la
// relit jamais après la mise en ligne.
//
// D'où cette comparaison ligne à ligne avec le document d'origine, conservé
// tel quel à côté. Une virgule déplacée fait échouer la suite.
//
// Si le juriste publie une version 2, il faut remplacer le fichier de
// référence ET les textes : le test refuse de laisser les deux diverger.
// ─────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MENTIONS_LEGALES,
  POLITIQUE_CONFIDENTIALITE,
  CGV,
  PAGES_LEGALES,
  DATE_MISE_A_JOUR,
  LIGNES_HORS_DOCUMENT,
  DATE_CGV,
} from "./textes";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/legal/__fixtures__/cahier-des-charges-v1.txt"),
  "utf-8",
);
const lignesSource = source.split("\n").map((l) => l.trim()).filter(Boolean);

// CGV version 3 (13/11/2026) : le document de Sidali (CGV corrigées du 12/11/2026).
const sourceCgvV3 = readFileSync(
  resolve(process.cwd(), "src/pages/legal/__fixtures__/cgv-v3-sidali-2026-11-12.txt"),
  "utf-8",
);
const lignesCgvV3 = sourceCgvV3.split("\n").map((l) => l.trim().replace(/^•\s*/, "").trim()).filter(Boolean);

/** Le document contient-il cette ligne, telle quelle ? */
const presente = (ligne: string) => lignesSource.includes(ligne);

describe("fidélité au document d'Ethicarena", () => {
  it.each([
    ["mentions légales", MENTIONS_LEGALES],
    ["politique de confidentialité", POLITIQUE_CONFIDENTIALITE],
  ])("chaque ligne des %s figure mot pour mot dans le document", (_nom, page) => {
    // Exemptées, elles seules : les lignes réécrites le 30/09/2026 (retrait du bandeau cookies).
    const absentes = page.lignes.filter((l) => !presente(l) && !LIGNES_HORS_DOCUMENT.includes(l));
    expect(absentes, `lignes introuvables dans le document source :\n${absentes.join("\n")}`)
      .toEqual([]);
  });

  it("chaque ligne des CGV (version 3) figure mot pour mot dans le document de Sidali, et rien n'y manque", () => {
    const absentes = CGV.lignes.filter((l) => !lignesCgvV3.includes(l));
    expect(absentes, `lignes introuvables dans les CGV corrigées :\n${absentes.join("\n")}`).toEqual([]);
    const debut = lignesCgvV3.findIndex((l) => l.startsWith("Article 1 –"));
    const fin = lignesCgvV3.findIndex((l) => l.startsWith("ETHICARENA L.L.C-FZ — Licence"));
    expect(CGV.lignes).toEqual(lignesCgvV3.slice(debut, fin));
  });

  it("ne perd aucun article des CGV — de 1 à 19", () => {
    for (let n = 1; n <= 19; n++) {
      const trouve = CGV.lignes.some((l) => l.startsWith(`Article ${n} `));
      expect(trouve, `l'article ${n} des CGV manque`).toBe(true);
    }
  });

  it("ne perd aucune section de la politique de confidentialité — de 1 à 14", () => {
    for (let n = 1; n <= 14; n++) {
      const trouve = POLITIQUE_CONFIDENTIALITE.lignes.some((l) => l.startsWith(`${n}. `));
      expect(trouve, `la section ${n} de la politique manque`).toBe(true);
    }
  });

  it("ne perd aucune section des mentions légales — de 1 à 8", () => {
    for (let n = 1; n <= 8; n++) {
      const trouve = MENTIONS_LEGALES.lignes.some((l) => l.startsWith(`${n}. `));
      expect(trouve, `la section ${n} des mentions légales manque`).toBe(true);
    }
  });
});

describe("ce qui rendrait les pages juridiquement fausses", () => {
  it("n'annonce plus un déblocage progressif des contenus (CGV version 2, 02/11/2026)", () => {
    // Le client a accès à tout dès l'ouverture de son accès ; seul un impayé le suspend.
    const texte = CGV.lignes.join("\n");
    expect(texte).not.toMatch(/déverrouill|au fur et à mesure|progressivement/);
    expect(texte).toContain("la totalité des contenus et des outils");
    expect(DATE_CGV).toBe("13/11/2026");
  });

  it("ne promet plus un consentement aux cookies que le site ne demande plus", () => {
    // Depuis le 30/09/2026 le pixel Meta se charge sans bandeau (décision de
    // Hassan). La politique doit dire ce que le site fait, pas l'inverse.
    const texte = POLITIQUE_CONFIDENTIALITE.lignes.join("\n");
    expect(texte).not.toMatch(/qu'après votre consentement|uniquement avec votre consentement|Gérer les cookies|bandeau/);
    expect(texte).toContain("sans demande de consentement préalable");
    expect(texte).toContain("Meta Platforms");
    expect(POLITIQUE_CONFIDENTIALITE.miseAJour).toBe("30/09/2026");
  });

  it("n'appelle jamais AL BARAKA une société", () => {
    // Point 2 de la recette. AL BARAKA est une marque d'Ethicarena ; la
    // présenter en raison sociale désigne au client une entité qui n'existe pas.
    for (const page of PAGES_LEGALES) {
      for (const l of page.lignes) {
        expect(l).not.toMatch(/AL BARAKA (L\.?L\.?C|SAS|SARL|Inc)/i);
      }
    }
  });

  it("nomme la société sous sa forme exacte", () => {
    const tout = PAGES_LEGALES.flatMap((p) => p.lignes).join(" ");
    expect(tout).toContain("ETHICARENA L.L.C-FZ");
    // Les variantes approximatives sont le point 2 de la recette.
    expect(tout).not.toContain("Ethicarena LLC");
    expect(tout).not.toContain("ETHICARENA LLC");
  });

  it("ne laisse aucune date à compléter", () => {
    // « [JJ/MM/2026] » doit être remplacé par la date réelle de mise en ligne.
    for (const page of PAGES_LEGALES) {
      for (const l of page.lignes) {
        expect(l, `un gabarit de date subsiste : ${l}`).not.toContain("JJ/MM");
      }
    }
    expect(DATE_MISE_A_JOUR).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("ne mentionne aucune société étrangère au dossier", () => {
    // Point 14 de la recette : un modèle recopié citait « Mindmint LLC »
    // sur l'ancien site. Ce genre d'erreur se propage par copier-coller.
    const tout = PAGES_LEGALES.flatMap((p) => p.lignes).join(" ");
    for (const intrus of ["Mindmint", "Systeme.io", "systeme.io"]) {
      expect(tout, `« ${intrus} » n'a rien à faire ici`).not.toContain(intrus);
    }
  });

  it("garde les chemins cités dans les textes eux-mêmes", () => {
    // La politique renvoie au lien « Gérer les cookies » ; les CGV renvoient
    // à la politique. Renommer une page rendrait ces renvois faux.
    expect(MENTIONS_LEGALES.chemin).toBe("/mentions-legales");
    expect(POLITIQUE_CONFIDENTIALITE.chemin).toBe("/politique-de-confidentialite");
    expect(CGV.chemin).toBe("/conditions-generales-de-vente");
  });
});
