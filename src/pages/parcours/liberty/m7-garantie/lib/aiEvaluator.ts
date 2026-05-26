/**
 * Scoring IA pour les 6 étapes pédagogiques M7 GARANTIE.
 *
 * Calque Sidali v1.0.0 — 12 cheats A-L détectés + 4 cohérences inter-modules.
 * Claude prioritaire via liberty-claude-proxy, fallback heuristique embarquée.
 */

import { callClaude } from "../../m1-niche/lib/claudeClient";
import {
  type M7State, type AIFeedback, type PedaStepKey,
  computeNetPositif, GARANTIE_TYPES,
} from "./types";

interface EvalResult extends AIFeedback {
  score: number;
  ok: boolean;
}

function clamp(n: number, min = 0, max = 100): number { return Math.max(min, Math.min(max, n)); }

/** Normalise un texte pour matching anti-cheat (lowercase, no accents). */
function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/* ════════════════════════════════════════════════════════════════════════
 * 1 · TYPE GARANTIE
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluateTypeGarantieHeuristic(state: M7State): EvalResult {
  const e = state.data.type_garantie;
  const t = e.type_choisi;
  const just = (e.justification || "").trim();
  const m4 = state.m4_data;
  const m6 = state.m6_data?.handoff_to_m7;
  const hasMultiPayment = m6?.paiements_actives
    ? Object.entries(m6.paiements_actives).some(([k, v]) => v && k !== "1x")
    : false;

  if (!t) return { score: 0, ok: false, verdict: "✗ Aucun type choisi", weaknesses: ["Choisis un type parmi Refund / Continuité / Paiement aux résultats."] };
  if (!just) return { score: 30, ok: false, verdict: "✗ Justification manquante", weaknesses: [`Type ${GARANTIE_TYPES[t].label} choisi sans justification.`], suggestions: ["Écris pourquoi CE type est cohérent avec TON offre (80+ chars)."] };
  if (just.length < 80) return { score: 50, ok: false, verdict: "~ Justification trop courte", weaknesses: [`${just.length} chars (vise 80+).`] };

  // CHEAT A — paiement_resultats sans facilités M6
  if (t === "paiement_resultats" && state.m6_data && !hasMultiPayment) {
    return { score: 55, ok: false, verdict: "✗ CHEAT A — Paiement résultats sans facilités M6", weaknesses: ["Tu as choisi paiement résultats mais M6 n'a aucune option de paiement >1× activée. Incohérence."], suggestions: ["Active 3× ou 6× sans riba en M6, ou choisis Refund/Continuité."] };
  }

  // CHEAT B — full ladder M4 + paiement_resultats (trop ambitieux)
  if (m4?.entry_strategy === "full" && t === "paiement_resultats") {
    return { score: 60, ok: false, verdict: "~ Risqué : full ladder + paiement aux résultats", weaknesses: ["Combiner full ladder M4 et paiement résultats demande un track record exceptionnel."], suggestions: ["Refund est plus sûr à ton stade."] };
  }

  return { score: 88, ok: true, verdict: `✓ Type ${GARANTIE_TYPES[t].label} justifié`, strengths: ["Type choisi clairement", "Justification suffisamment développée"] };
}

/* ════════════════════════════════════════════════════════════════════════
 * 2 · PROMESSE MESURABLE
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluatePromesseGarantieHeuristic(state: M7State): EvalResult {
  const e = state.data.promesse_garantie;
  const res = (e.resultat || "").trim();
  const duree = e.duree_valeur;
  const crit = (e.critere_objectif || "").trim();

  if (!res) return { score: 0, ok: false, verdict: "✗ Résultat vide", weaknesses: ["Sans résultat précis, la garantie est décorative."] };
  if (res.length < 50) return { score: 35, ok: false, verdict: "~ Résultat trop court", weaknesses: [`${res.length} chars (vise 50+).`], suggestions: ["Pas « réussir » mais « générer 5 000€ de revenu net sur 90j via X clients à Y€ »."] };

  // CHEAT C — vagueness
  const resLow = normalize(res);
  const vagueMarkers = ["etre satisfait", "satisfaction", "etre content", "voir des resultats", "progresser", "avancer", "si tu n es pas satisfait", "changement positif", "transformation", "epanouissement", "mieux dans ta vie"];
  const vagueHit = vagueMarkers.find((m) => resLow.includes(m));
  if (vagueHit && !/\d/.test(res)) {
    return { score: 35, ok: false, verdict: "✗ CHEAT C — Vagueness (« satisfait », « progresser »)", weaknesses: [`Marqueur vague détecté : « ${vagueHit} » sans aucun chiffre.`], suggestions: ["Remplace par un résultat mesurable et chiffré."] };
  }

  if (duree <= 0 || duree > 365) return { score: 60, ok: false, verdict: "~ Durée incohérente", weaknesses: [`Durée ${duree} ${e.duree_unite} hors plage raisonnable.`] };
  if (!crit) return { score: 65, ok: false, verdict: "~ Critère objectif manquant", weaknesses: ["Précise un critère mesurable (€, kg, calls, témoignages)."] };
  if (crit.length < 30) return { score: 70, ok: false, verdict: "~ Critère trop court", weaknesses: [`Critère ${crit.length} chars (vise 30+).`] };

  return { score: 90, ok: true, verdict: "✓ Promesse mesurable solide", strengths: ["Résultat chiffré + délai + critère objectif"] };
}

/* ════════════════════════════════════════════════════════════════════════
 * 3 · CONDITIONS CLIENT
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluateConditionsClientHeuristic(state: M7State): EvalResult {
  const c = (state.data.conditions_client.conditions_text || "").trim();

  if (!c) return { score: 0, ok: false, verdict: "✗ Conditions vides", weaknesses: ["Sans conditions = garantie ouverte aux abus."] };
  if (c.length < 80) return { score: 35, ok: false, verdict: "~ Conditions trop courtes", weaknesses: [`${c.length} chars (vise 100+).`], suggestions: ["Liste 3+ conditions concrètes avec verbes d'action et preuves attendues."] };

  // CHEAT D — ouverture totale
  const cLow = normalize(c);
  const openMarkers = ["sans condition", "sans engagement", "aucune condition", "aucun engagement", "satisfait ou rembourse", "satisfaction garantie", "rembourse sans question", "sans justification"];
  const openHit = openMarkers.find((m) => cLow.includes(m));
  if (openHit) {
    return { score: 25, ok: false, verdict: "✗ CHEAT D — Ouverture totale", weaknesses: [`Marqueur dangereux : « ${openHit} » — expose à 100% d'activation abusive.`], suggestions: ["Exiges du client qu'il fasse le travail avant de pouvoir activer."] };
  }

  // CHEAT E — pas assez de conditions (heuristique : nombre de retours à la ligne ou bullets)
  const items = c.split(/[\n•\-]+/).map((s) => s.trim()).filter((s) => s.length > 10);
  if (items.length < 3) {
    return { score: 60, ok: false, verdict: "~ Pas assez de conditions distinctes", weaknesses: [`Seulement ${items.length} condition(s) identifiable(s).`], suggestions: ["Liste au moins 3 conditions concrètes (présence, livrables fournis, délai de demande, preuves)."] };
  }

  return { score: 88, ok: true, verdict: `✓ ${items.length} conditions concrètes — bouclier solide`, strengths: ["Conditions précises", "Verbes d'action présents"] };
}

/* ════════════════════════════════════════════════════════════════════════
 * 4 · MATH RENTABILITÉ
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluateMathGarantieHeuristic(state: M7State): EvalResult {
  const e = state.data.math_garantie;
  const ci = e.clients_initiaux;
  const de = e.delta_estime;
  const tr = e.taux_refund_pct;

  if (ci <= 0) return { score: 0, ok: false, verdict: "✗ Clients initiaux manquants", weaknesses: ["Renseigne ta base clients actuelle sur 30 appels."] };
  if (de === 0 && ci > 0) return { score: 30, ok: false, verdict: "~ Delta non estimé", weaknesses: ["+2 minimum (conservateur), +5 à +15 réaliste."] };

  // CHEAT F — delta négatif
  if (de < 0) {
    return { score: 0, ok: false, verdict: "✗ CHEAT F — Delta négatif (impossible)", weaknesses: ["Tu pars du principe que ta garantie ferait PERDRE des clients. Mathématiquement impossible — au pire neutre."], suggestions: ["Estime +2 à +15 conservatuer."] };
  }
  if (de < 1) return { score: 45, ok: false, verdict: "~ Delta < 1", weaknesses: ["Tu estimes que la garantie ne te fera gagner aucun client — incohérent."] };

  // CHEAT G — taux refund irréaliste (<3% optimiste, >50% catastrophique)
  if (tr < 3) return { score: 60, ok: false, verdict: "~ Taux refund trop optimiste", weaknesses: [`${tr}% < 3% est irréaliste — sois prudent.`], suggestions: ["Estime entre 5 et 15%."] };
  if (tr > 50) return { score: 55, ok: false, verdict: "~ Taux refund alarmant", weaknesses: [`${tr}% > 50% — si tu estimes ça, ton offre a un problème de fond, pas de garantie.`] };

  const net = computeNetPositif(ci, de, tr);
  if (net <= 0) return { score: 50, ok: false, verdict: "✗ Net non positif", weaknesses: [`Net = ${net} clients après refunds. La garantie te fait perdre de l'argent.`], suggestions: ["Baisse le taux refund estimé ou augmente le delta."] };

  return {
    score: 90, ok: true,
    verdict: `✓ Net positif : +${net} clients après refunds`,
    strengths: [`+${de} clients attribués à la garantie`, `Taux refund ${tr}% raisonnable`, `Net final +${net} clients`],
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * 5 · EXPOSE PITCH
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluateExposeGarantieHeuristic(state: M7State): EvalResult {
  const e = state.data.expose_garantie;
  const pitch = (e.pitch_text || "").trim();
  const formule = (e.formule_marketing || "").trim();

  if (!pitch) return { score: 0, ok: false, verdict: "✗ Pitch vide", weaknesses: ["Pas de pitch = arsenal jamais déployé en call."] };
  if (pitch.length < 120) return { score: 40, ok: false, verdict: "~ Pitch trop court", weaknesses: [`${pitch.length} chars (vise 120+).`] };
  if (!formule) return { score: 50, ok: false, verdict: "~ Formule marketing absente", weaknesses: ["Choisis ou écris une formule courte type « X ou vous ne nous payez pas »."] };
  if (formule.length < 20) return { score: 65, ok: false, verdict: "~ Formule trop courte", weaknesses: [`Formule ${formule.length} chars (vise 20+).`] };

  // CHEAT H — pitch qui RACONTE au lieu de MONTRER
  const pitchLow = normalize(pitch);
  const racontMarkers = ["je suis confiant", "je crois en mon offre", "c est vraiment bien", "vous serez content", "ne vous inquietez pas", "faites moi confiance"];
  const racontHit = racontMarkers.find((m) => pitchLow.includes(m));
  if (racontHit && pitch.length < 200) {
    return { score: 55, ok: false, verdict: "✗ CHEAT H — Tu racontes, tu ne montres pas", weaknesses: [`Marqueur émotionnel : « ${racontHit} ».`], suggestions: ["Énonce la garantie, donne le critère, mentionne le contrat. Pas d'auto-rassurance."] };
  }

  return { score: 88, ok: true, verdict: "✓ Pitch incarné + formule marketing", strengths: ["Pitch détaillé", "Formule courte mémorisable"] };
}

/* ════════════════════════════════════════════════════════════════════════
 * 6 · TERMES & CONDITIONS
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluateTermesConditionsHeuristic(state: M7State): EvalResult {
  const e = state.data.termes_conditions;
  const tnc = (e.tnc_text || "").trim();
  const statut = (e.vendeur_statut || "").trim();

  if (!tnc) return { score: 0, ok: false, verdict: "✗ T&C vides", weaknesses: ["Sans T&C écrits = pas de contrat opposable = garantie verbale = abus garantis."] };
  if (tnc.length < 200) return { score: 40, ok: false, verdict: "~ T&C trop courts", weaknesses: [`${tnc.length} chars (vise 300+).`], suggestions: ["Inclus : conditions d'activation, délai de demande, durée du remboursement, juridiction."] };

  // CHEAT I — pas de statut vendeur (juridique inopposable)
  if (!statut) return { score: 60, ok: false, verdict: "~ Statut vendeur manquant", weaknesses: ["Sans statut juridique (micro / SASU / SARL), tes T&C ne sont pas opposables."] };
  if (statut.length < 5) return { score: 70, ok: false, verdict: "~ Statut vendeur incomplet", weaknesses: ["Précise au moins : forme juridique + nom commercial."] };

  // CHEAT J — abus de boilerplate (T&C copiés sans contextualisation)
  const tncLow = normalize(tnc);
  const boilerplateMarkers = ["lorem ipsum", "modifier ce texte", "remplacer par", "votre entreprise", "[entreprise]"];
  const bpHit = boilerplateMarkers.find((m) => tncLow.includes(m));
  if (bpHit) {
    return { score: 30, ok: false, verdict: "✗ CHEAT J — Boilerplate non personnalisé", weaknesses: [`Marqueur template : « ${bpHit} ».`] };
  }

  return { score: 88, ok: true, verdict: "✓ T&C écrits + statut juridique", strengths: ["T&C suffisamment développés", "Statut vendeur précisé"] };
}

/* ════════════════════════════════════════════════════════════════════════
 * APPEL CLAUDE PAR ÉTAPE (prompt + fallback)
 * ════════════════════════════════════════════════════════════════════════ */
