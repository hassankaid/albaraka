// create-payment-intent
//
// 2 modes :
//   1. product_type = "pass_al_baraka" (défaut) : flow PASS AL BARAKA classique
//      avec installments 1-8. Optionnellement, si `payment_code` fourni, lookup
//      du contact + acomptes payés et déduction du solde à payer.
//   2. product_type = "acompte" : paiement one-shot de 50/100/150 € sans accès,
//      sans plan de paiement, sans coupon. La facture sera envoyée par email,
//      le contact recevra un payment_code à utiliser sur le checkout principal.
//
// Important : quand un acompte est appliqué OU qu'un coupon est appliqué, on
// calcule nous-même le solde net côté serveur et on envoie le montant final
// à Stripe SANS coupon Stripe (pour précision et cohérence d'affichage).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_SECRET_KEY_LIVE = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_SECRET_KEY_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TOTAL_AMOUNT_EUR = 2500;
const PRODUCT_NAME = "PASS AL BARAKA";
const PRODUCT_ID = "pass_al_baraka";

const ACOMPTE_VALID_AMOUNTS = [50, 100, 150];
const ACOMPTE_PRODUCT_NAME = "Acompte AL BARAKA";

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

async function ensureStripeProduct(
  apiKey: string,
  productId: string,
  productName: string,
): Promise<string> {
  try {
    const existing = await stripeFetch<{ id: string; active: boolean }>(
      apiKey,
      `/products/${productId}`,
      {},
      "GET",
    );
    if (existing?.id) return existing.id;
  } catch {
    // not found, create below
  }
  const created = await stripeFetch<{ id: string }>(apiKey, "/products", {
    id: productId,
    name: productName,
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const input = await req.json().catch(() => ({}));
    const productType: "pass_al_baraka" | "acompte" =
      input.product_type === "acompte" ? "acompte" : "pass_al_baraka";
    const isTestMode = !!input.test_mode;
    const customer = (input.customer || {}) as Record<string, string>;

    const email = String(customer.email || "").trim().toLowerCase();
    const fullName = String(customer.full_name || "").trim();
    if (!email) {
      return new Response(JSON.stringify({ error: "customer.email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!fullName) {
      return new Response(JSON.stringify({ error: "customer.full_name requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = isTestMode ? STRIPE_SECRET_KEY_TEST : STRIPE_SECRET_KEY_LIVE;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: isTestMode
            ? "STRIPE_SECRET_KEY_TEST not configured"
            : "STRIPE_SECRET_KEY not configured",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ════════════════════════════════════════════════════════════════════
    // MODE 1 : ACOMPTE
    // Paiement one-shot 50/100/150 €. Pas de coupon, pas de plan.
    // ════════════════════════════════════════════════════════════════════
    if (productType === "acompte") {
      const acompteAmount = Number(input.acompte_amount);
      if (!ACOMPTE_VALID_AMOUNTS.includes(acompteAmount)) {
        return new Response(
          JSON.stringify({
            error: `acompte_amount doit être 50, 100 ou 150 (reçu: ${acompteAmount})`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const acompteCents = acompteAmount * 100;
      const metadata: Record<string, string> = {
        product: ACOMPTE_PRODUCT_NAME,
        product_type: "acompte",
        source: "acompte",
        acompte_amount_eur: String(acompteAmount),
        test_mode: isTestMode ? "true" : "false",
        customer_email: email,
        customer_full_name: fullName,
        customer_phone: String(customer.phone || ""),
        customer_address: String(customer.address || ""),
        customer_postal_code: String(customer.postal_code || ""),
        customer_city: String(customer.city || ""),
        customer_country: String(customer.country || ""),
      };

      const pi = await stripeFetch<{ id: string; client_secret: string }>(
        apiKey,
        "/payment_intents",
        {
          amount: acompteCents,
          currency: "eur",
          receipt_email: email,
          metadata,
          description: `${ACOMPTE_PRODUCT_NAME} — ${acompteAmount} €`,
          "payment_method_types[0]": "card",
          "payment_method_options[card][request_three_d_secure]": "automatic",
        },
      );

      return new Response(
        JSON.stringify({
          client_secret: pi.client_secret,
          intent_id: pi.id,
          intent_type: "payment",
          product_type: "acompte",
          amount_cents: acompteCents,
          test_mode: isTestMode,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // MODE 2 : PASS AL BARAKA (avec optionnellement payment_code et coupon)
    // ════════════════════════════════════════════════════════════════════
    const installments = Number(input.installments);
    if (!Number.isInteger(installments) || installments < 1 || installments > 8) {
      return new Response(
        JSON.stringify({ error: "installments doit être un entier entre 1 et 8" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const couponCode: string | undefined =
      typeof input.coupon_code === "string" && input.coupon_code.trim()
        ? input.coupon_code.trim().toUpperCase()
        : undefined;

    const paymentCode: string | undefined =
      typeof input.payment_code === "string" && input.payment_code.trim()
        ? input.payment_code.trim().toUpperCase()
        : undefined;

    // ── Résolution du coupon (tracking côté DB, on n'utilise plus l'API
    //    coupon Stripe pour la subscription pour garder un calcul précis) ──
    let discountPercent = 0;
    if (couponCode) {
      const { data: validation } = await supabase.rpc("validate_coupon", {
        p_code: couponCode,
      });
      if (validation?.valid) {
        discountPercent = validation.discount_percent;
      }
    }

    // ── Lookup payment_code → contact + total des acomptes payés ──────
    let acompteTotalCents = 0;
    let acompteSaleIds: string[] = [];
    let resolvedContactId: string | null = null;
    if (paymentCode) {
      const { data: rows } = await supabase.rpc("lookup_payment_code", {
        p_code: paymentCode,
      });
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (row?.contact_id) {
        resolvedContactId = row.contact_id;
        acompteTotalCents = Math.round(Number(row.acompte_total ?? 0) * 100);

        // Récupère les sale_ids des acomptes (pour les lier à la vente
        // principale dans le webhook)
        const { data: acomptes } = await supabase
          .from("sales")
          .select("id")
          .eq("contact_id", row.contact_id)
          .eq("sale_type", "acompte")
          .eq("payment_status", "paid");
        acompteSaleIds = (acomptes || []).map((s: { id: string }) => s.id);
      }
    }

    // ── Calcul du solde à payer ──────────────────────────────────────
    const totalCents = TOTAL_AMOUNT_EUR * 100;
    const subtotalAfterDiscountCents = Math.round(
      (totalCents * (100 - discountPercent)) / 100,
    );
    const payableCents = Math.max(subtotalAfterDiscountCents - acompteTotalCents, 0);

    if (payableCents === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Le solde à payer est nul ou négatif. Acompte déjà supérieur au montant net. Contactez le support.",
          subtotal_after_discount_cents: subtotalAfterDiscountCents,
          acompte_total_cents: acompteTotalCents,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pour la subscription : prix unitaire = payable / installments
    const monthlyCents = Math.round(payableCents / installments);

    const metadata: Record<string, string> = {
      installments: String(installments),
      coupon_code: couponCode || "",
      discount_percent: String(discountPercent),
      product: PRODUCT_NAME,
      product_type: "pass_al_baraka",
      source: "bon_commande",
      test_mode: isTestMode ? "true" : "false",
      customer_email: email,
      customer_full_name: fullName,
      customer_phone: String(customer.phone || ""),
      customer_address: String(customer.address || ""),
      customer_postal_code: String(customer.postal_code || ""),
      customer_city: String(customer.city || ""),
      customer_country: String(customer.country || ""),
      payment_code: paymentCode || "",
      contact_id: resolvedContactId || "",
      acompte_total_cents: String(acompteTotalCents),
      acompte_sale_ids: acompteSaleIds.join(","),
      payable_cents: String(payableCents),
      total_brut_cents: String(totalCents),
    };

    if (installments === 1) {
      const pi = await stripeFetch<{ id: string; client_secret: string }>(
        apiKey,
        "/payment_intents",
        {
          amount: payableCents,
          currency: "eur",
          receipt_email: email,
          metadata,
          description: `${PRODUCT_NAME} — Paiement en 1 fois`,
          "payment_method_types[0]": "card",
          "payment_method_options[card][request_three_d_secure]": "automatic",
        },
      );
      return new Response(
        JSON.stringify({
          client_secret: pi.client_secret,
          intent_id: pi.id,
          intent_type: "payment",
          product_type: "pass_al_baraka",
          amount_cents: payableCents,
          discount_percent: discountPercent,
          acompte_total_cents: acompteTotalCents,
          installments,
          test_mode: isTestMode,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Subscription (N >= 2) ────────────────────────────────────────
    const searchResult = await stripeFetch<{ data: Array<{ id: string }> }>(
      apiKey,
      `/customers/search?query=${encodeURIComponent(`email:"${email}"`)}`,
      {},
      "GET",
    ).catch(() => ({ data: [] as Array<{ id: string }> }));

    let customerId: string;
    if (searchResult.data?.[0]?.id) {
      customerId = searchResult.data[0].id;
      await stripeFetch(apiKey, `/customers/${customerId}`, {
        name: fullName,
        phone: String(customer.phone || ""),
        "address[line1]": String(customer.address || ""),
        "address[postal_code]": String(customer.postal_code || ""),
        "address[city]": String(customer.city || ""),
        "address[country]": String(customer.country || ""),
        metadata,
      });
    } else {
      const created = await stripeFetch<{ id: string }>(apiKey, "/customers", {
        email,
        name: fullName,
        phone: String(customer.phone || ""),
        "address[line1]": String(customer.address || ""),
        "address[postal_code]": String(customer.postal_code || ""),
        "address[city]": String(customer.city || ""),
        "address[country]": String(customer.country || ""),
        metadata,
      });
      customerId = created.id;
    }

    const cancelDate = new Date();
    cancelDate.setMonth(cancelDate.getMonth() + installments);
    cancelDate.setDate(cancelDate.getDate() - 1);
    const cancelAt = Math.floor(cancelDate.getTime() / 1000);

    const productId = await ensureStripeProduct(apiKey, PRODUCT_ID, PRODUCT_NAME);

    const subParams: Record<string, unknown> = {
      customer: customerId,
      "items[0][price_data][currency]": "eur",
      "items[0][price_data][unit_amount]": monthlyCents,
      "items[0][price_data][recurring][interval]": "month",
      "items[0][price_data][product]": productId,
      payment_behavior: "default_incomplete",
      "payment_settings[save_default_payment_method]": "on_subscription",
      "payment_settings[payment_method_types][0]": "card",
      "payment_settings[payment_method_options][card][request_three_d_secure]":
        "automatic",
      cancel_at: cancelAt,
      description: `${PRODUCT_NAME} — ${installments} mensualités`,
      "expand[0]": "latest_invoice.payment_intent",
      metadata,
    };

    // Note : on n'utilise plus le coupon Stripe ici. Le calcul du solde
    // (incluant remise et acompte) est fait côté serveur dans `payableCents`.
    // Le webhook stocke `discount_amount` et `coupon_code` dans `sales`
    // pour la traçabilité.

    const subscription = await stripeFetch<{
      id: string;
      latest_invoice?: { payment_intent?: { id: string; client_secret: string } };
    }>(apiKey, "/subscriptions", subParams);

    const pi = subscription.latest_invoice?.payment_intent;

    if (pi?.id) {
      try {
        const piMetadata = { ...metadata, stripe_subscription_id: subscription.id };
        await stripeFetch(apiKey, `/payment_intents/${pi.id}`, { metadata: piMetadata });
      } catch (e) {
        console.error("Failed to patch PaymentIntent metadata:", e);
      }
    }

    if (!pi?.client_secret) {
      return new Response(
        JSON.stringify({
          error: "Subscription créée mais pas de client_secret retourné par Stripe",
          subscription_id: subscription.id,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        client_secret: pi.client_secret,
        intent_id: pi.id,
        intent_type: "subscription",
        product_type: "pass_al_baraka",
        subscription_id: subscription.id,
        customer_id: customerId,
        amount_cents: monthlyCents, // mensualité
        payable_cents: payableCents, // solde total
        discount_percent: discountPercent,
        acompte_total_cents: acompteTotalCents,
        installments,
        test_mode: isTestMode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("create-payment-intent error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
