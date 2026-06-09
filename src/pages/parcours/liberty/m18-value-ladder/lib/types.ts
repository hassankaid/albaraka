/**
 * M18 — VALUE LADDER REVISITÉE — constantes, types & helpers purs.
 * Portage React du code source Sidali v1.0.0 (5 étapes, SANS IA, heuristique).
 * welcome → echelle → ascension → ltv → lock. Génère séquences email + carte PDF écosystème.
 */

export const VERSION = "v1.0.0";
export const SCHEMA_VERSION = "m18_v1";
export const STORAGE_KEY = "m18_value_ladder_state_v1";
export const PROFILE_KEY = "liberty_user_profile_v1";
export const MODULE_ID = "m18";
export const DEBOUNCE_MS = 450;

// ─── Étapes ──────────────────────────────────────────────────────────
export type M18Step = "welcome" | "echelle" | "ascension" | "ltv" | "lock";
export interface StepMeta { id: M18Step; short: string; full: string; }
export const STEPS_META: StepMeta[] = [
  { id: "welcome", short: "Welcome", full: "Bienvenue — assembler ta Value Ladder complète" },
  { id: "echelle", short: "1 · Échelle", full: "1 · Poser les 5 niveaux de ton échelle (du gratuit au High-Ticket)" },
  { id: "ascension", short: "2 · Ascension", full: "2 · Définir les passages d’une marche à la suivante" },
  { id: "ltv", short: "3 · LTV", full: "3 · Calculer la valeur vie client (LTV) de ton écosystème" },
  { id: "lock", short: "4 · Carte", full: "4 · Signature et génération de la carte PDF de ton écosystème" },
];
export const STEP_KEYS: M18Step[] = STEPS_META.map((s) => s.id);
export function stepIndex(k: string): number { return STEP_KEYS.indexOf(k as M18Step); }

// ─── Les 5 niveaux de la Value Ladder ────────────────────────────────
export type LevelKey = "gratuit" | "lead_magnet" | "lt" | "mt" | "ht";
export interface Level { key: LevelKey; id: number; label: string; roleLabel: string; roleClass: string; paid: boolean; hint: string; src: string; }
export const LEVELS: Level[] = [
  { key: "gratuit", id: 0, label: "Niveau 0 · Contenu gratuit", roleLabel: "Visibilité", roleClass: "r-vis", paid: false, hint: "Posts réseaux, vidéos YouTube, podcasts. Tu ne vends rien — tu démontres ton expertise et tu crées la confiance.", src: "manual" },
  { key: "lead_magnet", id: 1, label: "Niveau 1 · Lead magnet", roleLabel: "Captation", roleClass: "r-cap", paid: false, hint: "Checklist, mini-guide, masterclass gratuite contre un email. Tu transformes un curieux en contact.", src: "manual" },
  { key: "lt", id: 2, label: "Niveau 2 · Low-Ticket", roleLabel: "Première transaction", roleClass: "r-trans", paid: true, hint: "Tripwire 7–47 €. Pas un profit center : il finance ton acquisition et crée la première vente.", src: "m16" },
  { key: "mt", id: 3, label: "Niveau 3 · Middle-Ticket", roleLabel: "Moteur de profit", roleClass: "r-profit", paid: true, hint: "Version packagée et automatisée de ton accompagnement. Ton cash-flow régulier.", src: "m14" },
  { key: "ht", id: 4, label: "Niveau 4 · High-Ticket", roleLabel: "Validation & marge", roleClass: "r-valid", paid: true, hint: "Ton accompagnement premium en 1-to-1 ou petit groupe. La marge la plus haute, le moins de volume.", src: "m5/m6" },
];
export const LEVEL_KEYS: LevelKey[] = LEVELS.map((l) => l.key);
export function levelCfg(k: string): Level | null { return LEVELS.find((l) => l.key === k) || null; }

// ─── Garde-fous (règles dures) ───────────────────────────────────────
export const LT_MIN = 7, LT_MAX = 47;
export const RATIO_LT_MT_MIN = 5, RATIO_LT_MT_MAX = 20;
export const LTV_MULTIPLE_TARGET = 3;
export const TRACE_MIN_LENGTH = 15;

