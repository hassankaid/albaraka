/**
 * Scoring IA pour le Niveau d'entrée M4.
 *
 * Calque Sidali v1.2.3 : appel Claude prioritaire (via liberty-claude-proxy edge function)
 * + fallback heuristique embarquée. Détection anti-patterns (full trop tôt, name-drop
 * sans données, etc).
 *
 * Threshold 80/100 (cf. VALIDATION_THRESHOLD). Force après 3 tentatives.
 */

import { callClaude } from "../../m1-niche/lib/claudeClient";
import type { EntryStrategy, M4State } from "./types";

export interface EntryScoreResult {
  score: number;            // 0-100
  feedback: string;          // verdict riche en HTML simple (caractères safe)
  mode: "cloud" | "local";  // qui a évalué
}

/* ════════════════════════════════════════════════════════════════════════
 * Heuristique embarquée — fallback si Claude n'a pas répondu.
 * Calque exact du heuristicEntryScore Sidali v1.2.3.
 * ════════════════════════════════════════════════════════════════════════ */
export function heuristicEntryScore(state: M4State): EntryScoreResult {
  const strategy = state.entry.strategy;
  const rationale = (state.entry.rationale || "").toLowerCase();
  const len = (state.entry.rationale || "").trim().length;
  const m3 = state.m3_data;

  if (!strategy) {
    return { score: 0, feedback: "Sélectionne d'abord une stratégie.", mode: "local" };
  }

  let score = 30; // démarre bas, doit être mérité

  // 1. Détection de chiffres concrets (signal le plus fort)
  const numberRegex = /\b\d+([\s.,]?\d+)*\s*(k\b|€|euros?|k€|client|lead|mois|semaine|sem\b|an\b|année|%|jour|j\b|heure|h\b|abonné|follower|place|vente|personne|témoignage|trimestre)/g;
  const numberMatches = rationale.match(numberRegex) || [];
  const uniqueNumbers = new Set(numberMatches.map((x) => x.trim()));
  score += Math.min(28, uniqueNumbers.size * 7);

  // 2. Longueur du rationale (faible inflation)
  if (len > 120) score += 3;

  // 3. Cohérence avec score M3 (règle d'or HT-first)
  const m3score = m3?.prix_score_global ?? 0;
  if (m3score > 0) {
    if (strategy === "ht_only") {
      score += 8;
      if (m3score < 65) score += 5;
    }
    if (strategy === "ht_mt") {
      if (m3score >= 70) score += 10;
      if (m3score < 65) score -= 12;
      if (/diy|autonomie|matériel|asynchrone/.test(rationale)) score += 6;
    }
    if (strategy === "ht_lt") {
      if (m3score >= 70) score += 6;
      if (m3score < 65) score -= 18;
      if (/cac\s*(of|=|à|~|de|:)?\s*\d/.test(rationale) || /\d+\s*€?\s*(de\s+)?cac/.test(rationale)) score += 6;
      else if (/breakeven|break-even|marge brute/.test(rationale)) score += 4;
    }
    if (strategy === "full") {
      if (m3score >= 80) score += 6;
      if (m3score >= 70 && m3score < 80) score -= 10;
      if (m3score < 70) score -= 25;
      if (/mature|staff|automat/.test(rationale) || /30\+\s*(ht|clients|ventes)/.test(rationale)) score += 5;
    }
  }

  // 4. Indicateur de bascule
  const basculeSignals = ["bascule", "indicateur", "à partir de", "seuil", "critère", "palier", "kpi"];
  if (basculeSignals.some((s) => rationale.includes(s))) {
    score += 6;
  } else if (/\b(quand|dès\s+que|une\s+fois\s+que)\b[^.]{0,80}\d/.test(rationale)) {
    score += 4;
  }

  // 5. Bande passante delivery
  if (/bande passante|capacité|delivery|temps disp/.test(rationale)) score += 3;

  // 6. Cohérence avec micro-check économique
  if (state.entry.ht_monthly_target && state.entry.ht_monthly_target.trim().length > 15) {
    score += 5;
    const targetWords = state.entry.ht_monthly_target.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (targetWords.some((w) => rationale.includes(w))) score += 3;
  }
  if (strategy !== "ht_only" && state.entry.lt_breakeven_check && state.entry.lt_breakeven_check.trim().length > 30) {
    score += 6;
  }

  // 7. Anti-patterns
  if (strategy === "full") {
    const clientCountMatch = rationale.match(/j['']ai\s+(\d+)\s+(client|étudiant|élève)/);
    if (clientCountMatch && parseInt(clientCountMatch[1], 10) < 15) {
      score -= 20;
    }
    if (/name[-\s]?drop|copy[-\s]?paste|copier/.test(rationale)) score -= 8;
  }

  // Clamp 0-100
  score = Math.min(100, Math.max(0, score));

  // Feedback synthétique
  let feedback = "";
  if (score >= 85) {
    feedback = `✓ Stratégie justifiée avec rigueur. ${uniqueNumbers.size} chiffre(s) concret(s) détecté(s), cohérence M3 vérifiée.`;
  } else if (score >= 70) {
    feedback = `~ Rationale solide mais perfectible. Ajoute plus de chiffres concrets (CAC, taux conv, bande passante) et un indicateur de bascule mesurable.`;
  } else if (score >= 50) {
    feedback = `⚠ Rationale trop générique. Manque de chiffres, faible alignement avec ton score M3 (${m3score || "—"}/100). Reviens à l'essentiel : combien de clients HT signés, quelle bande passante, quel CAC.`;
  } else {
    feedback = `✗ Stratégie peu défendable en l'état. Probablement trop ambitieuse pour ton stade (M3 = ${m3score || "—"}/100). Revoie le choix ou enrichis le rationale.`;
  }

  return { score, feedback, mode: "local" };
}

