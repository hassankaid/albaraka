import { describe, expect, it } from "vitest";
import {
  appliquer,
  corriger,
  corrigesAEnregistrer,
  corrigesOrphelins,
  indexAuTemps,
  motsCorriges,
  nettoyer,
  sousTitreVide,
  type SousTitre,
} from "./sousTitres";

const IA: SousTitre[] = [
  { small: "merci à", big: "Sidaly", start: 0, end: 1 },
  { small: "avec Sidaly,", big: "demain", start: 1, end: 2 },
  { small: "de la", big: "vie", start: 2, end: 3 },
];

describe("nettoyer", () => {
  it("retire balises, accolades et sauts de ligne", () => {
    expect(nettoyer("merci {\\b1}à\n <i>toi</i>  ", 90)).toBe("merci b1 à i toi /i");
  });
  it("coupe à la longueur maximale", () => {
    expect(nettoyer("abcdef", 3)).toBe("abc");
  });
});

describe("appliquer", () => {
  it("sans correction, renvoie les sous-titres de l'IA", () => {
    expect(appliquer(IA, [])).toEqual(IA);
    expect(appliquer(IA, null)).toEqual(IA);
  });

  it("corrige le sous-titre visé et le même mot partout ailleurs", () => {
    const out = appliquer(IA, [{ small_ia: "merci à", big_ia: "Sidaly", small: "merci à", big: "Sidali" }]);
    expect(out.map((c) => [c.small, c.big])).toEqual([
      ["merci à", "Sidali"],
      ["avec Sidali,", "demain"],
      ["de la", "vie"],
    ]);
    expect(out[1].start).toBe(1);
  });

  it("ne reprend pas les petits mots ailleurs (moins de 4 lettres)", () => {
    const out = appliquer(IA, [{ small_ia: "merci à", big_ia: "Sidaly", small: "merci du", big: "Sidaly" }]);
    expect(out[0].small).toBe("merci du");
    expect(out[2].small).toBe("de la");
  });

  it("un mot corrigé de deux façons n'est repris nulle part ailleurs", () => {
    const carte = motsCorriges([
      { small_ia: "a", big_ia: "Sidaly", small: "a", big: "Sidali" },
      { small_ia: "b", big_ia: "Sidaly", small: "b", big: "Sidaali" },
    ]);
    expect(carte.has("sidaly")).toBe(false);
  });

  it("reprend les mots corrigés après un regroupement (coupes changées)", () => {
    const corrections = [{ small_ia: "ancien", big_ia: "Sidaly", small: "ancien", big: "Sidali" }];
    const regroupes: SousTitre[] = [{ small: "merci à Sidaly", big: "demain", start: 0, end: 2 }];
    expect(appliquer(regroupes, corrections)[0].small).toBe("merci à Sidali");
    expect(corrigesOrphelins(regroupes, corrections)).toBe(1);
  });

  it("ignore une correction vide", () => {
    expect(appliquer(IA, [{ small_ia: "de la", big_ia: "vie", small: " ", big: "" }])[2]).toEqual(IA[2]);
  });
});

describe("corriger et enregistrer", () => {
  it("remplace la correction précédente et l'efface si on revient au texte de l'IA", () => {
    let c = corriger([], IA[2], { small: "de ta", big: "vie" });
    c = corriger(c, IA[2], { small: "de ta ", big: "vie !" });
    expect(c).toHaveLength(1);
    expect(c[0].big).toBe("vie !");
    expect(corriger(c, IA[2], { small: "de la", big: "vie" })).toEqual([]);
  });

  it("n'enregistre que les corrections utiles, nettoyées", () => {
    const c = [
      { small_ia: "de la", big_ia: "vie", small: " de ta ", big: "vie" },
      { small_ia: "merci à", big_ia: "Sidaly", small: "merci à", big: "Sidaly " },
      { small_ia: "autre", big_ia: "chose", small: "x", big: "y" },
    ];
    expect(corrigesAEnregistrer(IA, c)).toEqual([{ small_ia: "de la", big_ia: "vie", small: "de ta", big: "vie" }]);
  });
});

describe("indexAuTemps", () => {
  it("trouve le sous-titre affiché", () => {
    expect(indexAuTemps(IA, 0.5)).toBe(0);
    expect(indexAuTemps(IA, 1.5)).toBe(1);
    expect(indexAuTemps(IA, 9)).toBe(-1);
  });
});

it("sousTitreVide", () => {
  expect(sousTitreVide({ small: " ", big: "" })).toBe(true);
  expect(sousTitreVide({ small: "", big: "vie" })).toBe(false);
});
