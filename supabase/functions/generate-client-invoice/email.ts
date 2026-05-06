// Logique HTML email pour la facture client AL BARAKA.
// Extrait de index.ts pour réduire la taille du fichier principal et
// faciliter les déploiements via le tool MCP.

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

function fmtEurEmail(n: number): string {
  const formatted = n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatted.replace(/[    ]/g, " ") + " €";
}

function fmtDateEmail(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function buildInvoiceEmailHtml(params: {
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

  const codeBlock = isAcompte && params.paymentCode
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;"><tr><td style="background-color:rgba(212,175,55,0.08);border:1px solid ${BRAND.gold};border-radius:10px;padding:20px 24px;"><p style="margin:0 0 6px 0;font-size:11px;color:${BRAND.gold};letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Ton code paiement personnel</p><p style="margin:0 0 8px 0;font-family:'Courier New',monospace;font-size:28px;color:${BRAND.gold};letter-spacing:4px;">${escapeHtml(params.paymentCode)}</p><p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.textMain};">Ce code te sera demandé lorsque ton conseiller te transmettra le lien pour finaliser ton PASS AL BARAKA. <strong style="color:${BRAND.gold};font-weight:normal;">Ton acompte sera automatiquement déduit du solde à régler.</strong></p></td></tr></table>`
    : "";

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Ta facture ${escapeHtml(params.invoiceNumber)} — AL BARAKA</title></head><body style="margin:0;padding:0;width:100%;background-color:${BRAND.black};font-family:Georgia,'Times New Roman',serif;color:${BRAND.textMain};"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.black}" style="background-color:${BRAND.black};width:100%;"><tr><td align="center" valign="top" style="background-color:${BRAND.black};padding:40px 16px;"><table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.cardBg}" style="width:600px;max-width:600px;background-color:${BRAND.cardBg};border:1px solid ${BRAND.goldSoft};border-radius:12px;"><tr><td align="center" style="background-color:${BRAND.cardBg};padding:48px 32px 16px;"><h1 style="margin:0;font-family:Georgia,serif;font-size:32px;color:${BRAND.gold};letter-spacing:6px;font-weight:normal;">AL BARAKA</h1><p style="margin:10px 0 0 0;color:${BRAND.textSecondary};font-size:11px;letter-spacing:3px;text-transform:uppercase;">L'écosystème</p><div style="width:60px;height:1px;background-color:${BRAND.gold};margin:24px auto 0 auto;line-height:1px;font-size:1px;">&nbsp;</div></td></tr><tr><td style="background-color:${BRAND.cardBg};padding:32px 40px 8px;"><h2 style="margin:0 0 20px 0;font-size:22px;color:${BRAND.textMain};font-weight:normal;">As salam alaykoum${prenom ? ` ${escapeHtml(prenom)}` : ""},</h2><p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">Baraka Allahou fik pour ta confiance.</p><p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">Nous avons bien reçu ${isAcompte ? "ton" : "ton paiement de"} <strong style="color:${BRAND.gold};font-weight:normal;">${fmtEurEmail(params.amount)}</strong> ${isAcompte ? "d'acompte" : mensInfo} pour ${isAcompte ? "réserver ton PASS AL BARAKA" : `<strong style="color:${BRAND.gold};font-weight:normal;">${escapeHtml(params.product)}</strong>`}, encaissé le ${fmtDateEmail(params.paidAt)}.</p><p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">Tu trouveras ta facture <strong style="color:${BRAND.gold};font-weight:normal;">${escapeHtml(params.invoiceNumber)}</strong> en pièce jointe (PDF).</p>${codeBlock}<p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};font-style:italic;">Qu'Allah te bénisse et te facilite dans ton parcours.</p><p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">Wa salam alaykoum,</p><p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.textMain};"><strong style="color:${BRAND.gold};font-weight:normal;">L'équipe AL BARAKA</strong></p></td></tr><tr><td align="center" style="background-color:${BRAND.cardBg};padding:20px 32px;border-top:1px solid ${BRAND.goldSoft};"><p style="margin:0 0 4px 0;font-size:11px;color:${BRAND.textSecondary};">Facture émise par <strong style="color:${BRAND.textMain};font-weight:normal;">ETHICARENA LLC</strong> (Dubai, UAE) — TVA 0% — Société établie aux Émirats arabes unis</p><p style="margin:0;font-size:11px;color:${BRAND.textSecondary};">© AL BARAKA — <a href="${BRAND.domain}" style="color:${BRAND.gold};text-decoration:none;">${BRAND.domainLabel}</a></p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendInvoiceEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachmentBase64: string;
  attachmentFilename: string;
  apiKey: string;
  fromOverride?: string;
}) {
  const from = params.fromOverride || "AL BARAKA <noreply@albarakaecosysteme.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
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
