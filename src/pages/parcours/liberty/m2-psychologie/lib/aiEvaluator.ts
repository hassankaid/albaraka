/**
 * Évaluateur IA pour les 8 étapes du M2 PSYCHOLOGIE.
 *
 * Stratégie : appelle Claude via `liberty-claude-proxy` avec un system prompt
 * pédagogique calqué sur Sidali, et demande à Claude de retourner un JSON :
 *   { score: 0-100, fb: "feedback textuel", suggs: [{target, tip}, ...] }
 *
 * En cas d'erreur API, fallback sur une éval locale simple (longueur > X).
 */

import { callClaude, parseClaudeJSON } from "../../m1-niche/lib/claudeClient";
import type { AIFeedback, M2State, StepKey } from "./types";

const SYSTEM_BASE = `Tu es l'évaluateur pédagogique du Module 2 — PSYCHOLOGIE DE L'ACHETEUR du programme LIBERTY (AL BARAKA EthicArena).

PHILOSOPHIE :
- Brutal et compétent. Pas flatteur, pas mignon.
- Spécificité = crédibilité. Une douleur "elle veut plus de revenus" est nulle. "Le dimanche soir, en regardant son compte en banque, elle se rend compte qu'elle ne pourra pas payer la facture d'électricité" est juste.
- Le rôle de l'IA : pousser l'élève à descendre dans le quotidien : moments, lieux, dialogues intérieurs, chiffres.

FORMAT DE RÉPONSE STRICT (JSON valide uniquement, sans markdown) :
{
  "score": 0-100 (entier),
  "fb": "Feedback global en 1-2 phrases franches, sans flagornerie.",
  "suggs": [
    { "target": "Douleur 1", "tip": "Suggestion concrète sur quoi améliorer pour cet item précis." }
  ]
}

Le tableau "suggs" liste UNIQUEMENT les items qui doivent être améliorés (score < 60). Maximum 5 suggestions.`;

interface StepContext {
  step: StepKey;
  state: M2State;
}

