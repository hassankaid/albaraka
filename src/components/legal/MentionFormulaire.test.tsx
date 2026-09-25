// ─────────────────────────────────────────────────────────────────────────
// La case de prospection doit rester FACULTATIVE.
//
// Cahier des charges Ethicarena §5. Un consentement obtenu en échange de
// l'accès au formulaire n'est pas libre, donc pas valable — et une case
// pré-cochée n'est pas un consentement du tout (CJUE, Planet49).
//
// Ces deux défauts ne se voient pas : la page s'affiche, les leads rentrent,
// et on ne découvre le problème qu'au contrôle. D'où ce test.
// ─────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import {
  CaseMarketing,
  MentionFormulaire,
  TEXTE_MENTION_AVANT_LIEN,
  CHEMIN_POLITIQUE,
} from "./MentionFormulaire";

describe("la case de prospection", () => {
  it("n'est jamais cochée d'office", () => {
    render(<CaseMarketing coche={false} onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("ne porte ni required ni aria-required", () => {
    render(<CaseMarketing coche={false} onChange={() => {}} />);
    const c = screen.getByRole("checkbox");
    expect(c).not.toBeRequired();
    expect(c.getAttribute("aria-required")).toBeNull();
  });
});

describe("la mention d'information", () => {
  it("nomme le responsable de traitement et la façon de s'y opposer", () => {
    expect(TEXTE_MENTION_AVANT_LIEN).toContain("ETHICARENA L.L.C-FZ");
    expect(TEXTE_MENTION_AVANT_LIEN).toContain("contact@ethicarena.com");
  });

  it("ouvre la politique dans un nouvel onglet", () => {
    // Aller lire la politique ne doit pas faire perdre la saisie en cours.
    render(<MentionFormulaire />);
    const lien = screen.getByRole("link");
    expect(lien).toHaveAttribute("href", CHEMIN_POLITIQUE);
    expect(lien).toHaveAttribute("target", "_blank");
  });
});

describe("tous les formulaires publics portent la mention", () => {
  // Le vrai risque n'est pas qu'un formulaire perde sa mention, c'est qu'un
  // NOUVEAU formulaire naisse sans elle. La liste est donc explicite : un
  // ajout oublié ici se voit en revue, un oubli dans le code casse le test.
  const FORMULAIRES = [
    "src/pages/tunnels/components/OptInModal.tsx",
    "src/pages/public/rdv/RdvCoordonnees.tsx",
    "src/pages/public/lead-quiz/LeadQuizUI.tsx",
    "src/pages/public/questionnaire/QuestionnaireEntree.tsx",
    "src/pages/checkout/Checkout.tsx",
    "src/pages/checkout/LibertyCheckout.tsx",
    "src/pages/checkout/PaymentLinkCheckout.tsx",
    "src/pages/checkout/AcompteCheckout.tsx",
    "src/pages/checkout/RebillCheckout.tsx",
  ];

  for (const chemin of FORMULAIRES) {
    it(`${chemin.split("/").pop()} affiche la mention`, () => {
      const src = readFileSync(chemin, "utf-8");
      expect(src).toContain("<MentionFormulaire");
    });
  }

  // La case de prospection ne va QUE là où des e-mails commerciaux suivent.
  // Au checkout, la relation repose sur le contrat ; sur le questionnaire,
  // l'adresse ne sert qu'à renvoyer le lien demandé.
  const AVEC_CASE = [
    "src/pages/tunnels/components/OptInModal.tsx",
    "src/pages/public/rdv/RdvCoordonnees.tsx",
    "src/pages/public/lead-quiz/LeadQuizUI.tsx",
  ];

  for (const chemin of AVEC_CASE) {
    it(`${chemin.split("/").pop()} propose la case de prospection`, () => {
      expect(readFileSync(chemin, "utf-8")).toContain("<CaseMarketing");
    });
  }
});
