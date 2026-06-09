/**
 * M16 — Génération IA via le proxy Liberty (liberty-claude-proxy).
 * Construit le prompt système + utilisateur (verbatim) et parse le JSON [{heading,body}].
 */
import { callClaude, parseClaudeJSON } from "../../m1-niche/lib/claudeClient";
import { type M16State, type Section, AI_MAX_TOKENS } from "./types";
import { ctx } from "./validations";

export function buildMessages(state: M16State): { system: string; user: string } {
  const c = ctx(state);
  const structure = state.data.format_choisi === "ebook"
    ? "un ebook / guide premium structuré en 7 sections : Introduction (ce que le lecteur va obtenir), Chapitre 1 (pourquoi il est resté bloqué — le vrai problème), Chapitre 2 (la méthode en 3 étapes), Chapitre 3 (le plan d'action pour le premier résultat), Chapitre 4 (les 3 erreurs à éviter), Chapitre 5 (un cas concret + FAQ d'objections), Conclusion (avec un pont vers l'offre principale)."
    : "un mini-cours vidéo (kit de tournage) en 6 sections : Plan du mini-cours, Script L1 (accroche + vrai problème), Script L2 (la méthode en 3 étapes), Script L3 (le quick win fait en direct), Script L4 (conclusion + pont vers l'offre principale), Conseils de tournage. Les scripts doivent contenir ce que l'auteur dit face caméra.";
  const halal = c.halal ? " L'auteur s'inscrit dans une démarche éthique musulmane : reste alignable avec les valeurs halal (pas de riba, ton respectueux), sans en faire trop." : "";
  const system = "Tu es un expert en création d'offres digitales et en conception pédagogique pour le marché francophone." + halal +
    " Tu écris en français, au tutoiement, ton direct, concret et compétent, en prose dense (pas de listes décoratives, pas de jargon technique). Tu produis du contenu de produit prêt à être vendu.";
  const user = "Rédige le contenu complet de " + structure + "\n\n" +
    "CONTEXTE DE L'AUTEUR :\n" +
    "- Niche : " + (c.niche || "(non précisée)") + "\n" +
    "- Client cible : " + (c.avatar || "(non précisé)") + "\n" +
    "- Douleur principale du client : " + (c.dominant_pain || "(non précisée)") + "\n" +
    "- Situation de départ : " + (c.point_a || "(non précisée)") + "\n" +
    "- Résultat visé (premier pas) : " + (c.point_b || "(non précisé)") + "\n" +
    "- Nom de la méthode : " + (c.mecanisme || "(non précisé)") + "\n" +
    "- Titre du produit : " + (state.data.titre || "(non précisé)") + "\n" +
    "- Promesse : " + (state.data.promesse_lt || "(non précisée)") + "\n" +
    "- Offre principale (vers laquelle orienter à la fin) : " + (c.programme_mt || "(non précisée)") + "\n\n" +
    "RÈGLES :\n" +
    "- Produis un premier jet réellement spécifique à la niche, utilisable presque tel quel.\n" +
    "- Quand un détail dépend de la méthode personnelle ou des chiffres réels de l'auteur que tu ne peux pas connaître, insère un marqueur « à compléter : ... » plutôt que d'inventer un fait précis.\n" +
    "- Le résultat doit être un premier pas partiel (pas toute la transformation), qui donne envie de l'offre principale.\n" +
    "- Réponds UNIQUEMENT avec un tableau JSON valide, sans aucun texte autour ni balises Markdown, au format : [{\"heading\":\"Titre de section\",\"body\":\"Contenu avec des sauts de ligne en \\n\"}].";
  return { system, user };
}

/** Appelle Claude via le proxy et renvoie les sections normalisées. Lève en cas d'échec. */
export async function generateWithAI(state: M16State): Promise<Section[]> {
  const { system, user } = buildMessages(state);
  const raw = await callClaude("m16", { system, user, max_tokens: AI_MAX_TOKENS });
  const arr = parseClaudeJSON<any[]>(raw);
  if (!Array.isArray(arr) || !arr.length) throw new Error("format IA invalide");
  return arr
    .map((s) => ({ heading: String((s && s.heading) || "").slice(0, 200), body: String((s && s.body) || "") }))
    .filter((s) => s.heading || s.body);
}
