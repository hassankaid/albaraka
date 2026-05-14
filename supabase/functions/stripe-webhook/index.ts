import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_WEBHOOK_SECRET_LIVE = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const STRIPE_WEBHOOK_SECRET_TEST = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
const STRIPE_SECRET_KEY_LIVE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_SECRET_KEY_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Normalise un nom de pays vers le nom canonique français Title Case.
 * Gère codes ISO 2 lettres (FR → France) et noms en majuscules (FRANCE → France).
 * Source unique : doit rester aligné avec src/lib/countryUtils.ts.
 */
function normalizeCountryToFrName(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const display = new Intl.DisplayNames(["fr"], { type: "region" });

    // Code ISO 2 lettres → résolution directe via Intl
    if (trimmed.length === 2) {
      const upper = trimmed.toUpperCase();
      const name = display.of(upper);
      if (name && name !== upper) return name;
    }

    // Recherche du nom canonique en comparant insensible casse + diacritiques
    const stripDiacritics = (s: string) =>
      s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const target = stripDiacritics(trimmed);
    // On itère sur quelques codes ISO probables (subset suffisant en pratique).
    // Pour une couverture complète, on laisse Intl résoudre tous les codes
    // depuis A à Z en majuscule (ISO 3166-1 alpha-2 = 2 lettres).
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const name = display.of(code);
        if (!name || name === code) continue;
        if (stripDiacritics(name) === target) return name;
      }
    }
  } catch {
    // Fallback si Intl indispo : retourner tel quel
  }

  return trimmed;
}

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const parts = signature.split(",");
  let timestamp = "";
  let v1Signature = "";
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signature = value;
  }
  if (!timestamp || !v1Signature) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expectedSignature === v1Signature;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsISO(base: Date, months: number): string {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function extractId(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null && "id" in field) {
    return String((field as { id: unknown }).id);
  }
  return null;
}

interface BonCommandeIds {
  paymentIntentId?: string | null;
  subscriptionId?: string | null;
  invoiceId?: string | null;
}

/**
 * Idempotent creation of profile + contact + sale + N payments from a
 * bon_commande PaymentIntent or Subscription invoice. Reads all customer
 * info from metadata (set when creating the PaymentIntent/Subscription).
 *
 * If a sale already exists for the given stripe IDs, this is a no-op.
 * Otherwise it creates everything and invokes the access email.
 *
 * The first payment is marked "paid" with paid_at=today and the given PI/invoice.
 */
