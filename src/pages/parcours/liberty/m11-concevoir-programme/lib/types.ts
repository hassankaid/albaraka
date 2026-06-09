/**
 * M11 CONCEVOIR UN PROGRAMME — types, constantes & factories.
 * Portage React du code source Sidali v1.5.0 (outil lourd, validations heuristiques, SANS IA Claude).
 * 8 étapes : welcome → gate → points A/B → obstacles brut → tri → mapping → fiches → lock.
 */

export const VERSION = "v1.5.0";
export const SCHEMA_VERSION = "m11_v1";
export const STORAGE_KEY = "m11_concevoir_programme_state_v1";
export const PROFILE_KEY = "liberty_user_profile_v1";
export const MODULE_ID = "m11";
export const DEBOUNCE_MS = 450;

// ─── Bornes ───────────────────────────────────────────────────────────
export const MAX_MODULES = 8;
export const MIN_OBSTACLES = 5;
export const MIN_MODULES_FINAL = 4;
export const MAX_OBSTACLES = 12;
export const MIN_LECONS = 3;
export const MAX_LECONS = 8;

// ─── Étapes ───────────────────────────────────────────────────────────
export type M11Step =
  | "welcome" | "gate_transition" | "points_ab" | "obstacles_brut"
  | "obstacles_ordres" | "modules_mapping" | "module_fiches" | "lock";

export interface StepMeta { id: M11Step; short: string; full: string; }

export const STEPS_META: StepMeta[] = [
  { id: "welcome",          short: "Welcome",      full: "Bienvenue · architecturer ton programme" },
  { id: "gate_transition",  short: "1 · Gate",     full: "Gate transition · prérequis validés" },
  { id: "points_ab",        short: "2 · A & B",    full: "Point A → Point B · où tu emmènes ton client" },
  { id: "obstacles_brut",   short: "3 · Obstacles", full: "Lister les obstacles entre A et B" },
  { id: "obstacles_ordres", short: "4 · Tri",      full: "Ordonner chronologiquement les obstacles" },
  { id: "modules_mapping",  short: "5 · Modules",  full: "Mapper obstacles → modules" },
  { id: "module_fiches",    short: "6 · Fiches",   full: "Fiche structure de chaque module" },
  { id: "lock",             short: "7 · Lock",     full: "Signature & transmission" },
];

export const STEP_KEYS: M11Step[] = STEPS_META.map((s) => s.id);
export const PEDA_STEP_KEYS: M11Step[] = ["gate_transition", "points_ab", "obstacles_brut", "obstacles_ordres", "modules_mapping", "module_fiches"];
export function stepIndex(k: M11Step): number { return STEP_KEYS.indexOf(k); }

// ─── Gate (prérequis) ─────────────────────────────────────────────────
export interface GateItem { id: GateKey; title: string; desc: string; dep_module: string; }
export type GateKey =
  | "niche_specifique" | "offre_validee" | "appels_qualifies" | "acquisition_automatisee"
  | "closing_valide" | "integration_validee" | "retours_positifs" | "dix_clients_heureux";

