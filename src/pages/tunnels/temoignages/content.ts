// ─────────────────────────────────────────────────────────────────────────
// CONTENU de la page /temoignages — la seule chose à éditer pour l'alimenter.
//
// UNE seule liste, dans l'ordre d'affichage, captures et vidéos mélangées.
// La page les présente dans un mur unique : trier la preuve par support
// (« avis écrits » d'un côté, « vidéos » de l'autre) la catégorisait au lieu
// de la montrer. Le nombre est libre, le mur s'adapte.
//
// Ordre : on alterne, pour qu'aucune colonne ne soit une enfilade de vidéos.
//
// Les vidéos vivent dans Vimeo, dossier VIDÉOS TÉMOIGNAGES ▸ HISTORIQUE
// (témoignages de l'ancien tunnel Systeme.io, versés le 22/08/2026). Elles
// sont réglées « masquée de Vimeo » avec intégration restreinte à
// plateforme. / view. / event. — le hash est donc OBLIGATOIRE.
//
// ⚠️ AJOUTER UNE VIDÉO : inscrire aussi `event.albarakaecosysteme.com` dans
// ses domaines autorisés côté Vimeo. Cette page et la landing ne sont servies
// QUE depuis ce domaine ; sans lui, le lecteur est refusé.
//
// Les légendes sont celles fournies par Hassan ; seule la typographie a été
// harmonisée (espace insécable avant l'euro).
//
// `ratio` = dimensions réelles du fichier source. Aucune n'est en 16/9 : elles
// sont verticales (téléphone) ou en 4/3 (anciennes captures d'appel), et un
// cadre approximatif les entourerait de bandes noires.
// ─────────────────────────────────────────────────────────────────────────
import type { Testimonial } from "../lib/testimonials";

export type { Testimonial };
export { testimonialKey, testimonialVimeoUrl } from "../lib/testimonials";

export const TEMOIGNAGES: Testimonial[] = [
  { kind: "vimeo",   id: "1220657728", hash: "748144b688", ratio: "9 / 16",     title: "Tu as changé ma vie Sidali, grâce à toi je suis indépendant" },
  { kind: "capture", src: "/temoignages/avis-01.jpg", ratio: "957 / 1500",      title: "L'élève dépasse le maître" },
  { kind: "vimeo",   id: "1220657559", hash: "6ad4e9ea94", ratio: "4 / 3",      title: "Je suis déjà à 9.500 € de commissions en 4 mois et demi" },
  { kind: "vimeo",   id: "1220657898", hash: "68691fe2a5", ratio: "9 / 16",     title: "Je suis avec Sidali depuis avril, et j'ai déjà généré 3.000 € pendant mes 3 premiers mois" },
  { kind: "vimeo",   id: "1220658000", hash: "4f903eabdd", ratio: "4 / 3",      title: "En moins de 40 jours, j'ai pu générer 1.400 €" },
  { kind: "capture", src: "/temoignages/avis-02.jpg", ratio: "878 / 1500",      title: "J'y crois pas, c'est possible en 2 semaines" },
  { kind: "vimeo",   id: "1220657720", hash: "a6644805b8", ratio: "9 / 16",     title: "Tu nous a appris une pépite" },
  { kind: "vimeo",   id: "1220657980", hash: "622e41d09a", ratio: "4 / 3",      title: "Le coaching est vraiment intéressant" },
  { kind: "vimeo",   id: "1220657959", hash: "d74050d102", ratio: "886 / 1920", title: "J'y crois pas, c'est possible en 2 semaines" },
  { kind: "vimeo",   id: "1220658107", hash: "4dab5588eb", ratio: "4 / 3",      title: "Je croyais pas au début, j'avais dit tout le monde sauf moi" },
  { kind: "vimeo",   id: "1220658021", hash: "78c65136fe", ratio: "9 / 16",     title: "Je n'avais pas assez d'argent, j'ai dû risquer" },
  // Même légende que la précédente, confirmée par Hassan. Côté Vimeo, ce
  // fichier porte « — Siham » en plus, pour les distinguer dans la bibliothèque.
  { kind: "vimeo",   id: "1220658011", hash: "592c6c6d6f", ratio: "886 / 1920", title: "Je croyais pas au début, j'avais dit tout le monde sauf moi" },
];

/** Tuiles d'attente affichées tant que la liste est vide. */
export const PLACEHOLDER_COUNT = 6;
