// ─────────────────────────────────────────────────────────────────────────
// Segmentation par sous-domaine.
//
// `event.albarakaecosysteme.com` est le domaine PUBLIC des tunnels : il reçoit
// du trafic froid (pubs Meta/TikTok) et y fait tourner le Pixel Meta. Il ne
// doit donc JAMAIS servir l'application — ni le CRM, ni l'écran de connexion.
//
// Inversement, les domaines de l'application ne servent pas les tunnels, sinon
// le Pixel Meta se déclencherait sur la plateforme.
//
// Le verrou principal est côté serveur (`vercel.json`, avant même que l'app ne
// se charge) ; ce module sert la 2e barrière, côté application.
//
// En local et sur les preview Vercel, aucun des deux ne matche → tout reste
// accessible, pour ne pas gêner le développement.
// ─────────────────────────────────────────────────────────────────────────

/** Domaine public des tunnels (funnels de pub). Celui des liens partagés, e-mails et SMS. */
export const TUNNEL_HOST = "event.albarakaecosysteme.com";

/**
 * Tous les domaines qui servent les tunnels. Le second sert EXACTEMENT les
 * mêmes pages : il porte les pubs Meta, bloquées sur le premier (demande de
 * Hassan le 04/10/2026). Les autres canaux restent sur `TUNNEL_HOST`.
 *
 * ⚠️ Un domaine ajouté ici doit l'être aussi dans `vercel.json` (règles
 * « tunnels »), dans `isProdHost` (pixel.ts) et dans les domaines autorisés
 * de chaque vidéo Vimeo des tunnels.
 */
export const TUNNEL_HOSTS = [TUNNEL_HOST, "event.albarakabyethicarena.com"] as const;

/** Domaines qui servent l'application (CRM, espaces membres, checkout…). */
export const APP_HOSTS = [
  "plateforme.albarakaecosysteme.com",
  "view.albarakaecosysteme.com", // impersonation
] as const;

/**
 * Le domaine principal sert le SITE VITRINE (`vitrine.html`), une application
 * à part — plus la plateforme. Décision de Hassan le 28/09/2026.
 *
 * Tant que le DNS de ce domaine pointe encore chez Hostinger, cette règle est
 * sans effet : aucune requête vers ces hôtes n'atteint Vercel.
 */
export const VITRINE_HOSTS = ["albarakaecosysteme.com", "www.albarakaecosysteme.com"] as const;

/**
 * Hors du domaine principal (local, aperçus Vercel), le site vitrine est
 * servi sous ce préfixe : la racine y appartient à la plateforme.
 */
export const VITRINE_PREFIXE = "/site-vitrine";

function normalize(host: string | undefined | null): string {
  // On retire le port éventuel (dev/preview) et on passe en minuscules.
  return (host ?? "").toLowerCase().split(":")[0];
}

function currentHost(): string {
  if (typeof window === "undefined") return "";
  return normalize(window.location.host);
}

/** Le domaine est-il celui des tunnels ? (→ ne servir QUE les tunnels) */
export function isTunnelHost(host?: string | null): boolean {
  return (TUNNEL_HOSTS as readonly string[]).includes(normalize(host ?? currentHost()));
}

/** Le domaine est-il celui du site vitrine ? (→ le site est servi à la racine) */
export function isVitrineHost(host?: string | null): boolean {
  const h = normalize(host ?? currentHost());
  return (VITRINE_HOSTS as readonly string[]).includes(h);
}

/** Le domaine est-il celui de l'application ? (→ ne PAS servir les tunnels) */
export function isAppHost(host?: string | null): boolean {
  const h = normalize(host ?? currentHost());
  return (APP_HOSTS as readonly string[]).includes(h);
}
