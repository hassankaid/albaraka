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
// LA DESTINATION SUIT LA CONFÉRENCE COURANTE, elle n'est plus écrite en dur.
//
// Un SMS reste cliquable longtemps après son envoi : le 30/08/2026, un
// destinataire a ouvert le lien du message de 10h50 à 14h42, soit près de
// quatre heures après la fin de la conférence — et il est tombé dans un groupe
// dont l'événement était terminé. `conference_courante()` bascule à l'heure de
// début, exactement comme les funnels : avant, on envoie vers le groupe du
// jour ; après, vers celui de la semaine suivante. Le retardataire atterrit
// donc là où il se passe encore quelque chose.
//
// Effet de bord bienvenu : plus rien à mettre à jour ici chaque semaine.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Filet de sécurité, utilisé uniquement si la fiche de la conférence n'a pas de
// groupe renseigné ou si la base ne répond pas. Une redirection ne doit jamais
// échouer : mieux vaut un groupe d'une semaine en retard qu'une page d'erreur.
const WHATSAPP_SECOURS = "https://chat.whatsapp.com/CsrTokJErHn035iINC9wdF";

async function groupeCourant(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("conference_courante");
    if (error) return WHATSAPP_SECOURS;
    const ligne = Array.isArray(data) ? data[0] : data;
    return ligne?.whatsapp_group_url || WHATSAPP_SECOURS;
  } catch {
    return WHATSAPP_SECOURS;
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const seq = url.searchParams.get("s");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const destination = await groupeCourant(supabase);

  if (!token) {
    return Response.redirect(destination, 302);
  }

  // On journalise, mais on ne bloque jamais la redirection.
  try {
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
          // Trace de la destination servie : sans elle, impossible de savoir a
          // posteriori dans quel groupe un cliqueur a ete envoye.
          destination,
          user_agent: req.headers.get("user-agent"),
          ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          referer: req.headers.get("referer"),
        },
      });
    }
  } catch (e) {
    console.error("r-sms log error:", e);
  }

  return Response.redirect(destination, 302);
});
