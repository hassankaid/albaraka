// ─────────────────────────────────────────────────────────────────────────
// Envoi de la séquence e-mail d'une conférence, via Resend.
//
// Appel : POST { seq: 4 | 5, max?: 1..300 }
//
// La fonction lit la liste dans `email_campaign_recipients` (filtrée sur
// CAMPAIGN_SLUG, triée par `position`), retire ceux qui ont déjà reçu CETTE
// séquence d'après `email_campaign_sends`, et envoie aux `max` premiers.
//
// ⚠️ UN SEUL APPEL À LA FOIS. Le journal n'est écrit que tous les 50 envois :
// relancer pendant qu'un appel tourne fait redémarrer la déduplication sur un
// journal incomplet et renvoie aux mêmes personnes. C'est ce qui a produit
// 353 doublons sur la conférence du 31/05/2026.
//
// ⚠️ À CHAQUE CONFÉRENCE, vérifier les trois constantes ci-dessous : le lien du
// groupe WhatsApp change à chaque fois, et l'ancien groupe reste ouvert — se
// tromper n'affiche donc AUCUNE erreur, ça envoie juste tout le monde dans la
// salle précédente.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ── Conférence du dimanche 30 août 2026, 11h00 (heure de Paris) ──
const FROM_ADDR = "Sidali · AL BARAKA <conference@albarakaecosysteme.com>";
const REPLY_TO = ["contact@albarakaecosysteme.com"];
const WHATSAPP = "https://chat.whatsapp.com/BwBWVsHhM0Y0Fb37USMZS3";
const CAMPAIGN_SLUG = "conf_2026_08_30";
// Le lien de désabonnement doit rester joignable : la route /unsubscribe
// n'existe pas dans l'application, et en mai 8 personnes ont cliqué dans le
// vide avant que 11 plaintes pour spam ne tombent. Un mailto ne dépend d'aucun
// déploiement.
const UNSUB = "mailto:contact@albarakaecosysteme.com?subject=Desabonnement";

const DEFAULT_MAX = 150;
const DELAY_MS = 230;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function wrap(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>AL BARAKA</title></head>
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.6;">
<div style="display:none;font-size:1px;color:#f5f3ee;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f3ee;padding:24px 0;">
<tr><td align="center">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;padding:32px 28px;">
<tr><td style="font-size:15px;color:#1a1a1a;">
${body}
<div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e1d7;font-size:12px;color:#7a7a7a;text-align:center;line-height:1.5;">
AL BARAKA — Écosystème de l'entrepreneuriat halal<br>
<a href="{{UNSUB_URL}}" style="color:#7a7a7a;text-decoration:underline;">Se désabonner</a>
</div>
</td></tr></table></td></tr></table></body></html>`;
}

const CTA = `<div style="text-align:center;margin:28px 0;"><a href="${WHATSAPP}" style="display:inline-block;background-color:#C9A04E;color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">► Je rejoins le groupe WhatsApp privé</a></div>`;
const SIG = `<p style="margin-top:24px;">Sidali<br><span style="color:#7a7a7a;">Fondateur de l'écosystème AL BARAKA</span></p>`;

const TEMPLATES: Record<number, { name: string; subject: string; preheader: string; body: string }> = {
  4: {
    name: "T-2h",
    subject: "Plus que 2 heures ⏳",
    preheader: "Le lien du direct t'attend dans le groupe WhatsApp.",
    body: `<p>Assalamu alaykum {{FIRST_NAME}},</p>
<p><strong>Dans 2 heures, on est ensemble en direct.</strong></p>
<p>Ce qu'on va voir ce matin :</p>
<ul style="padding-left:20px;">
<li style="margin:8px 0;">Pourquoi la plupart des musulmans qui veulent entreprendre en ligne échouent (et ça n'a rien à voir avec le talent ou l'argent).</li>
<li style="margin:8px 0;">Les compétences digitales qui se monnaient vraiment aujourd'hui : sans stock, sans te montrer, sans renier tes valeurs.</li>
<li style="margin:8px 0;">Le chemin exact que suivent les membres d'AL BARAKA pour viser une vraie liberté financière, sans compromettre leur dîn.</li>
</ul>
<p>Si tu n'as qu'une seule chose à faire maintenant, c'est celle-ci : <strong>rejoins le groupe WhatsApp</strong>. Le lien du direct y sera posté — je ne veux pas que tu rates ça pour une simple histoire de lien.</p>
${CTA}
<p>Prépare tes questions. Rendez-vous à 11h00, inshaAllah.</p>
${SIG}`,
  },
  5: {
    name: "Ouverture",
    subject: "🔴 C'est maintenant — viens, {{FIRST_NAME}}",
    preheader: "Je suis déjà là. On démarre à 11h00.",
    body: `<p>Assalamu alaykum {{FIRST_NAME}},</p>
<p><strong>J'y suis. On démarre dans quelques minutes.</strong></p>
<p>Le lien du direct est posté dans le groupe WhatsApp. Rejoins, clique, et viens t'asseoir avec nous :</p>
${CTA}
<p>On t'attend. Bismillah.</p>
${SIG}`,
  },
};

function render(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v ?? "");
  }
  return out;
}

