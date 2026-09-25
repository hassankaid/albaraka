// ─────────────────────────────────────────────────────────────────────────
// Les deux cases qui rendent la vente opposable.
//
// Cahier des charges Ethicarena §4.2. Elles conditionnent la validité de la
// renonciation au droit de rétractation et la preuve de l'acceptation des
// CGV. Si l'une disparaît d'un refactor, la page continuera de s'afficher et
// les paiements continueront de passer — c'est seulement au premier litige
// qu'on découvrira qu'on n'a rien à opposer.
// ─────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import {
  initAgreements,
  allAgreed,
  toggleAgreement,
  LIBELLE_BOUTON_PAIEMENT,
  VERSION_CGV,
  CHEMIN_CGV,
} from "./checkout-agreements";

describe("les deux cases exigées par la loi", () => {
  const cases = initAgreements("PASS AL BARAKA");

  it("sont les deux premières, juste au-dessus du bouton", () => {
    expect(cases[0].id).toBe("accepte_cgv");
    expect(cases[1].id).toBe("wants_immediate_access");
    expect(cases[0].obligatoireLegalement).toBe(true);
    expect(cases[1].obligatoireLegalement).toBe(true);
  });

  it("acceptent les CGV par un lien cliquable vers la bonne page", () => {
    expect(cases[0].text).toContain("J'ai lu et j'accepte");
    expect(cases[0].lien?.texte).toBe("Conditions générales de vente");
    expect(cases[0].lien?.href).toBe(CHEMIN_CGV);
  });

  it("citent l'article qui fonde la renonciation", () => {
    // Sans la référence à L. 221-28, la renonciation au droit de rétractation
    // n'est pas valablement recueillie.
    expect(cases[1].text).toContain("L. 221-28");
    expect(cases[1].text).toContain("renoncer");
    expect(cases[1].text).toContain("accès immédiat");
  });

  it("ne sont JAMAIS pré-cochées", () => {
    for (const c of cases) {
      expect(c.checked, `« ${c.id} » est pré-cochée`).toBe(false);
      expect(c.checked_at).toBeNull();
    }
  });
});

describe("le bouton reste bloqué tant que tout n'est pas coché", () => {
  it("refuse une liste partiellement cochée", () => {
    let cases = initAgreements("PASS AL BARAKA");
    expect(allAgreed(cases)).toBe(false);
    cases = toggleAgreement(cases, "accepte_cgv");
    expect(allAgreed(cases)).toBe(false);
  });

  it("n'accepte que lorsque toutes le sont", () => {
    let cases = initAgreements("LIBERTY");
    for (const c of [...cases]) cases = toggleAgreement(cases, c.id);
    expect(allAgreed(cases)).toBe(true);
  });

  it("ne dépend pas d'un nombre de cases écrit en dur", () => {
    // Le compte était figé à cinq. Les deux cases légales l'ont fait passer
    // à six : un nombre en dur aurait laissé passer une case non cochée.
    const cases = initAgreements("PASS AL BARAKA");
    expect(cases.length).toBeGreaterThan(5);
    expect(allAgreed(cases.map((c) => ({ ...c, checked: true })))).toBe(true);
  });

  it("horodate chaque consentement", () => {
    const cases = toggleAgreement(initAgreements("PASS AL BARAKA"), "accepte_cgv");
    const cgv = cases.find((c) => c.id === "accepte_cgv")!;
    expect(cgv.checked).toBe(true);
    expect(cgv.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("le libellé du bouton de paiement", () => {
  it("dit que la commande oblige à payer", () => {
    // Article L. 221-14 : « Payer 3 000 € » ne suffit pas, « Valider » encore
    // moins. Le cahier des charges §4.3 retient cette formule.
    expect(LIBELLE_BOUTON_PAIEMENT).toBe("Commander avec obligation de paiement");
  });
});

describe("la version des CGV", () => {
  it("est datée, pour savoir QUELLE version a été acceptée", () => {
    // Prouver l'acceptation ne sert à rien si on ignore de quel texte on parle.
    expect(VERSION_CGV).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});
