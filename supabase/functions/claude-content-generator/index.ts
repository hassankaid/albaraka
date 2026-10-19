import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { appelerIA, utilisateurDe } from "../_shared/ia.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Générateur de contenus (personal brand) : via OpenRouter, noté au journal de consommation IA
    const texte = await appelerIA({
      fonctionnalite: "contenus_personal_brand",
      userId: await utilisateurDe(req),
      maxTokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    return new Response(
      JSON.stringify({ response: texte }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
