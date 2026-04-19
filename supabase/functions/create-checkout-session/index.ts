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
const APP_URL = "https://plateforme.albarakaecosysteme.com";

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

async function ensureStripeCoupon(
  apiKey: string,
  supabase: ReturnType<typeof createClient>,
  code: string,
  percent: number,
  isTestMode: boolean,
): Promise<string> {
  // In test mode we don't cache the stripe_coupon_id in DB because the
  // LIVE and TEST Stripe environments are separate: a coupon id from TEST
  // is NOT valid in LIVE. We still try to reuse existing coupons by id.
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
    const customerEmail: string | undefined = typeof input.customer_email === "string" && input.customer_email.trim()
      ? input.customer_email.trim()
      : undefined;

    if (!Number.isInteger(installments) || installments < 1 || installments > 8) {
      return new Response(
        JSON.stringify({ error: "installments doit être un entier entre 1 et 8" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    // Resolve coupon via SQL RPC (single source of truth)
    let stripeCouponId: string | undefined;
    let discountPercent = 0;
    if (couponCode) {
      const { data: validation, error: rpcErr } = await supabase.rpc("validate_coupon", { p_code: couponCode });
      if (rpcErr) console.error("validate_coupon rpc error:", rpcErr);
      if (validation?.valid) {
        discountPercent = validation.discount_percent;
        stripeCouponId = await ensureStripeCoupon(apiKey, supabase, validation.code, discountPercent, isTestMode);
      }
    }

    const totalCents = TOTAL_AMOUNT_EUR * 100;
    const monthlyCents = Math.round(totalCents / installments);

    const metadataCommon = {
      installments: String(installments),
      coupon_code: couponCode || "",
      discount_percent: String(discountPercent),
      product: PRODUCT_NAME,
      source: "bon_commande",
      test_mode: isTestMode ? "true" : "false",
    };

    const baseParams: Record<string, unknown> = {
      success_url: `${APP_URL}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout/${installments}`,
      locale: "fr",
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      metadata: metadataCommon,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    };

    let params: Record<string, unknown>;

    if (installments === 1) {
      params = {
        ...baseParams,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "eur",
            unit_amount: totalCents,
            product_data: { name: `${PRODUCT_NAME} — Paiement en 1 fois` },
          },
          quantity: 1,
        }],
        invoice_creation: { enabled: true },
        payment_intent_data: { metadata: metadataCommon },
      };
    } else {
      // Stripe n'accepte plus cancel_at dans subscription_data à la création
      // de la session. Le webhook stripe-webhook fixe cancel_at après création
      // via PATCH sur la subscription, en se basant sur metadata.installments.
      params = {
        ...baseParams,
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "eur",
            unit_amount: monthlyCents,
            recurring: { interval: "month" },
            product_data: { name: `${PRODUCT_NAME} — Paiement en ${installments}x` },
          },
          quantity: 1,
        }],
        subscription_data: {
          metadata: metadataCommon,
          description: `${PRODUCT_NAME} — ${installments} mensualités`,
        },
      };
    }

    const session = await stripeFetch<{ id: string; url: string }>(apiKey, "/checkout/sessions", params);

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
        total_eur: TOTAL_AMOUNT_EUR,
        discount_percent: discountPercent,
        monthly_cents: installments === 1 ? totalCents : monthlyCents,
        installments,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("create-checkout-session error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
