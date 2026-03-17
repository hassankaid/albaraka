import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[SYNC-STRIPE] ${step}${d}`);
};

const AMOUNT_TOLERANCE = 0.05; // 5 centimes de tolérance

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    logStep("Starting sync");

    // 1. Get all pending/late payments with contact email
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        id, payment_number, total_payments, amount, due_date, status, sale_id,
        contacts!payments_contact_id_fkey(email)
      `)
      .in("status", ["pending", "late"])
      .order("due_date", { ascending: true });

    if (paymentsError) throw paymentsError;
    if (!payments || payments.length === 0) {
      logStep("No pending/late payments found");
      return new Response(JSON.stringify({ synced: 0, message: "No payments to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(`Found ${payments.length} pending/late payments`);

    // 2. Group payments by contact email
    const paymentsByEmail = new Map<string, typeof payments>();
    for (const p of payments) {
      const email = (p.contacts as any)?.email;
      if (!email) continue;
      const emailLower = email.toLowerCase();
      if (!paymentsByEmail.has(emailLower)) {
        paymentsByEmail.set(emailLower, []);
      }
      paymentsByEmail.get(emailLower)!.push(p);
    }

    logStep(`Grouped into ${paymentsByEmail.size} unique emails`);

    let totalUpdated = 0;
    const changes: { paymentId: string; oldStatus: string; newStatus: string; paidAt?: string; email: string }[] = [];

    // 3. For each email, query Stripe
    for (const [email, emailPayments] of paymentsByEmail) {
      try {
        // Find Stripe customer
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length === 0) {
          logStep(`No Stripe customer for ${email}, skipping`);
          continue;
        }

        const customerId = customers.data[0].id;

        // Get recent invoices (last 12 months worth)
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 24,
        });

        logStep(`${email}: found ${invoices.data.length} Stripe invoices`);

        // Sort DB payments by due_date ascending (FIFO)
        const sortedPayments = [...emailPayments].sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        );

        // Track which Stripe invoices we've already matched
        const matchedInvoiceIds = new Set<string>();

        for (const payment of sortedPayments) {
          const paymentAmountEur = payment.amount; // amount in EUR

          // Try to find a matching Stripe invoice
          // Match criteria: similar amount (within tolerance), not already matched
          // FIFO: oldest unmatched invoice first
          const sortedInvoices = [...invoices.data]
            .filter((inv) => !matchedInvoiceIds.has(inv.id))
            .sort((a, b) => a.created - b.created);

          for (const invoice of sortedInvoices) {
            const invoiceAmountEur = invoice.amount_paid / 100; // Stripe amounts are in cents
            const amountDiff = Math.abs(invoiceAmountEur - paymentAmountEur);

            if (amountDiff > AMOUNT_TOLERANCE) continue;

            // Amount matches! Now check invoice status
            if (invoice.status === "paid") {
              // Mark as paid
              const paidAt = invoice.status_transitions?.paid_at
                ? new Date(invoice.status_transitions.paid_at * 1000).toISOString().split("T")[0]
                : new Date(invoice.created * 1000).toISOString().split("T")[0];

              const { error: updateError } = await supabase
                .from("payments")
                .update({ status: "paid", paid_at: paidAt })
                .eq("id", payment.id);

              if (!updateError) {
                matchedInvoiceIds.add(invoice.id);
                totalUpdated++;
                changes.push({
                  paymentId: payment.id,
                  oldStatus: payment.status,
                  newStatus: "paid",
                  paidAt,
                  email,
                });
                logStep(`✅ ${email} payment ${payment.payment_number}/${payment.total_payments} → paid (${paidAt})`, {
                  amount: paymentAmountEur,
                  stripeInvoice: invoice.id,
                });
              }
              break; // Move to next payment
            } else if (invoice.status === "open" && invoice.due_date && invoice.due_date * 1000 < Date.now()) {
              // Past due open invoice → late
              if (payment.status !== "late") {
                const { error: updateError } = await supabase
                  .from("payments")
                  .update({ status: "late" })
                  .eq("id", payment.id);

                if (!updateError) {
                  matchedInvoiceIds.add(invoice.id);
                  totalUpdated++;
                  changes.push({
                    paymentId: payment.id,
                    oldStatus: payment.status,
                    newStatus: "late",
                    email,
                  });
                  logStep(`⚠️ ${email} payment ${payment.payment_number}/${payment.total_payments} → late`, {
                    stripeInvoice: invoice.id,
                  });
                }
              }
              break;
            } else if (invoice.status === "uncollectible" || invoice.status === "void") {
              // Failed → late
              if (payment.status !== "late") {
                const { error: updateError } = await supabase
                  .from("payments")
                  .update({ status: "late" })
                  .eq("id", payment.id);

                if (!updateError) {
                  matchedInvoiceIds.add(invoice.id);
                  totalUpdated++;
                  changes.push({
                    paymentId: payment.id,
                    oldStatus: payment.status,
                    newStatus: "late",
                    email,
                  });
                  logStep(`⚠️ ${email} payment ${payment.payment_number}/${payment.total_payments} → late (uncollectible)`, {
                    stripeInvoice: invoice.id,
                  });
                }
              }
              break;
            }
          }
        }
      } catch (stripeError) {
        logStep(`Error processing ${email}`, { error: String(stripeError) });
        continue; // Don't stop the whole sync for one customer error
      }
    }

    logStep(`Sync complete: ${totalUpdated} payments updated`);

    return new Response(
      JSON.stringify({
        synced: totalUpdated,
        changes,
        total_checked: payments.length,
        unique_emails: paymentsByEmail.size,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logStep("ERROR", { message: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
