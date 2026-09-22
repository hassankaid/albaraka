// ─────────────────────────────────────────────────────────────────────────
// Séquence e-mail du tunnel Liberty, via Resend.
//
// Appel : POST { seq: 1..5, max?: 1..300, dry_run?: true, apercu?: true,
//                destinataire_test?: "adresse@exemple.fr", prenom_test?: "…" }
//
// Cinq messages, repris MOT POUR MOT du document « Copy tunnel de vente » :
//   1 → confirmation d'inscription, renvoie vers la vidéo
//   2 → « il me manque encore quelque chose avant de me lancer »
//   3 → les trois doutes
//   4 → ceux qui attendent et ceux qui décident
//   5 → message final, filtrage direct
//
// ⚠️ CETTE FONCTION NE DÉCIDE PAS QUI EST DÛ. Elle demande la liste à
// `destinataires_sequence_liberty(seq)`, qui porte tout le calendrier : le
// message 1 part à l'inscription, les suivants un par jour à 9h. La même
// fonction écarte désabonnés, adresses en erreur, et — dès le message 2 — ceux
// qui ont déjà réservé ou acheté.
//
// ⚠️ TOUJOURS FAIRE UN `dry_run` D'ABORD, et `apercu` pour relire le rendu.
//
// ⚠️ UN SEUL APPEL À LA FOIS. Le journal s'écrit au fil de l'eau : relancer
// pendant qu'un appel tourne repart d'un journal incomplet et renvoie aux mêmes
// personnes. Le tick SQL pose déjà un verrou de trois minutes.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Même expéditeur que les conférences : c'est le domaine dont la réputation est
// établie, et en changer ferait repartir la délivrabilité de zéro.
const FROM_ADDR = "Sidali · AL BARAKA <conference@albarakaecosysteme.com>";
const REPLY_TO = ["contact@albarakaecosysteme.com"];
const UNSUB_BASE = "https://plateforme.albarakaecosysteme.com/stop";

/** Slug de campagne : la séquence est permanente, pas rattachée à une date. */
const CAMPAIGN_SLUG = "tunnel_liberty";

/** La page qui porte la vidéo — et l'agenda juste en dessous. */
const LIEN_VSL = "https://event.albarakaecosysteme.com/liberty/merci";
/** L'agenda seul, pour les messages qui demandent explicitement de réserver. */
const LIEN_CALENDLY = "https://calendly.com/d/dv7b-mbd-5zk/liberty";

const DEFAULT_MAX = 150;
const DELAY_MS = 230;

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