// ─── Mots-pièges génériques ──────────────────────────────────────────
export const GENERIC_TRAPS = ["sérieux", "serieux", "ambitieux", "premium", "complet", "complète", "complete", "ultimate", "best", "top", "expert", "expertise", "meilleur", "meilleure", "haut de gamme", "exclusif", "exclusive", "révolutionnaire", "revolutionnaire", "disruptif", "innovant", "unique en son genre", "sans équivalent", "incomparable", "optimisé", "optimise", "professionnel", "professionnelle", "qualitatif"];
export function detectGenericTraps(txt: string): string[] {
  const t = String(txt || "").toLowerCase();
  if (!t.trim()) return [];
  const found: string[] = [];
  for (const trap of GENERIC_TRAPS) {
    const re = new RegExp("(^|[^a-zà-ÿ])" + trap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-zà-ÿ]|$)", "i");
    if (re.test(t)) found.push(trap);
  }
  return Array.from(new Set(found));
}
export function hasMinTrace(s: string): boolean { return String(s || "").trim().length >= TRACE_MIN_LENGTH; }
export function toIntPrice(v: any): number { const n = parseInt(String(v).replace(/[^0-9]/g, ""), 10); return isNaN(n) ? 0 : n; }
export function fmtEur(n: any): string { return (Number(n) || 0).toLocaleString("fr-FR") + " €"; }
export function escapeHtml(s: any): string { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

// ─── State ───────────────────────────────────────────────────────────
export interface Niveau { nom?: string; prix?: number; src?: string; canaux?: string; format?: string; }
export interface EmailOverride { objet?: string; corps?: string; }
export interface M18Data {
  niveaux: { gratuit: Niveau; lead_magnet: Niveau; lt: Niveau; mt: Niveau; ht: Niveau };
  connexion_lt_mt: string;
  transitions: { lt_mt: string; mt_ht: string };
  emails: { lt_mt: EmailOverride[]; mt_ht: EmailOverride[] };
  ltv: { taux_lt_mt: number };
}
export interface ActiveDemo { id: string; name: string; }
export interface M18State {
  version: string; module: string; schema_version: string;
  data: M18Data;
  highest: M18Step; current: M18Step;
  signed: boolean; signed_at: string | null; signed_by: string;
  demoMode: boolean; _activeDemo: ActiveDemo | null; _welcomeView: "choice" | "demos";
  upstream_forced: boolean;
  m1_data: any; m1_source: string | null;
  m5_data: any; m5_source: string | null;
  m6_data: any; m6_source: string | null;
  m11_data: any; m11_source: string | null;
  m12_data: any; m12_source: string | null;
  m14_data: any; m14_source: string | null;
  m16_data: any; m16_source: string | null;
  m17_data: any; m17_source: string | null;
  last_save: string | null;
  _updated_at?: string;
}

export function freshData(): M18Data {
  return {
    niveaux: {
      gratuit: { nom: "", canaux: "", src: "manual" },
      lead_magnet: { nom: "", src: "manual" },
      lt: { nom: "", prix: 0, src: "m16" },
      mt: { nom: "", prix: 0, format: "", src: "m14" },
      ht: { nom: "", prix: 0, src: "m5/m6" },
    },
    connexion_lt_mt: "",
    transitions: { lt_mt: "", mt_ht: "" },
    emails: { lt_mt: [], mt_ht: [] },
    ltv: { taux_lt_mt: 0 },
  };
}
export function freshState(): M18State {
  return {
    version: VERSION, module: "M18_VALUE_LADDER", schema_version: SCHEMA_VERSION,
    data: freshData(),
    highest: "welcome", current: "welcome",
    signed: false, signed_at: null, signed_by: "",
    demoMode: false, _activeDemo: null, _welcomeView: "choice",
    upstream_forced: false,
    m1_data: null, m1_source: null,
    m5_data: null, m5_source: null,
    m6_data: null, m6_source: null,
    m11_data: null, m11_source: null,
    m12_data: null, m12_source: null,
    m14_data: null, m14_source: null,
    m16_data: null, m16_source: null,
    m17_data: null, m17_source: null,
    last_save: null,
  };
}
export function deepClone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }
