// generate-client-invoice v12 — Génération PDF côté Deno + email Resend.
//
// v12 : enrichissement des coordonnées client + bloc TVA explicite
//   - Cascade fallback : sale.buyer_profile_id → match profile par email
//     du contact → contact seul. Permet de récupérer adresse + tel pour
//     les anciennes ventes (avant les nouveaux liens checkout).
//   - Téléphone du client affiché dans le PDF (sous l'email).
//   - Bloc TVA explicite : Sous-total HT / TVA (0%) / Total avant le total.
//   - Mention en footer : "TVA 0% — Société établie aux Émirats arabes unis".
//   - Lors d'une regenerate, les snapshots BDD client_* sont aussi mis à jour.
//
// Workflow (1 seul appel) :
//   1. Auth : CEO (anon JWT) OU service role (appelé par stripe-webhook).
//   2. Récupère payment + sale + contact + buyer profile (cascade fallback).
//   3. Idempotent : si facture existe avec PDF, retourne (sauf regenerate).
//   4. Génère un numéro séquentiel via RPC next_client_invoice_number.
//   5. Génère le PDF avec pdf-lib (rendering serveur, branding AL BARAKA).
//   6. Upload PDF dans Storage `invoices/clients/{contact_id}/{number}.pdf`.
//   7. Insert/update DB row (snapshot client mis à jour si regenerate).
//   8. Si send_email = true : email Resend avec PDF en pièce jointe.
//
// Auto-trigger : appelé par stripe-webhook (1ère mensualité + invoice.paid)
// et par le front (CEO marquage manuel paid + bulk download mensuel).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1";

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

// ===== Brand AL BARAKA =====
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

// ===== Issuer =====
const ISSUER = {
  name: "ETHICARENA LLC",
  rep: "Sidali GHALMI",
  line1: "Meydan Grandstand, 6th floor",
  line2: "Meydan Road, Nad Al Sheba",
  city: "Dubai",
  country: "United Arab Emirates",
};

// ===== Helpers =====
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function firstName(fullName: string): string {
  return (fullName || "").trim().split(/\s+/)[0] || "";
}

function fmtEur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

// pdf-lib avec WinAnsi ne supporte pas tous les unicodes (ex: ﷻ). On sanitize.
function sanitize(s: string): string {
  return String(s)
    .replace(/[ﷻ]/g, "")
    .replace(/[…]/g, "...")
    .replace(/[—–]/g, "-")
    .replace(/[«»]/g, '"')
    .replace(/['']/g, "'");
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ===== PDF generation =====
interface InvoicePdfData {
  invoiceNumber: string;
  paidAt: string;
  amount: number;
  paymentNumber: number | null;
  totalPayments: number | null;
  product: string;
  saleType: string | null;
  paymentCode: string | null; // affiché dans le PDF des factures d'acompte
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
  };
}

