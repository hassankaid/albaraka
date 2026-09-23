// ─────────────────────────────────────────────────────────────────────────
// Meta Pixel — module « tunnels » (autonome).
//
// C'est l'équivalent de src/lib/metaPixel.ts, recopié ici pour que le module
// tunnels ne dépende de rien. Même Pixel ID (compte du media buyer, validé par
// Hassan le 10/05/2026).
//
// Rappel du modèle Meta :
//   - Le Pixel ID est UNIQUE pour tout le business → identique sur toutes les
//     pages. On l'« init » une fois.
//   - Ce qui change d'une page à l'autre, c'est l'ÉVÉNEMENT déclenché :
//       • PageView       → auto, toute page (« quelqu'un a visité »)
//       • ViewContent    → vue d'une page clé (ex : la landing conférence)
//       • Lead           → LE signal qui compte : le prospect a laissé ses
//                          coordonnées (formulaire d'inscription validé).
//                          C'est là-dessus que Meta optimise les pubs.
//
// GARDE-FOU : on ne déclenche RIEN hors du vrai domaine de prod. En local /
// preview, aucun event n'est envoyé → on ne pollue jamais les données Meta Ads
// pendant le dev.
// ─────────────────────────────────────────────────────────────────────────

// ─── Les pixels Meta ─────────────────────────────────────────────────────
//
// Il y en a DEUX, et c'est voulu. Le tunnel Liberty vise une autre audience
// que les tunnels conférence : le media buyer le pilote depuis un pixel
// distinct, confirmé le 23/09/2026. Les mélanger reviendrait à optimiser deux
// campagnes sur un seul jeu de conversions.
//
// Le compte publicitaire fait foi : un pixel qui n'est pas celui du
// gestionnaire de publicités, ce sont des pubs optimisées sur un pixel qui ne
// reçoit rien — donc un budget dépensé à l'aveugle. C'est arrivé une fois, en
// août 2026, avec l'ancien 1076753490786885 hérité de la création des tunnels.
//
// Le pixel se déduit du CHEMIN et non d'un paramètre passé par chaque page :
// la page de confirmation de rendez-vous est un composant partagé entre
// plusieurs tunnels, et lui faire porter cette information aurait créé un
// endroit de plus où se tromper. L'URL, elle, dit toujours la vérité.
const PIXEL_CONFERENCE = "1499213912013386";
const PIXEL_LIBERTY = "997717802550998";

/** Le pixel du tunnel en cours. Tout ce qui est sous /liberty est Liberty. */
export function pixelCourant(chemin?: string): string {
  const p = chemin ?? (typeof window !== "undefined" ? window.location.pathname : "");
  return /^\/liberty(\/|$)/.test(p) ? PIXEL_LIBERTY : PIXEL_CONFERENCE;
}

import { getTunnelPrefill } from "./source";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _fbq?: any;
  }
}

// Quels pixels ont déjà été initialisés dans cette visite. Un booléen ne
// suffisait plus dès lors qu'il y en a deux.
const inities = new Set<string>();

/** Initialise le pixel du tunnel courant si ce n'est pas déjà fait. */
function assurerInit(id: string, donnees?: Record<string, string>): void {
  if (donnees && Object.keys(donnees).length > 0) {
    // L'Advanced Matching se pose par un `init` explicite, même si le pixel
    // est déjà initialisé : sans ça les données ne partent jamais.
    window.fbq("init", id, donnees);
    inities.add(id);
    return;
  }
  if (inities.has(id)) return;
  window.fbq("init", id);
  inities.add(id);
}

function isProdHost(): boolean {
  if (typeof window === "undefined") return false;
  return /(?:^|\.)albarakaecosysteme\.com$/i.test(window.location.hostname);
}

