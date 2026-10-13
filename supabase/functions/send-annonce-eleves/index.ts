// ─────────────────────────────────────────────────────────────────────────
// Annonce e-mail aux élèves du 13/10/2026, via Resend. Texte de Sidali repris
// MOT POUR MOT (décision de Hassan : ni bouton ajouté, ni prénom). Sidali publie
// lui-même la version Discord.
//
// Appel : POST, en-tête `x-annonce-secret` = secret ANNONCE_ELEVES_SECRET
//   { apercu: true }                         → le HTML, rien n'est envoyé
//   { destinataire_test: "adresse" }         → un seul envoi, hors journal
//   { dry_run: true }                        → combien partiraient
//   { max?: 1..150 }                         → envoi réel, par lots
//
// Destinataires : destinataires_annonce_eleves() (pass actif, accès non coupé,
// hors désabonnés, hors déjà reçus). Le journal email_campaign_sends empêche tout
// doublon : relancer ne renvoie qu'à ceux qui ne l'ont pas encore reçue.
// ⚠️ UN SEUL APPEL À LA FOIS : le journal s'écrit au fil de l'eau.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SECRET = Deno.env.get("ANNONCE_ELEVES_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Même expéditeur que les autres messages de Sidali : réputation établie.
const FROM_ADDR = "Sidali · AL BARAKA <conference@albarakaecosysteme.com>";
const REPLY_TO = ["contact@albarakaecosysteme.com"];
const UNSUB_BASE = "https://plateforme.albarakaecosysteme.com/stop";
const CAMPAIGN_SLUG = "annonce_eleves_2026_10";

const DEFAULT_MAX = 150;
const DELAY_MS = 230;

const SUBJECT = "🔥 Du nouveau dans l'écosystème AL BARAKA : parcours, ressources, nouvel outil et communauté WhatsApp";
const PREHEADER = "J'ai de très bonnes nouvelles à vous partager, Alhamdoulilah.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const p = (texte: string) => `<p style="margin:0 0 14px;">${texte}</p>`;
const titre = (texte: string) =>
  `<p style="margin:28px 0 12px;font-size:17px;font-weight:700;color:#1a1a1a;">${texte}</p>`;
const ligne = (texte: string) => `<p style="margin:6px 0 6px 4px;">${texte}</p>`;
const sousLigne = (texte: string) => `<p style="margin:4px 0 4px 22px;">${texte}</p>`;

