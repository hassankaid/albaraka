/**
 * État global persistant du M6 PRICING (v1.2.0 Sidali).
 * 9 étapes (welcome + 7 sprints pédagogiques + lock).
 * Consomme handoff_to_m6 depuis liberty_user_profile.m5 (qui propage
 * entry_strategy + ht_monthly_target + strategy_score_is_forced).
 * Si M5 a forcé → upstream_forced = true → seuil monté à 85 (au lieu 80).
 */

export type M6Step =
  | "welcome"
  | "valeur_prix"     // 1 — Valeur PAR le prix (psychologie premium)
  | "prix_valeur"     // 2 — Prix PAR la valeur (ROI ≥ 5)
  | "prix_marche"     // 3 — Vérifier par le marché (3 concurrents)
  | "prix_confiance"  // 4 — Calibrer par la confiance + plan d'augmentation
  | "paiements"       // 5 — Facilités de paiement halal (sans riba)
  | "bao"             // 6 — Bronze / Argent / Or
  | "script_annonce"  // 7 — Composer le pitch d'annonce
  | "lock";           // 8 — Signature & handoff vers M7

export type PedaStepKey =
  | "valeur_prix" | "prix_valeur" | "prix_marche" | "prix_confiance"
  | "paiements" | "bao" | "script_annonce";

export const VALIDATION_THRESHOLD = 80;
export const VALIDATION_THRESHOLD_STRICT = 85; // si M5/M4 forcé en upstream
export const FORCE_AVAILABLE_AFTER = 3;
export const SCHEMA_VERSION = "m6_v1";
export const VERSION = "v1.2.0";

export type MarketType = "b2c_info" | "b2c_transfo" | "b2b";
export type EntryStrategy = "ht_only" | "ht_lt" | "ht_mt" | "full";

// ─── Imports upstream M1..M5 ─────────────────────────────────────────────
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
  headline_promesse?: string;
  hero_mecanisme_nom?: string;
  prix_display?: string;
}

export interface M4ImportData {
  source: string;
  complete?: boolean;
  entry_strategy?: EntryStrategy | null;
  entry_strategy_label?: string;
  ht_monthly_target?: number | string;
  strategy_score?: number | null;
  strategy_score_is_forced?: boolean;
  ht?: { name?: string; price?: string; format?: string; rationale?: string };
}

/** Snapshot handoff_to_m6 produit par M5 LockScreen. */
export interface M5ImportData {
  source: string;
  complete?: boolean;
  handoff_to_m6?: {
    handoff_version?: string;
    ht_point_a?: string;
    ht_point_b?: string;
    ht_point_b_measurable?: string;
    ht_point_b_timeframe_days?: number;
    conditions_scores?: { simple: number; rapide: number; systematique: number; aspirante: number };
    weakest_condition_axis?: string;
    structure_phases?: Array<{ num: number; name: string; weeks: string; livrables: string }>;
    structure_total_weeks?: number;
    structure_promise_days?: number;
    mecanisme_anchor?: string;
    conviction_checklist?: Record<string, boolean>;
    avg_score?: number;
    upstream_forced?: boolean;
    entry_strategy?: EntryStrategy | null;
    ht_monthly_target?: number | string | null;
    strategy_score_is_forced?: boolean;
    signed_at?: string | null;
    signed_by?: string;
  };
}

// ─── Sub-states par étape (calque Sidali freshData) ──────────────────────
export interface ValeurPrixState {
  ma_bugatti: string;          // "Ma Bugatti" — qu'est-ce qui rend mon offre rare/premium
  signal_phrase: string;       // Le prix comme SIGNAL de qualité
  ancrage_phrase: string;      // L'ANCRAGE (comparer à 10× plus cher)
  contraste_phrase: string;    // CONTRASTE (vs l'alternative gratuite ou cheap)
  non_excuse_phrase: string;   // NON-EXCUSE (refuser de baisser le prix)
}

export interface PrixValeurState {
  resultat_client_12m: string;  // ex : "+50 000€ de CA additionnel sur 12 mois"
  prix_ht: string;              // ex : "2 997€"
  roi_calcule: number;          // ratio résultat/prix calculé auto
  justification_chiffrage: string;
}

