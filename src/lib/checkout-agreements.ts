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

/**
 * La version des CGV que le client accepte.
 *
 * Elle est enregistrée avec son consentement : en cas de litige, il faut
 * pouvoir prouver QUELLE version il a acceptée, pas seulement qu'il a coché.
 * Le cahier des charges demande d'archiver chaque version (§3.2).
 */
export const VERSION_CGV = "25/09/2026";

/** Le chemin des CGV, ouvert dans un nouvel onglet depuis la case à cocher. */
export const CHEMIN_CGV = "/conditions-generales-de-vente";

/**
 * Le libellé du bouton de paiement.
 *
 * L'article L. 221-14 du Code de la consommation impose que le bouton dise
 * sans ambiguïté que la commande oblige à payer. « Payer 3 000 € » ne suffit
 * pas au regard du texte, et « Valider » encore moins : le cahier des charges
 * (§4.3) retient cette formule-ci. Le montant reste affiché juste au-dessus,
 * dans le récapitulatif.
 */
export const LIBELLE_BOUTON_PAIEMENT = "Commander avec obligation de paiement";

export interface AgreementItem {
  /** Identifiant stable (utilisé en clé React + en BDD) */
  id:
    | "accepte_cgv"
    | "knew_formula"
    | "understood_warranty"
    | "wants_immediate_access"
    | "commits_to_payment"
    | "respects_confidentiality";
  /** Texte affiché à l'utilisateur. Personnalisé pour `knew_formula` selon la formule. */
  text: string;
  /**
   * Un lien à insérer dans le texte, à la place de `{lien}`.
   *
   * Le cahier des charges veut que « Conditions générales de vente » soit
   * cliquable dans la case elle-même, et s'ouvre dans un nouvel onglet : le
   * client ne doit pas perdre sa saisie pour aller les lire.
   */
  lien?: { texte: string; href: string };
  /**
   * Vrai pour les deux cases exigées par le cahier des charges (§4.2).
   * Elles sont affichées en premier, juste au-dessus du bouton.
   */
  obligatoireLegalement?: boolean;
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
    // ── Les deux cases exigées par le cahier des charges (§4.2) ──
    //
    // Elles conditionnent la validité de la renonciation au droit de
    // rétractation et la preuve de l'acceptation des CGV. Sans elles, un
    // client qui conteste peut obtenir le remboursement : rien ne prouve
    // qu'il a accepté quoi que ce soit. Textes repris mot pour mot.
    {
      id: "accepte_cgv",
      text: "J'ai lu et j'accepte les {lien}.",
      lien: { texte: "Conditions générales de vente", href: CHEMIN_CGV },
      obligatoireLegalement: true,
      checked: false,
      checked_at: null,
    },
    {
      id: "wants_immediate_access",
      text:
        "Je demande l'accès immédiat à la plateforme et je reconnais renoncer " +
        "expressément à mon droit de rétractation, conformément à l'article " +
        "L. 221-28 du Code de la consommation.",
      obligatoireLegalement: true,
      checked: false,
      checked_at: null,
    },
    // ── Les cinq engagements demandés par Sidali le 19/05/2026 ──
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

/**
 * True si TOUTES les cases sont cochées.
 *
 * Le compte n'est plus figé à cinq : les deux cases légales s'y sont
 * ajoutées, et un nombre en dur aurait laissé passer une case non cochée le
 * jour où la liste change.
 */
export function allAgreed(items: AgreementItem[]): boolean {
  return items.length > 0 && items.every((i) => i.checked);
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
