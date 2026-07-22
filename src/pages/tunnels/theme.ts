// ─────────────────────────────────────────────────────────────────────────
// Tokens de marque du MODULE « tunnels ».
//
// Ce module est VOLONTAIREMENT autonome : il ne dépend d'aucun des systèmes
// existants (quiz, rdv, redif, conferences…). On y recopie ce dont on a besoin
// plutôt que d'importer, pour que les tunnels restent une île isolée qu'on
// peut faire évoluer sans rien casser ailleurs.
//
// Palette calée sur la landing Systeme.io de référence
// (go.albarakaecosysteme.com : fond ~#040404, or #C9A04E, CTA pilule dorée)
// — puis poussée d'un cran vers le « premium ».
// ─────────────────────────────────────────────────────────────────────────

export const T = {
  // Fonds
  bg: "#060504", // near-black chaud
  bgDeep: "#0A0807",
  bgCard: "rgba(255,255,255,0.028)",

  // Or Al Baraka
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDeep: "#A67C3D",
  goldLine: "rgba(201,160,78,0.22)",
  goldDim: "rgba(201,160,78,0.12)",
  goldGlow: "rgba(201,160,78,0.35)",

  // Crème / texte
  cream: "#F6F1E7",
  creamMuted: "rgba(246,241,231,0.66)",
  creamDim: "rgba(246,241,231,0.40)",
  creamFaint: "rgba(246,241,231,0.14)",

  // États
  danger: "#E08A6A",
  ok: "#8FBF7F",

  // Typo
  display: "'Fraunces', Georgia, 'Times New Roman', serif",
  body: "'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

// Config « conférence » — variable d'une conf à l'autre.
// Pour l'instant en dur (exemple : dernier dimanche d'août 2026) ; passera
// dans une petite config éditable sans redéploiement à la brique suivante.
export const CONFERENCE = {
  dateLabel: "Dimanche 30 août 2026 à 18h00",
  tz: "heure de Paris",
  // Lien du groupe WhatsApp (change d'une conférence à l'autre) — test pour l'instant.
  whatsappGroupUrl: "https://chat.whatsapp.com/BwBWVsHhM0Y0Fb37USMZS3",
  // Événement Calendly (tunnel VSL — agenda sous la vidéo).
  calendlyUrl: "https://calendly.com/d/cx6r-hxg-4sw/appel-setting-avant-webi",
  // Événement Calendly de la page INDÉPENDANTE /appel-conference (réservation
  // d'appel pendant/après la conférence). Même événement que l'ancienne page
  // Systeme.io « call-webinaire » → remonte au CRM via webhook-calendly
  // (event_type = 'inscription_conference'), sans code back à écrire.
  appelCalendlyUrl: "https://calendly.com/d/ctp9-hkm-4kh/inscription-conference",
} as const;

// Injection unique des webfonts du module (Fraunces display + Poppins body).
// On l'injecte au runtime plutôt que dans index.html pour ne pas alourdir
// le reste de l'app et garder le module autonome.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Poppins:wght@400;500;600;700&display=swap";

export function ensureTunnelFonts(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("alb-tunnel-fonts")) return;

  const preconnect1 = document.createElement("link");
  preconnect1.rel = "preconnect";
  preconnect1.href = "https://fonts.googleapis.com";

  const preconnect2 = document.createElement("link");
  preconnect2.rel = "preconnect";
  preconnect2.href = "https://fonts.gstatic.com";
  preconnect2.crossOrigin = "anonymous";

  const link = document.createElement("link");
  link.id = "alb-tunnel-fonts";
  link.rel = "stylesheet";
  link.href = FONTS_HREF;

  document.head.appendChild(preconnect1);
  document.head.appendChild(preconnect2);
  document.head.appendChild(link);
}