function buildUserPrompt(ctx: StepContext): { task: string; payload: string } {
  const { step, state } = ctx;
  const avatarName = state.m1?.avatar?.name || "l'avatar";
  const niche = state.m1?.niche?.sub_niche || "la niche";
  const market = state.m1?.market || "marché inconnu";
  const promise = state.m1?.promise?.statement || "—";

  const contextHeader = `CONTEXTE MODULE 1 (auto-importé) :
- Avatar : ${avatarName}
- Niche : ${niche}
- Marché : ${market}
- Promesse : ${promise}

`;

  switch (step) {
    case "step1": {
      const task = `TÂCHE : Évalue la cartographie des 5 douleurs présentes.
Critères : chaque douleur doit avoir une scène concrète (moment précis, lieu, dialogue intérieur, chiffres). 5 douleurs renseignées = ressource pour un copywriter. Moins de 3 = score ≤ 40. Phrases molles ("manque de clients", "veut plus de revenus") = score réduit.`;
      const payload =
        contextHeader +
        "5 DOULEURS de " +
        avatarName +
        " :\n" +
        state.data.step1.pains
          .map(
            (p, i) =>
              `\n[Douleur ${i + 1}]\nTexte : ${p.text || "(vide)"}\nScène : ${p.scene || "(vide)"}`,
          )
          .join("\n");
      return { task, payload };
    }
    case "step2": {
      const task = `TÂCHE : Évalue la cartographie des 5 désirs futurs + l'identité aspirationnelle.
Critères : chaque désir doit être une scène sensorielle (pas un objectif chiffré "plus de revenus"). L'identité aspirationnelle doit décrire qui devient ${avatarName} (transformation de statut social, pas un titre LinkedIn).`;
      const payload =
        contextHeader +
        "5 DÉSIRS de " +
        avatarName +
        " :\n" +
        state.data.step2.desires
          .map(
            (d, i) =>
              `\n[Désir ${i + 1}]\nTexte : ${d.text || "(vide)"}\nScène : ${d.scene || "(vide)"}`,
          )
          .join("\n") +
        "\n\nIDENTITÉ ASPIRATIONNELLE :\n" +
        (state.data.step2.identity || "(vide)");
      return { task, payload };
    }
    case "step3": {
      const task = `TÂCHE : Évalue les 3 preuves sociales (type + qui + pourquoi ça parle à ${avatarName}).
Critères : pas de témoignages génériques. Le "qui" doit décrire un jumeau de ${avatarName} (même âge, même situation, même point de départ). Le "pourquoi" doit expliquer la résonance psychologique précise.`;
      const payload =
        contextHeader +
        "3 PREUVES SOCIALES :\n" +
        state.data.step3.proofs
          .map(
            (p, i) =>
              `\n[Preuve ${i + 1}]\nType : ${p.type || "(vide)"}\nQui : ${p.who || "(vide)"}\nPourquoi ça parle : ${p.why || "(vide)"}`,
          )
          .join("\n");
      return { task, payload };
    }
    case "step4": {
      const task = `TÂCHE : Évalue les 3 leviers de persuasion (Rareté + Réciprocité + Engagement).
Critères : l'angle doit être CONCRET (pas "offre limitée" générique). La justification doit prouver que le levier est crédible (pas un marketing trick artificiel). Cohérence avec ${avatarName} et son marché.`;
      const payload =
        contextHeader +
        "3 LEVIERS :\n" +
        `\n[Rareté]\nAngle : ${state.data.step4.rarete.angle || "(vide)"}\nJustif : ${state.data.step4.rarete.justif || "(vide)"}\n` +
        `\n[Réciprocité]\nAngle : ${state.data.step4.reciprocite.angle || "(vide)"}\nJustif : ${state.data.step4.reciprocite.justif || "(vide)"}\n` +
        `\n[Engagement]\nAngle : ${state.data.step4.engagement.angle || "(vide)"}\nJustif : ${state.data.step4.engagement.justif || "(vide)"}`;
      return { task, payload };
    }
    case "step5": {
      const task = `TÂCHE : Évalue le top 3 biais cognitifs sélectionnés pour ${avatarName}.
Critères : pour chaque biais, l'élève doit nommer le biais (aversion_perte / confirmation / ikea / autorité / preuve_sociale / urgence / ancrage / réciprocité…), expliquer pourquoi il est DOMINANT chez cet avatar, et comment l'ACTIVER concrètement dans le copy.`;
      const payload =
        contextHeader +
        "TOP 3 BIAIS :\n" +
        state.data.step5.top3
          .map(
            (b, i) =>
              `\n[Biais ${i + 1}]\nNom du biais : ${b.bias || "(vide)"}\nPourquoi dominant : ${b.why_dominant || "(vide)"}\nComment activer : ${b.how_activate || "(vide)"}`,
          )
          .join("\n");
      return { task, payload };
    }
    case "step6": {
      const task = `TÂCHE : Évalue le diagnostic de phase du parcours d'achat où se trouve ${avatarName}.
Critères : la phase choisie (Inconscience / Prise de conscience / Considération / Décision) doit être justifiée par des comportements observables. Les actions proposées doivent matcher la phase.`;
      const payload =
        contextHeader +
        "PHASE DU PARCOURS :\n" +
        `Phase choisie : ${state.data.step6.phase || "(non choisie)"}\n` +
        `Justification : ${state.data.step6.justif || "(vide)"}\n` +
        `Actions concrètes : ${state.data.step6.actions || "(vide)"}`;
      return { task, payload };
    }
    case "step7": {
      const task = `TÂCHE : Évalue le vocabulaire collecté pour parler à ${avatarName}.
Critères : 5 listes (douleur_mots, desir_mots, positifs, negatifs, formulations). Les mots doivent être ceux que ${avatarName} EMPLOIE ou qui résonnent dans son monde. Pas de jargon copywriting. Min 3 entrées par liste pour un score correct.`;
      const v = state.data.step7.vocab;
      const payload =
        contextHeader +
        "VOCAB :\n" +
        `Douleur mots : ${v.douleur_mots.join(" · ") || "(vide)"}\n` +
        `Désir mots : ${v.desir_mots.join(" · ") || "(vide)"}\n` +
        `Positifs : ${v.positifs.join(" · ") || "(vide)"}\n` +
        `Négatifs (à BANNIR) : ${v.negatifs.join(" · ") || "(vide)"}\n` +
        `Formulations : ${v.formulations.join(" / ") || "(vide)"}`;
      return { task, payload };
    }
    case "step8": {
      const task = `TÂCHE : Évalue le brief stratégique final qui synthétise les 7 étapes précédentes.
Critères : positionnement clair, hook qui accroche en 1 phrase, levier secondaire cohérent, biais-killer identifié, phase strategy actionnable, directives copywriting opérationnelles. C'est le livrable que ${avatarName} verra dans le copy de M3.`;
      const s = state.data.step8;
      const payload =
        contextHeader +
        "BRIEF STRATÉGIQUE :\n" +
        `Positionnement : ${s.positionnement || "(vide)"}\n` +
        `Hook principal : ${s.hook_principal || "(vide)"}\n` +
        `Levier secondaire : ${s.levier_secondaire || "(vide)"}\n` +
        `Biais-killer : ${s.biais_killer || "(vide)"}\n` +
        `Phase strategy : ${s.phase_strategy || "(vide)"}\n` +
        `Directives copywriting : ${s.directives_copywriting || "(vide)"}`;
      return { task, payload };
    }
  }
}

