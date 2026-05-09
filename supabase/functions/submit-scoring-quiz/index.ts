// ═══════════════════════════════════════════════════════════════════════════
// submit-scoring-quiz
// Reçoit les réponses du quiz lead scoring et les enregistre dans
// public.lead_scoring_responses avec le score calculé serveur-side.
//
// Body :
//   {
//     funnel: "webi-al-baraka-test",
//     token?: "uuid",                 ← optionnel, présent si match auto réussi
//     answers: { q1: "salarie", q2: "25_35", ... },
//     // Pour le mode orphelin (pas de token), on accepte des coordonnées
//     // saisies manuellement (mais notre flow ne les demande JAMAIS au lead) :
//     contact?: { email, first_name, last_name, phone }
//   }
//
// Returns : { ok, response_id, score, category, redirect_url }
//   redirect_url = la TYP Systemio à charger côté client après soumission
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeScoring } from "./scoring.ts";

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
    const token = typeof body?.token === "string" && body.token ? body.token : null;
    const answers = body?.answers as Record<string, string>;
    const orphanContact = body?.contact || null;

    if (!funnelSlug) return json({ error: "funnel_required" }, 400);
    if (!answers || typeof answers !== "object") return json({ error: "answers_required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Vérifie funnel ──
    const { data: funnelCfg, error: cfgErr } = await supabase
      .from("quiz_funnel_configs")
      .select("slug, name, thank_you_url, active")
      .eq("slug", funnelSlug)
      .maybeSingle();
    if (cfgErr) {
      console.error("[submit-scoring-quiz] funnel cfg error", cfgErr);
      return json({ error: "internal" }, 500);
    }
    if (!funnelCfg || !funnelCfg.active) {
      return json({ error: "funnel_not_found_or_inactive" }, 404);
    }

    // ── Récupère les infos contact via le token (cas normal) ──
    let contactEmail: string | null = null;
    let contactFirstName: string | null = null;
    let contactLastName: string | null = null;
    let contactPhone: string | null = null;
    let pendingTokenId: string | null = null;

    if (token) {
      const { data: tk, error: tkErr } = await supabase
        .from("pending_scoring_tokens")
        .select("id, funnel_slug, contact_email, contact_first_name, contact_last_name, contact_phone, consumed")
        .eq("id", token)
        .maybeSingle();
      if (tkErr) {
        console.error("[submit-scoring-quiz] token lookup error", tkErr);
        return json({ error: "internal" }, 500);
      }
      if (!tk) {
        return json({ error: "token_not_found" }, 404);
      }
      if (tk.funnel_slug !== funnelSlug) {
        return json({ error: "token_funnel_mismatch" }, 400);
      }
      contactEmail = tk.contact_email;
      contactFirstName = tk.contact_first_name;
      contactLastName = tk.contact_last_name;
      contactPhone = tk.contact_phone;
      pendingTokenId = tk.id;
    } else if (orphanContact) {
      // Mode orphelin (pas censé arriver dans le flow normal — webhook n'a
      // pas créé de token à temps). On accepte les coords si fournies pour
      // ne pas perdre la donnée. CEO matchera manuellement.
      contactEmail = String(orphanContact.email || "").trim().toLowerCase() || null;
      contactFirstName = orphanContact.first_name || null;
      contactLastName = orphanContact.last_name || null;
      contactPhone = orphanContact.phone || null;
    }

    if (!contactEmail) {
      return json({ error: "no_contact_identification" }, 400);
    }

    // ── Calcul score / catégorie / flags ──
    let scoring;
    try {
      scoring = computeScoring(answers);
    } catch (e: any) {
      return json({ error: "invalid_answers", message: e?.message || String(e) }, 400);
    }

    // ── Insert dans lead_scoring_responses ──
    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const { data: response, error: insertErr } = await supabase
      .from("lead_scoring_responses")
      .insert({
        funnel_slug: funnelSlug,
        pending_token_id: pendingTokenId,
        contact_email: contactEmail,
        contact_first_name: contactFirstName,
        contact_last_name: contactLastName,
        contact_phone: contactPhone,
        answers,
        score: scoring.score,
        category: scoring.category,
        flags: scoring.flags,
        client_ip: clientIp,
        user_agent: userAgent,
      })
      .select("id, completed_at")
      .single();

    if (insertErr) {
      console.error("[submit-scoring-quiz] insert error", insertErr);
      return json({ error: "db_insert_failed", message: insertErr.message }, 500);
    }

    console.log(
      `[submit-scoring-quiz] response=${response.id} score=${scoring.score} category=${scoring.category} flags=${scoring.flags.join(",")} email=${contactEmail}`,
    );

    return json({
      ok: true,
      response_id: response.id,
      score: scoring.score,
      category: scoring.category,
      flags: scoring.flags,
      redirect_url: funnelCfg.thank_you_url,
    });
  } catch (err: any) {
    console.error("[submit-scoring-quiz] fatal", err);
    return json({ error: "internal", message: err?.message || String(err) }, 500);
  }
});
