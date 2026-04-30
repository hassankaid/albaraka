// generate-client-invoice — Génère une facture client à partir d'un payment.id
//
// Workflow :
//   1. Auth : CEO (anon JWT) OU service role (appelé par stripe-webhook)
//   2. Récupère payment + sale + contact + buyer profile
//   3. Génère un numéro séquentiel via RPC next_client_invoice_number
//   4. Build l'HTML stylé AL BARAKA (inspiré de InvoicePdfDocument)
//   5. Upload dans Storage `invoices` au chemin `clients/{contact_id}/{invoice_number}.html`
//   6. INSERT dans client_invoices avec snapshot client + lien
//   7. Si `send_email = true` : envoie via Resend avec lien signé Storage
//
// Idempotent : si la facture existe déjà pour ce payment, retourne
// l'existante (sauf si regenerate=true).
//
// Test mode : `email_to_override` permet d'envoyer la facture vers une autre
// adresse (la tienne) pour validation avant envoi au vrai client.

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

// ─── Identité légale émettrice (cohérent avec InvoicePdfDocument.tsx) ───
const ISSUER = {
  name: "ETHICARENA LLC",
  rep: "Sidali GHALMI",
  line1: "Meydan Grandstand, 6th floor",
  line2: "Meydan Road, Nad Al Sheba",
  city: "Dubai",
  country: "United Arab Emirates",
};

