import { describe, expect, it } from "vitest";
import { PAYS_ZONE, estHorsZone, indicatifAffiche, zoneDuTelephone } from "./zoneLead";

describe("zone des leads (+33, +32, +41, +352)", () => {
  it("France et Belgique sont dans la zone", () => {
    expect(estHorsZone("+33612345678")).toBe(false);
    expect(estHorsZone("+32 470 12 34 56")).toBe(false);
    expect(estHorsZone("0033612345678")).toBe(false);
    expect(zoneDuTelephone("+33612345678")).toBe("cible");
  });
  it("Suisse et Luxembourg sont dans la zone depuis le 27/11/2026", () => {
    expect(estHorsZone("+41791234567")).toBe(false);
    expect(estHorsZone("+352 621 123 456")).toBe(false);
    expect(zoneDuTelephone("+41791234567")).toBe("cible");
    expect(zoneDuTelephone("+352621123456")).toBe("cible");
    // +351 (Portugal) ne se confond pas avec +352
    expect(estHorsZone("+351912345678")).toBe(true);
    expect(PAYS_ZONE).toEqual(["FR", "BE", "CH", "LU"]);
  });
  it("un autre indicatif est hors zone, outre-mer compris (règle stricte)", () => {
    expect(estHorsZone("+25377123456")).toBe(true);
    expect(estHorsZone("+212612345678")).toBe(true);
    expect(estHorsZone("+262692123456")).toBe(true);
    expect(estHorsZone("+213551234567")).toBe(true);
    expect(zoneDuTelephone("+22507123456")).toBe("hors_zone");
  });
  it("un numéro sans indicatif lisible n'est jamais marqué", () => {
    expect(estHorsZone("0612345678")).toBe(false);
    expect(estHorsZone("33612345678")).toBe(false);
    expect(estHorsZone(null)).toBe(false);
    expect(estHorsZone("")).toBe(false);
    expect(zoneDuTelephone("0612345678")).toBe("inconnue");
  });
  it("affiche l'indicatif", () => {
    expect(indicatifAffiche("+25377123456")).toBe("+253");
    expect(indicatifAffiche("+225 07 12 34 56")).toBe("+225");
    expect(indicatifAffiche("+41791234567")).toBe("+41");
    expect(indicatifAffiche("+14155550123")).toBe("+1");
    expect(indicatifAffiche("+262692123456")).toBe("+262");
  });
});
