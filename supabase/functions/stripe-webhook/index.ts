import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_WEBHOOK_SECRET_LIVE = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const STRIPE_WEBHOOK_SECRET_TEST = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
const STRIPE_SECRET_KEY_LIVE = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_SECRET_KEY_TEST = Deno.env.get("STRIPE_SECRET_KEY_TEST");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function stripePatch(
  apiKey: string,
  path: string,
  params: Record<string, string | number>,
): Promise<unknown> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.append(k, String(v));
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stripe ${path} ${res.status}: ${err}`);
  }
  return await res.json();
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

async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Record<string, unknown>,
): Promise<void> {
  const metadata = (session.metadata as Record<string, string>) || {};
  if (metadata.source !== "bon_commande") {
    console.log(`[checkout] session ${session.id} is not a bon_commande, skipping`);
    return;
  }

  const sessionId = String(session.id);

  // Idempotency: skip if sale already exists
  const { data: existingSale } = await supabase
    .from("sales")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (existingSale) {
    console.log(`[checkout] sale already exists for session ${sessionId}`);
    return;
  }

  const details = (session.customer_details as Record<string, unknown>) || {};
  const address = (details.address as Record<string, unknown>) || {};
  const email = String(details.email || session.customer_email || "").toLowerCase().trim();
  const fullName = String(details.name || "").trim();
  const phone = String(details.phone || "").trim();

  if (!email) {
    console.error(`[checkout] no email on session ${sessionId}`);
    return;
  }

  // ---- Profile (auth user) ----
  let profileId: string | null = null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, origin, onboarding_completed")
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
    if (createErr || !created?.user) {
      console.error("[checkout] createUser failed:", createErr);
      throw createErr ?? new Error("createUser returned no user");
    }
    profileId = created.user.id;

    await supabase
      .from("profiles")
      .update({
        full_name: fullName || email,
        phone: phone || null,
        address: (address.line1 as string) || null,
        postal_code: (address.postal_code as string) || null,
        city: (address.city as string) || null,
        country: (address.country as string) || null,
        origin: "bon_commande",
      })
      .eq("id", profileId);
  }

  // ---- Contact (upsert by email) ----
  const { data: contact, error: contactErr } = await supabase
    .from("contacts")
    .upsert(
      { email, full_name: fullName || null, phone_original: phone || null },
      { onConflict: "email" },
    )
    .select("id")
    .single();

  if (contactErr || !contact) {
    console.error("[checkout] contact upsert failed:", contactErr);
    throw contactErr ?? new Error("contact upsert failed");
  }

  // ---- Sale ----
  const installments = Math.max(1, Math.min(8, Number(metadata.installments) || 1));
  const discountPercent = Number(metadata.discount_percent) || 0;
  const couponCode = metadata.coupon_code || null;
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
      stripe_session_id: sessionId,
      payment_status: "pending",
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (saleErr || !sale) {
    console.error("[checkout] sale insert failed:", saleErr);
    throw saleErr ?? new Error("sale insert failed");
  }

  // ---- Payments (N rows) ----
  const subscriptionId = extractId(session.subscription);
  const paymentIntentId = extractId(session.payment_intent);
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
    stripe_subscription_id: subscriptionId,
  }));

  const { error: paymentsErr } = await supabase.from("payments").insert(rows);
  if (paymentsErr) {
    console.error("[checkout] payments insert failed:", paymentsErr);
    throw paymentsErr;
  }

  if (installments === 1 && session.payment_status === "paid") {
    await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: todayISO(),
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("sale_id", sale.id)
      .eq("payment_number", 1);
  }

  // Subscription mode : on fixe cancel_at après création pour borner le nombre
  // d'échéances. Stripe n'accepte plus ce paramètre à la création du checkout.
  if (installments >= 2 && subscriptionId) {
    const isLive = session.livemode === true;
    const apiKey = isLive ? STRIPE_SECRET_KEY_LIVE : STRIPE_SECRET_KEY_TEST;
    if (apiKey) {
      const cancelDate = new Date();
      cancelDate.setMonth(cancelDate.getMonth() + installments);
      cancelDate.setDate(cancelDate.getDate() - 1);
      const cancelAt = Math.floor(cancelDate.getTime() / 1000);
      try {
        await stripePatch(apiKey, `/subscriptions/${subscriptionId}`, { cancel_at: cancelAt });
        console.log(`[checkout] subscription ${subscriptionId} cancel_at=${cancelAt} set`);
      } catch (e) {
        console.error(`[checkout] failed to set cancel_at on ${subscriptionId}:`, e);
      }
    } else {
      console.error(`[checkout] no STRIPE_SECRET_KEY for livemode=${isLive}`);
    }
  }

  console.log(`[checkout] created profile=${profileId} sale=${sale.id} installments=${installments}`);

  // ---- Send access email ----
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
      console.error(`[checkout] access-email failed ${res.status}: ${text}`);
    } else {
      console.log(`[checkout] access-email sent to profile=${profileId}`);
    }
  } catch (e) {
    console.error("[checkout] failed to invoke access-email:", e);
  }
}

async function handleInvoicePaid(
  supabase: SupabaseClient,
  obj: Record<string, unknown>,
): Promise<void> {
  const metadata = (obj.metadata as Record<string, string>) || {};

  if (metadata.payment_id) {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: todayISO() })
      .eq("id", metadata.payment_id);
    console.log(`[invoice.paid] legacy metadata payment ${metadata.payment_id}`);
    return;
  }

  const subscriptionId = extractId(obj.subscription);
  const invoiceId = typeof obj.id === "string" ? obj.id : null;
  const paymentIntentId = extractId(obj.payment_intent);

  if (!subscriptionId || !invoiceId) {
    console.log(`[invoice.paid] no subscription/invoice id, skipping`);
    return;
  }

  const { data: already } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_invoice_id", invoiceId)
    .maybeSingle();
  if (already) {
    console.log(`[invoice.paid] invoice ${invoiceId} already recorded`);
    return;
  }

  const { data: pendings } = await supabase
    .from("payments")
    .select("id, payment_number")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "pending")
    .order("payment_number", { ascending: true })
    .limit(1);

  const target = pendings?.[0];
  if (!target) {
    console.log(`[invoice.paid] no pending payment for subscription ${subscriptionId}`);
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
    await supabase
      .from("payments")
      .update({ status: "late" })
      .eq("id", metadata.payment_id);
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

        case "invoice.paid":
        case "invoice.payment_succeeded":
        case "payment_intent.succeeded":
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
