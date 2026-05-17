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
    const productType:
      | "pass_al_baraka"
      | "acompte"
      | "pass_liberty"
      | "rebill"
      | "custom_link" =
      input.product_type === "acompte"
        ? "acompte"
        : input.product_type === "pass_liberty"
          ? "pass_liberty"
          : input.product_type === "rebill"
            ? "rebill"
            : input.product_type === "custom_link"
              ? "custom_link"
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

      // ── start_at (démarrage différé) ─────────────────────────────────
      // Optionnel : date ISO YYYY-MM-DD. Si futur, on autorise la carte
      // aujourd'hui (SetupIntent via subscription trialing) et le 1er débit
      // se fait à trial_end. Stripe : trial_end + proration_behavior:none
      // sur la sub. NB : non supporté en paiement 1x (cf. validation plus bas).
      const startAtRaw =
        typeof input.start_at === "string" && input.start_at.trim()
          ? input.start_at.trim()
          : null;
      let startAtUnix: number | null = null;
      let startAtIsoDate: string | null = null;
      if (startAtRaw) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startAtRaw)) {
          return new Response(
            JSON.stringify({ error: "start_at_format_invalid", message: "Format attendu : YYYY-MM-DD" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        // On vise midi UTC pour éviter tout décalage de fuseau horaire
        // (Stripe accepte n'importe quelle heure de la journée pour trial_end).
        const startDate = new Date(`${startAtRaw}T12:00:00Z`);
        const nowMs = Date.now();
        if (Number.isNaN(startDate.getTime())) {
          return new Response(
            JSON.stringify({ error: "start_at_invalid_date" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        // On considère "futur" si trial_end est au moins 1h dans le futur
        // (sinon Stripe le traitera comme immédiat de toute façon).
        if (startDate.getTime() > nowMs + 60 * 60 * 1000) {
          startAtUnix = Math.floor(startDate.getTime() / 1000);
          startAtIsoDate = startAtRaw;
        }
        // Sinon (date ≤ today) : on ignore silencieusement, mode immédiat.
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

      // 1x → PaymentIntent unique (montant total = 1re mensualité = solde).
      // Le démarrage différé n'est pas supporté en 1x : un PaymentIntent ne
      // peut pas être différé. (À implémenter via SetupIntent + subscription
      // trialing 1-cycle plus tard si besoin.)
      if (installmentsCount === 1) {
        if (startAtUnix) {
          return new Response(
            JSON.stringify({
              error: "start_at_unsupported_for_single_payment",
              message:
                "Le démarrage différé n'est pas supporté en paiement 1x. Utilisez un plan ≥ 2 mensualités ou un démarrage immédiat.",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
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

      // ── Démarrage différé (start_at futur) ──────────────────────────
      // Stripe :
      //   trial_end          → date du 1er débit (autorise la carte aujourd'hui)
      //   proration_behavior → 'none' pour ne pas calculer de prorata sur l'add_invoice_item
      // Pendant le trial, la sub est en status="trialing", AUCUN prélèvement.
      // À trial_end, Stripe émet automatiquement la 1re invoice (qui inclura
      // l'add_invoice_items[0] one-shot s'il y en a un) et débite la carte
      // enregistrée. Le client confirme aujourd'hui un SetupIntent (3DS) au
      // lieu d'un PaymentIntent — d'où l'expand sur pending_setup_intent
      // ci-dessous, conditionnel.
      const isDeferredStart = !!(startAtUnix && startAtIsoDate);
      if (isDeferredStart) {
        rebillSubParams.trial_end = startAtUnix;
        rebillSubParams.proration_behavior = "none";
        rebillMetadata.start_at = startAtIsoDate as string;
        rebillMetadata.start_at_unix = String(startAtUnix);
        // Décale aussi cancel_at : trial_end + N mois - 1 jour (au lieu de
        // today + N mois - 1 jour) sinon la sub se ferait annuler avant
        // d'avoir débité toutes les mensualités.
        const cancelDateDeferred = new Date((startAtUnix as number) * 1000);
        cancelDateDeferred.setMonth(cancelDateDeferred.getMonth() + installmentsCount);
        cancelDateDeferred.setDate(cancelDateDeferred.getDate() - 1);
        rebillSubParams.cancel_at = Math.floor(cancelDateDeferred.getTime() / 1000);
        // Expand le SetupIntent au lieu du PaymentIntent (pas d'invoice immédiate)
        rebillSubParams["expand[0]"] = "pending_setup_intent";
      }

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
        pending_setup_intent?: { id: string; client_secret: string } | null;
      }>(apiKey, "/subscriptions", rebillSubParams);

      // Mode trial : on a un SetupIntent (autorisation carte)
      // Mode immédiat : on a un PaymentIntent (1re mensualité débitée tout de suite)
      const rebillSi = isDeferredStart ? rebillSub.pending_setup_intent : null;
      const rebillPi = !isDeferredStart ? rebillSub.latest_invoice?.payment_intent : null;
      const intentId = rebillSi?.id || rebillPi?.id || null;
      const clientSecret = rebillSi?.client_secret || rebillPi?.client_secret || null;
      const intentType: "payment" | "setup" = rebillSi ? "setup" : "payment";

      if (intentId) {
        try {
          const intentMeta = { ...rebillMetadata, stripe_subscription_id: rebillSub.id };
          const path = intentType === "setup"
            ? `/setup_intents/${intentId}`
            : `/payment_intents/${intentId}`;
          await stripeFetch(apiKey, path, { metadata: intentMeta });
        } catch (e) {
          console.error(`Failed to patch rebill ${intentType} metadata:`, e);
        }
      }

      if (!clientSecret) {
        return new Response(
          JSON.stringify({
            error: "rebill subscription créée mais pas de client_secret",
            subscription_id: rebillSub.id,
            mode: isDeferredStart ? "deferred" : "immediate",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          client_secret: clientSecret,
          intent_id: intentId,
          // "subscription" historiquement = PaymentIntent issu d'une sub.
          // "setup" = SetupIntent (mode différé).
          intent_type: intentType === "setup" ? "setup" : "subscription",
          product_type: "rebill",
          subscription_id: rebillSub.id,
          customer_id: rebillCustomerId,
          amount_cents: firstAmountCents, // 1re mensualité (facturée à start_at en mode différé, sinon tout de suite)
          payable_cents: payableTotalCents, // solde total
          installments: installmentsCount,
          start_at: startAtIsoDate, // null si mode immédiat
          test_mode: isTestMode,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // MODE 5 : CUSTOM_LINK — lien de paiement sur mesure (table payment_links)
    //
    // Produit / montant / échéancier libres définis par le CEO. Aucune vente
    // n'existe encore : c'est le webhook (ensureCustomLinkOrder) qui crée la
    // sale + les payments au paiement réussi. Ici on ne crée que l'objet
    // Stripe : PaymentIntent (1x immédiat) ou Subscription (Nx, ou tout cas
    // différé y compris 1x → Subscription trialing + SetupIntent).
    // ════════════════════════════════════════════════════════════════════
    if (productType === "custom_link") {
      const linkToken = String(input.payment_link_token || "").trim().toUpperCase();
      if (!linkToken) {
        return new Response(
          JSON.stringify({ error: "payment_link_token requis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: linkRows, error: linkErr } = await supabase.rpc(
        "lookup_payment_link",
        { p_token: linkToken },
      );
      if (linkErr) {
        console.error("[custom_link] lookup_payment_link failed:", linkErr);
        return new Response(
          JSON.stringify({ error: "lookup_failed", message: linkErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const link = Array.isArray(linkRows) && linkRows.length > 0 ? linkRows[0] : null;
      if (!link || !link.is_valid) {
        return new Response(
          JSON.stringify({ error: "payment_link_invalid", reason: link?.reason || "unknown" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const productLabel: string = String(link.product_label);
      const totalEur = Number(link.total_amount);
      const installmentsCount = Number(link.installments_count);
      const CUSTOM_MAX_INSTALLMENTS = 24;
      if (
        !Number.isFinite(totalEur) ||
        totalEur < 0.01 ||
        !Number.isInteger(installmentsCount) ||
        installmentsCount < 1 ||
        installmentsCount > CUSTOM_MAX_INSTALLMENTS
      ) {
        return new Response(
          JSON.stringify({
            error: "custom_link_invalid_amount",
            total: totalEur,
            installments: installmentsCount,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Coupon (optionnel, pour les formations a la carte notamment) ──
      // Le client peut passer ?promo=ABCD dans l'URL → propage via le body.
      // On valide cote serveur et on applique silencieusement le discount au
      // total. Si le coupon n'est pas applicable a ce lien (targeting offer
      // ou category), on l'ignore plutot que d'echouer (le client a deja vu
      // s'afficher le prix initial sur /pay).
      //
      // Targeting :
      //   - Lien auto_generated (formation a la carte) : on accepte si
      //     applies_to_categories contient 'a_la_carte' OU pas de targeting.
      //   - Lien custom classique : pas de discount applique (le CEO a deja
      //     baked le prix net dans total_amount, eviter double remise).
      let customCouponApplied: string | null = null;
      let customDiscountCents = 0;
      const customCouponCodeRaw = typeof input.coupon_code === "string"
        ? input.coupon_code.trim().toUpperCase()
        : "";
      if (customCouponCodeRaw) {
        // Recupere l'auto_generated flag pour decider de l'application.
        const { data: linkExtra } = await supabase
          .from("payment_links")
          .select("auto_generated")
          .eq("token", linkToken)
          .maybeSingle();
        const isAutoGenerated = !!linkExtra?.auto_generated;

        if (isAutoGenerated) {
          // Formation a la carte : on valide + check targeting
          const { data: validation } = await supabase.rpc("validate_coupon", {
            p_code: customCouponCodeRaw,
          });
          if (validation?.valid) {
            const categoriesArr = (validation.applies_to_categories ?? []) as string[];
            const offerIdsArr = (validation.applies_to_offer_ids ?? []) as string[];
            const hasNoTargeting =
              (categoriesArr.length === 0) && (offerIdsArr.length === 0);
            const targetsAlaCarte = categoriesArr.includes("a_la_carte");
            if (hasNoTargeting || targetsAlaCarte) {
              const customTotalCentsRaw = Math.round(totalEur * 100);
              if (validation.discount_type === "percent" && validation.discount_percent) {
                customDiscountCents = Math.round(
                  (customTotalCentsRaw * Number(validation.discount_percent)) / 100,
                );
              } else if (validation.discount_type === "fixed_eur" && validation.discount_amount_eur) {
                customDiscountCents = Math.round(Number(validation.discount_amount_eur) * 100);
              }
              // Cap a 100% du total - 1 cent pour rester >= 1 cent
              customDiscountCents = Math.max(
                0,
                Math.min(customDiscountCents, customTotalCentsRaw - 1),
              );
              if (customDiscountCents > 0) {
                customCouponApplied = String(validation.code);
                console.log(
                  `[custom_link] coupon ${customCouponApplied} applied: -${customDiscountCents}c on ${customTotalCentsRaw}c (auto_generated link)`,
                );
              }
            } else {
              console.log(
                `[custom_link] coupon ${customCouponCodeRaw} found but targeting mismatch (categories=${categoriesArr}, offers=${offerIdsArr.length}), ignored`,
              );
            }
          } else {
            console.log(`[custom_link] coupon ${customCouponCodeRaw} invalid: ${validation?.reason}`);
          }
        } else {
          // Lien custom CEO : on n'applique pas de coupon (le prix est deja
          // negocie). On log juste pour traçabilite.
          console.log(
            `[custom_link] coupon ${customCouponCodeRaw} ignored on non-auto_generated link (CEO has set the price already)`,
          );
        }
      }

      // Démarrage différé : la date vient du lien (deferred_start_date).
      let startAtUnix: number | null = null;
      let startAtIsoDate: string | null = null;
      if (link.deferred_start_date) {
        const startDate = new Date(`${String(link.deferred_start_date)}T12:00:00Z`);
        if (
          !Number.isNaN(startDate.getTime()) &&
          startDate.getTime() > Date.now() + 60 * 60 * 1000
        ) {
          startAtUnix = Math.floor(startDate.getTime() / 1000);
          startAtIsoDate = String(link.deferred_start_date);
        }
      }
      const isDeferredStart = !!(startAtUnix && startAtIsoDate);

      // Répartition : la 1re mensualité absorbe les centimes restants.
      // customTotalCents = total net APRES coupon (si applique).
      const customTotalCentsBrut = Math.round(totalEur * 100);
      const customTotalCents = customTotalCentsBrut - customDiscountCents;
      const customBaseCents = Math.floor(customTotalCents / installmentsCount);
      const customExtraCents = customTotalCents - customBaseCents * installmentsCount;
      const customFirstCents = customBaseCents + customExtraCents;

      const customMetadata: Record<string, string> = {
        product: productLabel,
        product_type: "custom_link",
        source: "custom_link",
        payment_link_token: linkToken,
        payment_link_id: String(link.link_id),
        installments: String(installmentsCount),
        total_cents: String(customTotalCents),
        first_payment_cents: String(customFirstCents),
        test_mode: isTestMode ? "true" : "false",
        customer_email: email,
        customer_full_name: fullName,
        customer_phone: String(customer.phone || ""),
        customer_address: String(customer.address || ""),
        customer_postal_code: String(customer.postal_code || ""),
        customer_city: String(customer.city || ""),
        customer_country: String(customer.country || ""),
        coupon_code: customCouponApplied || "",
        discount_cents: String(customDiscountCents),
        total_brut_cents: String(customTotalCentsBrut),
      };
      if (isDeferredStart) {
        customMetadata.start_at = startAtIsoDate as string;
        customMetadata.start_at_unix = String(startAtUnix);
      }

      // ── Cas 1 : paiement unique immédiat → PaymentIntent ──
      if (installmentsCount === 1 && !isDeferredStart) {
        const pi = await stripeFetch<{ id: string; client_secret: string }>(
          apiKey,
          "/payment_intents",
          {
            amount: customTotalCents,
            currency: "eur",
            receipt_email: email,
            metadata: customMetadata,
            description: `${productLabel} (paiement unique)`,
            "payment_method_types[0]": "card",
            "payment_method_options[card][request_three_d_secure]": "automatic",
          },
        );
        return new Response(
          JSON.stringify({
            client_secret: pi.client_secret,
            intent_id: pi.id,
            intent_type: "payment",
            product_type: "custom_link",
            amount_cents: customTotalCents,
            total_brut_cents: customTotalCentsBrut,
            discount_cents: customDiscountCents,
            coupon_applied: customCouponApplied,
            installments: 1,
            test_mode: isTestMode,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Cas 2 : Subscription (Nx immédiat, ou tout cas différé) ──
      const customSearch = await stripeFetch<{ data: Array<{ id: string }> }>(
        apiKey,
        `/customers/search?query=${encodeURIComponent(`email:"${email}"`)}`,
        {},
        "GET",
      ).catch(() => ({ data: [] as Array<{ id: string }> }));

      let customCustomerId: string;
      if (customSearch.data?.[0]?.id) {
        customCustomerId = customSearch.data[0].id;
        await stripeFetch(apiKey, `/customers/${customCustomerId}`, {
          name: fullName,
          phone: String(customer.phone || ""),
          "address[line1]": String(customer.address || ""),
          "address[postal_code]": String(customer.postal_code || ""),
          "address[city]": String(customer.city || ""),
          "address[country]": String(customer.country || ""),
          metadata: customMetadata,
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
          metadata: customMetadata,
        });
        customCustomerId = created.id;
      }

      const customProductId = await ensureStripeProduct(
        apiKey,
        "custom_link_plan",
        "Paiement sur mesure AL BARAKA",
      );

      // unit_amount récurrent = baseCents ; la 1re facture est majorée de
      // extraCents via add_invoice_items → Stripe == BDD au centime près.
      const customSubParams: Record<string, unknown> = {
        customer: customCustomerId,
        "items[0][price_data][currency]": "eur",
        "items[0][price_data][unit_amount]": customBaseCents,
        "items[0][price_data][recurring][interval]": "month",
        "items[0][price_data][product]": customProductId,
        payment_behavior: "default_incomplete",
        "payment_settings[save_default_payment_method]": "on_subscription",
        "payment_settings[payment_method_types][0]": "card",
        "payment_settings[payment_method_options][card][request_three_d_secure]":
          "automatic",
        description: `${productLabel} (${installmentsCount} mensualité${installmentsCount > 1 ? "s" : ""})`,
        "expand[0]": "latest_invoice.payment_intent",
        metadata: customMetadata,
      };

      // cancel_at = (date de départ) + N mois - 1 jour, pour que Stripe
      // stoppe la sub après la dernière mensualité.
      const customCancelBase = isDeferredStart
        ? new Date((startAtUnix as number) * 1000)
        : new Date();
      customCancelBase.setMonth(customCancelBase.getMonth() + installmentsCount);
      customCancelBase.setDate(customCancelBase.getDate() - 1);
      customSubParams.cancel_at = Math.floor(customCancelBase.getTime() / 1000);

      if (isDeferredStart) {
        customSubParams.trial_end = startAtUnix;
        customSubParams.proration_behavior = "none";
        customSubParams["expand[0]"] = "pending_setup_intent";
      }

      if (customExtraCents > 0) {
        customSubParams["add_invoice_items[0][price_data][currency]"] = "eur";
        customSubParams["add_invoice_items[0][price_data][product]"] = customProductId;
        customSubParams["add_invoice_items[0][price_data][unit_amount]"] = customExtraCents;
        customSubParams["add_invoice_items[0][quantity]"] = 1;
      }

      const customSub = await stripeFetch<{
        id: string;
        latest_invoice?: { payment_intent?: { id: string; client_secret: string } };
        pending_setup_intent?: { id: string; client_secret: string } | null;
      }>(apiKey, "/subscriptions", customSubParams);

      const customSi = isDeferredStart ? customSub.pending_setup_intent : null;
      const customPi = !isDeferredStart ? customSub.latest_invoice?.payment_intent : null;
      const customIntentId = customSi?.id || customPi?.id || null;
      const customClientSecret = customSi?.client_secret || customPi?.client_secret || null;
      const customIntentType: "setup" | "subscription" = customSi ? "setup" : "subscription";

      if (customIntentId) {
        try {
          const intentMeta = { ...customMetadata, stripe_subscription_id: customSub.id };
          const path = customIntentType === "setup"
            ? `/setup_intents/${customIntentId}`
            : `/payment_intents/${customIntentId}`;
          await stripeFetch(apiKey, path, { metadata: intentMeta });
        } catch (e) {
          console.error(`[custom_link] failed to patch ${customIntentType} metadata:`, e);
        }
      }

      if (!customClientSecret) {
        return new Response(
          JSON.stringify({
            error: "custom_link subscription créée mais pas de client_secret",
            subscription_id: customSub.id,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          client_secret: customClientSecret,
          intent_id: customIntentId,
          intent_type: customIntentType,
          product_type: "custom_link",
          subscription_id: customSub.id,
          customer_id: customCustomerId,
          amount_cents: customFirstCents,
          total_cents: customTotalCents,
          total_brut_cents: customTotalCentsBrut,
          discount_cents: customDiscountCents,
          coupon_applied: customCouponApplied,
          installments: installmentsCount,
          start_at: startAtIsoDate,
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
