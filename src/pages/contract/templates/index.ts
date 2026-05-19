/**
 * Barrel export pour les templates de contrat PDF.
 * Utiliser `getContractTemplate(key)` pour récupérer le composant
 * correspondant à une clé runtime.
 */

import type { ComponentType } from "react";

import { ContractPassStandard } from "./ContractPassStandard";
import { ContractPassConference } from "./ContractPassConference";
import { ContractLibertyStandard } from "./ContractLibertyStandard";
import { ContractLibertyConference } from "./ContractLibertyConference";
import type {
  ContractData,
  ContractTemplateKey,
} from "./ContractTypes";

export { ContractPassStandard } from "./ContractPassStandard";
export { ContractPassConference } from "./ContractPassConference";
export { ContractLibertyStandard } from "./ContractLibertyStandard";
export { ContractLibertyConference } from "./ContractLibertyConference";
export { CONTRACT_TEMPLATE_LABELS } from "./ContractTypes";
export type {
  ContractData,
  ContractTemplateKey,
  ContractAgreement,
} from "./ContractTypes";

type TemplateComponent = ComponentType<{ data: ContractData }>;

export function getContractTemplate(
  key: ContractTemplateKey,
): TemplateComponent {
  switch (key) {
    case "pass_standard":
      return ContractPassStandard;
    case "pass_conference":
      return ContractPassConference;
    case "liberty_standard":
      return ContractLibertyStandard;
    case "liberty_conference":
      return ContractLibertyConference;
  }
}
