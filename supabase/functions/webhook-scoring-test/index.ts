// ═══════════════════════════════════════════════════════════════════════════
// webhook-scoring-test
// Reçoit les webhooks du compte Systemio TEST (deencode) au moment où un lead
// soumet le formulaire de capture du funnel quiz scoring. Crée un
// pending_scoring_tokens pour permettre le matching auto sur la page
// transitoire (par IP + User-Agent + funnel + recency).
//
// IMPORTANT — Phase de test isolée :
//   - Ne crée PAS de lead/contact dans les tables prod (public.leads,
//     public.contacts, public.profiles).
//   - Tout reste dans pending_scoring_tokens + lead_scoring_responses.
//
// Trigger Systemio : "Funnel step form subscribed" sur le funnel
//   inscription-webinaire-al-baraka.
//
// URL endpoint : https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/webhook-scoring-test
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Optionnel : si tu configures un secret côté Systemio webhook, il sera dans
// le header X-Webhook-Secret. On vérifie pour rejeter les requêtes non
// authentifiées. Si vide, pas de vérification (mode test souple).
const WEBHOOK_SECRET = Deno.env.get("SYSTEMIO_SCORING_WEBHOOK_SECRET") || "";

// Slug du funnel test. Pour la phase de test on traite tous les webhooks
// reçus comme appartenant à ce funnel. Quand on aura plusieurs funnels en
// production, on utilisera le mapping funnel ID Systemio → slug interne.
const TEST_FUNNEL_SLUG = "webi-al-baraka-test";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Extrait l'IP réelle du client depuis les headers Cloudflare/Supabase.
// Order: cf-connecting-ip (Cloudflare) > x-real-ip > x-forwarded-for (1er) > vide
function extractClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return null;
}

// Lookup tolérant dans le payload Systemio. Différents triggers
// envoient des structures différentes ; on cherche dans les chemins
// connus en cascade.
function pickString(payload: any, ...paths: string[]): string | null {
  for (const path of paths) {
    const parts = path.split(".");
    let v: any = payload;
    for (const p of parts) {
      if (v == null) break;
      v = v[p];
    }
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // ── Vérification du secret partagé (optionnelle) ──
    if (WEBHOOK_SECRET) {
      const sig = req.headers.get("x-webhook-secret") || req.headers.get("x-systemio-secret") || "";
      if (sig !== WEBHOOK_SECRET) {
        console.warn("[webhook-scoring-test] invalid secret");
        return json({ error: "invalid_secret" }, 401);
      }
    }

    // ── Lecture du payload ──
    const rawBody = await req.text();
    let payload: any = {};
    try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch {
      console.error("[webhook-scoring-test] invalid JSON");
      return json({ error: "invalid_json" }, 400);
    }

    // ── Extraction des champs (tolérant à plusieurs formats Systemio) ──
    const email = pickString(
      payload,
      "contact.email",
      "data.contact.email",
      "data.email",
      "email",
      "subscriber.email",
    );
    const firstName = pickString(
      payload,
      "contact.first_name",
      "contact.firstName",
      "data.contact.first_name",
      "data.first_name",
      "first_name",
      "subscriber.first_name",
    );
    const lastName = pickString(
      payload,
      "contact.last_name",
      "contact.lastName",
      "data.contact.last_name",
      "data.last_name",
      "last_name",
      "subscriber.last_name",
    );
    const phone = pickString(
      payload,
      "contact.phone",
      "contact.phone_number",
      "data.contact.phone",
      "data.phone",
      "phone",
      "subscriber.phone",
    );
    const systemioContactId = pickString(
      payload,
      "contact.id",
      "data.contact.id",
      "subscriber.id",
      "id",
    );

    if (!email) {
      console.error("[webhook-scoring-test] missing email in payload", { keys: Object.keys(payload || {}) });
      return json({ error: "missing_email", payload_keys: Object.keys(payload || {}) }, 400);
    }

    // L'IP du client (le lead) DOIT venir du payload Systemio si dispo,
    // sinon on retombe sur l'IP de la requête (qui est celle des serveurs
    // Systemio — moins utile pour le matching IP avec la transitoire).
    // Systemio passe parfois l'IP dans des champs comme `subscriber.ip` ou
    // `contact.last_ip`. On essaie ; si absent, on prend l'IP de la requête
    // (fallback) en sachant que ça ne servira pas au matching.
    const payloadIp = pickString(
      payload,
      "contact.ip",
      "contact.last_ip",
      "contact.optin_ip",
      "subscriber.ip",
      "subscriber.last_ip",
      "data.ip",
      "ip",
    );
    const reqIp = extractClientIp(req);
    const clientIp = payloadIp || reqIp;

    // User-agent du lead (idéalement passé par Systemio, sinon UA des
    // serveurs Systemio = pas utile)
    const payloadUa = pickString(
      payload,
      "contact.user_agent",
      "contact.last_user_agent",
      "subscriber.user_agent",
      "data.user_agent",
      "user_agent",
    );
    const userAgent = payloadUa || req.headers.get("user-agent");

    // ── Création du pending_scoring_token ──
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: token, error: insertErr } = await supabase
      .from("pending_scoring_tokens")
      .insert({
        funnel_slug: TEST_FUNNEL_SLUG,
        contact_email: email.toLowerCase(),
        contact_first_name: firstName,
        contact_last_name: lastName,
        contact_phone: phone,
        systemio_contact_id: systemioContactId,
        client_ip: clientIp,
        user_agent: userAgent,
      })
      .select("id, created_at, expires_at")
      .single();

    if (insertErr) {
      console.error("[webhook-scoring-test] insert failed", insertErr);
      return json({ error: "db_insert_failed", message: insertErr.message }, 500);
    }

    console.log(
      `[webhook-scoring-test] token=${token.id} email=${email} ip=${clientIp ?? "—"} ua=${userAgent?.slice(0, 50) ?? "—"}`,
    );

    return json({
      ok: true,
      token_id: token.id,
      funnel: TEST_FUNNEL_SLUG,
      created_at: token.created_at,
      expires_at: token.expires_at,
    });
  } catch (err: any) {
    console.error("[webhook-scoring-test] fatal", err);
    return json({ error: "internal", message: err?.message || String(err) }, 500);
  }
});
