// ═══════════════════════════════════════════════════════════════════════════
// adjust-mekhlouf-schedule — One-shot : convertit la sub past_due en
// subscription_schedule à 2 phases pour KEMIL MEKHLOUF.
//
// Phase 1 : 6 prélèvements de 166,67€ (06/06/2026 → 06/11/2026)
// Phase 2 : 1 prélèvement de 166,63€ (06/12/2026)
// End      : cancel auto
// Total    : 1166,65€ exact (+ 833,35€ déjà encaissé = 2000€ pile)
//
// Steps :
//   1. Get sub current (récupère payment_method de fallback)
//   2. Get product depuis le price existant
//   3. VOID l'invoice past_due du 24/05
//   4. Cancel la sub actuelle (immédiat)
//   5. Create new price 166,63€/mois sur le même produit
//   6. Create subscription_schedule from scratch avec 2 phases
//   7. INSERT 7 nouveaux payments BDD (5 à 11)
//   8. UPDATE total_payments=11 sur les 4 paid existants
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

// Hardcoded for this one-shot operation
const SUB_ID = "sub_1T4LKtJX0OcQy7IOwC8BcztM";
const PAST_DUE_INVOICE_ID = "in_1Tabl7JX0OcQy7IOUEgl3Xxm";
const EXISTING_PRICE_ID = "price_1T4LCUJX0OcQy7IOeMGwxSOC";
const CUSTOMER_ID = "cus_U2QB99IfJrb86J";
const SALE_ID = "da49c56b-8e84-49f5-b2eb-15a2d9e45b6b";

// 06/06/2026 00:00:00 UTC
const PHASE_1_START = Math.floor(new Date("2026-06-06T00:00:00Z").getTime() / 1000);