export const GATE_ITEMS: GateItem[] = [
  { id: "niche_specifique",        title: "Niche spécifique",                  desc: "Ta niche est spécifique. Les gens à l'intérieur ont du pouvoir d'achat et une douleur urgente et reconnue.", dep_module: "M1 NICHE" },
  { id: "offre_validee",           title: "Offre validée",                     desc: "Ton offre est validée par le marché — les gens veulent le résultat que tu promets et tu l'as vendu plusieurs fois.", dep_module: "M3 ANATOMIE" },
  { id: "appels_qualifies",        title: "Appels qualifiés en continu",       desc: "Tu as un moyen prévisible d'obtenir des appels qualifiés via la création de contenu — pas un coup de chance ponctuel.", dep_module: "Acquisition" },
  { id: "acquisition_automatisee", title: "Acquisition automatisée",           desc: "Ton système d'acquisition est complètement ou quasi automatisé. Tu ne dépends plus à 100% de toi pour générer des leads.", dep_module: "Acquisition" },
  { id: "closing_valide",          title: "Closing validé (15-35%)",           desc: "Ton taux de transformation en call est entre 15 et 35%. En dessous, ton process de closing n'est pas prêt à scaler.", dep_module: "Closing" },
  { id: "integration_validee",     title: "Intégration client validée",        desc: "Tu sais comment accueillir un client dans ton accompagnement d'une manière qualitative. Pas d'improvisation sur l'onboarding.", dep_module: "M10" },
  { id: "retours_positifs",        title: "Retours majoritairement positifs",  desc: "Des retours et témoignages sur l'efficacité de ta méthode. Pas un succès isolé — un pattern qui se répète.", dep_module: "M8 PREUVE" },
  { id: "dix_clients_heureux",     title: "10 clients heureux livrés",         desc: "10 clients avec des résultats concrets. C'est le seuil minimum pour avoir validé ta proof of concept. Sans ça, tu construis dans le vide.", dep_module: "M10" },
];

// ─── Bloom ────────────────────────────────────────────────────────────
export type BloomKey = "se_souvenir" | "comprendre" | "appliquer" | "analyser" | "evaluer" | "creer";
export type Tier = "lt" | "mt" | "ht";

export const BLOOM_LEVELS: Record<BloomKey, { label: string; tier_min: Tier; meta: string }> = {
  se_souvenir: { label: "Se souvenir", tier_min: "lt", meta: "QCM, lexique, faits clés à mémoriser" },
  comprendre:  { label: "Comprendre",  tier_min: "lt", meta: "Résumé, reformulation, explication avec ses mots" },
  appliquer:   { label: "Appliquer",   tier_min: "lt", meta: "Exercice avec template, mise en pratique guidée" },
  analyser:    { label: "Analyser",    tier_min: "mt", meta: "Étude de cas, diagnostic, décortiquer un exemple réel" },
  evaluer:     { label: "Évaluer",     tier_min: "mt", meta: "Auto-évaluation, grille de notation, jugement critique" },
  creer:       { label: "Créer",       tier_min: "ht", meta: "Projet fil rouge, livrable final original" },
};
export const BLOOM_KEYS_BY_TIER: Record<Tier, BloomKey[]> = {
  lt: ["se_souvenir", "comprendre", "appliquer"],
  mt: ["se_souvenir", "comprendre", "appliquer", "analyser", "evaluer"],
  ht: ["se_souvenir", "comprendre", "appliquer", "analyser", "evaluer", "creer"],
};
export const BLOOM_RECOMMENDED_BY_TIER: Record<Tier, BloomKey> = { lt: "appliquer", mt: "evaluer", ht: "creer" };
export const BLOOM_ORDINALS: Record<BloomKey, number> = { se_souvenir: 1, comprendre: 2, appliquer: 3, analyser: 4, evaluer: 5, creer: 6 };

export const TIERS: Record<Tier, { label: string; meta: string }> = {
  lt: { label: "Low-ticket",  meta: "Produit < 500 € — autoformation pure, exigence pédagogique : jusqu'à Appliquer" },
  mt: { label: "Mid-ticket",  meta: "Produit 500 - 2 000 € — autoformation + accompagnement léger, exigence : jusqu'à Évaluer" },
  ht: { label: "High-ticket", meta: "Produit ≥ 2 000 € — DIY + coaching + communauté, exigence : jusqu'à Créer" },
};

export type ExerciceKey = "template" | "livrable" | "qcm" | "etude_cas" | "role_play" | "projet";
export const EXERCICE_TYPES: Record<ExerciceKey, { label: string; meta: string }> = {
  template:  { label: "Template à remplir",     meta: "Fichier/document à compléter avec un cadre pré-rempli" },
  livrable:  { label: "Livrable concret",       meta: "L'élève produit un asset utilisable (script, page, message…)" },
  qcm:       { label: "QCM / Quiz",             meta: "Vérification de compréhension avec corrigé" },
  etude_cas: { label: "Étude de cas",           meta: "Analyse d'un exemple réel avec questions guidées" },
  role_play: { label: "Rôle-play / simulation", meta: "Mise en situation simulée avec un cadre" },
  projet:    { label: "Projet fil rouge",       meta: "Livrable de fin de programme — réservé HT" },
};

