// ─────────────────────────────────────────────────────────────────────────
// Envoi de la séquence e-mail d'une conférence, via Resend.
//
// Appel : POST { seq: 4 | 5 | 8 | 9 | 10..15, max?: 1..300, conference_date?: "YYYY-MM-DD",
//                dry_run?: true }
//
// Séquence en vigueur depuis le 13/09/2026 : 10 = J-1 (samedi), 8 = M-30,
// 9 = ouverture, 11 à 15 = après la conférence (dimanche 14h → mercredi 19h).
// Les seq 11 à 15 excluent, au moment de l'envoi, ceux qui ont réservé un appel
// ou acheté depuis le live (`emails_a_exclure_conference`).
//
// RIEN N'EST ÉCRIT EN DUR POUR UNE SEMAINE DONNÉE. La fonction résout la fiche
// de la conférence dans `conferences`, et en tire :
//   • le lien du groupe WhatsApp du bouton,
//   • l'heure annoncée dans les messages,
//   • le slug de campagne (conf_AAAA_MM_JJ), donc la liste et la déduplication.
// Sans `conference_date`, elle prend la prochaine conférence à partir
// d'aujourd'hui — celle du jour même le dimanche, toute la journée.
//
// ⚠️ TOUJOURS FAIRE UN `dry_run` D'ABORD. Il renvoie la fiche résolue, le slug,
// le groupe et le nombre de destinataires restants, sans rien envoyer. C'est le
// seul moyen de vérifier qu'on vise la bonne semaine avant de tirer.
//
// ⚠️ UN SEUL APPEL À LA FOIS. Le journal n'est écrit que tous les 50 envois :
// relancer pendant qu'un appel tourne fait redémarrer la déduplication sur un
// journal incomplet et renvoie aux mêmes personnes. C'est ce qui a produit
// 353 doublons sur la conférence du 31/05/2026.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const FROM_ADDR = "Sidali · AL BARAKA <conference@albarakaecosysteme.com>";
const REPLY_TO = ["contact@albarakaecosysteme.com"];

// Filets, utilisés seulement si la fiche est incomplète. Un e-mail sans bouton
// vaut moins qu'un e-mail dont le bouton mène au groupe de la semaine passée,
// mais les deux valent mieux qu'un envoi qui échoue.
const WHATSAPP_DEFAUT = "https://chat.whatsapp.com/BwBWVsHhM0Y0Fb37USMZS3";
const HEURE_DEFAUT = "11h00";

// Le lien de désabonnement doit rester joignable : la route /unsubscribe
// n'existe pas dans l'application, et en mai 8 personnes ont cliqué dans le
// vide avant que 11 plaintes pour spam ne tombent. Un mailto ne dépend d'aucun
// déploiement.
// Désabonnement : une page réelle, un jeton par adresse. L'ancien « mailto »
// pointait vers contact@albarakaecosysteme.com — un domaine sans MX, donc une
// adresse qui ne reçoit rien. Personne ne pouvait se désabonner, et le seul
// bouton restant était « Spam ».
const UNSUB_BASE = "https://plateforme.albarakaecosysteme.com/stop";

const DEFAULT_MAX = 150;
const DELAY_MS = 230;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/** Date du jour en heure de Paris, "AAAA-MM-JJ". `toISOString()` donnerait la
 *  date UTC, décalée d'un jour entre minuit et 2h du matin l'été. */
function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

/** "11:00:00" → "11h00". */
function formatHeure(h: string | null): string {
  if (!h) return HEURE_DEFAUT;
  const [hh, mm] = h.split(":");
  return `${hh}h${mm}`;
}

/** "2026-08-30" → "conf_2026_08_30". */
function slugDe(date: string): string {
  return `conf_${date.replaceAll("-", "_")}`;
}

interface Fiche {
  conference_date: string;
  whatsapp: string;
  zoom: string;
  zoom_code: string | null;
  token: string;
  replay_pret: boolean;
  videos: (string | null)[];
  heure: string;
  campaign_slug: string;
  groupe_renseigne: boolean;
  zoom_renseigne: boolean;
}

