/** M18 — accès prix de l'échelle, cohérence, LTV, gating, libellés manquants (helpers purs). */
import {
  type M18State, type M18Step, type Niveau,
  LT_MIN, LT_MAX, RATIO_LT_MT_MIN, RATIO_LT_MT_MAX, LTV_MULTIPLE_TARGET, TRACE_MIN_LENGTH,
  toIntPrice, fmtEur, hasMinTrace,
} from "./types";

export function getNiv(state: M18State, k: string): Niveau { return (state.data && state.data.niveaux && (state.data.niveaux as any)[k]) || {}; }
export function getPrixLT(state: M18State): number { return toIntPrice(getNiv(state, "lt").prix); }
export function getPrixMT(state: M18State): number { return toIntPrice(getNiv(state, "mt").prix); }
export function getPrixHT(state: M18State): number { return toIntPrice(getNiv(state, "ht").prix); }
export function hasLT(state: M18State): boolean { return getPrixLT(state) > 0 && !!(getNiv(state, "lt").nom || "").trim(); }
export function entryLevel(state: M18State): "lt" | "mt" | null { return hasLT(state) ? "lt" : getPrixMT(state) > 0 ? "mt" : null; }
export function entryPrice(state: M18State): number { const e = entryLevel(state); return e ? toIntPrice(getNiv(state, e).prix) : 0; }

// ─── Cohérence de l'échelle (étape 1) ────────────────────────────────
export interface CoherenceLine { st: "ok" | "warn" | "bad"; txt: string; }
export interface CoherenceResult { lines: CoherenceLine[]; asc_ok: boolean; lt_window_ok: boolean; ratio_lt_mt_ok: boolean; has_core: boolean; }
export function evaluateCoherence(state: M18State): CoherenceResult {
  const lt = getPrixLT(state), mt = getPrixMT(state), ht = getPrixHT(state);
  const out: CoherenceResult = { lines: [], asc_ok: true, lt_window_ok: true, ratio_lt_mt_ok: true, has_core: false };
  out.has_core = mt > 0 && ht > 0;
  if (ht > 0 && mt > 0) {
    if (ht > mt) out.lines.push({ st: "ok", txt: "Prix ascendants : ton High-Ticket (" + fmtEur(ht) + ") est au-dessus de ton Middle-Ticket (" + fmtEur(mt) + ")." });
    else { out.asc_ok = false; out.lines.push({ st: "bad", txt: "Ton High-Ticket (" + fmtEur(ht) + ") doit être strictement au-dessus de ton Middle-Ticket (" + fmtEur(mt) + "). Une échelle ne descend pas." }); }
  }
  if (mt > 0 && lt > 0) {
    if (mt > lt) out.lines.push({ st: "ok", txt: "Ton Low-Ticket (" + fmtEur(lt) + ") est bien sous ton Middle-Ticket (" + fmtEur(mt) + ")." });
    else { out.asc_ok = false; out.lines.push({ st: "bad", txt: "Ton Low-Ticket (" + fmtEur(lt) + ") doit rester sous ton Middle-Ticket (" + fmtEur(mt) + ")." }); }
  }
  if (lt > 0) {
    if (lt >= LT_MIN && lt <= LT_MAX) out.lines.push({ st: "ok", txt: "Ton Low-Ticket est dans la fenêtre d’achat impulsif (" + LT_MIN + "–" + LT_MAX + " €)." });
    else { out.lt_window_ok = false; out.lines.push({ st: "warn", txt: "Ton Low-Ticket (" + fmtEur(lt) + ") sort de la fenêtre " + LT_MIN + "–" + LT_MAX + " €. Sous " + LT_MIN + " € la valeur perçue chute ; au-dessus de " + LT_MAX + " € tu quittes l’achat impulsif." }); }
    if (mt > 0) {
      const r = mt / lt;
      if (r >= RATIO_LT_MT_MIN && r <= RATIO_LT_MT_MAX) out.lines.push({ st: "ok", txt: "Écart LT→MT sain : ton MT vaut " + r.toFixed(1) + "× ton LT (cible " + RATIO_LT_MT_MIN + "–" + RATIO_LT_MT_MAX + "×)." });
      else { out.ratio_lt_mt_ok = false; out.lines.push({ st: "warn", txt: "Écart LT→MT à surveiller : ton MT vaut " + r.toFixed(1) + "× ton LT (cible " + RATIO_LT_MT_MIN + "–" + RATIO_LT_MT_MAX + "×). Trop serré, le client ne voit pas le saut ; trop large, la marche est infranchissable." }); }
    }
  }
  if (!out.has_core) out.lines.unshift({ st: "bad", txt: "Il te manque le cœur payant : un Middle-Ticket et un High-Ticket avec un prix. Ce sont les deux marches qui financent ton écosystème." });
  return out;
}
export function coherenceBlocking(state: M18State): boolean {
  const c = evaluateCoherence(state);
  return c.has_core && c.asc_ok;
}

