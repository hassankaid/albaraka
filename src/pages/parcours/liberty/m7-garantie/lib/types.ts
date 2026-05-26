/**
 * État global persistant du M7 GARANTIE (v1.0.0 Sidali).
 * 8 étapes (welcome + 6 sprints pédagogiques + lock).
 * Consomme handoff_to_m7 depuis liberty_user_profile.m6.
 * Si M5/M6 forcé en upstream → upstream_forced = true → seuil 85 (au lieu 80).
 */

export type M7Step =
  | "welcome"
  | "type_garantie"
  | "promesse_garantie"
  | "conditions_client"
  | "math_garantie"
  | "expose_garantie"
  | "termes_conditions"
  | "lock";

export type PedaStepKey =
  | "type_garantie" | "promesse_garantie" | "conditions_client"
  | "math_garantie" | "expose_garantie" | "termes_conditions";

export const VALIDATION_THRESHOLD = 80;
export const VALIDATION_THRESHOLD_STRICT = 85;
export const FORCE_AVAILABLE_AFTER = 3;
export const SCHEMA_VERSION = "m7_v1";
export const VERSION = "v1.0.0";

export type GarantieTypeKey = "refund" | "continuite" | "paiement_resultats";

export const GARANTIE_TYPES: Record<GarantieTypeKey, { label: string; tag: string; formule: string; desc: string }> = {
  refund: {
    label: "Remboursement (Refund)",
    tag: "La plus puissante",
    formule: "ou vous ne nous payez pas",
    desc: "Si l'objectif n'est pas atteint dans les conditions, tu rembourses 100%. Maximum d'engagement, conversion maximale.",
  },
  continuite: {
    label: "Continuité (accompagnement gratuit)",
    tag: "Tu prolonges jusqu'à résultat",
    formule: "ou nous vous accompagnons jusqu'à",
    desc: "Si l'objectif n'est pas atteint, tu continues à accompagner gratuitement jusqu'à résultat. Aucune sortie cash mais coût opérationnel.",
  },
  paiement_resultats: {
    label: "Paiement aux résultats",
    tag: "50% maintenant · 50% au résultat",
    formule: "payé au résultat",
    desc: "Solde du prix dû uniquement si l'objectif est atteint. Très puissant en B2B mais demande un track record solide.",
  },
};

// ─── Imports upstream M1..M6 ─────────────────────────────────────────────
export interface M1ImportData {
  source: string;
  sous_niche_2?: { phrase_finale?: string; cible?: string; phrase?: string } | null;
  avatar?: { socio?: { nom?: string; situation?: string } } | null;
  marche?: { id: string; label: string } | null;
}

export interface M2ImportData {
  source: string;
  data: { dominant_pain?: string; step8?: { positionnement?: string } };
}

export interface M3ImportData {
  source: string;
  complete?: boolean;
  promesse?: string;
  hero_mecanisme_nom?: string;
  prix_display?: string;
  garantie?: { type: string; formulation: string };
}

export interface M4ImportData {
  source: string;
  complete?: boolean;
  entry_strategy?: string | null;
  ht_monthly_target?: number | string;
  strategy_score_is_forced?: boolean;
  ht?: { name?: string; price?: string };
}

export interface M5ImportData {
  source: string;
  complete?: boolean;
  handoff_to_m6?: {
    ht_point_a?: string;
    ht_point_b?: string;
    ht_point_b_measurable?: string;
    ht_point_b_timeframe_days?: number;
    upstream_forced?: boolean;
    entry_strategy?: string | null;
    ht_monthly_target?: number | string | null;
    strategy_score_is_forced?: boolean;
  };
}

export interface M6ImportData {
  source: string;
  complete?: boolean;
  handoff_to_m7?: {
    handoff_version?: string;
    prix_ht?: string;
    roi_calcule?: number;
    paiements_actives?: Record<string, boolean>;
    pitch_fractionnement?: string;
    upstream_forced?: boolean;
    entry_strategy?: string | null;
    ht_monthly_target?: number | string | null;
    strategy_score_is_forced?: boolean;
    avg_score?: number;
  };
}

// ─── Sub-states ───────────────────────────────────────────────────────────
export interface TypeGarantieState {
  type_choisi: GarantieTypeKey | "";
  justification: string;
}

export interface PromesseGarantieState {
  resultat: string;
  duree_valeur: number;
  duree_unite: "jours" | "semaines" | "mois";
  critere_objectif: string;
}

export interface ConditionsClientState {
  conditions_text: string;
}

export interface MathGarantieState {
  clients_initiaux: number;
  delta_estime: number;
  taux_refund_pct: number;
  net_positif: number; // calculé
}

export interface ExposeGarantieState {
  pitch_text: string;
  formule_marketing: string;
}

export interface TermesConditionsState {
  tnc_text: string;
  vendeur_statut: string;
}

// ─── Feedback IA ─────────────────────────────────────────────────────────
export interface AIFeedback {
  verdict?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  ai_mode?: "cloud" | "local";
  [k: string]: any;
}

// ─── State global M7 ────────────────────────────────────────────────────
export interface M7Data {
  type_garantie: TypeGarantieState;
  promesse_garantie: PromesseGarantieState;
  conditions_client: ConditionsClientState;
  math_garantie: MathGarantieState;
  expose_garantie: ExposeGarantieState;
  termes_conditions: TermesConditionsState;
}