async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const courier = await doc.embedFont(StandardFonts.Courier);

  // Colors
  const gold = rgb(0xC5 / 255, 0xA5 / 255, 0x5A / 255);
  const goldLight = rgb(0xFD / 255, 0xF8 / 255, 0xED / 255);
  const goldDark = rgb(0x8A / 255, 0x6D / 255, 0x2C / 255);
  const dark = rgb(0x1A / 255, 0x1A / 255, 0x2E / 255);
  const gray = rgb(0.4, 0.4, 0.4);
  const grayBorder = rgb(0xF0 / 255, 0xE6 / 255, 0xD0 / 255);
  const lightGray = rgb(0.6, 0.6, 0.6);

  const drawText = (
    p: PDFPage,
    txt: string,
    x: number,
    y: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
  ) => {
    p.drawText(sanitize(txt), {
      x,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? helv,
      color: opts.color ?? dark,
    });
  };

  const margin = 50;
  let y = height - margin;

  // ── Header AL BARAKA + FACTURE ──
  drawText(page, "AL BARAKA", margin, y - 10, { size: 22, font: helvBold, color: dark });
  drawText(page, "Ecosysteme by Ethicarena", margin, y - 28, { size: 8, font: helv, color: gold });

  drawText(page, "FACTURE", width - margin - 80, y - 10, { size: 20, font: helvBold, color: gold });
  drawText(page, data.invoiceNumber, width - margin - 130, y - 32, { size: 11, font: courier, color: gray });

  const issueDate = new Date().toISOString();
  drawText(page, `Date d'emission : ${fmtDate(issueDate)}`, width - margin - 165, y - 50, { size: 9, font: helv, color: gray });
  drawText(page, `Date de paiement : ${fmtDate(data.paidAt)}`, width - margin - 165, y - 64, { size: 9, font: helv, color: gray });

  // Gold separator
  page.drawRectangle({ x: margin, y: y - 80, width: width - 2 * margin, height: 2, color: gold });
  y -= 110;

  // ── Émetteur / Destinataire ──
  const colWidth = (width - 2 * margin - 30) / 2;
  const colLeftX = margin;
  const colRightX = margin + colWidth + 30;

  drawText(page, "EMETTEUR", colLeftX, y, { size: 8, font: helvBold, color: gold });
  drawText(page, "DESTINATAIRE", colRightX, y, { size: 8, font: helvBold, color: gold });
  y -= 16;

  drawText(page, ISSUER.name, colLeftX, y, { size: 11, font: helvBold, color: dark });
  drawText(page, data.client.name, colRightX, y, { size: 11, font: helvBold, color: dark });
  y -= 14;

  drawText(page, ISSUER.rep, colLeftX, y, { size: 9, font: helv, color: gray });
  if (data.client.address) drawText(page, data.client.address, colRightX, y, { size: 9, font: helv, color: gray });
  y -= 12;

  drawText(page, ISSUER.line1, colLeftX, y, { size: 9, font: helv, color: gray });
  if (data.client.postal_code || data.client.city) {
    drawText(page, `${data.client.postal_code || ""} ${data.client.city || ""}`.trim(), colRightX, y, { size: 9, font: helv, color: gray });
  }
  y -= 12;

  drawText(page, ISSUER.line2, colLeftX, y, { size: 9, font: helv, color: gray });
  if (data.client.country) drawText(page, data.client.country, colRightX, y, { size: 9, font: helv, color: gray });
  y -= 12;

  drawText(page, `${ISSUER.city}, ${ISSUER.country}`, colLeftX, y, { size: 9, font: helv, color: gray });
  if (data.client.email) drawText(page, data.client.email, colRightX, y, { size: 9, font: helv, color: gray });
  y -= 12;

  // Téléphone du client (sous l'email) — utile pour la compta
  if (data.client.phone) {
    drawText(page, data.client.phone, colRightX, y, { size: 9, font: helv, color: gray });
  }
  y -= 28;

  // Bandeau "Code paiement personnel" — uniquement pour les factures d'acompte.
  // Visible et bien identifié pour que le client puisse le retrouver et que
  // le commercial puisse l'utiliser pour générer le lien de paiement final.
  if (data.saleType === "acompte" && data.paymentCode) {
    const codeBoxHeight = 36;
    page.drawRectangle({
      x: margin,
      y: y - codeBoxHeight + 10,
      width: width - 2 * margin,
      height: codeBoxHeight,
      color: goldLight,
      borderColor: gold,
      borderWidth: 0.8,
    });
    drawText(page, "CODE PAIEMENT PERSONNEL", margin + 12, y - 2, {
      size: 8,
      font: helvBold,
      color: goldDark,
    });
    drawText(page, data.paymentCode, margin + 12, y - 18, {
      size: 14,
      font: courier,
      color: dark,
    });
    const noteText = "A communiquer pour reglement final - acompte deduit automatiquement";
    drawText(page, noteText, width - margin - 280, y - 18, {
      size: 7,
      font: helv,
      color: gray,
    });
    y -= codeBoxHeight + 12;
  }

  // ── Table Description / Montant ──
  const tableTop = y;
  const colDescX = margin + 12;
  const colAmountX = width - margin - 12;

  // Header bar
  page.drawRectangle({ x: margin, y: y - 4, width: width - 2 * margin, height: 26, color: goldLight });
  drawText(page, "DESCRIPTION", colDescX, y + 6, { size: 8, font: helvBold, color: goldDark });
  const amountHeader = "MONTANT";
  const amountHeaderWidth = helvBold.widthOfTextAtSize(amountHeader, 8);
  drawText(page, amountHeader, colAmountX - amountHeaderWidth, y + 6, { size: 8, font: helvBold, color: goldDark });
  y -= 26;

  // Row 1 : Description + montant
  const mensLabel = data.paymentNumber && data.totalPayments
    ? `Mensualite ${data.paymentNumber}/${data.totalPayments}`
    : "Paiement";

  drawText(page, sanitize(data.product || "PASS AL BARAKA"), colDescX, y - 5, { size: 11, font: helvBold, color: dark });
  drawText(page, `${mensLabel} - Paiement recu le ${fmtDate(data.paidAt)}`, colDescX, y - 20, { size: 9, font: helv, color: lightGray });

  const amountStr = fmtEur(data.amount);
  const amountStrWidth = helv.widthOfTextAtSize(amountStr, 11);
  drawText(page, amountStr, colAmountX - amountStrWidth, y - 5, { size: 11, font: helv, color: dark });

  y -= 40;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 1, color: grayBorder });
  y -= 18;

  // Sous-total HT (= amount, car TVA non applicable société hors UE)
  drawText(page, "Sous-total HT", colDescX, y, { size: 10, font: helv, color: gray });
  const htStr = fmtEur(data.amount);
  const htStrWidth = helv.widthOfTextAtSize(htStr, 10);
  drawText(page, htStr, colAmountX - htStrWidth, y, { size: 10, font: helv, color: dark });
  y -= 16;

  // TVA (0%) — visible explicitement pour la conformité comptable
  drawText(page, "TVA (0%)", colDescX, y, { size: 10, font: helv, color: gray });
  const tvaStr = fmtEur(0);
  const tvaStrWidth = helv.widthOfTextAtSize(tvaStr, 10);
  drawText(page, tvaStr, colAmountX - tvaStrWidth, y, { size: 10, font: helv, color: dark });
  y -= 14;

  // Total row
  page.drawRectangle({ x: margin, y: y - 22, width: width - 2 * margin, height: 30, color: goldLight });
  drawText(page, "TOTAL PAYE", colDescX, y - 14, { size: 12, font: helvBold, color: dark });
  const totalStr = fmtEur(data.amount);
  const totalStrWidth = helvBold.widthOfTextAtSize(totalStr, 13);
  drawText(page, totalStr, colAmountX - totalStrWidth, y - 14, { size: 13, font: helvBold, color: gold });

  // ── Footer ──
  const footerY = 72; // Légèrement remonté pour laisser place à la mention TVA
  page.drawRectangle({ x: margin, y: footerY + 30, width: width - 2 * margin, height: 1, color: grayBorder });
  const ecosysText = "AL BARAKA - ECOSYSTEME BY ETHICARENA";
  const ecosysWidth = helvBold.widthOfTextAtSize(ecosysText, 9);
  drawText(page, ecosysText, (width - ecosysWidth) / 2, footerY + 14, { size: 9, font: helvBold, color: gold });
  const issuerText = `Facture emise par ${ISSUER.name} (${ISSUER.city}, ${ISSUER.country})`;
  const issuerWidth = helv.widthOfTextAtSize(issuerText, 8);
  drawText(page, issuerText, (width - issuerWidth) / 2, footerY, { size: 8, font: helv, color: gray });
  // Mention legale TVA — societe hors UE (Emirats arabes unis), donc pas
  // d'application de TVA. On l'explicite pour la comptabilite du client.
  const tvaLegalText = "TVA 0% - Societe etablie aux Emirats arabes unis";
  const tvaLegalWidth = helv.widthOfTextAtSize(tvaLegalText, 8);
  drawText(page, tvaLegalText, (width - tvaLegalWidth) / 2, footerY - 12, { size: 8, font: helv, color: gray });
  const thanksText = "Document genere automatiquement - Merci pour votre confiance.";
  const thanksWidth = helv.widthOfTextAtSize(thanksText, 8);
  drawText(page, thanksText, (width - thanksWidth) / 2, footerY - 24, { size: 8, font: helv, color: gray });

  return await doc.save();
}

