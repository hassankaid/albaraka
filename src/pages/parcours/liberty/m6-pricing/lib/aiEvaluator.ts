/**
 * Scoring IA pour les 7 étapes pédagogiques M6 PRICING.
 *
 * Calque Sidali v1.2.0 — heuristiques gating strictes par champ + Claude prioritaire
 * via liberty-claude-proxy. Fallback heuristique embarquée si Claude indisponible.
 */

import { callClaude } from "../../m1-niche/lib/claudeClient";
import {
  type M6State, type AIFeedback, type PedaStepKey,
  computeROI, computeMarketAvg,
} from "./types";

interface EvalResult extends AIFeedback {
  score: number;
  ok: boolean;
}

function clamp(n: number, min = 0, max = 100): number { return Math.max(min, Math.min(max, n)); }
function fmtEur(n: number): string { return n ? n.toLocaleString("fr-FR") + " €" : "—"; }

/* ════════════════════════════════════════════════════════════════════════
 * 1 · VALEUR PAR LE PRIX (psychologie premium)
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluateValeurPrixHeuristic(state: M6State): EvalResult {
  const e = state.data.valeur_prix;
  const bug = (e.ma_bugatti || "").trim();
  const sig = (e.signal_phrase || "").trim();
  const anc = (e.ancrage_phrase || "").trim();
  const con = (e.contraste_phrase || "").trim();
  const exc = (e.non_excuse_phrase || "").trim();

  if (!bug || !sig || !anc || !con || !exc) {
    const missing = [!bug && "Ma Bugatti", !sig && "phrase signal", !anc && "phrase ancrage", !con && "phrase contraste", !exc && "phrase non-excuse"].filter(Boolean).join(", ");
    return { score: 0, ok: false, verdict: "✗ 5 champs psychologiques requis", weaknesses: [`Manquant : ${missing}`], suggestions: ["Slide 81 = leviers — ici tu les ÉCRIS pour ton offre."] };
  }
  if (bug.length < 60) return { score: 40, ok: false, verdict: "✗ Bugatti trop pauvre", weaknesses: [`Ma Bugatti = ${bug.length} chars (vise 80+).`], suggestions: ["Décris ton offre comme un objet de valeur disproportionnée (5-10× ce que tu factures)."] };
  if (sig.length < 30) return { score: 48, ok: false, verdict: "✗ Signal absent", weaknesses: ["Phrase signal trop courte."], suggestions: ["Ex : « Mon prix dit que je sélectionne mes élèves — pas l'inverse »."] };
  if (anc.length < 30) return { score: 52, ok: false, verdict: "✗ Ancrage faible", weaknesses: ["Phrase ancrage trop courte."], suggestions: ["Énonce la valeur totale chiffrée AVANT le prix : « Programme + bonus = 9 800€ de valeur. Aujourd'hui 2 997€. »"] };
  if (con.length < 30) return { score: 58, ok: false, verdict: "✗ Contraste faible", weaknesses: ["Phrase contraste trop courte."], suggestions: ["Compare au coût de l'inaction : « Combien tu perds chaque mois × 12 = la vraie facture. »"] };
  if (exc.length < 30) return { score: 62, ok: false, verdict: "✗ Non-excuse faible", weaknesses: ["Phrase non-excuse trop courte."], suggestions: ["Ex : « Si c'est cher pour toi, c'est que ce n'est pas pour toi maintenant. Pas grave. »"] };

  return {
    score: 88, ok: true,
    verdict: "✓ 5 leviers psychologiques posés (slide 81 active).",
    strengths: ["Ma Bugatti substantielle", "Signal, ancrage, contraste, non-excuse formulés"],
    weaknesses: [],
    suggestions: [],
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * 2 · PRIX PAR LA VALEUR (ROI ≥ 5)
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluatePrixValeurHeuristic(state: M6State): EvalResult {
  const e = state.data.prix_valeur;
  const res = parseFloat((e.resultat_client_12m || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const prix = parseFloat((e.prix_ht || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const just = (e.justification_chiffrage || "").trim();

  if (res <= 0 || prix <= 0) {
    return { score: 0, ok: false, verdict: "✗ Données manquantes", weaknesses: ["Renseigne résultat client 12m > 0 ET prix HT > 0."] };
  }
  if (!just) return { score: 30, ok: false, verdict: "✗ Chiffre non justifié", weaknesses: [`Résultat ${fmtEur(res)} sur 12m sans mécanique de calcul.`], suggestions: ["Combien de clients × ticket moyen, ou économies × N mois."] };
  if (just.length < 80) return { score: 45, ok: false, verdict: "~ Justif trop courte", weaknesses: [`${just.length} chars (vise 80+).`], suggestions: ["Détaille la mécanique précise."] };
  if (!/\d/.test(just)) return { score: 55, ok: false, verdict: "✗ Mécanique sans chiffres", weaknesses: ["Justification sans aucun chiffre."], suggestions: ["La mécanique doit être quantifiée."] };

  const roi = res / prix;
  if (roi < 2) return { score: 25, ok: false, verdict: `✗ ROI ${roi.toFixed(1)}x — sous-valorisé`, weaknesses: ["En dessous de 2x, le client paie quasiment ce qu'il récupère."], suggestions: ["Augmente le résultat OU baisse le prix."] };
  if (roi < 3) return { score: 50, ok: false, verdict: `~ ROI ${roi.toFixed(1)}x — limite`, weaknesses: ["Sweet spot HT = ROI 5x+ minimum."], suggestions: ["Renforce le résultat M3 ou ajoute du bonus."] };
  if (roi < 5) return { score: 70, ok: false, verdict: `~ ROI ${roi.toFixed(1)}x — perfectible`, weaknesses: ["ROI en zone acceptable mais pas premium."], suggestions: ["Vise ROI 5x+ pour un HT vraiment défendable."] };
  return {
    score: 92, ok: true,
    verdict: `✓ ROI ${roi.toFixed(1)}x · mécanique chiffrée crédible`,
    strengths: ["Résultat 12m plausible", `Ratio ${roi.toFixed(1)}x dépasse le seuil Hormozi`],
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * 3 · PRIX PAR LE MARCHÉ
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluatePrixMarcheHeuristic(state: M6State): EvalResult {
  const e = state.data.prix_marche;
  const valides = e.concurrents.filter((c) => (c.nom || "").trim() && parseFloat((c.prix || "").replace(/[^\d.,]/g, "").replace(",", ".")) > 0);
  const urlRegex = /[a-z0-9-]+\.[a-z]{2,}/i;
  const avecUrl = valides.filter((c) => (c.url || "").trim() && urlRegex.test(c.url));
  const moyen = computeMarketAvg(e.concurrents);
  const pos = (e.positionnement || "").trim();

  if (valides.length === 0) return { score: 0, ok: false, verdict: "✗ Aucun concurrent", weaknesses: ["Slide 78 : analyse 3 concurrents directs."] };
  if (valides.length === 1) return { score: 25, ok: false, verdict: "✗ 1 seul concurrent", weaknesses: ["Échantillon insuffisant."] };
  if (valides.length === 2) return { score: 50, ok: false, verdict: "~ Manque 1 concurrent", weaknesses: ["Vise 3 concurrents directs."] };
  if (avecUrl.length < 3) return { score: 70, ok: false, verdict: `~ ${3 - avecUrl.length} URL(s) manquante(s)`, weaknesses: ["URL/source vérifiable obligatoire."] };
  if (!pos || pos.length < 30) return { score: 78, ok: false, verdict: "~ Positionnement vide", weaknesses: ["Précise ton positionnement vs marché (jamais le moins cher)."] };

  // Penalty si positionné comme moins cher
  if (/moins cher|low cost|prix bas|cheap/i.test(pos)) {
    return { score: 50, ok: false, verdict: "✗ Positionnement low-cost — DANGER", weaknesses: ["Slide 78 : NE JAMAIS être le moins cher."], suggestions: ["Repositionne premium ou milieu de gamme."] };
  }
  return {
    score: 90, ok: true,
    verdict: `✓ 3 concurrents · moyenne ${fmtEur(moyen)} · positionnement défendu`,
    strengths: ["Étude marché solide", "URLs vérifiables", "Positionnement clair"],
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * 4 · PRIX PAR LA CONFIANCE
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluatePrixConfianceHeuristic(state: M6State): EvalResult {
  const c = state.data.prix_confiance;
  const doutes = (c.doutes_principaux || "").trim();
  const action = (c.action_renforcement || "").trim();
  const conf = c.confiance_sur_deliver;
  const palierDate = (c.plan_augmentation.date_cible || "").trim();
  const prochainPalier = c.plan_augmentation.prochain_palier_prix;
  const declencheur = c.plan_augmentation.declencheur_clients_satisfaits;

  if (!doutes || !action) {
    return { score: 25, ok: false, verdict: "✗ Introspection vide", weaknesses: ["Avant le curseur : (1) tes 2 doutes (60+ chars), (2) UNE action concrète (30+ chars avec verbe)."] };
  }
  if (doutes.length < 60) return { score: 40, ok: false, verdict: "~ Doutes trop courts", weaknesses: [`${doutes.length} chars (vise 60+).`] };

  const actionVerbs = ["appeler", "écrire", "contacter", "demander", "signer", "livrer", "créer", "rédiger", "publier", "enregistrer", "tester", "valider", "envoyer", "programmer", "réserver", "bloquer", "interviewer", "planifier", "filmer", "lancer", "offrir", "proposer", "ajouter", "consulter", "prendre", "faire", "poser", "remplir", "intégrer", "organiser", "préparer"];
  const hasVerb = actionVerbs.some((v) => action.toLowerCase().includes(v));
  if (action.length < 30) return { score: 50, ok: false, verdict: "~ Action trop courte", weaknesses: [`${action.length} chars (vise 30+).`] };
  if (!hasVerb) return { score: 55, ok: false, verdict: "~ Action sans verbe d'action", weaknesses: ["Précise une action concrète (appeler, écrire, livrer…)."] };

  // Plan d'augmentation obligatoire
  if (!prochainPalier || prochainPalier <= 0) return { score: 65, ok: false, verdict: "~ Pas de palier suivant", weaknesses: ["Slide 79 : +10-20% par tranche de 5 clients satisfaits."], suggestions: [`Définis ton prochain palier prix (ex : prix actuel + 15%)`] };
  if (!declencheur || declencheur < 1) return { score: 70, ok: false, verdict: "~ Pas de déclencheur clients", weaknesses: ["Combien de clients satisfaits avant d'augmenter ?"] };
  if (!palierDate) return { score: 75, ok: false, verdict: "~ Pas de date cible palier", weaknesses: ["Date cible pour le prochain palier ?"] };

  // Confiance < 70 → prix temporaire requis
  if (conf < 70 && !c.prix_temporaire.trim()) {
    return { score: 70, ok: false, verdict: "~ Confiance < 70 sans prix temporaire", weaknesses: ["Si la confiance n'est pas là, démarre à un prix d'entrée temporaire."] };
  }

  return {
    score: conf >= 80 ? 90 : 82, ok: true,
    verdict: `✓ Confiance ${conf}/100 · plan d'augmentation cadré`,
    strengths: ["Doutes formulés", "Action concrète", "Palier + déclencheur + date fixés"],
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * 5 · PAIEMENTS HALAL
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluatePaiementsHeuristic(state: M6State): EvalResult {
  const opts = state.data.paiements.options;
  const pitch = (state.data.paiements.pitch_fractionnement || "").trim();
  const halalOk = state.data.paiements.note_halal_acknowledged;
  const selected = (Object.keys(opts) as Array<keyof typeof opts>).filter((k) => opts[k]);

  if (!opts["1x"]) return { score: 20, ok: false, verdict: "✗ 1x absent", weaknesses: ["Le paiement comptant 1x doit rester disponible (ancrage prix)."] };
  if (!halalOk) return { score: 50, ok: false, verdict: "✗ Règle halal non confirmée", weaknesses: ["Confirme : aucune majoration sur les paiements échelonnés (pas de riba)."] };
  if (selected.length < 2) return { score: 65, ok: false, verdict: "~ Pas d'échelonnement", weaknesses: ["Slide 69 : facilités = +20-50% de conversion."] };
  if (!pitch) return { score: 70, ok: false, verdict: "~ Pitch fractionnement manquant", weaknesses: ["Slide 81 levier 5 : le fractionnement est un argument de pitch, pas juste une option de checkout."] };
  if (pitch.length < 40) return { score: 75, ok: false, verdict: "~ Pitch trop court", weaknesses: [`${pitch.length} chars (vise 40+).`] };

  return {
    score: selected.length >= 3 ? 92 : 88, ok: true,
    verdict: `✓ ${selected.length} options halal + pitch incarné`,
    strengths: ["Cadre halal acquis", "Pitch fractionnement écrit"],
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * 6 · B/A/O (Bronze/Argent/Or)
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluateBaoHeuristic(state: M6State): EvalResult {
  const b = state.data.bao.bronze;
  const a = state.data.bao.argent;
  const o = state.data.bao.or;
  const prixHT = parseFloat((state.data.prix_valeur.prix_ht || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const prixB = parseFloat((b.prix || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const prixA = parseFloat((a.prix || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const prixO = parseFloat((o.prix || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;

  if (!prixB || !prixA || !prixO) return { score: 30, ok: false, verdict: "✗ Prix B/A/O manquants", weaknesses: ["3 prix requis (Bronze < Argent < Or)."] };
  if (!b.contenu_court || !a.contenu_court || !o.contenu_court) return { score: 50, ok: false, verdict: "~ Contenus B/A/O manquants", weaknesses: ["Chaque tier doit avoir un contenu court (1-2 lignes)."] };
  if (!(prixB < prixA && prixA < prixO)) return { score: 40, ok: false, verdict: "✗ Ordre B/A/O cassé", weaknesses: ["Bronze < Argent < Or. Tes prix ne respectent pas l'ordre croissant."] };

  // L'Argent doit être ~= prix HT (centre du marché)
  if (prixHT > 0) {
    const ecart = Math.abs((prixA - prixHT) / prixHT);
    if (ecart > 0.3) {
      return { score: 65, ok: false, verdict: "~ Argent loin du prix HT", weaknesses: [`Argent ${fmtEur(prixA)} vs HT ${fmtEur(prixHT)} (écart ${Math.round(ecart * 100)}%).`], suggestions: ["L'Argent doit être ton offre HT principale. Bronze = entry, Or = premium."] };
    }
  }
  return {
    score: 88, ok: true,
    verdict: "✓ Bronze < Argent (HT) < Or · 3 tiers cohérents",
    strengths: ["Ordre B/A/O respecté", "Argent aligné sur le prix HT"],
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * 7 · SCRIPT D'ANNONCE
 * ════════════════════════════════════════════════════════════════════════ */
