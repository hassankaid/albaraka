/** M16 — contexte amont consolidé, évaluation prix, gating, suggestions (helpers purs). */
import { type M16State, type M16Step, FORMATS_LT, FORMAT_KEYS, PRIX_MIN, PRIX_MAX, RATIO_MIN, RATIO_MAX, clampInt } from "./types";

export interface Ctx {
  niche: string; avatar: string; mecanisme: string; programme_mt: string;
  prix_mt: number; prix_ht: number; point_a: string; point_b: string;
  promesse_amont: string; dominant_pain: string; mt_format: string; halal: boolean;
}
/** Contexte amont consolidé — source unique pour la génération et l'ancrage prix. */
export function ctx(state: M16State): Ctx {
  const m14 = state.m14_data || {}, m12 = state.m12_data || {}, m6 = state.m6_data || {}, m1 = state.m1_data || {}, m15 = state.m15_data || {};
  return {
    niche: m14.niche || m1.niche || m15.niche || "",
    avatar: m14.avatar || m1.avatar_nom || m15.avatar_label || "",
    mecanisme: m12.methode_nom || m14.methode_nom || m15.mecanisme_nom || "",
    programme_mt: m14.programme_mt_nom || m12.programme_nom || "",
    prix_mt: m14.prix_mt || 0,
    prix_ht: m14.prix_ht || m6.prix_ht || 0,
    point_a: m14.point_a || "",
    point_b: m14.point_b || "",
    promesse_amont: m14.promesse_amont || "",
    dominant_pain: m14.dominant_pain || m6.dominant_pain || m1.dominant_pain || "",
    mt_format: m14.format_mt_label || "",
    halal: !!m14.halal_no_riba,
  };
}
export function hasUpstream(state: M16State): boolean {
  const c = ctx(state);
  return !!(c.prix_mt || c.avatar || c.mecanisme);
}

// ─── Évaluation du prix LT ───────────────────────────────────────────
export interface PricingResult {
  lt: number; mt: number; inWindow: boolean; ratio: number; ratioOk: boolean;
  atWindowMax: boolean; isPsycho: boolean; usable: boolean; warnings: string[];
  range_lo: number; range_hi: number;
}
export function pricingEval(state: M16State): PricingResult {
  const c = ctx(state);
  const lt = clampInt(state.data.prix_lt, 0);
  const mt = c.prix_mt || 0;
  const inWindow = lt >= PRIX_MIN && lt <= PRIX_MAX;
  const ratio = mt > 0 && lt > 0 ? +(mt / lt).toFixed(1) : 0;
  const atWindowMax = lt >= PRIX_MAX;
  const ratioOk = mt > 0 ? (ratio >= RATIO_MIN && ratio <= RATIO_MAX) || (ratio > RATIO_MAX && atWindowMax) : true;
  const isPsycho = lt === 7 || lt === 17 || lt === 27 || lt === 37 || lt === 47;
  const isRound = lt % 10 === 0 && !isPsycho;
  const warnings: string[] = [];
  if (lt > 0 && lt < PRIX_MIN) warnings.push("Sous " + PRIX_MIN + "€ : la valeur perçue chute et les frais de paiement te font perdre de l'argent.");
  if (lt > PRIX_MAX) warnings.push("Au-dessus de " + PRIX_MAX + "€ : tu sors de l'achat impulsif, il te faudra une page de vente plus lourde.");
  if (mt > 0 && ratio > 0 && ratio < RATIO_MIN) warnings.push("Trop proche de ton offre principale (" + ratio + "×) : le produit risque de la cannibaliser. Baisse le prix, ou enrichis ton offre principale.");
  if (mt > 0 && ratio > RATIO_MAX && !atWindowMax) warnings.push("Bas relativement à ton offre principale (" + ratio + "×) : tu peux sans risque monter jusqu'à " + PRIX_MAX + "€ pour mieux filtrer les acheteurs sérieux.");
  if (lt > 0 && isRound) warnings.push("Prix rond : préfère un prix psychologique en 7 (7, 17, 27, 37, 47) qui convertit mieux.");
  const usable = inWindow && lt > 0;
  let lo = mt ? Math.ceil(mt / RATIO_MAX) : PRIX_MIN;
  let hi = mt ? Math.floor(mt / RATIO_MIN) : PRIX_MAX;
  lo = Math.min(PRIX_MAX, Math.max(PRIX_MIN, lo));
  hi = Math.min(PRIX_MAX, Math.max(lo, hi));
  return { lt, mt, inWindow, ratio, ratioOk, atWindowMax, isPsycho, usable, warnings, range_lo: lo, range_hi: hi };
}

// ─── Gating ──────────────────────────────────────────────────────────
export function canEnterRole(): boolean { return true; }
export function canEnterFormat(): boolean { return true; }
export function canEnterPromesse(state: M16State): boolean { return !!state.data.format_choisi; }
export function canEnterPricing(state: M16State): boolean {
  return !!state.data.format_choisi && state.data.titre.trim().length > 2 && state.data.promesse_lt.trim().length > 8;
}
export function canEnterGeneration(state: M16State): boolean { return canEnterPricing(state) && pricingEval(state).usable; }
export function canEnterLock(state: M16State): boolean {
  return canEnterGeneration(state) && Array.isArray(state.data.sections) && state.data.sections.length > 0;
}
export function stepUnlocked(key: M16Step, state: M16State): boolean {
  switch (key) {
    case "welcome": return true;
    case "role": return canEnterRole();
    case "format": return canEnterFormat();
    case "promesse": return canEnterPromesse(state);
    case "pricing": return canEnterPricing(state);
    case "generation": return canEnterGeneration(state);
    case "lock": return canEnterLock(state);
  }
  return false;
}

// ─── Suggestions ─────────────────────────────────────────────────────
export function recommanderFormat(state: M16State): string { return state.data.format_suggere || "mini_cours"; }
export function suggestTitre(state: M16State): string {
  const c = ctx(state);
  const f = FORMATS_LT[state.data.format_choisi as FormatKey];
  if (!f) return "";
  const sujet = c.point_b ? c.point_b : c.mecanisme || "ton premier résultat";
  if (f.key === "mini_cours") return "Mini-cours : " + sujet + " en 4 leçons";
  if (f.key === "ebook") return "Le guide : " + sujet;
  return "";
}
export { FORMAT_KEYS };