// ===== Email HTML =====
function buildEmailHtml(params: {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paidAt: string;
  product: string;
  paymentNumber: number | null;
  totalPayments: number | null;
  saleType: string | null;
  paymentCode: string | null;
}): string {
  const prenom = firstName(params.clientName);
  const isAcompte = params.saleType === "acompte";
  const mensInfo = !isAcompte && params.paymentNumber && params.totalPayments
    ? `(mensualité ${params.paymentNumber}/${params.totalPayments})`
    : "";

  // Section "Code paiement personnel" uniquement pour les factures d'acompte
  const codeBlock = isAcompte && params.paymentCode
    ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:rgba(212,175,55,0.08);border:1px solid ${BRAND.gold};border-radius:10px;padding:20px 24px;">
                    <p style="margin:0 0 6px 0;font-size:11px;color:${BRAND.gold};letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Ton code paiement personnel</p>
                    <p style="margin:0 0 8px 0;font-family:'Courier New',monospace;font-size:28px;color:${BRAND.gold};letter-spacing:4px;">${escapeHtml(params.paymentCode)}</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.textMain};">Ce code te sera demandé lorsque ton conseiller te transmettra le lien pour finaliser ton PASS AL BARAKA. <strong style="color:${BRAND.gold};font-weight:normal;">Ton acompte sera automatiquement déduit du solde à régler.</strong></p>
                  </td>
                </tr>
              </table>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<title>Ta facture ${escapeHtml(params.invoiceNumber)} — AL BARAKA</title>