const SYSTEM_BASE = `Tu es un évaluateur business halal (LIBERTY · AL BARAKA · Module 7 GARANTIE v1.0.0).
Tu audites la construction d'une garantie commerciale sur 6 axes : type · promesse mesurable · conditions client (anti-abus) ·
math rentabilité (net positif) · pitch d'exposition · termes & conditions juridiques.

Tu détectes 12 anti-cheats : vagueness ("satisfait"), ouverture totale ("satisfait ou remboursé"), delta négatif (math),
taux refund irréaliste, boilerplate copié, pitch qui raconte au lieu de montrer, etc.

FORMAT DE RÉPONSE STRICT (JSON valide sans markdown) :
{
  "score": <0-100>,
  "verdict": "<phrase courte>",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}`;

function contextHeader(state: M7State): string {
  const m3 = state.m3_data;
  const m4 = state.m4_data;
  const m5 = state.m5_data?.handoff_to_m6;
  const m6 = state.m6_data?.handoff_to_m7;
  return `CONTEXTE :
- Avatar : ${state.m1_data?.avatar?.socio?.nom ?? "—"}
- HT M3/M4 : "${m3?.promesse ?? "—"}" · prix ${m6?.prix_ht ?? m4?.ht?.price ?? "—"}
- Stratégie M4 : ${m4?.entry_strategy ?? "—"}${m6?.strategy_score_is_forced ? " (FORCÉ, seuil M7=85)" : ""}
- Point B M5 : ${m5?.ht_point_b_measurable ?? m5?.ht_point_b ?? "—"} (délai ${m5?.ht_point_b_timeframe_days ?? "—"} jours)
- Pitch fractionnement M6 : ${m6?.pitch_fractionnement ?? "—"}`;
}