function flattenForm(obj: any, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      v.forEach((item, idx) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(out, flattenForm(item, `${key}[${idx}]`));
        } else {
          out[`${key}[${idx}]`] = String(item);
        }
      });
    } else if (typeof v === "object") {
      Object.assign(out, flattenForm(v, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

async function stripeApi(
  method: string,
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const formBody = body
    ? new URLSearchParams(flattenForm(body)).toString()
    : undefined;
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      ...(formBody ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: formBody,
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `Stripe ${method} ${path} → ${res.status}: ${JSON.stringify(parsed?.error ?? parsed).slice(0, 500)}`,
    );
  }
  return parsed;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!STRIPE_KEY) return json({ error: "STRIPE_SECRET_KEY missing in env" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const log: any[] = [];

    // ─── STEP 1 : Get sub + customer pour récupérer payment_method ────
    const sub = await stripeApi("GET", `subscriptions/${SUB_ID}`);
    let paymentMethodId: string | null =
      typeof sub.default_payment_method === "string"
        ? sub.default_payment_method
        : null;
    if (!paymentMethodId) {
      const customer = await stripeApi("GET", `customers/${CUSTOMER_ID}`);
      paymentMethodId =
        customer.invoice_settings?.default_payment_method ?? null;
      if (!paymentMethodId) {
        // Fallback : prend le premier payment_method attached
        const pms = await stripeApi(
          "GET",
          `customers/${CUSTOMER_ID}/payment_methods?limit=1`,
        );
        paymentMethodId = pms.data?.[0]?.id ?? null;
      }
    }
    if (!paymentMethodId) {
      throw new Error(
        "No payment method found for customer — schedule can't auto-charge",
      );
    }
    log.push({ step: "1_get_sub_pm", payment_method_id: paymentMethodId });

    // ─── STEP 2 : Get product depuis le price existant ────────────────
    const existingPrice = await stripeApi("GET", `prices/${EXISTING_PRICE_ID}`);
    const productId = existingPrice.product;
    if (!productId) throw new Error("No product on existing price");
    log.push({ step: "2_get_product", product_id: productId });

    // ─── STEP 3 : VOID la past_due invoice ───────────────────────────
    const voided = await stripeApi(
      "POST",
      `invoices/${PAST_DUE_INVOICE_ID}/void`,
    );
    log.push({
      step: "3_void_invoice",
      invoice_id: voided.id,
      status: voided.status,
    });

    // ─── STEP 4 : Cancel la sub actuelle (immédiat) ──────────────────
    const canceled = await stripeApi("DELETE", `subscriptions/${SUB_ID}`);
    log.push({ step: "4_cancel_sub", status: canceled.status });

    // ─── STEP 5 : Create new price 166,63€/mois ──────────────────────
    const newPrice = await stripeApi("POST", "prices", {
      product: productId,
      unit_amount: 16663,
      currency: "eur",
      recurring: { interval: "month", interval_count: 1 },
      nickname: "Mekhlouf - last payment 166,63€ (correction 2026-05-24)",
      metadata: {
        purpose: "mekhlouf_last_payment_split_plan",
        sale_id: SALE_ID,
      },
    });
    log.push({ step: "5_create_price", price_id: newPrice.id });

    // ─── STEP 6 : Create subscription_schedule ───────────────────────
    const schedule = await stripeApi("POST", "subscription_schedules", {
      customer: CUSTOMER_ID,
      start_date: PHASE_1_START,
      end_behavior: "cancel",
      default_settings: {
        default_payment_method: paymentMethodId,
        collection_method: "charge_automatically",
      },
      phases: [
        {
          items: [{ price: EXISTING_PRICE_ID, quantity: 1 }],
          iterations: 6,
          proration_behavior: "none",
        },
        {
          items: [{ price: newPrice.id, quantity: 1 }],
          iterations: 1,
          proration_behavior: "none",
        },
      ],
      metadata: {
        purpose: "mekhlouf_correction_plan_2026_05_24",
        sale_id: SALE_ID,
        old_sub_id: SUB_ID,
      },
    });
    log.push({
      step: "6_create_schedule",
      schedule_id: schedule.id,
      status: schedule.status,
      phases_count: schedule.phases?.length,
    });

    // ─── STEP 7 : INSERT 7 nouveaux payments BDD ─────────────────────
    const newPaymentsData = [
      { num: 5, amount: 166.67, due: "2026-06-06" },
      { num: 6, amount: 166.67, due: "2026-07-06" },
      { num: 7, amount: 166.67, due: "2026-08-06" },
      { num: 8, amount: 166.67, due: "2026-09-06" },
      { num: 9, amount: 166.67, due: "2026-10-06" },
      { num: 10, amount: 166.67, due: "2026-11-06" },
      { num: 11, amount: 166.63, due: "2026-12-06" },
    ];

    const { data: inserted, error: insertErr } = await supabase
      .from("payments")
      .insert(
        newPaymentsData.map((p) => ({
          sale_id: SALE_ID,
          payment_number: p.num,
          total_payments: 11,
          amount: p.amount,
          due_date: p.due,
          status: "pending",
          notes: `Auto-generated by adjust-mekhlouf-schedule (correction 2026-05-24). Stripe schedule: ${schedule.id}`,
          stripe_subscription_id: schedule.id, // schedule_id (la sub Stripe sera créée à 06/06)
        })),
      )
      .select("id, payment_number, amount, due_date");

    if (insertErr) {
      throw new Error(`BDD insert error: ${insertErr.message}`);
    }
    log.push({ step: "7_insert_payments", count: inserted?.length, rows: inserted });

    // ─── STEP 8 : UPDATE total_payments=11 sur les 4 paid existants ──
    const { error: updateErr, count } = await supabase
      .from("payments")
      .update({ total_payments: 11 }, { count: "exact" })
      .eq("sale_id", SALE_ID)
      .eq("status", "paid");

    if (updateErr) {
      throw new Error(`BDD update error: ${updateErr.message}`);
    }
    log.push({ step: "8_update_total_payments_existing", updated_count: count });

    return json({
      success: true,
      summary: {
        stripe_schedule_id: schedule.id,
        stripe_schedule_status: schedule.status,
        new_price_id: newPrice.id,
        voided_invoice: PAST_DUE_INVOICE_ID,
        canceled_sub: SUB_ID,
        bdd_payments_inserted: inserted?.length,
        bdd_payments_updated: count,
      },
      log,
    });
  } catch (e: any) {
    console.error("[adjust-mekhlouf] error", e);
    return json({ error: e?.message ?? String(e), stack: e?.stack }, 500);
  }
});
