/**
 * Client pour la edge function `liberty-claude-proxy`.
 *
 * Tous les appels IA de l'outil M1 NICHE (et plus tard M2 → M18) passent par
 * ici. JWT verification activée côté serveur — l'élève doit être connecté.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CallClaudeOptions {
  system: string;
  user: string;
  model?: string;
  max_tokens?: number;
}

/**
 * Appelle Claude via le proxy serveur Liberty.
 * Retourne le texte brut généré. À l'appelant de parser le JSON si besoin.
 */
export async function callClaude(
  moduleId: string,
  opts: CallClaudeOptions,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("liberty-claude-proxy", {
    body: {
      module_id: moduleId,
      system: opts.system,
      user: opts.user,
      model: opts.model,
      max_tokens: opts.max_tokens,
    },
  });
  if (error) {
    throw new Error(error.message || "Erreur appel Claude");
  }
  if (!data || typeof data !== "object") {
    throw new Error("Réponse IA invalide");
  }
  const content = (data as { content?: string }).content;
  if (typeof content !== "string") {
    throw new Error("Réponse IA sans contenu textuel");
  }
  return content;
}

/**
 * Parse un bloc JSON renvoyé par Claude (markdown fence toléré).
 * Lève une erreur si le JSON est invalide.
 */
export function parseClaudeJSON<T = unknown>(raw: string): T {
  // Strip markdown fences si présents (```json ... ```)
  const trimmed = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(trimmed) as T;
}