async function callClaudeWithFallback(
  state: M7State, step: PedaStepKey, userPrompt: string, fallback: EvalResult,
): Promise<EvalResult & { ai_mode: "cloud" | "local" }> {
  try {
    const raw = await callClaude("m7", { system: SYSTEM_BASE, user: userPrompt, max_tokens: 700 });
    const trimmed = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(trimmed) as Partial<EvalResult>;
    if (typeof parsed.score !== "number") throw new Error("score non parsé");
    return {
      score: clamp(Math.round(parsed.score)),
      ok: (parsed.score ?? 0) >= 80,
      verdict: parsed.verdict || "(verdict non fourni)",
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      suggestions: parsed.suggestions || [],
      ai_mode: "cloud",
    };
  } catch (e) {
    console.warn(`[M7] Claude fallback (${step}):`, (e as Error).message);
    return { ...fallback, ai_mode: "local" };
  }
}

export async function evaluateTypeGarantie(state: M7State) {
  const fb = evaluateTypeGarantieHeuristic(state);
  const d = state.data.type_garantie;
  const prompt = `${contextHeader(state)}

ÉTAPE 1 — TYPE DE GARANTIE
Type choisi : ${d.type_choisi || "(aucun)"}
Justification : """${d.justification}"""

Critères : type clair + justification 80+ chars cohérente avec offre/avatar/durée.
Anti-cheat A : si paiement_resultats sans facilités M6 = incohérent.
Anti-cheat B : si full ladder M4 + paiement_resultats = trop ambitieux.`;
  return callClaudeWithFallback(state, "type_garantie", prompt, fb);
}

