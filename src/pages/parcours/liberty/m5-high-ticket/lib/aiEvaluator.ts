/**
 * Scoring IA pour les 5 étapes pédagogiques M5.
 *
 * Calque Sidali v1.1.1 SÉMANTIQUE DURCI :
 * - _isFiller (gibberish, lorem, mots ultra-répétés, caractères répétés)
 * - _countConcepts (idées distinctes via virgules, conjonctions, +, /)
 * - _hasNameDropCopyPattern (Iman Gadzhi, Sarah Knight, "comme [NomPropre]")
 * - _hasGrossPromise ("à vie", "guérir", "magique", "absolu")
 * - _hasMetaDiscourse (décrit l'exercice au lieu de la situation client)
 * - Pénalité uniformité (-25 si tous axes conditions à 9-10 sans variance)
 *
 * Claude prioritaire via liberty-claude-proxy, fallback heuristique en cas d'erreur.
 */

import { callClaude } from "../../m1-niche/lib/claudeClient";
import {
  type M5State, type PedaStepKey, type AIFeedback,
  type ConditionsState, type ConditionAxisKey,
  CONDITION_AXES, validationThreshold,
} from "./types";

/* ════════════════════════════════════════════════════════════════════════
 * HEURISTIQUES PRIMITIVES (calque Sidali v1.1.1)
 * ════════════════════════════════════════════════════════════════════════ */

export function isFiller(text: string | undefined): boolean {
  if (!text) return true;
  const t = String(text).trim();
  if (t.length < 8) return true;
  if (/^(.)\1{4,}/.test(t)) return true;
  if (/(.)\1{6,}/.test(t)) return true;
  if (/lorem|ipsum|dolor|consectetur/i.test(t)) return true;
  const words = t.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const counts: Record<string, number> = {};
    words.forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    if (words.length >= 8 && maxCount / words.length > 0.4) return true;
  }
  const shortWords = words.filter((w) => w.length <= 2).length;
  if (words.length >= 6 && shortWords / words.length > 0.6) return true;
  return false;
}

