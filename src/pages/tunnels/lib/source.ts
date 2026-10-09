// ─────────────────────────────────────────────────────────────────────────
// Capture de la SOURCE de trafic — module « tunnels » (partagé WA + VSL).
//
// Objectif : distinguer d'où vient le prospect via les 4 liens d'entrée par
// tunnel :
//     ?src=ads     → Ads (Meta uniquement) → FB/IG distingués via utm_source
//     ?src=ig      → Instagram organique
//     ?src=tiktok  → TikTok organique
//     ?src=youtube → YouTube organique
//     ?src=tiktok_ads → TikTok Ads   (30/09/2026)
//     ?src=snap_ads   → Snapchat Ads (30/09/2026)
//     ?src=google_ads → Google Ads   (04/10/2026)
//
// Le libellé CRM final = `${srcPrefix}_${suffixe}` (ex. webi_wa_ads,
// webi_vsl_instagram_organic). Le préfixe vient de la config du tunnel.
//
// On capte aussi utm_* + fbclid (ce que Systeme.io faisait pour nous et qu'on
// doit désormais reconstruire). Persistance en sessionStorage, PAR TUNNEL, pour
// que le prospect qui remplit le formulaire un peu plus tard retrouve sa source.
// ─────────────────────────────────────────────────────────────────────────
import type { TunnelConfig } from "../config";

// src (lien) → suffixe du libellé de source CRM.
//
// Les alias comptent : le lien officiel utilise `youtube`, mais `yt` traîne
// partout dans les descriptions de vidéos. Une valeur absente de cette table
// est reprise telle quelle par `sourceLabel`, produirait un libellé hors
// `leads_source_check`, et `tunnel-lead-submit` la rétrograderait en `direct` —
// le lead ne serait pas perdu, mais son origine le serait.
const SRC_SUFFIX: Record<string, string> = {
  ads: "ads",
  ig: "instagram_organic",
  insta: "instagram_organic",
  instagram: "instagram_organic",
  tiktok: "tiktok_organic",
  youtube: "youtube_organic",
  yt: "youtube_organic",
  // Publicités TikTok et Snapchat (30/09/2026). Distinctes de `ads`, qui
  // désigne Meta, et de `tiktok`, qui désigne le TikTok GRATUIT : sans elles,
  // un lead payé par TikTok passerait pour de l'organique.
  tiktok_ads: "tiktok_ads",
  snap_ads: "snap_ads",
  snapchat_ads: "snap_ads",
  // Google Ads (04/10/2026), même logique : distinct de `ads` (Meta).
  google_ads: "google_ads",
  gads: "google_ads",
};

/**
 * Le lien porte-t-il `?src=google_ads` (ou son alias `gads`) ? C'est ce qui
 * affiche la version Google Ads de la landing (09/10/2026). Le `src` SEUL
 * décide, jamais le gclid : Google l'ajoute aux seuls clics, son vérificateur
 * verrait alors une autre page que les visiteurs (« cloaking », interdit).
 */
export function estLienGoogleAds(search: string): boolean {
  const src = new URLSearchParams(search).get("src")?.trim().toLowerCase() ?? "";
  return SRC_SUFFIX[src] === "google_ads";
}

export interface TunnelAttribution {
  src: string | null; // valeur brute du lien (ads | ig | tiktok | youtube)
  /** Code du test A/B porté par le lien (?ab=CODE), s'il y en a un. */
  abCode: string | null;
  source: string; // libellé destiné au CRM (leads.source) : `${prefix}_${suffixe}`
  variant: string | null; // variante A/B captée à l'entrée (?v=1..6), portée jusqu'à la page merci
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  /** Clic Google Ads (gclid, ou gbraid/wbraid sur iOS) : ajouté par Google seul. */
  gclid: string | null;
  referrer: string | null;
  landedAt: string; // ISO
}

function storageKey(cfg: TunnelConfig): string {
  return `alb_tunnel_attrib_${cfg.key}`;
}

function readParam(params: URLSearchParams, key: string): string | null {
  const v = params.get(key);
  return v && v.trim() ? v.trim() : null;
}

/**
 * Filet de sécurité (02/10/2026) : le lien Meta (`?src=ads`) collé dans une
 * pub Snapchat ou TikTok. Le premier jour de Snap Ads, 7 leads sont arrivés
 * avec `?src=ads&utm_source=snapchat` et ont été comptés comme du Meta — Snap
 * affichait 0 dans le tableau marketing. Quand `utm_source` désigne sans
 * ambiguïté une autre régie payante, c'est elle qui l'emporte.
 */
