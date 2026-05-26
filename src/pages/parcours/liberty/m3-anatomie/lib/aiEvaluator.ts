/**
 * Évaluateur IA M3 — calque sur M2 mais avec 6 evaluators pour étapes
 * scoring + 1 diagnostic spécial pour le prix (4 leviers Hormozi).
 *
 * Threshold validation : 80/100 (plus exigeant que M2 à 60).
 */

import { callClaude, parseClaudeJSON } from "../../m1-niche/lib/claudeClient";
import {
  type AIFeedback,
  type M3State,
  pickAvatarName,
  pickNiche,
  pickMarketLabel,
} from "./types";

const SYSTEM_BASE = `Tu es l'IA pédagogique du Module 3 ANATOMIE D'UNE OFFRE du programme LIBERTY (formation digitale islamique éthique AL BARAKA).

PHILOSOPHIE PÉDAGOGIQUE :
- Ton brutal et compétent — l'offre est le levier n°1 du business
- Pas de complaisance : si l'offre est faible, le dire frontalement avec score réel
- Spécificité = crédibilité. "Aider les gens à gagner plus" est nul. "Aider les cake designers passionnées à signer leur premier wedding cake à 600€+ en 90 jours" est juste
- Cadre halal : pas de manipulation, pas d'urgence factice, pas de garantie magique

ÉLÉMENTS DE L'ANATOMIE D'UNE OFFRE :
1. PROMESSE : Transformation claire avec résultat + délai + cible précise (SMDC : Spécifique, Mesurable, Délai, Cible)
2. MÉCANISME UNIQUE : Méthode nommée (™ optionnel) + 3-4 étapes actionnables différenciantes
3. VÉHICULE : Format de livraison (programme vidéo / cohorte / coaching / DWY / hybride)
4. BONUS STRATÉGIQUES : 2-3 bonus qui lèvent une objection clé chacun (nom + valeur + raison)
5. GARANTIE : Inverse le risque (remboursement / continuité / payé au résultat / satisfaction)
6. URGENCE ÉTHIQUE : Justifiée par une vraie contrainte (capacité, fenêtre temporelle, etc.) — JAMAIS un trick
7. PRIX : Ancré par la valeur perçue (formule Hormozi : Résultat × Probabilité / (Délai × Effort))

FORMAT DE RÉPONSE STRICT (JSON valide uniquement, sans markdown) :
{
  "score": 0-100 (entier, threshold validation = 80),
  "verdict": "Phrase courte de verdict ('✓ Validé' ou '⚠️ À retravailler')",
  "weak": "Point faible identifié en 1-2 phrases (si score < 80)",
  "action_concrete": "Action concrète à mener pour améliorer (si score < 80)",
  "propositions": [
    { "text": "Suggestion concrète d'amélioration", "cible_etape": "Section concernée" }
  ]
}`;

function buildContextHeader(state: M3State): string {
  const avatar = pickAvatarName(state);
  const niche = pickNiche(state);
  const market = pickMarketLabel(state.market_type);
  const douleur = state.m1_data?.sous_niche_2?.douleur || "—";
  const promesse_m2 = state.m2_data?.data?.step8?.positionnement || "—";
  return `CONTEXTE :
- Avatar : ${avatar}
- Niche : ${niche}
- Type de marché : ${market}
- Douleur principale (M1) : ${douleur}
- Positionnement (M2) : ${promesse_m2}

`;
}

export type M3EvalKind =
  | "promesse" | "mecanisme" | "bonus" | "garantie" | "urgence" | "prix";

export async function evaluatePromesse(state: M3State): Promise<AIFeedback & { score: number }> {
  const sys = SYSTEM_BASE + `

TÂCHE : Évalue la PROMESSE de transformation de l'offre.
Critères SMDC :
- Spécifique : qui (cible précise) + quoi (transformation claire)
- Mesurable : résultat chiffrable ou observable
- Délai : durée annoncée explicitement (X jours / X semaines)
- Cible : qualifiée précisément (pas "les gens")

EXEMPLES :
- ❌ Faible : "Aider les gens à mieux vendre"
- ✅ Solide : "Aider les cake designers passionnées à signer leur premier wedding cake à 600€+ en 90 jours, sans CAP ni atelier loué"`;
  const user = buildContextHeader(state) + `PROMESSE DE L'ÉLÈVE :\n${state.promesse.text || "(vide)"}`;
  return await callAndParse(sys, user);
}

