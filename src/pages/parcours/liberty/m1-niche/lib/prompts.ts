/**
 * Prompts Claude pour l'outil M1 NICHE.
 * Repris fidèlement du HTML standalone V2 (13/05/2026) Sidali.
 */

import type { M1State, AIProposition, StressVerdictData } from "./types";
import { callClaude, parseClaudeJSON } from "./claudeClient";

export const SYSTEM_BASE = `Tu es l'IA pédagogique du Module 1 NICHE du programme LIBERTY (formation digitale islamique éthique AL BARAKA).

PHILOSOPHIE PÉDAGOGIQUE :
- "Tu es le produit" — la réponse est dans l'élève, pas dans l'outil
- Ton brutal et compétent, jamais mignon ni flatteur
- Pas de jargon copywriting bullshit, pas de "transformation extraordinaire"
- Spécificité = crédibilité. "Maman" est nul. "Maman 32-42 ans, 2 enfants 3-7 ans, RP, en burn-out parental" est juste

OBJECTIF FINAL DU M1 :
L'élève doit ressortir avec une SOUS-NICHE 2.0 — le summum de la spécialisation.
Exemples canoniques du cours :
- "Perte de poids pour obèses de + 30 ans intolérants au gluten"
- "Prise de muscle pour skinny de 1,85m jouant au basket"
- "Négociation salariale pour développeurs senior 50-65K en startup tech parisienne"

LES 4 COMPOSANTES OBLIGATOIRES D'UN BON MARCHÉ :
1. DOULEUR urgente, reconnue, douloureuse
2. POUVOIR D'ACHAT (les gens ont de l'argent)
3. FACILE À CONTACTER (réseaux sociaux, ads)
4. CROISSANCE du marché 10%+/an

NICHE = Passion × Compétences × Demande du marché.

CADRE ÉTHIQUE :
- Pas de pseudo-spiritualité de coach, pas de promesses surréalistes
- Réponses concrètes, structurées, sans flagornerie
- Si l'élève rationalise un fantasme, le lui dire frontalement`;

// ─── 1A · Propose 3 sous-niches (Branche A) ─────────────────────────────────
export async function aiPropose3SousNiches(state: M1State): Promise<AIProposition[]> {
  const sys =
    SYSTEM_BASE +
    `

TÂCHE : À partir du Bilan + Brainstorm de l'élève, propose 3 SOUS-NICHES 2.0 distinctes à l'intersection (Passion × Compétences × Demande × Vécu).

FORMAT DE RÉPONSE STRICT (JSON valide uniquement, sans markdown) :
{
  "propositions": [
    {
      "titre": "Phrase courte type cours (ex: 'Perte de poids pour obèses + 30 ans intolérants au gluten')",
      "cible": "À qui ça parle PRÉCISÉMENT (15-25 mots avec âge, situation, géo)",
      "douleur": "Quelle douleur urgente ça résout (concrète, fréquente, émotionnelle)",
      "pouvoir_achat": "Pourquoi ces personnes peuvent payer 1000€+ (preuve concrète)",
      "alignement": "Pourquoi l'archétype + le vécu de l'élève collent à cette niche"
    },
    { ... },
    { ... }
  ]
}

Les 3 propositions doivent être DIFFÉRENTES (pas 3 variantes de la même niche). Chacune doit pouvoir tenir 90 jours d'engagement.`;

  const user = `BILAN :
- Archétype : ${state.bilan.archetype?.label ?? "inconnu"}
- Marché core : ${state.bilan.marche?.label ?? "inconnu"}
- Sous-segment : ${state.bilan.marche?.sous_segment ?? "—"}
- Vécu transformateur : ${state.bilan.vecu || "—"}
- Compétence centrale : ${state.bilan.competence || "—"}

BRAINSTORM :
- 5 niches/passions : ${state.brainstorm.niches.filter((n) => n).join(" / ") || "—"}
- 5 compétences : ${state.brainstorm.competences.filter((c) => c).join(" / ") || "—"}
- Vécu détaillé : ${state.brainstorm.vecu_long || "—"}

Propose 3 sous-niches 2.0 candidates.`;

  const raw = await callClaude("m1", { system: sys, user, max_tokens: 2500 });
  const parsed = parseClaudeJSON<{ propositions: AIProposition[] }>(raw);
  return parsed.propositions ?? [];
}

