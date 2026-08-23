// ─────────────────────────────────────────────────────────────────────────
// CONTENU de la page /temoignages — la seule chose à éditer pour l'alimenter.
//
// Tant qu'une liste est vide, la page affiche ses emplacements d'attente :
// ajouter un témoignage = ajouter une entrée ici, rien d'autre à toucher.
// Le nombre de témoignages est LIBRE, les grilles s'adaptent.
//
// Les vidéos vivent dans Vimeo, dossier VIDÉOS TÉMOIGNAGES ▸ HISTORIQUE
// (témoignages de l'ancien tunnel Systeme.io, versés le 22/08/2026). Elles
// sont réglées « masquée de Vimeo » avec intégration restreinte à
// plateforme. / view. / event. — le hash est donc OBLIGATOIRE.
//
// ⚠️ AJOUTER UNE VIDÉO : inscrire aussi `event.albarakaecosysteme.com` dans
// ses domaines autorisés côté Vimeo. Les tunnels ne sont servis QUE depuis ce
// domaine ; sans lui le lecteur est refusé sur la landing — et nulle part
// ailleurs, donc le défaut ne se voit pas en testant sur la plateforme.
//
// Les légendes sont celles fournies par Hassan ; seule la typographie a été
// harmonisée (espace insécable avant l'euro, comme sur la landing).
// ─────────────────────────────────────────────────────────────────────────
import type { ScreenshotTestimonial, VideoTestimonial } from "../lib/testimonials";

export type { ScreenshotTestimonial, VideoTestimonial };
export { testimonialVimeoUrl } from "../lib/testimonials";

/** Avis écrits, dans l'ordre d'affichage. Images servies depuis `public/`. */
export const SCREENSHOTS: ScreenshotTestimonial[] = [
  { src: "/temoignages/avis-01.jpg", alt: "L'élève dépasse le maître" },
  { src: "/temoignages/avis-02.jpg", alt: "J'y crois pas, c'est possible en 2 semaines" },
];

/**
 * Témoignages filmés, dans l'ordre d'affichage.
 * `ratio` = dimensions réelles du fichier source (aucun n'est en 16/9).
 */
export const VIDEOS: VideoTestimonial[] = [
  { kind: "vimeo", id: "1220657720", hash: "a6644805b8", ratio: "9 / 16",     title: "Tu nous a appris une pépite" },
  { kind: "vimeo", id: "1220657728", hash: "748144b688", ratio: "9 / 16",     title: "Tu as changé ma vie Sidali, grâce à toi je suis indépendant" },
  { kind: "vimeo", id: "1220657898", hash: "68691fe2a5", ratio: "9 / 16",     title: "Je suis avec Sidali depuis avril, et j'ai déjà généré 3.000\u00A0€ pendant mes 3 premiers mois" },
  { kind: "vimeo", id: "1220657959", hash: "d74050d102", ratio: "886 / 1920", title: "J'y crois pas, c'est possible en 2 semaines" },
  { kind: "vimeo", id: "1220657980", hash: "622e41d09a", ratio: "4 / 3",      title: "Le coaching est vraiment intéressant" },
  { kind: "vimeo", id: "1220658000", hash: "4f903eabdd", ratio: "4 / 3",      title: "En moins de 40 jours, j'ai pu générer 1.400\u00A0€" },
  { kind: "vimeo", id: "1220657559", hash: "6ad4e9ea94", ratio: "4 / 3",      title: "Je suis déjà à 9.500\u00A0€ de commissions en 4 mois et demi" },
  { kind: "vimeo", id: "1220658011", hash: "592c6c6d6f", ratio: "886 / 1920", title: "Je croyais pas au début, j'avais dit tout le monde sauf moi" },
  { kind: "vimeo", id: "1220658021", hash: "78c65136fe", ratio: "9 / 16",     title: "Je n'avais pas assez d'argent, j'ai dû risquer" },
  // Même légende que la précédente, confirmée par Hassan. Côté Vimeo, ce
  // fichier porte « — Siham » en plus, pour les distinguer dans la bibliothèque.
  { kind: "vimeo", id: "1220658107", hash: "4dab5588eb", ratio: "4 / 3",      title: "Je croyais pas au début, j'avais dit tout le monde sauf moi" },
];

/** Emplacements d'attente affichés tant que la liste correspondante est vide. */
export const PLACEHOLDER_SHOTS = 6;
export const PLACEHOLDER_VIDEOS = 3;
