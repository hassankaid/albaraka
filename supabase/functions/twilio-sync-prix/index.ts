// ─────────────────────────────────────────────────────────────────────────
// Récupère le prix réel de chaque SMS auprès de Twilio et le range dans
// `sms_campaign_sends.price_usd`.
//
// POURQUOI CETTE FONCTION EXISTE. Le rappel de statut Twilio (`StatusCallback`)
// ne porte PAS le prix : au moment où il part, le message vient d'être accepté
// et n'est pas encore facturé. `twilio-webhook` cherchait donc un champ `Price`
// qui n'arrive jamais, et la colonne est restée vide sur toute la campagne de
// mai comme sur celle d'août — 2 018 segments sans montant.
//
// Le prix ne s'obtient qu'en interrogeant la ressource Message après coup, un
// appel par SID. C'est ce que fait cette fonction, à lancer une fois l'envoi
// terminé.
//
// Appel : POST { campaign_slug: "conf_2026_08_30_sms", seq?: 4 }
//
// Les identifiants Twilio ne quittent jamais le serveur : ils sont lus depuis
// `app_settings`, comme dans les fonctions d'envoi.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const DELAY_MS = 60;
const MAX_PAR_APPEL = 400;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function getTwilioCreds(supabase: any) {
  const { data } = await supabase.from("app_settings").select("key, value")
    .in("key", ["twilio_account_sid", "twilio_auth_token"]);
  const sid = (data ?? []).find((r: any) => r.key === "twilio_account_sid")?.value;
  const token = (data ?? []).find((r: any) => r.key === "twilio_auth_token")?.value;
  if (!sid || !token) throw new Error("twilio_creds_missing");
  return { sid, token };
}

serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 }); }

  const slug = body?.campaign_slug;
  if (!slug) return new Response(JSON.stringify({ error: "campaign_slug_requis" }), { status: 400 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let creds: { sid: string; token: string };
  try { creds = await getTwilioCreds(supabase); }
  catch (e: any) { return new Response(JSON.stringify({ error: "twilio_creds_error", message: e?.message }), { status: 500 }); }

  let q = supabase.from("sms_campaign_sends")
    .select("id, twilio_message_sid, sms_seq")
    .eq("campaign_slug", slug)
    .not("twilio_message_sid", "is", null)
    .is("price_usd", null)
    .limit(MAX_PAR_APPEL);
  if (body?.seq !== undefined) q = q.eq("sms_seq", parseInt(body.seq));

  const { data: aTraiter, error } = await q;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const auth = btoa(`${creds.sid}:${creds.token}`);
  let recuperes = 0, echecs = 0;
  let total = 0;
  const devises = new Set<string>();

  for (const ligne of aTraiter ?? []) {
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${creds.sid}/Messages/${ligne.twilio_message_sid}.json`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      if (!res.ok) { echecs++; await sleep(DELAY_MS); continue; }
      const m = await res.json();

      // Twilio renvoie le prix en NÉGATIF (c'est un débit) et sous forme de
      // chaîne. Il est null tant que la facturation n'a pas été consolidée —
      // quelques minutes après l'envoi.
      if (m.price === null || m.price === undefined) { await sleep(DELAY_MS); continue; }

      const montant = Math.abs(parseFloat(m.price));
      if (!Number.isFinite(montant)) { echecs++; await sleep(DELAY_MS); continue; }

      if (m.price_unit) devises.add(String(m.price_unit).toUpperCase());
      total += montant;
      recuperes++;

      await supabase.from("sms_campaign_sends").update({ price_usd: montant }).eq("id", ligne.id);
    } catch {
      echecs++;
    }
    await sleep(DELAY_MS);
  }

  return new Response(JSON.stringify({
    ok: true,
    campaign_slug: slug,
    a_traiter: (aTraiter ?? []).length,
    prix_recuperes: recuperes,
    // Prix pas encore consolidé côté Twilio : relancer la fonction plus tard.
    encore_sans_prix: (aTraiter ?? []).length - recuperes - echecs,
    echecs,
    total_recupere: Math.round(total * 10000) / 10000,
    // ⚠️ La colonne s'appelle `price_usd` mais Twilio facture dans la devise du
    // compte. Si ce n'est pas USD, le nom de la colonne ment : c'est signalé ici
    // plutôt que silencieusement converti.
    devises: [...devises],
  }), { status: 200 });
});
