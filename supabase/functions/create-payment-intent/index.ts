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

// ─────────────────────────────────────────────────────────────────────────────
// FIX proration (2026-06-03) : cancel_at = base + N mois avec clamp fin-de-mois,
// SANS retrait de 1 jour. L'ancien "−1 jour" faisait tomber cancel_at 1 jour avant
// la fin du dernier cycle => Stripe proratisait la derniere mensualite (ex: triki
// 966,67 au lieu de 1000). Ici cancel_at tombe pile sur la fin du dernier cycle
// (derniere mensualite PLEINE) ; calcule AVANT la creation de la sub, il ne depasse
// jamais la borne (pas de mensualite en trop).
function addMonthsClampUnix(baseMs: number, n: number): number {
  const d = new Date(baseMs);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + n);
  if (d.getUTCDate() !== day) d.setUTCDate(0); // overflow -> dernier jour du mois cible
  return Math.floor(d.getTime() / 1000);
}

// PASS AL BARAKA
// Sprint Q (17/05/2026) : prix lu dynamiquement depuis offers (slug=al-baraka),
// la constante ci-dessous n'est qu'un FALLBACK si la requete BDD echoue.
// Cf. resolvePassPrice() utilise dans la branche pass_al_baraka.
const TOTAL_AMOUNT_EUR = 3000;
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

/**
 * Découpe un montant total en N mensualités EXACTES où la DERNIÈRE absorbe
 * les centimes de l'arrondi. Garantit que la somme = total en centimes.
 *
 * Exemple : splitIntoInstallmentsCents(200000, 7)
 *   = [28571, 28571, 28571, 28571, 28571, 28571, 28574]  (= 200000)
 *   = 6 × 285.71€ + 1 × 285.74€
 *
 * La dernière est toujours ≥ aux N-1 premières (0 à N-1 centimes max).
 * Convention "dernière absorbe extras" actée Hassan+Sidali le 17/05/2026.
 */
function splitIntoInstallmentsCents(totalCents: number, installments: number): number[] {
  if (installments < 1) return [];
  if (installments === 1) return [totalCents];
  const baseCents = Math.floor(totalCents / installments);
  const lastCents = totalCents - baseCents * (installments - 1);
  return [...Array(installments - 1).fill(baseCents), lastCents];
}

/**
 * Compacte un snapshot d'agreements (5 cases d'engagement cochées AVANT
 * paiement) en une string courte stockable dans la metadata Stripe (limite
 * 500 chars/valeur). Format : "id:ISO|id:ISO|...".
 * Le wording sera reconstruit côté webhook depuis une constante serveur.
 *
 * Retourne "" si l'input est vide/invalide (pas d'erreur, le webhook le
 * traitera comme "pas de snapshot").
 */
function compactAgreements(
  snapshot: unknown,
): string {
  if (!Array.isArray(snapshot)) return "";
  const parts: string[] = [];
  for (const item of snapshot) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const ts = typeof o.checked_at === "string" ? o.checked_at : "";
    if (!id || !ts) continue;
    parts.push(`${id}:${ts}`);
  }
  return parts.join("|").slice(0, 480); // marge de sécurité sur la limite Stripe
}

/**
 * Sprint Q (17/05/2026) — Resolution dynamique du prix d'un Pass (AL BARAKA
 * ou Liberty) depuis la table offers (source de verite du catalogue admin).
 *
 * Avant Sprint Q : prix hardcoded dans des constantes → desync possible avec
 * le catalog (cas reel : Hassan a passe AL BARAKA de 2500 a 3000 dans le
 * catalog, le code charge encore 2500 → perte 500€/vente).
 *
 * Apres Sprint Q : lit offers.default_price_ht. Si echec (DB down, slug
 * inconnu, status inactive), fallback sur la constante fournie.
 */
async function resolvePassPrice(
  supabase: ReturnType<typeof createClient>,
  slug: string,
  fallbackEur: number,
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("offers")
      .select("default_price_ht, status")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) {
      console.warn(
        `[resolvePassPrice] failed to fetch slug=${slug} (${error?.message ?? "no data"}), fallback ${fallbackEur}`,
      );
      return fallbackEur;
    }
    if (data.status !== "active") {
      console.warn(
        `[resolvePassPrice] slug=${slug} status=${data.status}, fallback ${fallbackEur}`,
      );
      return fallbackEur;
    }
    const price = Number(data.default_price_ht);
    if (!Number.isFinite(price) || price <= 0) {
      console.warn(
        `[resolvePassPrice] slug=${slug} invalid default_price_ht=${data.default_price_ht}, fallback ${fallbackEur}`,
      );
      return fallbackEur;
    }
    return price;
  } catch (e) {
    console.error(`[resolvePassPrice] exception for slug=${slug}:`, e);
    return fallbackEur;
  }
}

