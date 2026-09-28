// ─────────────────────────────────────────────────────────────────────────
// Envoi d'une demande de rendez-vous du site vitrine.
//
// Même chemin que les tunnels (décision de Hassan le 28/09/2026) : l'edge
// function publique `tunnel-lead-submit` crée le contact et le lead dans le
// CRM, non assigné, au statut « à qualifier », dédoublonné, UTM compris.
// La source est `site_vitrine` — libellé « Site vitrine », classée organique.
//
// ⚠️ LA FONCTION DOIT CONNAÎTRE `site_vitrine` AVANT LA MISE EN LIGNE. Son
// filet est silencieux : une source inconnue n'échoue pas, elle est comptée
// en `webi_wa_direct`, donc comme un inscrit à la conférence venu en direct.
// Trois endroits vont ensemble : `leads_source_check` en base,
// `ALLOWED_SOURCES` dans la fonction, et le libellé de `leadConfig.ts`.
//
// ⚠️ ON N'IMPORTE PAS `@/integrations/supabase/client`. Ce module crée le
// client Supabase au chargement : tout le SDK partirait dans le site vitrine,
// qui n'en a pas besoin pour un seul POST. L'URL et la clé publique sont
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
 * remplit souvent le formulaire après avoir fait défiler la page, et l'URL
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

export interface DemandeRendezVous {
  prenom: string;
  nom: string;
  email: string;
  /** Format international E.164 (+33…). */
  telephone: string;
  situation: string;
}

export async function envoyerDemande(d: DemandeRendezVous): Promise<void> {
  const a = lireAttribution();
  const corps = {
    first_name: d.prenom.trim(),
    last_name: d.nom.trim(),
    email: d.email.trim(),
    phone: d.telephone,
    situation: d.situation,
    source: SOURCE_SITE_VITRINE,
    // La case du formulaire autorise à RECONTACTER, pas à prospecter : ce
    // n'est pas un consentement marketing (cahier §6.2 : « Ne pas envoyer de
    // newsletter à ces contacts sans consentement marketing séparé »).
    consentement_contact: true,
    consentement_marketing: false,
    page: typeof window !== "undefined" ? window.location.pathname : null,
    utm_source: a?.utm_source ?? null,
    utm_medium: a?.utm_medium ?? null,
    utm_campaign: a?.utm_campaign ?? null,
    utm_content: a?.utm_content ?? null,
    utm_term: a?.utm_term ?? null,
    referrer: a?.referrer ?? null,
  };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/tunnel-lead-submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_CLE_PUBLIQUE,
      Authorization: `Bearer ${SUPABASE_CLE_PUBLIQUE}`,
    },
    body: JSON.stringify(corps),
  });
  if (!res.ok) {
    const texte = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${texte.slice(0, 200)}`);
  }
}
