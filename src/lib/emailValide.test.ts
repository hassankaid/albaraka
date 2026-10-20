import { describe, expect, it } from "vitest";
import { verifierEmail } from "./emailValide";

describe("verifierEmail", () => {
  it("accepte les adresses courantes", () => {
    for (const e of ["i.hotte@live.fr", "prenom.nom+promo@gmail.com", "a_b-c@sous.domaine.co.uk", " Sabrina@Hotmail.FR "]) {
      expect(verifierEmail(e)).toBeNull();
    }
  });

  it("refuse le cas du 20/10 : un point juste avant le @", () => {
    expect(verifierEmail("i.hotte.@live.fr")).toMatch(/point juste avant/);
  });

  it("refuse les autres fautes de frappe fréquentes", () => {
    expect(verifierEmail("")).not.toBeNull();
    expect(verifierEmail("sans-arobase.fr")).toMatch(/un seul/);
    expect(verifierEmail("a@@b.fr")).toMatch(/un seul/);
    expect(verifierEmail(".jean@gmail.com")).toMatch(/commencer par un point/);
    expect(verifierEmail("jean..dupont@gmail.com")).toMatch(/deux points/);
    expect(verifierEmail("jean@gmail")).toMatch(/fin de ton adresse/);
    expect(verifierEmail("jean@gmail..com")).toMatch(/deux points/);
    expect(verifierEmail("jean dupont@gmail.com")).toMatch(/espace/);
    expect(verifierEmail("jean@-gmail.com")).toMatch(/fin de ton adresse/);
  });
});
