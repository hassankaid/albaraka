// ─────────────────────────────────────────────────────────────────────────
// Envoi de la séquence SMS d'une conférence, via Twilio.
//
// Appel : POST { seq: 4 | 6 }
//
// ⚠️ PAS DE PARAMÈTRE `max`. La fonction envoie à TOUS les numéros de
// `sms_campaign_recipients` (filtrés sur CAMPAIGN_SLUG) qui n'ont pas déjà reçu
// cette séquence, dans la limite de MAX_PER_CALL. Pour tester, la table ne doit
// contenir QUE le numéro de test.
//
// Les corps de messages sont volontairement SANS ACCENT : un seul caractère
// accentué bascule le SMS en UCS-2 et fait tomber la limite de 160 à 70
// caractères par segment, ce qui double la facture.
//
// Ils sont aussi calibrés pour tenir en UN segment (160 caractères). Le lien
// court en consomme 54 à lui seul : toute phrase rallongée fait basculer
// l'envoi entier à 2 segments.
//
// Pas d'en-tête « AL BARAKA - {{FIRST_NAME}} » : l'expéditeur alphanumérique
// affiche déjà « Al Baraka » sur le téléphone, donc la répéter dans le corps
// coûtait 12 caractères pour ne rien apprendre au lecteur.
//
// ⚠️ À CHAQUE CONFÉRENCE : changer CAMPAIGN_SLUG ici, et le lien du groupe
// WhatsApp dans `r-sms` (c'est lui qui reçoit le clic et redirige). L'ancien
// groupe reste ouvert, donc une erreur n'affiche rien : elle envoie juste tout
// le monde dans la salle précédente.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ── Conférence du dimanche 30 août 2026, 11h00 (heure de Paris) ──
const FROM_ID = "Al Baraka";
const CAMPAIGN_SLUG = "conf_2026_08_30_sms";

// 250 et non 500 : au-delà, l'appel dépasse le temps d'exécution de la fonction.
// En mai, un lot de 501 a coupé en cours de route et 384 lignes ont dû être
// reconstituées depuis les rappels Twilio.
const MAX_PER_CALL = 250;
const DELAY_MS = 100;
// Le journal est écrit par tranches de 50 : si l'appel s'interrompt, la reprise
// repart d'où il en était au lieu de tout renvoyer.
const LOG_CHUNK = 50;

const STATUS_CALLBACK = "https://ktvszjzryabjgxyobtyc.supabase.co/functions/v1/twilio-webhook";
const SHORT_BASE = "https://plateforme.albarakaecosysteme.com/s";

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const TEMPLATES: Record<number, { name: string; body: string }> = {
  4: {
    name: "T-2h",
    body: `Plus que 2h : conference en direct a 11h00.

Le lien du direct arrive dans le groupe :
{{LINK}}`,
  },
  6: {
    name: "Ouverture",
    body: `On commence dans 10 min.

Rejoins le groupe maintenant, le lien du direct y est :
{{LINK}}`,
  },
};

async function getTwilioCreds(supabase: any) {
  const { data } = await supabase.from("app_settings").select("key, value").in("key", ["twilio_account_sid", "twilio_auth_token"]);
  const sid = (data ?? []).find((r: any) => r.key === "twilio_account_sid")?.value;
  const token = (data ?? []).find((r: any) => r.key === "twilio_auth_token")?.value;
  if (!sid || !token) throw new Error("twilio_creds_missing");
  return { sid, token };
}

async function twilioSendSms(sid: string, token: string, b: { to: string; from: string; body: string; statusCallback?: string }) {
  const auth = btoa(`${sid}:${token}`);
  const params = new URLSearchParams();
  params.append("To", b.to);
  params.append("From", b.from);
  params.append("Body", b.body);
  if (b.statusCallback) params.append("StatusCallback", b.statusCallback);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

function render(t: string, vars: Record<string, string>) {
  let o = t;
  for (const [k, v] of Object.entries(vars)) o = o.replaceAll(`{{${k}}}`, v ?? "");
  return o;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 }); }

  const seq = parseInt(body?.seq);
  const tpl = TEMPLATES[seq];
  if (!tpl) {
    return new Response(JSON.stringify({ error: "seq_inconnu", attendus: Object.keys(TEMPLATES) }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let creds: { sid: string; token: string };
  try { creds = await getTwilioCreds(supabase); } catch (e: any) { return new Response(JSON.stringify({ error: "twilio_creds_error", message: e?.message }), { status: 500 }); }

  const { data: alreadySent } = await supabase
    .from("sms_campaign_sends").select("recipient_phone")
    .eq("campaign_slug", CAMPAIGN_SLUG).eq("sms_seq", seq);
  const sentSet = new Set((alreadySent ?? []).map((r: any) => r.recipient_phone));

  const { data: recipients } = await supabase
    .from("sms_campaign_recipients")
    .select("phone, first_name, position, unsubscribe_token")
    .eq("campaign_slug", CAMPAIGN_SLUG)
    .order("position", { ascending: true });

  const { data: unsubs } = await supabase.from("sms_unsubscribes").select("phone");
  const unsubSet = new Set((unsubs ?? []).map((r: any) => r.phone));

  const restants = (recipients ?? []).filter((r: any) => !sentSet.has(r.phone) && !unsubSet.has(r.phone));
  const todo = restants.slice(0, MAX_PER_CALL);

  if (todo.length === 0) {
    return new Response(JSON.stringify({ ok: true, seq, message: "all_sent", already_sent: sentSet.size }), { status: 200 });
  }

  let logs: any[] = [];
  let okCount = 0, failCount = 0;

  const flush = async () => {
    if (logs.length === 0) return;
    const chunk = logs;
    logs = [];
    await supabase.from("sms_campaign_sends").insert(chunk);
  };

  for (const r of todo) {
    const link = `${SHORT_BASE}/${r.unsubscribe_token}/${seq}`;
    const messageBody = render(tpl.body, { FIRST_NAME: r.first_name || "", LINK: link });

    let attempt = 0;
    let lastResp: any = null;
    while (attempt < 3) {
      lastResp = await twilioSendSms(creds.sid, creds.token, {
        to: r.phone, from: FROM_ID, body: messageBody, statusCallback: STATUS_CALLBACK,
      });
      if ((lastResp.status >= 200 && lastResp.status < 300) || lastResp.status !== 429) break;
      attempt++; await sleep(500 * attempt);
    }

    const ok = lastResp.status >= 200 && lastResp.status < 300;
    if (ok) okCount++; else failCount++;

    logs.push({
      campaign_slug: CAMPAIGN_SLUG, sms_seq: seq,
      recipient_phone: r.phone, recipient_first_name: r.first_name,
      twilio_message_sid: ok ? lastResp.data?.sid : null,
      body: messageBody,
      num_segments: ok ? parseInt(lastResp.data?.num_segments) : null,
      price_usd: null,
      status: ok ? "sent" : "failed",
      error_message: ok ? null : (lastResp.data?.message || JSON.stringify(lastResp.data)),
    });

    if (logs.length >= LOG_CHUNK) await flush();

    await sleep(DELAY_MS);
  }

  await flush();

  return new Response(JSON.stringify({
    ok: true, seq, processed: todo.length, sent: okCount, failed: failCount,
    template_name: tpl.name, already_sent_before: sentSet.size,
    restants_apres_appel: Math.max(0, restants.length - todo.length),
  }), { status: 200 });
});
