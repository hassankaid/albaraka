// ─────────────────────────────────────────────────────────────────────────
// Témoignages — types partagés.
//
// Deux pages les affichent : la vitrine `/temoignages` et la section « Ils
// l'ont fait avant toi » de la landing des tunnels. Elles montrent en partie
// les MÊMES vidéos, avec des légendes différentes — d'où un socle commun ici
// plutôt qu'une dépendance de la landing au dossier de la page témoignages.
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
  /** Légende affichée sous la vidéo. */
  title: string;
  /** Prénom (et rôle) de la personne, affiché en second. Facultatif. */
  author?: string;
  /**
   * Proportions du cadre, au format CSS `aspect-ratio` (défaut : « 16 / 9 »).
   * À renseigner avec les VRAIES dimensions de la vidéo : un cadre qui ne
   * correspond pas ajoute des bandes noires. Aucun des témoignages fournis
   * n'est en 16/9 — ils sont soit verticaux (téléphone), soit en 4/3
   * (anciennes captures d'appel), d'où ce champ plutôt qu'un portrait/paysage.
   */
  ratio?: string;
}

/** Vidéo hébergée sur Vimeo — à préférer, surtout si le fichier est lourd. */
export interface VimeoTestimonial extends VideoBase {
  kind: "vimeo";
  /** Identifiant numérique, ex. « 1220657720 ». */
  id: string;
  /**
   * Hash de partage. OBLIGATOIRE ici : les vidéos du compte sont réglées sur
   * « masquée de Vimeo », et sans ce hash le lecteur refuse de démarrer.
   */
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

/** URL d'embed du player Vimeo (mêmes paramètres que les vidéos des tunnels). */
export function testimonialVimeoUrl(v: VimeoTestimonial): string {
  const params = new URLSearchParams({ title: "0", byline: "0", portrait: "0", dnt: "1" });
  if (v.hash) params.set("h", v.hash);
  return `https://player.vimeo.com/video/${v.id}?${params.toString()}`;
}