export interface M7State {
  version: string;
  module: string;
  schema_version: string;
  data: M7Data;
  scores: Record<PedaStepKey, number | null>;
  forced: Record<PedaStepKey, boolean>;
  attempts: Record<PedaStepKey, number>;
  lastFb: Record<PedaStepKey, AIFeedback | null>;
  highest: M7Step;
  current: M7Step;
  upstream_forced: boolean;
  signed: boolean;
  signed_at: string | null;
  signed_by: string;
  demoMode: string | null;
  m1_data: M1ImportData | null; m1_source: "profile" | "embedded" | null;
  m2_data: M2ImportData | null; m2_source: "profile" | null;
  m3_data: M3ImportData | null; m3_source: "profile" | null;
  m4_data: M4ImportData | null; m4_source: "profile" | null;
  m5_data: M5ImportData | null; m5_source: "profile" | null;
  m6_data: M6ImportData | null; m6_source: "profile" | null;
  completed: boolean;
  _updated_at?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function freshData(): M7Data {
  return {
    type_garantie: { type_choisi: "", justification: "" },
    promesse_garantie: { resultat: "", duree_valeur: 60, duree_unite: "jours", critere_objectif: "" },
    conditions_client: { conditions_text: "" },
    math_garantie: { clients_initiaux: 10, delta_estime: 2, taux_refund_pct: 10, net_positif: 0 },
    expose_garantie: { pitch_text: "", formule_marketing: "" },
    termes_conditions: { tnc_text: "", vendeur_statut: "" },
  };
}

export function defaultM7State(): M7State {
  return {
    version: VERSION,
    module: "M7_GARANTIE",
    schema_version: SCHEMA_VERSION,
    data: freshData(),
    scores: { type_garantie: null, promesse_garantie: null, conditions_client: null, math_garantie: null, expose_garantie: null, termes_conditions: null },
    forced: { type_garantie: false, promesse_garantie: false, conditions_client: false, math_garantie: false, expose_garantie: false, termes_conditions: false },
    attempts: { type_garantie: 0, promesse_garantie: 0, conditions_client: 0, math_garantie: 0, expose_garantie: 0, termes_conditions: 0 },
    lastFb: { type_garantie: null, promesse_garantie: null, conditions_client: null, math_garantie: null, expose_garantie: null, termes_conditions: null },
    highest: "welcome",
    current: "welcome",
    upstream_forced: false,
    signed: false,
    signed_at: null,
    signed_by: "",
    demoMode: null,
    m1_data: null, m1_source: null,
    m2_data: null, m2_source: null,
    m3_data: null, m3_source: null,
    m4_data: null, m4_source: null,
    m5_data: null, m5_source: null,
    m6_data: null, m6_source: null,
    completed: false,
  };
}

export const STEPS_META: Array<{ id: M7Step; short: string; full: string }> = [
  { id: "welcome",           short: "Welcome",     full: "Bienvenue · construction garantie" },
  { id: "type_garantie",     short: "1 · Type",    full: "Choix du type · Refund / Continuité / Paiement résultats" },
  { id: "promesse_garantie", short: "2 · Promesse", full: "Promesse mesurable · Point B + durée + critère" },
  { id: "conditions_client", short: "3 · Conditions", full: "Conditions d'activation client · bouclier anti-abus" },
  { id: "math_garantie",     short: "4 · Math",    full: "Calcul de rentabilité · net positif obligatoire" },
  { id: "expose_garantie",   short: "5 · Pitch",   full: "Exposition de la garantie · montre, ne raconte pas" },
  { id: "termes_conditions", short: "6 · T&C",     full: "Termes et conditions · contrat écrit" },
  { id: "lock",              short: "7 · Lock",    full: "Signature & transmission vers M8" },
];

export const PEDA_STEPS: PedaStepKey[] = [
  "type_garantie", "promesse_garantie", "conditions_client",
  "math_garantie", "expose_garantie", "termes_conditions",
];

// ─── Helpers d'extraction ────────────────────────────────────────────────
export function pickAvatarName(state: M7State): string {
  return state.m1_data?.avatar?.socio?.nom?.trim() || "ton avatar";
}

export function pickHTName(state: M7State): string {
  return state.m4_data?.ht?.name
    || state.m3_data?.hero_mecanisme_nom
    || "ton high-ticket";
}

export function pickHTPrice(state: M7State): string {
  return state.m6_data?.handoff_to_m7?.prix_ht
    || state.m4_data?.ht?.price
    || state.m3_data?.prix_display
    || "—";
}

export function pickPointB(state: M7State): { text: string; measurable: string; days: number } | null {
  const h5 = state.m5_data?.handoff_to_m6;
  if (!h5?.ht_point_b) return null;
  return {
    text: h5.ht_point_b,
    measurable: h5.ht_point_b_measurable || "",
    days: h5.ht_point_b_timeframe_days || 60,
  };
}

/** Renvoie le seuil de validation : 85 si M5/M6 forcé, sinon 80. */
export function validationThreshold(state: M7State): number {
  return state.upstream_forced ? VALIDATION_THRESHOLD_STRICT : VALIDATION_THRESHOLD;
}

/** Calcule le net positif de la garantie. */
export function computeNetPositif(ci: number, de: number, taux: number): number {
  // (clients_initiaux + delta_estime) * (1 - taux_refund/100) - clients_initiaux
  // = nouveaux clients nets (après refund) - clients de référence
  const total = ci + de;
  const conserves = total * (1 - taux / 100);
  return Math.round((conserves - ci) * 10) / 10;
}