/* ════════════════════════════════════════════════════════════════════════
 * Prompt Claude
 * ════════════════════════════════════════════════════════════════════════ */
function buildPrompt(state: M4State): string {
  const strategy = state.entry.strategy as EntryStrategy;
  const m3 = state.m3_data;
  const niche = state.m1_data?.sous_niche_2?.phrase_finale || "—";
  const avatar = state.m1_data?.avatar?.socio?.nom || "—";
  const ht = state.ladder.high;
  const m3ScoreGlobal = m3?.prix_score_global ?? "—";

  return `Tu es un évaluateur stratégique business halal (parcours LIBERTY · AL BARAKA).
Tu évalues le NIVEAU D'ENTRÉE de la value ladder de l'élève — par où il commercialise EN PREMIER après son HT.

CONTEXTE :
- Niche : ${niche}
- Avatar : ${avatar}
- HT (M3) : "${ht.name}" · ${ht.price} · ${ht.format}
- Score M3 (prix moyen) : ${m3ScoreGlobal}/100
- Stratégie choisie : ${strategy}
- Cible mensuelle HT : ${state.entry.ht_monthly_target || "—"}
- Breakeven LT/MT : ${state.entry.lt_breakeven_check || "—"}

RATIONALE DE L'ÉLÈVE :
"""
${state.entry.rationale || "(vide)"}
"""

RÈGLE D'OR HT-FIRST :
- "10 clients HT avant un MT. Un MT qui tourne avant un LT. Pas l'inverse."
- ht_only = défaut prudent
- ht_mt = recommandé si M3 ≥ 80 et rationale DIY/autonomie
- ht_lt = défendable si M3 ≥ 70 et CAC mesuré
- full = réservé aux écosystèmes matures (30+ HT, MT validé, LT auto-payant)

CRITÈRES (note 0-100) :
1. Cohérence M3 : la stratégie matche-t-elle le niveau de maturité ?
2. Chiffres concrets : présence de KPIs, CAC, bande passante, indicateur de bascule
3. Anti-trick : pas de promesse vague, pas de full-ladder prématuré, pas de copie d'un name-drop influenceur
4. Lien micro-check économique ↔ rationale

FORMAT DE RÉPONSE STRICT (texte uniquement, exactement ces 2 lignes) :
SCORE: <0-100>
FEEDBACK: <2-4 phrases · ce qui est solide + ce qui manque + 1 action concrète>`;
}

/* ════════════════════════════════════════════════════════════════════════
 * Appel Claude avec fallback
 * ════════════════════════════════════════════════════════════════════════ */
export async function scoreEntryWithAI(state: M4State): Promise<EntryScoreResult> {
  if (!state.entry.strategy) {
    return { score: 0, feedback: "Sélectionne d'abord une stratégie.", mode: "local" };
  }

  try {
    const prompt = buildPrompt(state);
    const result = await callClaude("m4", {
      system: "Tu réponds en suivant strictement le format SCORE/FEEDBACK demandé.",
      user: prompt,
      max_tokens: 600,
    });

    const txt = (result || "").trim();
    const scoreMatch = txt.match(/SCORE\s*:\s*(\d+)/i);
    const fbMatch = txt.match(/FEEDBACK\s*:\s*([\s\S]+)/i);

    if (!scoreMatch) {
      // Réponse mal formée → fallback heuristique
      return heuristicEntryScore(state);
    }
    const score = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
    const feedback = fbMatch ? fbMatch[1].trim() : "(feedback non parsé)";
    return { score, feedback, mode: "cloud" };
  } catch (e) {
    console.warn("[M4] Claude failed, fallback heuristique:", (e as Error).message);
    const heur = heuristicEntryScore(state);
    return {
      ...heur,
      feedback: heur.feedback + " (API IA indisponible · évaluation locale utilisée)",
    };
  }
}