async function ensureBonCommandeOrder(
  supabase: SupabaseClient,
  metadata: Record<string, string>,
  ids: BonCommandeIds,
): Promise<void> {
  // 2 sources possibles : "bon_commande" (PASS AL BARAKA) ou "pass_liberty"
  const source = metadata.source;
  if (source !== "bon_commande" && source !== "pass_liberty") return;
  const isLiberty = source === "pass_liberty";

  // Configuration produit (paramétrée selon source)
  const productCfg = isLiberty
    ? {
        productName: "PASS LIBERTY",
        totalGross: 5000,
        passType: "liberty" as const,
        maxInstallments: 10,
        logTag: "[liberty]",
        sendOnboardingEmail: true,
      }
    : {
        productName: "PASS AL BARAKA",
        totalGross: 2500,
        passType: "al_baraka" as const,
        maxInstallments: 8,
        logTag: "[bon_commande]",
        sendOnboardingEmail: true,
      };

  const email = String(metadata.customer_email || "").trim().toLowerCase();
  const fullName = String(metadata.customer_full_name || "").trim();
  if (!email || !fullName) {
    console.error(`${productCfg.logTag} missing email/fullName in metadata`, metadata);
    return;
  }

  const installments = Math.max(
    1,
    Math.min(productCfg.maxInstallments, Number(metadata.installments) || 1),
  );
  const discountPercent = Number(metadata.discount_percent) || 0;
  const couponCode = metadata.coupon_code || null;

  // Idempotency: look up sale by any of the stripe ids
  let existingSale: { id: string } | null = null;
  if (ids.paymentIntentId) {
    const { data } = await supabase
      .from("payments")
      .select("sale_id")
      .eq("stripe_payment_intent_id", ids.paymentIntentId)
      .limit(1);
    if (data && data.length > 0) existingSale = { id: data[0].sale_id };
  }
  if (!existingSale && ids.subscriptionId) {
    const { data } = await supabase
      .from("payments")
      .select("sale_id")
      .eq("stripe_subscription_id", ids.subscriptionId)
      .limit(1);
    if (data && data.length > 0) existingSale = { id: data[0].sale_id };
  }

  if (existingSale) {
    // Already created by a previous event, just ensure first payment is paid.
    await markFirstPaymentPaid(supabase, existingSale.id, ids);
    return;
  }

  // Find or create profile
  let profileId: string | null = null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, origin")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    profileId = existingProfile.id;
    if (existingProfile.origin === "manual") {
      await supabase.from("profiles").update({ origin: "bon_commande" }).eq("id", profileId);
    }
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (created?.user?.id) {
      profileId = created.user.id;
    } else {
      const msg = String(createErr?.message || "").toLowerCase();
      const alreadyExists =
        msg.includes("already") ||
        msg.includes("exist") ||
        msg.includes("registered");

      if (!alreadyExists) {
        console.error("[bon_commande] createUser failed (non-conflict):", createErr);
        throw createErr ?? new Error("createUser returned no user");
      }

      console.warn(`[bon_commande] auth.users already has ${email}, fetching existing id`);
      try {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = list?.users?.find(
          (u: { email?: string | null }) => (u.email || "").toLowerCase() === email,
        );
        if (!existing?.id) {
          throw new Error(`auth user with email ${email} not found via listUsers`);
        }
        profileId = existing.id;
      } catch (e) {
        console.error("[bon_commande] listUsers failed:", e);
        throw e;
      }
    }

    // Ensure profiles row exists (handle_new_user trigger may not have fired
    // for pre-existing auth users whose profile row was deleted or desynced).
    await supabase
      .from("profiles")
      .upsert(
        {
          id: profileId,
          email,
          full_name: fullName || email,
          phone: metadata.customer_phone || null,
          address: metadata.customer_address || null,
          postal_code: metadata.customer_postal_code || null,
          city: metadata.customer_city || null,
          country: normalizeCountryToFrName(metadata.customer_country),
          role: "apporteur",
          origin: "bon_commande",
        },
        { onConflict: "id" },
      );
  }

  // Upsert contact
  // contacts has a UNIQUE index on lower(email), not on email directly,
  // so upsert with onConflict:"email" fails. Use the existing RPC which
  // handles email/phone deduplication correctly.
  const { data: contactId, error: contactErr } = await supabase.rpc(
    "find_or_create_contact",
    {
      p_email: email,
      p_phone: metadata.customer_phone || "",
      p_full_name: fullName || null,
    },
  );

  if (contactErr || !contactId) {
    console.error("[bon_commande] find_or_create_contact failed:", contactErr);
    throw contactErr ?? new Error("find_or_create_contact returned null");
  }

  const contact = { id: contactId as string };

  // ── Acompte : applicable uniquement pour PASS AL BARAKA (le checkout
  //    Liberty n'utilise pas le payment_code). Si le checkout a lookup un
  //    payment_code, l'acompte est déjà déduit côté Stripe (payable_cents).
  //    On lie la vente principale à la vente acompte via parent_sale_id.
  const payableCents = Number(metadata.payable_cents) || 0;
  const acompteSaleIds = isLiberty
    ? []
    : (metadata.acompte_sale_ids || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  // amount_ht = ce qui est PAYÉ via cette vente.
  // discount_amount = la remise appliquée sur le brut.
  const discountAmount =
    Math.round(((productCfg.totalGross * discountPercent) / 100) * 100) / 100;
  const totalNet =
    payableCents > 0
      ? payableCents / 100
      : productCfg.totalGross - discountAmount; // fallback

  // Lien vers le 1er acompte (le plus ancien si plusieurs cumulés)
  let parentSaleId: string | null = null;
  if (acompteSaleIds.length > 0) {
    const { data: oldestAcompte } = await supabase
      .from("sales")
      .select("id, created_at")
      .in("id", acompteSaleIds)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    parentSaleId = oldestAcompte?.id || null;
  }

  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      contact_id: contact.id,
      buyer_profile_id: profileId,
      product: productCfg.productName,
      amount_ht: totalNet,
      discount_amount: discountAmount,
      coupon_code: couponCode,
      mensualites: installments,
      sale_type: "bon_commande",
      parent_sale_id: parentSaleId,
      stripe_session_id: null,
      payment_status: "pending",
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (saleErr || !sale) {
    console.error(`${productCfg.logTag} sale insert failed:`, saleErr);
    throw saleErr ?? new Error("sale insert failed");
  }

  const perInstallment = Math.round((totalNet / installments) * 100) / 100;
  const today = new Date();

  const rows = Array.from({ length: installments }, (_, i) => ({
    sale_id: sale.id,
    contact_id: contact.id,
    payment_number: i + 1,
    total_payments: installments,
    amount: perInstallment,
    due_date: addMonthsISO(today, i),
    status: "pending" as const,
    payment_method: "stripe",
    stripe_subscription_id: ids.subscriptionId || null,
  }));

  const { error: paymentsErr } = await supabase.from("payments").insert(rows);
  if (paymentsErr) {
    console.error(`${productCfg.logTag} payments insert failed:`, paymentsErr);
    throw paymentsErr;
  }

  await markFirstPaymentPaid(supabase, sale.id, ids);

  // Grant pass (al_baraka ou liberty) pour débloquer parcours + formations
  // via PassGuard. Idempotent: skip si un pass actif existe déjà.
  try {
    const { data: existingPass } = await supabase
      .from("user_passes")
      .select("id")
      .eq("user_id", profileId!)
      .eq("pass_type", productCfg.passType)
      .is("revoked_at", null)
      .limit(1);
    if (!existingPass || existingPass.length === 0) {
      await supabase.from("user_passes").insert({
        user_id: profileId,
        pass_type: productCfg.passType,
        notes: `auto-granted on ${source} payment`,
      });
      console.log(
        `${productCfg.logTag} pass ${productCfg.passType} granted to profile=${profileId}`,
      );
    }
  } catch (e) {
    console.error(`${productCfg.logTag} grant pass failed:`, e);
  }

  console.log(
    `${productCfg.logTag} created profile=${profileId} sale=${sale.id} installments=${installments}`,
  );

  // Email d'onboarding (création password + accès plateforme)
  if (productCfg.sendOnboardingEmail) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/send-apporteur-access-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_ids: [profileId],
            pass_type: productCfg.passType, // "al_baraka" ou "liberty"
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        console.error(`${productCfg.logTag} access-email failed ${res.status}: ${text}`);
      } else {
        console.log(`${productCfg.logTag} access-email sent to profile=${profileId}`);
      }
    } catch (e) {
      console.error(`${productCfg.logTag} failed to invoke access-email:`, e);
    }
  }
}

async function markFirstPaymentPaid(
  supabase: SupabaseClient,
  saleId: string,
  ids: BonCommandeIds,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: "paid",
    paid_at: todayISO(),
  };
  if (ids.paymentIntentId) patch.stripe_payment_intent_id = ids.paymentIntentId;
  if (ids.invoiceId) patch.stripe_invoice_id = ids.invoiceId;

  // Update + récupère l'id pour déclencher la facture client
  const { data: updated } = await supabase
    .from("payments")
    .update(patch)
    .eq("sale_id", saleId)
    .eq("payment_number", 1)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updated?.id) {
    triggerClientInvoice(updated.id);
  }
}