<style type="text/css">
  :root { color-scheme: dark only; supported-color-schemes: dark only; }
  html, body { margin:0 !important; padding:0 !important; width:100% !important; background-color:${BRAND.black} !important; }
  body, table, td, div, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { border-collapse:collapse !important; }
  .bg-black { background-color:${BRAND.black} !important; }
  .bg-card { background-color:${BRAND.cardBg} !important; }
  @media screen and (max-width: 600px) {
    .container { width:100% !important; max-width:100% !important; }
    .px-mobile { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>
<body class="bg-black" bgcolor="${BRAND.black}" style="margin:0;padding:0;width:100%;background-color:${BRAND.black};font-family:Georgia,'Times New Roman',serif;color:${BRAND.textMain};">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BRAND.black};opacity:0;">
    Ta facture ${escapeHtml(params.invoiceNumber)} est en pièce jointe.
  </div>
  <table role="presentation" class="bg-black" data-bg="black" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.black}" style="background-color:${BRAND.black};width:100%;">
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
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">Baraka Allahou fik pour ta confiance.</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">Nous avons bien reçu ${isAcompte ? "ton" : "ton paiement de"} <strong style="color:${BRAND.gold};font-weight:normal;">${fmtEur(params.amount)}</strong> ${isAcompte ? "d'acompte" : mensInfo} pour ${isAcompte ? "réserver ton PASS AL BARAKA" : `le <strong style="color:${BRAND.gold};font-weight:normal;">${escapeHtml(params.product)}</strong>`}, encaissé le ${fmtDate(params.paidAt)}.</p>
              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">Tu trouveras ta facture <strong style="color:${BRAND.gold};font-weight:normal;">${escapeHtml(params.invoiceNumber)}</strong> en pièce jointe (PDF).</p>
              ${codeBlock}
              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};font-style:italic;">Qu'Allah ﷻ te bénisse et te facilite dans ton parcours.</p>
              <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">Wa salam alaykoum,</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.textMain};"><strong style="color:${BRAND.gold};font-weight:normal;">L'équipe AL BARAKA</strong></p>
            </td>
          </tr>
          <tr><td class="bg-card" data-bg="card" bgcolor="${BRAND.cardBg}" style="background-color:${BRAND.cardBg};padding:8px 0 32px;"></td></tr>
          <tr>
            <td class="bg-card" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:20px 32px;border-top:1px solid ${BRAND.goldSoft};">
              <p style="margin:0 0 4px 0;font-size:11px;color:${BRAND.textSecondary};letter-spacing:0.5px;">Facture émise par <strong style="color:${BRAND.textMain};font-weight:normal;">ETHICARENA LLC</strong> (Dubai, UAE)</p>
              <p style="margin:0;font-size:11px;color:${BRAND.textSecondary};letter-spacing:0.5px;">© AL BARAKA — <a href="${BRAND.domain}" style="color:${BRAND.gold};text-decoration:none;">${BRAND.domainLabel}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

