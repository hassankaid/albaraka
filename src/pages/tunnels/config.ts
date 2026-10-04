// Config des tunnels natifs. Chaque tunnel est INDÉPENDANT (routes, Thank-You,
// libellés de source), mais partage la MÊME landing (copy identique demandé par
// Hassan) et le même socle (marque, pop-in, capture, pixel, edge fn).
//
// Ajouter un tunnel = ajouter une entrée ici + une route + sa page merci.
export type TunnelKey = "wa" | "vsl" | "liberty";

export interface TunnelConfig {
  key: TunnelKey;
  /** Route de la page de remerciement (où le pop-in redirige après inscription). */
  merciPath: string;
  /** Préfixe des libellés de source CRM : webi_wa_* / webi_vsl_*. */
  srcPrefix: string;
  /**
   * Lead scoring (04/10/2026) : quiz OBLIGATOIRE entre l'inscription et la
   * page de remerciement, comme du temps de Systeme.io. `slug` = la ligne de
   * `quiz_funnel_configs`. Absent = pas de quiz (Liberty).
   */
  quiz?: { path: string; slug: string };
}

// Tunnel WhatsApp : landing → merci (bouton groupe WhatsApp).
export const WA_TUNNEL: TunnelConfig = {
  key: "wa",
  merciPath: "/webinaire/merci",
  srcPrefix: "webi_wa",
  quiz: { path: "/webinaire/quiz", slug: "tunnel-wa" },
};

// Tunnel VSL : landing (même copy) → merci (vidéo VSL → RDV Calendly → confirmation).
export const VSL_TUNNEL: TunnelConfig = {
  key: "vsl",
  merciPath: "/vsl/merci",
  srcPrefix: "webi_vsl",
  quiz: { path: "/vsl/quiz", slug: "tunnel-vsl" },
};

// Tunnel Liberty : landing PROPRE (copy différente des deux autres) → merci
// (VSL Liberty → agenda Liberty) → confirmation. Il ne vend pas la conférence
// mais l'offre Liberty, d'où un préfixe de source à lui.
export const LIBERTY_TUNNEL: TunnelConfig = {
  key: "liberty",
  merciPath: "/liberty/merci",
  srcPrefix: "liberty",
};