/**
 * Déclenche la génération + envoi de la facture client en arrière-plan.
 * Non-bloquant : si la function échoue, on log mais on n'interrompt pas
 * le flow Stripe (la facture peut être (re)générée manuellement plus tard
 * via /payments → bouton facture).
 */
function triggerClientInvoice(payment_id: string): void {
  fetch(`${SUPABASE_URL}/functions/v1/generate-client-invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payment_id, send_email: true }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.error(`[client-invoice] failed ${res.status}: ${text}`);
      } else {
        console.log(`[client-invoice] generated and sent for payment=${payment_id}`);
      }
    })
    .catch((e) => console.error("[client-invoice] invoke failed:", e));
}

/**
 * CUSTOM_LINK — création idempotente de contact + sale + N payments depuis
 * un lien de paiement sur mesure (table payment_links).
 *
 * Aucune vente n'existe avant le paiement : c'est cette fonction qui crée
 * tout au moment du paiement réussi. Appelée :
 *   - depuis handlePaymentIntentSucceeded (mode immédiat) → markFirstPaid=true
 *   - depuis handleCustomLinkSubscriptionCreated (mode différé, trial) →
 *     markFirstPaid=false (rien n'est encore débité), baseDate=trial_end.
 *
 * Idempotent : si le payment_link a déjà un sale_id, ou si une sale existe
 * déjà pour les stripe ids, on ne recrée rien.
 */
async function ensureCustomLinkOrder(
  supabase: SupabaseClient,
  metadata: Record<string, string>,
  ids: BonCommandeIds,
  opts: { markFirstPaid: boolean; baseDate?: Date },
): Promise<void> {
  if (metadata.source !== "custom_link") return;

  const linkId = metadata.payment_link_id;
  if (!linkId) {
    console.error("[custom_link] missing payment_link_id in metadata");
    return;
  }

  const email = String(metadata.customer_email || "").trim().toLowerCase();
  const fullName = String(metadata.customer_full_name || "").trim();
  if (!email || !fullName) {
    console.error("[custom_link] missing email/fullName in metadata", metadata);
    return;
  }

  const productLabel = String(metadata.product || "Paiement sur mesure");
  const installments = Math.max(1, Number(metadata.installments) || 1);
  const totalCents = Number(metadata.total_cents) || 0;
  const firstPaymentCents = Number(metadata.first_payment_cents) || 0;
  if (totalCents < 1 || firstPaymentCents < 1) {
    console.error("[custom_link] invalid amounts in metadata", metadata);
    return;
  }

  // ── Idempotency 1 : le lien a-t-il déjà une vente ? ──
  const { data: linkRow } = await supabase
    .from("payment_links")
    .select("id, status, sale_id")
    .eq("id", linkId)
    .maybeSingle();
  if (linkRow?.sale_id) {
    if (opts.markFirstPaid) {
      await markFirstPaymentPaid(supabase, linkRow.sale_id, ids);
    }
    console.log(`[custom_link] sale already exists for link=${linkId}, idempotent`);
    return;
  }

  // ── Idempotency 2 : une vente existe-t-elle déjà via les stripe ids ? ──
  let existingSaleId: string | null = null;
  if (ids.subscriptionId) {
    const { data } = await supabase
      .from("payments")
      .select("sale_id")
      .eq("stripe_subscription_id", ids.subscriptionId)
      .limit(1);
    if (data && data.length > 0) existingSaleId = data[0].sale_id;
  }
  if (!existingSaleId && ids.paymentIntentId) {
    const { data } = await supabase
      .from("payments")
      .select("sale_id")
      .eq("stripe_payment_intent_id", ids.paymentIntentId)
      .limit(1);
    if (data && data.length > 0) existingSaleId = data[0].sale_id;
  }
  if (existingSaleId) {
    if (opts.markFirstPaid) {
      await markFirstPaymentPaid(supabase, existingSaleId, ids);
    }
    await supabase
      .from("payment_links")
      .update({
        status: "paid",
        sale_id: existingSaleId,
        paid_at: new Date().toISOString(),
      })
      .eq("id", linkId)
      .neq("status", "paid");
    console.log(`[custom_link] sale ${existingSaleId} already created, link backfilled`);
    return;
  }

  // ── Contact ──
  const { data: contactId, error: contactErr } = await supabase.rpc(
    "find_or_create_contact",
    {
      p_email: email,
      p_phone: metadata.customer_phone || "",
      p_full_name: fullName || null,
    },
  );
  if (contactErr || !contactId) {
    console.error("[custom_link] find_or_create_contact failed:", contactErr);
    throw contactErr ?? new Error("find_or_create_contact returned null");
  }

  // ── Vente ──
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      contact_id: contactId,
      product: productLabel,
      amount_ht: totalCents / 100,
      discount_amount: 0,
      mensualites: installments,
      sale_type: "custom_link",
      payment_status: "pending",
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (saleErr || !sale) {
    console.error("[custom_link] sale insert failed:", saleErr);
    throw saleErr ?? new Error("sale insert failed");
  }

  // ── Échéances ──
  // 1re mensualité = first_payment_cents (absorbe les centimes), suivantes
  // égales. Cohérent avec le calcul de create-payment-intent.
  const restMonthlyCents =
    installments > 1
      ? Math.round((totalCents - firstPaymentCents) / (installments - 1))
      : 0;
  const baseDate = opts.baseDate ?? new Date();
  const rows = Array.from({ length: installments }, (_, i) => ({
    sale_id: sale.id,
    contact_id: contactId,
    payment_number: i + 1,
    total_payments: installments,
    amount: (i === 0 ? firstPaymentCents : restMonthlyCents) / 100,
    due_date: addMonthsISO(baseDate, i),
    status: "pending" as const,
    payment_method: "stripe",
    stripe_subscription_id: ids.subscriptionId || null,
  }));
  const { error: paymentsErr } = await supabase.from("payments").insert(rows);
  if (paymentsErr) {
    console.error("[custom_link] payments insert failed:", paymentsErr);
    throw paymentsErr;
  }

  // ── 1re échéance payée (mode immédiat uniquement) ──
  if (opts.markFirstPaid) {
    await markFirstPaymentPaid(supabase, sale.id, ids);
  }

  // ── Bascule le lien en "payé" ──
  await supabase
    .from("payment_links")
    .update({
      status: "paid",
      sale_id: sale.id,
      paid_at: new Date().toISOString(),
    })
    .eq("id", linkId);

  console.log(
    `[custom_link] created sale=${sale.id} contact=${contactId} installments=${installments} markFirstPaid=${opts.markFirstPaid}`,
  );
}

/**
 * CUSTOM_LINK — démarrage différé : la subscription est créée en mode trial.
 * À sa création, on crée la vente + les payments (tous pending) calés sur
 * trial_end. Rien n'est marqué paid (aucun débit avant trial_end). Les
 * échéances seront ensuite auto-marquées par handleInvoicePaid (générique).
 */
async function handleCustomLinkSubscriptionCreated(
  supabase: SupabaseClient,
  sub: Record<string, unknown>,
  metadata: Record<string, string>,
): Promise<void> {
  const subscriptionId = typeof sub.id === "string" ? sub.id : null;
  if (!subscriptionId) {
    console.error("[custom_link/sub.created] subscription has no id");
    return;
  }

  // Mode immédiat (pas de trial) : la vente est créée via
  // payment_intent.succeeded → no-op ici pour ne pas dupliquer.
  const trialEndUnix =
    typeof sub.trial_end === "number" && sub.trial_end > Math.floor(Date.now() / 1000)
      ? sub.trial_end
      : null;
  if (!trialEndUnix) return;

  await ensureCustomLinkOrder(
    supabase,
    metadata,
    { subscriptionId },
    { markFirstPaid: false, baseDate: new Date(trialEndUnix * 1000) },
  );
}

/**
 * Idempotent creation of contact + sale (sale_type=acompte) + payment from
 * an acompte PaymentIntent. Generates a payment_code on the contact (or
 * reuses existing). Triggers the client invoice. NO access grant, NO
 * onboarding email, NO subscription.
 */
async function ensureAcompteOrder(
  supabase: SupabaseClient,
  metadata: Record<string, string>,
  ids: BonCommandeIds,
): Promise<void> {
  if (metadata.source !== "acompte") return;

  const email = String(metadata.customer_email || "").trim().toLowerCase();
  const fullName = String(metadata.customer_full_name || "").trim();
  if (!email || !fullName) {
    console.error("[acompte] missing email/fullName", metadata);
    return;
  }

  const acompteAmount = Number(metadata.acompte_amount_eur);
  if (!Number.isFinite(acompteAmount) || acompteAmount <= 0) {
    console.error("[acompte] invalid acompte_amount_eur", metadata);
    return;
  }

  // Idempotency: lookup existing sale by paymentIntentId
  if (ids.paymentIntentId) {
    const { data } = await supabase
      .from("payments")
      .select("sale_id, id, status")
      .eq("stripe_payment_intent_id", ids.paymentIntentId)
      .limit(1);
    if (data && data.length > 0) {
      const existing = data[0];
      if (existing.status !== "paid") {
        await supabase
          .from("payments")
          .update({ status: "paid", paid_at: todayISO() })
          .eq("id", existing.id);
        triggerClientInvoice(existing.id);
      }
      console.log(
        `[acompte] already exists for PI=${ids.paymentIntentId}, idempotent`,
      );
      return;
    }
  }

  // find_or_create_contact (gère dédup email/téléphone)
  const { data: contactId, error: contactErr } = await supabase.rpc(
    "find_or_create_contact",
    {
      p_email: email,
      p_phone: metadata.customer_phone || "",
      p_full_name: fullName || null,
    },
  );
  if (contactErr || !contactId) {
    console.error("[acompte] find_or_create_contact failed:", contactErr);
    throw contactErr ?? new Error("find_or_create_contact returned null");
  }

  // Génère le payment_code (ou récupère l'existant si déjà attribué)
  const { data: paymentCode, error: codeErr } = await supabase.rpc(
    "generate_payment_code",
    { p_contact_id: contactId },
  );
  if (codeErr) {
    console.error("[acompte] generate_payment_code failed:", codeErr);
  } else {
    console.log(
      `[acompte] payment_code=${paymentCode} for contact=${contactId}`,
    );
  }

  // INSERT vente acompte
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      contact_id: contactId,
      product: `Acompte AL BARAKA — ${acompteAmount} €`,
      amount_ht: acompteAmount,
      discount_amount: 0,
      mensualites: 1,
      sale_type: "acompte",
      payment_status: "paid",
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (saleErr || !sale) {
    console.error("[acompte] sale insert failed:", saleErr);
    throw saleErr ?? new Error("sale insert failed");
  }

  // INSERT 1 payment déjà payé
  const { data: payment, error: paymentErr } = await supabase
    .from("payments")
    .insert({
      sale_id: sale.id,
      contact_id: contactId,
      payment_number: 1,
      total_payments: 1,
      amount: acompteAmount,
      due_date: todayISO(),
      status: "paid",
      paid_at: todayISO(),
      payment_method: "stripe",
      stripe_payment_intent_id: ids.paymentIntentId || null,
    })
    .select("id")
    .single();

  if (paymentErr) {
    console.error("[acompte] payment insert failed:", paymentErr);
    throw paymentErr;
  }

  console.log(
    `[acompte] created sale=${sale.id} payment=${payment.id} contact=${contactId} amount=${acompteAmount}€ code=${paymentCode}`,
  );

  // Déclenche la facture client (PDF + email)
  // NOTE : pas d'ouverture d'accès, pas d'email apporteur, pas d'onboarding
  if (payment?.id) {
    triggerClientInvoice(payment.id);
  }
}

/**
 * checkout.session.completed — legacy flow (Stripe Checkout hosted).
 * Inlined minimal version: delegates to ensureBonCommandeOrder when applicable.
 */
async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Record<string, unknown>,
): Promise<void> {
  const metadata = (session.metadata as Record<string, string>) || {};
  if (metadata.source !== "bon_commande") return;

  const details = (session.customer_details as Record<string, unknown>) || {};
  const address = (details.address as Record<string, unknown>) || {};

  // Merge customer_details into metadata (legacy sessions didn't have them)
  const enriched: Record<string, string> = {
    ...metadata,
    customer_email:
      metadata.customer_email ||
      String(details.email || session.customer_email || "").toLowerCase(),
    customer_full_name: metadata.customer_full_name || String(details.name || ""),
    customer_phone: metadata.customer_phone || String(details.phone || ""),
    customer_address: metadata.customer_address || String((address.line1 as string) || ""),
    customer_postal_code:
      metadata.customer_postal_code || String((address.postal_code as string) || ""),
    customer_city: metadata.customer_city || String((address.city as string) || ""),
    customer_country: metadata.customer_country || String((address.country as string) || ""),
  };

  const ids: BonCommandeIds = {
    paymentIntentId: extractId(session.payment_intent),
    subscriptionId: extractId(session.subscription),
  };

  await ensureBonCommandeOrder(supabase, enriched, ids);
}

/**
 * REBILL : la 1re mensualité du nouveau plan vient d'être payée. La vente
 * existe déjà (créée auparavant), les pending payments existent déjà (réécrits
 * par le wizard ReschedulePaymentsModal). Il faut :
 *   1. Attacher le nouveau stripe_subscription_id à TOUS les pending de la vente
 *      (pour que les invoice.paid suivants puissent les retrouver).
 *   2. Marquer la 1re mensualité comme paid (paid_at, stripe_payment_intent_id,
 *      stripe_invoice_id).
 *   3. Réaligner les due_date des mensualités pending restantes sur la date
 *      RÉELLE de la 1re autorisation client (= aujourd'hui), parce que Stripe
 *      va prélever tous les mois à cette date-là (pas à la date estimée saisie
 *      par le CEO dans le wizard).
 *   4. Déclencher la génération de la facture client.
 *
 * Idempotent : si déjà fait (1re pending est déjà paid), no-op.
 */
async function ensureRebillFirstPaid(
  supabase: SupabaseClient,
  metadata: Record<string, string>,
  ids: BonCommandeIds,
): Promise<void> {
  if (metadata.source !== "rebill") return;

  const saleId = metadata.rebill_sale_id;
  if (!saleId) {
    console.error("[rebill] missing rebill_sale_id in metadata");
    return;
  }

  // ── Idempotency étendue : check par PI ET par invoice ──────────────
  // Stripe peut envoyer plusieurs fois le même event (retry ou parallèle PI+
  // invoice quasi-simultanés). Si l'un de ces IDs est déjà attaché à un
  // payment de la vente, c'est qu'on l'a déjà traité → skip.
  if (ids.paymentIntentId || ids.invoiceId) {
    let q = supabase
      .from("payments")
      .select("id, payment_number, status")
      .eq("sale_id", saleId);
    if (ids.paymentIntentId && ids.invoiceId) {
      q = q.or(
        `stripe_payment_intent_id.eq.${ids.paymentIntentId},stripe_invoice_id.eq.${ids.invoiceId}`,
      );
    } else if (ids.paymentIntentId) {
      q = q.eq("stripe_payment_intent_id", ids.paymentIntentId);
    } else if (ids.invoiceId) {
      q = q.eq("stripe_invoice_id", ids.invoiceId);
    }
    const { data: existing } = await q.maybeSingle();
    if (existing) {
      console.log(
        `[rebill] PI/invoice already attached to payment #${existing.payment_number} (${existing.status}), skip`,
      );
      return;
    }
  }

  // 1) Attache le nouveau sub_id à TOUS les pending (et late) de la vente.
  if (ids.subscriptionId) {
    const { error: attachErr } = await supabase
      .from("payments")
      .update({ stripe_subscription_id: ids.subscriptionId })
      .eq("sale_id", saleId)
      .in("status", ["pending", "late"]);
    if (attachErr) {
      console.error("[rebill] failed to attach sub_id to pendings:", attachErr);
    } else {
      console.log(
        `[rebill] attached sub=${ids.subscriptionId} to pending payments of sale=${saleId}`,
      );
    }
  }

  // 2) Marque la 1re pending (par payment_number, fallback due_date) comme paid.
  const { data: firstPending } = await supabase
    .from("payments")
    .select("id, payment_number")
    .eq("sale_id", saleId)
    .eq("status", "pending")
    .order("payment_number", { ascending: true })
    .order("due_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!firstPending) {
    console.warn(
      `[rebill] no pending payment found for sale=${saleId}, can't mark paid`,
    );
    return;
  }

  const today = todayISO();
  const todayDate = new Date(today);

  const patch: Record<string, unknown> = {
    status: "paid",
    paid_at: today,
    // due_date alignée à la date réelle de paiement (au lieu de la date
    // estimée par le CEO). Couvre le cas client paie quelques jours après
    // la création du lien.
    due_date: today,
  };
  if (ids.paymentIntentId) patch.stripe_payment_intent_id = ids.paymentIntentId;
  if (ids.invoiceId) patch.stripe_invoice_id = ids.invoiceId;
  if (ids.subscriptionId) patch.stripe_subscription_id = ids.subscriptionId;

  // UPDATE atomique :
  //   - .eq("status", "pending") garantit qu'on ne réécrit pas une ligne
  //     déjà passée à paid par un autre webhook parallèle.
  //   - L'UNIQUE INDEX partiel sur stripe_payment_intent_id et
  //     stripe_invoice_id (migration payments_unique_stripe_ids_to_prevent_
  //     double_marking) rejette toute 2e tentative d'attacher les mêmes
  //     IDs Stripe à une ligne différente → race-safe par construction.
  const { data: updated, error: paidErr } = await supabase
    .from("payments")
    .update(patch)
    .eq("id", firstPending.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (paidErr) {
    // Code 23505 = violation unique constraint (stripe_payment_intent_id
    // ou stripe_invoice_id déjà attaché à un autre payment).
    // → un webhook parallèle a déjà fait le job, on skip silencieusement.
    if ((paidErr as { code?: string }).code === "23505") {
      console.log(
        `[rebill] unique violation on Stripe IDs (race detected), already processed, skip`,
      );
      return;
    }
    console.error("[rebill] failed to mark first pending paid:", paidErr);
    return;
  }
  if (!updated) {
    // 0 rows affected : la ligne n'est plus pending (un autre webhook
    // l'a marquée paid entre notre SELECT et notre UPDATE). Race détectée.
    console.log(`[rebill] payment ${firstPending.id} no longer pending (race), skip`);
    return;
  }

  // 3) Réaligne les due_date des pending restants sur today + N mois.
  // Stripe va prélever chaque mois à la date d'aujourd'hui (date d'autorisation
  // du client), donc nos due_date BDD doivent suivre cette même cadence — pas
  // celle estimée par le CEO au moment du replan.
  const { data: remainingPendings } = await supabase
    .from("payments")
    .select("id, payment_number")
    .eq("sale_id", saleId)
    .eq("status", "pending")
    .order("payment_number", { ascending: true });

  if (remainingPendings && remainingPendings.length > 0) {
    let monthOffset = 1;
    for (const p of remainingPendings) {
      const newDue = addMonthsISO(todayDate, monthOffset);
      await supabase
        .from("payments")
        .update({ due_date: newDue })
        .eq("id", p.id);
      monthOffset++;
    }
    console.log(
      `[rebill] realigned ${remainingPendings.length} pending due_date on today=${today}`,
    );
  }

  // 4) Update sale.payment_status = 'in_progress' (au cas où elle serait restée
  // en 'lost' ou 'pending' si le wizard a planté entre-deux).
  await supabase
    .from("sales")
    .update({ payment_status: "in_progress" })
    .eq("id", saleId);

  console.log(
    `[rebill] sale=${saleId} payment ${firstPending.id} (#${firstPending.payment_number}) marked paid via rebill`,
  );

  triggerClientInvoice(firstPending.id);
}

