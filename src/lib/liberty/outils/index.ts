/**
 * Les outils Liberty disponibles, par code (formation_chapitres.outil). Un outil
 * absent d'ici s'affiche « en préparation » dans son chapitre.
 */
import type { DefinitionOutil } from "./modele";
import { outil1NicheAvatar } from "./outil1NicheAvatar";

export * from "./modele";

export const OUTILS_LIBERTY: Record<string, DefinitionOutil> = {
  [outil1NicheAvatar.code]: outil1NicheAvatar,
};

export function outilLiberty(code: string | null | undefined): DefinitionOutil | null {
  return (code && OUTILS_LIBERTY[code]) || null;
}
