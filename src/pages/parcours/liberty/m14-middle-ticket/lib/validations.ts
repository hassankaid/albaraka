/** M14 — helpers métier purs : pricing, frictions, suggestions, recommandation, gating. */
import {
  type M14State, type M14Data, type ModuleDecision, type FormatKey, type MatriceReponses,
  GENERIC_TRAPS, TRACE_MIN_LENGTH, FORMATS, FORMAT_KEYS, MATRICE_CRITERES,
  FRICTION_PATTERNS, ADAPTATIONS_PAR_FORMAT,
  PRIX_PLANCHER_MT, RATIO_MAX, RATIO_MIN, ECART_MIN_FACTOR, VALEUR_MULTIPLE_MIN,
} from "./types";

// ─── Mots-pièges ─────────────────────────────────────────────────────
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

// ─── Comptage décisions ──────────────────────────────────────────────
export interface DecisionCounts { garder: number; adapter: number; retirer: number; vide: number; }
export function countDecisions(arr: ModuleDecision[] | undefined): DecisionCounts {
  const out: DecisionCounts = { garder: 0, adapter: 0, retirer: 0, vide: 0 };
  (arr || []).forEach((m) => {
    const d = (m && m.decision) || "";
    if (d === "garder") out.garder++;
    else if (d === "adapter") out.adapter++;
    else if (d === "retirer") out.retirer++;
    else out.vide++;
  });
  return out;
}
export function countModulesActifs(arr: ModuleDecision[] | undefined): number {
  const c = countDecisions(arr);
  return c.garder + c.adapter;
}

// ─── Recommandation de format ────────────────────────────────────────
export interface RecoResult { format: string; score: number; total_answered: number; breakdown: Record<string, number>; ambiguous: boolean; }
export function recommanderFormat(reponses: Partial<MatriceReponses> | undefined): RecoResult {
  const r = reponses || {};
  const counts: Record<string, number> = {};
  FORMAT_KEYS.forEach((k) => { counts[k] = 0; });
  MATRICE_CRITERES.forEach((crit) => {
    const choix = (r as any)[crit.id];
    if (!choix) return;
    const opt = crit.options.find((o) => o.value === choix);
    if (opt) counts[opt.orient] = (counts[opt.orient] || 0) + 1;
  });
  let best = "", bestScore = 0, exAequo = 0;
  FORMAT_KEYS.forEach((k) => {
    if (counts[k] > bestScore) { bestScore = counts[k]; best = k; exAequo = 1; }
    else if (counts[k] === bestScore && bestScore > 0) { exAequo++; }
  });
  const nbAnswered = MATRICE_CRITERES.filter((c) => !!(r as any)[c.id]).length;
  const ambiguous = exAequo > 1;
  return { format: ambiguous ? "" : best, score: bestScore, total_answered: nbAnswered, breakdown: counts, ambiguous };
}

