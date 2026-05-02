import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_WEBHOOK_SECRET_LIVE = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const STRIPE_WEBHOOK_SECRET_TEST = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
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
  if (metadata.source !== "bon_commande") return;

  const email = String(metadata.customer_email || "").trim().toLowerCase();
  const fullName = String(metadata.customer_full_name || "").trim();
  if (!email || !fullName) {
    console.error("[bon_commande] missing email/fullName in metadata", metadata);
    return;
  }

  const installments = Math.max(1, Math.min(8, Number(metadata.installments) || 1));
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

  // ── Acompte : si le checkout a lookup un payment_code, l'acompte est
  //    déjà déduit côté Stripe (payable_cents). On lie la vente principale
  //    à la vente acompte via parent_sale_id pour le tracking admin.
  const payableCents = Number(metadata.payable_cents) || 0;
  const acompteTotalCents = Number(metadata.acompte_total_cents) || 0;
  const acompteSaleIds = (metadata.acompte_sale_ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // amount_ht de la vente principale = ce qui est PAYÉ via cette vente
  // (acompte exclu — l'acompte a sa propre vente avec sa propre amount_ht).
  // discount_amount = la remise appliquée sur le brut 2500 €.
  const totalGross = 2500;
  const discountAmount =
    Math.round(((totalGross * discountPercent) / 100) * 100) / 100;
  const totalNet =
    payableCents > 0
      ? payableCents / 100
      : totalGross - discountAmount; // fallback ancien flow

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
      product: "PASS AL BARAKA",
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
    console.error("[bon_commande] sale insert failed:", saleErr);
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
    console.error("[bon_commande] payments insert failed:", paymentsErr);
    throw paymentsErr;
  }

  await markFirstPaymentPaid(supabase, sale.id, ids);

  // Grant PASS AL BARAKA to unlock parcours + formations via PassGuard.
  // Idempotent: skip if an active pass already exists for this user.
  try {
    const { data: existingPass } = await supabase
      .from("user_passes")
      .select("id")
      .eq("user_id", profileId!)
      .eq("pass_type", "al_baraka")
      .is("revoked_at", null)
      .limit(1);
    if (!existingPass || existingPass.length === 0) {
      await supabase.from("user_passes").insert({
        user_id: profileId,
        pass_type: "al_baraka",
        notes: "auto-granted on bon_commande payment",
      });
      console.log(`[bon_commande] pass al_baraka granted to profile=${profileId}`);
    }
  } catch (e) {
    console.error("[bon_commande] grant pass failed:", e);
  }

  console.log(
    `[bon_commande] created profile=${profileId} sale=${sale.id} installments=${installments}`,
  );

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-apporteur-access-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_ids: [profileId] }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[bon_commande] access-email failed ${res.status}: ${text}`);
    } else {
      console.log(`[bon_commande] access-email sent to profile=${profileId}`);
    }
  } catch (e) {
    console.error("[bon_commande] failed to invoke access-email:", e);
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

  // Branche bon_commande (PASS AL BARAKA, 1x ou 2-8x)
  if (metadata.source !== "bon_commande") return;

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

  // Idempotency: if this invoice is already recorded, skip
  const { data: already } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_invoice_id", invoiceId)
    .maybeSingle();
  if (already) return;

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

  await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: todayISO(),
      stripe_invoice_id: invoiceId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", target.id);

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
