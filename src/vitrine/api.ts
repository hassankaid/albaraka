// ─────────────────────────────────────────────────────────────────────────
// Ce que le site vitrine partage avec Supabase : lecture des témoignages et
// attribution (UTM) de la visite.
//
// Depuis le 29/09/2026, les rendez-vous passent par l'agenda Calendly
// (composants/AgendaCalendly.tsx) et non plus par un formulaire : c'est le
// webhook Calendly qui crée le lead `site_vitrine` (« Site vitrine »,
// organique). `tunnel-lead-submit` accepte toujours cette source, sans usage
// aujourd'hui.
//
// ⚠️ ON N'IMPORTE PAS `@/integrations/supabase/client`. Ce module crée le
// client Supabase au chargement : tout le SDK partirait dans le site vitrine,
// qui n'en a pas besoin pour une seule lecture. L'URL et la clé publique sont
// recopiées ici — une clé « anon », publique par nature — et
// `api.test.ts` vérifie qu'elles restent identiques à celles du client.
// ─────────────────────────────────────────────────────────────────────────

export const SUPABASE_URL = "https://ktvszjzryabjgxyobtyc.supabase.co";
export const SUPABASE_CLE_PUBLIQUE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnN6anpyeWFiamd4eW9idHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDQwODYsImV4cCI6MjA4NzU4MDA4Nn0.Hck5qF0GQ9-KEMvJiuu10-i-9562mEWBOBuHMTG33ZY";

export const SOURCE_SITE_VITRINE = "site_vitrine";

const CLE_ATTRIBUTION = "alb_vitrine_attribution_v1";

export interface Attribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
}

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/**
 * Lue à l'arrivée sur le site, puis gardée pour la session : le visiteur
 * prend souvent rendez-vous après avoir fait défiler la page, et l'URL
 * peut avoir perdu ses paramètres entre-temps (clic sur une ancre).
 * Première touche : une arrivée sans UTM n'efface pas celle qui en avait.
 */
export function capterAttribution(): Attribution {
  const deja = lireAttribution();
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    params = new URLSearchParams();
  }
  const lue = Object.fromEntries(
    UTM.map((k) => [k, params.get(k)?.trim().slice(0, 200) || null]),
  ) as Record<(typeof UTM)[number], string | null>;
  const aDesUtm = UTM.some((k) => lue[k]);
  if (deja && !aDesUtm) return deja;

  let referrer: string | null = null;
  try {
    // Le référent n'a de valeur que s'il vient d'ailleurs.
    const r = document.referrer ? new URL(document.referrer) : null;
    if (r && r.host !== window.location.host) referrer = r.origin + r.pathname;
  } catch {
    referrer = null;
  }
  const attribution: Attribution = { ...lue, referrer: referrer?.slice(0, 300) ?? null };
  try {
    sessionStorage.setItem(CLE_ATTRIBUTION, JSON.stringify(attribution));
  } catch {
    // Navigation privée stricte : on garde l'attribution en mémoire seulement.
  }
  return attribution;
}

export function lireAttribution(): Attribution | null {
  try {
    const brut = sessionStorage.getItem(CLE_ATTRIBUTION);
    return brut ? (JSON.parse(brut) as Attribution) : null;
  } catch {
    return null;
  }
}