// Le texte de Sidali, dans l'ordre. Ses *astérisques* WhatsApp deviennent du gras.
const CORPS = [
  p("Salam 'alaykoum la famille AL BARAKA ! 🙌"),
  p("J'ai de très bonnes nouvelles à vous partager, Alhamdoulilah."),
  p("Vous le savez, l'écosystème AL BARAKA n'arrête jamais d'avancer. On améliore la plateforme et l'accompagnement en permanence, avec un seul objectif : que vous obteniez un maximum de résultats. Cette fois, on a mis en place beaucoup d'améliorations d'un coup. Je vous explique tout."),

  titre("📚 1. Vos parcours de formation"),
  p("Aujourd'hui, l'écosystème compte trois parcours :"),
  ligne("🔹 <b>Le parcours Liberty</b> : la formule la plus complète de l'écosystème. Elle vous accompagne de A à Z, de la création de votre offre jusqu'au scaling avec la publicité."),
  ligne("🔹 <b>Le Pass AL BARAKA</b> : la formule que la majorité d'entre vous a rejointe. Elle donne désormais accès à deux parcours :"),
  sousLigne("– Le parcours <b>Community Management</b>, pour celles et ceux qui veulent monétiser cette compétence."),
  sousLigne("– Le parcours <b>Setting / Closing</b>, pensé pour des résultats rapides, avec une possibilité d'évolution en interne."),
  ligne("🔹 <b>En bonus : Estimaction</b>, le programme sur l'estime de soi et la confiance en soi qui vous a été offert."),

  titre("📥 2. Des ressources plus faciles à récupérer"),
  ligne("– Les ressources se téléchargent maintenant en un clic, avec le bouton sous chaque vidéo. Plus besoin de faire « Enregistrer sous » : vous cliquez, c'est téléchargé."),
  ligne("– Dans votre Espace Training, une nouvelle catégorie « Ressources » est disponible. Vous y retrouvez toutes les ressources de chaque formation, réunies au même endroit."),

  titre("🎬 3. Nouveauté dans l'Espace Working : l'outil Studio"),
  p("L'outil Personal Branding n'est plus disponible. Il ne correspond plus à nos nouvelles stratégies."),
  p("À la place, je vous présente <b>Studio</b> 🎥. Vos scripts de vidéos vous y attendent, il ne vous reste plus qu'à agir :"),
  ligne("– <b>Vidéo face caméra</b> : vous filmez, vous importez votre vidéo sur la plateforme et vous choisissez de flouter votre visage ou non."),
  ligne("– <b>Montage en voix off</b> : vous enregistrez votre voix directement sur la plateforme. L'IA s'occupe du reste : elle nettoie le son, ajoute les sous-titres et crée un montage dynamique avec des vidéos adaptées au thème de votre contenu."),
  p("Studio vous permet de générer 1 vidéo par jour gratuitement. Chaque vidéo a un coût pour l'écosystème, et pour la version gratuite, c'est moi, Sidali, qui prends en charge tous les frais, pour tous les membres."),
  p("Pour celles et ceux qui veulent aller plus loin, un abonnement à 10 €/mois permet de générer jusqu'à 5 vidéos par jour, pour plus de visibilité, plus de performance et un maximum de temps gagné."),

  titre("💬 4. La pratique se passe maintenant sur WhatsApp"),
  p("Jusqu'ici, la pratique se faisait dans la catégorie Working du Discord. À partir de maintenant, elle se fait directement sur WhatsApp."),
  p("On a créé une communauté WhatsApp pour faciliter les échanges : tout le monde a WhatsApp, alors que certains n'ont pas encore le réflexe d'aller sur Discord. Tous les échanges sur la création de contenu, le setting et le closing se passeront donc dans cette communauté."),
  p("👉 Le lien se trouve dans la catégorie Working du Discord. Cliquez pour rejoindre et venez pratiquer avec les autres membres."),

  titre("💪 Le mot de la fin"),
  p("On fait tout ce qui est humainement possible pour vous donner les meilleurs outils, le meilleur accompagnement et un maximum de résultats. En retour, j'attends de vous de la rigueur, du sérieux et une implication totale."),
  p("Les outils sont là. Le chemin est tracé. Maintenant, c'est à vous de jouer. Passez à l'action, soyez constants, et vous atteindrez vos objectifs, bi'idhnillah. 🤲"),
  p("On avance ensemble. Tawakkal 'ala Allah. 🚀<br>Sidali"),
].join("\n");