// ─── Évaluation pricing (moteur de garde-fous) ───────────────────────
export interface PricingAlert { kind: "red" | "orange"; msg: string; }
export interface PricingResult {
  prix_mt: number; prix_ht: number; unite: string; prix_mt_effectif: number;
  ratio: number; ratio_pct: number; in_range: boolean; plancher_ok: boolean;
  ecart_ok: boolean; valeur_ok: boolean; alerts: PricingAlert[]; notes: string[]; ok: boolean;
}
export function evaluatePricing(prix_mt: any, prix_ht: any, prix_unite: any, valeur_percue: any): PricingResult {
  const mt = parseInt(prix_mt, 10) || 0;
  const ht = parseInt(prix_ht, 10) || 0;
  const unite = prix_unite || "one_shot";
  const vp = parseInt(valeur_percue, 10) || 0;
  const out: PricingResult = {
    prix_mt: mt, prix_ht: ht, unite,
    prix_mt_effectif: unite === "mensuel" ? mt * 12 : mt,
    ratio: 0, ratio_pct: 0, in_range: false, plancher_ok: false, ecart_ok: false, valeur_ok: false,
    alerts: [], notes: [], ok: false,
  };
  if (mt <= 0) {
    out.alerts.push({ kind: "red", msg: "Tu n'as pas encore fixé de prix MT." });
    return out;
  }
  const valeurContractuelleAnnuelle = out.prix_mt_effectif;
  out.plancher_ok = valeurContractuelleAnnuelle >= PRIX_PLANCHER_MT;
  if (!out.plancher_ok) {
    if (unite === "mensuel") out.alerts.push({ kind: "red", msg: "Ton prix annualisé (" + valeurContractuelleAnnuelle + " €/an) est sous le plancher de " + PRIX_PLANCHER_MT + " €. À ce niveau-là, la valeur perçue chute violemment et tu attires des clients qui ne s'investissent pas." });
    else out.alerts.push({ kind: "red", msg: "Tu es sous le plancher de " + PRIX_PLANCHER_MT + " €. La valeur perçue chute violemment sous ce seuil, et tu attires des clients qui ne s'investissent pas." });
  }
  if (ht > 0) {
    const prixComp = out.prix_mt_effectif;
    out.ratio = prixComp / ht;
    out.ratio_pct = Math.round(out.ratio * 1000) / 10;
    out.in_range = out.ratio >= RATIO_MIN && out.ratio <= RATIO_MAX;
    out.ecart_ok = ht >= ECART_MIN_FACTOR * prixComp;
    if (out.ratio > RATIO_MAX) out.alerts.push({ kind: "red", msg: "Ton MT est à plus d'1/3 du prix HT. Le prospect ne verra plus de différence et choisira le moins cher. Garde un facteur 3× minimum." });
    if (out.ratio < RATIO_MIN) out.alerts.push({ kind: "orange", msg: "Ton MT est à moins d'1/10 du prix HT. C'est dans la zone low-ticket — vérifie que c'est volontaire et que la valeur livrée le justifie." });
  } else {
    out.alerts.push({ kind: "orange", msg: "Aucun prix HT trouvé dans ton snapshot M6. Le ratio HT/MT ne peut pas être vérifié — termine M6 si tu ne l'as pas fait." });
  }
  if (vp > 0 && mt > 0) {
    out.valeur_ok = vp >= VALEUR_MULTIPLE_MIN * out.prix_mt_effectif;
    if (!out.valeur_ok) out.alerts.push({ kind: "orange", msg: "Ta valeur perçue est inférieure à 5× le prix. Soit tu sur-prices, soit tu sous-évalues la transformation que tu apportes — vérifie." });
  } else if (vp <= 0) {
    out.notes.push("Renseigne la valeur perçue annuelle (en €) que ton MT apporte au client pour vérifier la cohérence du prix.");
  }
  out.ok = out.plancher_ok && (ht <= 0 || (out.in_range && out.ecart_ok));
  return out;
}

// ─── Frictions & suggestions ─────────────────────────────────────────
export function getFrictionsForModule(mod: ModuleDecision | any): string[] {
  if (!mod) return [];
  const txt = [
    mod.nom_origine || mod.nom || "",
    mod.objectif_origine || mod.objectif_mesurable || "",
    mod.livrable_origine || mod.livrable_attendu || "",
  ].join(" ");
  const found: string[] = [];
  FRICTION_PATTERNS.forEach((f) => { if (f.patterns.some((re) => re.test(txt))) found.push(f.key); });
  return found;
}
export interface ModuleSuggestion { decision_suggeree: "garder" | "adapter" | "retirer"; adaptation_suggeree: string; }
export function getSuggestionForModule(mod: any, format: string): ModuleSuggestion {
  const frictions = getFrictionsForModule(mod);
  if (frictions.length === 0) return { decision_suggeree: "garder", adaptation_suggeree: "" };
  if (!format || !(ADAPTATIONS_PAR_FORMAT as any)[format]) return { decision_suggeree: "adapter", adaptation_suggeree: "" };
  if (format === "masterclass" && frictions.includes("suivi_long_personnel")) return { decision_suggeree: "retirer", adaptation_suggeree: "" };
  const firstFriction = frictions[0];
  const adaptation = ((ADAPTATIONS_PAR_FORMAT as any)[format] || {})[firstFriction] || "";
  return { decision_suggeree: "adapter", adaptation_suggeree: adaptation };
}
export function applyAutoSuggestions(modulesDecision: ModuleDecision[] | any, format: string): ModuleDecision[] {
  if (!Array.isArray(modulesDecision)) return [];
  return modulesDecision.map((m) => {
    const sugg = getSuggestionForModule(m, format);
    const out: ModuleDecision = Object.assign({}, m);
    if (!out.decision || out.decision.trim() === "") out.decision = sugg.decision_suggeree;
    if (out.decision === "adapter" && (!out.adaptation || out.adaptation.trim() === "")) out.adaptation = sugg.adaptation_suggeree;
    if (out.decision !== "adapter") out.adaptation = "";
    return out;
  });
}

