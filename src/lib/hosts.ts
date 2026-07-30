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

/** Domaine public des tunnels (funnels de pub). */
export const TUNNEL_HOST = "event.albarakaecosysteme.com";

/** Domaines qui servent l'application (CRM, espaces membres, checkout…). */
export const APP_HOSTS = [
  "plateforme.albarakaecosysteme.com",
  "view.albarakaecosysteme.com", // impersonation
  "albarakaecosysteme.com",
  "www.albarakaecosysteme.com",
] as const;

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
  return normalize(host ?? currentHost()) === TUNNEL_HOST;
}

/** Le domaine est-il celui de l'application ? (→ ne PAS servir les tunnels) */
export function isAppHost(host?: string | null): boolean {
  const h = normalize(host ?? currentHost());
  return (APP_HOSTS as readonly string[]).includes(h);
}
