// Meta Pixel — chargement et tracking de la conversion "Lead" sur la page
// quiz scoring uniquement.
//
// Pourquoi un module dédié plutôt qu'un snippet dans index.html ?
//   - Notre app est une SPA React. Coller `fbq('track', 'Lead')` dans
//     le <body> de index.html déclencherait l'event sur TOUTES les pages
//     (admin, dashboard, checkout, etc.) → données polluées côté Meta Ads.
//   - On charge donc la lib UNIQUEMENT quand le visiteur atterrit sur
//     /scoring/quiz, et on déclenche PageView + Lead à ce moment-là.
//   - Bonus : Advanced Matching — on transmet email/prénom/nom/téléphone
//     hashés en SHA-256 (requirement Meta) pour gagner ~30 % de
//     précision de tracking (Meta peut faire le matching cross-device).
//
// Pixel ID = compte Meta du media buyer (validé par Hassan le 10/05/2026).
// Si on devait basculer sur un autre compte, c'est la seule constante à
// changer.

const PIXEL_ID = "1076753490786885";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _fbq?: any;
  }
}

let pixelInitialized = false;

/**
 * Injecte le snippet officiel Meta Pixel (chargement de fbevents.js).
 * Idempotent : si fbq existe déjà, no-op.
 */
function loadFbqScript(): void {
  if (typeof window === "undefined") return;
  if (window.fbq) return;

  // Snippet officiel Meta, traduit en TS (la version JS d'origine est dans le
  // dashboard Meta Pixel sous "Set up the Pixel manually").
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

/**
 * SHA-256 via Web Crypto API. Meta exige les données Advanced Matching en
 * SHA-256 hex lowercase.
 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Normalise une donnée pour Advanced Matching avant hashage :
 *   - trim
 *   - lowercase
 * (Cf. https://developers.facebook.com/docs/marketing-api/audiences/guides/advanced-matching)
 */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Normalise un numéro de téléphone : digits only, country code inclus.
 *   "+212 6 27 35 11 68"  → "212627351168"
 *   "06 27 35 11 68"      → "0627351168" (Meta préfère avec country code,
 *                          mais on hashe ce qu'on a)
 */
function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

interface AdvancedMatchingInput {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

async function buildAdvancedMatching(
  opts: AdvancedMatchingInput,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (opts.email) out.em = await sha256Hex(normalize(opts.email));
  if (opts.firstName) out.fn = await sha256Hex(normalize(opts.firstName));
  if (opts.lastName) out.ln = await sha256Hex(normalize(opts.lastName));
  if (opts.phone) {
    const normalized = normalizePhone(opts.phone);
    if (normalized.length > 0) out.ph = await sha256Hex(normalized);
  }
  return out;
}

/**
 * À appeler UNE FOIS au mount de la page quiz scoring.
 *
 * Effets de bord :
 *   1. Charge fbevents.js si pas encore fait
 *   2. Init du Pixel (avec Advanced Matching si on a des données contact)
 *   3. fbq('track', 'PageView')
 *   4. fbq('track', 'Lead')
 *
 * Ne plante jamais l'app si Meta est down / bloqué par adblocker / etc.
 * On wrappe tout dans un try/catch pour rester silencieux côté UX.
 */
export async function trackQuizPageAsLead(opts: AdvancedMatchingInput = {}): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    loadFbqScript();
    if (!window.fbq) return;

    // Construit l'Advanced Matching hashé (peut être vide si on n'a pas
    // les infos contact — ex: mode "orphan" sans token matché).
    const advancedMatching = await buildAdvancedMatching(opts);

    // Init du Pixel — Meta dédoublonne automatiquement si on init plusieurs
    // fois avec le même ID, mais on garde le flag pour économiser le call.
    if (!pixelInitialized) {
      if (Object.keys(advancedMatching).length > 0) {
        window.fbq("init", PIXEL_ID, advancedMatching);
      } else {
        window.fbq("init", PIXEL_ID);
      }
      pixelInitialized = true;
    }

    window.fbq("track", "PageView");
    window.fbq("track", "Lead");
  } catch (err) {
    // Si Meta Pixel échoue (adblocker, navigateur strict, etc.), on ne fait
    // pas planter le quiz. On log juste pour debug.
    console.warn("[meta-pixel] tracking failed (non-blocking):", err);
  }
}

/**
 * Clé sessionStorage utilisée par ScoringStart pour transmettre les infos
 * contact à ScoringQuiz (Advanced Matching). Scope = onglet, donc effacée
 * dès que le lead ferme la page après le quiz. Pas dans l'URL pour ne pas
 * exposer email/téléphone en clair dans les logs serveur.
 */
export const META_PIXEL_CONTACT_KEY = "alb_scoring_contact_v1";