async function resendSend(payload: any): Promise<{ status: number; data: any }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

// Charge toutes les lignes par pages : le client Supabase plafonne à 1000.
async function loadAll(supabase: any, table: string, selectCols: string, filters: Record<string, any>, orderCol: string | null) {
  const out: any[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(selectCols);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    if (orderCol) q = q.order(orderCol, { ascending: true });
    q = q.range(from, from + PAGE - 1);
    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "missing_resend_key" }), { status: 500 });

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 }); }

  const seq = parseInt(body?.seq);
  if (!TEMPLATES[seq]) {
    return new Response(JSON.stringify({ error: "seq_inconnu", attendus: Object.keys(TEMPLATES) }), { status: 400 });
  }

  const maxParam = parseInt(body?.max);
  const maxRecipients = (Number.isFinite(maxParam) && maxParam > 0 && maxParam <= 300) ? maxParam : DEFAULT_MAX;

  const tpl = TEMPLATES[seq];
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const alreadySent = await loadAll(supabase, "email_campaign_sends", "recipient_email", { campaign_slug: CAMPAIGN_SLUG, email_seq: seq }, null);
  const alreadySentSet = new Set(alreadySent.map((r: any) => r.recipient_email.toLowerCase().trim()));

  const recipients = await loadAll(supabase, "email_campaign_recipients", "email, first_name, position", { campaign_slug: CAMPAIGN_SLUG }, "position");

  const todo = recipients.filter((r: any) => !alreadySentSet.has(r.email.toLowerCase().trim())).slice(0, maxRecipients);

  if (todo.length === 0) {
    return new Response(JSON.stringify({ ok: true, seq, message: "all_sent", already_sent: alreadySentSet.size, total_recipients_loaded: recipients.length }), { status: 200 });
  }

  const htmlTemplate = wrap(tpl.preheader, tpl.body);

  const logs: any[] = [];
  let okCount = 0;
  let failCount = 0;

  for (const r of todo) {
    const vars = { FIRST_NAME: r.first_name || "frère/sœur", UNSUB_URL: UNSUB };
    const subject = render(tpl.subject, vars);
    const html = render(htmlTemplate, vars);

    let attempt = 0;
    let lastResp: any = null;
    while (attempt < 3) {
      lastResp = await resendSend({
        from: FROM_ADDR,
        to: [r.email],
        reply_to: REPLY_TO,
        subject, html,
        tags: [
          { name: "campaign", value: CAMPAIGN_SLUG },
          { name: "seq", value: String(seq) },
        ],
      });
      if ((lastResp.status >= 200 && lastResp.status < 300) || lastResp.status !== 429) break;
      attempt++;
      await sleep(500 * attempt);
    }

    const ok = lastResp.status >= 200 && lastResp.status < 300;
    if (ok) okCount++; else failCount++;

    logs.push({
      campaign_slug: CAMPAIGN_SLUG,
      email_seq: seq,
      recipient_email: r.email,
      recipient_first_name: r.first_name,
      resend_email_id: ok ? lastResp.data?.id : null,
      subject,
      status: ok ? "sent" : "failed",
      error_message: ok ? null : (lastResp.data?.message || JSON.stringify(lastResp.data)),
    });

    if (logs.length % 50 === 0) {
      const chunk = logs.splice(0);
      await supabase.from("email_campaign_sends").insert(chunk);
    }

    await sleep(DELAY_MS);
  }

  if (logs.length > 0) {
    await supabase.from("email_campaign_sends").insert(logs);
  }

  return new Response(JSON.stringify({
    ok: true, seq, processed: todo.length, sent: okCount, failed: failCount,
    template_name: tpl.name, already_sent_before: alreadySentSet.size, max_used: maxRecipients,
    total_recipients_loaded: recipients.length,
  }), { status: 200 });
});