// ─── Formatage & accesseurs ──────────────────────────────────────────
export function formatPrix(p: any, unite?: string): string {
  const v = parseInt(p, 10) || 0;
  if (v <= 0) return "—";
  const fmt = v.toLocaleString("fr-FR") + " €";
  return unite === "mensuel" ? fmt + " / mois" : fmt;
}
export function getPrixHT(state: M14State): number {
  const m6 = state.m6_data || {};
  return parseInt(m6.prix_ht, 10) || 0;
}
export function getProgrammeHTNom(state: M14State): string {
  const m12 = state.m12_data || {};
  if (m12.programme_nom) return m12.programme_nom;
  const m6 = state.m6_data || {};
  return (m6.or && m6.or.nom) || "ton programme HT";
}
export function getFormatChoisiLabel(data: M14Data): string {
  const f = data.format_choisi as FormatKey;
  return f && FORMATS[f] ? FORMATS[f].label : "";
}
export function countFormatsExplores(data: M14Data): number {
  return (data.formats_explores || []).filter((f) => (FORMAT_KEYS as string[]).includes(f)).length;
}

// ─── Gating d'entrée des étapes ──────────────────────────────────────
export function canEnterFormat(): boolean { return true; }
export function canEnterArchitecture(state: M14State): boolean {
  const d = state.data || ({} as M14Data);
  const fmt = d.format_choisi || "";
  const nb = countFormatsExplores(d);
  const just = String(d.format_justification || "").trim();
  return !!fmt && (FORMAT_KEYS as string[]).includes(fmt) && nb >= 3 && just.length >= TRACE_MIN_LENGTH;
}
export function canEnterPricing(state: M14State): boolean {
  return canEnterArchitecture(state) && countModulesActifs(state.data.modules_decision) >= 1;
}
export function canEnterLock(state: M14State): boolean {
  if (!canEnterPricing(state)) return false;
  const d = state.data || ({} as M14Data);
  const just = String(d.justification_prix || "").trim();
  if (just.length < TRACE_MIN_LENGTH) return false;
  const evp = evaluatePricing(d.prix_mt, getPrixHT(state), d.prix_mt_unite, d.valeur_percue_eur);
  return evp.plancher_ok && (getPrixHT(state) <= 0 || (evp.in_range && evp.ecart_ok));
}

// ─── Libellé des champs manquants ────────────────────────────────────
function joinMissing(missing: string[]): string {
  if (missing.length === 0) return "";
  if (missing.length === 1) return missing[0];
  if (missing.length === 2) return missing[0] + " et " + missing[1];
  return missing.slice(0, -1).join(", ") + " et " + missing[missing.length - 1];
}
export function missingFieldsLabel(forStep: M14State["current"] | "architecture" | "pricing" | "lock", state: M14State): string {
  const d = state.data || ({} as M14Data);
  const missing: string[] = [];
  if (forStep === "architecture") {
    const fmt = d.format_choisi || "";
    const nb = countFormatsExplores(d);
    const just = String(d.format_justification || "").trim();
    if (nb < 3) missing.push("explorer au moins 3 formats sur les 4 (tu en as exploré " + nb + ")");
    if (!fmt) missing.push("choisir ton format MT parmi les 4");
    if (fmt && just.length < TRACE_MIN_LENGTH) missing.push("justifier ton choix de format en au moins " + TRACE_MIN_LENGTH + " caractères concrets");
  } else if (forStep === "pricing") {
    if (!canEnterArchitecture(state)) {
      const labelPrec = missingFieldsLabel("architecture", state);
      if (labelPrec) missing.push("avoir terminé l'étape format (" + labelPrec + ")");
    } else {
      const c = countModulesActifs(d.modules_decision);
      if (c < 1) missing.push("garder ou adapter au moins 1 module de ton HT pour construire ton MT");
    }
  } else if (forStep === "lock") {
    if (!canEnterPricing(state)) {
      const labelPrec = missingFieldsLabel("pricing", state);
      if (labelPrec) missing.push(labelPrec);
    } else {
      const just = String(d.justification_prix || "").trim();
      const evp = evaluatePricing(d.prix_mt, getPrixHT(state), d.prix_mt_unite, d.valeur_percue_eur);
      if (!evp.plancher_ok) missing.push("fixer un prix MT (ou prix annualisé pour membership) supérieur au plancher de " + PRIX_PLANCHER_MT + " €");
      if (getPrixHT(state) > 0 && !evp.in_range) missing.push("ajuster ton prix MT dans la fourchette 1/10 à 1/3 du prix HT");
      if (getPrixHT(state) > 0 && !evp.ecart_ok) missing.push("conserver au moins un facteur 3× d'écart avec ton prix HT");
      if (just.length < TRACE_MIN_LENGTH) missing.push("justifier ton prix MT en au moins " + TRACE_MIN_LENGTH + " caractères concrets");
    }
  }
  return joinMissing(missing);
}
