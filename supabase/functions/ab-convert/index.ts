// ─────────────────────────────────────────────────────────────────────────
// ab-convert — le visiteur a fait l'action qu'on mesurait.
//
// Appelée quand quelqu'un rejoint le groupe WhatsApp, ou atterrit sur la
// confirmation de rendez-vous. C'est le NUMÉRATEUR du test ; `ab-visit` en
// fournit le dénominateur.
//
// LA VARIANTE N'EST PAS PRISE DU CLIENT. On la relit depuis l'exposition
// enregistrée à l'affichage : un client pourrait annoncer celle qui l'arrange,
// et surtout la variante réellement VUE est la seule qui compte. Si aucune
// exposition n'existe pour ce visiteur, il n'a rien vu — on n'enregistre rien.
//
// Conséquence utile : impossible de convertir sans avoir été exposé, donc le
// taux ne peut jamais dépasser 100 %.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ACTIONS = new Set(["groupe_whatsapp", "rendez_vous"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "").trim().toUpperCase();
    const visitorId = String(body?.visitor_id ?? "").trim();
    const action = String(body?.action ?? "").trim();

    if (!code || !visitorId || !ACTIONS.has(action)) return json({ enregistre: false });
    if (visitorId.length > 64) return json({ enregistre: false });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: test } = await supabase
      .from("ab_tests")
      .select("id, action")
      .eq("code", code)
      .maybeSingle();
    if (!test) return json({ enregistre: false });

    // On accepte la conversion même si le test vient d'être arrêté : le
    // visiteur avait bien vu la variante quand il tournait, et sa réaction
    // arrive parfois quelques minutes plus tard. La refuser tronquerait le
    // numérateur des derniers exposés et pénaliserait artificiellement la
    // variante servie en fin de test.

    const { data: expo } = await supabase
      .from("ab_exposures")
      .select("variant")
      .eq("test_id", test.id)
      .eq("visitor_id", visitorId)
      .maybeSingle();
    // Pas d'exposition = ce visiteur n'a jamais vu de variante dans ce test.
    if (!expo) return json({ enregistre: false, raison: "jamais_expose" });

    await supabase.from("ab_conversions").upsert(
      { test_id: test.id, visitor_id: visitorId, variant: expo.variant, action },
      { onConflict: "test_id,visitor_id,action", ignoreDuplicates: true },
    );

    return json({ enregistre: true });
  } catch (e) {
    console.error("[ab-convert]", e);
    return json({ enregistre: false });
  }
});
