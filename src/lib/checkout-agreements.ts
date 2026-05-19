// ─────────────────────────────────────────────────────────────────────────
// Engagements obligatoires à cocher AVANT le paiement Pass AL BARAKA / Liberty
// (Sidali 19/05/2026 — CONSIGNES_IMPLEMENTATION).
//
// Les 5 cases sont identiques entre Pass et Liberty sauf la première qui
// mentionne explicitement la formule. Le bouton « Payer » reste désactivé
// tant que toutes ne sont pas cochées.
//
// Le snapshot horodaté est ensuite transmis au backend (`create-payment-intent`
// → metadata Stripe → webhook → row `client_contracts.agreements_snapshot`)
// pour traçabilité juridique du consentement préalable.
// ─────────────────────────────────────────────────────────────────────────

export type CheckoutFormula = "PASS AL BARAKA" | "LIBERTY";

export interface AgreementItem {
  /** Identifiant stable (utilisé en clé React + en BDD) */
  id:
    | "knew_formula"
    | "understood_warranty"
    | "wants_immediate_access"
    | "commits_to_payment"
    | "respects_confidentiality";
  /** Texte affiché à l'utilisateur. Personnalisé pour `knew_formula` selon la formule. */
  text: string;
  checked: boolean;
  /** ISO timestamp du clic « coché ». Null tant que pas coché. */
  checked_at: string | null;
}

/**
 * Construit les 5 items d'engagement initiaux (tous non cochés) pour une formule
 * donnée. Le wording vient verbatim des consignes Sidali (CONSIGNES_IMPLEMENTATION).
 */
export function initAgreements(formula: CheckoutFormula): AgreementItem[] {
  return [
    {
      id: "knew_formula",
      text: `J'ai bien pris connaissance de ma formule ${formula} et de tout ce qui est inclus.`,
      checked: false,
      checked_at: null,
    },
    {
      id: "understood_warranty",
      text: "J'ai bien compris les conditions de la garantie de continuité d'accompagnement et les obligations qui m'incombent pour en bénéficier.",
      checked: false,
      checked_at: null,
    },
    {
      id: "wants_immediate_access",
      text: "Je souhaite accéder immédiatement à la plateforme et je comprends les conditions qui en découlent (renonciation au droit de rétractation de 14 jours).",
      checked: false,
      checked_at: null,
    },
    {
      id: "commits_to_payment",
      text: "Je m'engage à honorer l'intégralité de mon paiement selon la modalité convenue.",
      checked: false,
      checked_at: null,
    },
    {
      id: "respects_confidentiality",
      text: "Je m'engage à respecter la confidentialité des contenus de l'écosystème.",
      checked: false,
      checked_at: null,
    },
  ];
}

/** True si les 5 cases sont cochées. */
export function allAgreed(items: AgreementItem[]): boolean {
  return items.length === 5 && items.every((i) => i.checked);
}

/**
 * Toggle d'un item par id. Coche → horodate. Décoche → remet `checked_at` à null
 * (l'utilisateur peut changer d'avis avant de payer ; le timestamp final sera
 * celui du dernier clic « coché »).
 */
export function toggleAgreement(items: AgreementItem[], id: AgreementItem["id"]): AgreementItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    const nowChecked = !item.checked;
    return {
      ...item,
      checked: nowChecked,
      checked_at: nowChecked ? new Date().toISOString() : null,
    };
  });
}
