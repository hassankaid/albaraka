// create-payment-intent
//
// Modes :
//   1. product_type = "pass_al_baraka" (défaut) : flow PASS AL BARAKA classique
//      avec installments 1-8. Optionnellement, si `payment_code` fourni, lookup
//      du contact + acomptes payés et déduction du solde à payer.
//   2. product_type = "acompte" : paiement one-shot de 50/100/150 € sans accès,
//      sans plan de paiement, sans coupon. La facture sera envoyée par email,
//      le contact recevra un payment_code à utiliser sur le checkout principal.
//   3. product_type = "pass_liberty" : flow PASS LIBERTY (5000 €, 1-10x).
//   4. product_type = "rebill" : nouveau plan de paiement pour une vente
//      existante après modification (wizard "Modifier le plan"). On lit les
//      mensualités pending de la vente et on crée un PaymentIntent (1x) ou
//      une Subscription (Nx). Le webhook attache ensuite le sub_id aux
//      pending et marque la 1re mensualité paid. PAS de création de vente,
//      PAS de profile, PAS d'onboarding (la vente existe déjà).
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

// PASS AL BARAKA
const TOTAL_AMOUNT_EUR = 2500;
const PRODUCT_NAME = "PASS AL BARAKA";
const PRODUCT_ID = "pass_al_baraka";

// Acompte AL BARAKA
const ACOMPTE_VALID_AMOUNTS = [50, 100, 150];
const ACOMPTE_PRODUCT_NAME = "Acompte AL BARAKA";

// PASS LIBERTY
const LIBERTY_TOTAL_EUR = 5000;
const LIBERTY_PRODUCT_NAME = "PASS LIBERTY";
const LIBERTY_PRODUCT_ID = "pass_liberty";
const LIBERTY_MAX_INSTALLMENTS = 10;
// Code promo Liberty : ne s'applique QUE en paiement comptant (1x).
// Sur 2-10x mensualités, le coupon est ignoré côté serveur.
const LIBERTY_COUPON_1X_ONLY = "LIBERTY2000";

