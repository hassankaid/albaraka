// ═══════════════════════════════════════════════════════════════════════════
// cancel-stripe-subscription
// Annule une subscription Stripe attachée à une vente, et marque les paiements
// pending de cette vente comme 'lost'. Réservé au CEO.
//
// Body : { sale_id: string }
// Returns : { ok: true, subscription_id, cancelled_at, payments_marked_lost: number }
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_SECRET_KEY_LIVE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_SECRET_KEY_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Tente DELETE /v1/subscriptions/{id} avec les 2 clés (live d'abord, test en
// fallback). Retourne {data, mode} si succès, throw sinon.
async function cancelSubscription(subscriptionId: string): Promise<{ data: any; mode: "live" | "test" }> {
  const tryKey = async (apiKey: string): Promise<{ ok: boolean; data: any; status: number }> => {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
    return { ok: res.ok, data, status: res.status };
  };

  if (STRIPE_SECRET_KEY_LIVE) {
    const r = await tryKey(STRIPE_SECRET_KEY_LIVE);
    if (r.ok) return { data: r.data, mode: "live" };
    // Si la sub n'existe pas en live (404), tenter test
    if (r.status !== 404) throw new Error(`Stripe live: ${r.status} ${JSON.stringify(r.data)}`);
  }

  if (STRIPE_SECRET_KEY_TEST) {
    const r = await tryKey(STRIPE_SECRET_KEY_TEST);
    if (r.ok) return { data: r.data, mode: "test" };
    throw new Error(`Stripe test: ${r.status} ${JSON.stringify(r.data)}`);
  }

  throw new Error("No Stripe API key configured");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // ── Auth : CEO uniquement ──
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "ceo") return json({ error: "forbidden_ceo_only" }, 403);

    // ── Body ──
    const body = await req.json().catch(() => ({}));
    const saleId = body?.sale_id as string | undefined;
    if (!saleId) return json({ error: "sale_id_required" }, 400);

    // ── Récupère la subscription Stripe attachée à la vente ──
    // Toutes les mensualités d'une même vente partagent le même sub_id.
    const { data: payments, error: paymentsErr } = await supabase
      .from("payments")
      .select("id, status, stripe_subscription_id, payment_number, amount")
      .eq("sale_id", saleId);
    if (paymentsErr) throw paymentsErr;

    const subscriptionIds = Array.from(new Set(
      (payments || [])
        .map((p) => p.stripe_subscription_id)
        .filter((s): s is string => !!s)
    ));

    if (subscriptionIds.length === 0) {
      return json({ error: "no_subscription", message: "Aucune subscription Stripe attachée à cette vente." }, 400);
    }

    if (subscriptionIds.length > 1) {
      return json({
        error: "multiple_subscriptions",
        message: "Plusieurs subscriptions distinctes attachées à cette vente. Inattendu.",
        subscriptions: subscriptionIds,
      }, 400);
    }

    const subId = subscriptionIds[0];
    const pendingPaymentIds = (payments || [])
      .filter((p) => p.status === "pending")
      .map((p) => p.id);

    if (pendingPaymentIds.length === 0) {
      return json({
        error: "no_pending_payments",
        message: "Aucun paiement pending sur cette vente — la subscription a peut-être déjà été annulée ou tous les paiements sont passés.",
      }, 400);
    }

    // ── Annule la subscription côté Stripe ──
    let cancelResult: { data: any; mode: "live" | "test" };
    try {
      cancelResult = await cancelSubscription(subId);
    } catch (e: any) {
      return json({
        error: "stripe_cancel_failed",
        message: `Annulation Stripe échouée : ${e?.message || String(e)}`,
        subscription_id: subId,
      }, 502);
    }

    // ── Marque les paiements pending comme 'lost' ──
    const cancelledAtIso = new Date().toISOString();
    const note = `Subscription Stripe ${subId} annulée le ${cancelledAtIso.slice(0, 10)} (CEO ${user.email}). Mode: ${cancelResult.mode}.`;
    const { error: updErr, count } = await supabase
      .from("payments")
      .update({
        status: "lost",
        notes: note,
        updated_at: cancelledAtIso,
      }, { count: "exact" })
      .in("id", pendingPaymentIds);
    if (updErr) throw updErr;

    // ── Met à jour le payment_status de la vente ──
    // Si la vente a au moins 1 paiement payé, on la marque 'lost' (paiement
    // partiel acquis, mais la vente est "perdue" dans son ensemble).
    // Recompute via la fonction existante si elle existe, sinon manual.
    const { data: paid } = await supabase
      .from("payments")
      .select("id")
      .eq("sale_id", saleId)
      .eq("status", "paid")
      .limit(1);
    const newSaleStatus = (paid && paid.length > 0) ? "lost" : "lost"; // toujours lost dans ce flow
    await supabase.from("sales").update({ payment_status: newSaleStatus }).eq("id", saleId);

    return json({
      ok: true,
      subscription_id: subId,
      stripe_mode: cancelResult.mode,
      cancelled_at: cancelledAtIso,
      payments_marked_lost: count ?? pendingPaymentIds.length,
      sale_id: saleId,
    });
  } catch (err: any) {
    console.error("[cancel-stripe-subscription] error", err);
    return json({ error: "internal", message: err?.message || String(err) }, 500);
  }
});
