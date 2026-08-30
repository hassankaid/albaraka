// ─────────────────────────────────────────────────────────────────────────
// Lien court des SMS : compte le clic, puis redirige vers le groupe WhatsApp.
//
// URL publique : plateforme.albarakaecosysteme.com/s/<jeton>/<seq>
// (réécriture Vercel → cette fonction, voir `vercel.json`)
//
// C'est le SEUL point de mesure des SMS : Twilio ne dit pas si un lien a été
// ouvert. En mai, ce compteur a relevé 262 cliqueurs côté SMS contre 19 côté
// e-mail — sans lui, on n'aurait pas su que le SMS portait toute la campagne.
//
// ⚠️ À CHAQUE CONFÉRENCE : mettre à jour WHATSAPP_URL. L'ancien groupe reste
// ouvert, donc se tromper n'affiche aucune erreur — ça envoie simplement tout
// le monde dans la salle précédente.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ── Conférence du dimanche 30 août 2026 ──
const WHATSAPP_URL = "https://chat.whatsapp.com/BwBWVsHhM0Y0Fb37USMZS3";

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const seq = url.searchParams.get("s");

  if (!token) {
    return Response.redirect(WHATSAPP_URL, 302);
  }

  // On journalise, mais on ne bloque jamais la redirection.
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: recipient } = await supabase
      .from("sms_campaign_recipients")
      .select("phone, first_name, campaign_slug")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (recipient) {
      // Pseudo-SID : le couple jeton + séquence suffit à l'unicité, et c'est la
      // clé sur laquelle la vue `sms_campaign_recipient_status` rattache le clic.
      const pseudoSid = `click_${token}_${seq || "x"}`;
      await supabase.from("sms_campaign_events").insert({
        twilio_message_sid: pseudoSid,
        event_type: "sms.clicked",
        payload: {
          token,
          seq,
          phone: recipient.phone,
          first_name: recipient.first_name,
          user_agent: req.headers.get("user-agent"),
          ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          referer: req.headers.get("referer"),
        },
      });
    }
  } catch (e) {
    console.error("r-sms log error:", e);
  }

  return Response.redirect(WHATSAPP_URL, 302);
});
