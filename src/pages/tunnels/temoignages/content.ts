// ─────────────────────────────────────────────────────────────────────────
// CONTENU de la page /temoignages — la seule chose à éditer pour l'alimenter.
//
// Tant qu'une liste est vide, la page affiche ses emplacements d'attente :
// ajouter un témoignage = ajouter une entrée ici, rien d'autre à toucher.
//
// Le nombre de témoignages est LIBRE (le document de livraison parlait de
// 6 captures et 3 vidéos, ce n'était qu'un ordre de grandeur). Les grilles
// s'adaptent d'elles-mêmes.
//
// Où héberger les fichiers : n'importe quelle URL publique fait l'affaire
// (Supabase Storage, un CDN, ou un fichier déposé dans `public/`). Les vidéos
// lourdes ont tout intérêt à passer par Vimeo — hébergement, compression et
// lecture adaptative sont déjà gérés, et c'est ce qu'utilisent les tunnels.
// ─────────────────────────────────────────────────────────────────────────

/** Capture d'écran d'un avis écrit (WhatsApp, DM, mail…). */
export interface ScreenshotTestimonial {
  /** URL publique de l'image. */
  src: string;
  /**
   * Description de l'avis. Elle sert aux lecteurs d'écran ET s'affiche si
   * l'image ne charge pas — une capture illisible ne prouve plus rien, donc
   * on résume ce qu'elle dit plutôt que d'écrire « capture n°3 ».
   */
  alt: string;
}

/** Champs communs aux deux façons d'héberger un témoignage vidéo. */
interface VideoBase {
  /** Titre court, affiché sous la vidéo. Ex. « De salarié à 3 clients en 6 semaines ». */
  title: string;
  /** Prénom (et rôle) de la personne, affiché en second. */
  author?: string;
  /**
   * Cadre du lecteur. Les vidéos filmées au téléphone sont souvent verticales :
   * les mettre en 16/9 les entourerait de deux grosses bandes noires.
   */
  orientation?: "landscape" | "portrait";
}

/** Vidéo hébergée sur Vimeo — à préférer, surtout si le fichier est lourd. */
export interface VimeoTestimonial extends VideoBase {
  kind: "vimeo";
  /** Identifiant numérique, ex. « 1012345678 ». */
  id: string;
  /** Hash de partage, obligatoire si la vidéo est en « non listée ». */
  hash?: string;
}

/** Vidéo servie comme simple fichier (Supabase Storage, /public…). */
export interface FileTestimonial extends VideoBase {
  kind: "file";
  /** URL publique du fichier (.mp4 de préférence, lu par tous les navigateurs). */
  src: string;
  /** Image d'attente. Sans elle, le navigateur affiche un cadre noir avant lecture. */
  poster?: string;
}

export type VideoTestimonial = VimeoTestimonial | FileTestimonial;

/** Avis écrits, dans l'ordre d'affichage. */
export const SCREENSHOTS: ScreenshotTestimonial[] = [
  // Exemple :
  // { src: "https://…/temoignages/avis-01.jpg", alt: "Karim : « J'ai signé mon premier client trois semaines après la formation. »" },
];

/** Témoignages filmés, dans l'ordre d'affichage. */
export const VIDEOS: VideoTestimonial[] = [
  // Exemples :
  // { kind: "vimeo", id: "1012345678", hash: "a1b2c3d4e5", title: "Six semaines pour changer de métier", author: "Yasmine" },
  // { kind: "file", src: "https://…/temoignages/amine.mp4", poster: "https://…/temoignages/amine.jpg", title: "Ce que j'aurais aimé savoir avant", author: "Amine", orientation: "portrait" },
];

/** Emplacements d'attente affichés tant que la liste correspondante est vide. */
export const PLACEHOLDER_SHOTS = 6;
export const PLACEHOLDER_VIDEOS = 3;

/** URL d'embed du player Vimeo (mêmes paramètres que les tunnels). */
export function testimonialVimeoUrl(v: VimeoTestimonial): string {
  const params = new URLSearchParams({ title: "0", byline: "0", portrait: "0", dnt: "1" });
  if (v.hash) params.set("h", v.hash);
  return `https://player.vimeo.com/video/${v.id}?${params.toString()}`;
}