function html(lienStop: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>AL BARAKA</title></head>
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.6;">
<div style="display:none;font-size:1px;color:#f5f3ee;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${PREHEADER}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f3ee;padding:24px 0;">
<tr><td align="center">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;padding:32px 28px;">
<tr><td style="font-size:15px;color:#1a1a1a;">
${CORPS}
<div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e1d7;font-size:12px;color:#7a7a7a;text-align:center;line-height:1.5;">
AL BARAKA — Écosystème de l'entrepreneuriat halal<br>
<a href="${lienStop}" style="color:#7a7a7a;text-decoration:underline;">Se désabonner</a>
</div>
</td></tr></table></td></tr></table></body></html>`;
}

async function resendSend(payload: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "methode" }, 405);
  // Envoi à ~300 élèves : réservé à qui détient le secret (jamais exposé au front).
  if (!SECRET || req.headers.get("x-annonce-secret") !== SECRET) return json({ error: "non_autorise" }, 401);

  const body = await req.json().catch(() => ({} as any));
  if (body?.apercu === true) {
    return new Response(html(UNSUB_BASE), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (!RESEND_API_KEY) return json({ error: "resend_non_configure" }, 500);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const enTetes = (lien: string) => ({ "List-Unsubscribe": `<${lien}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });

  const destTest = typeof body?.destinataire_test === "string" ? body.destinataire_test.trim() : "";
  if (destTest) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destTest)) return json({ error: "adresse_test_invalide" }, 400);
    const { data: jt } = await supabase.rpc("jetons_desabonnement_email", { p_emails: [destTest] });
    const lienStop = (jt || [])[0]?.token ? `${UNSUB_BASE}/${jt[0].token}` : UNSUB_BASE;
    const rep = await resendSend({
      from: FROM_ADDR, to: [destTest], reply_to: REPLY_TO, subject: SUBJECT, html: html(lienStop),
      headers: enTetes(lienStop), tags: [{ name: "campaign", value: CAMPAIGN_SLUG }, { name: "mode", value: "test" }],
    });
    const ok = rep.status >= 200 && rep.status < 300;
    return json({ envoi_test: true, destinataire: destTest, ok, resend_id: ok ? rep.data?.id : null, erreur: ok ? null : rep.data }, ok ? 200 : 502);
  }

  const { data: dus, error } = await supabase.rpc("destinataires_annonce_eleves", { p_campagne: CAMPAIGN_SLUG });
  if (error) return json({ error: "destinataires_indisponibles", detail: error.message }, 500);
  const maxParam = parseInt(body?.max);
  const max = Number.isFinite(maxParam) && maxParam > 0 && maxParam <= 150 ? maxParam : DEFAULT_MAX;
  const lot = (dus || []).slice(0, max);

  if (body?.dry_run === true) {
    return json({ dry_run: true, objet: SUBJECT, restants: (dus || []).length, partiraient_maintenant: lot.length });
  }
  if (lot.length === 0) return json({ ok: true, message: "tout_le_monde_l_a_recue" });

  const { data: jetons } = await supabase.rpc("jetons_desabonnement_email", { p_emails: lot.map((r: any) => r.email) });
  const jetonParEmail = new Map<string, string>((jetons || []).map((j: any) => [String(j.email).toLowerCase().trim(), j.token]));

  const logs: any[] = [];
  let envoyes = 0, echecs = 0;
  for (const r of lot) {
    const jeton = jetonParEmail.get(r.email);
    const lienStop = jeton ? `${UNSUB_BASE}/${jeton}` : UNSUB_BASE;
    let rep: { status: number; data: any } = { status: 0, data: null };
    for (let essai = 0; essai < 3; essai++) {
      rep = await resendSend({
        from: FROM_ADDR, to: [r.email], reply_to: REPLY_TO, subject: SUBJECT, html: html(lienStop),
        ...(jeton ? { headers: enTetes(lienStop) } : {}),
        tags: [{ name: "campaign", value: CAMPAIGN_SLUG }],
      });
      if (rep.status !== 429) break;
      await sleep(500 * (essai + 1));
    }
    const ok = rep.status >= 200 && rep.status < 300;
    ok ? envoyes++ : echecs++;
    logs.push({
      campaign_slug: CAMPAIGN_SLUG, email_seq: 1, recipient_email: r.email, recipient_first_name: r.first_name,
      resend_email_id: ok ? rep.data?.id : null, subject: SUBJECT, status: ok ? "sent" : "failed",
      error_message: ok ? null : (rep.data?.message || JSON.stringify(rep.data)),
    });
    if (logs.length >= 25) await supabase.from("email_campaign_sends").insert(logs.splice(0, logs.length));
    await sleep(DELAY_MS);
  }
  if (logs.length) await supabase.from("email_campaign_sends").insert(logs);

  return json({ ok: true, envoyes, echecs, restants: Math.max(0, (dus || []).length - lot.length) });
});