export async function evaluateStep(
  step: StepKey,
  state: M2State,
): Promise<AIFeedback> {
  const ctx: StepContext = { step, state };
  const { task, payload } = buildUserPrompt(ctx);
  const sys = SYSTEM_BASE + "\n\n" + task;

  try {
    const raw = await callClaude("m2", { system: sys, user: payload, max_tokens: 2000 });
    const parsed = parseClaudeJSON<AIFeedback>(raw);
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 50))),
      fb: parsed.fb || "Évaluation effectuée.",
      suggs: Array.isArray(parsed.suggs) ? parsed.suggs.slice(0, 5) : [],
    };
  } catch (e) {
    console.error("[M2 aiEvaluator]", e);
    // Fallback heuristique simple
    return fallbackScore(step, state);
  }
}

/** Fallback local minimal en cas d'erreur API (longueur + nombre d'items remplis). */
function fallbackScore(step: StepKey, state: M2State): AIFeedback {
  const d = state.data;
  let score = 40;
  if (step === "step1") {
    const filled = d.step1.pains.filter((p) => p.text.trim().length > 0).length;
    score = Math.min(100, filled * 15 + d.step1.pains.reduce((a, p) => a + (p.scene.length > 30 ? 5 : 0), 0));
  } else if (step === "step2") {
    const filled = d.step2.desires.filter((p) => p.text.trim().length > 0).length;
    const hasId = d.step2.identity.length > 30 ? 15 : 0;
    score = Math.min(100, filled * 15 + hasId);
  } else if (step === "step3") {
    const filled = d.step3.proofs.filter((p) => p.who.trim().length > 5).length;
    score = Math.min(100, filled * 30);
  } else if (step === "step4") {
    const v = d.step4;
    const ok = [v.rarete, v.reciprocite, v.engagement].filter(
      (x) => x.angle.length > 10 && x.justif.length > 10,
    ).length;
    score = Math.min(100, ok * 30);
  } else if (step === "step5") {
    const filled = d.step5.top3.filter((b) => b.bias.trim().length > 0).length;
    score = Math.min(100, filled * 30);
  } else if (step === "step6") {
    score = d.step6.phase && d.step6.justif.length > 30 && d.step6.actions.length > 30 ? 75 : 35;
  } else if (step === "step7") {
    const v = d.step7.vocab;
    const filled = [v.douleur_mots, v.desir_mots, v.positifs, v.negatifs, v.formulations]
      .filter((arr) => arr.length >= 3).length;
    score = Math.min(100, filled * 20);
  } else if (step === "step8") {
    const s = d.step8;
    const ok = [s.positionnement, s.hook_principal, s.levier_secondaire, s.biais_killer, s.phase_strategy, s.directives_copywriting].filter((x) => x.trim().length > 15).length;
    score = Math.min(100, ok * 16);
  }
  return {
    score,
    fb: "Évaluation locale (mode dégradé — IA indisponible). Continue à enrichir tes réponses.",
    suggs: [],
  };
}
