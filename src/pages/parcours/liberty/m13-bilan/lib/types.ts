/**
 * M13 BILAN des 5 non-négociables — types, constantes & helpers.
 * Portage React du code source Sidali v1.0.0 (écran unique, SANS IA).
 * 5 cases à cocher + signature → bascule vers M14 (mise en marché).
 */

export const VERSION = "v1.0.0";
export const SCHEMA_VERSION = "m13_v1";
export const STORAGE_KEY = "m13_bilan_state_v1";
export const PROFILE_KEY = "liberty_user_profile_v1";
export const MODULE_ID = "m13";
export const DEBOUNCE_MS = 500;

export type CritereId = "niche" | "offre" | "appels" | "closing" | "happy_clients";

export interface Critere { id: CritereId; lead: string; strong: string; tail: string; }

/** Les 5 affirmations (texte verbatim, partie en gras = `strong`). */
export const CRITERIA: Critere[] = [
  { id: "niche", lead: "Ma ", strong: "niche", tail: " a un pouvoir d'achat observé et une douleur urgente identifiée." },
  { id: "offre", lead: "J'ai encaissé ", strong: "au minimum 10 ventes", tail: " sur cette offre." },
  { id: "appels", lead: "J'ai ", strong: "au minimum 6 appels qualifiés par semaine", tail: " de manière régulière." },
  { id: "closing", lead: "Mon ", strong: "taux de closing est entre 15 et 35%", tail: " sur les 30 derniers jours." },
  { id: "happy_clients", lead: "J'ai ", strong: "au minimum 10 clients satisfaits", tail: " à qui j'ai délivré le résultat promis." },
];

export interface Checks { niche: boolean; offre: boolean; appels: boolean; closing: boolean; happy_clients: boolean; }

export interface M13State {
  version: string; module: string; schema_version: string;
  signed: boolean; signed_at: string | null; signed_by: string;
  m10_present: boolean;
  m12_data: any;
  checks: Checks;
  last_save?: string | null;
  _updated_at?: string;
}

export function freshChecks(): Checks {
  return { niche: false, offre: false, appels: false, closing: false, happy_clients: false };
}
export function defaultM13State(): M13State {
  return {
    version: VERSION, module: "M13_BILAN", schema_version: SCHEMA_VERSION,
    signed: false, signed_at: null, signed_by: "",
    m10_present: false, m12_data: null,
    checks: freshChecks(), last_save: null,
  };
}

export function countChecked(state: M13State): number {
  return CRITERIA.reduce((acc, c) => acc + (state.checks[c.id] ? 1 : 0), 0);
}
export function allChecked(state: M13State): boolean {
  return CRITERIA.every((c) => state.checks[c.id]);
}