// ─── 1B · Stress test (Branche B) ───────────────────────────────────────────
export async function aiStressTest(state: M1State): Promise<StressVerdictData> {
  const sys =
    SYSTEM_BASE +
    `

TÂCHE : Tu es le miroir brutal de l'élève. Il prétend savoir ce qu'il veut vendre. Vérifie si c'est solide ou si c'est un fantasme rationalisé.

CRITÈRES :
- Vit-il déjà de cette compétence (ou en a-t-il vécu une transformation personnelle) ? Si non → fragile.
- Peut-il citer 3 personnes précises (pas "des gens") qui paieraient 1000€+ ? Si non → fragile.
- Sa motivation = vécu authentique OU fuite/projection ? Si fuite → fragile.

FORMAT DE RÉPONSE STRICT (JSON valide uniquement, sans markdown) :
{
  "verdict": "solide" ou "fragile",
  "titre": "Phrase verdict courte (ex: 'Tu as la matière' ou 'Tu rationalises un fantasme')",
  "diagnostic": "Analyse en 2-3 phrases franches, sans flagornerie. Pointer concrètement les forces ou les manques.",
  "next_action": "Phrase qui dit quoi faire ensuite (continuer vers cristallisation OU revenir au Bilan)"
}`;

  const user = `IDÉE DE L'ÉLÈVE :
- En 1 phrase : ${state.capture.idee || "—"}
- Vécu / expérience sur ce sujet : ${state.capture.vecu || "—"}
- Pourquoi cette niche spécifiquement : ${state.capture.pourquoi || "—"}

RÉPONSES AU STRESS-TEST :
- Q1 (Vit-il de cette compétence ?) : ${state.stress_test.lives_from_skill || "—"}
- Q2 (3 personnes précises payant 1000€+) : ${state.stress_test.three_people || "—"}
- Q3 (Preuve de revenu / résultat sur cette compétence) : ${state.stress_test.revenue_proof || "—"}

Verdict ?`;

  const raw = await callClaude("m1", { system: sys, user });
  return parseClaudeJSON<StressVerdictData>(raw);
}

// ─── 2 · Cristallisation Sous-Niche 2.0 ─────────────────────────────────────
export interface CrystalResult {
  phrase_finale: string;
  cible_precise: string;
  douleur_concrete: string;
  pouvoir_achat_preuve: string;
  contact_canaux?: string;
  croissance_marche?: string;
  methode_propre: string;
}

