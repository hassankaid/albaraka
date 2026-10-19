import { describe, expect, it } from "vitest";
import { dollars, estPanneIA, etatCredit, montagesRestants } from "./creditIA";
import { messageErreur } from "./reglages";

describe("crédit IA du Studio", () => {
  it("dit si le crédit est bon, bas ou épuisé", () => {
    expect(etatCredit({ credit: { reste: 87, mesure_le: "" }, seuil: 10 })).toBe("ok");
    expect(etatCredit({ credit: { reste: 8.4, mesure_le: "" }, seuil: 10 })).toBe("bas");
    expect(etatCredit({ credit: { reste: -0.08, mesure_le: "" }, seuil: 10 })).toBe("epuise");
    expect(etatCredit({ credit: null, seuil: 10 })).toBe("inconnu");
  });
  it("estime les montages restants au coût moyen", () => {
    expect(montagesRestants({ credit: { reste: 100, mesure_le: "" }, cout_moyen: 0.25 })).toEqual({ n: 400, estime: false });
    // pas encore assez de montages suivis : estimation à 0,20 $
    expect(montagesRestants({ credit: { reste: 100, mesure_le: "" }, cout_moyen: null })).toEqual({ n: 500, estime: true });
    expect(montagesRestants({ credit: null, cout_moyen: 0.2 })).toBeNull();
  });
  it("affiche les montants à la française", () => {
    expect(dollars(8.4)).toBe("8,40 $");
    expect(dollars(null)).toBe("—");
  });
  it("traduit les anciennes pannes IA (402) en phrase claire pour l'élève", () => {
    expect(estPanneIA("HTTPError: HTTP Error 402: Payment Required")).toBe(true);
    const m = messageErreur("Erreur pendant le montage (HTTPError: HTTP Error 402: Payment Required)");
    expect(m.texte).toContain("momentanément indisponible");
    expect(messageErreur("Erreur pendant le montage (KeyError: 'x')").texte).toContain("Un souci technique");
  });
});