/**
 * REBILL — DÉMARRAGE DIFFÉRÉ (trial_end futur)
 *
 * Quand le CEO génère un lien rebill avec `?start=YYYY-MM-DD` futur, le client
 * autorise sa carte aujourd'hui via SetupIntent + la sub Stripe est créée en
 * status="trialing" avec trial_end. AUCUN payment_intent.succeeded ne sera émis
 * tant que trial_end n'est pas atteint.
 *
 * À la création serveur de la sub, Stripe émet `customer.subscription.created`.
 * On écoute cet event ICI pour :
 *   1. Détecter le mode trial (rebill + trial_end futur)
 *   2. Attacher le nouveau sub_id à TOUS les pending de la vente
 *   3. Réaligner les due_date des pending sur trial_end (1re = trial_end,
 *      2e = trial_end+1mois, etc.)
 *   4. NE PAS marquer la 1re paid (elle le sera quand `invoice.paid` arrivera
 *      à trial_end via handleInvoicePaid existant)
 *
 * Idempotent : si le sub_id est déjà attaché aux pending, on log et on quitte.
 */
async function handleSubscriptionCreated(
  supabase: SupabaseClient,
  sub: Record<string, unknown>,
): Promise<void> {
  const metadata = (sub.metadata as Record<string, string>) || {};

  // Branche custom_link : lien sur mesure en démarrage différé.
  if (metadata.source === "custom_link") {
    await handleCustomLinkSubscriptionCreated(supabase, sub, metadata);
    return;
  }

  if (metadata.source !== "rebill") return;

  const saleId = metadata.rebill_sale_id;
  if (!saleId) {
    console.error("[rebill/sub.created] missing rebill_sale_id in metadata");
    return;
  }

  const subscriptionId = typeof sub.id === "string" ? sub.id : null;
  if (!subscriptionId) {
    console.error("[rebill/sub.created] subscription has no id");
    return;
  }

  // Détection du mode trial : trial_end est un unix timestamp dans le futur.
  const trialEndUnix =
    typeof sub.trial_end === "number" && sub.trial_end > Math.floor(Date.now() / 1000)
      ? sub.trial_end
      : null;

  if (!trialEndUnix) {
    // Pas en mode trial → mode immédiat. handlePaymentIntentSucceeded fera son
    // travail à la confirmation client (PI succeeded). On no-op ici pour ne pas
    // dupliquer la logique.
    return;
  }

  // ── Idempotency : si la sub est déjà attachée aux pending de la vente, no-op
  const { data: alreadyAttached } = await supabase
    .from("payments")
    .select("id")
    .eq("sale_id", saleId)
    .eq("stripe_subscription_id", subscriptionId)
    .limit(1);
  if (alreadyAttached && alreadyAttached.length > 0) {
    console.log(
      `[rebill/sub.created] sub=${subscriptionId} already attached to sale=${saleId}, skip`,
    );
    return;
  }

  // 1) Attache le sub_id à tous les pending/late de la vente.
  const { error: attachErr } = await supabase
    .from("payments")
    .update({ stripe_subscription_id: subscriptionId })
    .eq("sale_id", saleId)
    .in("status", ["pending", "late"]);
  if (attachErr) {
    console.error("[rebill/sub.created] failed to attach sub_id:", attachErr);
    return;
  }

  // 2) Réaligne les due_date des pending sur trial_end.
  // 1re pending = trial_end, 2e = trial_end+1mois, etc.
  const { data: pendings } = await supabase
    .from("payments")
    .select("id, payment_number")
    .eq("sale_id", saleId)
    .in("status", ["pending", "late"])
    .order("payment_number", { ascending: true })
    .order("due_date", { ascending: true });

  if (pendings && pendings.length > 0) {
    const trialEndDate = new Date(trialEndUnix * 1000);
    const trialEndIso = trialEndDate.toISOString().slice(0, 10);
    let monthOffset = 0;
    for (const p of pendings) {
      const newDue = monthOffset === 0 ? trialEndIso : addMonthsISO(trialEndDate, monthOffset);
      await supabase.from("payments").update({ due_date: newDue }).eq("id", p.id);
      monthOffset++;
    }
    console.log(
      `[rebill/sub.created] sale=${saleId} sub=${subscriptionId} trial_end=${trialEndIso} ` +
        `attached + realigned ${pendings.length} pending due_date`,
    );
  }
}