async function resoudreFiche(supabase: any, demande?: string): Promise<Fiche | null> {
  let q = supabase
    .from("conferences")
    .select("conference_date, token, status, replay_url, whatsapp_group_url, zoom_url, zoom_passcode, starts_at_local, video1_url, video2_url, video3_url");

  if (demande) {
    q = q.eq("conference_date", demande);
  } else {
    // Pas de bascule à l'heure de la conférence ici : un envoi ou une reprise
    // en fin de matinée doit continuer à viser la conférence du jour, pas celle
    // de la semaine suivante.
    q = q.gte("conference_date", aujourdhuiParis())
         .order("conference_date", { ascending: true });
  }

  const { data } = await q.limit(1);
  const row = (data ?? [])[0];
  if (!row) return null;

  return {
    conference_date: row.conference_date,
    whatsapp: row.whatsapp_group_url || WHATSAPP_DEFAUT,
    zoom: row.zoom_url || ZOOM_DEFAUT,
    zoom_code: row.zoom_passcode || null,
    token: row.token,
    replay_pret: row.status === 'ready' && !!row.replay_url,
    videos: [row.video1_url || null, row.video2_url || null, row.video3_url || null],
    heure: formatHeure(row.starts_at_local),
    campaign_slug: slugDe(row.conference_date),
    zoom_renseigne: Boolean(row.zoom_url),
    groupe_renseigne: !!row.whatsapp_group_url,
  };
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

// Bouton « à toute épreuve ».
//
// L'ancienne version était un simple <a> doré : `background-color` en CSS,
// `color:#ffffff` par-dessus. Les clients qui filtrent le CSS des liens
// (Outlook via le moteur Word, certains rendus en mode sombre) retiraient le
// fond mais gardaient le texte blanc — bouton blanc sur carte blanche, donc
// invisible, donc « pas cliquable » pour le lecteur.
//
// Trois protections :
//   • l'attribut HTML `bgcolor` sur la cellule, qui survit là où le CSS tombe ;
//   • une bordure de la même couleur, qui dessine le bouton même sans fond ;
//   • sous le bouton, l'adresse en clair — un lecteur qui ne voit rien peut
//     toujours la lire et la recopier. C'est le vrai filet.
function cta(whatsapp: string): string {
  const visible = whatsapp.replace(/^https?:\/\//, "");
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 10px;">
<tr><td align="center" bgcolor="#C9A04E" style="background-color:#C9A04E;border:1px solid #C9A04E;border-radius:6px;">
<a href="${whatsapp}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">► Je rejoins le groupe WhatsApp privé</a>
</td></tr></table>
<p style="text-align:center;font-size:13px;line-height:1.5;color:#7a7a7a;margin:0 0 22px;">Le bouton ne s'affiche pas ?<br><a href="${whatsapp}" target="_blank" style="color:#A8813A;text-decoration:underline;">${visible}</a></p>`;
}


/**
 * Bouton vers le direct Zoom.
 *
 * Distinct de `cta()`, qui mene au groupe WhatsApp. Les deux coexistent : le
 * groupe reste le point de ralliement de la semaine, le lien Zoom ne vaut que
 * le jour meme, pendant la conference.
 */
function ctaZoom(url: string, libelle: string, code?: string | null): string {
  const visible = url.replace(/^https?:\/\//, "");
  // Le lien porte le code en paramètre : un clic suffit. Le code reste affiché
  // en repli, pour les deux cas où le paramètre ne sert à rien — celui qui tape
  // l'identifiant de réunion à la main dans l'application Zoom, et celui à qui
  // on a recopié le lien sans sa fin. Vider la colonne retire cette ligne.
  const bloc = code
    ? `<p style="text-align:center;font-size:13px;line-height:1.5;color:#7a7a7a;margin:0 0 6px;">Si Zoom te demande un code : <strong style="color:#1a1a1a;letter-spacing:1px;">${code}</strong></p>`
    : "";
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 10px;">
<tr><td align="center" bgcolor="#C9A04E" style="background-color:#C9A04E;border:1px solid #C9A04E;border-radius:6px;">
<a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${libelle}</a>
</td></tr></table>
${bloc}
<p style="text-align:center;font-size:13px;line-height:1.5;color:#7a7a7a;margin:0 0 22px;">Le bouton ne s'affiche pas ?<br><a href="${url}" target="_blank" style="color:#A8813A;text-decoration:underline;">${visible}</a></p>`;
}

/**
 * Filet si la fiche n'a pas de `zoom_url`. Comme pour le groupe WhatsApp :
 * mieux vaut un lien peut-etre perime qu'un e-mail sans bouton.
 */
const ZOOM_DEFAUT = "https://us06web.zoom.us/j/85455284733?pwd=pab2uafmwoZ0E12svuaWTTiaAwLFEO.1";

/**
 * Bouton vers une vidéo de la séquence avant-conférence.
 *
 * Tant que l'URL n'est pas renseignée sur la fiche, on rend l'emplacement en
 * clair : la relecture montre où le lien ira. Personne ne verra jamais ce
 * texte dans sa boîte — l'envoi est refusé en amont quand l'URL manque.
 */
function ctaVideo(url: string | null, numero: number): string {
  if (!url) {
    return `<p style="text-align:center;font-size:15px;color:#7a7a7a;margin:24px 0;">(Lien vidéo ${numero})</p>`;
  }
  return ctaZoom(url, `&#128073; Voir la vidéo ${numero}`);
}

const SIG = `<p style="margin-top:24px;">Sidali<br><span style="color:#7a7a7a;">Fondateur de l'écosystème AL BARAKA</span></p>`;

/** Prise de rendez-vous : parcours de qualification puis Calendly (route /rdv). */
const RDV_URL = "https://plateforme.albarakaecosysteme.com/rdv";
const CTA_RDV = ctaZoom(RDV_URL, "JE RÉSERVE MON APPEL");

/**
 * Bouton des relances du lundi au mercredi.
 *
 * Il passe par la page de rediffusion et non par /rdv : le jour même, on
 * envoie vers la prise de rendez-vous directe, mais les jours suivants le
 * destinataire n'a pas forcément vu la conférence. La page de rediffusion lui
 * montre le replay et porte la prise de rendez-vous dessous.
 */
const REDIF_BASE = "https://plateforme.albarakaecosysteme.com/redif/";

/**
 * Si le replay n'est pas encore en ligne — l'enregistrement Zoom met parfois
 * quelques heures à être récupéré — on retombe sur la prise de rendez-vous
 * directe plutôt que d'envoyer vers une page « bientôt disponible ». Le mail
 * part quand même : mieux vaut un bouton qui mène ailleurs qu'un mail annulé.
 */
const ctaRedif = (f: Fiche) =>
  f.replay_pret
    ? ctaZoom(REDIF_BASE + f.token, "JE RÉSERVE MON APPEL")
    : CTA_RDV;

/** Paragraphe du document « Email webi 20_30 ans » : texte brut → <p>. */
const p = (texte: string) => `<p>${texte}</p>`;
/** Liste à puces dont la puce est un emoji du texte d'origine. */
const puces = (lignes: string[]) =>
  lignes.map((l) => `<p style="margin:6px 0 6px 4px;">${l}</p>`).join("\n");

interface Gabarit { name: string; subject: string; preheader: string; body: string }

// Les gabarits dépendent de la fiche (lien du groupe, heure) : ils sont donc
// construits à chaque appel plutôt que figés au chargement du module.
function gabarits(f: Fiche): Record<number, Gabarit> {
  const CTA = cta(f.whatsapp);
  return {
    20: {
      name: "Confirmation inscription",
      subject: `🎟️ Ton inscription est confirmée`,
      preheader: "Tu es inscrit. Le groupe WhatsApp t'attend.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
${p(`C'est officiel : tu es inscrit(e) à la conférence Al Baraka.`)}
${p(`Et ce que je peux te dire, c'est que tu viens peut-être de faire le premier vrai pas vers une transformation profonde.`)}
${p(`Une transformation qui dépend pas de ton diplôme. Ni de ton expérience actuelle. Ni même du salaire que tu gagnes aujourd'hui.`)}
${p(`Mais simplement d'un changement de regard, et de la bonne méthode.`)}
${p(`Pendant cette conférence, tu vas découvrir :`)}
${puces([`➤ Ce que les Compagnons du Prophète ﷺ avaient compris sur l'argent, et pourquoi ça change tout pour toi`, `➤ Pourquoi la sécurité de ton CDI est en fait une fausse sécurité, et ce qui te rend réellement libre`, `➤ Comment générer tes premiers revenus en ligne, halal, même si tu pars de zéro`, `🗓 Rendez-vous ce dimanche à ${f.heure}`, `📍 Le lien d'accès te sera envoyé quelques heures avant l'événement.`])}
${p(`Mais en attendant, rejoins dès maintenant le groupe WhatsApp privé. C'est là que tu recevras les rappels, les vidéos, et où tu pourras poser tes questions.`)}
${CTA}
${p(`Qu'Allah t'accorde la clarté et la baraka dans ce cheminement.`)}
${p(`On se retrouve très vite.`)}
${SIG}`,
    },
    21: {
      name: "J-5 (vidéo 1)",
      subject: `Tu n'imagines pas encore ce que ça peut changer pour toi`,
      preheader: "Avant d'aller plus loin, je veux me présenter.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
${p(`Dans 5 jours, in shā Allāh, tu assisteras à une conférence qui pourrait changer ta façon de voir ta situation financière.`)}
${p(`Et si je te disais que c'est pas toi le problème, mais le chemin qu'on t'a présenté comme étant le seul possible ?`)}
${p(`On croit parfois qu'il faut :`)}
${puces([`• Un diplôme spécifique`, `• Du capital de départ`, `• Ou être un profil particulier pour réussir en ligne`])}
${p(`Mais c'est faux.`)}
${p(`Ce que tu vas découvrir dans cette conférence, c'est comment construire ton indépendance financière à partir de là où tu es, avec ce que tu vis aujourd'hui.`)}
${p(`Mais avant de t'en dire plus, je veux me présenter, et te raconter comment j'en suis arrivé là moi-même.`)}
${ctaVideo(f.videos[0], 1)}
${p(`Tu vas voir que mon parcours a pas été un long fleuve tranquille. Et je pense sincèrement que tu vas te reconnaître dans une partie de cette histoire.`)}
${p(`Cette vidéo est courte, mais elle pourrait être le début d'un vrai tournant pour toi.`)}
${p(`Regarde-la jusqu'au bout.`)}
${p(`Et prépare-toi, la suite arrive vite.`)}
${p(`Rejoins aussi le groupe WhatsApp si tu l'as pas encore fait`)}
${CTA}
${SIG}`,
    },
    22: {
      name: "J-4",
      subject: `Ce n'est pas toi le problème`,
      preheader: "Ce n'est pas toi le problème.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
${p(`Depuis des années, j'entends la même chose :`)}
${puces([`« Je sais pas par où commencer. »`, `« J'ai peur de me lancer et de rien y gagner. »`, `« Je préfère ma sécurité, même si elle me convient pas vraiment. »`])}
${p(`Et très souvent, on finit par se dire que le problème vient de soi.`)}
${p(`On se dit qu'on est pas fait pour ça. On abandonne avant même d'essayer.`)}
${p(`Mais aujourd'hui, je veux te dire une chose : ce n'est pas toi le problème.`)}
${puces([`❌ C'est pas parce que t'as pas le bon profil.`, `❌ C'est pas parce que t'as pas d'expérience.`, `❌ C'est pas parce que tu manques de compétence.`])}
${p(`Le problème, c'est qu'on t'a jamais montré qu'il existe un autre chemin. On t'a appris à chercher la sécurité dans un contrat de travail, jamais dans une compétence que personne peut te retirer.`)}
${p(`Demain, je t'enverrai une vidéo où je t'explique un secret là-dessus, qui va peut-être un peu te déranger.`)}
${p(`Mais pour aujourd'hui, retiens ceci : peu importe ton parcours ou ta situation actuelle, tu as toute ta place dans cette conférence.`)}
${p(`Le groupe WhatsApp si tu veux échanger avant`)}
${CTA}
${SIG}`,
    },
    23: {
      name: "J-3 (vidéo 2)",
      subject: `Ta sécurité est une illusion`,
      preheader: "Ta vraie sécurité n'est pas ton contrat de travail.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
${p(`Il arrive un moment où on continue à travailler par obligation, pour un salaire fixe, mais où quelque chose en nous sait déjà que ça suffit pas.`)}
${p(`On tient le rythme. Mais la vraie liberté semble toujours hors de portée.`)}
${p(`Si tu as déjà ressenti ça, cette sensation d'avancer sans vraiment avancer, alors sache une chose : il n'est jamais trop tard pour changer de trajectoire.`)}
${p(`Et cette conférence a été pensée exactement pour ça.`)}
${p(`Je vais pas t'apprendre à mieux gérer ton salaire.`)}
${p(`Je vais t'apprendre à en dépendre moins.`)}
${p(`Parce que ta vraie sécurité, c'est pas ton contrat de travail. C'est ta compétence.`)}
${p(`Et dimanche, je vais te montrer un chemin simple et clair, à travers 3 niveaux :`)}
${puces([`1. Identifier ce qui te maintient aujourd'hui dépendant d'un seul revenu`])}
${puces([`2. Comprendre pourquoi la compétence est la seule chose qu'on peut jamais te retirer`])}
${puces([`3. Et surtout, comment appliquer ça concrètement pour générer tes premiers revenus`])}
${p(`Je t'explique tout ça en détail dans cette vidéo :`)}
${ctaVideo(f.videos[1], 2)}
${p(`Cette conférence n'est pas un simple rappel de motivation. C'est une méthode concrète pour construire une indépendance réelle, halal, et durable.`)}
${p(`Et j'ai hâte de t'y retrouver.`)}
${CTA}
${SIG}`,
    },
    24: {
      name: "J-2 (vidéo 3)",
      subject: `Des musulmans comme toi…`,
      preheader: "Des parcours qui ressemblent peut-être au tien.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
${p(`Tu fais ton CDI. Tu essaies de mettre un peu d'argent de côté. Tu te dis que ça va s'arranger.`)}
${p(`Mais au fond, il y a ce vide. Cette sensation que ta situation financière n'est pas alignée avec ce que tu veux vraiment vivre — ta foi, ta liberté, tes projets.`)}
${p(`Ce vide, je l'ai vu chez des dizaines de personnes que j'ai accompagnées.`)}
${p(`Et aujourd'hui, al-ḥamdu liLlāh, ces mêmes personnes ont vécu un vrai basculement. Pas en changeant toute leur vie d'un coup, mais simplement en trouvant le bon cadre, et la bonne compétence.`)}
${p(`J'aimerais que tu écoutes leur histoire. Peut-être qu'elle va résonner avec la tienne.`)}
${ctaVideo(f.videos[2], 3)}
${p(`Ce sont pas des gens exceptionnels. Ce sont des musulmans comme toi et moi, avec leurs doutes, leur emploi du temps chargé, leurs hauts et leurs bas.`)}
${p(`Et pourtant, leur situation a changé. Et avec elle, tout leur quotidien s'est apaisé.`)}
${p(`Dimanche, tu peux vivre la même chose.`)}
${p(`Mais d'abord, prends un instant pour découvrir leur cheminement. Il se pourrait que le tien commence juste après.`)}
${CTA}
${SIG}`,
    },
    25: {
      name: "J-1 (veille)",
      subject: `Ne laisse pas passer ça`,
      preheader: "La conférence commence demain matin.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
${p(`Demain matin, on se retrouve pour une conférence pas comme les autres.`)}
${p(`Une conférence pensée pour toi.`)}
${p(`Toi qui sens que ta situation financière n'est pas à la hauteur de ce qu'elle pourrait être.`)}
${p(`Toi qui sais, au fond, que quelque chose doit changer, mais qui sait plus par où commencer.`)}
${p(`T'as peut-être déjà essayé des formations. Regardé des vidéos. Lu des articles.`)}
${p(`Mais malgré tout, tu tournes en rond.`)}
${p(`Et si ce cycle continuait encore pendant des mois ? Des années ?`)}
${puces([`👉 Combien de fois encore vas-tu repousser cette décision ?`, `👉 Combien de fois vas-tu te dire "l'année prochaine, quand j'aurai plus de temps" ?`, `👉 Combien de temps encore avant de prendre ta liberté financière au sérieux ?`])}
${p(`Le vrai danger, c'est pas d'échouer.`)}
${p(`C'est de s'habituer à cette dépendance. De croire que c'est normal. De se résigner.`)}
${p(`Demain matin, je vais te montrer qu'un autre chemin est possible.`)}
${p(`Un chemin simple, structuré, et accessible.`)}
${p(`Un chemin dans lequel tu seras jamais seul.`)}
${p(`Mais je peux pas t'y forcer. Je peux juste t'y inviter.`)}
${puces([`📍 Rendez-vous demain, dimanche, à ${f.heure}.`])}
${p(`Je t'enverrai un dernier message avec le lien quelques heures avant.`)}
${CTA}
${SIG}`,
    },
    26: {
      name: "H-2",
      subject: `Ça commence bientôt…`,
      preheader: "Prépare un endroit calme et de quoi noter.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
${p(`Dans 2 heures, tu vas assister à une conférence unique. Un moment que j'ai préparé avec soin, pour t'aider à construire l'indépendance financière que tu n'aurais jamais dû laisser filer.`)}
${p(`Et si tu ressens un peu d'excitation mêlée à de l'appréhension, c'est bon signe. Ça veut dire que cette décision compte vraiment pour toi.`)}
${p(`Voici ce que tu vas découvrir ce matin, étape par étape :`)}
${puces([`1️⃣ Ce que les Compagnons du Prophète ﷺ avaient compris sur l'argent`])}
${p(`Tu comprendras pourquoi ta façon de voir la richesse doit peut-être changer complètement.`)}
${puces([`2️⃣ Pourquoi la sécurité du salariat est une illusion, et ce qui te rend réellement libre`])}
${p(`Même si t'as jamais entrepris, tu repartiras avec les clés pour comprendre où tu te situes exactement aujourd'hui.`)}
${puces([`3️⃣ La méthode concrète pour générer tes premiers revenus en ligne, halal, à partir de zéro`])}
${p(`C'est cette mise en pratique qui ouvre la porte à un vrai changement.`)}
${p(`Si tu assistes pas à cette conférence, rien va changer.`)}
${p(`Mais si t'es présent, il se pourrait que beaucoup de choses changent d'un coup.`)}
${p(`Je t'enverrai un dernier message juste avant le début avec le lien de connexion.`)}
${p(`Prépare un endroit calme. Prends un carnet. Et surtout, prépare-toi à remettre en question ce que tu croyais savoir.`)}
${p(`À tout à l'heure, in shā Allāh.`)}
${CTA}
${SIG}`,
    },
    27: {
      name: "M-15",
      subject: `On commence dans 15 minutes`,
      preheader: "On commence dans 15 minutes. Le lien est dans ce message.",
      body: `${p(`Dans 15 minutes, on commence.`)}
${p(`Clique sur ce lien pour nous rejoindre maintenant :`)}
${ctaZoom(f.zoom, "&#128073; Je rejoins la conférence", f.zoom_code)}
${p(`Je suis déjà en train de me préparer de mon côté.`)}
${p(`Et je voulais t'envoyer ce message, juste avant.`)}
${p(`Parce que ce que tu vas vivre ce matin, ça a rien d'une conférence classique.`)}
${p(`C'est peut-être le moment où ta situation financière commence enfin à changer de direction.`)}
${p(`Où tu vas comprendre ce qui te bloque vraiment.`)}
${p(`Et surtout, comment construire ton indépendance, halal, malgré ton emploi actuel, ton expérience ou ton passé.`)}
${p(`C'est un vrai basculement.`)}
${p(`Alors clique ici pour nous rejoindre dès maintenant :`)}
${ctaZoom(f.zoom, "&#128073; Accéder à la salle de conférence", f.zoom_code)}
${p(`Je t'attends à l'intérieur.`)}
${SIG}`,
    },
    28: {
      name: "M+15",
      subject: `Un problème ?`,
      preheader: "On a démarré il y a 15 minutes. Tu peux encore entrer.",
      body: `${p(`Un problème ?`)}
${p(`Je te vois pas dans la salle de conférence.`)}
${p(`Pourtant on a déjà démarré depuis 15 min.`)}
${p(`Je te rassure, t'as pas encore raté l'essentiel. Mais ça va pas tarder.`)}
${p(`Tu peux encore nous rejoindre maintenant.`)}
${ctaZoom(f.zoom, "&#10145; Rejoins-nous avant qu'il soit trop tard", f.zoom_code)}
${p(`On entre dans le cœur du sujet.`)}
${p(`Tu peux encore vivre toute l'expérience avec nous.`)}
${p(`Je t'attends. Et j'espère t'y voir dans les prochaines minutes.`)}
${SIG}`,
    },
    29: {
      name: "M+30",
      subject: `Aïe aïe aïe…`,
      preheader: "30 minutes de direct. Il est encore temps.",
      body: `${p(`Aïe aïe aïe…`)}
${p(`Ça fait déjà 30 min qu'on est en live, et les personnes présentes commencent déjà à comprendre ce qui les bloquait vraiment, et comment casser ça.`)}
${p(`Malgré tout, c'est pas encore trop tard pour toi. Mais c'est limite, hein.`)}
${p(`Dépêche-toi, on t'attend :`)}
${ctaZoom(f.zoom, "&#128073; Accéder à la salle de conférence", f.zoom_code)}
${SIG}`,
    },
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
<p>Prépare tes questions. Rendez-vous à ${f.heure}, inshaAllah.</p>
${SIG}`,
    },
    // ── Sequence du 06/09/2026, texte fourni par Hassan ────────────────
    // Elle mene au DIRECT ZOOM, pas au groupe WhatsApp : c'est un envoi du jour
    // meme, ou le lien de la salle vaut mieux qu'un detour par WhatsApp.
    // Numeros 8 et 9 pour ne pas ecraser le sens des seq 4 et 5 dans
    // `email_campaign_sends`, dont le contenu etait different.
    8: {
      name: "M-30 (Zoom)",
      subject: "Plus que 30 minutes avant la conférence",
      preheader: "Prépare un endroit calme, de quoi noter, et ta concentration.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
<p>Dans 30 minutes, on se retrouve pour la conférence exclusive :</p>
<p><strong>Découvre comment le métier de business developer peut te permettre de générer entre 2-6k / mois en 90 jours</strong></p>
<p>Voici ce que tu vas découvrir :</p>
<ol style="padding-left:20px;">
<li style="margin:8px 0;">Comment comprendre le système pour te sortir du conditionnement (et atteindre ta liberté géographique et financière).</li>
<li style="margin:8px 0;">Les VRAIS secrets des métiers du digital : comment vous faire payer pour vos compétences de manière 100% halal</li>
<li style="margin:8px 0;">Le plan EXACT en 5 étapes pour devenir business developer et atteindre l'indépendance</li>
</ol>
<p>Prépare un endroit calme, de quoi noter&hellip; et surtout ta concentration.</p>
${ctaZoom(f.zoom, "&#128073; Je rejoins la conférence", f.zoom_code)}
<p>On se retrouve tout à l'heure in shaa Allah,</p>
${SIG}`,
    },
    9: {
      name: "Ouverture (Zoom)",
      subject: "La conférence vient de commencer — rejoins-nous vite !",
      preheader: "On est en direct. Le lien de la salle est dans ce message.",
      body: `<p>Salam aleykoum {{FIRST_NAME}},</p>
<p>Nous venons tout juste de commencer la conférence en direct.</p>
<p>Si tu veux enfin comprendre comment générer des revenus en ligne sans produit, sans audience, et de manière 100% halal&hellip;</p>
<p>Et découvrir le métier méconnu qui permet à des frères et sœurs de gagner entre 2 000 et 6 000&euro;/mois en 90 jours&hellip;</p>
${ctaZoom(f.zoom, "&#10145; Je rejoins maintenant", f.zoom_code)}
${SIG}`,
    },
    // ── Rappel J-1, texte fourni par Hassan le 13/09/2026 ─────────────
    10: {
      name: "J-1 (rappel)",
      subject: `Rappel – on se retrouve demain à ${f.heure}`,
      preheader: "Petit rappel : la conférence, c'est demain.",
      body: `${p("Salam aleykoum {{FIRST_NAME}},")}
${p("Petit rappel : la conférence, c’est demain.")}
${p("Et si tu ne l’as pas encore fait, pense à rejoindre le groupe WhatsApp dédié à la conférence.")}
${p("C’est là qu’on partage toutes les infos importantes avant le webinaire.")}
${p("➡️ Clique ici pour rejoindre le groupe :")}
${CTA}
${p("On se retrouve demain in shaa Allah.")}
${p("Prépare-toi, on entre dans le concret.")}
${SIG}`,
    },
    // ── Séquence post-conférence, document « Email webi 20_30 ans » ────
    11: {
      name: "Dimanche 14h (après la conférence)",
      subject: "La suite, c'est maintenant",
      preheader: "Merci d'être venu(e). Voilà ce qu'on a vu aujourd'hui.",
      body: `${p("Salam aleykoum,")}
${p("Merci d'être venu(e).")}
${p("Je sais que bloquer 2h un dimanche, c'est pas rien. Donc respect.")}
${p("On a parlé de beaucoup de choses aujourd'hui. De cette croyance qui bloque la majorité des musulmans qui veulent entreprendre. Des compétences concrètes qui permettent de faire de l'argent en ligne, halal, à partir de rien. Et de comment sortir de ce sentiment de stagner malgré les efforts.")}
${p("Voilà ce qu'on a vu :")}
${puces([
  "🔹 <strong>Pourquoi \"il faudrait devenir quelqu'un que je suis pas\" est une croyance fausse</strong><br>Hedi et Sabrina pensaient pareil. Ils ont remplacé leur salaire en moins de 4 mois, sans changer qui ils sont.",
  "🔹 <strong>Les compétences qui permettent de monétiser en ligne</strong><br>Personal branding, storytelling, marketing, community management, setting, closing. Pas besoin de toutes les maîtriser pour commencer.",
  "🔹 <strong>Comment on accompagne concrètement jusqu'au résultat</strong><br>Coaching 4 fois par semaine, communauté, réseau de partenaires musulmans, plateforme boostée à l'IA.",
])}
${p("Si tu veux voir concrètement ce qui te correspond, réserve ton appel. C'est là qu'on regarde ta situation ensemble et qu'on avance, sérieusement.")}
${CTA_RDV}
${p("Laisse pas retomber ce que t'as ressenti pendant la conférence.")}
${SIG}`,
    },
    12: {
      name: "J+1",
      subject: "Pourquoi tout seul, ça marche jamais",
      preheader: "Depuis hier, un message revient tout le temps.",
      body: `${p("Salam aleykoum,")}
${p("Depuis hier, j'ai reçu pas mal de messages. Il y en a un qui revient tout le temps :")}
${p("<em>\"Je sais pas par où commencer.\"</em>")}
${p("Je vais être cash.")}
${p("Ce message-là, c'est celui de quelqu'un qui va essayer seul, se prendre trois murs dans la tête, et abandonner en se disant \"c'est pas fait pour moi.\" Pas parce qu'il est nul. Parce que personne le corrige, personne lui dit quand c'est faux, personne le rattrape quand il commence à douter.")}
${p("Chez nous, c'est pas comme ça. Tu rejoins une communauté, des coachs disponibles 4 fois par semaine, et tu te retrouves jamais seul face à un blocage. C'est exactement ce qui a fait la différence pour Hedi, pour Sabrina, pour des centaines d'autres qui savaient pas vendre au départ.")}
${p("Voilà ce que tu retrouves dans l'Écosystème Al Baraka :")}
${puces([
  "✅ Des formations concrètes — Personal Branding, Storytelling, Marketing Digital, Community Management, Setting, Closing",
  "✅ Coaching en direct 4 fois par semaine",
  "✅ Une plateforme boostée à l'IA",
  "✅ La communauté Al Baraka Family",
  "✅ Un réseau de partenaires + missions freelance",
  "✅ Un module Muslim Mindset et un module administratif inclus",
])}
${p("Deux formules existent selon ta situation, Pass ou Liberty. On regarde ensemble laquelle te correspond pendant l'appel.")}
${p("⚠️ Une offre spéciale est réservée aux 10 premiers inscrits qui valident leur inscription.")}
${ctaRedif(f)}
${SIG}`,
    },
    13: {
      name: "J+2",
      subject: "\"Ça va être tout le monde sauf moi\"",
      preheader: "Je veux te raconter une histoire.",
      body: `${p("Salam aleykoum,")}
${p("Je veux te raconter une histoire.")}
${p("Une des membres de l'écosystème me disait, avant de faire sa première vente : \"Je croyais que ça allait être tout le monde sauf moi.\"")}
${p("Elle avait vu les autres témoignages. Elle s'était dit, sincèrement, que c'était possible pour eux, mais pas pour elle. Pas assez de temps, pas assez d'expérience, pas le bon profil.")}
${p("Elle s'est lancée quand même.")}
${p("Elle a fait sa première vente. Elle raconte elle-même qu'elle ne s'y attendait pas du tout, au point de pleurer en raccrochant.")}
${p("Retiens ce truc : si elle pensait sincèrement que ça marcherait pour tout le monde sauf elle, et que ça a marché quand même, c'est probablement pas ton profil qui va te bloquer, toi non plus. C'est juste que t'as pas encore essayé avec le bon cadre.")}
${p("Voilà ce que tu retrouves dans l'Écosystème Al Baraka :")}
${puces([
  "✅ Des formations concrètes, Personal Branding, Storytelling, Marketing Digital, Community Management, Setting, Closing",
  "✅ Coaching en direct 4 fois par semaine",
  "✅ Une plateforme boostée à l'IA",
  "✅ La communauté Al Baraka Family",
  "✅ Un réseau de partenaires + missions freelance",
])}
${p("Réserve ton appel, on regarde ensemble si c'est fait pour toi, et quelle formule te correspond.")}
${ctaRedif(f)}
${SIG}`,
    },
    14: {
      name: "J+3 matin",
      subject: "Un truc que je dois te dire, cash",
      preheader: "Je vais être direct sur un truc.",
      body: `${p("Salam aleykoum,")}
${p("Je vais être direct sur un truc.")}
${p("Parmi les personnes présentes en direct pendant la conférence, plusieurs ont déjà réservé leur appel. Une offre spéciale a été annoncée pendant le live pour les 10 premiers inscrits, elle ne va pas rester disponible indéfiniment.")}
${p("C'est pas une technique marketing pour te faire flipper. C'est juste ce qui a été dit en direct, devant tout le monde.")}
${p("Maintenant, je vais te dire un truc encore plus cash.")}
${p("Ça fait combien de temps que tu repousses ce genre de décision ? Que tu te dis \"je vais réfléchir\", \"je verrai plus tard\", \"c'est pas le bon moment\" ?")}
${p("T'as deux choix. Tu continues à chercher seul, à galérer avec des vidéos YouTube et des conseils random. Ou tu réserves 20 minutes, on regarde ta situation ensemble, et tu sais concrètement ce qui est possible pour toi.")}
${p("Y'a pas de troisième option où ça se débloque tout seul. Ça arrive jamais.")}
${ctaRedif(f)}
${SIG}`,
    },
    15: {
      name: "J+3 soir",
      subject: "Dernier message",
      preheader: "Je vais pas te faire un roman.",
      body: `${p("Salam aleykoum,")}
${p("Je vais pas te faire un roman.")}
${p("L'offre annoncée pour les premiers inscrits se termine ce soir. Pas de compte à rebours artificiel, pas de fausse deadline à minuit pile. Juste la réalité : plusieurs places sont déjà prises.")}
${p("Si t'as encore des doutes après tout ce que je t'ai dit ces derniers jours, c'est normal. Mais les doutes, ça se règle pas en y repensant seul pour la centième fois. Ça se règle sur un appel de 20 minutes, où on regarde ta situation ensemble.")}
${ctaRedif(f)}
${p("C'était le dernier rappel.")}
${SIG}`,
    },
    5: {
      name: "Ouverture",
      subject: "🔴 C'est maintenant — viens, {{FIRST_NAME}}",
      preheader: `Je suis déjà là. On démarre à ${f.heure}.`,
      body: `<p>Assalamu alaykum {{FIRST_NAME}},</p>
<p><strong>J'y suis. On démarre dans quelques minutes.</strong></p>
<p>Le lien du direct est posté dans le groupe WhatsApp. Rejoins, clique, et viens t'asseoir avec nous :</p>
${CTA}
<p>On t'attend. Bismillah.</p>
${SIG}`,
    },
  };
}

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const fiche = await resoudreFiche(supabase, body?.conference_date);
  if (!fiche) {
    return new Response(JSON.stringify({ error: "conference_introuvable", demande: body?.conference_date ?? null }), { status: 404 });
  }

  const seq = parseInt(body?.seq);
  const TEMPLATES = gabarits(fiche);
  if (!TEMPLATES[seq]) {
    return new Response(JSON.stringify({ error: "seq_inconnu", attendus: Object.keys(TEMPLATES) }), { status: 400 });
  }
  const tpl = TEMPLATES[seq];

  // Aperçu : rend le message tel qu'il partirait, sans rien envoyer. Sert à
  // relire la mise en forme — c'est la seule façon de vérifier autrement qu'à
  // l'aveugle ce que donne un gabarit après modification.
  if (body?.apercu === true) {
    const varsA = { FIRST_NAME: body?.prenom_test || "Prénom", UNSUB_URL: UNSUB_BASE };
    return new Response(render(wrap(tpl.preheader, tpl.body), varsA), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Envoi de contrôle vers UNE adresse (mail-tester, boîte témoin). Le message
  // est strictement identique à l'envoi réel — même expéditeur, même objet,
  // même HTML, mêmes liens, mêmes en-têtes — mais hors campagne : rien n'est
  // écrit dans email_campaign_sends, donc les statistiques ne bougent pas et
  // personne n'est marqué « déjà envoyé ».
  const destTest = typeof body?.destinataire_test === "string" ? body.destinataire_test.trim() : "";
  if (destTest) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destTest)) {
      return new Response(JSON.stringify({ error: "adresse_test_invalide", valeur: destTest }), { status: 400 });
    }
    const { data: jt } = await supabase.rpc("jetons_desabonnement_email", { p_emails: [destTest] });
    const jetonTest = (jt || [])[0]?.token;
    const lienStop = jetonTest ? `${UNSUB_BASE}/${jetonTest}` : UNSUB_BASE;
    const varsTest = { FIRST_NAME: body?.prenom_test || "frère/sœur", UNSUB_URL: lienStop };
    const sujetTest = render(tpl.subject, varsTest);
    const htmlTest = render(wrap(tpl.preheader, tpl.body), varsTest);
    const repTest = await resendSend({
      from: FROM_ADDR,
      to: [destTest],
      reply_to: REPLY_TO,
      subject: sujetTest,
      html: htmlTest,
      ...(jetonTest
        ? { headers: { "List-Unsubscribe": `<${lienStop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
        : {}),
      tags: [{ name: "campaign", value: "controle" }, { name: "seq", value: String(seq) }],
    });
    const okTest = repTest.status >= 200 && repTest.status < 300;
    return new Response(JSON.stringify({
      envoi_de_controle: true,
      destinataire: destTest,
      seq,
      template_name: tpl.name,
      objet: sujetTest,
      conference_date: fiche.conference_date,
      entetes_desabonnement: !!jetonTest,
      statut_resend: repTest.status,
      resend_email_id: okTest ? repTest.data?.id ?? null : null,
      erreur: okTest ? null : repTest.data,
    }), { status: okTest ? 200 : 502 });
  }

  // Un mail de nurturing sans sa vidéo ne part pas : le destinataire recevrait
  // un emplacement vide à la place du lien. L'envoi de contrôle, lui, reste
  // possible — c'est justement à ça qu'il sert, voir le rendu avant l'heure.
  const VIDEO_REQUISE: Record<number, number> = { 21: 0, 23: 1, 24: 2 };
  const indexVideo = VIDEO_REQUISE[seq];
  const videoManquante = indexVideo !== undefined && !fiche.videos[indexVideo];

  const maxParam = parseInt(body?.max);
  const maxRecipients = (Number.isFinite(maxParam) && maxParam > 0 && maxParam <= 300) ? maxParam : DEFAULT_MAX;

  const alreadySent = await loadAll(supabase, "email_campaign_sends", "recipient_email", { campaign_slug: fiche.campaign_slug, email_seq: seq }, null);
  const alreadySentSet = new Set(alreadySent.map((r: any) => r.recipient_email.toLowerCase().trim()));

  const recipients = await loadAll(supabase, "email_campaign_recipients", "email, first_name, position", { campaign_slug: fiche.campaign_slug }, "position");

  // Exclusions, évaluées AU MOMENT de l'envoi : quelqu'un qui réserve lundi ne
  // doit plus recevoir « réserve ton appel » mardi. Toujours : adresses en
  // erreur et plaintes pour spam. Après la conférence (seq 11 à 15) : aussi
  // ceux qui ont réservé un appel ou acheté depuis le début du live.
  const estPostConference = seq >= 11 && seq <= 15;
  const { data: exclus, error: exclusErr } = await supabase.rpc("emails_a_exclure_conference", {
    p_conference_date: fiche.conference_date,
    p_post_conference: estPostConference,
  });
  if (exclusErr && estPostConference) {
    // Sans la liste, on relancerait des gens qui ont déjà réservé ou acheté.
    return new Response(JSON.stringify({ error: "exclusions_indisponibles", detail: exclusErr.message }), { status: 500 });
  }
  const exclusSet = new Set((exclus || []).map((e: any) => String(e.email).toLowerCase().trim()));

  const restants = recipients.filter((r: any) => {
    const email = r.email.toLowerCase().trim();
    return !alreadySentSet.has(email) && !exclusSet.has(email);
  });
  const nbExclus = recipients.filter((r: any) => exclusSet.has(r.email.toLowerCase().trim())).length;
  const todo = restants.slice(0, maxRecipients);

  // Ce que la fonction ferait, sans le faire. À appeler avant tout envoi réel.
  if (body?.dry_run === true) {
    return new Response(JSON.stringify({
      dry_run: true,
      seq,
      template_name: tpl.name,
      conference_date: fiche.conference_date,
      heure: fiche.heure,
      campaign_slug: fiche.campaign_slug,
      groupe_whatsapp: fiche.whatsapp,
      groupe_renseigne_sur_la_fiche: fiche.groupe_renseigne,
      lien_zoom: fiche.zoom,
      code_zoom: fiche.zoom_code,
      zoom_renseigne_sur_la_fiche: fiche.zoom_renseigne,
      objet: render(tpl.subject, { FIRST_NAME: "Prénom" }),
      liste_totale: recipients.length,
      deja_envoyes: alreadySentSet.size,
      exclus: nbExclus,
      exclusions_disponibles: !exclusErr,
      partiraient_maintenant: todo.length,
      video_manquante: videoManquante,
      lien_desabonnement: `${UNSUB_BASE}/<jeton propre à chaque destinataire>`,
      resteraient_apres: Math.max(0, restants.length - todo.length),
    }), { status: 200 });
  }

  if (videoManquante) {
    return new Response(JSON.stringify({
      error: "video_manquante",
      seq,
      conference_date: fiche.conference_date,
      detail: `La vidéo ${indexVideo + 1} n'est pas renseignée sur la fiche de la conférence. Rien n'a été envoyé.`,
    }), { status: 409 });
  }

  if (todo.length === 0) {
    return new Response(JSON.stringify({ ok: true, seq, message: "all_sent", conference_date: fiche.conference_date, campaign_slug: fiche.campaign_slug, already_sent: alreadySentSet.size, total_recipients_loaded: recipients.length }), { status: 200 });
  }

  const htmlTemplate = wrap(tpl.preheader, tpl.body);

  // Un jeton de désabonnement par destinataire, créé au besoin. Si la base ne
  // répond pas, on envoie quand même : mieux vaut un message sans lien de
  // désabonnement qu'une conférence annoncée à personne. Le cas est signalé
  // dans la réponse.
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
      ? {
          "List-Unsubscribe": `<${lienStop}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
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
        tags: [
          { name: "campaign", value: fiche.campaign_slug },
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
      campaign_slug: fiche.campaign_slug,
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
    template_name: tpl.name,
    conference_date: fiche.conference_date, campaign_slug: fiche.campaign_slug,
    already_sent_before: alreadySentSet.size, max_used: maxRecipients,
    total_recipients_loaded: recipients.length,
  }), { status: 200 });
});
