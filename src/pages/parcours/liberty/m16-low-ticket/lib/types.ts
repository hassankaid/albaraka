/**
 * M16 — CRÉER TON PRODUIT LOW-TICKET — constantes, types & helpers purs.
 * Portage React du code source Sidali v1.0.0 (7 étapes, génération IA Claude + locale, export doc éditable).
 * welcome → role → format → promesse → pricing → generation → lock.
 */

export const VERSION = "v1.0.0";
export const SCHEMA_VERSION = "m16_v1";
export const STORAGE_KEY = "m16_low_ticket_state_v1";
export const PROFILE_KEY = "liberty_user_profile_v1";
export const MODULE_ID = "m16";
export const DEBOUNCE_MS = 500;
export const AI_MAX_TOKENS = 2200;

// ─── Étapes ──────────────────────────────────────────────────────────
export type M16Step = "welcome" | "role" | "format" | "promesse" | "pricing" | "generation" | "lock";
export interface StepMeta { id: M16Step; short: string; full: string; }
export const STEPS_META: StepMeta[] = [
  { id: "welcome", short: "Welcome", full: "Bienvenue — créer ton produit Low-Ticket" },
  { id: "role", short: "1 · Rôle", full: "1 · Le rôle stratégique du Low-Ticket" },
  { id: "format", short: "2 · Format", full: "2 · Choisir LE format de ton produit" },
  { id: "promesse", short: "3 · Promesse", full: "3 · La promesse — première marche vers ton offre principale" },
  { id: "pricing", short: "4 · Prix", full: "4 · Fixer le prix avec les garde-fous" },
  { id: "generation", short: "5 · Création", full: "5 · Générer le contenu de ton produit" },
  { id: "lock", short: "6 · Verrou", full: "6 · Signature et export éditable" },
];
export const STEP_KEYS: M16Step[] = STEPS_META.map((s) => s.id);
export function stepIndex(k: string): number { return STEP_KEYS.indexOf(k as M16Step); }
export function clampInt(v: any, d: number): number { const n = parseInt(v, 10); return isNaN(n) ? d : n; }

// ─── Formats Low-Ticket ──────────────────────────────────────────────
export type FormatKey = "mini_cours" | "ebook";
export interface FormatLT {
  key: FormatKey; label: string; prix_min: number; prix_max: number; prix_reco: number;
  livrable: "tournage" | "document"; desc: string; quand: string; effort: string;
}
export const FORMATS_LT: Record<FormatKey, FormatLT> = {
  mini_cours: {
    key: "mini_cours", label: "Mini-cours vidéo", prix_min: 17, prix_max: 47, prix_reco: 27, livrable: "tournage",
    desc: "3 à 5 courtes vidéos sur un sujet précis. L'outil génère le plan découpé en leçons + le script de chacune, prêt à tourner.",
    quand: "Le format roi du low-ticket francophone : la vidéo crée du lien et démontre ta pédagogie avant ton offre principale.",
    effort: "Moyen (tournage requis)",
  },
  ebook: {
    key: "ebook", label: "Ebook / Guide premium", prix_min: 9, prix_max: 37, prix_reco: 17, livrable: "document",
    desc: "Un guide structuré et dense qui résout un problème précis. Le document que l'outil génère EST le produit que tu vends, prêt à éditer.",
    quand: "Universel : tu écris une fois, tu vends à l'infini. Idéal si tu es à l'aise à l'écrit et que ta valeur passe bien en texte.",
    effort: "Faible à moyen (rédaction)",
  },
};
export const FORMAT_KEYS: FormatKey[] = Object.keys(FORMATS_LT) as FormatKey[];
export const LIVRABLE_LABEL: Record<string, string> = {
  document: "Document éditable (ton produit fini)",
  tournage: "Kit de tournage (plan + scripts à filmer)",
};

// ─── Règles de prix ──────────────────────────────────────────────────
export const PRIX_MIN = 7, PRIX_MAX = 47; // fenêtre optimale de l'achat impulsif
export const RATIO_MIN = 5, RATIO_MAX = 20; // LT doit être 5 à 20× moins cher que le MT

// ─── State ───────────────────────────────────────────────────────────
export interface Section { heading: string; body: string; }
export interface Appearance { mode: "albaraka" | "custom"; primary: string; headFont: string; bodyFont: string; logo: string; }
export interface M16Data {
  format_choisi: string; format_suggere: string; format_justification: string;
  titre: string; promesse_lt: string; promesse_lien_mt: string;
  prix_lt: number; prix_lt_suggere: number;
  sections: Section[];
  content_edited: boolean;
  _regenPending: boolean; _aiBusy: boolean; _aiGenerated: boolean;
  appearance: Appearance;
}
export interface M16State {
  current: M16Step; highest: M16Step; _welcomeView: "choice" | "demos";
  demoMode: boolean; demoLabel: string;
  signed: boolean; signed_at: string | null; signed_by: string;
  m1_data: any; m6_data: any; m12_data: any; m14_data: any; m15_data: any;
  m1_source: string | null; m6_source: string | null; m12_source: string | null; m14_source: string | null; m15_source: string | null;
  data: M16Data;
  last_save: string | null;
  _updated_at?: string;
}

export function freshData(): M16Data {
  return {
    format_choisi: "", format_suggere: "", format_justification: "",
    titre: "", promesse_lt: "", promesse_lien_mt: "",
    prix_lt: 0, prix_lt_suggere: 0,
    sections: [],
    content_edited: false,
    _regenPending: false, _aiBusy: false, _aiGenerated: false,
    appearance: { mode: "albaraka", primary: "#A8842D", headFont: "Crimson Pro", bodyFont: "Inter", logo: "" },
  };
}
export function freshState(): M16State {
  return {
    current: "welcome", highest: "welcome", _welcomeView: "choice",
    demoMode: false, demoLabel: "",
    signed: false, signed_at: null, signed_by: "",
    m1_data: null, m6_data: null, m12_data: null, m14_data: null, m15_data: null,
    m1_source: null, m6_source: null, m12_source: null, m14_source: null, m15_source: null,
    data: freshData(),
    last_save: null,
  };
}
