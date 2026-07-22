// Config des tunnels natifs. Chaque tunnel est INDÉPENDANT (routes, Thank-You,
// libellés de source), mais partage la MÊME landing (copy identique demandé par
// Hassan) et le même socle (marque, pop-in, capture, pixel, edge fn).
//
// Ajouter un tunnel = ajouter une entrée ici + une route + sa page merci.
export type TunnelKey = "wa" | "vsl";

export interface TunnelConfig {
  key: TunnelKey;
  /** Route de la page de remerciement (où le pop-in redirige après inscription). */
  merciPath: string;
  /** Préfixe des libellés de source CRM : webi_wa_* / webi_vsl_*. */
  srcPrefix: string;
}

// Tunnel WhatsApp : landing → merci (bouton groupe WhatsApp).
export const WA_TUNNEL: TunnelConfig = {
  key: "wa",
  merciPath: "/webinaire/merci",
  srcPrefix: "webi_wa",
};

// Tunnel VSL : landing (même copy) → merci (vidéo VSL → RDV Calendly → confirmation).
export const VSL_TUNNEL: TunnelConfig = {
  key: "vsl",
  merciPath: "/vsl/merci",
  srcPrefix: "webi_vsl",
};
