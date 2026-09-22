// ─────────────────────────────────────────────────────────────────────────
// Retrouver son lien personnel depuis l'annonce Discord.
//
// Appel : POST { email: "..." }
//
// Discord ne permet pas un lien par élève : l'annonce porte donc un lien
// générique, et c'est ici que la personne redevient identifiable.
//
// ⚠️ LE LIEN N'EST JAMAIS RENVOYÉ DANS LA RÉPONSE. Il part par e-mail, et la
// réponse est LA MÊME que l'adresse soit connue ou non. Sinon ce point
// d'entrée, public sur Internet, dirait à n'importe qui si telle adresse est
// cliente d'AL BARAKA.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const FROM_ADDR = "Sidali · AL BARAKA <conference@albarakaecosysteme.com>";
const REPLY_TO = ["contact@albarakaecosysteme.com"];
const LIEN_BASE = "https://plateforme.albarakaecosysteme.com/questionnaire/";

// Réponse unique, quelle que soit l'issue.
const REPONSE = {
  ok: true,
  message: "Si cette adresse est bien celle d'un élève, ton lien personnel vient de t'être envoyé par e-mail.",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({} as any));
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ ok: false, message: "Cette adresse ne semble pas valide." },
      { status: 400, headers: cors });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: inv } = await supabase
    .from("questionnaire_invitations")
    .select("token, prenom, statut")
    .eq("email", email)
    .maybeSingle();

  // Adresse inconnue, ou questionnaire déjà rempli : même réponse, sans e-mail.
  if (!inv || inv.statut === "repondu") {
    return Response.json(REPONSE, { headers: cors });
  }

  const lien = `${LIEN_BASE}${inv.token}`;
  const prenom = inv.prenom || "frère/sœur";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_ADDR,
      to: [email],
      reply_to: REPLY_TO,
      subject: "Ton lien vers le questionnaire AL BARAKA",
      html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ee;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:8px;padding:32px 28px;">
<tr><td style="font-size:15px;">
<p>Salam ${prenom},</p>
<p>Voici ton lien personnel vers le questionnaire. Il n'est valable que pour toi.</p>
<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 10px;">
<tr><td align="center" bgcolor="#C9A04E" style="background:#C9A04E;border-radius:6px;">
<a href="${lien}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;border-radius:6px;">JE RÉPONDS AU QUESTIONNAIRE</a>
</td></tr></table>
<p style="text-align:center;font-size:13px;color:#7a7a7a;">Le bouton ne s'affiche pas ?<br><a href="${lien}" style="color:#A8813A;">Ouvrir le questionnaire</a></p>
<p style="margin-top:24px;">Sidali<br><span style="color:#7a7a7a;">Fondateur d'AL BARAKA</span></p>
</td></tr></table></td></tr></table></body></html>`,
      tags: [{ name: "campaign", value: "questionnaire_clients" }, { name: "seq", value: "0" }],
    }),
  }).catch((e) => console.error("[retrouver-lien] resend:", String(e)));

  return Response.json(REPONSE, { headers: cors });
});