export interface ConcurrentEntry {
  nom: string;
  prix: string;
  url: string;
}

export interface PrixMarcheState {
  concurrents: ConcurrentEntry[];      // 3 lignes
  prix_marche_moyen: number;
  positionnement: string;              // ex : "Premium top 25% vs marché"
}

export interface PlanAugmentationState {
  prochain_palier_prix: number;
  declencheur_clients_satisfaits: number;
  date_cible: string;
}

export interface PrixConfianceState {
  confiance_sur_deliver: number;       // slider 0-100
  prix_temporaire: string;             // si confiance < 70, prix d'entrée
  doutes_principaux: string;
  action_renforcement: string;
  plan_augmentation: PlanAugmentationState;
}

export interface PaiementOption {
  "1x": boolean;
  "3x": boolean;
  "6x": boolean;
  "12x": boolean;
}

export interface PaiementsState {
  options: PaiementOption;
  note_halal_acknowledged: boolean;    // checkbox "je confirme 0% intérêt"
  pitch_fractionnement: string;
}

export interface BaoTierState {
  prix: string;
  contenu_court: string;
}

export interface BaoState {
  bronze: BaoTierState;
  argent: BaoTierState;
  or: BaoTierState;
}

export interface ScriptAnnonceState {
  script_text: string;
}