export function evaluateScriptAnnonceHeuristic(state: M6State): EvalResult {
  const script = (state.data.script_annonce.script_text || "").trim();
  if (!script) return { score: 0, ok: false, verdict: "✗ Script vide", weaknesses: ["Pas de script = arsenal psycho jamais déployé."], suggestions: ["Compose un pitch enchaîné qui intègre Bugatti + signal + ancrage + contraste + non-excuse + fractionnement."] };
  if (script.length < 150) return { score: 40, ok: false, verdict: "~ Script squelettique", weaknesses: [`${script.length} chars (vise 200+).`] };

  // Détection auto-excuse
  const apologyMarkers = ["désolé", "desole", "ça peut paraître cher", "ca peut paraitre cher", "je sais que c'est cher", "je sais que ça peut", "malheureusement"];
  const lower = script.toLowerCase();
  if (apologyMarkers.some((m) => lower.includes(m))) {
    return { score: 35, ok: false, verdict: "✗ Auto-excuse détectée", weaknesses: ["Slide 81 levier 4 cassé : « Ne jamais s'excuser de son prix »."], suggestions: ["Tu énonces, tu te tais. Pas de « je sais que ça peut paraître cher mais… »."] };
  }

  // Le prix HT doit apparaître
  const prixHT = parseFloat((state.data.prix_valeur.prix_ht || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  if (prixHT > 0) {
    const prixStr = String(Math.round(prixHT));
    const prixWithSpace = Math.round(prixHT).toLocaleString("fr-FR").replace(/\s/g, "\\s?");
    const hasPrice = lower.includes(prixStr) || new RegExp(prixWithSpace).test(lower);
    if (!hasPrice) return { score: 55, ok: false, verdict: "~ Prix HT absent du script", weaknesses: [`Le prix ${fmtEur(prixHT)} n'apparaît PAS dans le pitch.`] };
  }

  return {
    score: script.length >= 300 ? 92 : 85, ok: true,
    verdict: "✓ Script complet · pas d'auto-excuse · prix énoncé",
    strengths: ["Pitch enchaîné", "Levier non-excuse respecté", "Prix HT incarné"],
  };
}

/* ════════════════════════════════════════════════════════════════════════
 * APPEL CLAUDE PAR ÉTAPE (prompt + fallback)
 * ════════════════════════════════════════════════════════════════════════ */
const SYSTEM_BASE = `Tu es un évaluateur business halal (LIBERTY · AL BARAKA · Module 6 PRICING v1.2.0).
Tu audites le calibrage du prix sur 7 axes : valeur PAR le prix (psycho premium) · prix PAR la valeur (ROI ≥ 5) ·
prix PAR le marché (3 concurrents) · prix PAR la confiance (introspection + plan d'augmentation) · paiements halal
(sans riba) · B/A/O (Bronze<Argent<Or) · script d'annonce (pas d'auto-excuse, prix énoncé).

FORMAT DE RÉPONSE STRICT (JSON valide sans markdown) :
{
  "score": <0-100>,
  "verdict": "<phrase courte>",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}`;

function contextHeader(state: M6State): string {
  const m3 = state.m3_data;
  const m4 = state.m4_data;
  return `CONTEXTE :
- Avatar : ${state.m1_data?.avatar?.socio?.nom ?? "—"}
- HT M3 : "${m3?.headline_promesse ?? m3?.promesse ?? "—"}" · ${m4?.ht?.price ?? m3?.prix_display ?? "—"}
- Stratégie M4 : ${m4?.entry_strategy ?? "—"}${m4?.strategy_score_is_forced ? " (FORCÉ, seuil M6=85)" : ""}
- Cible HT/mois M4 : ${m4?.ht_monthly_target ?? "—"}`;
}

async function callClaudeWithFallback(
  state: M6State, step: PedaStepKey, userPrompt: string, fallback: EvalResult,
): Promise<EvalResult & { ai_mode: "cloud" | "local" }> {
  try {
    const raw = await callClaude("m6", { system: SYSTEM_BASE, user: userPrompt, max_tokens: 700 });
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
    console.warn(`[M6] Claude fallback (${step}):`, (e as Error).message);
    return { ...fallback, ai_mode: "local" };
  }
}

export async function evaluateValeurPrix(state: M6State) {
  const fb = evaluateValeurPrixHeuristic(state);
  const d = state.data.valeur_prix;
  const prompt = `${contextHeader(state)}

ÉTAPE 1 — VALEUR PAR LE PRIX (psychologie premium)
Ma Bugatti : """${d.ma_bugatti}"""
Signal : """${d.signal_phrase}"""
Ancrage : """${d.ancrage_phrase}"""
Contraste : """${d.contraste_phrase}"""
Non-excuse : """${d.non_excuse_phrase}"""

Critères : 5 champs distincts, Bugatti substantielle (80+ chars), chaque phrase psycho 30+ chars, anti-générique.`;
  return callClaudeWithFallback(state, "valeur_prix", prompt, fb);
}

export async function evaluatePrixValeur(state: M6State) {
  const fb = evaluatePrixValeurHeuristic(state);
  const d = state.data.prix_valeur;
  const prompt = `${contextHeader(state)}

ÉTAPE 2 — PRIX PAR LA VALEUR (ROI ≥ 5)
Résultat client 12m : ${d.resultat_client_12m}
Prix HT : ${d.prix_ht}
ROI calculé : ${computeROI(d.resultat_client_12m, d.prix_ht)}x
Justification chiffrage : """${d.justification_chiffrage}"""

Critères : ROI ≥ 5x premium, ≥ 3x acceptable, < 2x sous-valorisé. Justif 80+ chars avec chiffres intermédiaires.`;
  return callClaudeWithFallback(state, "prix_valeur", prompt, fb);
}

export async function evaluatePrixMarche(state: M6State) {
  const fb = evaluatePrixMarcheHeuristic(state);
  const d = state.data.prix_marche;
  const concDump = d.concurrents.map((c, i) => `${i + 1}. ${c.nom || "(vide)"} · ${c.prix || "—"} · ${c.url || "(pas d'URL)"}`).join("\n");
  const prompt = `${contextHeader(state)}

ÉTAPE 3 — PRIX PAR LE MARCHÉ
Concurrents :
${concDump}
Moyenne calculée : ${computeMarketAvg(d.concurrents)} €
Positionnement : """${d.positionnement}"""

Critères : 3 concurrents directs avec URL vérifiable. JAMAIS le moins cher (slide 78). Positionnement explicite.`;
  return callClaudeWithFallback(state, "prix_marche", prompt, fb);
}

export async function evaluatePrixConfiance(state: M6State) {
  const fb = evaluatePrixConfianceHeuristic(state);
  const c = state.data.prix_confiance;
  const prompt = `${contextHeader(state)}

ÉTAPE 4 — PRIX PAR LA CONFIANCE
Confiance sur-délivrer : ${c.confiance_sur_deliver}/100
Doutes principaux : """${c.doutes_principaux}"""
Action de renforcement : """${c.action_renforcement}"""
Prix temporaire (si confiance < 70) : ${c.prix_temporaire || "—"}
Plan d'augmentation :
  - prochain palier prix : ${c.plan_augmentation.prochain_palier_prix} €
  - déclencheur (clients satisfaits) : ${c.plan_augmentation.declencheur_clients_satisfaits}
  - date cible : ${c.plan_augmentation.date_cible || "—"}

Critères : doutes 60+ chars, action 30+ chars avec verbe, plan d'augmentation complet (palier+déclencheur+date).`;
  return callClaudeWithFallback(state, "prix_confiance", prompt, fb);
}

export async function evaluatePaiements(state: M6State) {
  const fb = evaluatePaiementsHeuristic(state);
  const p = state.data.paiements;
  const active = (Object.entries(p.options) as Array<[string, boolean]>).filter(([, v]) => v).map(([k]) => k).join(", ");
  const prompt = `${contextHeader(state)}

ÉTAPE 5 — PAIEMENTS HALAL
Options actives : ${active || "(aucune)"}
Note halal acknowledged : ${p.note_halal_acknowledged ? "oui" : "non"}
Pitch fractionnement : """${p.pitch_fractionnement}"""

Critères : 1x obligatoire, halal acknowledged, ≥ 2 options, pitch 40+ chars (slide 81 levier 5).`;
  return callClaudeWithFallback(state, "paiements", prompt, fb);
}

export async function evaluateBao(state: M6State) {
  const fb = evaluateBaoHeuristic(state);
  const b = state.data.bao;
  const prompt = `${contextHeader(state)}

ÉTAPE 6 — B/A/O (Bronze/Argent/Or)
Bronze : ${b.bronze.prix} — ${b.bronze.contenu_court}
Argent : ${b.argent.prix} — ${b.argent.contenu_court}
Or     : ${b.or.prix} — ${b.or.contenu_court}

Critères : Bronze < Argent < Or, Argent ≈ prix HT (±30%), 3 contenus courts remplis.`;
  return callClaudeWithFallback(state, "bao", prompt, fb);
}

export async function evaluateScriptAnnonce(state: M6State) {
  const fb = evaluateScriptAnnonceHeuristic(state);
  const s = state.data.script_annonce.script_text;
  const prompt = `${contextHeader(state)}

ÉTAPE 7 — SCRIPT D'ANNONCE DE PRIX
"""${s}"""

Critères : script 200+ chars, prix HT énoncé, aucune auto-excuse, intègre Bugatti + signal + ancrage + contraste + non-excuse + fractionnement.`;
  return callClaudeWithFallback(state, "script_annonce", prompt, fb);
}
