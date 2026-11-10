// Appel de l'edge function publique `tunnel-lead-submit` (crée le lead CRM).
//
// Même pattern que le funnel quiz : POST JSON vers /functions/v1/<fn> avec la
// clé anon en `apikey` + `Authorization: Bearer` (le proxy Supabase l'exige
// même quand verify_jwt=false). URL + clé anon = constantes publiques du projet
// (partagées, pas de la logique métier funnel).
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { captureAttribution, estMarquee, getAttribution, lireAttribution, type OrigineAttribution } from "./source";
import { visitorId, varianteLandingRetenue } from "./abtest";
import type { TunnelConfig } from "../config";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/tunnel-lead-submit`;

export interface TunnelLeadInput {
  first_name: string;
  email: string;
  phone: string; // E.164
  /** Case « je veux recevoir vos offres ». Jamais requise pour s'inscrire. */
  consentement_marketing?: boolean;
}

export interface TunnelLeadResult {
  ok: boolean;
  lead_id: string;
  contact_id: string;
  /** Jeton du quiz de lead scoring (tunnels WhatsApp et VSL), sinon null. */
  scoring_token?: string | null;
}

function lireCookie(nom: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${nom}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Identifiants de clic des régies (03/11/2026). Gardés sur le lead pour pouvoir
 * renvoyer plus tard la VENTE à Meta et à Snap, qui reconnaissent l'acheteur à
 * ces valeurs. Les cookies sont lus à l'envoi, pas à l'arrivée : les pixels
 * (GTM) les posent après le chargement de la page.
 */
export function clicsPub(a: ReturnType<typeof getAttribution>) {
  const fbclid = a?.fbclid ?? null;
  // Sans cookie _fbc (pixel bloqué ou pas encore chargé), on le reconstruit au
  // format de Meta à partir du fbclid et de l'heure d'arrivée.
  const arrivee = a?.landedAt ? Date.parse(a.landedAt) : NaN;
  const fbc = lireCookie("_fbc") ?? (fbclid ? `fb.1.${Number.isFinite(arrivee) ? arrivee : Date.now()}.${fbclid}` : null);
  return {
    fbclid,
    fbc,
    fbp: lireCookie("_fbp"),
    sccid: a?.sccid ?? null,
    scid: lireCookie("_scid"),
    gclid: a?.gclid ?? null,
  };
}

/** Le stockage de session répond-il ? (diagnostic iPhone, 10/11/2026) */
function sessionOk(): boolean {
  try {
    sessionStorage.setItem("alb_t", "1");
    sessionStorage.removeItem("alb_t");
    return true;
  } catch {
    return false;
  }
}

/**
 * Ce qu'on sait du parcours au moment de l'envoi, sans aucune donnée personnelle :
 * de quoi trouver pourquoi des clics de pub arrivent sans marquage sur iPhone.
 */
function diagnostic(a: ReturnType<typeof getAttribution>, origine: OrigineAttribution, recapture: boolean) {
  let paramsEnvoi: string[] = [];
  let nav: string | null = null;
  try {
    paramsEnvoi = [...new URLSearchParams(window.location.search).keys()].slice(0, 15);
    nav = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type ?? null;
  } catch {
    /* navigateur ancien */
  }
  let ref: string | null = null;
  try {
    ref = a?.referrer ? new URL(a.referrer).host : null;
  } catch {
    ref = null;
  }
  return {
    origine,
    recapture,
    session: sessionOk(),
    params_arrivee: a?.paramsVus ?? null,
    params_envoi: paramsEnvoi,
    ref,
    nav,
    historique: typeof history !== "undefined" ? history.length : null,
    arrivee_il_y_a_s: a?.landedAt ? Math.round((Date.now() - Date.parse(a.landedAt)) / 1000) : null,
  };
}

export async function submitTunnelLead(input: TunnelLeadInput, cfg: TunnelConfig): Promise<TunnelLeadResult> {
  const lu = lireAttribution(cfg);
  let a = lu.a;
  // Rien de marqué en mémoire : on relit l'adresse actuelle, au cas où elle porte encore le lien.
  const recapture = !estMarquee(a);
  if (recapture) {
    const b = captureAttribution(cfg);
    if (estMarquee(b) || !a) a = b;
  }
  const body = {
    first_name: input.first_name,
    email: input.email,
    phone: input.phone,
    // Voyage avec le lead pour être journalisé côté serveur : une case cochée
    // dans un navigateur ne prouve rien tant qu'elle n'est pas horodatée.
    consentement_marketing: input.consentement_marketing === true,
    page: typeof window !== "undefined" ? window.location.pathname : null,
    source: a?.source ?? `${cfg.srcPrefix}_direct`,
    src: a?.src ?? null,
    utm_source: a?.utm_source ?? null,
    utm_medium: a?.utm_medium ?? null,
    utm_campaign: a?.utm_campaign ?? null,
    utm_content: a?.utm_content ?? null,
    utm_term: a?.utm_term ?? null,
    fbclid: a?.fbclid ?? null,
    gclid: a?.gclid ?? null,
    referrer: a?.referrer ?? null,
    clic_pub: { ...clicsPub(a), diag: diagnostic(a, lu.origine, recapture) },
    // Le visiteur et le test voyagent avec l'inscrit : c'est ce qui permettra
    // plus tard de rattacher une VENTE à la variante qui l'a précédée. La
    // variante elle-même n'est pas envoyée ici — elle n'est décidée qu'à la
    // page suivante, et c'est l'exposition qui en fait foi.
    visitor_id: visitorId(),
    ab_test_code: a?.abCode ?? null,
    // La variante de LANDING, s'il y avait un test à cette étape. C'est elle qui
    // dira quelle page a produit cet inscrit. Nulle pour un test de page de
    // remerciement, où la variante n'est décidée qu'après l'inscription.
    tunnel_variant: varianteLandingRetenue(cfg),
  };

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Bad response (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(String(data?.message ?? data?.error ?? `HTTP ${res.status}`));
  }
  return data as TunnelLeadResult;
}
