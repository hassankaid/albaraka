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
          country: metadata.customer_country || null,
          role: "apporteur",
          origin: "bon_commande",
        },
        { onConflict: "id" },
      );
  }

  // Upsert contact
  const { data: contact, error: contactErr } = await supabase
    .from("contacts")
    .upsert(
      {
        email,
        full_name: fullName || null,
        phone_original: metadata.customer_phone || null,
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();

  if (contactErr || !contact) {
    console.error("[bon_commande] contact upsert failed:", contactErr);
    throw contactErr ?? new Error("contact upsert failed");
  }

  // Sale
  const totalGross = 2500;
  const discountAmount = Math.round((totalGross * discountPercent) / 100 * 100) / 100;
  const totalNet = totalGross - discountAmount;

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

  await supabase
    .from("payments")
    .update(patch)
    .eq("sale_id", saleId)
    .eq("payment_number", 1)
    .eq("status", "pending");
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

  if (metadata.source !== "bon_commande") return;

  const piId = typeof pi.id === "string" ? pi.id : null;
  const subscriptionId = metadata.stripe_subscription_id || null;
  const invoiceId = typeof pi.invoice === "string" ? pi.invoice : extractId(pi.invoice);

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

  // Find oldest pending payment for this subscription
  const { data: pendings } = await supabase
    .from("payments")
    .select("id, payment_number")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "pending")
    .order("payment_number", { ascending: true })
    .limit(1);

  const target = pendings?.[0];
  if (!target) {
    // Probably the sale hasn't been created yet (payment_intent.succeeded
    // hasn't fired). It will handle it.
    console.log(`[invoice.paid] no pending payment yet for subscription ${subscriptionId}`);
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
  if (!subscriptionId) return;

  const { data: pendings } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "pending")
    .order("payment_number", { ascending: true })
    .limit(1);

  if (pendings?.[0]) {
    await supabase.from("payments").update({ status: "late" }).eq("id", pendings[0].id);
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
