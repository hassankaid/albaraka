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

const PIXEL_ID = "1076753490786885";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _fbq?: any;
  }
}

let initialized = false;

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
    if (!initialized) {
      window.fbq("init", PIXEL_ID);
      initialized = true;
    }
    window.fbq("track", "PageView");
    window.fbq("track", "ViewContent");
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
    if (!initialized) {
      window.fbq("init", PIXEL_ID);
      initialized = true;
    }
    window.fbq("trackCustom", "WhatsAppJoin");
  } catch (err) {
    console.warn("[tunnel-pixel] whatsapp-join tracking failed (non-blocking):", err);
  }
}

/**
 * À appeler quand le formulaire d'inscription est validé : event « Lead »
 * avec Advanced Matching hashé (meilleure précision de matching Meta).
 * No-op silencieux hors prod.
 */
export async function trackLead(contact: PixelContact = {}): Promise<void> {
  if (!isProdHost()) return;
  try {
    loadFbqScript();
    if (!window.fbq) return;
    const am = await buildAdvancedMatching(contact);
    if (!initialized) {
      Object.keys(am).length > 0 ? window.fbq("init", PIXEL_ID, am) : window.fbq("init", PIXEL_ID);
      initialized = true;
    }
    window.fbq("track", "Lead");
  } catch (err) {
    console.warn("[tunnel-pixel] lead tracking failed (non-blocking):", err);
  }
}