// REBILL : Stripe product générique pour les nouvelles subs après modification
// d'un plan de paiement. Conserve un product_id distinct pour ne pas mélanger
// avec les ventes initiales pass_al_baraka / pass_liberty.
const REBILL_PRODUCT_ID = "rebill_plan";
const REBILL_PRODUCT_NAME = "Solde restant — Plan modifié";
const REBILL_MAX_INSTALLMENTS = 12;

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
    const productType: "pass_al_baraka" | "acompte" | "pass_liberty" | "rebill" =
      input.product_type === "acompte"
        ? "acompte"
        : input.product_type === "pass_liberty"
          ? "pass_liberty"
          : input.product_type === "rebill"
            ? "rebill"
            : "pass_al_baraka";
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
    // MODE 3 : PASS LIBERTY (5000 €, 1-10x, coupon LIBERTY2000 only en 1x)
    // ════════════════════════════════════════════════════════════════════
    if (productType === "pass_liberty") {
      const libInstallments = Number(input.installments);
      if (
        !Number.isInteger(libInstallments) ||
        libInstallments < 1 ||
        libInstallments > LIBERTY_MAX_INSTALLMENTS
      ) {
        return new Response(
          JSON.stringify({
            error: `installments doit être un entier entre 1 et ${LIBERTY_MAX_INSTALLMENTS}`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const libCouponCode: string | undefined =
        typeof input.coupon_code === "string" && input.coupon_code.trim()
          ? input.coupon_code.trim().toUpperCase()
          : undefined;

      // Validation coupon — LIBERTY2000 ne s'applique QUE en 1x
      let libDiscountPercent = 0;
      let libCouponApplied: string | null = null;
      if (libCouponCode) {
        const isLibertyExclusive = libCouponCode === LIBERTY_COUPON_1X_ONLY;
        if (isLibertyExclusive && libInstallments !== 1) {
          // On n'applique pas le coupon mais on ne bloque pas le paiement.
          // La page front affiche déjà un message si le coupon est invalide.
        } else {
          const { data: validation } = await supabase.rpc("validate_coupon", {
            p_code: libCouponCode,
          });
          if (validation?.valid) {
            libDiscountPercent = validation.discount_percent;
            libCouponApplied = validation.code;
          }
        }
      }

      const libTotalCents = LIBERTY_TOTAL_EUR * 100;
      const libPayableCents = Math.round(
        (libTotalCents * (100 - libDiscountPercent)) / 100,
      );

      if (libPayableCents <= 0) {
        return new Response(
          JSON.stringify({ error: "Montant à payer nul" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const libMonthlyCents = Math.round(libPayableCents / libInstallments);

      const libMetadata: Record<string, string> = {
        installments: String(libInstallments),
        coupon_code: libCouponApplied || "",
        discount_percent: String(libDiscountPercent),
        product: LIBERTY_PRODUCT_NAME,
        product_type: "pass_liberty",
        source: "pass_liberty",
        test_mode: isTestMode ? "true" : "false",
        customer_email: email,
        customer_full_name: fullName,
        customer_phone: String(customer.phone || ""),
        customer_address: String(customer.address || ""),
        customer_postal_code: String(customer.postal_code || ""),
        customer_city: String(customer.city || ""),
        customer_country: String(customer.country || ""),
        payable_cents: String(libPayableCents),
        total_brut_cents: String(libTotalCents),
      };

      if (libInstallments === 1) {
        const pi = await stripeFetch<{ id: string; client_secret: string }>(
          apiKey,
          "/payment_intents",
          {
            amount: libPayableCents,
            currency: "eur",
            receipt_email: email,
            metadata: libMetadata,
            description: `${LIBERTY_PRODUCT_NAME} — Paiement en 1 fois`,
            "payment_method_types[0]": "card",
            "payment_method_options[card][request_three_d_secure]": "automatic",
          },
        );
        return new Response(
          JSON.stringify({
            client_secret: pi.client_secret,
            intent_id: pi.id,
            intent_type: "payment",
            product_type: "pass_liberty",
            amount_cents: libPayableCents,
            discount_percent: libDiscountPercent,
            installments: libInstallments,
            test_mode: isTestMode,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Subscription Liberty (2-10x) — pas de coupon Stripe (calcul net côté serveur)
      const libSearch = await stripeFetch<{ data: Array<{ id: string }> }>(
        apiKey,
        `/customers/search?query=${encodeURIComponent(`email:"${email}"`)}`,
        {},
        "GET",
      ).catch(() => ({ data: [] as Array<{ id: string }> }));

      let libCustomerId: string;
      if (libSearch.data?.[0]?.id) {
        libCustomerId = libSearch.data[0].id;
        await stripeFetch(apiKey, `/customers/${libCustomerId}`, {
          name: fullName,
          phone: String(customer.phone || ""),
          "address[line1]": String(customer.address || ""),
          "address[postal_code]": String(customer.postal_code || ""),
          "address[city]": String(customer.city || ""),
          "address[country]": String(customer.country || ""),
          metadata: libMetadata,
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
          metadata: libMetadata,
        });
        libCustomerId = created.id;
      }

      const libCancelDate = new Date();
      libCancelDate.setMonth(libCancelDate.getMonth() + libInstallments);
      libCancelDate.setDate(libCancelDate.getDate() - 1);
      const libCancelAt = Math.floor(libCancelDate.getTime() / 1000);

      const libProductId = await ensureStripeProduct(
        apiKey,
        LIBERTY_PRODUCT_ID,
        LIBERTY_PRODUCT_NAME,
      );

      const libSubParams: Record<string, unknown> = {
        customer: libCustomerId,
        "items[0][price_data][currency]": "eur",
        "items[0][price_data][unit_amount]": libMonthlyCents,
        "items[0][price_data][recurring][interval]": "month",
        "items[0][price_data][product]": libProductId,
        payment_behavior: "default_incomplete",
        "payment_settings[save_default_payment_method]": "on_subscription",
        "payment_settings[payment_method_types][0]": "card",
        "payment_settings[payment_method_options][card][request_three_d_secure]":
          "automatic",
        cancel_at: libCancelAt,
        description: `${LIBERTY_PRODUCT_NAME} — ${libInstallments} mensualités`,
        "expand[0]": "latest_invoice.payment_intent",
        metadata: libMetadata,
      };

      const libSub = await stripeFetch<{
        id: string;
        latest_invoice?: { payment_intent?: { id: string; client_secret: string } };
      }>(apiKey, "/subscriptions", libSubParams);

      const libPi = libSub.latest_invoice?.payment_intent;
      if (libPi?.id) {
        try {
          const piMeta = { ...libMetadata, stripe_subscription_id: libSub.id };
          await stripeFetch(apiKey, `/payment_intents/${libPi.id}`, { metadata: piMeta });
        } catch (e) {
          console.error("Failed to patch Liberty PI metadata:", e);
        }
      }

      if (!libPi?.client_secret) {
        return new Response(
          JSON.stringify({
            error: "Liberty subscription créée mais pas de client_secret",
            subscription_id: libSub.id,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          client_secret: libPi.client_secret,
          intent_id: libPi.id,
          intent_type: "subscription",
          product_type: "pass_liberty",
          subscription_id: libSub.id,
          customer_id: libCustomerId,
          amount_cents: libMonthlyCents,
          payable_cents: libPayableCents,
          discount_percent: libDiscountPercent,
          installments: libInstallments,
          test_mode: isTestMode,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // MODE 4 : REBILL (re-paiement après modification du plan)
    //
    // Le client a déjà une vente avec des mensualités pending. La précédente
    // sub Stripe a été annulée par le wizard "Modifier le plan". On crée
    // ici une nouvelle sub (ou un PI 1x) que le webhook attachera ensuite
    // aux pending existants.
    // ════════════════════════════════════════════════════════════════════
    if (productType === "rebill") {
      const rebillToken = String(input.rebill_token || "").trim().toUpperCase();
      if (!rebillToken) {
        return new Response(
          JSON.stringify({ error: "rebill_token requis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Lookup : valide le token + récupère sale_id, contact_id et solde
      const { data: lookupRows, error: lookupErr } = await supabase.rpc(
        "lookup_rebill_token",
        { p_token: rebillToken },
      );
      if (lookupErr) {
        console.error("[rebill] lookup_rebill_token failed:", lookupErr);
        return new Response(
          JSON.stringify({ error: "lookup_failed", message: lookupErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const row = Array.isArray(lookupRows) && lookupRows.length > 0 ? lookupRows[0] : null;
      if (!row || !row.is_valid) {
        return new Response(
          JSON.stringify({
            error: "rebill_token_invalid",
            reason: row?.reason || "unknown",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const saleId: string = row.sale_id;
      const contactId: string = row.contact_id;
      const productLabel: string = row.product || REBILL_PRODUCT_NAME;
      const payableTotalEur = Number(row.payable_total);
      const installmentsCount = Number(row.installments_count);
      if (
        !Number.isFinite(payableTotalEur) ||
        payableTotalEur < 0.01 ||
        !Number.isInteger(installmentsCount) ||
        installmentsCount < 1 ||
        installmentsCount > REBILL_MAX_INSTALLMENTS
      ) {
        return new Response(
          JSON.stringify({
            error: "rebill_invalid_amount",
            payable_total: payableTotalEur,
            installments_count: installmentsCount,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Source de vérité côté serveur : on relit les pending de la vente
      // pour obtenir le montant exact (la RPC peut arrondir au cent près
      // dans monthly_amount, mais payable_total est la somme exacte).
      const payableTotalCents = Math.round(payableTotalEur * 100);
      // La 1re mensualité est facturée immédiatement = exactement le montant
      // de la 1re ligne pending (pour que le webhook puisse marquer paid
      // sans erreur d'arrondi). On la lit directement.
      const { data: firstPending, error: pendingErr } = await supabase
        .from("payments")
        .select("id, amount, payment_number, due_date")
        .eq("sale_id", saleId)
        .eq("status", "pending")
        .order("payment_number", { ascending: true })
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (pendingErr || !firstPending) {
        return new Response(
          JSON.stringify({
            error: "rebill_no_pending",
            message: "Aucune mensualité pending trouvée pour cette vente.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const firstAmountCents = Math.round(Number(firstPending.amount) * 100);

      const rebillMetadata: Record<string, string> = {
        product: productLabel,
        product_type: "rebill",
        source: "rebill",
        rebill_token: rebillToken,
        rebill_sale_id: saleId,
        rebill_contact_id: contactId,
        installments: String(installmentsCount),
        test_mode: isTestMode ? "true" : "false",
        customer_email: email,
        customer_full_name: fullName,
        customer_phone: String(customer.phone || ""),
        customer_address: String(customer.address || ""),
        customer_postal_code: String(customer.postal_code || ""),
        customer_city: String(customer.city || ""),
        customer_country: String(customer.country || ""),
        payable_cents: String(payableTotalCents),
        first_payment_cents: String(firstAmountCents),
      };

      // 1x → PaymentIntent unique (montant total = 1re mensualité = solde)
      if (installmentsCount === 1) {
        const pi = await stripeFetch<{ id: string; client_secret: string }>(
          apiKey,
          "/payment_intents",
          {
            amount: firstAmountCents,
            currency: "eur",
            receipt_email: email,
            metadata: rebillMetadata,
            description: `${productLabel} — Solde restant (1 fois)`,
            "payment_method_types[0]": "card",
            "payment_method_options[card][request_three_d_secure]": "automatic",
          },
        );
        return new Response(
          JSON.stringify({
            client_secret: pi.client_secret,
            intent_id: pi.id,
            intent_type: "payment",
            product_type: "rebill",
            amount_cents: firstAmountCents,
            payable_cents: payableTotalCents,
            installments: installmentsCount,
            test_mode: isTestMode,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Nx → Subscription Stripe.
      //
      // Le wizard ReschedulePaymentsModal applique un algo "1re mensualité
      // absorbe les centimes restants, suivantes égales à baseCents". Donc :
      //   payable_total = (baseCents + extraCents) + (N-1) × baseCents
      //                 = N × baseCents + extraCents
      //   firstAmountCents = baseCents + extraCents
      //   remainingCents   = (N-1) × baseCents
      //
      // On configure la Subscription avec :
      //   unit_amount récurrent = baseCents (les N invoices)
      //   add_invoice_items[0]  = extraCents (one-shot sur la 1re invoice)
      // → Invoice 1 facture exactement firstAmountCents ; les suivantes baseCents.
      // → Total Stripe = total BDD au centime près.
      const remainingCents = payableTotalCents - firstAmountCents;
      const restMonthlyCents = Math.round(remainingCents / (installmentsCount - 1));

      // Lookup customer Stripe
      const rebillSearch = await stripeFetch<{ data: Array<{ id: string }> }>(
        apiKey,
        `/customers/search?query=${encodeURIComponent(`email:"${email}"`)}`,
        {},
        "GET",
      ).catch(() => ({ data: [] as Array<{ id: string }> }));

      let rebillCustomerId: string;
      if (rebillSearch.data?.[0]?.id) {
        rebillCustomerId = rebillSearch.data[0].id;
        await stripeFetch(apiKey, `/customers/${rebillCustomerId}`, {
          name: fullName,
          phone: String(customer.phone || ""),
          "address[line1]": String(customer.address || ""),
          "address[postal_code]": String(customer.postal_code || ""),
          "address[city]": String(customer.city || ""),
          "address[country]": String(customer.country || ""),
          metadata: rebillMetadata,
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
          metadata: rebillMetadata,
        });
        rebillCustomerId = created.id;
      }

      // cancel_at = today + N mois - 1 jour pour que Stripe stoppe la sub
      // automatiquement après la dernière mensualité.
      const rebillCancelDate = new Date();
      rebillCancelDate.setMonth(rebillCancelDate.getMonth() + installmentsCount);
      rebillCancelDate.setDate(rebillCancelDate.getDate() - 1);
      const rebillCancelAt = Math.floor(rebillCancelDate.getTime() / 1000);

      const rebillProductId = await ensureStripeProduct(
        apiKey,
        REBILL_PRODUCT_ID,
        REBILL_PRODUCT_NAME,
      );

      // Subscription avec un prix variable : on utilise add_invoice_items pour
      // facturer la 1re mensualité au montant exact, puis les invoices
      // récurrentes seront au montant moyen (qui sera ré-écrit en BDD côté
      // webhook depuis le payments.amount stocké). Note : Stripe ne supporte
      // pas un montant différent pour la 1re facture native. On accepte donc
      // que Stripe puisse facturer ~1 cent de plus/moins sur certaines
      // invoices : le webhook se base sur `payments.amount` stocké pour
      // déterminer ce qui est dû et marqué paid (Stripe encaisse, BDD trace).
      const rebillSubParams: Record<string, unknown> = {
        customer: rebillCustomerId,
        "items[0][price_data][currency]": "eur",
        "items[0][price_data][unit_amount]": restMonthlyCents,
        "items[0][price_data][recurring][interval]": "month",
        "items[0][price_data][product]": rebillProductId,
        payment_behavior: "default_incomplete",
        "payment_settings[save_default_payment_method]": "on_subscription",
        "payment_settings[payment_method_types][0]": "card",
        "payment_settings[payment_method_options][card][request_three_d_secure]":
          "automatic",
        cancel_at: rebillCancelAt,
        description: `${productLabel} — Solde restant (${installmentsCount} mensualités)`,
        "expand[0]": "latest_invoice.payment_intent",
        metadata: rebillMetadata,
      };

      // Ajustement one-shot de la 1re facture pour atteindre exactement
      // firstAmountCents. Garantit Stripe == BDD au centime près grâce à
      // l'algo "first-payment-absorbs-extras" du wizard ReschedulePayments.
      const adjustmentCents = firstAmountCents - restMonthlyCents;
      if (adjustmentCents > 0) {
        rebillSubParams["add_invoice_items[0][price_data][currency]"] = "eur";
        rebillSubParams["add_invoice_items[0][price_data][product]"] = rebillProductId;
        rebillSubParams["add_invoice_items[0][price_data][unit_amount]"] = adjustmentCents;
        rebillSubParams["add_invoice_items[0][quantity]"] = 1;
      }
      // Si adjustmentCents < 0 (ne peut survenir qu'avec d'anciens pending
      // pré-algo) : on ne corrige pas — le wizard remet de toute façon les
      // pending au format "first absorbs extras" avant l'émission du token.

      const rebillSub = await stripeFetch<{
        id: string;
        latest_invoice?: { payment_intent?: { id: string; client_secret: string } };
      }>(apiKey, "/subscriptions", rebillSubParams);

      const rebillPi = rebillSub.latest_invoice?.payment_intent;
      if (rebillPi?.id) {
        try {
          const piMeta = { ...rebillMetadata, stripe_subscription_id: rebillSub.id };
          await stripeFetch(apiKey, `/payment_intents/${rebillPi.id}`, {
            metadata: piMeta,
          });
        } catch (e) {
          console.error("Failed to patch rebill PI metadata:", e);
        }
      }

      if (!rebillPi?.client_secret) {
        return new Response(
          JSON.stringify({
            error: "rebill subscription créée mais pas de client_secret",
            subscription_id: rebillSub.id,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          client_secret: rebillPi.client_secret,
          intent_id: rebillPi.id,
          intent_type: "subscription",
          product_type: "rebill",
          subscription_id: rebillSub.id,
          customer_id: rebillCustomerId,
          amount_cents: firstAmountCents, // 1re mensualité (facturée tout de suite)
          payable_cents: payableTotalCents, // solde total
          installments: installmentsCount,
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
