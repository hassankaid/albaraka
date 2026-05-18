// ═══════════════════════════════════════════════════════════════════════════
// repair-sale-subscription
//
// Filet de sécurité quand `trigger-installment-now` a échoué à recréer la
// nouvelle Stripe Subscription après un déclenchement manuel.
//
// Symptômes typiques (cas Mahir El Amrani 18/05/2026) :
//   - La mensualité #N a été marquée paid + decalages BDD OK
//   - L'ancienne sub Stripe a été canceled
//   - MAIS les rows pending restantes pointent toujours sur l'ancienne sub
//   - Donc Stripe ne prélève plus rien automatiquement
//
// Ce que fait cette fonction :
//   1. Charge toutes les pending d'un sale_id, triées par due_date asc
//   2. Récupère le customer Stripe + son default payment_method
//   3. Crée une nouvelle Stripe Subscription avec billing_cycle_anchor = première
//      pending future, cancel_at = dernière pending + 24h, trial_end = anchor
//   4. Update les rows pending avec le nouveau stripe_subscription_id
//
// Idempotent : si toutes les pending pointent déjà sur une sub Stripe ACTIVE,
// la fonction refuse de recréer une sub (évite les doublons).
//
// Body : { sale_id: string, force?: boolean }
// Auth : CEO uniquement
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
const STRIPE_LIVE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type StripeResult = { ok: boolean; status: number; data: any };

async function stripeGet(apiKey: string, path: string): Promise<StripeResult> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

async function stripePostForm(
  apiKey: string,
  path: string,
  fields: Record<string, string | number | undefined | null>,
): Promise<StripeResult> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    body.append(k, String(v));
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