/**
 * REBILL — DÉMARRAGE DIFFÉRÉ : SETUP INTENT CONFIRMÉ
 *
 * Quand le client a autorisé sa carte via le SetupIntent (mode trial), Stripe
 * émet `setup_intent.succeeded`. La PaymentMethod est désormais attachée au
 * customer, MAIS Stripe n'attache PAS automatiquement cette PM comme
 * default_payment_method sur la subscription en trial. Sans ce patch, la 1re
 * invoice à trial_end serait émise sans méthode de paiement et la sub passerait
 * en past_due. On fait donc l'attach explicitement ici.
 *
 * Idempotent : si la sub a déjà default_payment_method = cette PM, no-op (le
 * PATCH Stripe est lui-même idempotent).
 */
async function handleSetupIntentSucceeded(
  si: Record<string, unknown>,
  apiKey: string,
): Promise<void> {
  const metadata = (si.metadata as Record<string, string>) || {};
  // Mode différé : rebill ET custom_link utilisent un SetupIntent + sub trialing.
  // Dans les deux cas, il faut attacher la PM autorisée comme default sur la
  // sub pour que la 1re invoice à trial_end débite correctement.
  if (metadata.source !== "rebill" && metadata.source !== "custom_link") return;

  const subscriptionId = metadata.stripe_subscription_id;
  const paymentMethodId =
    typeof si.payment_method === "string"
      ? si.payment_method
      : extractId(si.payment_method);

  if (!subscriptionId || !paymentMethodId) {
    console.warn(
      `[rebill/si.succeeded] missing sub_id (${subscriptionId}) or pm_id (${paymentMethodId})`,
    );
    return;
  }

  try {
    // PATCH subscription.default_payment_method via Stripe API.
    // Pas besoin du SDK : un POST x-www-form-urlencoded suffit.
    const body = new URLSearchParams({
      default_payment_method: paymentMethodId,
    }).toString();
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[rebill/si.succeeded] failed to attach default_pm to sub=${subscriptionId}: ${res.status} ${text}`,
      );
      return;
    }
    console.log(
      `[rebill/si.succeeded] attached default_pm=${paymentMethodId} to sub=${subscriptionId}`,
    );
  } catch (err) {
    console.error("[rebill/si.succeeded] fatal:", err);
  }
}

async function handlePaymentIntentSucceeded(
  supabase: SupabaseClient,
  pi: Record<string, unknown>,
): Promise<void> {
  const metadata = (pi.metadata as Record<string, string>) || {};

  // Legacy path (systeme.io)
  if (metadata.payment_id) {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: todayISO() })
      .eq("id", metadata.payment_id);
    console.log(`[payment_intent.succeeded] legacy payment ${metadata.payment_id}`);
    return;
  }

  const piId = typeof pi.id === "string" ? pi.id : null;
  const subscriptionId = metadata.stripe_subscription_id || null;
  const invoiceId = typeof pi.invoice === "string" ? pi.invoice : extractId(pi.invoice);

  // Branche acompte : paiement one-shot 50/100/150 €
  if (metadata.source === "acompte") {
    await ensureAcompteOrder(supabase, metadata, {
      paymentIntentId: piId,
      subscriptionId,
      invoiceId,
    });
    return;
  }

  // Branche rebill : nouveau plan de paiement après modification.
  // Pas de création de vente : on attache le nouveau sub_id aux pending
  // existants et on marque la 1re comme paid.
  if (metadata.source === "rebill") {
    await ensureRebillFirstPaid(supabase, metadata, {
      paymentIntentId: piId,
      subscriptionId,
      invoiceId,
    });
    return;
  }

  // Branche custom_link : lien de paiement sur mesure (mode immédiat).
  // Crée la vente + le plan de paiement et marque la 1re échéance payée.
  if (metadata.source === "custom_link") {
    await ensureCustomLinkOrder(
      supabase,
      metadata,
      { paymentIntentId: piId, subscriptionId, invoiceId },
      { markFirstPaid: true },
    );
    return;
  }

  // Branche bon_commande (PASS AL BARAKA) OU pass_liberty (PASS LIBERTY)
  if (metadata.source !== "bon_commande" && metadata.source !== "pass_liberty") return;

  await ensureBonCommandeOrder(supabase, metadata, {
    paymentIntentId: piId,
    subscriptionId,
    invoiceId,
  });
}

async function handleInvoicePaid(
  supabase: SupabaseClient,
  invoice: Record<string, unknown>,
): Promise<void> {
  const metadata = (invoice.metadata as Record<string, string>) || {};

  // Legacy systeme.io path
  if (metadata.payment_id) {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: todayISO() })
      .eq("id", metadata.payment_id);
    return;
  }

  const subscriptionId = extractId(invoice.subscription);
  const invoiceId = typeof invoice.id === "string" ? invoice.id : null;
  const paymentIntentId = extractId(invoice.payment_intent);

  if (!subscriptionId || !invoiceId) return;

  // Idempotency étendue : check par invoice_id ET par PI (Stripe peut envoyer
  // 2 events distincts portant les mêmes IDs sur des lignes pending différentes).
  let idempQ = supabase
    .from("payments")
    .select("id, payment_number, status")
    .eq("stripe_subscription_id", subscriptionId);
  if (paymentIntentId) {
    idempQ = idempQ.or(
      `stripe_invoice_id.eq.${invoiceId},stripe_payment_intent_id.eq.${paymentIntentId}`,
    );
  } else {
    idempQ = idempQ.eq("stripe_invoice_id", invoiceId);
  }
  const { data: already } = await idempQ.maybeSingle();
  if (already) {
    console.log(
      `[invoice.paid] invoice/PI already attached to payment #${already.payment_number} (${already.status}), skip`,
    );
    return;
  }

  // Find oldest unpaid payment (pending OR late) for this subscription.
  // Inclure "late" permet aux retries Stripe de récupérer une échéance
  // précédemment marquée en échec.
  const { data: unpaids } = await supabase
    .from("payments")
    .select("id, payment_number")
    .eq("stripe_subscription_id", subscriptionId)
    .in("status", ["pending", "late"])
    .order("payment_number", { ascending: true })
    .limit(1);

  const target = unpaids?.[0];
  if (!target) {
    // Probably the sale hasn't been created yet (payment_intent.succeeded
    // hasn't fired). It will handle it.
    console.log(`[invoice.paid] no unpaid payment yet for subscription ${subscriptionId}`);
    return;
  }

  // UPDATE atomique :
  //   - .in("status", ["pending","late"]) garantit qu'on ne réécrit pas
  //     une ligne déjà paid par un autre webhook parallèle.
  //   - L'UNIQUE INDEX sur stripe_payment_intent_id / stripe_invoice_id
  //     rejette toute 2e tentative d'attacher ces IDs ailleurs (race-safe).
  const { data: updated, error: updErr } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: todayISO(),
      stripe_invoice_id: invoiceId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", target.id)
    .in("status", ["pending", "late"])
    .select("id")
    .maybeSingle();
  if (updErr) {
    if ((updErr as { code?: string }).code === "23505") {
      console.log(
        `[invoice.paid] unique violation on Stripe IDs (race detected), already processed, skip`,
      );
      return;
    }
    console.error("[invoice.paid] update failed:", updErr);
    return;
  }
  if (!updated) {
    console.log(
      `[invoice.paid] payment ${target.id} no longer pending/late (race), skip`,
    );
    return;
  }

  console.log(`[invoice.paid] payment ${target.id} (#${target.payment_number}) marked paid`);

  // Déclenche la génération + envoi de la facture client (mensualité N×)
  triggerClientInvoice(target.id);
}

