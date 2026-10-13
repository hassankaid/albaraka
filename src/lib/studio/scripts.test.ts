import { describe, expect, it } from "vitest";
import { decouperLot, memeScript, motsRecherche, normaliserRecherche, proposerAccroche, proposerTitre, typographie, uniformiserTexte } from "./scripts";

describe("bibliothèque de scripts", () => {
  it("cherche sans accents ni majuscules, comme la base", () => {
    expect(normaliserRecherche("L’ŒUVRE  Échouée")).toBe("l'oeuvre echouee");
    expect(motsRecherche("  Échec, salariat a ")).toEqual(["echec", "salariat"]);
    expect(motsRecherche("100%_x")).toEqual(["100x"]);
  });

  it("remet au propre un texte collé depuis Word ou un PDF", () => {
    expect(uniformiserTexte("Ligne 1  \r\n\r\n\r\n\r\n  Ligne   2  ")).toBe("Ligne 1\n\nLigne 2");
  });

  it("propose un titre et une accroche à partir de la première phrase", () => {
    const texte = "Tu travailles 40 heures par semaine pour un rêve qui n'est pas le tien ? Voici pourquoi.";
    expect(proposerAccroche(texte)).toBe("Tu travailles 40 heures par semaine pour un rêve qui n'est pas le tien ?");
    expect(proposerTitre(texte).length).toBeLessThanOrEqual(61);
    expect(proposerTitre("Court.")).toBe("Court");
    expect(proposerAccroche("Eh ! L'homme qui attend le tir parfait finit sa vie avec un chargeur plein.")).toBe(
      "Eh ! L'homme qui attend le tir parfait finit sa vie avec un chargeur plein.",
    );
  });

  it("garde les guillemets et la ponctuation collés à leur mot", () => {
    expect(typographie("dire : « Alhamdoulilah » ?")).toBe("dire\u00a0: «\u00a0Alhamdoulilah\u00a0»\u00a0?");
  });

  it("découpe un lot de scripts séparés par ---", () => {
    const lot = decouperLot("Titre : Le salariat\nPremier script.\n---\nDeuxième script ici.\n\n-----\n\n");
    expect(lot).toEqual([
      { titre: "Le salariat", texte: "Premier script." },
      { titre: "Deuxième script ici", texte: "Deuxième script ici." },
    ]);
  });

  it("reconnaît une voix off partie d'un script de la bibliothèque", () => {
    const original = "Tu travailles 40 heures par semaine pour un rêve qui n'est pas le tien. Arrête et construis le tien.";
    expect(memeScript(original, original)).toBe(true);
    expect(memeScript(original, original.replace("40 heures", "35 heures") + " Abonne-toi !")).toBe(true);
    expect(memeScript(original, "Un tout autre texte sur la prière et la patience, rien à voir.")).toBe(false);
    expect(memeScript("", "x")).toBe(false);
  });
});
