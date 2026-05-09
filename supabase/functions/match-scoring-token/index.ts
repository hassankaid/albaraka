// ═══════════════════════════════════════════════════════════════════════════
// match-scoring-token
// Appelé par la page transitoire /scoring/start. Reçoit le funnel_slug et
// utilise l'IP + User-Agent du client (extraits par notre backend) pour
// retrouver le pending_scoring_token le plus récent NON consommé. Le marque
// consommé atomiquement et retourne son ID + les infos de contact.
//
// Si pas de match → renvoie { matched: false }, la page transitoire poll
// pendant 10s puis tombe en mode "orphelin" (quiz quand même rempli, attaché
// à aucun lead, visible dans /admin/lead-scoring pour matching manuel).
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const funnelSlug = String(body?.funnel || "").trim();
    if (!funnelSlug) return json({ error: "funnel_required" }, 400);

    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Vérifie que le funnel existe et est actif ──
    const { data: funnelCfg, error: cfgErr } = await supabase
      .from("quiz_funnel_configs")
      .select("slug, name, thank_you_url, active")
      .eq("slug", funnelSlug)
      .maybeSingle();

    if (cfgErr) {
      console.error("[match-scoring-token] funnel cfg error", cfgErr);
      return json({ error: "internal" }, 500);
    }
    if (!funnelCfg || !funnelCfg.active) {
      return json({ error: "funnel_not_found_or_inactive", funnel: funnelSlug }, 404);
    }

    // ── Match : token le plus ancien NON consommé, non expiré, matchant
    //    funnel + IP + UA. On utilise l'ordre FIFO pour le edge case "même
    //    IP/UA pour 2 leads" : 1er arrivé prend le 1er token créé.
    let matchedToken: any = null;
    if (clientIp && userAgent) {
      const { data: candidates } = await supabase
        .from("pending_scoring_tokens")
        .select("id, contact_email, contact_first_name, contact_last_name, contact_phone, systemio_contact_id, created_at")
        .eq("funnel_slug", funnelSlug)
        .eq("client_ip", clientIp)
        .eq("user_agent", userAgent)
        .eq("consumed", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1);
      matchedToken = candidates?.[0] || null;
    }

    // ── Fallback : si pas de match avec IP+UA strict, on tente IP seule
    //    (User-Agent peut subtilement varier entre Systemio et notre page,
    //    ex. Mobile Safari, mises à jour navigateur, etc.)
    if (!matchedToken && clientIp) {
      const { data: candidates } = await supabase
        .from("pending_scoring_tokens")
        .select("id, contact_email, contact_first_name, contact_last_name, contact_phone, systemio_contact_id, created_at")
        .eq("funnel_slug", funnelSlug)
        .eq("client_ip", clientIp)
        .eq("consumed", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1);
      matchedToken = candidates?.[0] || null;
    }

    // ── Pas de match : la page transitoire poll, on lui dit de réessayer
    if (!matchedToken) {
      return json({
        matched: false,
        funnel_slug: funnelSlug,
      });
    }

    // ── Consume atomiquement (race-safe : on ne consomme que si encore
    //    consumed=false, sinon un autre process l'a pris entre-temps)
    const { data: consumed, error: consumeErr } = await supabase
      .from("pending_scoring_tokens")
      .update({ consumed: true, consumed_at: new Date().toISOString() })
      .eq("id", matchedToken.id)
      .eq("consumed", false)
      .select("id")
      .maybeSingle();

    if (consumeErr) {
      console.error("[match-scoring-token] consume error", consumeErr);
      return json({ error: "internal" }, 500);
    }
    if (!consumed) {
      // Race condition : un autre poll a consommé ce token entre nos 2 reqs
      // → la page transitoire va re-poll et trouver un autre token (ou pas)
      return json({ matched: false, funnel_slug: funnelSlug });
    }

    console.log(
      `[match-scoring-token] matched token=${matchedToken.id} email=${matchedToken.contact_email} funnel=${funnelSlug}`,
    );

    return json({
      matched: true,
      token: matchedToken.id,
      funnel_slug: funnelSlug,
      funnel_name: funnelCfg.name,
      contact: {
        email: matchedToken.contact_email,
        first_name: matchedToken.contact_first_name,
        last_name: matchedToken.contact_last_name,
        phone: matchedToken.contact_phone,
      },
    });
  } catch (err: any) {
    console.error("[match-scoring-token] fatal", err);
    return json({ error: "internal", message: err?.message || String(err) }, 500);
  }
});