async function handleInvoiceFailed(
  supabase: SupabaseClient,
  obj: Record<string, unknown>,
): Promise<void> {
  const metadata = (obj.metadata as Record<string, string>) || {};
  if (metadata.payment_id) {
    await supabase.from("payments").update({ status: "late" }).eq("id", metadata.payment_id);
    return;
  }

  const subscriptionId = extractId(obj.subscription);
  const invoiceId = typeof obj.id === "string" ? obj.id : null;
  const paymentIntentId = extractId(obj.payment_intent);
  if (!subscriptionId) return;

  const { data: pendings } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "pending")
    .order("payment_number", { ascending: true })
    .limit(1);

  if (pendings?.[0]) {
    const patch: Record<string, unknown> = { status: "late" };
    if (invoiceId) patch.stripe_invoice_id = invoiceId;
    if (paymentIntentId) patch.stripe_payment_intent_id = paymentIntentId;
    await supabase.from("payments").update(patch).eq("id", pendings[0].id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (signature) {
      const secrets = [STRIPE_WEBHOOK_SECRET_LIVE, STRIPE_WEBHOOK_SECRET_TEST].filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      );
      if (secrets.length === 0) {
        console.warn("No webhook secret configured — skipping signature verification");
      } else {
        let valid = false;
        for (const secret of secrets) {
          if (await verifyStripeSignature(body, signature, secret)) {
            valid = true;
            break;
          }
        }
        if (!valid) {
          console.error("Invalid Stripe signature (tried all configured secrets)");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const event = JSON.parse(body);
    console.log(`Stripe event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(supabase, event.data.object);
          break;

        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(supabase, event.data.object);
          break;

        case "customer.subscription.created":
          // Spécifique au mode rebill différé (trial_end futur). Le mode immédiat
          // n'a pas besoin de cet event — il est géré via payment_intent.succeeded.
          await handleSubscriptionCreated(supabase, event.data.object);
          break;

        case "setup_intent.succeeded": {
          // Spécifique au mode rebill différé : attache la PM autorisée comme
          // default sur la sub trialing pour que la 1re invoice à trial_end
          // débite correctement. Sans ça → past_due. Sélectionne la clé Stripe
          // selon event.livemode (true = live, false = test).
          const apiKey = event.livemode ? STRIPE_SECRET_KEY_LIVE : STRIPE_SECRET_KEY_TEST;
          if (!apiKey) {
            console.error(
              `[setup_intent.succeeded] no Stripe ${event.livemode ? "live" : "test"} key configured`,
            );
            break;
          }
          await handleSetupIntentSucceeded(event.data.object, apiKey);
          break;
        }

        case "invoice.paid":
        case "invoice.payment_succeeded":
          await handleInvoicePaid(supabase, event.data.object);
          break;

        case "invoice.payment_failed":
        case "charge.failed":
          await handleInvoiceFailed(supabase, event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (handlerErr) {
      console.error(`Handler error for ${event.type}:`, handlerErr);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
