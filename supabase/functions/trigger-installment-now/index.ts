// ═══════════════════════════════════════════════════════════════════════════
// trigger-installment-now
//
// Déclenche MANUELLEMENT le prélèvement de la prochaine mensualité pending
// d'une vente, et décale les mensualités suivantes de -1 mois pour conserver
// l'espacement mensuel à partir de la nouvelle date du paiement.
//
// Workflow :
//  1. Auth CEO uniquement
//  2. Charge la row payment + verify it's the next pending de la vente
//  3. Cherche le customer Stripe (via stripe_subscription_id sinon fallback email)
//  4. Cherche le payment_method par défaut du customer
//     - Si AUCUNE carte : génère une Checkout Session one-shot et retourne
//       son URL au front (qui propose au CEO de l'envoyer au client)
//  5. Crée un PaymentIntent off-session immédiat (confirm=true, off_session=true)
//     - Sur échec (carte refusée, 3DS requis) : RIEN n'est modifié, retour erreur claire
//  6. Marque la row payment comme paid + stocke stripe_payment_intent_id
//  7. UPDATE due_date -= 1 mois pour TOUTES les rows pending suivantes (cascade)
//  8. Annule l'ancienne Stripe Subscription (si elle existe)
//  9. Crée une NOUVELLE Stripe Subscription pour les remaining pending avec :
//       billing_cycle_anchor = nouvelle due_date #(next)
//       cancel_at            = nouvelle due_date #(last) + 24h
//       montant              = remaining[0].amount (suppose montants égaux)
//     → Stripe prélève automatiquement aux nouvelles dates puis s'arrête tout seul
// 10. UPDATE stripe_subscription_id des rows pending restantes vers la nouvelle sub
//
// Body : { payment_id: string }
//
// Returns OK (200) :
//   {
//     ok: true,
//     payment_intent_id: string,
//     amount_charged: number,
//     reschedule: [{ id, old_due_date, new_due_date }, ...],
//     old_subscription_id: string | null,
//     new_subscription_id: string | null,
//     stripe_mode: "live" | "test"
//   }
//
// Returns ERROR (4xx / 5xx) :
//   {
//     ok: false,
//     error_code: "payment_not_found" | "payment_not_pending"
//               | "not_next_pending" | "no_stripe_customer"
//               | "no_payment_method" | "payment_failed"
//               | "amounts_differ" | "internal",
//     message: string,
//     checkout_url?: string,                 // si no_payment_method
//     stripe_error_code?: string,             // si payment_failed
//     stripe_decline_code?: string,           // si payment_failed
//   }
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
const PLATFORM_URL = "https://plateforme.albarakaecosysteme.com";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Stripe helpers ────────────────────────────────────────────────────────

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

async function stripeDelete(apiKey: string, path: string): Promise<StripeResult> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// Annule la sub si elle est encore "vivante" (active, past_due, trialing, unpaid).
// Idempotent : si déjà canceled / ended / incomplete_expired → no-op success.
async function safelyCancelSub(apiKey: string, subId: string): Promise<{ canceled: boolean; alreadyCanceled: boolean; error?: string }> {
  const g = await stripeGet(apiKey, `/subscriptions/${subId}`);
  if (!g.ok) {
    if (g.status === 404) return { canceled: false, alreadyCanceled: false, error: "subscription_not_found" };
    return { canceled: false, alreadyCanceled: false, error: `get_failed_${g.status}` };
  }
  const status = String(g.data?.status || "");
  const terminated = new Set(["canceled", "incomplete_expired", "ended"]);
  if (terminated.has(status)) return { canceled: false, alreadyCanceled: true };
  const d = await stripeDelete(apiKey, `/subscriptions/${subId}`);
  if (!d.ok) return { canceled: false, alreadyCanceled: false, error: `delete_failed_${d.status}_${JSON.stringify(d.data?.error ?? d.data)}` };
  return { canceled: true, alreadyCanceled: false };
}