// ─── Accountability ───────────────────────────────────────────────────
export type AccValidationKey = "auto" | "pair" | "coach_async" | "coach_sync";
export type AccFrequenceKey = "aucun" | "global" | "mensuel" | "hebdo" | "quotidien";
export type AccEngagementKey = "aucun" | "declaration" | "caution" | "public" | "caution_public";
export type AccProgressionKey = "tout_ouvert" | "drip" | "gate_livrable" | "cohort";

export const ACCOUNTABILITY_VALIDATION: Record<AccValidationKey, { label: string; meta: string; force: number }> = {
  auto:        { label: "Auto-évaluation",     meta: "L'élève s'évalue avec ta grille · le moins fort, suffisant en LT", force: 1 },
  pair:        { label: "Pair review",         meta: "Validation par un autre élève en communauté · moyen, demande une communauté active", force: 2 },
  coach_async: { label: "Coach review async",  meta: "Retour écrit d'un coach sous 48-72h · fort, demande un staff", force: 3 },
  coach_sync:  { label: "Coach call sync",     meta: "Validation en appel 1-to-1 ou hot seat groupe · le plus fort, le plus cher", force: 4 },
};
export const ACCOUNTABILITY_FREQUENCE: Record<AccFrequenceKey, { label: string; meta: string; force: number }> = {
  aucun:     { label: "Aucun contact humain", meta: "DIY pur · risqué au-delà du LT", force: 0 },
  global:    { label: "Un seul contact",      meta: "Call de kick-off ou de bilan final", force: 1 },
  mensuel:   { label: "Mensuel",              meta: "Group call mensuel ou hot seat", force: 2 },
  hebdo:     { label: "Hebdomadaire",         meta: "Group call hebdo · standard high-ticket", force: 3 },
  quotidien: { label: "Quotidien",            meta: "Slack/Discord avec présence coach · premium", force: 4 },
};
export const ACCOUNTABILITY_ENGAGEMENT: Record<AccEngagementKey, { label: string; meta: string; force: number }> = {
  aucun:          { label: "Aucun engagement",            meta: "Ni signature ni déclaration · risqué", force: 0 },
  declaration:    { label: "Engagement signé",            meta: "Déclaration de complétion à l'onboarding", force: 1 },
  caution:        { label: "Caution remboursable",        meta: "Caution rendue à la complétion ou cas similaire", force: 2 },
  public:         { label: "Public commitment",           meta: "Annonce publique à la communauté ou à un proche", force: 2 },
  caution_public: { label: "Renforcé (caution + public)", meta: "Caution remboursable ET annonce publique · maximum d'engagement", force: 4 },
};
export const ACCOUNTABILITY_PROGRESSION: Record<AccProgressionKey, { label: string; meta: string; force: number }> = {
  tout_ouvert:   { label: "Tout ouvert",            meta: "Tous les modules dispos dès J1 · maximum de liberté, minimum de structure", force: 0 },
  drip:          { label: "Drip sur calendrier",    meta: "Un module débloqué chaque semaine ou mois", force: 1 },
  gate_livrable: { label: "Gate par livrable validé", meta: "Module suivant accessible après validation du précédent", force: 3 },
  cohort:        { label: "Cohort synchronisée",    meta: "Tous les élèves avancent ensemble · sessions live communes", force: 4 },
};

export const DUREE_MOIS_OPTIONS = ["1", "2", "3", "6", "9", "12", "18", "24"];

