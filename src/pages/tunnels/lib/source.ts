// ─────────────────────────────────────────────────────────────────────────
// Capture de la SOURCE de trafic — module « tunnels » (partagé WA + VSL).
//
// Objectif : distinguer d'où vient le prospect via les 3 liens d'entrée par
// tunnel :
//     ?src=ads     → Ads (Meta uniquement) → FB/IG distingués via utm_source
//     ?src=ig      → Instagram organique
//     ?src=tiktok  → TikTok organique
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
const SRC_SUFFIX: Record<string, string> = {
  ads: "ads",
  ig: "instagram_organic",
  insta: "instagram_organic",
  instagram: "instagram_organic",
  tiktok: "tiktok_organic",
};

export interface TunnelAttribution {
  src: string | null; // valeur brute du lien (ads | ig | tiktok)
  source: string; // libellé destiné au CRM (leads.source) : `${prefix}_${suffixe}`
  variant: string | null; // variante A/B captée à l'entrée (?v=1..6), portée jusqu'à la page merci
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
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

function sourceLabel(cfg: TunnelConfig, src: string | null): string {
  if (!src) return `${cfg.srcPrefix}_direct`;
  const s = src.toLowerCase();
  return `${cfg.srcPrefix}_${SRC_SUFFIX[s] ?? s}`;
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

  if (!src && !utm_source && !variant && existing) return existing;

  const attrib: TunnelAttribution = {
    src,
    source: sourceLabel(cfg, src),
    variant,
    utm_source,
    utm_medium: readParam(params, "utm_medium"),
    utm_campaign: readParam(params, "utm_campaign"),
    utm_content: readParam(params, "utm_content"),
    utm_term: readParam(params, "utm_term"),
    fbclid: readParam(params, "fbclid"),
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