/** Bouton doré, identique à celui des mails de conférence. */
function cta(url: string, libelle: string): string {
  const visible = url.replace(/^https?:\/\//, "");
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 10px;">
<tr><td align="center" bgcolor="#C9A04E" style="background-color:#C9A04E;border:1px solid #C9A04E;border-radius:6px;">
<a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${libelle}</a>
</td></tr></table>
<p style="text-align:center;font-size:13px;line-height:1.5;color:#7a7a7a;margin:0 0 22px;">Le bouton ne s'affiche pas ?<br><a href="${url}" target="_blank" style="color:#A8813A;text-decoration:underline;">${visible}</a></p>`;
}

const p = (texte: string) => `<p>${texte}</p>`;

/** Liste à puces. Un paragraphe par ligne, comme dans les mails de conférence :
 *  les <ul> passent mal dans plusieurs clients, et le rendu y perd son air. */
const puces = (lignes: string[]) =>
  lignes.map((l) => `<p style="margin:6px 0 6px 4px;">${l}</p>`).join("\n");

const SIG = `<p style="margin-top:24px;">Sidali<br><span style="color:#7a7a7a;">Fondateur de l'écosystème AL BARAKA</span></p>`;

interface Gabarit { name: string; subject: string; preheader: string; body: string }

const TEMPLATES: Record<number, Gabarit> = {
  1: {
    name: "Liberty 1 — Confirmation + VSL",
    subject: "Ta vraie chance commence maintenant",
    preheader: "La vidéo t'attend.",
    body: [
      p("{{FIRST_NAME}},"),
      p("Tu viens de faire un choix que beaucoup n'osent jamais faire."),
      p("Celui de te donner une vraie chance de vivre de ce que tu sais déjà faire, que ce soit le cake design, le coaching, la nutrition, la psychologie, ou n'importe quelle autre compétence que tu maîtrises depuis des années."),
      p("Une chance de transformer ce que tu sais faire en une activité rentable, halal, qui t'appartient vraiment."),
      p("Et rien que pour ça, bravo."),
      p("Dans cette vidéo, je vais te montrer comment des musulmans exactement comme toi ont réussi à :"),
      puces([
        "Sortir de cet écart frustrant entre « je sais faire ça, même mieux que d'autres » et « j'en vis réellement chaque mois »",
        "Transformer leur compétence en offre claire, vendable à plusieurs milliers d'euros, sans avoir besoin d'une grosse audience",
        "Construire un système qui continue de tourner même quand ils ne travaillent pas dessus, jusqu'à parfois vivre où ils veulent, dans le pays de leur choix",
      ]),
      cta(LIEN_VSL, "REGARDE LA VIDÉO ICI"),
      p("Voici ce que tu vas découvrir :"),
      puces([
        "Pourquoi ce n'est presque jamais la compétence elle-même qui bloque, et ce qui manque vraiment entre « savoir faire » et « en vivre »",
        "Le Process Al Baraka, étape par étape, pour transformer n'importe quelle compétence sérieuse en activité rentable et halal",
        "Comment ça a permis à certains membres de générer leurs premiers milliers d'euros en quelques mois, et parfois de faire des choix de vie qu'ils pensaient hors de portée, comme s'installer dans un autre pays",
      ]),
      p("Un dernier truc avant que tu la regardes."),
      p("Tu as sûrement déjà vécu ce moment. Tu vois quelqu'un vivre de sa compétence ou de sa passion en ligne, et une pensée traverse ton esprit : « ça, je sais faire ça aussi. Peut-être même mieux que lui, mieux qu'elle. »"),
      p("Si cette phrase te parle, la vidéo est faite pour toi. Aucune pression, aucun compte à rebours, juste de quoi comprendre comment ça fonctionne, et ensuite ce sera à toi de voir si ça te parle."),
      cta(LIEN_VSL, "REGARDE LA VIDÉO MAINTENANT"),
      p("À tout de suite,"),
      SIG,
    ].join("\n"),
  },

  2: {
    name: "Liberty 2 — Lever les fausses croyances",
    subject: "« Il me manque encore quelque chose avant de me lancer »",
    preheader: "Tu as déjà ce qui compte vraiment.",
    body: [
      p("{{FIRST_NAME}},"),
      p("Tu veux vivre de ta compétence ou de ta passion."),
      p("Tu veux le faire sérieusement, avec un vrai système derrière, pas juste « essayer un peu » au hasard."),
      p("Et tu penses peut-être qu'il te faut :"),
      puces([
        "Être déjà un expert reconnu dans ton domaine",
        "Des années d'expérience en business",
        "Un statut particulier, un diplôme précis",
        "Ou encore « être prêt à 100 % » avant de commencer",
      ]),
      p("Mais laisse-moi être très honnête avec toi."),
      p("C'est exactement ce que pensent la plupart des gens qui ont une vraie compétence ou une vraie passion."),
      p("Et c'est précisément pour ça qu'ils n'y vont jamais."),
      p("Ils croient qu'ils doivent « être légitimes » avant de commencer. Résultat : ils continuent à voir d'autres personnes, parfois moins compétentes qu'eux, vivre de ce qu'ils savent faire eux-mêmes. Ils se disent que ce n'est pas encore le bon moment. Ils pensent qu'il faut d'abord tout maîtriser en marketing, en vente, en business. Et ils finissent par ne jamais commencer, année après année."),
      p("Et pourtant, il existe une autre voie. Une voie qui part de ce que tu as déjà."),
      p("Parce que toi, tu n'as pas besoin d'apprendre ta compétence depuis zéro. Tu n'as pas besoin qu'on t'explique ton domaine, celui que tu maîtrises déjà. Tu n'as pas besoin de repartir de zéro."),
      p("Tu as déjà ce qui compte vraiment : une vraie compétence, une vraie passion. Il te manque juste le système pour la transformer en activité rentable. Et l'accompagnement direct, étape par étape."),
      p("C'est exactement ce que je t'explique dans cette vidéo :"),
      cta(LIEN_VSL, "VOIR LA VIDÉO ICI"),
      p("Tu vas comprendre :"),
      puces([
        "Pourquoi ce n'est presque jamais la compétence qui manque, et ce qui fait vraiment la différence entre ceux qui en vivent et ceux qui restent bloqués",
        "Le Process Al Baraka complet, étape par étape, pour transformer n'importe quelle compétence sérieuse en offre claire, vendable, à plusieurs milliers d'euros",
        "Comment construire ton identité et ta visibilité, sans avoir besoin d'une audience ni d'un book impressionnant pour commencer",
      ]),
      p("Si tu ne l'as pas encore regardée, prends le temps de la voir en entier."),
      p("Tu verras aussi ce qui se passe si tu décides d'aller plus loin après la vidéo, un simple appel, pas pour te vendre quoi que ce soit, mais pour étudier ensemble si ton projet est vraiment faisable."),
      cta(LIEN_VSL, "REGARDE LA VIDÉO ICI"),
      p("On se retrouve demain,"),
      p("Pour te parler de personnes qui étaient exactement là où tu en es aujourd'hui, et de ce qui a changé pour elles."),
      p("À demain,"),
      SIG,
    ].join("\n"),
  },

  3: {
    name: "Liberty 3 — Les 3 doutes",
    subject: "3 doutes qui empêchent presque tout le monde de se lancer",
    preheader: "Tu te reconnais dans lequel ?",
    body: [
      p("{{FIRST_NAME}},"),
      p("Aujourd'hui, j'ai envie de te parler de 3 doutes très différents."),
      p("Mais qui ont tous un point commun, si tu rejoins le Process Al Baraka."),
      p("Lis jusqu'au bout. Et dis-moi, tu te reconnais dans lequel ?"),
      p("<strong>Doute 1 : « Je n'ai pas encore de vraie offre à proposer »</strong>"),
      p("Tu sais faire quelque chose de sérieux, que ce soit du coaching, de la nutrition, du cake design, de la psychologie ou autre chose"),
      p("Mais tu le fais un peu au hasard. Sans structure claire. Sans savoir vraiment ce que tu vends, ni à qui, ni à quel prix."),
      p("Avec le Process Al Baraka, tu repars avec une offre claire, structurée, vendable, à plusieurs milliers d'euros."),
      p("<strong>Doute 2 : « Mon domaine est trop niche pour vraiment en vivre »</strong>"),
      p("Tu te dis peut-être que ta compétence, ta passion, c'est trop confidentiel pour construire une vraie activité dessus."),
      p("Sauf que la plupart des membres de l'écosystème sont partis exactement du même constat. Cake design, langue arabe, conseil conjugal, coaching sportif, peu importe le domaine, ce qui compte c'est la structure derrière, pas la taille apparente du marché."),
      p("<strong>Doute 3 : « Je ne suis peut-être pas assez légitime pour ça »</strong>"),
      p("Tu te dis peut-être que ce genre de réussite est réservé à des profils plus confirmés, plus expérimentés que toi."),
      p("Mais le seul vrai prérequis, c'est d'avoir une compétence ou une passion sérieuse. Le reste, l'offre, l'identité, le marketing, la vente, le système, ça s'apprend et se construit, étape par étape, avec un accompagnement direct."),
      p("Tu vois, ces 3 doutes n'ont rien de « plus » que les tiens."),
      p("Ils partent tous du même endroit : la peur de se lancer sur un sujet qu'on maîtrise pas encore, sur un chemin qu'on connaît mal."),
      p("Et si c'était à ton tour maintenant ?"),
      cta(LIEN_CALENDLY, "JE RÉSERVE MON APPEL"),
      p("30 minutes, pour étudier ensemble si le Process Al Baraka est fait pour toi. Pas un argumentaire de vente, une vraie étude de faisabilité de ton projet."),
      p("Si on voit que ça ne peut pas marcher pour toi en l'état, on te le dira honnêtement, et on t'orientera autrement."),
      p("Parce qu'une chose est sûre : ce n'est pas « quand tout sera parfait » que ça se jouera."),
      p("C'est maintenant. Avec ce que tu as déjà."),
      p("À demain,"),
      SIG,
    ].join("\n"),
  },

  4: {
    name: "Liberty 4 — Les deux types de personnes",
    subject: "Ceux qui attendent, et ceux qui décident",
    preheader: "À toi de choisir de quel côté tu veux être.",
    body: [
      p("{{FIRST_NAME}},"),
      p("Aujourd'hui je vais être direct avec toi."),
      p("Des centaines de musulmans rêvent de vivre de leur compétence ou de leur passion. De construire quelque chose qui leur appartient vraiment. De ne plus dépendre d'un seul salaire."),
      p("Et pourtant, la majorité continue de faire exactement comme avant."),
      p("Résultat ?"),
      puces([
        "Elles restent avec leur compétence, mais jamais transformée en vraie offre « ça reste un projet, un jour »",
        "Elles regardent des formations en ligne pendant des mois sans jamais se décider",
        "Ou pire, elles attendent d'être « assez expertes » pour se lancer, un moment qui n'arrive jamais",
      ]),
      p("Pendant ce temps-là, une minorité fait un autre choix."),
      puces([
        "Elles arrêtent d'attendre d'être expertes en business, et prennent la bonne décision maintenant",
        "Elles utilisent leur compétence ou leur passion exactement telle qu'elle est aujourd'hui, sans chercher d'excuse supplémentaire",
        "Elles se font accompagner étape par étape, avec un vrai système complet, du positionnement de l'offre jusqu'à la vente",
      ]),
      p("Sans repartir de zéro sur leur compétence. Sans attendre d'être déjà des experts reconnus. Sans attendre d'avoir « tout » avant de commencer."),
      p("Et toi, tu veux faire quoi ?"),
      p("Tu veux continuer à regarder d'autres personnes vivre de ce que tu sais faire toi aussi, pendant que tu remets encore à demain ?"),
      p("Ou tu veux, toi aussi, utiliser ce que tu as déjà pour construire une activité qui se vend à plusieurs milliers d'euros, en ligne ?"),
      p("Si tu veux en parler sérieusement, réserve ton appel avec l'équipe Al Baraka :"),
      cta(LIEN_CALENDLY, "JE RÉSERVE MON APPEL"),
      p("Je te le dis honnêtement : rejoindre l'écosystème ne garantit rien à lui seul. Ce qui fait la différence, c'est ce que tu en fais ensuite, le travail, la constance, la détermination."),
      p("Mais une chose est sûre : rester où tu es aujourd'hui ne changera rien non plus."),
      p("À toi de choisir de quel côté tu veux être."),
      SIG,
    ].join("\n"),
  },

  5: {
    name: "Liberty 5 — Message final, filtrage direct",
    subject: "Ce message n'est pas pour tout le monde",
    preheader: "C'est ton choix. Pas celui des autres.",
    body: [
      p("{{FIRST_NAME}},"),
      p("Je vais être honnête avec toi."),
      p("Si tu es OK avec le fait de continuer à faire exactement comme avant…"),
      p("Et si tu préfères encore remettre ce projet à « plus tard »…"),
      p("Alors franchement : laisse tomber."),
      p("Ne regarde pas la vidéo."),
      p("Ne réserve pas d'appel."),
      p("Et ne te donne pas de faux espoirs."),
      p("Parce que si tu n'es pas prêt à bouger maintenant, rien ne changera dans 3 mois. Ni dans 3 ans."),
      p("Mais sois sincère avec toi-même."),
      puces([
        "&#8594; Est-ce que tu es vraiment satisfait de ta situation aujourd'hui ?",
        "&#8594; Est-ce que tu construis quelque chose qui t'appartient vraiment, ou tu attends encore ?",
        "&#8594; Dans 6 mois, tu veux te dire « j'ai enfin commencé » ou « j'attends toujours le bon moment » ?",
      ]),
      p("Le problème, ce n'est pas toi."),
      p("C'est qu'on ne t'a jamais montré qu'un autre modèle était possible."),
      p("Un modèle où tu :"),
      puces([
        "&#9989; Utilises ta compétence ou ta passion telle qu'elle est aujourd'hui, comme un vrai point de départ, pas comme un frein",
        "&#9989; Structures une offre claire et vendable, étape par étape, avec un accompagnement direct",
        "&#9989; Construis une activité halal, en ligne, qui peut continuer à tourner même quand tu ne travailles pas dessus",
      ]),
      p("Sans être déjà un expert reconnu. Sans repartir de zéro sur ce que tu maîtrises déjà. Et sans attendre que « le bon moment » arrive tout seul."),
      p("Si tu veux en discuter sérieusement, réserve ton appel avec l'équipe Al Baraka ici :"),
      cta(LIEN_CALENDLY, "JE RÉSERVE MON APPEL"),
      p("Mais si tu ne fais rien, ne t'étonne pas que rien ne bouge."),
      p("C'est ton choix. Pas celui des autres."),
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
  const seq = parseInt(body?.seq);
  const tpl = TEMPLATES[seq];
  if (!tpl) {
    return new Response(JSON.stringify({ error: "seq_inconnu", attendus: Object.keys(TEMPLATES) }), { status: 400 });
  }

  const htmlTemplate = wrap(tpl.preheader, tpl.body);

  // Aperçu : rend le message tel qu'il partirait, sans rien envoyer et sans
  // toucher la base. Le seul moyen de relire la mise en forme autrement qu'à
  // l'aveugle.
  if (body?.apercu === true) {
    return new Response(
      render(htmlTemplate, { FIRST_NAME: body?.prenom_test || "Prénom", UNSUB_URL: UNSUB_BASE }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "resend_non_configure" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Envoi de contrôle vers UNE adresse. Message strictement identique à
  // l'envoi réel, mais hors campagne : rien n'est écrit dans
  // `email_campaign_sends`, donc les statistiques ne bougent pas et personne
  // n'est marqué « déjà envoyé ».
  const destTest = typeof body?.destinataire_test === "string" ? body.destinataire_test.trim() : "";
  if (destTest) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destTest)) {
      return new Response(JSON.stringify({ error: "adresse_test_invalide", valeur: destTest }), { status: 400 });
    }
    const { data: jt } = await supabase.rpc("jetons_desabonnement_email", { p_emails: [destTest] });
    const jetonTest = (jt || [])[0]?.token;
    const lienStop = jetonTest ? `${UNSUB_BASE}/${jetonTest}` : UNSUB_BASE;
    const vars = { FIRST_NAME: body?.prenom_test || "frère/sœur", UNSUB_URL: lienStop };
    const rep = await resendSend({
      from: FROM_ADDR,
      to: [destTest],
      reply_to: REPLY_TO,
      subject: render(tpl.subject, vars),
      html: render(htmlTemplate, vars),
      ...(jetonTest
        ? { headers: { "List-Unsubscribe": `<${lienStop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
        : {}),
      tags: [{ name: "campaign", value: CAMPAIGN_SLUG }, { name: "seq", value: String(seq) }],
    });
    const ok = rep.status >= 200 && rep.status < 300;
    return new Response(JSON.stringify({
      envoi_test: true, seq, template_name: tpl.name, destinataire: destTest,
      ok, resend_status: rep.status, resend_id: ok ? rep.data?.id : null,
      erreur: ok ? null : rep.data,
    }), { status: ok ? 200 : 502 });
  }

  // Le calendrier vit en base : la fonction ne fait que demander qui est dû.
  const { data: dus, error: dusErr } = await supabase.rpc("destinataires_sequence_liberty", { p_seq: seq });
  if (dusErr) {
    return new Response(JSON.stringify({ error: "destinataires_indisponibles", detail: dusErr.message }), { status: 500 });
  }

  const maxParam = parseInt(body?.max);
  const maxRecipients = (Number.isFinite(maxParam) && maxParam > 0 && maxParam <= 300) ? maxParam : DEFAULT_MAX;
  const todo = (dus || []).slice(0, maxRecipients);

  if (body?.dry_run === true) {
    return new Response(JSON.stringify({
      dry_run: true,
      seq,
      template_name: tpl.name,
      campaign_slug: CAMPAIGN_SLUG,
      objet: render(tpl.subject, { FIRST_NAME: "Prénom" }),
      dus: (dus || []).length,
      partiraient_maintenant: todo.length,
      resteraient_apres: Math.max(0, (dus || []).length - todo.length),
      lien_video: LIEN_VSL,
      lien_agenda: LIEN_CALENDLY,
      lien_desabonnement: `${UNSUB_BASE}/<jeton propre à chaque destinataire>`,
    }), { status: 200 });
  }

  if (todo.length === 0) {
    return new Response(JSON.stringify({ ok: true, seq, message: "personne_a_envoyer", campaign_slug: CAMPAIGN_SLUG }), { status: 200 });
  }

  // Un jeton de désabonnement par adresse. Si la base ne répond pas, on envoie
  // quand même : mieux vaut un message sans lien de désabonnement qu'une
  // séquence muette. Le cas est signalé dans la réponse.
  const { data: jetons, error: jetonsErr } = await supabase.rpc("jetons_desabonnement_email", {
    p_emails: todo.map((r: any) => r.email),
  });
  if (jetonsErr) console.error("[desabonnement] jetons indisponibles:", jetonsErr.message);
  const jetonParEmail = new Map<string, string>(
    (jetons || []).map((j: any) => [String(j.email).toLowerCase().trim(), j.token]),
  );

  const logs: any[] = [];
  let okCount = 0;
  let failCount = 0;

  for (const r of todo) {
    const jeton = jetonParEmail.get(String(r.email).toLowerCase().trim());
    const lienStop = jeton ? `${UNSUB_BASE}/${jeton}` : UNSUB_BASE;
    const vars = { FIRST_NAME: r.first_name || "frère/sœur", UNSUB_URL: lienStop };
    const subject = render(tpl.subject, vars);
    const html = render(htmlTemplate, vars);
    // Gmail et Yahoo affichent leur propre bouton « Se désabonner » à partir de
    // ces deux en-têtes (RFC 8058). C'est ce bouton, ou celui marqué « Spam ».
    const entetes = jeton
      ? { "List-Unsubscribe": `<${lienStop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
      : undefined;

    let attempt = 0;
    let lastResp: any = null;
    while (attempt < 3) {
      lastResp = await resendSend({
        from: FROM_ADDR,
        to: [r.email],
        reply_to: REPLY_TO,
        subject, html,
        ...(entetes ? { headers: entetes } : {}),
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
      subject,
      status: ok ? "sent" : "failed",
      error_message: ok ? null : (lastResp.data?.message || JSON.stringify(lastResp.data)),
    });

    // Journal écrit par lots de 50 : un plantage en cours de route ne fait pas
    // perdre la trace de ce qui est déjà parti — c'est ce qui décide des
    // doublons au prochain appel.
    if (logs.length >= 50) {
      await supabase.from("email_campaign_sends").insert(logs.splice(0, logs.length));
    }
    await sleep(DELAY_MS);
  }

  if (logs.length > 0) {
    await supabase.from("email_campaign_sends").insert(logs);
  }

  return new Response(JSON.stringify({
    ok: true, seq, template_name: tpl.name, campaign_slug: CAMPAIGN_SLUG,
    envoyes: okCount, echecs: failCount,
    jetons_desabonnement: jetonsErr ? "indisponibles" : "ok",
  }), { status: 200 });
});
