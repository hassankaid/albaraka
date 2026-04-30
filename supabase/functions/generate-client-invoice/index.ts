// generate-client-invoice v2 — Envoi email avec PDF en pièce jointe.
//
// Le PDF est généré côté front via @react-pdf/renderer et uploadé dans
// Storage par le front (RPC create_client_invoice + set_client_invoice_pdf_path).
// Cette fonction se contente de :
//   1. Récupérer la row client_invoices via payment_id
//   2. Fetch le PDF depuis Storage
//   3. Encoder en base64 + envoyer via Resend avec attachments
//   4. Si vrai client (pas test) : update email_sent_at + email_sent_to
//
// Auth : CEO (anon JWT) ou service_role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") || "AL BARAKA <noreply@albarakaecosysteme.com>";

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function buildEmailHtml(params: {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paidAt: string;
  product: string;
  paymentNumber: number | null;
  totalPayments: number | null;
}): string {
  const fmtEur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");
  const mensInfo = params.paymentNumber && params.totalPayments ? ` (mensualité ${params.paymentNumber}/${params.totalPayments})` : "";
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f1e6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e6;padding:40px 20px;"><tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e6dcc4;">
<tr><td style="padding:32px 32px 16px;border-bottom:2px solid #C5A55A">
  <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;letter-spacing:2px;color:#1a1a2e">AL BARAKA</div>
  <div style="font-size:10px;color:#C5A55A;letter-spacing:3px;text-transform:uppercase;margin-top:4px">Écosystème by Ethicarena</div>
</td></tr>
<tr><td style="padding:24px 32px">
  <h1 style="font-size:18px;color:#1a1a2e;margin:0 0 16px">Bonjour ${escapeHtml(params.clientName)},</h1>
  <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 16px">Nous avons bien reçu votre paiement de <strong>${fmtEur(params.amount)}</strong>${mensInfo} pour le <strong>${escapeHtml(params.product)}</strong>.</p>
  <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 8px">Vous trouverez votre facture <strong>${escapeHtml(params.invoiceNumber)}</strong> en pièce jointe (PDF) — paiement reçu le ${fmtDate(params.paidAt)}.</p>
  <p style="font-size:14px;color:#444;line-height:1.6;margin:24px 0 0">Merci pour votre confiance.<br/><strong>L'équipe AL BARAKA</strong></p>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0e6d0;text-align:center"><p style="font-size:11px;color:#999;margin:0;line-height:1.6">Facture émise par ETHICARENA LLC (Dubai, UAE)<br/><span style="color:#C5A55A;letter-spacing:1.5px;text-transform:uppercase;font-size:10px">AL BARAKA · Écosystème by Ethicarena</span></p></td></tr>
</table></td></tr></table></body></html>`;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function sendInvoiceEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachmentBase64: string;
  attachmentFilename: string;
  apiKey: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: [{ filename: params.attachmentFilename, content: params.attachmentBase64 }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceRoleCall = authHeader.includes(SERVICE_ROLE_KEY);

    if (!isServiceRoleCall) {
      const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "ceo") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json();
    const payment_id = body.payment_id;
    const send_email: boolean = body.send_email !== false;
    const email_to_override: string | undefined = body.email_to_override;

    if (!payment_id) return new Response(JSON.stringify({ error: "payment_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: invoice, error: invErr } = await supabase
      .from("client_invoices")
      .select("*")
      .eq("payment_id", payment_id)
      .maybeSingle();
    if (invErr) return new Response(JSON.stringify({ error: "Invoice lookup failed", detail: invErr }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!invoice) return new Response(JSON.stringify({ error: "Invoice not yet created. Generate it first from the front." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!invoice.html_path) return new Response(JSON.stringify({ error: "PDF not yet uploaded. Generate it first from the front." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (!send_email) {
      return new Response(JSON.stringify({ ok: true, invoice }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: pdfBlob, error: dlErr } = await supabase.storage.from("invoices").download(invoice.html_path);
    if (dlErr || !pdfBlob) return new Response(JSON.stringify({ error: "Failed to fetch PDF from storage", detail: dlErr }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const arrayBuf = await pdfBlob.arrayBuffer();
    const base64 = uint8ToBase64(new Uint8Array(arrayBuf));

    const toEmail = email_to_override || invoice.client_email;
    if (!toEmail) return new Response(JSON.stringify({ error: "No email to send to" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const emailHtml = buildEmailHtml({
      clientName: invoice.client_name,
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.amount),
      paidAt: invoice.paid_at,
      product: invoice.product || "PASS AL BARAKA",
      paymentNumber: invoice.payment_number,
      totalPayments: invoice.total_payments,
    });

    await sendInvoiceEmail({
      to: toEmail,
      subject: `Votre facture ${invoice.invoice_number} — AL BARAKA`,
      html: emailHtml,
      attachmentBase64: base64,
      attachmentFilename: `${invoice.invoice_number}.pdf`,
      apiKey: RESEND_API_KEY,
    });

    let updatedInvoice = invoice;
    if (!email_to_override) {
      const nowIso = new Date().toISOString();
      const { data: upd } = await supabase
        .from("client_invoices")
        .update({ email_sent_at: nowIso, email_sent_to: toEmail })
        .eq("id", invoice.id)
        .select()
        .single();
      if (upd) updatedInvoice = upd;
    }

    return new Response(JSON.stringify({ ok: true, invoice: updatedInvoice, sent_to: toEmail, was_test: !!email_to_override }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("generate-client-invoice error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
