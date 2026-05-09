// ═══════════════════════════════════════════════════════════════════════════
// webhook-scoring-test (v4)
// Reçoit les webhooks Systemio sur soumission du formulaire de capture du
// funnel quiz scoring. Crée un pending_scoring_tokens (matching FIFO côté
// page transitoire). Phase de test isolée : ne touche PAS aux tables /leads.
//
// Mapping des champs Systemio (validé sur 4 tests bout-en-bout, v4) :
//   data.contact.email                       → contact_email
//   data.contact.fields.first_name           → contact_first_name
//   data.contact.fields.last_name            → contact_last_name
//   data.contact.fields.phone_number         → contact_phone
//   data.contact.id (number)                 → systemio_contact_id
//   data.contact.ip                          → client_ip (IP réelle du lead)
//
// Le payload brut est aussi stocké dans raw_webhook_payload pour debug.
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
const WEBHOOK_SECRET = Deno.env.get("SYSTEMIO_SCORING_WEBHOOK_SECRET") || "";
const TEST_FUNNEL_SLUG = "webi-al-baraka-test";

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

function pickString(payload: any, ...paths: string[]): string | null {
  for (const path of paths) {
    const parts = path.split(".");
    let v: any = payload;
    for (const p of parts) {
      if (v == null) break;
      v = v[p];
    }
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    if (WEBHOOK_SECRET) {
      const sig = req.headers.get("x-webhook-secret") || req.headers.get("x-systemio-secret") || "";
      if (sig !== WEBHOOK_SECRET) {
        return json({ error: "invalid_secret" }, 401);
      }
    }

    const rawBody = await req.text();
    let payload: any = {};
    try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch {
      console.error("[webhook-scoring-test] invalid JSON");
      return json({ error: "invalid_json" }, 400);
    }

    // Mapping Systemio v4 — validé par 4 tests bout-en-bout
    const email = pickString(
      payload,
      "data.contact.email",
      "contact.email", "data.email", "email",
    );
    const firstName = pickString(
      payload,
      "data.contact.fields.first_name",
      "data.contact.fields.firstname",
      "data.contact.first_name",
      "contact.first_name", "first_name", "firstname",
    );
    const lastName = pickString(
      payload,
      "data.contact.fields.last_name",
      "data.contact.fields.lastname",
      "data.contact.last_name",
      "contact.last_name", "last_name", "lastname",
    );
    const phone = pickString(
      payload,
      "data.contact.fields.phone_number",
      "data.contact.fields.phone",
      "data.contact.phone",
      "contact.phone", "phone", "phone_number",
    );
    const systemioContactId = pickString(
      payload,
      "data.contact.id",
      "contact.id", "id",
    );

    if (!email) {
      console.error("[webhook-scoring-test] missing email");
      return json({ error: "missing_email" }, 400);
    }

    // L'IP réelle du lead est dans data.contact.ip (Systemio nous la donne)
    const payloadIp = pickString(
      payload,
      "data.contact.ip",
      "contact.ip", "ip",
    );
    const reqIp = extractClientIp(req);
    const clientIp = payloadIp || reqIp;

    const userAgent = req.headers.get("user-agent");

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
        raw_webhook_payload: payload,
      })
      .select("id, created_at, expires_at")
      .single();

    if (insertErr) {
      console.error("[webhook-scoring-test] insert failed", insertErr);
      return json({ error: "db_insert_failed", message: insertErr.message }, 500);
    }

    console.log(
      `[webhook-scoring-test] token=${token.id} email=${email} firstName=${firstName ?? "—"} phone=${phone ?? "—"} ip=${clientIp ?? "—"}`,
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
