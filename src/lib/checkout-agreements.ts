// ─────────────────────────────────────────────────────────────────────────
// Engagements obligatoires à cocher AVANT le paiement (Pass AL BARAKA, Liberty,
// module à la carte). Contrats v3 du 13/11/2026 : textes du cahier des charges
// de Sidali du 12/11, la case 1 vaut aussi acceptation du contrat (le paiement
// vaut signature). Le bouton reste désactivé tant que toutes ne sont pas cochées.
//
// Le snapshot horodaté part au serveur (`create-payment-intent` → metadata
// Stripe et `preuves_consentement` → webhook → `client_contracts`), qui en tire
// le contrat accepté et l'attestation de renonciation envoyés au client.
// ─────────────────────────────────────────────────────────────────────────

import { casesV3, offreDeFormule, VERSION_CGV_V3, type IdCaseV3 } from "../../supabase/functions/_shared/contrat_v3";

/**
 * Contrats v3 (13/11/2026) : les cases viennent de `supabase/functions/_shared/contrat_v3.ts`,
 * lu aussi par le serveur qui produit le contrat. « A LA CARTE » = un module vendu seul.
 */
export type CheckoutFormula = "PASS AL BARAKA" | "LIBERTY" | "A LA CARTE";

/**
 * La version des CGV que le client accepte.
 *
 * Elle est enregistrée avec son consentement : en cas de litige, il faut
 * pouvoir prouver QUELLE version il a acceptée, pas seulement qu'il a coché.
 * Le cahier des charges demande d'archiver chaque version (§3.2).
 */
export const VERSION_CGV = VERSION_CGV_V3;

/** Le chemin des CGV, ouvert dans un nouvel onglet depuis la case à cocher. */
export const CHEMIN_CGV = "/conditions-generales-de-vente";

/**
 * Le libellé du bouton de paiement.
 *
 * L'article L. 221-14 du Code de la consommation impose que le bouton dise
 * sans ambiguïté que la commande oblige à payer. « Payer 3 000 € » ne suffit
 * pas au regard du texte, et « Valider » encore moins : le cahier des charges
 * (§4.3) retient cette formule-ci. Le montant reste affiché juste au-dessus,
 * dans le récapitulatif. Depuis le 13/11/2026, ce clic vaut aussi signature
 * du contrat (avec la case 1).
 */
export const LIBELLE_BOUTON_PAIEMENT = "Commander avec obligation de paiement";

export interface AgreementItem {
  /** Identifiant stable (clé React, snapshot envoyé au serveur, preuve en base). */
  id: IdCaseV3;
  /** Texte affiché, avec `{lien}` à la place des CGV cliquables. */
  text: string;
  /**
   * Un lien à insérer dans le texte, à la place de `{lien}`.
   *
   * Le cahier des charges veut « Conditions générales de vente » cliquable dans
   * la case elle-même, et s'ouvre dans un nouvel onglet : le client ne doit pas
   * perdre sa saisie pour aller les lire.
   */
  lien?: { texte: string; href: string };
  /** Vrai pour la case du contrat et des CGV, et pour la renonciation. */
  obligatoireLegalement?: boolean;
  checked: boolean;
  /** ISO timestamp du clic « coché ». Null tant que pas coché. */
  checked_at: string | null;
}

/**
 * Les cases initiales (toutes non cochées), dans l'ordre du cahier des charges
 * du 12/11/2026 : 6 pour le Pass et Liberty, 5 pour un module à la carte.
 * Aucune n'est pré-cochée : une case pré-cochée ne vaut pas consentement exprès.
 */
export function initAgreements(formula: CheckoutFormula, module?: string | null): AgreementItem[] {
  const offre = offreDeFormule(formula) ?? "pass";
  return casesV3(offre, module).map((c) => ({
    id: c.id,
    text: c.texte.replace("{CGV}", "{lien}"),
    ...(c.id === "contrat_cgv" ? { lien: { texte: "Conditions générales de vente", href: CHEMIN_CGV } } : {}),
    obligatoireLegalement: c.id === "contrat_cgv" || c.id === "acces_immediat",
    checked: false,
    checked_at: null,
  }));
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