function loadFbqScript(): void {
  if (typeof window === "undefined" || window.fbq) return;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (function (f: any, b: any, e: string, v: string) {
    if (f.fbq) return;
    const n: any = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    };
    f.fbq = n;
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e);
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ─── Advanced Matching (SHA-256, requis par Meta) ────────────────────────
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface PixelContact {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

async function buildAdvancedMatching(c: PixelContact): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (c.email) out.em = await sha256Hex(c.email.trim().toLowerCase());
  if (c.firstName) out.fn = await sha256Hex(c.firstName.trim().toLowerCase());
  if (c.lastName) out.ln = await sha256Hex(c.lastName.trim().toLowerCase());
  if (c.phone) {
    const digits = c.phone.replace(/\D/g, "");
    if (digits) out.ph = await sha256Hex(digits);
  }
  return out;
}

/**
 * À appeler au mount de la landing : init du Pixel + PageView + ViewContent.
 * No-op silencieux hors prod ou si Meta est bloqué (adblocker).
 */
export function trackLandingView(): void {
  if (!isProdHost()) return;
  try {
    loadFbqScript();
    if (!window.fbq) return;
    const id = pixelCourant();
    assurerInit(id);
    window.fbq("trackSingle", id, "PageView");
    window.fbq("trackSingle", id, "ViewContent");
  } catch (err) {
    console.warn("[tunnel-pixel] view tracking failed (non-blocking):", err);
  }
}

/**
 * À appeler au clic sur « Rejoindre le groupe WhatsApp » (page de remerciement) :
 * la vraie conversion du tunnel. Event custom « WhatsAppJoin ». No-op hors prod.
 */
export function trackWhatsappJoin(): void {
  if (!isProdHost()) return;
  try {
    loadFbqScript();
    if (!window.fbq) return;
    const id = pixelCourant();
    assurerInit(id);
    window.fbq("trackSingleCustom", id, "WhatsAppJoin");
  } catch (err) {
    console.warn("[tunnel-pixel] whatsapp-join tracking failed (non-blocking):", err);
  }
}

/**
 * À appeler quand un RDV Calendly est réservé (tunnel VSL) : event standard
 * « Schedule » — une réservation d'appel est une conversion forte pour Meta.
 * No-op hors prod.
 */
export function trackCalendlyBooked(): void {
  if (!isProdHost()) return;
  try {
    loadFbqScript();
    if (!window.fbq) return;
    const id = pixelCourant();
    assurerInit(id);
    window.fbq("trackSingle", id, "PageView");
    window.fbq("trackSingle", id, "Schedule");
  } catch (err) {
    console.warn("[tunnel-pixel] schedule tracking failed (non-blocking):", err);
  }
}

/** Marqueur d'inscription en attente, posé à la validation du formulaire. */
const LEAD_EN_ATTENTE = "alb_tunnel_lead_pending";

/**
 * À appeler à la validation du formulaire, APRÈS l'écriture en base : pose un
 * marqueur pour que la page de remerciement déclenche « Lead ».
 *
 * Le client veut l'event sur la Thank You Page, comme dans un montage
 * classique. Mais ces pages sont accessibles par URL directe : un
 * rechargement, un retour arrière ou un lien partagé compteraient chacun une
 * conversion. D'où ce marqueur à usage unique — l'event part bien depuis la
 * page de remerciement, mais seulement pour qui vient VRAIMENT de s'inscrire.
 */
export function markLeadPending(): void {
  try {
    sessionStorage.setItem(LEAD_EN_ATTENTE, "1");
  } catch {
    /* mode privé strict : on perdra le Lead, jamais on n'en inventera un */
  }
}

/**
 * À appeler au mount d'une page de remerciement : PageView, plus « Lead » si
 * le visiteur vient de s'inscrire (marqueur consommé une seule fois).
 *
 * L'Advanced Matching est posé ICI par un `init` explicite : le pixel ayant
 * déjà été initialisé sur la landing, un second `init` conditionnel n'aurait
 * rien fait — les données de correspondance n'étaient donc JAMAIS transmises.
 */
export async function trackTypLead(): Promise<void> {
  if (!isProdHost()) return;
  try {
    loadFbqScript();
    if (!window.fbq) return;

    let enAttente = false;
    try {
      enAttente = sessionStorage.getItem(LEAD_EN_ATTENTE) === "1";
      if (enAttente) sessionStorage.removeItem(LEAD_EN_ATTENTE);
    } catch { /* pas de stockage : pas de Lead */ }

    const id = pixelCourant();
    assurerInit(id);
    window.fbq("trackSingle", id, "PageView");
    if (!enAttente) return;

    const p = getTunnelPrefill();
    const am = await buildAdvancedMatching({ firstName: p?.firstName, email: p?.email, phone: p?.phone });
    assurerInit(id, am);
    window.fbq("trackSingle", id, "Lead");
  } catch (err) {
    console.warn("[tunnel-pixel] lead tracking failed (non-blocking):", err);
  }
}
