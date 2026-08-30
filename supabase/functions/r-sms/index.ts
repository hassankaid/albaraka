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
// LE GROUPE N'EST PLUS ÉCRIT EN DUR. Il vient de la fiche de la conférence à
// laquelle appartient le destinataire, déduite de son slug de campagne
// (`conf_AAAA_MM_JJ_sms`) — et non de la conférence « courante ».
//
// La nuance compte : quelqu'un qui clique à 11h30 le dimanche doit atterrir
// dans le groupe de la conférence qui vient de commencer, celle pour laquelle
// il s'est inscrit, pas dans celui de la semaine suivante. Des clics arrivent
// encore deux semaines après l'envoi.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Dernier filet, si la fiche n'a pas de groupe renseigné et qu'aucune
// conférence n'est résolue : mieux vaut une salle que rien du tout.
const WHATSAPP_DEFAUT = "https://chat.whatsapp.com/BwBWVsHhM0Y0Fb37USMZS3";

/** "conf_2026_08_30_sms" → "2026-08-30", sinon null. */
function dateDuSlug(slug: string | null | undefined): string | null {
  const m = /^conf_(\d{4})_(\d{2})_(\d{2})_sms$/.exec(slug ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const seq = url.searchParams.get("s");

  let destination = WHATSAPP_DEFAUT;

  // Rien ne doit empêcher la redirection : toute erreur retombe sur le filet.
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let recipient: any = null;
    if (token) {
      const { data } = await supabase
        .from("sms_campaign_recipients")
        .select("phone, first_name, campaign_slug")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      recipient = data ?? null;
    }

    // Le groupe de SA conférence si on sait qui il est, celui de la conférence
    // en cours d'inscription sinon (lien tapé à la main, jeton inconnu).
    const dateConf = dateDuSlug(recipient?.campaign_slug);
    if (dateConf) {
      const { data: conf } = await supabase
        .from("conferences")
        .select("whatsapp_group_url")
        .eq("conference_date", dateConf)
        .maybeSingle();
      if (conf?.whatsapp_group_url) destination = conf.whatsapp_group_url;
    } else {
      const { data: courante } = await supabase.rpc("conference_courante");
      const row = Array.isArray(courante) ? courante[0] : null;
      if (row?.whatsapp_group_url) destination = row.whatsapp_group_url;
    }

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
          campaign_slug: recipient.campaign_slug,
          destination,
          user_agent: req.headers.get("user-agent"),
          ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          referer: req.headers.get("referer"),
        },
      });
    }
  } catch (e) {
    console.error("r-sms:", e);
  }

  return Response.redirect(destination, 302);
});
