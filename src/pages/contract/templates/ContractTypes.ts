/**
 * Types partagés pour les templates de contrat PDF (Pass AL BARAKA & Liberty).
 * Le wording légal est repris à l'identique des templates Word fournis par Sidali.
 */

export interface ContractAgreement {
  /** Identifiant stable de la case (ex: "formule_understood") */
  id: string;
  /** Texte exact affiché au client lors de la validation */
  text: string;
  /** Horodatage formaté FR avec heure ("19/05/2026 14:32") */
  checked_at: string;
}

export interface ContractData {
  // Numéro + dates
  /** Numéro de contrat normalisé (ex: "CTR-2026-05-0042") */
  contractNumber: string;
  /** Date du contrat formatée FR ("19/05/2026") */
  contractDate: string;

  // Client
  clientFirstName: string;
  clientLastName: string;
  clientFullName: string;
  clientAddress: string;
  clientPostalCode: string;
  clientCity: string;
  clientCountry: string;
  clientEmail: string;
  clientPhone: string;

  // Vente
  /** Montant net à payer (2000, 3000, 4000 ou 5000) */
  amountTotal: number;
  /** Prix barré (3000 ou 5000) — utilisé sur les variantes conférence */
  amountOriginal: number;
  /** Montant de la réduction conférence (0, 1000) */
  discountAmount: number;
  /** Modalité affichée (ex: "Comptant" ou "5 × 600,00 €") */
  paymentModality: string;
  /** Nombre d'échéances (1 pour comptant) */
  installmentsCount: number;
  /** Date du premier paiement formatée FR ("19/05/2026") */
  firstPaymentDate: string;

  // Agreements (5 cases déjà cochées avant paiement, snapshot)
  agreements: ContractAgreement[];

  // Signature
  /** URL ou base64 image signature ETHICARENA (placeholder si absent) */
  signatureEthicaArenaUrl?: string;
  /** URL ou base64 image signature client (null/undefined = contrat unsigned) */
  signatureClientUrl?: string;
  /** Horodatage formaté FR avec heure ("19/05/2026 14:32"), undefined si unsigned */
  signedAt?: string;
}

export type ContractTemplateKey =
  | "pass_standard"
  | "pass_conference"
  | "liberty_standard"
  | "liberty_conference";

/** Libellé humain pour chaque template (utile en backoffice). */
export const CONTRACT_TEMPLATE_LABELS: Record<ContractTemplateKey, string> = {
  pass_standard: "Pass AL BARAKA — 3 000 €",
  pass_conference: "Pass AL BARAKA — 2 000 € (Conférence)",
  liberty_standard: "Liberty — 5 000 €",
  liberty_conference: "Liberty — 4 000 € (Conférence)",
};
