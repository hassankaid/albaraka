// ═══════════════════════════════════════════════════════════════════════════
// reschedule-fouad-day6 — One-shot : décale les prélèvements Fouad Benzerga du 5 au 6 du mois
//
// Contexte : adjust-fouad-schedule du 2026-05-26 a créé sub_sched_1TbJSYJX0OcQy7IOfMo6ctms
// avec 1ère échéance le 5 juin 2026 (12 × 96,15€ + 1 × 96,19€ = 1 249,99€).
// Le client a demandé à décaler d'1 jour : prélèvement le 6 du mois au lieu du 5.
//
// Carte forcée : 1698 (pm_1TMGuvJX0OcQy7IOQ8wIM4Be) — choix client malgré expiration 09/2026.
//
// Steps :
//   1. GET old schedule pour récupérer product_id depuis ses phases
//   2. CANCEL old schedule (status not_started, donc safe)
//   3. CREATE 2 new prices 96,15€ et 96,19€ sur le même product (idempotent)
//   4. CREATE new schedule avec start_date = 6 juin 2026 + payment_method 1698 forcé
//   5. UPDATE BDD payments : due_date YYYY-MM-05 → YYYY-MM-06 + nouveau schedule_id
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

// Constants — operation déjà terminée et BDD figée
const CUSTOMER_ID = "cus_TxyLmMhNtHVSAx";
const OLD_SCHEDULE_ID = "sub_sched_1TbJSYJX0OcQy7IOfMo6ctms";
const PAYMENT_METHOD_ID = "pm_1TMGuvJX0OcQy7IOQ8wIM4Be"; // carte 1698, choix client
const SALE_ID = "cbdcf8af-ef04-4024-aaa2-b2c725c0bedf";

// Nouvelle date de départ : 6 juin 2026 00:00:00 UTC
const PHASE_1_START_NEW = Math.floor(new Date("2026-06-06T00:00:00Z").getTime() / 1000);

function flattenForm(obj: any, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      v.forEach((item, idx) => {
        if (typeof item === "object" && item !== null) Object.assign(out, flattenForm(item, `${key}[${idx}]`));
        else out[`${key}[${idx}]`] = String(item);
      });
    } else if (typeof v === "object") Object.assign(out, flattenForm(v, key));
    else out[key] = String(v);
  }
  return out;
}