// ─── Build HTML facture (style AL BARAKA gold) ──────────────────────────
function buildInvoiceHtml(p: {
  invoiceNumber: string;
  paidAt: string;
  amount: number;
  paymentNumber: number | null;
  totalPayments: number | null;
  product: string;
  client: {
    name: string;
    email: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
  };
}): string {
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");
  const fmtEur = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  const mensLabel =
    p.paymentNumber && p.totalPayments
      ? `Mensualité ${p.paymentNumber}/${p.totalPayments}`
      : "Paiement";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${p.invoiceNumber}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a2e; font-size: 13px; background: #fff; }
  .container { max-width: 760px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #C5A55A; }
  .brand-block { font-family: 'Cormorant Garamond', Georgia, serif; }
  .brand-name { font-size: 28px; font-weight: 600; color: #1a1a2e; letter-spacing: 2px; }
  .brand-sub { font-size: 11px; color: #C5A55A; letter-spacing: 3px; margin-top: 4px; text-transform: uppercase; }
  .invoice-block { text-align: right; }
  .invoice-title { font-size: 24px; font-weight: 700; color: #C5A55A; letter-spacing: 1px; }
  .invoice-number { font-size: 14px; color: #666; margin-top: 6px; font-family: 'Courier New', monospace; }
  .invoice-date { font-size: 12px; color: #888; margin-top: 4px; }
  .parties { display: flex; gap: 40px; margin-bottom: 32px; }
  .party { flex: 1; }
  .party-label { font-size: 10px; text-transform: uppercase; color: #C5A55A; letter-spacing: 2px; font-weight: 600; margin-bottom: 8px; }
  .party-name { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
  .party-line { font-size: 12px; color: #555; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead th { background: #FDF8ED; color: #8a6d2c; text-align: left; padding: 12px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
  thead th.right { text-align: right; }
  tbody td { padding: 14px; border-bottom: 1px solid #f0e6d0; font-size: 13px; }
  tbody td.right { text-align: right; }
  .desc-main { font-weight: 600; color: #1a1a2e; }
  .desc-sub { font-size: 11px; color: #888; margin-top: 2px; }
  .total-row { background: #FDF8ED; font-weight: 700; font-size: 15px; }
  .total-row td { padding: 14px; border-bottom: none; }
  .total-label { color: #1a1a2e; }
  .total-value { color: #C5A55A; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #f0e6d0; font-size: 11px; color: #999; text-align: center; line-height: 1.6; }
  .footer .ecosys { color: #C5A55A; letter-spacing: 1.5px; font-size: 10px; text-transform: uppercase; }
  @media print {
    body { padding: 20px; }
    .container { max-width: 100%; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-block">
        <div class="brand-name">AL BARAKA</div>
        <div class="brand-sub">Écosystème by Ethicarena</div>
      </div>
      <div class="invoice-block">
        <div class="invoice-title">FACTURE</div>
        <div class="invoice-number">${p.invoiceNumber}</div>
        <div class="invoice-date">Date d'émission : ${fmtDate(new Date().toISOString())}</div>
        <div class="invoice-date">Date de paiement : ${fmtDate(p.paidAt)}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-label">Émetteur</div>
        <div class="party-name">${ISSUER.name}</div>
        <div class="party-line">${ISSUER.rep}</div>
        <div class="party-line">${ISSUER.line1}</div>
        <div class="party-line">${ISSUER.line2}</div>
        <div class="party-line">${ISSUER.city}, ${ISSUER.country}</div>
      </div>
      <div class="party">
        <div class="party-label">Destinataire</div>
        <div class="party-name">${escapeHtml(p.client.name)}</div>
        ${p.client.address ? `<div class="party-line">${escapeHtml(p.client.address)}</div>` : ""}
        ${p.client.postal_code || p.client.city ? `<div class="party-line">${escapeHtml(p.client.postal_code || "")} ${escapeHtml(p.client.city || "")}</div>` : ""}
        ${p.client.country ? `<div class="party-line">${escapeHtml(p.client.country)}</div>` : ""}
        ${p.client.email ? `<div class="party-line">${escapeHtml(p.client.email)}</div>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="right">Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="desc-main">${escapeHtml(p.product || "PASS AL BARAKA")}</div>
            <div class="desc-sub">${mensLabel} — Paiement reçu le ${fmtDate(p.paidAt)}</div>
          </td>
          <td class="right">${fmtEur(p.amount)}</td>
        </tr>
        <tr class="total-row">
          <td class="total-label">Total payé</td>
          <td class="right total-value">${fmtEur(p.amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="ecosys">AL BARAKA — Écosystème by Ethicarena</div>
      <div style="margin-top:6px;">Facture émise par ${ISSUER.name} (${ISSUER.city}, ${ISSUER.country})</div>
      <div style="margin-top:4px;">Document généré automatiquement — Merci pour votre confiance.</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ─── Email body ─────────────────────────────────────────────────────────
function buildEmailHtml(params: {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paidAt: string;
  product: string;
  paymentNumber: number | null;
  totalPayments: number | null;
  invoiceUrl: string;
}): string {
  const fmtEur = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");
  const mensInfo =
    params.paymentNumber && params.totalPayments
      ? ` (mensualité ${params.paymentNumber}/${params.totalPayments})`
      : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f1e6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e6;padding:40px 20px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e6dcc4;">
        <tr><td style="padding:32px 32px 16px 32px;border-bottom:2px solid #C5A55A;">
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;letter-spacing:2px;color:#1a1a2e;">AL BARAKA</div>
          <div style="font-size:10px;color:#C5A55A;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Écosystème by Ethicarena</div>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <h1 style="font-size:18px;color:#1a1a2e;margin:0 0 16px 0;">Bonjour ${escapeHtml(params.clientName)},</h1>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 16px 0;">
            Nous avons bien reçu votre paiement de <strong>${fmtEur(params.amount)}</strong>${mensInfo} pour le <strong>${escapeHtml(params.product)}</strong>.
          </p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px 0;">
            Vous trouverez votre facture <strong>${escapeHtml(params.invoiceNumber)}</strong> en pièce jointe — paiement reçu le ${fmtDate(params.paidAt)}.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:#C5A55A;border-radius:6px;">
              <a href="${params.invoiceUrl}" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.5px;">📄 Consulter ma facture</a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#888;line-height:1.6;margin:24px 0 0 0;text-align:center;">
            Le lien est valable 30 jours. Tu peux aussi imprimer ou enregistrer cette page en PDF (Ctrl+P → "Enregistrer au format PDF").
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px 32px;border-top:1px solid #f0e6d0;text-align:center;">
          <p style="font-size:11px;color:#999;margin:0;line-height:1.6;">
            Facture émise par ETHICARENA LLC (Dubai, UAE)<br/>
            <span style="color:#C5A55A;letter-spacing:1.5px;text-transform:uppercase;font-size:10px;">AL BARAKA · Écosystème by Ethicarena</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send email via Resend ──────────────────────────────────────────────
async function sendInvoiceEmail(params: {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

// ─── Main handler ───────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceRoleCall = authHeader.includes(SERVICE_ROLE_KEY);

    // Auth check : CEO ou service role
    if (!isServiceRoleCall) {
      const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "ceo") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json();
    const payment_id = body.payment_id;
    const send_email: boolean = body.send_email !== false; // default true
    const email_to_override: string | undefined = body.email_to_override;
    const regenerate: boolean = body.regenerate === true;

    if (!payment_id) {
      return new Response(JSON.stringify({ error: "payment_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérif idempotence : facture existe déjà ?
    const { data: existing } = await supabase
      .from("client_invoices").select("*").eq("payment_id", payment_id).maybeSingle();
    if (existing && !regenerate) {
      // Si email demandé et pas encore envoyé, on tente le renvoi
      if (send_email && !existing.email_sent_at) {
        // continue → reset existing pour passer en mode "send only"
      } else {
        return new Response(JSON.stringify({ ok: true, invoice: existing, reused: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Récupère payment + sale + contact + buyer profile
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select(`id, sale_id, contact_id, payment_number, total_payments, amount, paid_at, status,
               sales!payments_sale_id_fkey(id, product, buyer_profile_id, contact_id),
               contacts!payments_contact_id_fkey(id, full_name, email)`)
      .eq("id", payment_id).single();

    if (payErr || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payment.status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not paid yet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sale: any = payment.sales;
    const contact: any = payment.contacts;
    const contactId = contact?.id || sale?.contact_id || payment.contact_id;
    const saleId = sale?.id || payment.sale_id;

    // Récupère le profile acheteur pour adresse / pays
    let buyerProfile: any = null;
    if (sale?.buyer_profile_id) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, address, postal_code, city, country")
        .eq("id", sale.buyer_profile_id).single();
      buyerProfile = data;
    }

    const clientName = (buyerProfile?.full_name || contact?.full_name || "Client").toString().trim();
    const clientEmail = (buyerProfile?.email || contact?.email || "").toString().trim();

    // Numérotation (si nouvelle facture)
    let invoiceNumber: string;
    let storedHtmlPath: string;
    let invoiceRecord: any;

    if (existing && regenerate) {
      invoiceNumber = existing.invoice_number;
      storedHtmlPath = existing.html_path;
      invoiceRecord = existing;
    } else if (existing && !regenerate) {
      // Cas reuse pour envoi email seulement
      invoiceNumber = existing.invoice_number;
      storedHtmlPath = existing.html_path;
      invoiceRecord = existing;
    } else {
      const paidDate = new Date(payment.paid_at);
      const year = paidDate.getUTCFullYear();
      const month = paidDate.getUTCMonth() + 1;
      const { data: numData, error: numErr } = await supabase
        .rpc("next_client_invoice_number", { p_year: year, p_month: month });
      if (numErr || !numData) {
        return new Response(JSON.stringify({ error: "Failed to generate invoice number", detail: numErr }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invoiceNumber = numData as string;
      storedHtmlPath = `clients/${contactId}/${invoiceNumber}.html`;
    }

    // Génère et upload l'HTML (si pas encore fait, ou regen)
    if (!existing || regenerate) {
      const html = buildInvoiceHtml({
        invoiceNumber,
        paidAt: payment.paid_at,
        amount: Number(payment.amount),
        paymentNumber: payment.payment_number,
        totalPayments: payment.total_payments,
        product: sale?.product || "PASS AL BARAKA",
        client: {
          name: clientName,
          email: clientEmail || null,
          address: buyerProfile?.address || null,
          postal_code: buyerProfile?.postal_code || null,
          city: buyerProfile?.city || null,
          country: buyerProfile?.country || null,
        },
      });

      const { error: uploadErr } = await supabase.storage
        .from("invoices")
        .upload(storedHtmlPath, new TextEncoder().encode(html), {
          contentType: "text/html; charset=utf-8",
          upsert: true,
        });
      if (uploadErr) {
        return new Response(JSON.stringify({ error: "Storage upload failed", detail: uploadErr }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (existing && regenerate) {
        await supabase.from("client_invoices")
          .update({ html_path: storedHtmlPath })
          .eq("id", existing.id);
        invoiceRecord = { ...existing, html_path: storedHtmlPath };
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("client_invoices")
          .insert({
            invoice_number: invoiceNumber,
            payment_id,
            sale_id: saleId,
            contact_id: contactId,
            client_name: clientName,
            client_email: clientEmail || null,
            client_address: buyerProfile?.address || null,
            client_postal_code: buyerProfile?.postal_code || null,
            client_city: buyerProfile?.city || null,
            client_country: buyerProfile?.country || null,
            amount: Number(payment.amount),
            payment_number: payment.payment_number,
            total_payments: payment.total_payments,
            product: sale?.product || "PASS AL BARAKA",
            paid_at: payment.paid_at,
            html_path: storedHtmlPath,
          })
          .select()
          .single();
        if (insErr) {
          return new Response(JSON.stringify({ error: "Failed to insert invoice row", detail: insErr }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        invoiceRecord = inserted;
      }
    }

    // Envoi email si demandé
    if (send_email) {
      if (!RESEND_API_KEY) {
        return new Response(JSON.stringify({ ok: true, invoice: invoiceRecord, email_skipped: "RESEND_API_KEY missing" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Lien signé Storage 30 jours
      const { data: signed } = await supabase.storage
        .from("invoices")
        .createSignedUrl(storedHtmlPath, 60 * 60 * 24 * 30);
      const invoiceUrl = signed?.signedUrl || "";

      const toEmail = email_to_override || clientEmail;
      if (!toEmail) {
        return new Response(JSON.stringify({ error: "No email to send to" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailHtml = buildEmailHtml({
        clientName,
        invoiceNumber,
        amount: Number(payment.amount),
        paidAt: payment.paid_at,
        product: sale?.product || "PASS AL BARAKA",
        paymentNumber: payment.payment_number,
        totalPayments: payment.total_payments,
        invoiceUrl,
      });

      const subject = `Votre facture ${invoiceNumber} — AL BARAKA`;
      await sendInvoiceEmail({ to: toEmail, subject, html: emailHtml, apiKey: RESEND_API_KEY });

      // On ne met pas à jour email_sent_at si c'est un test (override)
      if (!email_to_override) {
        await supabase.from("client_invoices")
          .update({ email_sent_at: new Date().toISOString(), email_sent_to: toEmail })
          .eq("id", invoiceRecord.id);
        invoiceRecord.email_sent_at = new Date().toISOString();
        invoiceRecord.email_sent_to = toEmail;
      }
    }

    return new Response(JSON.stringify({ ok: true, invoice: invoiceRecord }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-client-invoice error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