// ─── LTV (étape 3) ───────────────────────────────────────────────────
export interface LtvBreakdown { label: string; val: number; note: string; }
export interface LtvResult { ltv: number; entry: "lt" | "mt" | null; entryPrice: number; multiple: number; breakdown: LtvBreakdown[]; no_ascension: boolean; target_ok: boolean; has_entry: boolean; }
export function computeLTV(state: M18State): LtvResult {
  const lt = getPrixLT(state), mt = getPrixMT(state);
  const tLtMt = Math.max(0, Math.min(100, Number(state.data.ltv.taux_lt_mt) || 0)) / 100;
  const entry = entryLevel(state);
  let ltv = 0, breakdown: LtvBreakdown[] = [], noAscension = false;
  if (entry === "lt") {
    ltv = lt + tLtMt * mt;
    breakdown = [
      { label: "Achat Low-Ticket", val: lt, note: "100 % des entrants" },
      { label: "Montée vers Middle-Ticket", val: tLtMt * mt, note: Math.round(tLtMt * 100) + " % × " + fmtEur(mt) },
    ];
  } else if (entry === "mt") {
    ltv = mt;
    noAscension = true;
    breakdown = [{ label: "Achat Middle-Ticket", val: mt, note: "100 % des entrants — pas de marche d’entrée en amont" }];
  }
  const ep = entryPrice(state);
  const multiple = ep > 0 ? ltv / ep : 0;
  return { ltv: Math.round(ltv), entry, entryPrice: ep, multiple, breakdown, no_ascension: noAscension, target_ok: multiple >= LTV_MULTIPLE_TARGET, has_entry: !!entry };
}

// ─── Gating ──────────────────────────────────────────────────────────
export function canEnterAscension(state: M18State): boolean { return coherenceBlocking(state); }
export function canEnterLtv(state: M18State): boolean {
  if (!coherenceBlocking(state)) return false;
  const d = state.data;
  if (!hasMinTrace(d.transitions.mt_ht)) return false;
  if (hasLT(state) && (!hasMinTrace(d.transitions.lt_mt) || !hasMinTrace(d.connexion_lt_mt))) return false;
  return true;
}
export function canEnterLock(state: M18State): boolean {
  if (!canEnterLtv(state)) return false;
  const ltvR = computeLTV(state);
  if (!ltvR.has_entry) return false;
  if (entryLevel(state) === "lt" && (Number(state.data.ltv.taux_lt_mt) || 0) <= 0) return false;
  return true;
}
export function canEnterStep(state: M18State, key: M18Step): boolean {
  switch (key) {
    case "welcome": return true;
    case "echelle": return true;
    case "ascension": return canEnterAscension(state);
    case "ltv": return canEnterLtv(state);
    case "lock": return canEnterLock(state);
    default: return false;
  }
}

// ─── Champs manquants par étape ──────────────────────────────────────
export function missingFieldsLabel(state: M18State, forStep: M18Step): string {
  const missing: string[] = [];
  const d = state.data;
  if (forStep === "echelle") { /* welcome → echelle toujours ouvert */ }
  else if (forStep === "ascension") {
    const c = evaluateCoherence(state);
    if (!c.has_core) missing.push("poser un Middle-Ticket et un High-Ticket avec leur prix");
    if (c.has_core && !c.asc_ok) missing.push("corriger l’ordre des prix (l’échelle doit monter : LT < MT < HT)");
  } else if (forStep === "ltv") {
    if (!coherenceBlocking(state)) { const p = missingFieldsLabel(state, "ascension"); if (p) missing.push("avoir posé une échelle cohérente (" + p + ")"); }
    else {
      if (!hasMinTrace(d.transitions.mt_ht)) missing.push("décrire le passage Middle-Ticket → High-Ticket en au moins " + TRACE_MIN_LENGTH + " caractères");
      if (hasLT(state) && !hasMinTrace(d.transitions.lt_mt)) missing.push("décrire le passage Low-Ticket → Middle-Ticket");
      if (hasLT(state) && !hasMinTrace(d.connexion_lt_mt)) missing.push("expliquer le lien thématique entre ton Low-Ticket et ton Middle-Ticket");
    }
  } else if (forStep === "lock") {
    if (!canEnterLtv(state)) { const p = missingFieldsLabel(state, "ltv"); if (p) missing.push(p); }
    else {
      const ltvR = computeLTV(state);
      if (!ltvR.has_entry) missing.push("avoir au moins une offre payante d’entrée");
      if (entryLevel(state) === "lt" && (Number(d.ltv.taux_lt_mt) || 0) <= 0) missing.push("estimer ton taux de montée Low-Ticket → Middle-Ticket");
    }
  }
  if (missing.length === 0) return "";
  if (missing.length === 1) return missing[0];
  if (missing.length === 2) return missing[0] + " et " + missing[1];
  return missing.slice(0, -1).join(", ") + " et " + missing[missing.length - 1];
}

export function getProgrammeNom(state: M18State): string {
  const m12 = state.m12_data, m6 = state.m6_data;
  return getNiv(state, "ht").nom || (m12 && m12.programme_nom) || (m6 && m6.or && m6.or.nom) || "";
}
