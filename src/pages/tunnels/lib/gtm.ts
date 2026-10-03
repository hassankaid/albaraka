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
// META PASSE AUSSI PAR GTM sur ce périmètre (décision du 30/09/2026) : dès
// que GTM est actif sur une page, le pixel codé en dur (pixel.ts) s'y tait.
// Liberty et Al Baraka 200 gardent leur pixel dans le code.
//
// Les évènements poussés ici le sont aux mêmes endroits protégés que ceux de
// Meta (pixel.ts) : un Lead seulement pour qui vient de s'inscrire, un
// rendez-vous compté une seule fois. Les balises TikTok et Snap héritent de
// ces garde-fous sans rien avoir à refaire.
//
// Aucune donnée personnelle n'est poussée (ni e-mail, ni téléphone, même
// hachés) : à ajouter seulement sur décision explicite.
// ─────────────────────────────────────────────────────────────────────────
import { isTunnelHost } from "@/lib/hosts";

export const GTM_ID = "GTM-K3VGV2PX";

/**
 * ACTIF depuis le 30/09/2026 (version 4 du conteneur, « Bascule tracking via
 * événements du site »).
 *
 * DÉCISION (Hassan + media buyer, 30/09/2026) : sur ce tunnel, TOUT le suivi
 * passe par GTM — Meta compris. Quand GTM est actif sur une page, le pixel
 * Meta codé en dur (pixel.ts) ne s'y charge plus : sinon Meta reçoit tout en
 * double (constaté en ligne le 30/09 : quatre requêtes au lieu de deux).
 *
 * Le conteneur a été vérifié avant activation (gtm.js, public) : 12 balises,
 * toutes déclenchées par nos évènements (alb_*) ou par « Initialization »,
 * aucune par une adresse de page. Si un jour une balise Meta se déclenche de
 * nouveau sur une adresse (comme l'ancien Lead sur « /webinaire/merci »), les
 * conversions seront faussées : remettre `enPause: true` rétablit aussitôt le
 * pixel du code.
 *
 * Objet modifiable, et non constante, pour que les tests couvrent les deux
 * états.
 */
export const reglageGtm = { enPause: false };

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
  if (reglageGtm.enPause || typeof window === "undefined") return false;
  // Seulement sur les vrais domaines des tunnels (les deux, depuis le
  // 04/10/2026) : ni local, ni aperçu Vercel, pour ne jamais polluer les
  // données publicitaires pendant le développement.
  return isTunnelHost(window.location.hostname) && estPageGtm(chemin);
}

/**
 * GTM a-t-il la main sur cette page ? Si oui, le pixel Meta codé en dur doit
 * s'abstenir : c'est le conteneur qui parle à Meta.
 */
export function gtmGereLaPage(chemin?: string): boolean {
  return actif(chemin ?? (typeof window !== "undefined" ? window.location.pathname : ""));
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
