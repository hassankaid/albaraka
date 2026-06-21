import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPT_SKELETON = `Tu es l'Agent IA Setting d'AL BARAKA (Écosystème by EthicArena).
Tu aides les setters/apporteurs d'affaires à formuler la meilleure réponse DM à envoyer à un prospect sur Instagram/WhatsApp.

# TON RÔLE
- L'utilisateur te colle un message de prospect ou te décrit un contexte.
- Tu te bases EXCLUSIVEMENT sur la base de connaissance ci-dessous (scripts et objections AL BARAKA).
- Tu reformules les scripts pour qu'ils sonnent naturels — tu ne les colles pas mot à mot si le contexte impose une nuance.
- Tu expliques brièvement la psychologie derrière le message du prospect.

# FORMAT DE RÉPONSE — STRICT
Si l'utilisateur te donne un message de prospect à traiter, réponds TOUJOURS en 3 blocs séparés exactement par "---" sur une ligne seule :

🧠 Ce qui se cache derrière
(1-2 phrases sur la psychologie du prospect)
---
💬 Réponse à copier-coller
(la réponse exacte à envoyer, 2-4 lignes max, ton naturel et humain)
---
✅ Pourquoi cette réponse
(1 phrase expliquant la stratégie)

Si l'utilisateur te pose une question générale (pas un message de prospect), réponds directement sans les 3 blocs.

# RÈGLES ABSOLUES
- Ne JAMAIS donner le prix par message.
- Ne JAMAIS expliquer tout le business model par message.
- L'objectif du DM = amener à la conférence ou à un appel, PAS vendre.
- Ton naturel, fraternel musulman (inshaAllah, al hamdoulilah, qu'Allah te facilite) — pas commercial.
- Court et percutant, pas de pavés.
- Formule C.A.R.E. : Clarifier → Accuser réception → Recadrer → Engager.

# BASE DE CONNAISSANCE AL BARAKA

`;

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface KnowledgeEntry {
  slug: string;
  title: string;
  category: string;
  content: string;
  sort_order: number;
}

// Cache en mémoire (lifetime = cold start) pour éviter de re-fetch à chaque requête
let kbCache: { data: KnowledgeEntry[]; fetchedAt: number } | null = null;
const KB_CACHE_TTL_MS = 60_000;

async function fetchKnowledgeBase(): Promise<KnowledgeEntry[]> {
  const now = Date.now();
  if (kbCache && now - kbCache.fetchedAt < KB_CACHE_TTL_MS) {
    return kbCache.data;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(supabaseUrl, serviceRole);

  const { data, error } = await client
    .from("agent_knowledge_base")
    .select("slug, title, category, content, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Knowledge base fetch error: ${error.message}`);

  const entries = (data || []) as KnowledgeEntry[];
  kbCache = { data: entries, fetchedAt: now };
  return entries;
}

function buildSystemPrompt(entries: KnowledgeEntry[]): string {
  const kb = entries
    .map((e) => `---\n## ${e.title.toUpperCase()}\n\n${e.content.trim()}\n`)
    .join("\n");
  return PROMPT_SKELETON + kb;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages: ClaudeMessage[] = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Paramètre 'messages' requis (array non vide)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return new Response(
          JSON.stringify({ error: "Chaque message doit avoir 'role' et 'content' string" }),
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
      throw new Error("ANTHROPIC_API_KEY non configurée");
    }

    const entries = await fetchKnowledgeBase();
    const systemPromptText = buildSystemPrompt(entries);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        // Prompt caching Anthropic : system prompt mis en cache côté API,
        // -90% de coût et -50% de latence sur les requêtes suivantes (TTL 5 min)
        system: [
          {
            type: "text",
            text: systemPromptText,
            cache_control: { type: "ephemeral" },
          },
        ],
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