async function findStripeContext(
  subId: string | null,
  email: string | null,
): Promise<{ customerId: string; mode: "live" | "test"; key: string } | null> {
  // 1) Si on a un subId, on essaye chaque mode pour trouver le sub + customer
  if (subId) {
    for (const [mode, key] of [["live", STRIPE_LIVE], ["test", STRIPE_TEST]] as const) {
      if (!key) continue;
      const r = await stripeGet(key, `/subscriptions/${subId}`);
      if (r.ok && r.data?.customer) {
        return { customerId: String(r.data.customer), mode, key };
      }
    }
  }
  // 2) Fallback par email
  if (email) {
    for (const [mode, key] of [["live", STRIPE_LIVE], ["test", STRIPE_TEST]] as const) {
      if (!key) continue;
      const safe = email.replace(/'/g, "\\'");
      const s = await stripeGet(key, `/customers/search?query=${encodeURIComponent(`email:'${safe}'`)}&limit=10`);
      if (!s.ok) continue;
      const customers = s.data?.data || [];
      if (customers.length === 0) continue;
      // Prend le plus récent
      const best = [...customers].sort((a: any, b: any) => (b.created || 0) - (a.created || 0))[0];
      return { customerId: String(best.id), mode, key };
    }
  }
  return null;
}

async function findDefaultPaymentMethod(key: string, customerId: string): Promise<string | null> {
  // Priorité 1 : invoice_settings.default_payment_method sur le customer
  const c = await stripeGet(key, `/customers/${customerId}`);
  const def = c.data?.invoice_settings?.default_payment_method;
  if (def && typeof def === "string") return def;
  if (def && typeof def === "object" && def.id) return String(def.id);
  // Priorité 2 : la première carte attachée au customer
  const pms = await stripeGet(key, `/customers/${customerId}/payment_methods?type=card&limit=1`);
  const first = pms.data?.data?.[0]?.id;
  return first ? String(first) : null;
}

// ─── Date helpers ──────────────────────────────────────────────────────────

// Soustrait 1 mois calendaire d'une date YYYY-MM-DD en restant strictement au
// même jour du mois quand c'est possible. Si le mois précédent n'a pas ce jour
// (ex: 31/03 → 28/02 ou 29/02), on prend le dernier jour du mois précédent.
function subtractOneMonth(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  let newY = y;
  let newM = m - 1;
  if (newM === 0) { newM = 12; newY = y - 1; }
  // Trouve le dernier jour du nouveau mois
  const lastDayOfNewMonth = new Date(Date.UTC(newY, newM, 0)).getUTCDate();
  const newD = Math.min(d, lastDayOfNewMonth);
  return `${newY}-${String(newM).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
}

// Convertit YYYY-MM-DD en timestamp UNIX UTC à 12:00 (évite les bugs DST en bord)
function ymdToEpoch(ymd: string, hour = 12): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d, hour, 0, 0) / 1000);
}

// ─── Handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error_code: "method_not_allowed" }, 405);

  try {
    // ── Auth CEO ──
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

    // ── Body ──
    const body = await req.json().catch(() => ({}));
    const paymentId = body?.payment_id as string | undefined;
    if (!paymentId) return json({ ok: false, error_code: "payment_id_required", message: "Le champ payment_id est requis." }, 400);

    // ── 1. Load payment ──
    const { data: payment, error: pErr } = await sb
      .from("payments")
      .select("id, sale_id, amount, due_date, status, payment_number, total_payments, stripe_subscription_id, notes")
      .eq("id", paymentId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!payment) return json({ ok: false, error_code: "payment_not_found", message: "Mensualité introuvable." }, 404);
    if (payment.status !== "pending") {
      return json({
        ok: false,
        error_code: "payment_not_pending",
        message: `Cette mensualité a le statut "${payment.status}", impossible de la déclencher.`,
        current_status: payment.status,
      }, 400);
    }
    if (!payment.sale_id) {
      return json({ ok: false, error_code: "no_sale", message: "Mensualité non rattachée à une vente." }, 400);
    }

    // ── 2. Load sale + contact (pour l'email) ──
    const { data: sale } = await sb
      .from("sales")
      .select("id, contact_id, product")
      .eq("id", payment.sale_id)
      .maybeSingle();
    if (!sale?.contact_id) {
      return json({ ok: false, error_code: "no_contact", message: "Vente sans contact rattaché." }, 400);
    }
    const { data: contact } = await sb
      .from("contacts")
      .select("email")
      .eq("id", sale.contact_id)
      .maybeSingle();
    const contactEmail = contact?.email || null;

    // ── 3. Get all pending payments for this sale, sorted by due_date asc ──
    const { data: allPending, error: pendingErr } = await sb
      .from("payments")
      .select("id, amount, due_date, payment_number, stripe_subscription_id")
      .eq("sale_id", payment.sale_id)
      .eq("status", "pending")
      .order("due_date", { ascending: true });
    if (pendingErr) throw pendingErr;
    const pending = allPending || [];
    if (pending.length === 0 || pending[0].id !== paymentId) {
      return json({
        ok: false,
        error_code: "not_next_pending",
        message: "Cette mensualité n'est pas la prochaine pending de la vente. Déclenche d'abord les précédentes.",
        next_pending_id: pending[0]?.id ?? null,
        next_pending_due: pending[0]?.due_date ?? null,
      }, 400);
    }
    const remaining = pending.slice(1); // payments à reschedule (toutes celles APRÈS celle qu'on charge)

    // ── 4. Find Stripe customer ──
    // On essaye d'abord avec stripe_subscription_id de la row, sinon de n'importe
    // quelle row de la vente, sinon fallback email.
    const candidateSubId = payment.stripe_subscription_id
      || pending.find((p) => p.stripe_subscription_id)?.stripe_subscription_id
      || null;
    const ctx = await findStripeContext(candidateSubId, contactEmail);
    if (!ctx) {
      return json({
        ok: false,
        error_code: "no_stripe_customer",
        message: "Customer Stripe introuvable pour ce client (ni via sub, ni via email).",
      }, 400);
    }
    const { customerId, mode: stripeMode, key: stripeKey } = ctx;

    // ── 5. Get default payment method ──
    const pmId = await findDefaultPaymentMethod(stripeKey, customerId);
    if (!pmId) {
      // Fallback : génère une Checkout Session one-shot et retourne son URL
      const sess = await stripePostForm(stripeKey, "/checkout/sessions", {
        mode: "payment",
        customer: customerId,
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][product_data][name]": `Mensualité ${payment.payment_number}/${payment.total_payments} — ${sale.product || "Vente"}`,
        "line_items[0][price_data][unit_amount]": String(Math.round(Number(payment.amount) * 100)),
        "line_items[0][quantity]": "1",
        success_url: `${PLATFORM_URL}/payments?triggered=${paymentId}`,
        cancel_url: `${PLATFORM_URL}/payments`,
        "metadata[sale_id]": sale.id,
        "metadata[payment_id]": paymentId,
        "metadata[trigger]": "manual_admin_no_pm",
      });
      if (!sess.ok) {
        return json({
          ok: false,
          error_code: "checkout_creation_failed",
          message: "Aucune carte enregistrée + échec de création du lien Stripe.",
          stripe_error: sess.data?.error?.message,
        }, 502);
      }
      return json({
        ok: false,
        error_code: "no_payment_method",
        message: "Aucune carte enregistrée sur le customer Stripe. Un lien de paiement Stripe one-shot a été généré : envoie-le au client.",
        checkout_url: sess.data?.url,
        amount_to_charge: Number(payment.amount),
      }, 200);
    }

    // ── 6. Create PaymentIntent off-session immédiat ──
    const amountCents = Math.round(Number(payment.amount) * 100);
    const piRes = await stripePostForm(stripeKey, "/payment_intents", {
      amount: amountCents,
      currency: "eur",
      customer: customerId,
      payment_method: pmId,
      confirm: "true",
      off_session: "true",
      description: `Mensualité ${payment.payment_number}/${payment.total_payments} — déclenchement manuel CEO`,
      "metadata[sale_id]": sale.id,
      "metadata[payment_id]": paymentId,
      "metadata[trigger]": "manual_admin",
      "metadata[ceo_email]": ceoEmail,
    });

    if (!piRes.ok || piRes.data?.status !== "succeeded") {
      const err = piRes.data?.error || piRes.data?.last_payment_error || {};
      return json({
        ok: false,
        error_code: "payment_failed",
        message: err?.message || `PaymentIntent non succeeded (status=${piRes.data?.status})`,
        stripe_error_code: err?.code,
        stripe_decline_code: err?.decline_code,
        payment_intent_id: piRes.data?.id || null,
        payment_intent_status: piRes.data?.status || null,
      }, 402);
    }

    const paymentIntentId = String(piRes.data.id);
    const now = new Date();
    const nowIso = now.toISOString();
    const todayYmd = nowIso.slice(0, 10);

    // ── 7. Marque la row payment comme paid ──
    const noteAppended = [
      payment.notes,
      `[${todayYmd}] Déclenchement manuel CEO (${ceoEmail}). PaymentIntent ${paymentIntentId}. Stripe mode: ${stripeMode}.`,
    ].filter(Boolean).join("\n");
    const { error: updPayErr } = await sb
      .from("payments")
      .update({
        status: "paid",
        paid_at: nowIso,
        stripe_payment_intent_id: paymentIntentId,
        notes: noteAppended,
        updated_at: nowIso,
      })
      .eq("id", paymentId);
    if (updPayErr) throw updPayErr;

    // ── 8. Reschedule remaining: due_date -= 1 mois ──
    const reschedule: { id: string; old_due_date: string; new_due_date: string; amount: number }[] = [];
    for (const r of remaining) {
      const newDate = subtractOneMonth(r.due_date);
      const { error: rErr } = await sb
        .from("payments")
        .update({ due_date: newDate, updated_at: nowIso })
        .eq("id", r.id);
      if (rErr) throw rErr;
      reschedule.push({
        id: r.id,
        old_due_date: r.due_date,
        new_due_date: newDate,
        amount: Number(r.amount),
      });
    }

    // ── 9. Annule l'ancienne sub Stripe ──
    let oldSubId: string | null = candidateSubId;
    let oldSubCanceled = false;
    let oldSubAlreadyCanceled = false;
    if (oldSubId) {
      const cancelRes = await safelyCancelSub(stripeKey, oldSubId);
      oldSubCanceled = cancelRes.canceled;
      oldSubAlreadyCanceled = cancelRes.alreadyCanceled;
      if (cancelRes.error && cancelRes.error !== "subscription_not_found") {
        console.warn(`[trigger-installment-now] cancel old sub ${oldSubId} returned: ${cancelRes.error}`);
      }
    }

    // ── 10. Crée une NOUVELLE sub pour les remaining (si >= 1) ──
    let newSubId: string | null = null;
    let newSubWarning: string | null = null;
    if (remaining.length > 0) {
      // Vérifie que toutes les remaining ont le même montant à 1 centime près
      const firstAmount = reschedule[0].amount;
      const allSame = reschedule.every((r) => Math.abs(r.amount - firstAmount) < 0.011);
      if (!allSame) {
        newSubWarning = "amounts_differ_no_new_sub";
        console.warn("[trigger-installment-now] remaining amounts differ, skipping new sub. Manual handling required.");
      } else {
        const anchorEpoch = ymdToEpoch(reschedule[0].new_due_date);
        const lastEpoch = ymdToEpoch(reschedule[reschedule.length - 1].new_due_date);
        const cancelAtEpoch = lastEpoch + 86400; // +24h après la dernière échéance

        // ⚠️ Stripe Subscriptions API n'accepte PAS `price_data.product_data`
        // (contrairement à Checkout Sessions). Il faut soit un `product` ID
        // existant, soit créer un Product à la volée puis référencer son ID.
        // On crée un Product spécifique à cette vente pour traçabilité.
        const prodRes = await stripePostForm(stripeKey, "/products", {
          name: `Mensualités — ${sale.product || "Vente"} (sale ${sale.id.slice(0, 8)})`,
          "metadata[sale_id]": sale.id,
          "metadata[created_by]": "trigger-installment-now",
        });
        if (!prodRes.ok || !prodRes.data?.id) {
          newSubWarning = `product_creation_failed: ${prodRes.data?.error?.message || prodRes.status}`;
          console.error("[trigger-installment-now] product creation failed", prodRes.data);
        } else {
          const productId = String(prodRes.data.id);
          // ⚠️ Quand billing_cycle_anchor est dans le futur, Stripe exige aussi
          // `trial_end` au même timestamp + `proration_behavior=none` pour éviter
          // une facture de prorata immédiate.
          const subRes = await stripePostForm(stripeKey, "/subscriptions", {
            customer: customerId,
            "items[0][price_data][currency]": "eur",
            "items[0][price_data][product]": productId,
            "items[0][price_data][unit_amount]": String(Math.round(firstAmount * 100)),
            "items[0][price_data][recurring][interval]": "month",
            "items[0][price_data][recurring][interval_count]": "1",
            billing_cycle_anchor: String(anchorEpoch),
            trial_end: String(anchorEpoch),
            cancel_at: String(cancelAtEpoch),
            proration_behavior: "none",
            default_payment_method: pmId,
            collection_method: "charge_automatically",
            "metadata[sale_id]": sale.id,
            "metadata[replaces_subscription]": oldSubId || "",
            "metadata[created_by_trigger_payment_id]": paymentId,
            "metadata[trigger]": "manual_admin_reschedule",
          });
          if (subRes.ok && subRes.data?.id) {
            newSubId = String(subRes.data.id);
            for (const r of remaining) {
              await sb
                .from("payments")
                .update({ stripe_subscription_id: newSubId, updated_at: nowIso })
                .eq("id", r.id);
            }
          } else {
            newSubWarning = `new_sub_creation_failed: ${subRes.data?.error?.message || subRes.status}`;
            console.error("[trigger-installment-now] new sub creation failed", subRes.data);
          }
        }
      }
    }

    return json({
      ok: true,
      payment_intent_id: paymentIntentId,
      amount_charged: Number(payment.amount),
      reschedule,
      old_subscription_id: oldSubId,
      old_subscription_canceled: oldSubCanceled,
      old_subscription_already_canceled: oldSubAlreadyCanceled,
      new_subscription_id: newSubId,
      new_sub_warning: newSubWarning,
      stripe_mode: stripeMode,
      sale_id: sale.id,
      payment_id: paymentId,
    });
  } catch (err: any) {
    console.error("[trigger-installment-now] internal error", err);
    return json({
      ok: false,
      error_code: "internal",
      message: err?.message || String(err),
    }, 500);
  }
});
