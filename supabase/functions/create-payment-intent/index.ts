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

const PRODUCT_ID = "pass_al_baraka";

async function ensureStripeProduct(apiKey: string): Promise<string> {
  try {
    const existing = await stripeFetch<{ id: string; active: boolean }>(
      apiKey,
      `/products/${PRODUCT_ID}`,
      {},
      "GET",
    );
    if (existing?.id) return existing.id;
  } catch {
    // not found, create below
  }
  const created = await stripeFetch<{ id: string }>(apiKey, "/products", {
    id: PRODUCT_ID,
    name: PRODUCT_NAME,
  });
  return created.id;
}

async function ensureStripeCoupon(
  apiKey: string,
  supabase: ReturnType<typeof createClient>,
  code: string,
  percent: number,
  isTestMode: boolean,
): Promise<string> {
  if (!isTestMode) {
    const { data: row } = await supabase
      .from("coupons")
      .select("stripe_coupon_id")
      .eq("code", code)
      .maybeSingle();
    if (row?.stripe_coupon_id) return row.stripe_coupon_id;
  }

  try {
    const existing = await stripeFetch<{ id: string }>(apiKey, `/coupons/${encodeURIComponent(code)}`, {}, "GET");
    if (existing?.id) {
      if (!isTestMode) {
        await supabase.from("coupons").update({ stripe_coupon_id: existing.id }).eq("code", code);
      }
      return existing.id;
    }
  } catch {
    // not found, will create below
  }

  const coupon = await stripeFetch<{ id: string }>(apiKey, "/coupons", {
    id: code,
    percent_off: percent,
    duration: "forever",
    name: `${code} — ${percent}% de réduction`,
  });
  if (!isTestMode) {
    await supabase.from("coupons").update({ stripe_coupon_id: coupon.id }).eq("code", code);
  }
  return coupon.id;
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
    const installments = Number(input.installments);
    const isTestMode = !!input.test_mode;
    const couponCode: string | undefined = typeof input.coupon_code === "string" && input.coupon_code.trim()
      ? input.coupon_code.trim().toUpperCase()
      : undefined;
    const customer = (input.customer || {}) as Record<string, string>;

    if (!Number.isInteger(installments) || installments < 1 || installments > 8) {
      return new Response(
        JSON.stringify({ error: "installments doit être un entier entre 1 et 8" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    let stripeCouponId: string | undefined;
    let discountPercent = 0;
    if (couponCode) {
      const { data: validation } = await supabase.rpc("validate_coupon", { p_code: couponCode });
      if (validation?.valid) {
        discountPercent = validation.discount_percent;
        stripeCouponId = await ensureStripeCoupon(apiKey, supabase, validation.code, discountPercent, isTestMode);
      }
    }

    const totalCents = TOTAL_AMOUNT_EUR * 100;
    const totalAfterDiscountCents = Math.round((totalCents * (100 - discountPercent)) / 100);
    const monthlyCents = Math.round(totalCents / installments);

    const metadata: Record<string, string> = {
      installments: String(installments),
      coupon_code: couponCode || "",
      discount_percent: String(discountPercent),
      product: PRODUCT_NAME,
      source: "bon_commande",
      test_mode: isTestMode ? "true" : "false",
      customer_email: email,
      customer_full_name: fullName,
      customer_phone: String(customer.phone || ""),
      customer_address: String(customer.address || ""),
      customer_postal_code: String(customer.postal_code || ""),
      customer_city: String(customer.city || ""),
      customer_country: String(customer.country || ""),
    };

    if (installments === 1) {
      // One-time payment
      const pi = await stripeFetch<{ id: string; client_secret: string }>(apiKey, "/payment_intents", {
        amount: totalAfterDiscountCents,
        currency: "eur",
        receipt_email: email,
        metadata,
        description: `${PRODUCT_NAME} — Paiement en 1 fois`,
        automatic_payment_methods: { enabled: true },
      });
      return new Response(
        JSON.stringify({
          client_secret: pi.client_secret,
          intent_id: pi.id,
          intent_type: "payment",
          amount_cents: totalAfterDiscountCents,
          discount_percent: discountPercent,
          installments,
          test_mode: isTestMode,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Subscription (N>=2)
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

    const productId = await ensureStripeProduct(apiKey);

    const subParams: Record<string, unknown> = {
      customer: customerId,
      "items[0][price_data][currency]": "eur",
      "items[0][price_data][unit_amount]": monthlyCents,
      "items[0][price_data][recurring][interval]": "month",
      "items[0][price_data][product]": productId,
      payment_behavior: "default_incomplete",
      "payment_settings[save_default_payment_method]": "on_subscription",
      cancel_at: cancelAt,
      description: `${PRODUCT_NAME} — ${installments} mensualités`,
      "expand[0]": "latest_invoice.payment_intent",
      metadata,
    };

    if (stripeCouponId) {
      subParams["discounts[0][coupon]"] = stripeCouponId;
    }

    const subscription = await stripeFetch<{
      id: string;
      latest_invoice?: { payment_intent?: { id: string; client_secret: string } };
    }>(apiKey, "/subscriptions", subParams);

    const pi = subscription.latest_invoice?.payment_intent;

    // Le webhook lit les metadata sur le PaymentIntent pour créer le profile
    // + sale + payments dès que l'événement payment_intent.succeeded arrive.
    // On copie donc les metadata de la subscription sur le PI, + l'id de
    // la subscription (utile pour retrouver les échéances suivantes).
    if (pi?.id) {
      try {
        const piMetadata = { ...metadata, stripe_subscription_id: subscription.id };
        const piParams: Record<string, unknown> = { metadata: piMetadata };
        await stripeFetch(apiKey, `/payment_intents/${pi.id}`, piParams);
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
        subscription_id: subscription.id,
        customer_id: customerId,
        amount_cents: Math.round(totalAfterDiscountCents / installments),
        discount_percent: discountPercent,
        installments,
        test_mode: isTestMode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("create-payment-intent error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
