import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "ceo") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "Missing invoice_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get invoice details
    const { data: invoice } = await supabaseAdmin
      .from("apporteur_invoices")
      .select("id, pdf_url, apporteur_id")
      .eq("id", invoice_id)
      .single();

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get invoice lines to revert commission statuses
    const { data: lines } = await supabaseAdmin
      .from("invoice_lines")
      .select("payment_id, sale_id")
      .eq("invoice_id", invoice_id);

    // Revert commissions to 'due'
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await supabaseAdmin
          .from("commissions")
          .update({ status: "due" })
          .eq("payment_id", line.payment_id)
          .eq("sale_id", line.sale_id)
          .eq("beneficiary_user_id", invoice.apporteur_id)
          .eq("role", "apporteur")
          .in("status", ["invoiced", "paid"]);
      }
    }

    // Delete invoice lines
    await supabaseAdmin
      .from("invoice_lines")
      .delete()
      .eq("invoice_id", invoice_id);

    // Delete file from storage
    if (invoice.pdf_url) {
      await supabaseAdmin.storage.from("invoices").remove([invoice.pdf_url]);
    }

    // Delete invoice
    await supabaseAdmin
      .from("apporteur_invoices")
      .delete()
      .eq("id", invoice_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
