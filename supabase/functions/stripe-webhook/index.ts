import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Stripe webhook secret for signature verification
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  // Parse the signature header
  const parts = signature.split(",");
  let timestamp = "";
  let v1Signature = "";
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signature = value;
  }

  if (!timestamp || !v1Signature) return false;

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === v1Signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // Verify signature if webhook secret is configured
    if (STRIPE_WEBHOOK_SECRET && signature) {
      const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
      if (!isValid) {
        console.error("Invalid Stripe signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(body);
    console.log(`Stripe event received: ${event.type}`);

    switch (event.type) {
      case "invoice.paid":
      case "payment_intent.succeeded": {
        // Extract metadata to find the payment ID
        const metadata = event.data.object.metadata || {};
        const paymentId = metadata.payment_id;

        if (paymentId) {
          const paidAt = new Date().toISOString().split("T")[0];
          const { error } = await supabase
            .from("payments")
            .update({ status: "paid", paid_at: paidAt })
            .eq("id", paymentId);

          if (error) {
            console.error("Error updating payment to paid:", error);
          } else {
            console.log(`Payment ${paymentId} marked as paid`);
          }
        } else {
          console.log("No payment_id in metadata, skipping");
        }
        break;
      }

      case "invoice.payment_failed":
      case "charge.failed": {
        const metadata = event.data.object.metadata || {};
        const paymentId = metadata.payment_id;

        if (paymentId) {
          const { error } = await supabase
            .from("payments")
            .update({ status: "late" })
            .eq("id", paymentId);

          if (error) {
            console.error("Error updating payment to late:", error);
          } else {
            console.log(`Payment ${paymentId} marked as late`);
          }
        } else {
          console.log("No payment_id in metadata, skipping");
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
