// ─────────────────────────────────────────────────────────────────────────
// Google Tag Manager — tunnel AL BARAKA classique (conférence) uniquement.
//
// Demande du media buyer le 30/09/2026, pour lancer TikTok Ads et Snap Ads :
// il pilote ses balises depuis le conteneur GTM, sans repasser par le code.
//
// PÉRIMÈTRE (validé par Hassan le 30/09/2026) : le tunnel conférence dans ses
// deux entrées (WhatsApp, VSL), la prise d'appel d'après-conférence, la page
// témoignages et les trois vidéos d'avant-conférence. PAS Liberty, PAS
// Al Baraka 200, PAS la plateforme, PAS le site vitrine : ces tunnels ont
// leurs propres audiences et leurs propres pixels.
//
// POURQUOI PAS LE SNIPPET DANS <head> : tous les tunnels partagent un seul
// fichier HTML. L'y coller chargerait GTM sur Liberty et Al Baraka 200. On
// l'injecte donc ici, quand le chemin est dans le périmètre. Pour GTM, le
// résultat est le même. Le bloc <noscript> n'est pas installé : sans
// JavaScript, l'application ne s'affiche pas du tout, il ne mesurerait rien.
//
// LE PIXEL META RESTE CODÉ EN DUR (pixel.ts), sur décision de Hassan.
// ⚠️ Tant que c'est le cas, le media buyer ne doit PAS ajouter Meta dans GTM :
// chaque conversion serait comptée deux fois.
//
// Les évènements poussés ici le sont aux mêmes endroits protégés que ceux de
// Meta (pixel.ts) : un Lead seulement pour qui vient de s'inscrire, un
// rendez-vous compté une seule fois. Les balises TikTok et Snap héritent de
// ces garde-fous sans rien avoir à refaire.
//
// Aucune donnée personnelle n'est poussée (ni e-mail, ni téléphone, même
// hachés) : à ajouter seulement sur décision explicite.
// ─────────────────────────────────────────────────────────────────────────
import { TUNNEL_HOST } from "@/lib/hosts";

export const GTM_ID = "GTM-K3VGV2PX";

/**
 * ⚠️ EN PAUSE depuis le 30/09/2026, quelques minutes après la mise en ligne.
 *
 * Le conteneur du media buyer contient déjà trois balises META, en plus de
 * TikTok (lu dans gtm.js, public) :
 *   - le pixel 1499213912013386 + PageView, sur toutes les pages ;
 *   - ViewContent, sur toute adresse contenant « /webinaire » ;
 *   - Lead, sur toute adresse contenant « /webinaire/merci » — donc à CHAQUE
 *     affichage de la page de remerciement, inscription ou non.
 * Avec notre pixel codé en dur (que Hassan a choisi de garder), Meta recevait
 * tout en double, plus un faux Lead par rechargement : constaté en ligne,
 * quatre requêtes au lieu de deux sur /webinaire.
 *
 * À repasser à `false` quand le media buyer aura retiré ses trois balises
 * Meta du conteneur (TikTok peut rester). Vérifier alors dans gtm.js qu'il
 * n'y a plus aucun « fbq ».
 */
export const GTM_EN_PAUSE = true;

/** Les noms d'évènements communiqués au media buyer. Ne pas renommer sans le prévenir. */
export const EVENEMENTS_GTM = {
  page: "alb_page_view",
  contenu: "alb_view_content",
  inscription: "alb_lead",
  whatsapp: "alb_whatsapp_join",
  rendezVous: "alb_schedule",
} as const;

type NomEvenement = (typeof EVENEMENTS_GTM)[keyof typeof EVENEMENTS_GTM];

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const PERIMETRE = /^\/(webinaire|vsl|appel-conference|temoignages|video-[123])(\/|$)/;

/** Ce chemin fait-il partie du tunnel Al Baraka classique ? */
export function estPageGtm(chemin: string): boolean {
  return PERIMETRE.test(chemin);
}

/** À quelle entrée du tunnel appartient la page — utile pour segmenter dans GTM. */
export function tunnelDe(chemin: string): string {
  const m = PERIMETRE.exec(chemin);
  if (!m) return "";
  if (m[1] === "webinaire") return "whatsapp";
  if (m[1] === "vsl") return "vsl";
  if (m[1] === "appel-conference") return "appel";
  if (m[1] === "temoignages") return "temoignages";
  return "video";
}

function actif(chemin: string): boolean {
  if (GTM_EN_PAUSE || typeof window === "undefined") return false;
  // Seulement sur le vrai domaine des tunnels : ni local, ni aperçu Vercel,
  // pour ne jamais polluer les données publicitaires pendant le développement.
  return window.location.hostname === TUNNEL_HOST && estPageGtm(chemin);
}

/** Injecte le conteneur une seule fois (équivalent du snippet officiel). */
function charger(): void {
  if (document.getElementById("alb-gtm")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  const s = document.createElement("script");
  s.id = "alb-gtm";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

/**
 * Pousse un évènement dans le dataLayer — sans effet hors du périmètre.
 * Ne lève jamais : un suivi en panne ne doit pas casser une page de vente.
 */
export function pousserGtm(evenement: NomEvenement, chemin?: string): void {
  try {
    const p = chemin ?? window.location.pathname;
    if (!actif(p)) return;
    charger();
    window.dataLayer!.push({ event: evenement, tunnel: tunnelDe(p), page_path: p });
  } catch (err) {
    console.warn("[tunnel-gtm] évènement non transmis (non bloquant):", err);
  }
}

/** À appeler à chaque changement de page : l'application ne recharge pas le navigateur. */
export function suivrePageGtm(chemin: string): void {
  pousserGtm(EVENEMENTS_GTM.page, chemin);
}