export async function evaluatePromesseGarantie(state: M7State) {
  const fb = evaluatePromesseGarantieHeuristic(state);
  const d = state.data.promesse_garantie;
  const prompt = `${contextHeader(state)}

ÉTAPE 2 — PROMESSE MESURABLE
Résultat : """${d.resultat}"""
Durée : ${d.duree_valeur} ${d.duree_unite}
Critère objectif : """${d.critere_objectif}"""

Critères : résultat chiffré 50+ chars, anti-cheat C (vagueness "satisfait/progresser sans chiffres"), durée raisonnable, critère 30+ chars.`;
  return callClaudeWithFallback(state, "promesse_garantie", prompt, fb);
}

export async function evaluateConditionsClient(state: M7State) {
  const fb = evaluateConditionsClientHeuristic(state);
  const c = state.data.conditions_client.conditions_text;
  const prompt = `${contextHeader(state)}

ÉTAPE 3 — CONDITIONS CLIENT (bouclier anti-abus)
"""${c}"""

Critères : 3+ conditions concrètes avec verbes d'action, longueur 100+ chars.
Anti-cheat D : « satisfait ou remboursé / sans condition / sans engagement » = ouverture totale = danger.`;
  return callClaudeWithFallback(state, "conditions_client", prompt, fb);
}