function regieDepuisUtm(utmSource: string | null): string | null {
  const u = (utmSource ?? "").toLowerCase();
  if (/snap/.test(u)) return "snap_ads";
  if (/tiktok/.test(u)) return "tiktok_ads";
  if (/google|adwords|gads/.test(u)) return "google_ads";
  return null;
}

/**
 * `clicGoogle` : l'URL porte un gclid/gbraid/wbraid. Google Ads l'ajoute
 * lui-même à chaque clic (taggage automatique) : c'est la preuve d'une pub
 * Google, même si le lien a été posé sans `?src=` ou avec celui de Meta.
 * Un `?src=` explicite d'une autre origine garde la main.
 */
function sourceLabel(cfg: TunnelConfig, src: string | null, utmSource: string | null = null, clicGoogle = false): string {
  if (!src) return clicGoogle ? `${cfg.srcPrefix}_google_ads` : `${cfg.srcPrefix}_direct`;
  const s = src.toLowerCase();
  const suffixe = SRC_SUFFIX[s] ?? s;
  if (suffixe === "ads") {
    if (clicGoogle) return `${cfg.srcPrefix}_google_ads`;
    const regie = regieDepuisUtm(utmSource);
    if (regie) return `${cfg.srcPrefix}_${regie}`;
  }
  return `${cfg.srcPrefix}_${suffixe}`;
}

/**
 * À appeler au mount de la landing. Lit l'URL, calcule la source (préfixée par
 * le tunnel), persiste, et renvoie l'attribution. Accès direct (pas de src ni
 * utm) → on garde la première touche déjà stockée pour ce tunnel.
 */
export function captureAttribution(cfg: TunnelConfig): TunnelAttribution {
  const existing = getAttribution(cfg);
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    params = new URLSearchParams();
  }

  const src = readParam(params, "src");
  const utm_source = readParam(params, "utm_source");
  const variant = readParam(params, "v");
  // Le code du test voyage avec le lien mais n'est PAS résolu ici : la variante
  // n'apparaît que sur la page de remerciement, c'est là qu'on la demandera.
  // Aucune requête réseau sur la landing, donc aucun coût pour le trafic
  // ordinaire — le dispositif peut rester branché en permanence.
  const abCode = readParam(params, "ab");
  const gclid = readParam(params, "gclid") ?? readParam(params, "gbraid") ?? readParam(params, "wbraid");

  if (!src && !utm_source && !variant && !abCode && !gclid && existing) return existing;

  const attrib: TunnelAttribution = {
    src,
    abCode: abCode ? abCode.toUpperCase() : null,
    source: sourceLabel(cfg, src, utm_source, gclid !== null),
    variant,
    utm_source,
    utm_medium: readParam(params, "utm_medium"),
    utm_campaign: readParam(params, "utm_campaign"),
    utm_content: readParam(params, "utm_content"),
    utm_term: readParam(params, "utm_term"),
    fbclid: readParam(params, "fbclid"),
    gclid,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    landedAt: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(storageKey(cfg), JSON.stringify(attrib));
  } catch {
    /* mode privé strict : l'attribution vivra juste en mémoire */
  }
  return attrib;
}

export function getAttribution(cfg: TunnelConfig): TunnelAttribution | null {
  try {
    const raw = sessionStorage.getItem(storageKey(cfg));
    return raw ? (JSON.parse(raw) as TunnelAttribution) : null;
  } catch {
    return null;
  }
}

// ─── Pré-remplissage (coordonnées saisies à l'opt-in) ────────────────────
// Stocké à la validation du pop-in pour pré-remplir le Calendly du tunnel VSL
// sur la page de remerciement (le prospect ne re-saisit pas ses infos).
const PREFILL_KEY = "alb_tunnel_prefill";

export interface TunnelPrefill {
  firstName: string;
  email: string;
  phone: string;
}

export function setTunnelPrefill(p: TunnelPrefill): void {
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(p));
  } catch {
    /* mode privé strict : tant pis, pas de pré-remplissage */
  }
}

export function getTunnelPrefill(): TunnelPrefill | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    return raw ? (JSON.parse(raw) as TunnelPrefill) : null;
  } catch {
    return null;
  }
}