/**
 * Sprint P (17/05/2026) — Resolution unifiee d'un coupon avec targeting.
 *
 * Retourne le discount en cents quel que soit le type (percent OU fixed_eur),
 * en respectant le targeting du coupon (applies_to_categories OR
 * applies_to_offer_ids dans la categorie attendue).
 *
 * Returns { discountCents: 0, couponAppliedCode: null, discountPercent: 0 }
 * si :
 *   - couponCode vide
 *   - coupon invalid/expired/max_redemptions
 *   - targeting mismatch (coupon ne cible pas cette categorie)
 *   - discount_type inconnu ou montant nul
 *
 * Sinon retourne le discount applique (capped a totalCents - 1 cent pour rester
 * >= 1 centime a payer).
 *
 * `expectedCategory` : 'al_baraka' | 'liberty' | 'a_la_carte' | etc.
 * Le helper interroge `offers` pour resoudre les offer_ids qui appartiennent
 * a cette categorie, et accepte si l'un des offer_ids du coupon est dedans.
 */
async function resolveCouponDiscountCents(
  supabase: ReturnType<typeof createClient>,
  couponCode: string,
  totalCents: number,
  expectedCategory: string,
  logTag = "[coupon]",
  email = "",
): Promise<{
  discountCents: number;
  couponAppliedCode: string | null;
  discountPercent: number;
  reason: string | null;
}> {
  if (!couponCode) {
    return { discountCents: 0, couponAppliedCode: null, discountPercent: 0, reason: null };
  }

  // Sprint P (17/05/2026) : on passe expected_category a la RPC qui fait le
  // check de targeting cote SQL (1 source de verite, pas de SELECT offers
  // separe ici).
  // Upgrade Liberty (10/06/2026) : on passe aussi p_email pour que la RPC
  // verifie l'eligibilite "pass actif requis" (LIBERTY1000 -> pass al_baraka
  // sur cet email). L'email vient de customer.email cote checkout.
  const { data: validation } = await supabase.rpc("validate_coupon", {
    p_code: couponCode,
    p_expected_category: expectedCategory,
    p_email: email ? email.trim().toLowerCase() : null,
  });
  if (!validation?.valid) {
    const reason = validation?.reason ?? "unknown";
    console.log(
      `${logTag} ${couponCode} invalid: ${reason} (expected=${expectedCategory})`,
    );
    return { discountCents: 0, couponAppliedCode: null, discountPercent: 0, reason };
  }

  // Calcul du discount selon discount_type
  let discountCents = 0;
  let discountPercent = 0;
  if (validation.discount_type === "percent" && validation.discount_percent) {
    discountPercent = Number(validation.discount_percent);
    discountCents = Math.round((totalCents * discountPercent) / 100);
  } else if (validation.discount_type === "fixed_eur" && validation.discount_amount_eur) {
    discountCents = Math.round(Number(validation.discount_amount_eur) * 100);
  } else {
    console.log(
      `${logTag} ${couponCode} has unsupported discount_type=${validation.discount_type} or missing value, ignored`,
    );
    return { discountCents: 0, couponAppliedCode: null, discountPercent: 0, reason: "unsupported_type" };
  }

  // Cap : au moins 1 centime a payer
  discountCents = Math.max(0, Math.min(discountCents, Math.max(0, totalCents - 1)));

  if (discountCents <= 0) {
    return { discountCents: 0, couponAppliedCode: null, discountPercent: 0, reason: "zero_discount" };
  }

  console.log(
    `${logTag} ${couponCode} applied: -${discountCents}c on ${totalCents}c (type=${validation.discount_type})`,
  );
  return {
    discountCents,
    couponAppliedCode: String(validation.code),
    discountPercent,
    reason: null,
  };
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

      // Sprint Q : prix lu dynamiquement depuis offers (slug='liberty')
      const libPriceEur = await resolvePassPrice(supabase, "liberty", LIBERTY_TOTAL_EUR);
      const libTotalCents = Math.round(libPriceEur * 100);

      // Validation coupon (Sprint P : supporte fixed_eur + percent + targeting) ──
      // Note : LIBERTY2000 (legacy) ne s'applique QUE en 1x (regle business
      // historique). On garde le check explicite avant d'appeler le helper.
      let libDiscountPercent = 0;
      let libDiscountCents = 0;
      let libCouponApplied: string | null = null;
      if (libCouponCode) {
        const isLibertyExclusive = libCouponCode === LIBERTY_COUPON_1X_ONLY;
        if (isLibertyExclusive && libInstallments !== 1) {
          // LIBERTY2000 sur N>1 : on n'applique pas, on log mais on ne bloque pas
          console.log(
            `[pass_liberty/coupon] ${libCouponCode} non-eligible en ${libInstallments}x (1x only), ignored`,
          );
        } else {
          const libCouponResult = await resolveCouponDiscountCents(
            supabase,
            libCouponCode,
            libTotalCents,
            "liberty",
            "[pass_liberty/coupon]",
            email, // garde-fou eligibilite : LIBERTY1000 exige un pass al_baraka sur cet email
          );
          libDiscountPercent = libCouponResult.discountPercent;
          libDiscountCents = libCouponResult.discountCents;
          libCouponApplied = libCouponResult.couponAppliedCode;

          // Upgrade Liberty (10/06/2026) : si un code a ete fourni mais REFUSE
          // (ex. LIBERTY1000 sans pass al_baraka actif sur cet email, ou
          // mauvaise cible), on REJETTE explicitement le paiement au lieu de
          // facturer le plein tarif (5000 EUR) par surprise.
          if (!libCouponApplied) {
            const reason = libCouponResult.reason || "invalid";
            const msg =
              reason === "requires_pass" || reason === "email_required"
                ? "Ce code promo est réservé aux membres du Pass AL BARAKA. Utilise l'adresse email de ton compte AL BARAKA pour en bénéficier."
                : "Ce code promo n'est pas valable pour cette commande.";
            console.log(
              `[pass_liberty/coupon] ${libCouponCode} rejected (reason=${reason}) for email=${email}`,
            );
            return new Response(
              JSON.stringify({ error: msg, coupon_rejected: reason }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      }

      const libPayableCents = libTotalCents - libDiscountCents;

      if (libPayableCents <= 0) {
        return new Response(
          JSON.stringify({ error: "Montant à payer nul" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Sprint O (17/05/2026) : breakdown "derniere absorbe" -> baseCents = floor
      const libBreakdown = splitIntoInstallmentsCents(libPayableCents, libInstallments);
      const libBaseCents = libInstallments > 1 ? libBreakdown[0] : libPayableCents;
      const libLastCents = libBreakdown[libBreakdown.length - 1];
      // Note : libMonthlyCents = libBaseCents (= ce que Stripe Subscription
      // emet a chaque invoice). La derniere invoice sera ajustee par le
      // webhook stripe-webhook a la reception de l'avant-derniere
      // invoice.payment_succeeded via POST /invoice_items.
      const libMonthlyCents = libBaseCents;

      const libMetadata: Record<string, string> = {
        installments: String(libInstallments),
        coupon_code: libCouponApplied || "",
        coupon_code_attempted: libCouponCode || "",
        discount_percent: String(libDiscountPercent),
        // Sprint P : montant exact de la remise en cents (priorite cote webhook)
        discount_cents: String(libDiscountCents),
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
        // Metadata Sprint O pour ajustement derniere invoice (cf. webhook)
        installments_total: String(libInstallments),
        base_payment_cents: String(libBaseCents),
        last_payment_cents: String(libLastCents),
        // Phase 2 contrats (19/05/2026) : snapshot des cases d'engagement
        // cochees AVANT paiement, compacte pour rester sous la limite Stripe
        // (500 chars/valeur). Le wording est reconstruit cote webhook.
        agreements_compact: compactAgreements(input.agreements_snapshot),
        agreements_formula: "LIBERTY",
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

      const libCancelAt = addMonthsClampUnix(Date.now(), libInstallments); // fix proration: fin de cycle exacte (pas de -1 jour)

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
      // Sprint O (17/05/2026) : breakdown "DERNIERE absorbe" pour rebill aussi.
      // baseCents = floor(total/N), lastCents = total - base*(N-1)
      // Stripe Subscription emet baseCents par invoice, l'ajustement sur la
      // derniere invoice est ajoute par le webhook via POST /invoice_items.
      //
      // Note importante : si les rows pending en BDD (cree par le wizard
      // ReschedulePaymentsModal) ont encore l'ancien algo "1re absorbe",
      // le webhook ensureBonCommandeOrder recalcule le breakdown lors de
      // la creation de la sale -> coherence garantie. Pour le rebill, les
      // pending existent DEJA -> le wizard frontend doit etre mis a jour
      // (TODO Sprint O suite) pour generer les pending avec "derniere absorbe".
      const rebillBreakdown = splitIntoInstallmentsCents(payableTotalCents, installmentsCount);
      const rebillBaseCents = installmentsCount > 1 ? rebillBreakdown[0] : payableTotalCents;
      const rebillLastCents = rebillBreakdown[rebillBreakdown.length - 1];
      // 1re mensualité Stripe = baseCents (ancien : firstPending.amount).
      // Si le wizard frontend n'a pas encore ete mis a jour, firstPending.amount
      // peut differer de baseCents -> on prefere baseCents pour cohérence avec
      // le breakdown + Stripe Subscription.
      const firstAmountCents = rebillBaseCents;

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
        // Metadata Sprint O pour ajustement derniere invoice (cf. webhook)
        installments_total: String(installmentsCount),
        base_payment_cents: String(rebillBaseCents),
        last_payment_cents: String(rebillLastCents),
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
      // Sprint O (17/05/2026) : algo "DERNIERE absorbe les centimes".
      // Stripe Subscription emet baseCents par invoice. L'ajustement de la
      // derniere invoice (= lastCents - baseCents) est ajoute par le webhook
      // a la reception de l'avant-derniere invoice.payment_succeeded via
      // POST /invoice_items?customer=...&subscription=...
      // -> Total Stripe = N x baseCents + adjustment = payableTotalCents EXACT
      const restMonthlyCents = rebillBaseCents;

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
      const rebillCancelAt = addMonthsClampUnix(Date.now(), installmentsCount); // fix proration

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
        rebillSubParams.cancel_at = addMonthsClampUnix((startAtUnix as number) * 1000, installmentsCount); // fix proration
        // Expand le SetupIntent au lieu du PaymentIntent (pas d'invoice immédiate)
        rebillSubParams["expand[0]"] = "pending_setup_intent";
      }

      // Sprint O (17/05/2026) : SUPPRIME add_invoice_items qui mettait
      // l'adjustment sur la 1re facture. Desormais les centimes vont sur la
      // DERNIERE facture via POST /invoice_items declenche par le webhook
      // (cf. metadata installments_total + last_payment_cents).

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

      // ── Coupon (Sprint P 17/05/2026 : refactor avec helper unifie) ──
      // Le lien expose `expected_coupon_category` (calcule cote SQL) :
      //   - 'al_baraka' / 'liberty' pour les Pass differes
      //   - 'a_la_carte' pour les formations a la carte
      //   - null pour les liens custom CEO classiques (aucun coupon applicable)
      //
      // On utilise le meme helper resolveCouponDiscountCents que les branches
      // pass_al_baraka et pass_liberty → 1 source de verite, targeting check
      // cote SQL via validate_coupon(p_code, p_expected_category).
      let customCouponApplied: string | null = null;
      let customDiscountCents = 0;
      const customCouponCodeRaw = typeof input.coupon_code === "string"
        ? input.coupon_code.trim().toUpperCase()
        : "";
      const linkExpectedCategory = (link.expected_coupon_category as string | null) || null;
      if (customCouponCodeRaw && linkExpectedCategory) {
        const customTotalCentsRaw = Math.round(totalEur * 100);
        const customCouponResult = await resolveCouponDiscountCents(
          supabase,
          customCouponCodeRaw,
          customTotalCentsRaw,
          linkExpectedCategory,
          `[custom_link/coupon]`,
        );
        customDiscountCents = customCouponResult.discountCents;
        customCouponApplied = customCouponResult.couponAppliedCode;
      } else if (customCouponCodeRaw && !linkExpectedCategory) {
        // Lien custom CEO classique : aucun coupon n'est jamais applique
        console.log(
          `[custom_link] coupon ${customCouponCodeRaw} ignored on non-auto_generated link (no expected_coupon_category)`,
        );
      }

      // Démarrage différé : la date provient du lien (deferred_start_date)
      // OU peut être surchargée par le client via `client_chosen_start_at`
      // (UX bon de commande : le client peut décaler/avancer la date que le
      // CEO a pré-remplie, dans une fenêtre [tomorrow, today+180j]).
      //
      // Règle : on n'accepte le client_chosen_start_at QUE si le lien est
      // déjà en mode différé (link.deferred_start_date NON null). Sinon le
      // CEO a explicitement choisi un démarrage immédiat → on respecte.
      let startAtUnix: number | null = null;
      let startAtIsoDate: string | null = null;
      let startDateSource: "link" | "client" | null = null;

      const clientChosenStartRaw = typeof input.client_chosen_start_at === "string"
        ? input.client_chosen_start_at.trim()
        : "";

      if (link.deferred_start_date) {
        // Priorité 1 : la date choisie par le client (si fournie + valide)
        if (clientChosenStartRaw && /^\d{4}-\d{2}-\d{2}$/.test(clientChosenStartRaw)) {
          const clientDate = new Date(`${clientChosenStartRaw}T12:00:00Z`);
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + 180);
          if (
            !Number.isNaN(clientDate.getTime()) &&
            clientDate.getTime() > Date.now() + 60 * 60 * 1000 &&
            clientDate.getTime() <= maxDate.getTime()
          ) {
            startAtUnix = Math.floor(clientDate.getTime() / 1000);
            startAtIsoDate = clientChosenStartRaw;
            startDateSource = "client";
          }
        }
        // Priorité 2 : la date du lien (fallback)
        if (!startAtUnix) {
          const startDate = new Date(`${String(link.deferred_start_date)}T12:00:00Z`);
          if (
            !Number.isNaN(startDate.getTime()) &&
            startDate.getTime() > Date.now() + 60 * 60 * 1000
          ) {
            startAtUnix = Math.floor(startDate.getTime() / 1000);
            startAtIsoDate = String(link.deferred_start_date);
            startDateSource = "link";
          }
        }
      }
      const isDeferredStart = !!(startAtUnix && startAtIsoDate);

      // Répartition : la 1re mensualité absorbe les centimes restants.
      // customTotalCents = total net APRES coupon (si applique).
      const customTotalCentsBrut = Math.round(totalEur * 100);
      const customTotalCents = customTotalCentsBrut - customDiscountCents;
      // Sprint O (17/05/2026) : breakdown "DERNIERE absorbe" (au lieu de "1re").
      // baseCents = floor(total/N), lastCents = total - base*(N-1)
      // -> Stripe Subscription emet baseCents x N invoices ; la derniere
      // invoice est ajustee par le webhook a la reception de l'avant-derniere
      // invoice.payment_succeeded via POST /invoice_items (+adjustment cents).
      const customBreakdown = splitIntoInstallmentsCents(customTotalCents, installmentsCount);
      const customBaseCents = installmentsCount > 1 ? customBreakdown[0] : customTotalCents;
      const customLastCents = customBreakdown[customBreakdown.length - 1];
      // ANCIEN "1re absorbe" : customFirstCents = customBaseCents + customExtraCents
      // SPRINT O : 1re mensualité = baseCents (les centimes vont sur la derniere)
      const customFirstCents = customBaseCents;

      // Phase 2 contrats (19/05/2026) : deduction de la formule a partir de
      // expected_coupon_category du lien. al_baraka -> "PASS AL BARAKA",
      // liberty -> "LIBERTY", sinon "" (a_la_carte ou lien custom CEO sans
      // categorie : pas de contrat genere cote webhook).
      const customAgreementsFormula =
        linkExpectedCategory === "al_baraka"
          ? "PASS AL BARAKA"
          : linkExpectedCategory === "liberty"
            ? "LIBERTY"
            : "";

      const customMetadata: Record<string, string> = {
        product: productLabel,
        product_type: "custom_link",
        source: "custom_link",
        payment_link_token: linkToken,
        payment_link_id: String(link.link_id),
        installments: String(installmentsCount),
        total_cents: String(customTotalCents),
        // first_payment_cents legacy : maintenu pour retrocompat (webhook
        // ensureCustomLinkOrder n'en depend plus depuis Sprint O mais ancienne
        // metadata peut subsister sur ventes en cours)
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
        // Metadata Sprint O pour ajustement derniere invoice (cf. webhook)
        installments_total: String(installmentsCount),
        base_payment_cents: String(customBaseCents),
        last_payment_cents: String(customLastCents),
        // Phase 2 contrats (19/05/2026) : snapshot des cases d'engagement
        // cochees AVANT paiement, compacte pour rester sous la limite Stripe
        // (500 chars/valeur). Le wording est reconstruit cote webhook.
        agreements_compact: compactAgreements(input.agreements_snapshot),
        agreements_formula: customAgreementsFormula,
      };
      if (isDeferredStart) {
        customMetadata.start_at = startAtIsoDate as string;
        customMetadata.start_at_unix = String(startAtUnix);
        customMetadata.start_date_source = startDateSource as string;
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
      customSubParams.cancel_at = addMonthsClampUnix(isDeferredStart ? (startAtUnix as number) * 1000 : Date.now(), installmentsCount); // fix proration

      if (isDeferredStart) {
        customSubParams.trial_end = startAtUnix;
        customSubParams.proration_behavior = "none";
        customSubParams["expand[0]"] = "pending_setup_intent";
      }

      // Sprint O (17/05/2026) : SUPPRIME add_invoice_items qui mettait les extras
      // sur la 1re facture. Desormais, les centimes vont sur la DERNIERE facture
      // via POST /invoice_items declenche par le webhook a l'avant-derniere
      // invoice.payment_succeeded (cf. metadata installments_total + last_payment_cents).

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

    // ── Resolution du prix (Sprint Q : lit la table offers, source de verite catalog) ──
    const passPriceEur = await resolvePassPrice(supabase, "al-baraka", TOTAL_AMOUNT_EUR);
    const passTotalCentsBrut = Math.round(passPriceEur * 100);

    // ── Résolution du coupon (Sprint P : supporte fixed_eur + percent + targeting) ──
    // On utilise le helper unifie qui :
    //   - check le targeting (category 'al_baraka' OU offer_id dans cette categorie)
    //   - calcule le discount en cents quel que soit discount_type
    //   - retourne 0 si pas applicable (silencieux, on log)
    const passCouponResult = await resolveCouponDiscountCents(
      supabase,
      couponCode || "",
      passTotalCentsBrut,
      "al_baraka",
      "[pass_al_baraka/coupon]",
    );
    const discountPercent = passCouponResult.discountPercent;
    const discountCentsResolved = passCouponResult.discountCents;
    const couponAppliedCode = passCouponResult.couponAppliedCode;

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

    // ── Calcul du solde à payer (Sprint P : utilise discountCentsResolved
    //     du helper, supporte fixed_eur + percent uniformément) ──
    const totalCents = passTotalCentsBrut;
    const subtotalAfterDiscountCents = totalCents - discountCentsResolved;
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

    // Sprint O (17/05/2026) : breakdown "derniere absorbe les centimes"
    // baseCents = floor(payable / N), lastCents = payable - base*(N-1)
    // -> Stripe Subscription emet baseCents par invoice ; la derniere invoice
    // est ajustee par le webhook a la reception de l'avant-derniere
    // invoice.payment_succeeded via POST /invoice_items.
    const passBreakdown = splitIntoInstallmentsCents(payableCents, installments);
    const passBaseCents = installments > 1 ? passBreakdown[0] : payableCents;
    const passLastCents = passBreakdown[passBreakdown.length - 1];
    const monthlyCents = passBaseCents;

    const metadata: Record<string, string> = {
      installments: String(installments),
      coupon_code: couponAppliedCode || "",
      coupon_code_attempted: couponCode || "",
      discount_percent: String(discountPercent),
      // Sprint P : montant exact de la remise en cents (priorite sur discount_percent
      // cote webhook, supporte les coupons fixed_eur)
      discount_cents: String(discountCentsResolved),
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
      // Metadata Sprint O pour ajustement derniere invoice (cf. webhook)
      installments_total: String(installments),
      base_payment_cents: String(passBaseCents),
      last_payment_cents: String(passLastCents),
      // Phase 2 contrats (19/05/2026) : snapshot des cases d'engagement
      // cochees AVANT paiement, compacte pour rester sous la limite Stripe
      // (500 chars/valeur). Le wording est reconstruit cote webhook.
      agreements_compact: compactAgreements(input.agreements_snapshot),
      agreements_formula: "PASS AL BARAKA",
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

    const cancelAt = addMonthsClampUnix(Date.now(), installments); // fix proration

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
