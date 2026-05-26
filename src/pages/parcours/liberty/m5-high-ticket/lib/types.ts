/**
 * État global persistant du M5 HIGH-TICKET (V2 v1.1.1 Sidali).
 * 7 étapes (welcome + 5 sprints IA + lock).
 * Consomme handoff_to_m5 depuis liberty_user_profile.m4 :
 *   entry_strategy, ht_monthly_target, weakest_lever, strategy_score_is_forced.
 * Si M4 forcé → seuil de validation = 85 (au lieu de 80).
 * Produit handoff_to_m6 pour M6 PRICING.
 */

export type M5Step =
  | "welcome"
  | "pont"
  | "conditions"
  | "eatcomplex"
  | "structure"
  | "conviction"
  | "lock";

export type MarketType = "b2c_info" | "b2c_transfo" | "b2b";

export const VALIDATION_THRESHOLD = 80;
export const VALIDATION_THRESHOLD_FORCED_M4 = 85; // si M4 forcé en upstream
export const FORCE_AVAILABLE_AFTER = 3;
export const SCHEMA_VERSION = "m5_v1";
export const VERSION = "v1.1.1";

// ─── Imports upstream M1..M4 ─────────────────────────────────────────────
export interface M1ImportData {
  source: string;
  sous_niche_2?: {
    phrase_finale?: string; cible?: string; douleur?: string; methode?: string; phrase?: string;
  } | null;
  avatar?: { socio?: { nom?: string; age?: string; lieu?: string; situation?: string } } | null;
  marche?: { id: string; label: string } | null;
}

export interface M2ImportData {
  source: string;
  data: {
    step8?: { positionnement?: string; hook_principal?: string };
    dominant_pain?: string;
    dominant_desire?: string;
  };
}

export interface M3ImportData {
  source: string;
  complete?: boolean;
  promesse?: string;
  mecanisme?: { nom: string; etapes: string[] };
  prix?: { montant: string; levier_faible?: string };
  garantie?: { type: string; formulation: string };
  prix_score_global?: number;
  /** Champs supplémentaires "applatis" pour ergonomie M5 */
  headline_promesse?: string;
  hero_mecanisme_nom?: string;
  garantie_oneliner?: string;
  prix_display?: string;
  pains?: Array<string | { text: string }>;
  weakest_lever?: string | null;
}

export type EntryStrategy = "ht_only" | "ht_lt" | "ht_mt" | "full";

export interface M4ImportData {
  source: string;
  complete?: boolean;
  /** Snapshot handoff_to_m5 produit par M4 LockScreen. */
  entry_strategy?: EntryStrategy | null;
  entry_strategy_label?: string;
  ht_monthly_target?: number | string;
  weakest_lever?: string | null;
  strategy_score?: number | null;
  strategy_score_is_forced?: boolean;
  ht?: { name?: string; price?: string; format?: string; rationale?: string };
}

// ─── Sub-states par étape (calque Sidali freshData) ──────────────────────
export interface PontPointA {
  selected_pain_idx: number;
  custom_text: string;
  formulated: string;
}

export interface PontPointB {
  measurable_outcome: string;
  timeframe_days: number;
  formulated: string;
}

export interface PontState {
  pointA: PontPointA;
  pointB: PontPointB;
  bridge_summary: string;
}

export interface ConditionAxis {
  score: number;            // 0-10 slider
  justification: string;
  /** Champs contextuels par axe (cf. freshData Sidali) */
  delivery_mode?: string;   // simple
  timeframe_days?: number;  // rapide
  proof_type?: string;      // systematique
  amplitude?: string;       // aspirante
}

export interface ConditionsState {
  simple: ConditionAxis;
  rapide: ConditionAxis;
  systematique: ConditionAxis;
  aspirante: ConditionAxis;
  weakest_axis: string;
  action_plan: string;
}

export type ConditionAxisKey = "simple" | "rapide" | "systematique" | "aspirante";

export interface EatComplexityRow {
  client_step: string;
  what_you_eat: string;
  what_remains: string;
}

export interface EatComplexityState {
  rows: EatComplexityRow[];
}

export interface StructurePhase {
  num: number;
  name: string;
  weeks: string;
  livrables: string;
}

export interface StructureState {
  total_weeks: number;
  promise_days: number;
  phases: StructurePhase[];
  mecanisme_anchor: string;
}

export interface ConvictionChecklist {
  sur_delivre: boolean;
  ten_clients: boolean;
  believe_price: boolean;
  recommend_to_brother: boolean;
  prepared_objections: boolean;
}

export interface ConvictionState {
  checklist: ConvictionChecklist;
  missing: string;
  next_action: string;
}

// ─── Feedback IA (par étape) ─────────────────────────────────────────────
export interface AIFeedback {
  verdict?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  weakest_axis?: string; // pour conditions
  [k: string]: any;
}

export type PedaStepKey = "pont" | "conditions" | "eatcomplex" | "structure" | "conviction";

// ─── State global M5 ────────────────────────────────────────────────────
export interface M5Data {
  pont: PontState;
  conditions: ConditionsState;
  eatcomplex: EatComplexityState;
  structure: StructureState;
  conviction: ConvictionState;
}