// ─── Modèle de données ────────────────────────────────────────────────
export interface Gate {
  niche_specifique: boolean; offre_validee: boolean; appels_qualifies: boolean;
  acquisition_automatisee: boolean; closing_valide: boolean; integration_validee: boolean;
  retours_positifs: boolean; dix_clients_heureux: boolean; override_warning: boolean;
}
export interface Accountability {
  validation_par_defaut: "" | AccValidationKey;
  frequence_contact_humain: "" | AccFrequenceKey;
  engagement_initial: "" | AccEngagementKey;
  progression_modules: "" | AccProgressionKey;
}
export interface Lecon { id: string; titre: string; angle: string; duree_min: string; active_recall: string; }
export interface Module {
  id: string; obstacle_origine: string; nom: string; objectif_mesurable: string;
  niveau_bloom: "" | BloomKey; duree_video: string; type_exercice: "" | ExerciceKey;
  livrable_attendu: string; mise_situation: string; auto_evaluation: string;
  lecons: Lecon[]; concepts_revises: string; mode_validation: "" | AccValidationKey;
}
export interface M11Data {
  gate: Gate;
  point_a: string; point_b: string;
  obstacles_brut: string[];
  obstacles_ordonnes: string[];
  modules: Module[];
  tier_bloom_target: "" | Tier;
  accountability: Accountability;
  duree_programme_mois: string;
}
export interface M11State {
  version: string; module: string; schema_version: string;
  data: M11Data;
  highest: M11Step; current: M11Step;
  signed: boolean; signed_at: string | null; signed_by: string;
  demoMode: string | null; _activeDemo: string | null;
  _activeFicheIdx: number;
  upstream_forced: boolean;
  m1_data?: any; m1_source?: string | null;
  m2_data?: any; m2_source?: string | null;
  m3_data?: any; m3_source?: string | null;
  m5_data?: any; m5_source?: string | null;
  m6_data?: any; m6_source?: string | null;
  m7_data?: any; m7_source?: string | null;
  m8_data?: any; m8_source?: string | null;
  m10_data?: any; m10_source?: string | null;
  last_save?: string | null;
  _updated_at?: string;
  _commit?: boolean;
}

// ─── Factories ────────────────────────────────────────────────────────
export function freshGate(): Gate {
  return {
    niche_specifique: false, offre_validee: false, appels_qualifies: false,
    acquisition_automatisee: false, closing_valide: false, integration_validee: false,
    retours_positifs: false, dix_clients_heureux: false, override_warning: false,
  };
}
export function freshAccountability(): Accountability {
  return { validation_par_defaut: "", frequence_contact_humain: "", engagement_initial: "", progression_modules: "" };
}
export function freshLecon(): Lecon { return { id: "", titre: "", angle: "", duree_min: "", active_recall: "" }; }
export function freshModule(): Module {
  return {
    id: "", obstacle_origine: "", nom: "", objectif_mesurable: "", niveau_bloom: "",
    duree_video: "", type_exercice: "", livrable_attendu: "", mise_situation: "",
    auto_evaluation: "", lecons: [], concepts_revises: "", mode_validation: "",
  };
}
export function freshData(): M11Data {
  return {
    gate: freshGate(), point_a: "", point_b: "", obstacles_brut: [], obstacles_ordonnes: [],
    modules: [], tier_bloom_target: "", accountability: freshAccountability(), duree_programme_mois: "12",
  };
}
export function defaultM11State(): M11State {
  return {
    version: VERSION, module: "M11_CONCEVOIR_PROGRAMME", schema_version: SCHEMA_VERSION,
    data: freshData(), highest: "welcome", current: "welcome",
    signed: false, signed_at: null, signed_by: "",
    demoMode: null, _activeDemo: null, _activeFicheIdx: 0, upstream_forced: false,
    m1_data: null, m2_data: null, m3_data: null, m5_data: null, m6_data: null,
    m7_data: null, m8_data: null, m10_data: null, last_save: null,
  };
}

export function tierFromPrice(prix: any): Tier {
  const p = parseInt(prix, 10) || 0;
  if (p >= 2000) return "ht";
  if (p >= 500) return "mt";
  return "lt";
}

export function deepClone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }
