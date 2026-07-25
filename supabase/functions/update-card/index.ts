// update-card
//
// Process "Changer de carte" — creation du SetupIntent.
// verify_jwt=false : la securite repose sur le token (card_update_links) + le
// service_role cote serveur. Le client ne saisit JAMAIS sa carte cote nous
// (Stripe Elements). La finalisation (set default + pay invoice) se fait cote
// webhook sur setup_intent.succeeded (metadata.source="card_update").
//
// POST { token, test_mode? }
//   -> valide le token, resout le customer via l'abonnement, cree un SetupIntent
//      (usage=off_session) avec la metadata attendue par le webhook.
//   -> { client_secret, intent_id, intent_type:"setup" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_LIVE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TOKEN_RX = /^ALB-CARD-[A-Z0-9]{6,12}$/;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function stripeGet(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe GET ${path} ${res.status}: ${JSON.stringify(body?.error ?? body)}`);
  return body;
}

async function stripePost(path: string, form: URLSearchParams, apiKey: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe POST ${path} ${res.status}: ${JSON.stringify(body?.error ?? body)}`);
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const token = String(body?.token || "").trim().toUpperCase();
  const testMode = body?.test_mode === true;
  if (!TOKEN_RX.test(token)) return json({ error: "invalid_token" }, 400);

  const apiKey = testMode ? STRIPE_TEST : STRIPE_LIVE;
  if (!apiKey) return json({ error: testMode ? "STRIPE_SECRET_KEY_TEST not configured" : "STRIPE_SECRET_KEY not configured" }, 500);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Validation du token ──
  const { data: link, error: linkErr } = await sb
    .from("card_update_links")
    .select("token, status, expires_at, stripe_subscription_id, sale_id, contact_id")
    .eq("token", token)
    .maybeSingle();
  if (linkErr) {
    console.error("[update-card] lookup error", linkErr);
    return json({ error: "internal" }, 500);
  }
  if (!link) return json({ error: "token_not_found" }, 404);
  if (link.status !== "active") return json({ error: link.status === "used" ? "token_used" : "token_expired" }, 409);
  if (new Date(link.expires_at) < new Date()) return json({ error: "token_expired" }, 409);

  const subscriptionId = link.stripe_subscription_id;
  if (!subscriptionId) return json({ error: "no_subscription" }, 400);

  try {
    // ── Résolution du customer via l'abonnement ──
    const sub = await stripeGet(`subscriptions/${subscriptionId}`, apiKey);
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (!customerId) return json({ error: "customer_not_found" }, 500);

    // ── SetupIntent (autorisation carte, pas de débit) ──
    // metadata.source="card_update" + stripe_subscription_id : le webhook
    // handleSetupIntentSucceeded s'en sert pour set default + payer l'échéance.
    const form = new URLSearchParams();
    form.set("customer", customerId);
    form.set("usage", "off_session");
    form.append("payment_method_types[]", "card");
    form.set("metadata[source]", "card_update");
    form.set("metadata[token]", token);
    form.set("metadata[stripe_subscription_id]", subscriptionId);
    if (link.sale_id) form.set("metadata[sale_id]", String(link.sale_id));
    if (link.contact_id) form.set("metadata[contact_id]", String(link.contact_id));

    const si = await stripePost("setup_intents", form, apiKey);

    return json({
      client_secret: si.client_secret,
      intent_id: si.id,
      intent_type: "setup",
    });
  } catch (e: any) {
    console.error("[update-card] stripe error", e?.message ?? e);
    return json({ error: "stripe_error", detail: e?.message ?? null }, 502);
  }
});