export interface M5State {
  v: string;
  schema_version: string;
  step: M5Step;
  highest: M5Step; // ne progresse que par validation/force
  data: M5Data;
  scores: Record<PedaStepKey, number | null>;
  attempts: Record<PedaStepKey, number>;
  forced: Record<PedaStepKey, boolean>;
  lastFb: Record<PedaStepKey, AIFeedback | null>;
  /** True si M4 a été forcé → seuil monté à 85 + bannière permanente */
  upstream_forced: boolean;
  signed: boolean;
  signed_at: string | null;
  signed_by: string;
  m1_data: M1ImportData | null;
  m1_source: "profile" | "embedded" | null;
  m2_data: M2ImportData | null;
  m2_source: "profile" | null;
  m3_data: M3ImportData | null;
  m3_source: "profile" | null;
  m4_data: M4ImportData | null;
  m4_source: "profile" | null;
  demoMode: string | null;
  completed: boolean;
  _updated_at?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function freshData(): M5Data {
  return {
    pont: {
      pointA: { selected_pain_idx: -1, custom_text: "", formulated: "" },
      pointB: { measurable_outcome: "", timeframe_days: 90, formulated: "" },
      bridge_summary: "",
    },
    conditions: {
      simple:       { score: 5, justification: "", delivery_mode: "" },
      rapide:       { score: 5, justification: "", timeframe_days: 90 },
      systematique: { score: 5, justification: "", proof_type: "" },
      aspirante:    { score: 5, justification: "", amplitude: "" },
      weakest_axis: "",
      action_plan: "",
    },
    eatcomplex: {
      rows: [
        { client_step: "", what_you_eat: "", what_remains: "" },
        { client_step: "", what_you_eat: "", what_remains: "" },
        { client_step: "", what_you_eat: "", what_remains: "" },
        { client_step: "", what_you_eat: "", what_remains: "" },
        { client_step: "", what_you_eat: "", what_remains: "" },
      ],
    },
    structure: {
      total_weeks: 12,
      promise_days: 90,
      phases: [
        { num: 1, name: "", weeks: "1-3",  livrables: "" },
        { num: 2, name: "", weeks: "4-7",  livrables: "" },
        { num: 3, name: "", weeks: "8-12", livrables: "" },
      ],
      mecanisme_anchor: "",
    },
    conviction: {
      checklist: {
        sur_delivre: false,
        ten_clients: false,
        believe_price: false,
        recommend_to_brother: false,
        prepared_objections: false,
      },
      missing: "",
      next_action: "",
    },
  };
}

export function defaultM5State(): M5State {
  return {
    v: VERSION,
    schema_version: SCHEMA_VERSION,
    step: "welcome",
    highest: "welcome",
    data: freshData(),
    scores: { pont: null, conditions: null, eatcomplex: null, structure: null, conviction: null },
    attempts: { pont: 0, conditions: 0, eatcomplex: 0, structure: 0, conviction: 0 },
    forced: { pont: false, conditions: false, eatcomplex: false, structure: false, conviction: false },
    lastFb: { pont: null, conditions: null, eatcomplex: null, structure: null, conviction: null },
    upstream_forced: false,
    signed: false,
    signed_at: null,
    signed_by: "",
    m1_data: null, m1_source: null,
    m2_data: null, m2_source: null,
    m3_data: null, m3_source: null,
    m4_data: null, m4_source: null,
    demoMode: null,
    completed: false,
  };
}

// ─── Constantes pédagogiques ────────────────────────────────────────────
export const STEPS_META: Array<{ id: M5Step; short: string; full: string }> = [
  { id: "welcome",     short: "Welcome",      full: "Bienvenue · audit High-Ticket" },
  { id: "pont",        short: "Le pont",      full: "Point A → Point B" },
  { id: "conditions",  short: "4 conditions", full: "Audit Hormozi : simple / rapide / systématique / aspirante" },
  { id: "eatcomplex",  short: "Eat Complex.", full: "Eat the complexity — tu manges, ton client digère" },
  { id: "structure",   short: "Structure",    full: "Structure 12 semaines · promesse 90 jours" },
  { id: "conviction",  short: "Conviction",   full: "Conviction intérieure — vérité interne" },
  { id: "lock",        short: "Lock",         full: "Signature, export PDF & handoff vers M6" },
];

export const PEDA_STEPS: PedaStepKey[] = ["pont", "conditions", "eatcomplex", "structure", "conviction"];

export const CONDITION_AXES: Array<{
  key: ConditionAxisKey; label: string; emoji: string; principle: string;
  contextLabel: string; contextField: keyof ConditionAxis;
}> = [
  { key: "simple", label: "Simple", emoji: "🧩",
    principle: "Une marche à la fois. Pas de jonglage cognitif.",
    contextLabel: "Mode de delivery", contextField: "delivery_mode" },
  { key: "rapide", label: "Rapide", emoji: "⚡",
    principle: "Quick win mesurable < 30 jours, sinon le client doute.",
    contextLabel: "Délai promesse (jours)", contextField: "timeframe_days" },
  { key: "systematique", label: "Systématique", emoji: "🔄",
    principle: "Même méthode, mêmes résultats. Pas de magie.",
    contextLabel: "Type de preuve", contextField: "proof_type" },
  { key: "aspirante", label: "Aspirante", emoji: "🌟",
    principle: "La transformation vaut le sacrifice. Vrai changement de vie.",
    contextLabel: "Amplitude visée", contextField: "amplitude" },
];

// ─── Helpers d'extraction ───────────────────────────────────────────────
export function pickAvatarName(state: M5State): string {
  return state.m1_data?.avatar?.socio?.nom?.trim() || "ton avatar";
}

export function pickPriceText(state: M5State): string {
  return state.m4_data?.ht?.price
    || state.m3_data?.prix_display
    || state.m3_data?.prix?.montant
    || "—";
}

export function pickMecanismeText(state: M5State): string {
  return state.m3_data?.hero_mecanisme_nom
    || state.m3_data?.mecanisme?.nom
    || state.data.structure.mecanisme_anchor
    || "ta méthode";
}

/** Renvoie le seuil de validation : 85 si M4 forcé, sinon 80. */
export function validationThreshold(state: M5State): number {
  return state.upstream_forced ? VALIDATION_THRESHOLD_FORCED_M4 : VALIDATION_THRESHOLD;
}