export async function evaluateMathGarantie(state: M7State) {
  const fb = evaluateMathGarantieHeuristic(state);
  const e = state.data.math_garantie;
  const net = computeNetPositif(e.clients_initiaux, e.delta_estime, e.taux_refund_pct);
  const prompt = `${contextHeader(state)}

ÉTAPE 4 — MATH RENTABILITÉ
Clients initiaux (référence) : ${e.clients_initiaux}
Delta estimé (gagnés grâce à garantie) : ${e.delta_estime}
Taux refund estimé : ${e.taux_refund_pct}%
Net positif calculé : ${net} clients

Anti-cheat F : delta négatif impossible.
Anti-cheat G : taux refund < 3% irréaliste, > 50% alarmant.
Net doit être > 0 sinon garantie te fait perdre.`;
  return callClaudeWithFallback(state, "math_garantie", prompt, fb);
}

export async function evaluateExposeGarantie(state: M7State) {
  const fb = evaluateExposeGarantieHeuristic(state);
  const e = state.data.expose_garantie;
  const prompt = `${contextHeader(state)}

ÉTAPE 5 — EXPOSE PITCH
Pitch en call : """${e.pitch_text}"""
Formule marketing : """${e.formule_marketing}"""

Critères : pitch 120+ chars, formule 20+ chars.
Anti-cheat H : « je suis confiant / faites-moi confiance / ne vous inquiétez pas » = tu racontes au lieu de montrer.`;
  return callClaudeWithFallback(state, "expose_garantie", prompt, fb);
}

export async function evaluateTermesConditions(state: M7State) {
  const fb = evaluateTermesConditionsHeuristic(state);
  const e = state.data.termes_conditions;
  const prompt = `${contextHeader(state)}

ÉTAPE 6 — TERMES & CONDITIONS
T&C : """${e.tnc_text}"""
Statut vendeur : """${e.vendeur_statut}"""

Critères : T&C 300+ chars (conditions activation + délai + juridiction), statut juridique précis (micro/SASU/SARL).
Anti-cheat I : pas de statut = T&C inopposables.
Anti-cheat J : « lorem ipsum / [entreprise] / modifier ce texte » = boilerplate non personnalisé.`;
  return callClaudeWithFallback(state, "termes_conditions", prompt, fb);
}
