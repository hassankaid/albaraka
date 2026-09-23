// ─────────────────────────────────────────────────────────────────────────
// Campagne de lancement « Al Baraka 200 €/mois » — trois mails, une fois.
//
// Appel : POST { seq: 1 | 2 | 3, dry_run?: true, apercu?: true,
//                destinataire_test?: "adresse@exemple.fr", max?: 1..300 }
//
// Le mail 1 se déclenche à la main, le jour du lancement. Les mails 2 et 3
// suivent tout seuls à J+1 et J+2, à la même heure (cf. tick_albaraka_200).
//
// Le périmètre se charge dans `email_campaign_recipients` sous le slug
// ci-dessous. Tant qu'il est vide, tout ceci tourne à vide sans rien casser.
//
// ⚠️ LE PRIX N'EST PAS DANS LES MAILS 1 ET 2, ET C'EST VOULU. La copy de
// l'équipe marketing le garde pour la vidéo — « Je te donne pas le chiffre
// ici » — et l'annoncer avant la détruirait. Il apparaît dans le mail 3,
// qui traite justement de l'objection argent : là, dire les 2 400 € en douze
// mensualités et l'engagement sur un an répond à la question au lieu de la
// contourner. La page, la vidéo et le tunnel de paiement le disent aussi.
//
// ⚠️ Les exclusions sont recalculées À CHAQUE envoi : qui achète après le
// mail 1 ne reçoit pas le mail 2 qui lui dit « regarde la vidéo ».
//
// ⚠️ TOUJOURS `dry_run` D'ABORD.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Même expéditeur que les autres campagnes : c'est ce domaine dont
// l'authentification (SPF, DKIM, DMARC) est établie et vérifiée.
const FROM_ADDR = "Sidali · AL BARAKA <conference@albarakaecosysteme.com>";
const REPLY_TO = ["contact@albarakaecosysteme.com"];
const UNSUB_BASE = "https://plateforme.albarakaecosysteme.com/stop";

/** La page du tunnel : la vidéo, puis l'agenda. */
const LIEN_VIDEO = "https://event.albarakaecosysteme.com/al-baraka-200";

const CAMPAIGN_SLUG = "albaraka_200_lancement";
const DELAY_MS = 230;
const MAX_DEFAUT = 300;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

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

function cta(libelle: string): string {
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 10px;">
<tr><td align="center" bgcolor="#C9A04E" style="background-color:#C9A04E;border:1px solid #C9A04E;border-radius:6px;">
<a href="${LIEN_VIDEO}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${libelle}</a>
</td></tr></table>
<p style="text-align:center;font-size:13px;line-height:1.5;color:#7a7a7a;margin:0 0 22px;">Le bouton ne s'affiche pas ?<br><a href="${LIEN_VIDEO}" target="_blank" style="color:#A8813A;text-decoration:underline;">Ouvrir la vidéo</a></p>`;
}

const p = (t: string) => `<p>${t}</p>`;

const SIG = `<p style="margin-top:24px;">Sidali<br><span style="color:#7a7a7a;">Fondateur de l'Écosystème AL BARAKA</span></p>`;

/**
 * Les modalités, en clair.
 *
 * Encadré sobre et factuel, pas un argument de vente : ce que le client
 * signe doit être lisible avant qu'il clique, pas découvert au moment du
 * paiement. Réservé au mail 3 — voir l'avertissement en tête de fichier.
 */
const MODALITES = `<div style="margin:26px 0 8px;padding:16px 18px;background-color:#faf8f3;border:1px solid #e5e1d7;border-radius:6px;font-size:14px;line-height:1.6;color:#4a4a4a;">
<strong style="color:#1a1a1a;">Pour que ce soit clair :</strong> l'accès au Pass AL BARAKA est à <strong style="color:#1a1a1a;">2 400 €</strong>, réglés en <strong style="color:#1a1a1a;">12 mensualités de 200 €</strong>.
Ce n'est pas un abonnement qu'on arrête quand on veut : c'est un engagement sur douze mois, formalisé par un contrat et un bon de commande, et les douze mensualités sont dues.
Tu peux aussi régler en moins de fois, ou comptant — le total reste le même.
</div>`;