export interface CommitmentNoPriceDropState {
  signed: boolean;
  signed_at: string | null;
  leviers_valeur: [string, string, string];
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

// ─── State global M6 ────────────────────────────────────────────────────
export interface M6Data {
  valeur_prix: ValeurPrixState;
  prix_valeur: PrixValeurState;
  prix_marche: PrixMarcheState;
  prix_confiance: PrixConfianceState;
  paiements: PaiementsState;
  bao: BaoState;
  script_annonce: ScriptAnnonceState;
  commitment_no_price_drop: CommitmentNoPriceDropState;
}

export interface M6State {
  version: string;
  module: string;
  schema_version: string;
  data: M6Data;
  scores: Record<PedaStepKey, number | null>;
  forced: Record<PedaStepKey, boolean>;
  attempts: Record<PedaStepKey, number>;
  lastFb: Record<PedaStepKey, AIFeedback | null>;
  highest: M6Step;       // ne progresse que par validation/force
  current: M6Step;
  upstream_forced: boolean;
  signed: boolean;
  signed_at: string | null;
  signed_by: string;
  demoMode: string | null;
  _activeDemo: string | null;
  m1_data: M1ImportData | null;
  m1_source: "profile" | "embedded" | null;
  m2_data: M2ImportData | null;
  m2_source: "profile" | null;
  m3_data: M3ImportData | null;
  m3_source: "profile" | null;
  m4_data: M4ImportData | null;
  m4_source: "profile" | null;
  m5_data: M5ImportData | null;
  m5_source: "profile" | null;
  completed: boolean;
  _updated_at?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function freshData(): M6Data {
  return {
    valeur_prix: { ma_bugatti: "", signal_phrase: "", ancrage_phrase: "", contraste_phrase: "", non_excuse_phrase: "" },
    prix_valeur: { resultat_client_12m: "", prix_ht: "", roi_calcule: 0, justification_chiffrage: "" },
    prix_marche: {
      concurrents: [
        { nom: "", prix: "", url: "" },
        { nom: "", prix: "", url: "" },
        { nom: "", prix: "", url: "" },
      ],
      prix_marche_moyen: 0,
      positionnement: "",
    },
    prix_confiance: {
      confiance_sur_deliver: 70,
      prix_temporaire: "",
      doutes_principaux: "",
      action_renforcement: "",
      plan_augmentation: { prochain_palier_prix: 0, declencheur_clients_satisfaits: 5, date_cible: "" },
    },
    paiements: {
      options: { "1x": true, "3x": false, "6x": false, "12x": false },
      note_halal_acknowledged: false,
      pitch_fractionnement: "",
    },
    bao: {
      bronze: { prix: "", contenu_court: "" },
      argent: { prix: "", contenu_court: "" },
      or:     { prix: "", contenu_court: "" },
    },
    script_annonce: { script_text: "" },
    commitment_no_price_drop: { signed: false, signed_at: null, leviers_valeur: ["", "", ""] },
  };
}

export function defaultM6State(): M6State {
  return {
    version: VERSION,
    module: "M6_PRICING",
    schema_version: SCHEMA_VERSION,
    data: freshData(),
    scores: {
      valeur_prix: null, prix_valeur: null, prix_marche: null, prix_confiance: null,
      paiements: null, bao: null, script_annonce: null,
    },
    forced: {
      valeur_prix: false, prix_valeur: false, prix_marche: false, prix_confiance: false,
      paiements: false, bao: false, script_annonce: false,
    },
    attempts: {
      valeur_prix: 0, prix_valeur: 0, prix_marche: 0, prix_confiance: 0,
      paiements: 0, bao: 0, script_annonce: 0,
    },
    lastFb: {
      valeur_prix: null, prix_valeur: null, prix_marche: null, prix_confiance: null,
      paiements: null, bao: null, script_annonce: null,
    },
    highest: "welcome",
    current: "welcome",
    upstream_forced: false,
    signed: false,
    signed_at: null,
    signed_by: "",
    demoMode: null,
    _activeDemo: null,
    m1_data: null, m1_source: null,
    m2_data: null, m2_source: null,
    m3_data: null, m3_source: null,
    m4_data: null, m4_source: null,
    m5_data: null, m5_source: null,
    completed: false,
  };
}

// ─── Constantes pédagogiques ────────────────────────────────────────────
export const STEPS_META: Array<{ id: M6Step; short: string; full: string }> = [
  { id: "welcome",        short: "Welcome",     full: "Bienvenue · audit pricing" },
  { id: "valeur_prix",    short: "1 · Valeur",  full: "La valeur par le prix · psychologie premium" },
  { id: "prix_valeur",    short: "2 · ROI",     full: "Prix par la VALEUR · ROI ≥ 5" },
  { id: "prix_marche",    short: "3 · Marché",  full: "Vérifier par le MARCHÉ · jamais le moins cher" },
  { id: "prix_confiance", short: "4 · Confiance", full: "Calibrer par la CONFIANCE + plan d'augmentation" },
  { id: "paiements",      short: "5 · Paiement", full: "Facilités de paiement halal (sans riba)" },
  { id: "bao",            short: "6 · B/A/O",   full: "Bronze / Argent / Or — stratégie 3 options" },
  { id: "script_annonce", short: "7 · Script",  full: "Composer mon pitch d'annonce de prix" },
  { id: "lock",           short: "8 · Lock",    full: "Signature & handoff vers M7" },
];

export const PEDA_STEPS: PedaStepKey[] = [
  "valeur_prix", "prix_valeur", "prix_marche", "prix_confiance",
  "paiements", "bao", "script_annonce",
];

// ─── Helpers d'extraction ───────────────────────────────────────────────
export function pickAvatarName(state: M6State): string {
  return state.m1_data?.avatar?.socio?.nom?.trim() || "ton avatar";
}

export function pickHTName(state: M6State): string {
  return state.m4_data?.ht?.name
    || state.m3_data?.hero_mecanisme_nom
    || state.m3_data?.mecanisme?.nom
    || "ton high-ticket";
}

export function pickHTPrice(state: M6State): string {
  return state.m4_data?.ht?.price
    || state.m3_data?.prix_display
    || state.m3_data?.prix?.montant
    || "—";
}

/** Renvoie le seuil de validation : 85 si M5/M4 forcé, sinon 80. */
export function validationThreshold(state: M6State): number {
  return state.upstream_forced ? VALIDATION_THRESHOLD_STRICT : VALIDATION_THRESHOLD;
}

/** Calcule ROI = résultat_12m / prix_ht (parse strings). */
export function computeROI(resultat12m: string, prixHt: string): number {
  const r = parseFloat((resultat12m || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const p = parseFloat((prixHt || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  if (p <= 0) return 0;
  return Math.round((r / p) * 10) / 10;
}

/** Calcule la moyenne des prix concurrents. */
export function computeMarketAvg(concurrents: ConcurrentEntry[]): number {
  const vals = concurrents
    .map((c) => parseFloat((c.prix || "").replace(/[^\d.,]/g, "").replace(",", ".")))
    .filter((n) => !isNaN(n) && n > 0);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