async function findStripeContext(
  subId: string | null,
  email: string | null,
): Promise<{ customerId: string; mode: "live" | "test"; key: string } | null> {
  if (subId) {
    for (const [mode, key] of [["live", STRIPE_LIVE], ["test", STRIPE_TEST]] as const) {
      if (!key) continue;
      const r = await stripeGet(key, `/subscriptions/${subId}`);
      if (r.ok && r.data?.customer) {
        return { customerId: String(r.data.customer), mode, key };
      }
    }
  }
  if (email) {
    for (const [mode, key] of [["live", STRIPE_LIVE], ["test", STRIPE_TEST]] as const) {
      if (!key) continue;
      const safe = email.replace(/'/g, "\\'");
      const s = await stripeGet(key, `/customers/search?query=${encodeURIComponent(`email:'${safe}'`)}&limit=10`);
      if (!s.ok) continue;
      const customers = s.data?.data || [];
      if (customers.length === 0) continue;
      const best = [...customers].sort((a: any, b: any) => (b.created || 0) - (a.created || 0))[0];
      return { customerId: String(best.id), mode, key };
    }
  }
  return null;
}

async function findDefaultPaymentMethod(key: string, customerId: string): Promise<string | null> {
  const c = await stripeGet(key, `/customers/${customerId}`);
  const def = c.data?.invoice_settings?.default_payment_method;
  if (def && typeof def === "string") return def;
  if (def && typeof def === "object" && def.id) return String(def.id);
  const pms = await stripeGet(key, `/customers/${customerId}/payment_methods?type=card&limit=1`);
  const first = pms.data?.data?.[0]?.id;
  return first ? String(first) : null;
}

function ymdToEpoch(ymd: string, hour = 12): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d, hour, 0, 0) / 1000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error_code: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ ok: false, error_code: "unauthorized" }, 401);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile } = await sb
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "ceo") return json({ ok: false, error_code: "forbidden_ceo_only" }, 403);
    const ceoEmail = profile?.email || user.email || "unknown";

    const body = await req.json().catch(() => ({}));
    const saleId = body?.sale_id as string | undefined;
    const force = !!body?.force;
    if (!saleId) return json({ ok: false, error_code: "sale_id_required" }, 400);

    // ── Load sale + contact + pending payments ──
    const { data: sale } = await sb
      .from("sales")
      .select("id, contact_id, product")
      .eq("id", saleId)
      .maybeSingle();
    if (!sale?.contact_id) return json({ ok: false, error_code: "sale_or_contact_missing" }, 404);

    const { data: contact } = await sb
      .from("contacts")
      .select("email")
      .eq("id", sale.contact_id)
      .maybeSingle();
    const contactEmail = contact?.email || null;

    const { data: allPending } = await sb
      .from("payments")
      .select("id, amount, due_date, payment_number, stripe_subscription_id")
      .eq("sale_id", saleId)
      .eq("status", "pending")
      .order("due_date", { ascending: true });
    const pending = allPending || [];
    if (pending.length === 0) {
      return json({ ok: false, error_code: "no_pending_payments", message: "Aucune mensualité pending à rattacher." }, 400);
    }

    // ── Find Stripe context ──
    const candidateSubId = pending.find((p: any) => p.stripe_subscription_id)?.stripe_subscription_id || null;
    const ctx = await findStripeContext(candidateSubId, contactEmail);
    if (!ctx) {
      return json({ ok: false, error_code: "no_stripe_customer", message: "Customer Stripe introuvable." }, 400);
    }
    const { customerId, mode: stripeMode, key: stripeKey } = ctx;

    // ── Vérifie si la sub référencée est encore vivante (sauf si force=true) ──
    if (candidateSubId && !force) {
      const subState = await stripeGet(stripeKey, `/subscriptions/${candidateSubId}`);
      if (subState.ok) {
        const status = String(subState.data?.status || "");
        const alive = !["canceled", "incomplete_expired", "ended"].includes(status);
        if (alive) {
          return json({
            ok: false,
            error_code: "existing_sub_still_active",
            message: `La subscription Stripe ${candidateSubId} est encore active (status=${status}). Refuse de créer un doublon. Passe force=true si vraiment voulu.`,
            existing_sub_id: candidateSubId,
            existing_sub_status: status,
          }, 409);
        }
      }
    }

    // ── Find payment method ──
    const pmId = await findDefaultPaymentMethod(stripeKey, customerId);
    if (!pmId) {
      return json({
        ok: false,
        error_code: "no_payment_method",
        message: "Aucune carte enregistrée sur le customer Stripe. Impossible de créer une sub auto.",
      }, 400);
    }

    // ── Vérifie montants égaux ──
    const firstAmount = Number(pending[0].amount);
    const allSame = pending.every((p: any) => Math.abs(Number(p.amount) - firstAmount) < 0.011);
    if (!allSame) {
      return json({
        ok: false,
        error_code: "amounts_differ",
        message: "Les montants des pending ne sont pas égaux. Création de sub Stripe impossible (utiliser des subs séparées).",
        amounts: pending.map((p: any) => Number(p.amount)),
      }, 400);
    }

    // ── Sécurité : la première pending doit être dans le futur ──
    const todayYmd = new Date().toISOString().slice(0, 10);
    if (pending[0].due_date <= todayYmd) {
      return json({
        ok: false,
        error_code: "first_pending_in_past",
        message: `La première pending ${pending[0].due_date} est dans le passé. Déclenche-la manuellement d'abord ou décale-la.`,
      }, 400);
    }

    // ── Create new Stripe Sub ──
    const anchorEpoch = ymdToEpoch(pending[0].due_date);
    const lastEpoch = ymdToEpoch(pending[pending.length - 1].due_date);
    const cancelAtEpoch = lastEpoch + 86400;

    // ⚠️ Stripe Subscriptions API n'accepte PAS price_data.product_data —
    // il faut un product ID. On crée un Product à la volée.
    const prodRes = await stripePostForm(stripeKey, "/products", {
      name: `Mensualités — ${sale.product || "Vente"} (sale ${saleId.slice(0, 8)})`,
      "metadata[sale_id]": saleId,
      "metadata[created_by]": "repair-sale-subscription",
    });
    if (!prodRes.ok || !prodRes.data?.id) {
      return json({
        ok: false,
        error_code: "stripe_product_creation_failed",
        message: prodRes.data?.error?.message || `Stripe returned ${prodRes.status}`,
        stripe_response: prodRes.data,
      }, 502);
    }
    const productId = String(prodRes.data.id);

    // ⚠️ Pas de billing_cycle_anchor : Stripe le calcule auto depuis trial_end.
    // anchor=trial_end + proration_behavior=none → "anchored invoice must be prorated"
    const subRes = await stripePostForm(stripeKey, "/subscriptions", {
      customer: customerId,
      "items[0][price_data][currency]": "eur",
      "items[0][price_data][product]": productId,
      "items[0][price_data][unit_amount]": String(Math.round(firstAmount * 100)),
      "items[0][price_data][recurring][interval]": "month",
      "items[0][price_data][recurring][interval_count]": "1",
      trial_end: String(anchorEpoch),
      cancel_at: String(cancelAtEpoch),
      default_payment_method: pmId,
      collection_method: "charge_automatically",
      "metadata[sale_id]": saleId,
      "metadata[repaired_by]": ceoEmail,
      "metadata[old_subscription]": candidateSubId || "",
      "metadata[trigger]": "repair_sale_subscription",
    });

    if (!subRes.ok || !subRes.data?.id) {
      return json({
        ok: false,
        error_code: "stripe_sub_creation_failed",
        message: subRes.data?.error?.message || `Stripe returned ${subRes.status}`,
        stripe_response: subRes.data,
      }, 502);
    }

    const newSubId = String(subRes.data.id);
    const nowIso = new Date().toISOString();

    // ── Update rows pending avec le nouveau sub_id ──
    for (const p of pending) {
      await sb
        .from("payments")
        .update({ stripe_subscription_id: newSubId, updated_at: nowIso })
        .eq("id", p.id);
    }

    return json({
      ok: true,
      sale_id: saleId,
      new_subscription_id: newSubId,
      old_subscription_id: candidateSubId,
      attached_payments: pending.map((p: any) => ({
        id: p.id,
        payment_number: p.payment_number,
        due_date: p.due_date,
        amount: Number(p.amount),
      })),
      stripe_mode: stripeMode,
      anchor_date: pending[0].due_date,
      cancel_after: pending[pending.length - 1].due_date,
    });
  } catch (err: any) {
    console.error("[repair-sale-subscription] internal error", err);
    return json({ ok: false, error_code: "internal", message: err?.message || String(err) }, 500);
  }
});