export async function evaluateMecanisme(state: M3State): Promise<AIFeedback & { score: number }> {
  const sys = SYSTEM_BASE + `

TÂCHE : Évalue le MÉCANISME UNIQUE (nom propriétaire + 3 étapes).
Critères :
- Nom propriétaire fort (avec ™ ou nom mémorable, ex : "Méthode Wedding-Premium™")
- 3 étapes actionnables, séquentielles, claires
- Chaque étape doit avoir un livrable identifiable
- Différenciant : on doit comprendre pourquoi cette méthode est unique`;
  const user = buildContextHeader(state) + `MÉCANISME DE L'ÉLÈVE :
Nom : ${state.mecanisme.nom || "(vide)"}
Étapes :
${state.mecanisme.etapes.map((e, i) => `  ${i + 1}. ${e || "(vide)"}`).join("\n")}`;
  return await callAndParse(sys, user);
}

export async function evaluateBonus(state: M3State): Promise<AIFeedback & { score: number }> {
  const sys = SYSTEM_BASE + `

TÂCHE : Évalue les BONUS STRATÉGIQUES (2-3 items minimum).
Critères pour chaque bonus :
- Nom concret (pas "Module supplémentaire")
- Valeur chiffrée (€) — perçue forte
- Raison stratégique : quelle objection ce bonus lève ? quel résultat il accélère ?

Bonus faible : "Bonus PDF de conseils en plus"
Bonus solide : "Pack Photos Pro · 30 fonds + scripts d'éclairage smartphone (297€) — permet de produire des photos qui justifient un prix premium dès la semaine 2"`;
  const user = buildContextHeader(state) + `BONUS DE L'ÉLÈVE :
${state.bonus.items.map((b, i) => `[Bonus ${i + 1}]\n  Nom : ${b.nom || "(vide)"}\n  Valeur : ${b.valeur || "(vide)"}\n  Raison : ${b.raison || "(vide)"}`).join("\n\n")}`;
  return await callAndParse(sys, user);
}

export async function evaluateGarantie(state: M3State): Promise<AIFeedback & { score: number }> {
  const sys = SYSTEM_BASE + `

TÂCHE : Évalue la GARANTIE qui inverse le risque.
Critères :
- Type clair (remboursement / continuité / payé au résultat / satisfaction)
- Formulation précise avec conditions explicites
- Délai annoncé
- Pas magique (pas "résultats garantis sans effort")
- Réaliste pour l'offre

Garantie faible : "Satisfait ou remboursé"
Garantie solide : "Si après avoir suivi les 8 modules ET soumis tes 3 portfolio, tu n'as pas signé ta 1ère commande à 400€+ dans les 90 jours, je continue gratuitement 60 jours."`;
  const user = buildContextHeader(state) + `GARANTIE DE L'ÉLÈVE :
Type : ${state.garantie.type || "(vide)"}
Formulation : ${state.garantie.formulation || "(vide)"}`;
  return await callAndParse(sys, user);
}

export async function evaluateUrgence(state: M3State): Promise<AIFeedback & { score: number }> {
  const sys = SYSTEM_BASE + `

TÂCHE : Évalue l'URGENCE / RARETÉ.
Critères :
- Éthique : justifiée par une VRAIE contrainte (capacité, fenêtre temporelle)
- Pas un trick (pas "compte à rebours fake")
- Type clair (cohorte limitée / bonus expirant / prix qui monte / fenêtre temporelle)
- Capacité chiffrée (ex : 12 places, 4 sessions/an)

Urgence faible : "Offre limitée dans le temps"
Urgence solide : "12 places dans la cohorte parce que je ne peux accompagner sérieusement plus de 12 cake designers en 1-to-1. Prochaine cohorte en janvier."`;
  const user = buildContextHeader(state) + `URGENCE DE L'ÉLÈVE :
Type : ${state.urgence.type || "(vide)"}
Justification : ${state.urgence.justification || "(vide)"}`;
  return await callAndParse(sys, user);
}

// ─── Diagnostic Prix : spécial avec calcul des 4 leviers Hormozi ────────────
export interface PrixDiagnostic {
  score: number;
  verdict: string;
  weak?: string;
  action_concrete?: string;
  propositions?: Array<{ text: string; cible_etape: string }>;
  leviers: {
    resultat: { score: number; justification: string };
    probabilite: { score: number; justification: string };
    delai: { score: number; justification: string };
    effort: { score: number; justification: string };
  };
  levier_faible: string;
  alignements: { format: boolean; cible: boolean; ancrage: boolean };
}

