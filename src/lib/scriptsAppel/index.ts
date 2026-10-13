import { SCRIPT_DECOUVERTE } from "./decouverte";
import { SCRIPT_TRANSFORMATION } from "./transformation";
import type { CleScript, DefinitionScript } from "./modele";

export * from "./modele";
export { SCRIPT_DECOUVERTE, SCRIPT_TRANSFORMATION };

export const SCRIPTS: Record<CleScript, DefinitionScript> = {
  decouverte: SCRIPT_DECOUVERTE,
  transformation: SCRIPT_TRANSFORMATION,
};

/** Les deux versions de l'outil (cahier des charges, section 3). */
export type VersionOutil = "setter_closer" | "liberty";
