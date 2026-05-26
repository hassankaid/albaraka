// supabase/functions/liberty-claude-proxy/index.ts
//
// Proxy générique vers l'API Claude pour TOUS les outils interactifs Liberty
// (M1 NICHE, M2 PSYCHOLOGIE, ... M18 VALUE LADDER).
//
// Contrat d'entrée (POST JSON) :
//   {
//     module_id: "m1",                  // requis — pour traçabilité/quotas
//     system:    "Tu es l'IA péda...",  // requis — system prompt
//     user:      "Bilan : ...",         // requis — message user
//     model?:    "claude-sonnet-4-20250514", // optionnel — défaut sonnet-4
//     max_tokens?: 2048                 // optionnel — défaut 2048
//   }
//
// Réponse :
//   { content: "...texte généré..." }
//
// Auth : JWT verification activée → seul un utilisateur Supabase connecté peut appeler.
// La clé ANTHROPIC_API_KEY est lue depuis les secrets Supabase Edge Functions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 2048;
const ALLOWED_MODULE_REGEX = /^m([1-9]|1[0-9]|20)$/; // m1 → m20

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Méthode non supportée" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON invalide" }, 400);
  }

  const { module_id, system, user, model, max_tokens } = body ?? {};

  // ── Validation des inputs ──────────────────────────────────────────────
  if (!module_id || typeof module_id !== "string" || !ALLOWED_MODULE_REGEX.test(module_id)) {
    return json({ error: "module_id requis (format: m1, m2, ..., m20)" }, 400);
  }
  if (!system || typeof system !== "string") {
    return json({ error: "system prompt requis (string)" }, 400);
  }
  if (!user || typeof user !== "string") {
    return json({ error: "user prompt requis (string)" }, 400);
  }

  const finalModel =
    typeof model === "string" && model.trim().length > 0 ? model : DEFAULT_MODEL;
  const finalMaxTokens =
    typeof max_tokens === "number" && max_tokens > 0 && max_tokens <= 8000
      ? max_tokens
      : DEFAULT_MAX_TOKENS;

  // ── Appel API Claude ──────────────────────────────────────────────────
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    console.error("[liberty-claude-proxy] ANTHROPIC_API_KEY non configurée");
    return json({ error: "Configuration serveur invalide" }, 500);
  }

  try {
    const t0 = Date.now();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: finalModel,
        max_tokens: finalMaxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `[liberty-claude-proxy] Anthropic API error ${res.status} (module=${module_id}):`,
        errText,
      );
      return json({ error: `Anthropic API ${res.status}` }, 502);
    }

    const data = await res.json();
    const textContent =
      data.content?.find((c: any) => c.type === "text")?.text ?? "";

    const elapsed = Date.now() - t0;
    console.info(
      `[liberty-claude-proxy] module=${module_id} model=${finalModel} ` +
        `tokens=${finalMaxTokens} elapsed=${elapsed}ms`,
    );

    return json({ content: textContent });
  } catch (e: any) {
    console.error("[liberty-claude-proxy] Erreur:", e.message);
    return json({ error: e.message || "Erreur interne" }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
