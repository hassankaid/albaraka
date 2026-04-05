import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_AGENT_SYSTEM = `ETHICARENA Setting/Closing coach. Si message prospect: réponds en 3 blocs séparés par "---": 🧠 psychologie (1 phrase) --- 💬 réponse à copier (2-3 lignes) --- ✅ pourquoi (1 phrase). Si question: réponse courte directe.`;

const CONTEXT_HINTS: Record<string, string> = {
  setting_rdv: "Contexte: prospection individuelle sur messagerie privée (Instagram/WhatsApp) — objectif verrouiller un RDV téléphonique. Ton naturel, pas commercial, maximum 2 relances.",
  setting_conference: "Contexte: invitation à une conférence gratuite de masse. Ton enthousiaste mais retenu, ne pas dévoiler le contenu, orienter vers le créneau.",
  closing_ads: "Contexte: closing d'un lead venu des publicités. Le prospect a déjà vu une VSL, il connaît vaguement l'offre. Suivre la structure: accord de principe, douleur, projection, 4 piliers, échelle de certitude, annonce du prix.",
  closing_organique: "Contexte: closing d'un lead venu organiquement (contenu). Le prospect est plus chaud, plus éduqué. Aller plus vite sur la découverte, plus de temps sur la projection et les 4 piliers.",
  closing_bizdev: "Contexte: closing mené par un Business Developer sur un lead qualifié par un setter. Reprendre le contexte donné par le setter, ancrer la douleur déjà identifiée, accélérer vers le prix.",
};

function buildSystemPrompt(contextType?: string): string {
  if (contextType && CONTEXT_HINTS[contextType]) {
    return BASE_AGENT_SYSTEM + "\n\n" + CONTEXT_HINTS[contextType];
  }
  return BASE_AGENT_SYSTEM;
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages: ClaudeMessage[] = body.messages;
    const contextType: string | undefined = body.context_type;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Paramètre 'messages' requis (array non vide)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return new Response(
          JSON.stringify({ error: "Chaque message doit avoir un 'role' et un 'content' (string)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (msg.role !== "user" && msg.role !== "assistant") {
        return new Response(
          JSON.stringify({ error: "role doit être 'user' ou 'assistant'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (messages[0].role !== "user") {
      return new Response(
        JSON.stringify({ error: "Le premier message doit avoir le role 'user'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY non configurée");
      throw new Error("ANTHROPIC_API_KEY non configurée");
    }

    const systemPrompt = buildSystemPrompt(contextType);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `API Anthropic error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const textContent = data.content?.find((c: any) => c.type === "text");

    return new Response(
      JSON.stringify({ response: textContent?.text || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in claude-agent-prospect:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
