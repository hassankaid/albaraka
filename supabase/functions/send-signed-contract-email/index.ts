// ═══════════════════════════════════════════════════════════════════════════
// send-signed-contract-email v1
//
// Envoie un email de confirmation au client après la signature de son
// contrat, avec le PDF signé en pièce jointe.
//
// Body :
//   { contract_id: string }
//
// Workflow :
//   1. Fetch la row client_contracts via service role
//   2. Download le PDF signé depuis Storage (bucket "contracts")
//   3. Encode le PDF en base64 pour Resend
//   4. Send via Resend avec attachement
//   5. UPDATE row.email_sent_at / email_sent_to
//
// verify_jwt = false (appelé en interne par upload-signed-contract)
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BRAND = {
  name: "AL BARAKA",
  gold: "#D4AF37",
  goldSoft: "rgba(212,175,55,0.25)",
  black: "#0A0A0A",
  cardBg: "#141414",
  textMain: "#EDEDED",
  textSecondary: "#9A9A9A",
  domain: "https://plateforme.albarakaecosysteme.com",
  domainLabel: "plateforme.albarakaecosysteme.com",
  fromEmail: Deno.env.get("RESEND_FROM_EMAIL") || "AL BARAKA <noreply@albarakaecosysteme.com>",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Convertit un Uint8Array en string base64 (sans préfixe data:). */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // 32 KiB par chunk pour éviter "Maximum call stack size exceeded"
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function buildHtml(firstName: string, contractNumber: string): string {
  const safeFirstName = firstName?.trim() || "";
  const greeting = safeFirstName ? `Salam ${safeFirstName},` : "Salam,";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<title>Ton contrat AL BARAKA est signé</title>
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
    Ton contrat AL BARAKA est signé. Tu trouveras ta copie en pièce jointe.
  </div>
  <table role="presentation" class="bg-black" data-bg="black" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.black}" style="background-color:${BRAND.black};width:100%;border-collapse:collapse;">
    <tr>
      <td class="bg-black" data-bg="black" bgcolor="${BRAND.black}" align="center" valign="top" style="background-color:${BRAND.black};padding:40px 16px;">
        <table role="presentation" class="container bg-card" data-bg="card" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.cardBg}" style="width:600px;max-width:600px;background-color:${BRAND.cardBg};border:1px solid ${BRAND.goldSoft};border-radius:12px;">
          <tr>
            <td class="bg-card px-mobile" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:48px 32px 16px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;color:${BRAND.gold};letter-spacing:6px;font-weight:normal;">AL BARAKA</h1>
              <p style="margin:10px 0 0 0;color:${BRAND.textSecondary};font-size:11px;letter-spacing:3px;text-transform:uppercase;">Contrat signé</p>
              <div style="width:60px;height:1px;background-color:${BRAND.gold};margin:24px auto 0 auto;line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td class="bg-card px-mobile" data-bg="card" bgcolor="${BRAND.cardBg}" style="background-color:${BRAND.cardBg};padding:32px 40px 8px;">
              <h2 style="margin:0 0 20px 0;font-size:22px;color:${BRAND.textMain};font-weight:normal;">
                ${greeting}
              </h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Ton contrat <strong style="color:${BRAND.gold};font-weight:normal;">${contractNumber}</strong> est signé et joint à cet email.
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Tu peux le télécharger à tout moment depuis ton espace personnel.
              </p>
              <p style="margin:0 0 28px 0;font-size:16px;line-height:1.7;color:${BRAND.textMain};">
                Bienvenue dans <strong style="color:${BRAND.gold};font-weight:normal;">l'écosystème AL BARAKA</strong> inshaAllah.
              </p>
            </td>
          </tr>
          <tr>
            <td class="bg-card" data-bg="card" bgcolor="${BRAND.cardBg}" align="center" style="background-color:${BRAND.cardBg};padding:20px 32px;border-top:1px solid ${BRAND.goldSoft};">
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

interface ResendAttachment {
  filename: string;
  content: string; // base64
  content_type?: string;
}

async function sendResend(
  to: string,
  subject: string,
  html: string,
  attachments: ResendAttachment[],
  apiKey: string,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: BRAND.fromEmail,
      to: [to],
      subject,
      html,
      attachments,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error_code: "method_not_allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error_code: "missing_env", message: "Supabase env missing" }, 500);
  }
  if (!RESEND_API_KEY) {
    return json({ ok: false, error_code: "missing_resend_key" }, 500);
  }

  let body: { contract_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error_code: "invalid_json" }, 400);
  }

  const contractId = body.contract_id?.trim();
  if (!contractId) {
    return json({ ok: false, error_code: "missing_contract_id" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // 1. Fetch contrat
    const { data: contract, error: fetchErr } = await admin
      .from("client_contracts")
      .select(
        "id, client_email, client_first_name, client_last_name, contract_number, signed_pdf_path, template_key, status",
      )
      .eq("id", contractId)
      .maybeSingle();

    if (fetchErr) {
      console.error("[send-signed-contract-email] fetch error", fetchErr);
      return json({ ok: false, error_code: "fetch_failed", message: fetchErr.message }, 500);
    }
    if (!contract) {
      return json({ ok: false, error_code: "contract_not_found" }, 404);
    }
    if (!contract.signed_pdf_path) {
      return json({ ok: false, error_code: "no_signed_pdf" }, 400);
    }
    if (!contract.client_email) {
      return json({ ok: false, error_code: "no_client_email" }, 400);
    }

    // 2. Download PDF signé depuis Storage
    const { data: pdfBlob, error: storageErr } = await admin.storage
      .from("contracts")
      .download(contract.signed_pdf_path);
    if (storageErr || !pdfBlob) {
      console.error("[send-signed-contract-email] storage download error", storageErr);
      return json({ ok: false, error_code: "pdf_download_failed", message: storageErr?.message }, 500);
    }

    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const pdfBase64 = uint8ArrayToBase64(pdfBytes);

    // 3. Send via Resend
    const subject = `Ton contrat AL BARAKA est signé - ${contract.contract_number}`;
    const html = buildHtml(contract.client_first_name || "", contract.contract_number);
    const attachments: ResendAttachment[] = [
      {
        filename: `Contrat-${contract.contract_number}.pdf`,
        content: pdfBase64,
        content_type: "application/pdf",
      },
    ];

    console.log(
      `[send-signed-contract-email] sending to=${contract.client_email} contract=${contract.contract_number}`,
    );
    await sendResend(contract.client_email, subject, html, attachments, RESEND_API_KEY);

    // 4. UPDATE row email_sent_at / email_sent_to
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("client_contracts")
      .update({
        email_sent_at: nowIso,
        email_sent_to: contract.client_email,
      })
      .eq("id", contractId);
    if (updateErr) {
      // Non-bloquant : l'email est parti, on log juste
      console.error("[send-signed-contract-email] update tracking error", updateErr);
    }

    return json({ ok: true });
  } catch (err: any) {
    console.error("[send-signed-contract-email] unexpected error", err);
    return json({ ok: false, error_code: "internal", message: err?.message ?? String(err) }, 500);
  }
});
