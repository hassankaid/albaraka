// generate-client-invoice v3 — Email AL BARAKA aux couleurs de la marque,
// wording musulman, PDF en pièce jointe.
//
// Le PDF est généré côté front via @react-pdf/renderer et uploadé dans
// Storage par le front. Cette fonction se contente de :
//   1. Récupérer la row client_invoices via payment_id
//   2. Fetch le PDF depuis Storage
//   3. Encoder en base64 + envoyer via Resend avec attachments
//   4. Si vrai client (pas test) : update email_sent_at + email_sent_to

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

// ===== Brand AL BARAKA (aligné avec send-apporteur-access-email) =====
const BRAND = {
  gold: "#D4AF37",
  goldSoft: "rgba(212,175,55,0.25)",
  black: "#0A0A0A",
  cardBg: "#141414",
  textMain: "#EDEDED",
  textSecondary: "#9A9A9A",
  domain: "https://plateforme.albarakaecosysteme.com",
  domainLabel: "plateforme.albarakaecosysteme.com",
};

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function firstName(fullName: string): string {
  return (fullName || "").trim().split(/\s+/)[0] || "";
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
  const prenom = firstName(params.clientName);
  const mensInfo = params.paymentNumber && params.totalPayments
    ? `(mensualité ${params.paymentNumber}/${params.totalPayments})`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<title>Ta facture ${escapeHtml(params.invoiceNumber)} — AL BARAKA</title>
<style type="text/css">
  :root { color-scheme: dark only; supported-color-schemes: dark only; }
  html, body { margin:0 !important; padding:0 !important; width:100% !important; height:100% !important; background-color:${BRAND.black} !important; }
  body, table, td, div, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse !important; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  .bg-black { background-color:${BRAND.black} !important; }
  .bg-card { background-color:${BRAND.cardBg} !important; }
  @media (prefers-color-scheme: light) {
    html, body, .bg-black, [data-bg="black"] { background-color:${BRAND.black} !important; }
    .bg-card, [data-bg="card"] { background-color:${BRAND.cardBg} !important; }
  }
  @media screen and (max-width: 600px) {
    .container { width:100% !important; max-width:100% !important; }
    .px-mobile { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>
<body class="bg-black" bgcolor="${BRAND.black}" style="margin:0;padding:0;width:100%;height:100%;background-color:${BRAND.black};font-family:Georgia,'Times New Roman',serif;color:${BRAND.textMain};">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BRAND.black};opacity:0;">
    Ta facture ${escapeHtml(params.invoiceNumber)} est en pièce jointe.
  </div>
  <table role="presentation" class="bg-black" data-bg="black" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.black}" style="background-color:${BRAND.black};width:100%;border-collapse:collapse;">
    <tr>
      <td class="bg-black" data-bg="black" bgcolor="${BRAND.black}" align="center" valign="top" style="background-color:${BRAND.black};padding:40px 16px;">
        <table role="presentation" class="container bg-card" data-bg="card" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.cardBg}" style="width:600px;max-width:600px;background-color:${BRAND.cardBg};border:1px solid ${BRAND.goldSoft};border-radius:12px;">
          <tr>
            <td class="bg-card px-mobile" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:48px 32px 16px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;color:${BRAND.gold};letter-spacing:6px;font-weight:normal;">AL BARAKA</h1>
              <p style="margin:10px 0 0 0;color:${BRAND.textSecondary};font-size:11px;letter-spacing:3px;text-transform:uppercase;">L'écosystème</p>
              <div style="width:60px;height:1px;background-color:${BRAND.gold};margin:24px auto 0 auto;line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td class="bg-card px-mobile" data-bg="card" bgcolor="${BRAND.cardBg}" style="background-color:${BRAND.cardBg};padding:32px 40px 8px;">
              <h2 style="margin:0 0 20px 0;font-size:22px;color:${BRAND.textMain};font-weight:normal;">
                As salam alaykoum${prenom ? ` ${escapeHtml(prenom)}` : ""},
              </h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Baraka Allahou fik pour ta confiance.
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Nous avons bien reçu ton paiement de <strong style="color:${BRAND.gold};font-weight:normal;">${fmtEur(params.amount)}</strong> ${mensInfo} pour le <strong style="color:${BRAND.gold};font-weight:normal;">${escapeHtml(params.product)}</strong>, encaissé le ${fmtDate(params.paidAt)}.
              </p>
              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Tu trouveras ta facture <strong style="color:${BRAND.gold};font-weight:normal;">${escapeHtml(params.invoiceNumber)}</strong> en pièce jointe (PDF).
              </p>
              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};font-style:italic;">
                Qu'Allah ﷻ te bénisse et te facilite dans ton parcours.
              </p>
              <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
                Wa salam alaykoum,
              </p>
              <p style="margin:0 0 0 0;font-size:14px;line-height:1.6;color:${BRAND.textMain};">
                <strong style="color:${BRAND.gold};font-weight:normal;">L'équipe AL BARAKA</strong>
              </p>
            </td>
          </tr>
          <tr><td class="bg-card" data-bg="card" bgcolor="${BRAND.cardBg}" style="background-color:${BRAND.cardBg};padding:8px 0 32px;"></td></tr>
          <tr>
            <td class="bg-card" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:20px 32px;border-top:1px solid ${BRAND.goldSoft};">
              <p style="margin:0 0 4px 0;font-size:11px;color:${BRAND.textSecondary};letter-spacing:0.5px;">
                Facture émise par <strong style="color:${BRAND.textMain};font-weight:normal;">ETHICARENA LLC</strong> (Dubai, UAE)
              </p>
              <p style="margin:0;font-size:11px;color:${BRAND.textSecondary};letter-spacing:0.5px;">
                © AL BARAKA — <a href="${BRAND.domain}" style="color:${BRAND.gold};text-decoration:none;">${BRAND.domainLabel}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    if (!invoice) return new Response(JSON.stringify({ error: "Invoice not yet created" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!invoice.html_path) return new Response(JSON.stringify({ error: "PDF not yet uploaded" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (!send_email) {
      return new Response(JSON.stringify({ ok: true, invoice }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: pdfBlob, error: dlErr } = await supabase.storage.from("invoices").download(invoice.html_path);
    if (dlErr || !pdfBlob) return new Response(JSON.stringify({ error: "Failed to fetch PDF", detail: dlErr }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      subject: `Ta facture ${invoice.invoice_number} — AL BARAKA`,
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