interface Gabarit { name: string; subject: string; preheader: string; body: string }

const TEMPLATES: Record<number, Gabarit> = {
  1: {
    name: "Lancement 200 — mail 1 : l'annonce",
    subject: "J'ai cassé les prix pour t'aider (mais c'est limité !)",
    preheader: "Le tarif le plus compétitif du marché pour ce niveau d'accompagnement.",
    body: [
      p("Salamou alaykoum c'est Sidali,"),
      p("Bon parlons franchement, aujourd'hui dans tout ce qui est business en ligne, la plupart des formateurs ayant un accompagnement sérieux en personal branding, marketing, closing, ou autre, facturent le prix fort, généralement entre 3000 et 4000 euros. Parfois beaucoup plus."),
      p("J'ai fait un choix différent."),
      p("Parce que je pense que la communauté aujourd'hui a réellement besoin qu'on lui tende la main, qu'on l'aide vraiment à ouvrir les portes d'une activité en ligne halal, sans casquer 4 ou 5000&nbsp;€."),
      p("J'ai décidé de t'offrir le Process Al Baraka qui a déjà permis à bon nombre de musulmans de générer leurs premiers milliers d'euros, au tarif le plus compétitif du marché pour ce niveau d'accompagnement."),
      p("Personne ne fait ça, et encore moins à ce prix. Je dis bien personne."),
      p("Je te donne pas le chiffre ici. Tu vas le découvrir dans la vidéo."),
      p("Mais avant ça, je veux être clair sur un truc."),
      p("Cette vidéo, elle est pas là pour tout le monde."),
      p("Elle est pour toi si tu souhaites nous rejoindre et que tu n'as pas encore pu, si t'es aligné avec l'écosystème Al Baraka et que tu veux construire ton indépendance financière, sans trahir tes valeurs."),
      p("Si c'est ton cas, regarde la vidéo."),
      cta("REGARDE LA VIDÉO"),
      SIG,
    ].join("\n"),
  },

  2: {
    name: "Lancement 200 — mail 2 : les 7 minutes",
    subject: "« J'ai pas le temps » mais tu perds aussi de l'argent et même plus",
    preheader: "7 minutes maintenant, ou continuer à tourner en rond.",
    body: [
      p("Salamou alaykoum c'est encore Sidali,"),
      p("Je t'ai parlé hier de l'offre à durée limitée qu'on propose avec l'écosystème Al Baraka, au tarif le plus compétitif du marché pour ce type d'accompagnement."),
      p("Si t'as pas encore regardé la vidéo, je devine ce que t'as pensé."),
      p("« J'ai pas le temps pour ça maintenant. »"),
      p("Je comprends. Vraiment."),
      p("Mais laisse-moi te dire un truc, honnêtement."),
      p("Cette vidéo dure 7 minutes. Et ce temps-là, il te permettra de comprendre exactement comment fonctionne un système qui a déjà permis à des centaines de personnes de construire leur indépendance, halal."),
      p("Le vrai coût, c'est pas ces 7 minutes."),
      p("C'est le temps que t'as déjà passé à hésiter."),
      p("Depuis combien de jours, de semaines, tu portes ce projet sans jamais le lancer&nbsp;?"),
      p("Et pendant que tu hésites, d'autres formateurs continuent de facturer 3000, 4000 euros pour un accompagnement comparable, sans jamais te proposer une alternative aussi accessible."),
      p("7 minutes maintenant, ou continuer à tourner en rond indéfiniment sans rien construire&nbsp;?"),
      cta("REGARDE LA VIDÉO"),
      p("Fais les causes&nbsp;! Qu'Allah facilite"),
      SIG,
    ].join("\n"),
  },

  3: {
    name: "Lancement 200 — mail 3 : les deux blocages",
    subject: "C'est ça qui te bloque, lis ce mail !",
    preheader: "« Je préfère pas dépenser » et « je vais réfléchir ».",
    body: [
      p("Salamou alaykoum, c'est Sidali (encore)"),
      p("À ce stade, je devine ce qui se passe dans ta tête. Deux pensées, probablement."),
      p("La première, « je préfère pas dépenser de l'argent là-dedans. »"),
      p("Et je comprends. Mais sache que l'argent n'est pas fait pour être stocké mais plutôt pour être utilisé&nbsp;! Pour que tu puisses le travailler et qu'il te permette d'améliorer ta vie&nbsp;!"),
      p("Ne laisse pas la peur et les waswas te paralyser toute ta vie&nbsp;!"),
      p("J'ai fait ma part pour aider la communauté, on propose le tarif le plus compétitif du marché, pour te permettre de créer ton activité en ligne."),
      MODALITES,
      p("Tout ça, c'est expliqué en détail dans la vidéo."),
      cta("REGARDE LA VIDÉO"),
      p("La deuxième pensée, « je vais réfléchir. »"),
      p("Celle-là, elle paraît raisonnable. Personne ne la remet en question. Mais laisse-moi te dire honnêtement ce qui se passe, la plupart du temps, derrière « je vais réfléchir. »"),
      p("Ça veut rarement dire « je vais vraiment y repenser sérieusement cette semaine. »"),
      p("Ça veut dire, le plus souvent, « je vais remettre ça de côté, et dans 3 mois je serai exactement là où je suis aujourd'hui. »"),
      p("Pas parce que t'as pas de volonté. Juste parce que sans décision claire, rien ne change, jamais."),
      p("Alors avant de réfléchir dans le vide, regarde la vidéo et en 7 minutes, tu sauras exactement ce qu'on propose, comment ça fonctionne, et pourquoi c'est l'occasion que tu ne dois absolument pas louper&nbsp;!"),
      p("Et à ce moment-là, ta réflexion aura enfin quelque chose de concret sur quoi se baser."),
      cta("REGARDE LA VIDÉO"),
      SIG,
    ].join("\n"),
  },
};

