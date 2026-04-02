import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kpis, objectives, history } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

    const prompt = `Tu es un coach IA bienveillant mais exigeant pour des apporteurs d'affaires.

Voici les KPIs de cette semaine :
- Vidéos publiées : ${kpis.videos_published} (objectif : ${objectives?.videos || 7})
- Messages envoyés : ${kpis.messages_sent} (objectif : ${objectives?.messages || 500})
- Réponses reçues : ${kpis.replies_received} (objectif : ${objectives?.replies || 10})
- RDV obtenus : ${kpis.appointments} (objectif : ${objectives?.appointments || 10})
- Ventes réalisées : ${kpis.sales_made} (objectif : ${objectives?.sales || 3})

Historique des semaines précédentes : ${JSON.stringify(history || [])}

Donne un feedback personnalisé en 3-4 phrases maximum. Mentionne les points forts, les axes d'amélioration, et un conseil actionnable. Utilise un ton motivant avec des emojis. Réponds en français.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      return new Response(JSON.stringify({ feedback: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const feedback = data.content?.[0]?.text || null;

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("activity-ai-coach error:", e);
    return new Response(JSON.stringify({ feedback: null, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
