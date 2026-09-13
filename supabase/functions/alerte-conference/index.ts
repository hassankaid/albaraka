// ─────────────────────────────────────────────────────────────────────────
// Alertes des envois automatiques de conférence, envoyées aux témoins.
//
// Appelée par `alerter_envois_conference()` (base) quand un envoi est bloqué
// (groupe WhatsApp manquant), parti trop tard, ou sans envoi constaté.
//
// L'APPEL NE TRANSPORTE AUCUN CONTENU. La fonction lit les alertes en attente
// dans `conference_envois_alertes` et les envoie aux seuls témoins mail de
// `conference_envois_temoins`. Quelqu'un qui l'appellerait de l'extérieur ne
// peut donc ni choisir le destinataire ni le texte : au pire, il déclenche
// l'envoi d'alertes qui attendaient déjà.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const FROM_ADDR = "Alertes conférence · AL BARAKA <conference@albarakaecosysteme.com>";

function echapper(texte: string): string {
  return texte.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "missing_resend_key" }), { status: 500 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: temoins } = await supabase.from("conference_envois_temoins").select("valeur").eq("canal", "mail");
  const destinataires = (temoins ?? []).map((t: any) => String(t.valeur).trim()).filter(Boolean);
  if (destinataires.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "aucun_temoin_mail" }), { status: 200 });
  }

  const { data: alertes } = await supabase
    .from("conference_envois_alertes")
    .select("id, sujet, message, cree_le")
    .is("envoye_a", null)
    .order("id", { ascending: true })
    .limit(20);

  let envoyees = 0;
  for (const a of alertes ?? []) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDR,
        to: destinataires,
        subject: `⚠️ ${a.sujet}`,
        html: `<p>${echapper(a.message)}</p><p style="color:#7a7a7a;font-size:13px;">Alerte automatique des envois de conférence.</p>`,
      }),
    });
    const ok = res.ok;
    const erreur = ok ? null : (await res.text()).slice(0, 500);
    await supabase
      .from("conference_envois_alertes")
      .update(ok ? { envoye_a: new Date().toISOString(), erreur: null } : { erreur })
      .eq("id", a.id);
    if (ok) envoyees++;
  }

  return new Response(JSON.stringify({ ok: true, envoyees, en_attente: (alertes ?? []).length }), { status: 200 });
});