async function resendSend(payload: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const body = await req.json().catch(() => ({} as any));
  const seq = Number(body?.seq);
  const tpl = TEMPLATES[seq];
  if (!tpl) {
    return new Response(JSON.stringify({ error: "seq_inconnue", attendus: [1, 2, 3] }), { status: 400 });
  }

  const htmlTemplate = wrap(tpl.preheader, tpl.body);

  if (body?.apercu === true) {
    return new Response(
      render(htmlTemplate, { UNSUB_URL: UNSUB_BASE }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Qui reste à servir ─────────────────────────────────────────────────
  const { data: recipients, error: recErr } = await supabase
    .from("email_campaign_recipients")
    .select("email, first_name, position")
    .eq("campaign_slug", CAMPAIGN_SLUG)
    .order("position");
  if (recErr) {
    return new Response(JSON.stringify({ error: "perimetre_indisponible", detail: recErr.message }), { status: 500 });
  }

  const { data: dejaEnvoyes, error: sendsErr } = await supabase
    .from("email_campaign_sends")
    .select("recipient_email")
    .eq("campaign_slug", CAMPAIGN_SLUG)
    .eq("email_seq", seq);
  if (sendsErr) {
    return new Response(JSON.stringify({ error: "journal_indisponible", detail: sendsErr.message }), { status: 500 });
  }
  const dejaSet = new Set((dejaEnvoyes ?? []).map((r: any) => String(r.recipient_email).toLowerCase().trim()));

  // Sans la liste d'exclusion, on relancerait des gens qui ont acheté entre
  // deux messages : on refuse d'envoyer plutôt que de prendre le risque.
  const { data: exclus, error: exclusErr } = await supabase.rpc("emails_a_exclure_albaraka_200");
  if (exclusErr) {
    return new Response(JSON.stringify({ error: "exclusions_indisponibles", detail: exclusErr.message }), { status: 500 });
  }
  const exclusSet = new Set((exclus ?? []).map((e: any) => String(e.email).toLowerCase().trim()));

  const restants = (recipients ?? []).filter((r: any) => {
    const e = String(r.email).toLowerCase().trim();
    return !dejaSet.has(e) && !exclusSet.has(e);
  });
  const nbExclus = (recipients ?? []).filter((r: any) =>
    exclusSet.has(String(r.email).toLowerCase().trim())).length;

  const maxParam = parseInt(body?.max);
  const maxRecipients = (Number.isFinite(maxParam) && maxParam > 0 && maxParam <= MAX_DEFAUT) ? maxParam : MAX_DEFAUT;
  const todo = restants.slice(0, maxRecipients);

  if (body?.dry_run === true) {
    return new Response(JSON.stringify({
      dry_run: true,
      seq,
      template_name: tpl.name,
      objet: tpl.subject,
      lien: LIEN_VIDEO,
      perimetre: (recipients ?? []).length,
      deja_envoyes: dejaSet.size,
      exclus: nbExclus,
      partiraient_maintenant: todo.length,
      resteraient_apres: Math.max(0, restants.length - todo.length),
    }), { status: 200 });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "resend_non_configure" }), { status: 500 });
  }

  // ── Envoi de contrôle : hors campagne, rien n'est journalisé ───────────
  const destTest = typeof body?.destinataire_test === "string" ? body.destinataire_test.trim() : "";
  if (destTest) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destTest)) {
      return new Response(JSON.stringify({ error: "adresse_test_invalide", valeur: destTest }), { status: 400 });
    }
    const { data: jt } = await supabase.rpc("jetons_desabonnement_email", { p_emails: [destTest] });
    const jeton = (jt || [])[0]?.token;
    const lienStop = jeton ? `${UNSUB_BASE}/${jeton}` : UNSUB_BASE;
    const rep = await resendSend({
      from: FROM_ADDR, to: [destTest], reply_to: REPLY_TO,
      subject: tpl.subject, html: render(htmlTemplate, { UNSUB_URL: lienStop }),
      ...(jeton ? { headers: { "List-Unsubscribe": `<${lienStop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
      tags: [{ name: "campaign", value: CAMPAIGN_SLUG }, { name: "seq", value: String(seq) }],
    });
    const ok = rep.status >= 200 && rep.status < 300;
    return new Response(JSON.stringify({
      envoi_de_controle: true, seq, destinataire: destTest,
      objet: tpl.subject, ok, resend_status: rep.status,
      erreur: ok ? null : rep.data,
    }), { status: ok ? 200 : 502 });
  }

  if (todo.length === 0) {
    return new Response(JSON.stringify({ ok: true, seq, message: "personne_a_envoyer" }), { status: 200 });
  }

  const { data: jetons } = await supabase.rpc("jetons_desabonnement_email", {
    p_emails: todo.map((r: any) => r.email),
  });
  const jetonParEmail = new Map<string, string>(
    (jetons || []).map((j: any) => [String(j.email).toLowerCase().trim(), j.token]),
  );

  const logs: any[] = [];
  let okCount = 0, failCount = 0;

  for (const r of todo) {
    const jeton = jetonParEmail.get(String(r.email).toLowerCase().trim());
    const lienStop = jeton ? `${UNSUB_BASE}/${jeton}` : UNSUB_BASE;
    const html = render(htmlTemplate, { UNSUB_URL: lienStop });

    let attempt = 0;
    let lastResp: any = null;
    while (attempt < 3) {
      lastResp = await resendSend({
        from: FROM_ADDR, to: [r.email], reply_to: REPLY_TO,
        subject: tpl.subject, html,
        ...(jeton ? { headers: { "List-Unsubscribe": `<${lienStop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
        tags: [{ name: "campaign", value: CAMPAIGN_SLUG }, { name: "seq", value: String(seq) }],
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
      subject: tpl.subject,
      status: ok ? "sent" : "failed",
      error_message: ok ? null : (lastResp.data?.message || JSON.stringify(lastResp.data)),
    });

    // Journal par lots de 50 : un plantage en cours de route ne doit pas
    // faire repartir la campagne du début au prochain appel.
    if (logs.length >= 50) {
      await supabase.from("email_campaign_sends").insert(logs.splice(0, logs.length));
    }
    await sleep(DELAY_MS);
  }

  if (logs.length > 0) {
    await supabase.from("email_campaign_sends").insert(logs);
  }

  return new Response(JSON.stringify({
    ok: true, seq, template_name: tpl.name,
    envoyes: okCount, echecs: failCount, exclus: nbExclus,
    restants: Math.max(0, restants.length - todo.length),
  }), { status: 200 });
});