// ===== Main handler =====
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
    const regenerate: boolean = body.regenerate === true;

    if (!payment_id) return new Response(JSON.stringify({ error: "payment_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log("[generate-client-invoice] start", { payment_id, regenerate, send_email });

    // 1. Récupère payment + sale + contact
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select(`id, sale_id, contact_id, payment_number, total_payments, amount, paid_at, status,
               sales!payments_sale_id_fkey(id, product, sale_type, buyer_profile_id, contact_id),
               contacts!payments_contact_id_fkey(id, full_name, email, payment_code)`)
      .eq("id", payment_id).single();
    if (payErr || !payment) return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (payment.status !== "paid") return new Response(JSON.stringify({ error: "Payment not paid yet" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sale: any = payment.sales;
    const contact: any = payment.contacts;
    const contactId = contact?.id || sale?.contact_id || payment.contact_id;
    const saleId = sale?.id || payment.sale_id;

    // ─── Récupération des coordonnées client (cascade fallback) ────────
    // Priorité 1 : sale.buyer_profile_id (rempli par les nouveaux liens checkout)
    // Priorité 2 : profile dont l'email matche celui du contact (pour les
    //              anciennes ventes — la plupart des acheteurs ont un profile
    //              plateforme avec leur adresse complète)
    // Priorité 3 : juste les infos contact (full_name, email, phone) — minimal
    //              si vraiment aucun profile trouvé
    //
    // On récupère également le téléphone (profiles.phone OU contacts.phone_normalized)
    // pour l'afficher sur le PDF.
    let buyerProfile: any = null;

    // P1 : via buyer_profile_id direct
    if (sale?.buyer_profile_id) {
      const { data } = await supabase.from("profiles")
        .select("full_name, email, phone, address, postal_code, city, country")
        .eq("id", sale.buyer_profile_id).single();
      buyerProfile = data;
    }

    // P2 : si rien trouvé en P1, on cherche un profile par email du contact
    if (!buyerProfile && contact?.email) {
      const { data } = await supabase.from("profiles")
        .select("full_name, email, phone, address, postal_code, city, country")
        .ilike("email", contact.email)
        .limit(1)
        .maybeSingle();
      if (data) buyerProfile = data;
    }

    // Récupère le contact complet pour avoir aussi son phone_normalized
    const { data: contactFull } = contact?.id
      ? await supabase.from("contacts")
          .select("phone_normalized")
          .eq("id", contact.id)
          .maybeSingle()
      : { data: null };

    const clientName = (buyerProfile?.full_name || contact?.full_name || "Client").toString().trim();
    const clientEmail = (buyerProfile?.email || contact?.email || "").toString().trim();
    const clientPhone = (buyerProfile?.phone || contactFull?.phone_normalized || "").toString().trim() || null;

    // 2. Idempotence : facture existe ?
    const { data: existing } = await supabase.from("client_invoices").select("*").eq("payment_id", payment_id).maybeSingle();

    let invoiceRow: any = existing;
    let invoiceNumber: string;
    let pdfPath: string;

    if (!existing) {
      // 3. Numérotation
      const paidDate = new Date(payment.paid_at);
      const year = paidDate.getUTCFullYear();
      const month = paidDate.getUTCMonth() + 1;
      const { data: numData, error: numErr } = await supabase.rpc("next_client_invoice_number", { p_year: year, p_month: month });
      if (numErr || !numData) return new Response(JSON.stringify({ error: "Failed to generate invoice number", detail: numErr }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      invoiceNumber = numData as string;
      pdfPath = `clients/${contactId}/${invoiceNumber}.pdf`;

      // Insert row sans pdf_path (sera updaté après upload)
      const { data: inserted, error: insErr } = await supabase.from("client_invoices").insert({
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
      }).select().single();
      if (insErr) return new Response(JSON.stringify({ error: "Failed to insert invoice row", detail: insErr }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      invoiceRow = inserted;
    } else {
      invoiceNumber = existing.invoice_number;
      pdfPath = existing.html_path || `clients/${contactId}/${invoiceNumber}.pdf`;
    }

    // 4. Génère PDF si pas encore présent ou si regenerate
    if (!invoiceRow.html_path || regenerate) {
      // Wrap PDF generation to surface the EXACT failing stage in logs.
      // Le bulk download a montré ~6 échecs sur 116 sans message clair côté
      // accès. On distingue maintenant : pdf_gen, storage_upload, db_update.
      let pdfBytes: Uint8Array;
      try {
        pdfBytes = await generateInvoicePdf({
          invoiceNumber,
          paidAt: payment.paid_at,
          amount: Number(payment.amount),
          paymentNumber: payment.payment_number,
          totalPayments: payment.total_payments,
          product: sale?.product || "PASS AL BARAKA",
          saleType: sale?.sale_type || null,
          paymentCode: contact?.payment_code || null,
          client: {
            name: clientName,
            email: clientEmail || null,
            phone: clientPhone,
            address: buyerProfile?.address || null,
            postal_code: buyerProfile?.postal_code || null,
            city: buyerProfile?.city || null,
            country: buyerProfile?.country || null,
          },
        });
      } catch (pdfErr: any) {
        console.error("PDF generation failed for payment", payment_id, "invoice", invoiceNumber, pdfErr?.message || pdfErr, pdfErr?.stack);
        return new Response(JSON.stringify({
          error: "PDF generation failed",
          stage: "pdf_gen",
          payment_id,
          invoice_number: invoiceNumber,
          detail: pdfErr?.message || String(pdfErr),
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Upload Storage
      const { error: uploadErr } = await supabase.storage.from("invoices").upload(pdfPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (uploadErr) {
        console.error("Storage upload failed for payment", payment_id, "path", pdfPath, uploadErr);
        return new Response(JSON.stringify({
          error: "Storage upload failed",
          stage: "storage_upload",
          payment_id,
          invoice_number: invoiceNumber,
          path: pdfPath,
          detail: uploadErr,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update DB
      // Update html_path + snapshot des coordonnées client (au cas où on
      // regenere et qu'on a trouve de nouvelles infos via la cascade fallback).
      const { error: updErr } = await supabase.from("client_invoices").update({
        html_path: pdfPath,
        client_name: clientName,
        client_email: clientEmail || null,
        client_address: buyerProfile?.address || null,
        client_postal_code: buyerProfile?.postal_code || null,
        client_city: buyerProfile?.city || null,
        client_country: buyerProfile?.country || null,
      }).eq("id", invoiceRow.id);
      if (updErr) {
        console.error("DB update failed for payment", payment_id, updErr);
        return new Response(JSON.stringify({
          error: "DB update failed",
          stage: "db_update",
          payment_id,
          detail: updErr,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      invoiceRow.html_path = pdfPath;
    }

    // 5. Envoi email
    if (send_email) {
      if (!RESEND_API_KEY) return new Response(JSON.stringify({ ok: true, invoice: invoiceRow, email_skipped: "RESEND_API_KEY missing" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Fetch PDF from storage
      const { data: pdfBlob, error: dlErr } = await supabase.storage.from("invoices").download(pdfPath);
      if (dlErr || !pdfBlob) return new Response(JSON.stringify({ error: "Failed to fetch PDF", detail: dlErr }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const arrayBuf = await pdfBlob.arrayBuffer();
      const base64 = uint8ToBase64(new Uint8Array(arrayBuf));

      const toEmail = email_to_override || clientEmail;
      if (!toEmail) return new Response(JSON.stringify({ error: "No email to send to" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const emailHtml = buildEmailHtml({
        clientName,
        invoiceNumber,
        amount: Number(payment.amount),
        paidAt: payment.paid_at,
        product: sale?.product || "PASS AL BARAKA",
        paymentNumber: payment.payment_number,
        totalPayments: payment.total_payments,
        saleType: sale?.sale_type || null,
        paymentCode: contact?.payment_code || null,
      });

      const subjectPrefix = sale?.sale_type === "acompte" ? "Ton acompte AL BARAKA" : `Ta facture ${invoiceNumber}`;
      await sendInvoiceEmail({
        to: toEmail,
        subject: `${subjectPrefix} — AL BARAKA`,
        html: emailHtml,
        attachmentBase64: base64,
        attachmentFilename: `${invoiceNumber}.pdf`,
        apiKey: RESEND_API_KEY,
      });

      if (!email_to_override) {
        const nowIso = new Date().toISOString();
        const { data: upd } = await supabase.from("client_invoices")
          .update({ email_sent_at: nowIso, email_sent_to: toEmail })
          .eq("id", invoiceRow.id).select().single();
        if (upd) invoiceRow = upd;
      }

      return new Response(JSON.stringify({ ok: true, invoice: invoiceRow, sent_to: toEmail, was_test: !!email_to_override }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, invoice: invoiceRow }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("generate-client-invoice error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
