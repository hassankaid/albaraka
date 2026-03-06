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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is CEO
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

    // Verify role
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

    const body = await req.json();
    const apporteur_id = body.beneficiary_id || body.apporteur_id;
    const { month, year } = body;

    if (!apporteur_id || !month || !year) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if invoice already exists for this period
    const { data: existing } = await supabaseAdmin
      .from("apporteur_invoices")
      .select("id")
      .eq("apporteur_id", apporteur_id)
      .eq("period_month", month)
      .eq("period_year", year)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Invoice already exists for this period", invoice_id: existing.id }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get apporteur profile
    const { data: apporteurProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, address, postal_code, city, country, siret, bank_details")
      .eq("id", apporteur_id)
      .single();

    // Find commissions with status 'due' for this apporteur in the given period
    // We match on payments.paid_at within the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const { data: commissions, error: commError } = await supabaseAdmin
      .from("commissions")
      .select("id, sale_id, payment_id, amount, percentage, payments!commissions_payment_id_fkey(amount, paid_at, payment_number), sales!commissions_sale_id_fkey(contact_id, contacts!sales_contact_id_fkey(full_name))")
      .eq("beneficiary_user_id", apporteur_id)
      .eq("role", "apporteur")
      .eq("status", "due")
      .not("payment_id", "is", null);

    if (commError) {
      console.error("Error fetching commissions:", commError);
      return new Response(JSON.stringify({ error: "Failed to fetch commissions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Include all "due" commissions where payment was made up to (but not including) the end of the period
    // This catches past months' commissions that were never invoiced
    const eligibleCommissions = (commissions || []).filter((c: any) => {
      const paidAt = c.payments?.paid_at;
      if (!paidAt) return false;
      return paidAt < endDate;
    });

    if (eligibleCommissions.length === 0) {
      return new Response(JSON.stringify({ error: "No eligible commissions for this period" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalAmount = eligibleCommissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

    // Generate invoice number: FACT-YYYY-MM-NNN
    const { count } = await supabaseAdmin
      .from("apporteur_invoices")
      .select("*", { count: "exact", head: true })
      .eq("period_year", year)
      .eq("period_month", month);

    const invoiceNumber = `FACT-${year}-${String(month).padStart(2, "0")}-${String((count || 0) + 1).padStart(3, "0")}`;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("apporteur_invoices")
      .insert({
        apporteur_id,
        invoice_number: invoiceNumber,
        period_month: month,
        period_year: year,
        total_amount: totalAmount,
        status: "generated",
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      return new Response(JSON.stringify({ error: "Failed to create invoice" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create invoice lines
    const lines = eligibleCommissions.map((c: any) => ({
      invoice_id: invoice.id,
      sale_id: c.sale_id,
      payment_id: c.payment_id,
      client_name: c.sales?.contacts?.full_name || "Inconnu",
      payment_amount: c.payments?.amount || 0,
      payment_date: c.payments?.paid_at || startDate,
      commission_percentage: c.percentage,
      commission_amount: c.amount || 0,
    }));

    const { error: linesError } = await supabaseAdmin
      .from("invoice_lines")
      .insert(lines);

    if (linesError) {
      console.error("Error creating invoice lines:", linesError);
      // Rollback invoice
      await supabaseAdmin.from("apporteur_invoices").delete().eq("id", invoice.id);
      return new Response(JSON.stringify({ error: "Failed to create invoice lines" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update commissions status to 'invoiced'
    const commissionIds = eligibleCommissions.map((c: any) => c.id);
    await supabaseAdmin
      .from("commissions")
      .update({ status: "invoiced" })
      .in("id", commissionIds);

    // Generate HTML invoice
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const bankDetails = apporteurProfile?.bank_details as any;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>${invoiceNumber}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a2e; font-size: 14px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .invoice-title { font-size: 28px; font-weight: 700; color: #6d28d9; }
  .invoice-number { font-size: 16px; color: #666; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f3f0ff; color: #6d28d9; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; }
  .total-row { font-weight: 700; font-size: 16px; background: #f9fafb; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  .bank-info { background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px; }
  .bank-info p { margin: 4px 0; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="invoice-title">FACTURE</div>
      <div class="invoice-number">${invoiceNumber}</div>
      <div style="margin-top:8px;color:#666;">Date : ${new Date().toLocaleDateString("fr-FR")}</div>
      <div style="color:#666;">Période : ${monthNames[month - 1]} ${year}</div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;gap:40px;">
    <div class="section" style="flex:1;">
      <div class="section-title">Émetteur</div>
      <strong>${apporteurProfile?.full_name || ""}</strong><br/>
      ${apporteurProfile?.address || ""}<br/>
      ${apporteurProfile?.postal_code || ""} ${apporteurProfile?.city || ""}<br/>
      ${apporteurProfile?.siret ? `SIRET : ${apporteurProfile.siret}` : ""}
    </div>
    <div class="section" style="flex:1;">
      <div class="section-title">Destinataire</div>
      <strong>ETHICARENA</strong><br/>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Client</th>
        <th>Montant encaissé</th>
        <th>Date paiement</th>
        <th>% Commission</th>
        <th style="text-align:right;">Montant commission</th>
      </tr>
    </thead>
    <tbody>
      ${lines.map((l: any) => `
      <tr>
        <td>${l.client_name}</td>
        <td>${Number(l.payment_amount).toLocaleString("fr-FR")} €</td>
        <td>${new Date(l.payment_date).toLocaleDateString("fr-FR")}</td>
        <td>${l.commission_percentage}%</td>
        <td style="text-align:right;">${Number(l.commission_amount).toLocaleString("fr-FR")} €</td>
      </tr>`).join("")}
      <tr class="total-row">
        <td colspan="4">TOTAL</td>
        <td style="text-align:right;">${totalAmount.toLocaleString("fr-FR")} €</td>
      </tr>
    </tbody>
  </table>

  ${bankDetails ? `
  <div class="bank-info">
    <div class="section-title">Coordonnées bancaires</div>
    ${bankDetails.account_holder ? `<p><strong>Titulaire :</strong> ${bankDetails.account_holder}</p>` : ""}
    ${bankDetails.iban ? `<p><strong>IBAN :</strong> ${bankDetails.iban.replace(/(.{4})/g, "$1 ").trim()}</p>` : ""}
    ${bankDetails.bic ? `<p><strong>BIC :</strong> ${bankDetails.bic}</p>` : ""}
    ${bankDetails.bank_name ? `<p><strong>Banque :</strong> ${bankDetails.bank_name}</p>` : ""}
  </div>` : ""}

  <div class="footer">
    TVA non applicable, article 293 B du CGI.<br/>
    Facture générée automatiquement par Ethicarena.
  </div>
</body>
</html>`;

    // Upload HTML to storage
    const filePath = `${apporteur_id}/${invoiceNumber}.html`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("invoices")
      .upload(filePath, new TextEncoder().encode(htmlContent), {
        contentType: "text/html; charset=utf-8",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading invoice:", uploadError);
    } else {
      // Update invoice with pdf_url (actually html path)
      await supabaseAdmin
        .from("apporteur_invoices")
        .update({ pdf_url: filePath })
        .eq("id", invoice.id);
    }

    return new Response(
      JSON.stringify({ success: true, invoice_id: invoice.id, invoice_number: invoiceNumber, total_amount: totalAmount }),
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
