import { describe, it, expect } from "vitest";
import { SCRIPTS, SCRIPT_DECOUVERTE, SCRIPT_TRANSFORMATION, segmenter, champsManquants, nomFichier, POINTILLES } from "./index";
import { corpsDocx } from "./docx";
import type { Bloc, DefinitionScript } from "./modele";

const textes = (b: Bloc): string[] =>
  "texte" in b ? [b.texte] : b.t === "voix" ? [b.nom, b.ton] : [];

const champsDuTexte = (def: DefinitionScript) => {
  const ids = new Set<string>();
  for (const b of def.blocs) {
    for (const t of textes(b)) for (const m of t.matchAll(/\{([A-Z]\d{2}[a-z_]*)\}/g)) ids.add(m[1]);
    if (b.t === "champ") ids.add(b.id);
  }
  return ids;
};

describe.each(Object.values(SCRIPTS))("script $titre", (def) => {
  it("chaque blanc du texte est un champ déclaré, et chaque champ apparaît dans le script", () => {
    const declares = new Set(def.champs.map((c) => c.id));
    const utilises = champsDuTexte(def);
    for (const id of utilises) expect(declares.has(id), id).toBe(true);
    for (const id of declares) expect(utilises.has(id), id).toBe(true);
  });

  it("chaque champ est dans une et une seule étape du formulaire", () => {
    const vus = def.etapes.flatMap((e) => e.champs);
    expect(new Set(vus).size).toBe(vus.length);
    expect(new Set(vus)).toEqual(new Set(def.champs.map((c) => c.id)));
  });

  it("tout est au vouvoiement et sans mention d'EthicArena", () => {
    const tout = [
      ...def.blocs.flatMap(textes),
      ...def.champs.flatMap((c) => [c.libelle, c.aide, c.exemple, c.ethique ?? ""]),
    ].join("\n");
    // Lettres accentuées comprises (« Êtes » n'est pas « tes »), mots à tirets
    // ignorés (« FÉ-LI-CI-TA-TIONS »).
    expect(tout).not.toMatch(/(?<![\p{L}-])(tu|toi|ton|ta|tes|t'as)(?![\p{L}-])/iu);
    expect(tout).not.toMatch(/ethic\s*arena/i);
  });

  it("le Word généré est un XML valide, même tout vide", () => {
    const xml = corpsDocx(def, {}, "Projet test");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    expect(doc.getElementsByTagName("parsererror").length).toBe(0);
  });
});

describe("remplissage", () => {
  it("insère la réponse à sa place, et laisse des pointillés si le champ est vide", () => {
    const segs = segmenter("« Bonjour [Prénom], c'est {D01}, comment ça va ? »", { D01: "Yasmine" }, SCRIPT_DECOUVERTE.champs);
    expect(segs.map((s) => s.texte).join("")).toBe("« Bonjour [Prénom], c'est Yasmine, comment ça va ? »");
    const vide = segmenter("c'est {D01}", {}, SCRIPT_DECOUVERTE.champs);
    expect(vide[1]).toEqual({ texte: POINTILLES, champ: "D01", vide: true });
  });

  it("reprend le prix tel quel, sans doubler le symbole €", () => {
    const champs = SCRIPT_TRANSFORMATION.champs;
    expect(segmenter("{T17}", { T17: "1 997" }, champs)[0].texte).toBe("1 997 €");
    expect(segmenter("{T17}", { T17: "2 997€" }, champs)[0].texte).toBe("2 997€");
  });

  it("le Word contient les réponses, garde les pointillés des champs vides et n'affiche pas une remise vide", () => {
    const xml = corpsDocx(SCRIPT_TRANSFORMATION, { T05: ["Question A ?", "Question B ?"], T19: "Clause exacte." }, "Nutrition");
    expect(xml).toContain("Question A ?");
    expect(xml).toContain("Clause exacte.");
    expect(xml).toContain(POINTILLES);
    expect(xml).toContain(".".repeat(50));
    expect(champsManquants(SCRIPT_TRANSFORMATION, {}).some((c) => c.id === "T18")).toBe(false);
  });

  it("nomme le fichier d'après le projet", () => {
    expect(nomFichier(SCRIPT_DECOUVERTE, "Coaching nutrition — Sarah")).toBe("SCRIPT_APPEL_DECOUVERTE_Coaching_nutrition_Sarah");
    expect(nomFichier(SCRIPT_TRANSFORMATION, "")).toBe("SCRIPT_APPEL_TRANSFORMATION");
  });
});