async function stripeApi(method: string, path: string, body?: Record<string, any>): Promise<any> {
  const formBody = body ? new URLSearchParams(flattenForm(body)).toString() : undefined;
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
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!res.ok) {
    throw new Error(
      `Stripe ${method} ${path} → ${res.status}: ${JSON.stringify(parsed?.error ?? parsed).slice(0, 500)}`,
    );
  }
  return parsed;
}

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b, null, 2), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!STRIPE_KEY) return json({ error: "STRIPE_SECRET_KEY missing" }, 500);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const log: any[] = [];

    // ── STEP 1: GET old schedule + verify status not_started ──────────────
    const oldSchedule = await stripeApi("GET", `subscription_schedules/${OLD_SCHEDULE_ID}`);
    const oldStatus = oldSchedule.status;
    log.push({ step: "1_get_old_schedule", id: OLD_SCHEDULE_ID, status: oldStatus });

    if (oldStatus === "completed" || oldStatus === "canceled" || oldStatus === "released") {
      return json({
        error: `Old schedule status is ${oldStatus} — nothing to do or already handled. Manual review required.`,
        log,
      }, 400);
    }

    // Récupère le product_id depuis la 1ère phase de l'ancien schedule
    const oldPriceId = oldSchedule.phases?.[0]?.items?.[0]?.price;
    if (!oldPriceId) throw new Error("Could not extract price from old schedule phase 0");
    const oldPrice = await stripeApi("GET", `prices/${oldPriceId}`);
    const productId = oldPrice.product;
    if (!productId) throw new Error("Could not extract product from old price");
    log.push({ step: "1b_extracted_product", product_id: productId, ref_price: oldPriceId });

    // ── STEP 2: Verify payment_method 1698 is attached to customer ────────
    const pm = await stripeApi("GET", `payment_methods/${PAYMENT_METHOD_ID}`);
    if (pm.customer !== CUSTOMER_ID) {
      return json({
        error: `Payment method ${PAYMENT_METHOD_ID} is attached to ${pm.customer}, not ${CUSTOMER_ID}`,
        log,
      }, 400);
    }
    const cardLast4 = pm.card?.last4 ?? "????";
    const cardExpMonth = pm.card?.exp_month;
    const cardExpYear = pm.card?.exp_year;
    log.push({
      step: "2_verify_payment_method",
      pm_id: PAYMENT_METHOD_ID,
      last4: cardLast4,
      exp: `${cardExpMonth}/${cardExpYear}`,
    });

    // ── STEP 3: CANCEL old schedule (status not_started → cancelable) ─────
    const canceled = await stripeApi("POST", `subscription_schedules/${OLD_SCHEDULE_ID}/cancel`);
    log.push({ step: "3_cancel_old_schedule", id: canceled.id, new_status: canceled.status });

    // ── STEP 4: Create 2 new prices on same product (idempotent) ──────────
    const price96_15 = await stripeApi("POST", "prices", {
      product: productId,
      unit_amount: 9615,
      currency: "eur",
      recurring: { interval: "month", interval_count: 1 },
      nickname: "Fouad - 96,15€/mois (reschedule day 6, 2026-05-26)",
      metadata: { purpose: "fouad_reschedule_day6_main", sale_id: SALE_ID },
    });
    log.push({ step: "4a_create_price_96_15", price_id: price96_15.id });

    const price96_19 = await stripeApi("POST", "prices", {
      product: productId,
      unit_amount: 9619,
      currency: "eur",
      recurring: { interval: "month", interval_count: 1 },
      nickname: "Fouad - 96,19€ (last payment, reschedule day 6, 2026-05-26)",
      metadata: { purpose: "fouad_reschedule_day6_last", sale_id: SALE_ID },
    });
    log.push({ step: "4b_create_price_96_19", price_id: price96_19.id });

    // ── STEP 5: Create new schedule with start_date = 6 juin 2026 ─────────
    const newSchedule = await stripeApi("POST", "subscription_schedules", {
      customer: CUSTOMER_ID,
      start_date: PHASE_1_START_NEW,
      end_behavior: "cancel",
      default_settings: {
        default_payment_method: PAYMENT_METHOD_ID, // force carte 1698
        collection_method: "charge_automatically",
      },
      phases: [
        { items: [{ price: price96_15.id, quantity: 1 }], iterations: 12, proration_behavior: "none" },
        { items: [{ price: price96_19.id, quantity: 1 }], iterations: 1, proration_behavior: "none" },
      ],
      metadata: {
        purpose: "fouad_reschedule_day6_2026_05_26",
        sale_id: SALE_ID,
        old_schedule_id: OLD_SCHEDULE_ID,
        previous_due_day: "5",
        new_due_day: "6",
      },
    });
    log.push({
      step: "5_create_new_schedule",
      id: newSchedule.id,
      status: newSchedule.status,
      start_date: new Date(newSchedule.phases[0].start_date * 1000).toISOString(),
      phases: newSchedule.phases.length,
    });

    // ── STEP 6: UPDATE BDD payments : due_date day 5 → day 6 + new schedule_id ─
    // Récupère les payments pending
    const { data: pendingPayments, error: fetchErr } = await supabase
      .from("payments")
      .select("id, payment_number, due_date, amount, notes")
      .eq("sale_id", SALE_ID)
      .eq("status", "pending")
      .order("payment_number", { ascending: true });
    if (fetchErr) throw new Error(`BDD fetch pending: ${fetchErr.message}`);
    log.push({ step: "6_fetch_pending", count: pendingPayments?.length ?? 0 });

    let updatedCount = 0;
    for (const p of pendingPayments ?? []) {
      // Passe le 5 du mois au 6 du mois : la date est YYYY-MM-DD ; on remplace le DD final.
      const oldDate = p.due_date as string; // ex: "2026-06-05"
      const parts = oldDate.split("-");
      if (parts.length !== 3) continue;
      const newDueDate = `${parts[0]}-${parts[1]}-06`; // force jour 06
      const newNotes =
        `${p.notes ?? ""} | Reschedule day 6 (2026-05-26). New schedule: ${newSchedule.id}`.trim();
      const { error: updErr } = await supabase
        .from("payments")
        .update({
          due_date: newDueDate,
          stripe_subscription_id: newSchedule.id,
          notes: newNotes,
        })
        .eq("id", p.id);
      if (updErr) throw new Error(`BDD update ${p.id}: ${updErr.message}`);
      updatedCount++;
    }
    log.push({ step: "6b_updated_payments", updated_count: updatedCount });

    return json({
      success: true,
      summary: {
        old_schedule_id: OLD_SCHEDULE_ID,
        old_schedule_status_after_cancel: canceled.status,
        new_schedule_id: newSchedule.id,
        new_schedule_status: newSchedule.status,
        payment_method_forced: PAYMENT_METHOD_ID,
        card_last4: cardLast4,
        card_exp: `${cardExpMonth}/${cardExpYear}`,
        new_first_due_date: new Date(newSchedule.phases[0].start_date * 1000).toISOString().slice(0, 10),
        new_prices: { p1: price96_15.id, p2: price96_19.id },
        bdd_payments_updated: updatedCount,
      },
      log,
    });
  } catch (e: any) {
    console.error("[reschedule-fouad-day6] error", e);
    return json({ error: e?.message ?? String(e), stack: e?.stack }, 500);
  }
});
