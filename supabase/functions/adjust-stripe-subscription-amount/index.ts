// adjust-stripe-subscription-amount
//
// Modifie le montant total d'une vente sans annuler la subscription Stripe
// existante ni demander au client de re-saisir sa carte. Use case typique :
// closing à 2500 € au lieu de 2000 €, on veut rectifier pour que les
// mensualités restantes soldent le bon montant.
//
// Workflow :
//   1. Lookup sale + payments (paid + pending)
//   2. Compte le déjà payé, calcule le restant à payer (new_total - paid)
//   3. Calcule la nouvelle mensualité (algorithme first-absorbs-extras
//      pour gérer les centimes au cent près)
//   4. PATCH le subscription_item Stripe avec le nouveau unit_amount
//   5. Si centimes résiduels > 0, ajoute un invoice_item one-shot pour
//      les absorber sur la PROCHAINE invoice (M2)
//   6. Update payments BDD : pending → nouveau montant
//   7. Update sales.amount_ht
//   8. Recalcule les commissions pending au prorata
//
// Idempotency : non implémentée (un double-call écrasera de la même façon,
// pas de risque de double-débit Stripe sur cette opération).
//
// Permission : CEO uniquement (vérifié côté frontend via isCeo gate).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_SECRET_KEY_LIVE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_SECRET_KEY_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function flattenParams(params: Record<string, unknown>): URLSearchParams {
  const out = new URLSearchParams();
  const walk = (value: unknown, prefix: string) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${prefix}[${i}]`));
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, prefix ? `${prefix}[${k}]` : k);
      }
    } else {
      out.append(prefix, String(value));
    }
  };
  walk(params, "");
  return out;
}

async function stripeFetch<T = unknown>(
  apiKey: string,
  path: string,
  params: Record<string, unknown>,
  method = "POST",
): Promise<T> {
  const body = method === "GET" ? undefined : flattenParams(params).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe ${path} ${res.status}: ${err}`);
  }
  return (await res.json()) as T;
}

interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  items: { data: Array<{ id: string; price: { product: string; unit_amount: number } }> };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const saleId = String(body?.sale_id || "").trim();
    const newTotal = Number(body?.new_total_amount);

    if (!saleId) return json({ error: "sale_id_required" }, 400);
    if (!Number.isFinite(newTotal) || newTotal <= 0) {
      return json({ error: "new_total_amount_invalid", got: body?.new_total_amount }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ─── 1. Lookup sale + payments ──────────────────────────────────
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .select("id, amount_ht, mensualites, payment_status, product")
      .eq("id", saleId)
      .maybeSingle();
    if (saleErr) {
      console.error("[adjust] sale lookup failed:", saleErr);
      return json({ error: "db_error", message: saleErr.message }, 500);
    }
    if (!sale) return json({ error: "sale_not_found" }, 404);

    const { data: payments, error: paymentsErr } = await supabase
      .from("payments")
      .select("id, payment_number, amount, status, stripe_subscription_id")
      .eq("sale_id", saleId)
      .order("payment_number", { ascending: true });
    if (paymentsErr || !payments) {
      return json({ error: "payments_lookup_failed", message: paymentsErr?.message }, 500);
    }

    const paidPayments = payments.filter((p) => p.status === "paid");
    const pendingPayments = payments.filter((p) => p.status === "pending");
    if (pendingPayments.length === 0) {
      return json({ error: "no_pending_payments", message: "Aucune mensualité pending à ajuster." }, 400);
    }

    // ─── 2. Calcul des montants ─────────────────────────────────────
    const totalPaidCents = paidPayments.reduce(
      (s, p) => s + Math.round(Number(p.amount) * 100),
      0,
    );
    const newTotalCents = Math.round(newTotal * 100);
    const remainingCents = newTotalCents - totalPaidCents;

    if (remainingCents <= 0) {
      return json({
        error: "new_total_below_paid",
        message: `Le nouveau total (${(newTotalCents / 100).toFixed(2)} €) est inférieur ou égal à ce qui a déjà été encaissé (${(totalPaidCents / 100).toFixed(2)} €). Ajustement impossible.`,
      }, 400);
    }

    const nbPending = pendingPayments.length;
    // Algorithme "first-absorbs-extras" : la 1re pending absorbe les centimes
    // résiduels pour que la somme tombe juste au cent près.
    const baseCents = Math.floor(remainingCents / nbPending);
    const extraCents = remainingCents - baseCents * nbPending;
    const newAmountsCents = pendingPayments.map((_, i) =>
      i === 0 ? baseCents + extraCents : baseCents,
    );

    // ─── 3. Lookup Stripe subscription ──────────────────────────────
    const stripeSubId = pendingPayments[0].stripe_subscription_id;
    if (!stripeSubId) {
      // Pas de sub Stripe : on update seulement la BDD (vente Systeme.io ou virement)
      console.log(`[adjust] no Stripe sub for sale=${saleId} — BDD only`);
      await applyDbUpdates(supabase, saleId, newTotal, pendingPayments, newAmountsCents);
      return json({
        ok: true,
        sale_id: saleId,
        old_total: Number(sale.amount_ht),
        new_total: newTotal,
        stripe_sub_id: null,
        stripe_updated: false,
        new_unit_amount_cents: baseCents,
        first_pending_extra_cents: extraCents,
        pending_count: nbPending,
        message: "Pas de subscription Stripe trouvée — montants ajustés uniquement en BDD.",
      });
    }

    // Détection live vs test : on essaie d'abord la clé live, fallback test
    let apiKey = STRIPE_SECRET_KEY_LIVE;
    let isTestMode = false;
    let sub: StripeSubscription | null = null;

    try {
      sub = await stripeFetch<StripeSubscription>(
        apiKey,
        `/subscriptions/${stripeSubId}`,
        {},
        "GET",
      );
    } catch {
      // Fallback test
      apiKey = STRIPE_SECRET_KEY_TEST;
      isTestMode = true;
      try {
        sub = await stripeFetch<StripeSubscription>(
          apiKey,
          `/subscriptions/${stripeSubId}`,
          {},
          "GET",
        );
      } catch (e) {
        console.error("[adjust] Stripe sub not found on live or test:", e);
        return json({
          error: "stripe_sub_not_found",
          message: "La subscription Stripe est introuvable (ni en live ni en test).",
        }, 404);
      }
    }

    if (!sub) {
      return json({ error: "stripe_sub_not_found" }, 404);
    }

    if (sub.status === "canceled" || sub.status === "incomplete_expired") {
      return json({
        error: "stripe_sub_canceled",
        message: `La subscription Stripe est dans l'état "${sub.status}". Impossible d'ajuster le montant. Utilise "Modifier le plan" pour générer un nouveau lien.`,
      }, 400);
    }

    const subItem = sub.items?.data?.[0];
    if (!subItem) {
      return json({ error: "no_sub_item", message: "Subscription Stripe sans item — état inattendu." }, 500);
    }
    const productId = subItem.price?.product;

    // ─── 4. PATCH subscription_item Stripe ──────────────────────────
    // Nouveau unit_amount = baseCents. Les centimes résiduels (extraCents)
    // seront facturés via un invoice_item one-shot ajouté à la prochaine
    // invoice. Pas de proration : on veut juste un changement net pour
    // les futures invoices (M2 onwards).
    try {
      await stripeFetch(apiKey, `/subscription_items/${subItem.id}`, {
        "price_data[currency]": "eur",
        "price_data[unit_amount]": baseCents,
        "price_data[product]": productId,
        "price_data[recurring][interval]": "month",
        proration_behavior: "none",
      });
    } catch (e) {
      console.error("[adjust] Stripe subscription_item update failed:", e);
      return json({
        error: "stripe_update_failed",
        message: e instanceof Error ? e.message : String(e),
      }, 500);
    }

    // ─── 5. Ajout invoice_item pour les centimes résiduels (si > 0) ──
    // Cet item s'ajoute automatiquement à la PROCHAINE invoice générée
    // par Stripe (= la M2 pour la facturation à venir).
    if (extraCents > 0) {
      try {
        await stripeFetch(apiKey, "/invoiceitems", {
          customer: sub.customer,
          subscription: stripeSubId,
          amount: extraCents,
          currency: "eur",
          description: `Ajustement plan ${(sale.product as string) || saleId} — centimes résiduels`,
        });
      } catch (e) {
        // Non-bloquant : la sub est ajustée, juste les ~1-3 cents qui
        // manqueront sur le total Stripe. On log et on continue.
        console.error("[adjust] invoiceitem extra failed (non-blocking):", e);
      }
    }

    // ─── 6+7+8. Updates BDD ─────────────────────────────────────────
    await applyDbUpdates(supabase, saleId, newTotal, pendingPayments, newAmountsCents);

    return json({
      ok: true,
      sale_id: saleId,
      old_total: Number(sale.amount_ht),
      new_total: newTotal,
      stripe_sub_id: stripeSubId,
      stripe_updated: true,
      new_unit_amount_cents: baseCents,
      first_pending_extra_cents: extraCents,
      pending_count: nbPending,
      test_mode: isTestMode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adjust] fatal:", message);
    return json({ error: "internal", message }, 500);
  }
});

// ─── Helper : applique les updates BDD (payments, sale, commissions) ──
async function applyDbUpdates(
  supabase: ReturnType<typeof createClient>,
  saleId: string,
  newTotal: number,
  pendingPayments: Array<{ id: string }>,
  newAmountsCents: number[],
): Promise<void> {
  // Update payments.amount pour chaque pending
  for (let i = 0; i < pendingPayments.length; i++) {
    const p = pendingPayments[i];
    const newAmount = newAmountsCents[i] / 100;
    await supabase.from("payments").update({ amount: newAmount }).eq("id", p.id);
  }

  // Update sales.amount_ht
  await supabase.from("sales").update({ amount_ht: newTotal }).eq("id", saleId);

  // Recalcule les commissions pending au prorata
  const pendingIds = pendingPayments.map((p) => p.id);
  const { data: commissions } = await supabase
    .from("commissions")
    .select("id, payment_id, percentage")
    .in("payment_id", pendingIds);

  if (commissions && commissions.length > 0) {
    const newPaymentAmounts = new Map<string, number>();
    pendingPayments.forEach((p, i) => {
      newPaymentAmounts.set(p.id, newAmountsCents[i] / 100);
    });
    for (const c of commissions) {
      const newPayAmount = newPaymentAmounts.get(c.payment_id as string);
      if (newPayAmount != null && c.percentage != null) {
        const newCommissionAmount =
          Math.round(newPayAmount * Number(c.percentage)) / 100;
        await supabase
          .from("commissions")
          .update({ amount: newCommissionAmount })
          .eq("id", c.id);
      }
    }
  }
}