export async function aiCrystallize(state: M1State): Promise<CrystalResult> {
  const sys =
    SYSTEM_BASE +
    `

TÂCHE : Cristallise la SOUS-NICHE 2.0 finale en formulation type cours.

Format ATTENDU pour la phrase finale :
"[Méthode/transformation] pour [cible ultra-précise avec spécificité 2.0]"

Exemples :
- "Perte de poids pour obèses + 30 ans intolérants au gluten"
- "Cohérence cardiaque + EMDR pour avocates 35-50 ans en cabinet parisien"

FORMAT DE RÉPONSE STRICT (JSON valide uniquement, sans markdown) :
{
  "phrase_finale": "Phrase type cours, 8-15 mots max",
  "cible_precise": "Cible décortiquée en 15-25 mots (âge + sexe + situation pro + géo + spécificité)",
  "douleur_concrete": "Douleur en 15-25 mots, concrète, émotionnelle, fréquente",
  "pouvoir_achat_preuve": "Preuve qu'ils payent 1000€+ (concurrents existants ou autre)",
  "contact_canaux": "Où sont-ils ? Canaux concrets pour les toucher (Instagram, TikTok, LinkedIn, ads, groupes Facebook…)",
  "croissance_marche": "Le marché croît-il ≥10%/an ? Preuves chiffrées ou signaux de tendance documentés",
  "methode_propre": "Méthode propriétaire en 5-8 mots avec un nom (™ optionnel)"
}`;

  let context = "";
  if (state.branch === "A" && state.selected_proposition !== null) {
    const prop = state.ai_propositions[state.selected_proposition];
    context = `BRANCHE A — Proposition sélectionnée :
- Titre : ${prop.titre}
- Cible : ${prop.cible}
- Douleur : ${prop.douleur}
- Pouvoir d'achat : ${prop.pouvoir_achat}
Archétype : ${state.bilan.archetype?.label ?? "—"}`;
  } else if (state.branch === "B") {
    context = `BRANCHE B — Idée brute :
- En 1 phrase : ${state.capture.idee}
- Vécu : ${state.capture.vecu}
- Pourquoi : ${state.capture.pourquoi}
- Verdict stress-test : ${state.stress_test.verdict}`;
  }

  if (
    state.sous_niche_2.cible ||
    state.sous_niche_2.douleur ||
    state.sous_niche_2.methode
  ) {
    context += `\n\nÉLÈVE A DÉJÀ BRICOLÉ :
- Cible : ${state.sous_niche_2.cible || "—"}
- Douleur : ${state.sous_niche_2.douleur || "—"}
- Méthode : ${state.sous_niche_2.methode || "—"}`;
  }

  const user = context + "\n\nCristallise.";
  const raw = await callClaude("m1", { system: sys, user });
  return parseClaudeJSON<CrystalResult>(raw);
}

// ─── 3 · Avatar (socio + psycho) ────────────────────────────────────────────
export interface AvatarResult {
  socio: {
    sexe: string; nom: string; age: string; lieu: string;
    revenu: string; compagnon: string; relations: string; situation: string;
  };
  psycho: {
    probleme: string; objectifs: string; consequences: string;
    passe: string; sentiment: string; paradis: string; phrase_avatar: string;
  };
}

export async function aiSuggestAvatar(state: M1State): Promise<AvatarResult> {
  const sys =
    SYSTEM_BASE +
    `

TÂCHE : Propose un avatar client précis et incarné pour la sous-niche cristallisée.

FORMAT DE RÉPONSE STRICT (JSON valide uniquement, sans markdown) :
{
  "socio": {
    "sexe": "...", "nom": "Prénom + initiale (ex: Sophie M.)",
    "age": "...", "lieu": "Ville + arrondissement/quartier",
    "revenu": "Revenu annuel ou mensuel précis",
    "compagnon": "Statut relationnel précis",
    "relations": "Description courte des relations proches",
    "situation": "Situation familiale (enfants, etc.)"
  },
  "psycho": {
    "probleme": "Problème principal en 15-25 mots",
    "objectifs": "Objectifs concrets sur 12 mois",
    "consequences": "Conséquences si problème non résolu",
    "passe": "Ce qu'elle/il a essayé sans succès",
    "sentiment": "Comment elle/il se sent au quotidien",
    "paradis": "Sa situation de rêve si problème résolu",
    "phrase_avatar": "Avatar en 1 phrase précise"
  }
}

L'avatar doit être CRÉDIBLE et SPÉCIFIQUE — un personnage incarné, pas une moyenne statistique.`;

  const user = `SOUS-NICHE 2.0 :
- Phrase finale : ${state.sous_niche_2.phrase || "—"}
- Cible précise : ${state.sous_niche_2.cible || "—"}
- Douleur : ${state.sous_niche_2.douleur || "—"}
- Pouvoir d'achat : ${state.sous_niche_2.pouvoir_achat || "—"}
- Facile à contacter : ${state.sous_niche_2.contact || "—"}
- Croissance du marché : ${state.sous_niche_2.croissance || "—"}
- Méthode : ${state.sous_niche_2.methode || "—"}

Propose un avatar incarné.`;

  const raw = await callClaude("m1", { system: sys, user });
  return parseClaudeJSON<AvatarResult>(raw);
}