export function countConcepts(text: string | undefined): number {
  if (!text) return 0;
  const t = String(text).trim();
  if (t.length < 10) return 0;
  const chunks = t
    .split(/[.;,+/\n]|\s-\s|\b(et|mais|car|donc|puisque|parce que|alors que|tandis que|ensuite|puis|d'abord)\b/i)
    .map((s) => (s || "").trim())
    .filter((s) => s.length >= 8 && !/^(et|mais|car|donc|puisque|parce que|alors que|tandis que|ensuite|puis|d'abord)$/i.test(s));
  return chunks.length;
}

export function hasNameDropCopyPattern(text: string | undefined): boolean {
  if (!text) return false;
  const t = (text || "").toLowerCase();
  const famousNames = [
    "gadzhi", "iman gadzhi", "hormozi", "alex hormozi", "sarah knight",
    "mel robbins", "tony robbins", "grant cardone", "simon sinek",
    "gary vee", "gary vaynerchuk", "naval", "mr beast", "jordan peterson",
    "tate", "andrew tate", "dan bilzerian",
  ];
  const copyMarkers = [
    "comme eux", "comme lui", "comme elle", "fasse pareil", "à leur niveau",
    "tiktok pousse", "tout en même temps", "version halal", "version musulman",
    "sens que c'est le moment", "perdre du temps", "me faire prendre la place",
    "à la manière de", "reproduire", "dupliquer", "modèle", "pareil que",
    "mais en mieux", "mais en plus", "mais halal", "concurrent",
  ];
  const commeNomPropre = /\bcomme\s+[A-Z][a-zà-ÿ]+(\s+[A-Z][a-zà-ÿ]+)?/.test(text);
  const fasseCommeNom = /\b(à la mani[èe]re de|comme le fait|fasse comme|fais comme)\s+[A-Z][a-zà-ÿ]+/.test(text);
  const hasName = famousNames.some((n) => t.includes(n));
  const hasCopy = copyMarkers.some((c) => t.includes(c));
  return (hasName && hasCopy) || commeNomPropre || fasseCommeNom;
}

export function hasGrossPromise(text: string | undefined): boolean {
  if (!text) return false;
  const t = String(text).toLowerCase();
  const gross = [
    "à vie", "pour toujours", "guérir", "libér", "liberté totale",
    "millionnaire", "millionaire", "liberté financière", "jamais plus",
    "définitiv", "sans effort", "sans travail", "magique", "miracle",
    "révolutionn", "unique au monde", "incomparable", "parfait", "absolu",
  ];
  return gross.some((k) => t.includes(k));
}

export function hasMetaDiscourse(text: string | undefined): boolean {
  if (!text) return false;
  const t = String(text).toLowerCase();
  const metas = [
    /\ble\s+(point\s+[ab]|pont|bridge|mécanisme|client\s+doit)\s+(doit|devrait|consiste|représente)/i,
    /\bil\s+faut\s+(décrire|nommer|identifier|formuler|expliquer|préciser|dire|montrer|chiffrer)/i,
    /\bon\s+doit\s+(décrire|nommer|identifier|formuler)/i,
    /\b(décrire|nommer|identifier|formuler)\s+(la situation|le contexte|le client|la douleur)/i,
  ];
  return metas.some((re) => re.test(t));
}

/* ════════════════════════════════════════════════════════════════════════
 * ÉVALUATEURS HEURISTIQUES PAR ÉTAPE
 * ════════════════════════════════════════════════════════════════════════ */

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function evaluatePontHeuristic(state: M5State): AIFeedback & { score: number } {
  const d = state.data.pont;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];
  let score = 30;

  const formA = (d.pointA.formulated || "").trim();
  const formB = (d.pointB.formulated || "").trim();
  const measur = (d.pointB.measurable_outcome || "").trim();
  const br = (d.bridge_summary || "").trim();

  // Filler guard global
  if (isFiller(formA) && isFiller(formB) && isFiller(measur) && isFiller(br)) {
    return {
      score: 10,
      verdict: "✗ Pont non posé. Filler détecté.",
      strengths: [],
      weaknesses: ["Tous les champs sont vides ou remplis de filler."],
      suggestions: ["Reprends chaque champ avec du contenu réel — concret, daté, chiffré."],
    };
  }

  // Point A — exiger 3 concepts distincts
  if (isFiller(formA)) {
    weaknesses.push("Point A vide ou filler.");
    suggestions.push("Décris la situation matérielle (chiffre), le contexte familial, et le déclencheur émotionnel.");
  } else if (hasMetaDiscourse(formA)) {
    score -= 5;
    weaknesses.push("Point A décrit l'EXERCICE au lieu de la SITUATION CLIENT.");
    suggestions.push("Reformule au présent narratif (ex : « 27 ans, célibataire depuis 7 ans, 4 fiançailles brisées. »).");
  } else {
    const conceptsA = countConcepts(formA);
    if (conceptsA >= 3 && formA.length > 80) {
      score += 20;
      strengths.push(`Point A riche : ${conceptsA} concepts distincts (situation + contexte + déclencheur).`);
    } else if (conceptsA >= 2 && formA.length > 60) {
      score += 10;
      weaknesses.push(`Point A correct mais incomplet — ${conceptsA} concept(s). Il manque le contexte familial OU le déclencheur émotionnel.`);
    } else {
      score += 4;
      weaknesses.push("Point A pauvre — ajoute du contexte et un déclencheur précis.");
    }
  }

  // Point B — résultat mesurable
  if (isFiller(measur)) {
    weaknesses.push("Le résultat mesurable du Point B est vide.");
    suggestions.push("Donne un chiffre + une unité (€, kg, témoignages, calls/jour).");
  } else if (hasGrossPromise(measur) || hasGrossPromise(formB)) {
    score -= 10;
    weaknesses.push("Promesse grossière détectée (« à vie », « guérir », « magique »…). À recadrer immédiatement.");
    suggestions.push("Remplace par un délai précis + une métrique vérifiable.");
  } else {
    // mesurable a un chiffre ?
    const hasNumber = /\d/.test(measur);
    if (hasNumber) { score += 15; strengths.push("Résultat mesurable chiffré — bon signal."); }
    else { weaknesses.push("Le résultat mesurable n'a pas de chiffre — ajoute une métrique."); }
  }

  if (d.pointB.timeframe_days > 0 && d.pointB.timeframe_days <= 180) {
    score += 5;
  } else if (d.pointB.timeframe_days > 180) {
    weaknesses.push("Le délai dépasse 6 mois — trop long pour un HT crédible.");
  }

  // Bridge summary
  if (isFiller(br)) {
    weaknesses.push("Le résumé du pont est vide — il manque le « comment » entre A et B.");
  } else if (hasNameDropCopyPattern(br)) {
    score -= 8;
    weaknesses.push("Name-drop / copie d'écosystème détecté dans le résumé du pont.");
  } else {
    score += 12;
    strengths.push("Résumé du pont structuré.");
  }

  score = clamp(score);
  const verdict = score >= validationThreshold(state)
    ? "✓ Pont solide."
    : score >= 60 ? "~ Pont défendable mais perfectible." : "✗ Pont à reprendre.";

  return { score, verdict, strengths, weaknesses, suggestions };
}

export function evaluateConditionsHeuristic(state: M5State): AIFeedback & { score: number; weakest_axis?: string } {
  const d: ConditionsState = state.data.conditions;
  const fields: ConditionAxisKey[] = ["simple", "rapide", "systematique", "aspirante"];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Filler guard
  const allJustifs = fields.map((f) => d[f].justification || "").join(" ");
  if (isFiller(allJustifs)) {
    return {
      score: 5,
      verdict: "✗ Audit non posé. Filler détecté.",
      strengths: [],
      weaknesses: ["Toutes les justifications sont vides ou filler."],
      suggestions: ["Pour chaque axe, écris AU MOINS 2 phrases sur ce qui marche ET ce qui manque."],
      weakest_axis: "",
    };
  }

  // Sliders
  const scores = fields.map((f) => d[f].score || 0);
  const totalSlider = scores.reduce((a, b) => a + b, 0);
  score += Math.round((totalSlider / 40) * 25);

  // Justifs qualité
  let justifQual = 0;
  fields.forEach((f) => {
    const just = (d[f].justification || "").trim();
    if (isFiller(just)) return;
    const concepts = countConcepts(just);
    if (concepts >= 2 && just.length > 60) justifQual += 10;
    else if (concepts >= 1 && just.length > 40) justifQual += 5;
    else if (just.length > 20) justifQual += 2;
  });
  score += Math.min(40, justifQual);

  // Bonus champs contextuels remplis
  let bonus = 0;
  fields.forEach((f) => {
    const axisCfg = CONDITION_AXES.find((c) => c.key === f);
    if (!axisCfg) return;
    const ctxValue = (d[f] as any)[axisCfg.contextField];
    if (ctxValue && String(ctxValue).trim().length >= 3) bonus += 3;
  });
  score += Math.min(12, bonus);

  // Action plan
  if ((d.action_plan || "").trim().length > 40 && countConcepts(d.action_plan) >= 2) {
    score += 8;
    strengths.push("Action plan structuré pour combler le levier le plus faible.");
  } else {
    weaknesses.push("Action plan vague ou absent. Précise : action + délai + signal de succès.");
  }

  // Pénalité uniformité — tous axes 9-10 sans variance
  const allHigh = scores.every((s) => s >= 9);
  const variance = Math.max(...scores) - Math.min(...scores);
  if (allHigh && variance === 0) {
    score -= 25;
    weaknesses.push("Tous les axes à 9-10 sans variance — irréaliste. Identifie ton axe le plus faible.");
  }

  // weakest_axis : si pas renseigné, on le calcule
  const minScore = Math.min(...scores);
  const computedWeakest = fields[scores.indexOf(minScore)];
  const weakest = d.weakest_axis || computedWeakest;

  score = clamp(score);
  const verdict = score >= validationThreshold(state)
    ? `✓ Audit Hormozi solide. Levier faible : ${weakest}.`
    : score >= 60 ? `~ Audit défendable. Renforce ${weakest}.` : "✗ Audit à reprendre — manque de chiffres et de relief.";

  return { score, verdict, strengths, weaknesses, suggestions, weakest_axis: weakest };
}

export function evaluateEatComplexityHeuristic(state: M5State): AIFeedback & { score: number } {
  const rows = state.data.eatcomplex.rows;
  const filled = rows.filter((r) => (r.client_step || "").trim() && (r.what_you_eat || "").trim());
  let score = 20 + filled.length * 12;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  // Filler guard
  const all = rows.map((r) => `${r.client_step} ${r.what_you_eat} ${r.what_remains}`).join(" ");
  if (isFiller(all)) {
    return {
      score: 10,
      verdict: "✗ Eat Complexity non posé. Filler détecté.",
      strengths, weaknesses: ["Tableau vide ou filler."],
      suggestions: ["Pour chaque étape client, dis CONCRÈTEMENT ce que tu fais (templates, audits, scripts) et ce que le client doit faire."],
    };
  }

  // Anti-pattern : eat complexity inversé (le client a plus à faire que toi)
  let inverted = 0;
  rows.forEach((r) => {
    const eatLen = (r.what_you_eat || "").trim().length;
    const remainsLen = (r.what_remains || "").trim().length;
    if (remainsLen > eatLen * 1.3 && remainsLen > 20) inverted++;
  });
  if (inverted >= 3) {
    score -= 20;
    weaknesses.push(`${inverted} lignes où le client a plus de tâches que toi — Eat Complexity inversé.`);
    suggestions.push("Réécris ce que TOI tu digères (templates, audits, briefs prêts à l'emploi).");
  }

  // Qualité contenu
  let qual = 0;
  filled.forEach((r) => {
    if (countConcepts(r.what_you_eat) >= 2) qual += 5;
  });
  score += Math.min(20, qual);

  if (filled.length >= 4) strengths.push(`${filled.length}/5 étapes documentées.`);
  else weaknesses.push(`Seulement ${filled.length}/5 étapes — il en manque ${5 - filled.length}.`);

  score = clamp(score);
  const verdict = score >= validationThreshold(state)
    ? "✓ Eat Complexity solide — tu manges, le client digère."
    : score >= 60 ? "~ Audit défendable mais incomplet." : "✗ À reprendre.";

  return { score, verdict, strengths, weaknesses, suggestions };
}

export function evaluateStructureHeuristic(state: M5State): AIFeedback & { score: number } {
  const d = state.data.structure;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];
  let score = 20;

  const phasesFilled = d.phases.filter((p) => (p.name || "").trim() && (p.livrables || "").trim());
  score += phasesFilled.length * 18;

  // Filler guard
  const all = d.phases.map((p) => `${p.name} ${p.livrables}`).join(" ");
  if (isFiller(all)) {
    return {
      score: 10,
      verdict: "✗ Structure non posée. Filler détecté.",
      strengths, weaknesses: ["Phases vides ou filler."],
      suggestions: ["Pour chaque phase : nom propre + 2-3 livrables CONCRETS (pas « apprentissage »)."],
    };
  }

  // Total semaines cohérent
  if (d.total_weeks >= 8 && d.total_weeks <= 16) score += 5;
  if (d.promise_days >= 60 && d.promise_days <= 100) score += 5;

  // Mécanisme anchor
  if ((d.mecanisme_anchor || "").trim().length > 10) {
    score += 8;
    strengths.push("Mécanisme bien ancré dans la structure.");
  } else {
    weaknesses.push("Pas de référence au mécanisme M3 — la structure semble hors-sol.");
  }

  // Livrables concrets
  let livQual = 0;
  d.phases.forEach((p) => {
    if (countConcepts(p.livrables) >= 2 && p.livrables.length > 30) livQual += 5;
  });
  score += Math.min(20, livQual);

  if (phasesFilled.length >= 3) strengths.push(`${phasesFilled.length} phases renseignées.`);
  else weaknesses.push(`Seulement ${phasesFilled.length}/3 phases remplies.`);

  score = clamp(score);
  const verdict = score >= validationThreshold(state)
    ? "✓ Structure crédible."
    : score >= 60 ? "~ Structure défendable mais à enrichir." : "✗ À reprendre.";

  return { score, verdict, strengths, weaknesses, suggestions };
}

export function evaluateConvictionHeuristic(state: M5State): AIFeedback & { score: number } {
  const d = state.data.conviction;
  const checks = Object.values(d.checklist);
  const checked = checks.filter(Boolean).length;
  let score = checked * 14; // 5 cases × 14 = 70 max
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  // Anti-générique : missing field doit être substantiel SI tous les checks ne sont pas cochés
  const missing = (d.missing || "").trim();
  if (checked < 5) {
    if (isFiller(missing) || missing.length < 30) {
      score -= 10;
      weaknesses.push("Tu n'as pas tout coché mais le champ « missing » est vide. Précise ce qui te manque.");
    } else if (countConcepts(missing) >= 2) {
      score += 12;
      strengths.push("Honnêteté sur ce qui te manque — c'est exactement la conviction qu'on cherche.");
    }
  } else {
    if (missing.length > 0 && !isFiller(missing)) score += 5;
    strengths.push("5/5 checklist cochée.");
  }

  // Next action
  const next = (d.next_action || "").trim();
  if (!isFiller(next) && countConcepts(next) >= 1 && next.length > 30) {
    score += 10;
    strengths.push("Prochaine action concrète identifiée.");
  } else {
    weaknesses.push("Prochaine action vague — précise quoi faire d'ici 7 jours.");
  }

  // Anti-générique : si « je suis confiant » seul sans contenu
  if (/^je\s+suis\s+(confiant|prêt|sûr)/i.test(missing) && missing.length < 60) {
    score -= 8;
    weaknesses.push("« Je suis confiant » sans contenu = pas de la conviction, du déni.");
  }

  score = clamp(score);
  const verdict = score >= validationThreshold(state)
    ? "✓ Conviction posée."
    : score >= 60 ? "~ Conviction en construction." : "✗ Conviction trop fragile pour vendre 1to1.";

  return { score, verdict, strengths, weaknesses, suggestions };
}

/* ════════════════════════════════════════════════════════════════════════
 * APPELS CLAUDE PAR ÉTAPE (prompts + fallback)
 * ════════════════════════════════════════════════════════════════════════ */

const SYSTEM_BASE = `Tu es un évaluateur business halal (LIBERTY · AL BARAKA · Module 5 HIGH-TICKET).
Tu audites de manière brutale mais respectueuse. Tu fais respecter la règle d'or HT-FIRST + les 4 conditions Hormozi
(simple/rapide/systématique/aspirante) + Eat-the-Complexity + structure 12 sem/90j + Conviction interne.
Tu détectes : filler (gibberish), name-drop ("comme Iman Gadzhi"), copie d'écosystème, promesses grossières
("à vie", "guérir"), méta-discours (décrire l'exercice au lieu du client), Eat Complexity inversé, uniformité 9-10/10
sans variance. Tu donnes des verdicts honnêtes.

FORMAT DE RÉPONSE STRICT (JSON valide, sans markdown) :
{
  "score": <0-100>,
  "verdict": "<phrase courte>",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]${" "}
}`;

interface ClaudeCallOptions {
  state: M5State;
  step: PedaStepKey;
  prompt: string;
  fallback: AIFeedback & { score: number };
}

async function callClaudeForStep(opts: ClaudeCallOptions): Promise<AIFeedback & { score: number; ai_mode: "cloud" | "local" }> {
  try {
    const raw = await callClaude("m5", {
      system: SYSTEM_BASE,
      user: opts.prompt,
      max_tokens: 900,
    });
    const trimmed = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(trimmed) as Partial<AIFeedback & { score: number }>;
    if (typeof parsed.score !== "number") throw new Error("score non parsé");
    return {
      score: Math.min(100, Math.max(0, Math.round(parsed.score))),
      verdict: parsed.verdict || "(verdict non fourni)",
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      suggestions: parsed.suggestions || [],
      ai_mode: "cloud",
    };
  } catch (e) {
    console.warn(`[M5] Claude fallback (${opts.step}):`, (e as Error).message);
    return { ...opts.fallback, ai_mode: "local" };
  }
}

function contextHeader(state: M5State): string {
  const m3 = state.m3_data;
  const m4 = state.m4_data;
  return `CONTEXTE :
- Avatar : ${state.m1_data?.avatar?.socio?.nom ?? "—"} (${state.m1_data?.sous_niche_2?.phrase_finale ?? "—"})
- HT M3 : "${m3?.headline_promesse ?? m3?.promesse ?? "—"}" · mécanisme "${m3?.hero_mecanisme_nom ?? "—"}" · ${m3?.prix_display ?? m3?.prix?.montant ?? "—"}
- Stratégie M4 : ${m4?.entry_strategy ?? "—"}${m4?.strategy_score_is_forced ? " (FORCÉ - seuil M5 = 85)" : ""}
- Levier faible M3 : ${m3?.weakest_lever ?? m3?.prix?.levier_faible ?? "—"}
- Cible HT/mois M4 : ${m4?.ht_monthly_target ?? "—"}`;
}

export async function evaluatePont(state: M5State) {
  const fallback = evaluatePontHeuristic(state);
  const d = state.data.pont;
  const prompt = `${contextHeader(state)}

ÉTAPE : LE PONT (Point A → Point B)

POINT A (situation client AUJOURD'HUI) :
"""${d.pointA.formulated || "(vide)"}"""

POINT B (résultat dans X jours) :
"""${d.pointB.formulated || "(vide)"}"""

RÉSULTAT MESURABLE : "${d.pointB.measurable_outcome || "(vide)"}"
DÉLAI : ${d.pointB.timeframe_days} jours

RÉSUMÉ DU PONT :
"""${d.bridge_summary || "(vide)"}"""

CRITÈRES :
1. Point A doit avoir 3 concepts distincts (situation matérielle + contexte + déclencheur émotionnel)
2. Point B doit être chiffré et mesurable (pas de "à vie", "guérir", etc.)
3. Délai cohérent (idéalement ≤ 90 jours pour un HT)
4. Bridge summary doit éviter name-drop ("comme Iman Gadzhi") et méta-discours
5. Aucun filler ou gibberish

Évalue selon le format JSON.`;
  return callClaudeForStep({ state, step: "pont", prompt, fallback });
}

export async function evaluateConditions(state: M5State) {
  const fallback = evaluateConditionsHeuristic(state);
  const d = state.data.conditions;
  const dump = (["simple", "rapide", "systematique", "aspirante"] as ConditionAxisKey[])
    .map((k) => `- ${k} (${d[k].score}/10) : ${d[k].justification || "(vide)"}`)
    .join("\n");
  const prompt = `${contextHeader(state)}

ÉTAPE : 4 CONDITIONS HORMOZI (audit du HT M3)

NOTATION PAR AXE :
${dump}

LEVIER FAIBLE DÉSIGNÉ : ${d.weakest_axis || "(à déduire)"}
PLAN D'ACTION : "${d.action_plan || "(vide)"}"

CRITÈRES :
1. Justifications ≥ 2 concepts chacune (pas du remplissage)
2. Pénalité si tous axes 9-10 sans variance (uniformité = irréaliste)
3. Action plan doit cibler le levier le plus faible avec action + délai + signal
4. Doit cohabiter avec le levier faible M3 (${state.m3_data?.weakest_lever ?? "non précisé"})

Identifie weakest_axis (clé : simple|rapide|systematique|aspirante) et évalue.
Retourne JSON avec un champ supplémentaire "weakest_axis".`;
  const res = await callClaudeForStep({ state, step: "conditions", prompt, fallback });
  return res as typeof res & { weakest_axis?: string };
}

export async function evaluateEatComplexity(state: M5State) {
  const fallback = evaluateEatComplexityHeuristic(state);
  const rows = state.data.eatcomplex.rows
    .map((r, i) => `Ligne ${i + 1}:\n  étape client : ${r.client_step || "(vide)"}\n  ce que tu manges : ${r.what_you_eat || "(vide)"}\n  ce qui reste au client : ${r.what_remains || "(vide)"}`)
    .join("\n\n");
  const prompt = `${contextHeader(state)}

ÉTAPE : EAT THE COMPLEXITY (tu manges, le client digère)

${rows}

CRITÈRES :
1. Au moins 4/5 lignes remplies
2. ANTI-PATTERN inversé : si "ce qui reste au client" >> "ce que tu manges" sur 3+ lignes, c'est un eat-complexity inversé
3. "Ce que tu manges" doit être CONCRET (templates, audits, scripts, briefs) — pas "je l'accompagne"
4. Aucun filler

Évalue selon le format JSON.`;
  return callClaudeForStep({ state, step: "eatcomplex", prompt, fallback });
}

export async function evaluateStructure(state: M5State) {
  const fallback = evaluateStructureHeuristic(state);
  const d = state.data.structure;
  const phasesDump = d.phases
    .map((p) => `Phase ${p.num} (semaines ${p.weeks}) — ${p.name || "(vide)"} :\n  livrables : ${p.livrables || "(vide)"}`)
    .join("\n\n");
  const prompt = `${contextHeader(state)}

ÉTAPE : STRUCTURE ${d.total_weeks} SEMAINES · PROMESSE ${d.promise_days} JOURS

ANCRAGE MÉCANISME : "${d.mecanisme_anchor || "(vide)"}"

${phasesDump}

CRITÈRES :
1. 3 phases minimum, chacune avec nom propre + livrables concrets
2. Cohérence avec le mécanisme M3 (${state.m3_data?.hero_mecanisme_nom ?? "—"})
3. Livrables : 2+ concepts par phase, pas "apprentissage" générique
4. Total weeks ≈ 8-16, promise days ≈ 60-100

Évalue selon le format JSON.`;
  return callClaudeForStep({ state, step: "structure", prompt, fallback });
}

export async function evaluateConviction(state: M5State) {
  const fallback = evaluateConvictionHeuristic(state);
  const d = state.data.conviction;
  const checked = Object.entries(d.checklist).filter(([, v]) => v).map(([k]) => k);
  const unchecked = Object.entries(d.checklist).filter(([, v]) => !v).map(([k]) => k);
  const prompt = `${contextHeader(state)}

ÉTAPE : CONVICTION INTÉRIEURE

CHECKLIST (5 items) :
✓ cochés : ${checked.length > 0 ? checked.join(", ") : "(aucun)"}
✗ non cochés : ${unchecked.length > 0 ? unchecked.join(", ") : "(aucun)"}

CE QUI MANQUE :
"""${d.missing || "(vide)"}"""

PROCHAINE ACTION :
"""${d.next_action || "(vide)"}"""

CRITÈRES :
1. Si tous cochés sans "missing" → suspecter le déni
2. Si peu cochés sans "missing" rempli → manque d'honnêteté
3. "Je suis confiant" sans contenu = déni, pas conviction
4. Next action doit être datée et concrète (≤ 7 jours)

Évalue selon le format JSON.`;
  return callClaudeForStep({ state, step: "conviction", prompt, fallback });
}