export async function diagnosticPrix(state: M3State): Promise<PrixDiagnostic> {
  const sys = SYSTEM_BASE + `

TÂCHE : Diagnostic PRIX selon la formule Hormozi.
La VALEUR PERÇUE = (Résultat × Probabilité) / (Délai × Effort)

Évalue les 4 leviers (chacun sur 100), identifie le levier le plus faible, et donne des actions concrètes pour le renforcer.

Aussi vérifie l'alignement :
- format : le véhicule correspond-il au prix ? (un programme vidéo à 1500€ = difficile à justifier)
- cible : la cible peut-elle payer ce prix ? (solvabilité documentée en M1)
- ancrage : le prix est-il ancré par rapport aux concurrents identifiés en M1 ?

FORMAT DE RÉPONSE JSON STRICT :
{
  "score": 0-100,
  "verdict": "✓ Positionnement validé · Score X/100 · [résumé]",
  "weak": "Le levier le plus faible est X (score/100). [Pourquoi]",
  "action_concrete": "Action concrète à mener pour renforcer ce levier.",
  "propositions": [
    { "text": "Suggestion concrète", "cible_etape": "Bonus|Véhicule|Mécanisme|Garantie" }
  ],
  "leviers": {
    "resultat":    { "score": 0-100, "justification": "..." },
    "probabilite": { "score": 0-100, "justification": "..." },
    "delai":       { "score": 0-100, "justification": "..." },
    "effort":      { "score": 0-100, "justification": "..." }
  },
  "levier_faible": "resultat|probabilite|delai|effort",
  "alignements": { "format": true|false, "cible": true|false, "ancrage": true|false }
}`;

  const user = buildContextHeader(state) + `OFFRE COMPLÈTE :
PROMESSE : ${state.promesse.text || "(vide)"}
MÉCANISME : ${state.mecanisme.nom || "(vide)"} (étapes : ${state.mecanisme.etapes.filter(Boolean).join(" / ") || "(vide)"})
VÉHICULE : ${state.vehicule.format || "(vide)"} — ${state.vehicule.justification || "(vide)"}
BONUS : ${state.bonus.items.map((b) => `${b.nom || "(vide)"} (${b.valeur || "(vide)"})`).join(" + ")}
GARANTIE : ${state.garantie.type || "(vide)"} — ${state.garantie.formulation || "(vide)"}
URGENCE : ${state.urgence.type || "(vide)"} — ${state.urgence.justification || "(vide)"}

PRIX PROPOSÉ : ${state.prix.montant || "(vide)"} €

Diagnostic Hormozi complet.`;

  try {
    const raw = await callClaude("m3", { system: sys, user, max_tokens: 2500 });
    const parsed = parseClaudeJSON<PrixDiagnostic>(raw);
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 50))),
      verdict: parsed.verdict || "Diagnostic effectué.",
      weak: parsed.weak,
      action_concrete: parsed.action_concrete,
      propositions: parsed.propositions ?? [],
      leviers: parsed.leviers ?? {
        resultat: { score: 50, justification: "" },
        probabilite: { score: 50, justification: "" },
        delai: { score: 50, justification: "" },
        effort: { score: 50, justification: "" },
      },
      levier_faible: parsed.levier_faible || "effort",
      alignements: parsed.alignements ?? { format: false, cible: false, ancrage: false },
    };
  } catch (e) {
    console.error("[M3 diagnosticPrix]", e);
    // Fallback minimal
    return {
      score: 50,
      verdict: "Diagnostic indisponible — IA hors-ligne. Mode dégradé.",
      leviers: {
        resultat: { score: 50, justification: "Évaluation IA indisponible" },
        probabilite: { score: 50, justification: "Évaluation IA indisponible" },
        delai: { score: 50, justification: "Évaluation IA indisponible" },
        effort: { score: 50, justification: "Évaluation IA indisponible" },
      },
      levier_faible: "effort",
      alignements: { format: false, cible: false, ancrage: false },
    };
  }
}

async function callAndParse(sys: string, user: string): Promise<AIFeedback & { score: number }> {
  try {
    const raw = await callClaude("m3", { system: sys, user, max_tokens: 2000 });
    const parsed = parseClaudeJSON<AIFeedback & { score: number }>(raw);
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 50))),
      verdict: parsed.verdict ?? "Évaluation effectuée.",
      weak: parsed.weak,
      action_concrete: parsed.action_concrete,
      propositions: Array.isArray(parsed.propositions) ? parsed.propositions.slice(0, 5) : [],
    };
  } catch (e) {
    console.error("[M3 evaluator]", e);
    return {
      score: 50,
      verdict: "Évaluation IA indisponible — mode dégradé.",
      propositions: [],
    };
  }
}
