/**
 * Les outils Liberty disponibles, par code (formation_chapitres.outil). Un outil
 * absent d'ici s'affiche « en préparation » dans son chapitre.
 */
import type { DefinitionOutil } from "./modele";
import { outil1NicheAvatar } from "./outil1NicheAvatar";
import { outil2PromesseMethode } from "./outil2PromesseMethode";
import { outil3FicheOffre } from "./outil3FicheOffre";
import { outil4VslTunnel } from "./outil4VslTunnel";
import { outil5Histoires } from "./outil5Histoires";
import { outil6Calendrier } from "./outil6Calendrier";
import { outil7AccrochesScripts } from "./outil7AccrochesScripts";
import { outil8ScriptSetting } from "./outil8ScriptSetting";
import { outil9ScriptsClosing } from "./outil9ScriptsClosing";
import { outil10Webinaire } from "./outil10Webinaire";
import { outil11MidLow } from "./outil11MidLow";

export * from "./modele";
export * from "./partage";

export const OUTILS_LIBERTY: Record<string, DefinitionOutil> = {
  [outil1NicheAvatar.code]: outil1NicheAvatar,
  [outil2PromesseMethode.code]: outil2PromesseMethode,
  [outil3FicheOffre.code]: outil3FicheOffre,
  [outil4VslTunnel.code]: outil4VslTunnel,
  [outil5Histoires.code]: outil5Histoires,
  [outil6Calendrier.code]: outil6Calendrier,
  [outil7AccrochesScripts.code]: outil7AccrochesScripts,
  [outil8ScriptSetting.code]: outil8ScriptSetting,
  [outil9ScriptsClosing.code]: outil9ScriptsClosing,
  [outil10Webinaire.code]: outil10Webinaire,
  [outil11MidLow.code]: outil11MidLow,
};

export function outilLiberty(code: string | null | undefined): DefinitionOutil | null {
  return (code && OUTILS_LIBERTY[code]) || null;
}
