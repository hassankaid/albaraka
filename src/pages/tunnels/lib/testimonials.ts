// ─────────────────────────────────────────────────────────────────────────
// Témoignages — types partagés.
//
// Deux pages les affichent : la vitrine `/temoignages` et la section « Ils
// l'ont fait avant toi » de la landing des tunnels. Elles montrent en partie
// les MÊMES vidéos, avec des légendes différentes — d'où un socle commun ici
// plutôt qu'une dépendance de la landing au dossier de la page témoignages.
// ─────────────────────────────────────────────────────────────────────────

/** Capture d'écran d'un avis écrit (WhatsApp, DM, mail…). */
export interface CaptureTestimonial {
  kind: "capture";
  /** URL publique de l'image. */
  src: string;
  /** Légende affichée sous la capture, comme pour une vidéo. */
  title: string;
  /**
   * Description longue pour les lecteurs d'écran, et texte de repli si
   * l'image ne charge pas. Par défaut, la légende.
   */
  alt?: string;
  /**
   * Proportions réelles de l'image, au format CSS `aspect-ratio`. Sert à
   * répartir les tuiles entre les colonnes AVANT que l'image ne soit chargée.
   */
  ratio?: string;
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

/**
 * Un témoignage, quelle que soit sa forme. La page les présente dans UN SEUL
 * mur : séparer « avis écrits » et « vidéos » catégorisait la preuve au lieu
 * de la montrer, et laissait deux sections inégales.
 */
export type Testimonial = CaptureTestimonial | VideoTestimonial;

/** Clé de rendu stable, quelle que soit la forme du témoignage. */
export function testimonialKey(t: Testimonial): string {
  return t.kind === "vimeo" ? `vimeo:${t.id}` : `${t.kind}:${t.src}`;
}

/** URL d'embed du player Vimeo (mêmes paramètres que les vidéos des tunnels). */
export function testimonialVimeoUrl(v: VimeoTestimonial): string {
  const params = new URLSearchParams({ title: "0", byline: "0", portrait: "0", dnt: "1" });
  if (v.hash) params.set("h", v.hash);
  return `https://player.vimeo.com/video/${v.id}?${params.toString()}`;
}

/**
 * Hauteur d'une tuile, en multiples de la largeur de colonne. Sert uniquement
 * à répartir : une valeur approchée suffit, elle n'impose rien au rendu.
 */
export function hauteurRelative(t: Testimonial): number {
  const [l, h] = (t.ratio ?? "16 / 9").split("/").map((n) => Number(n.trim()));
  const media = l > 0 && h > 0 ? h / l : 9 / 16;
  // La légende ajoute deux lignes environ, quelle que soit la largeur.
  return media + 0.22;
}

/**
 * Répartit les témoignages entre N colonnes, en équilibrant leurs hauteurs.
 *
 * Les colonnes CSS (`column-count`) ne savent pas faire : avec des tuiles
 * hautes et insécables, elles laissaient la 3e colonne s'arrêter 722 px avant
 * les autres — mesuré sur le build de production, un grand vide en bas à
 * droite. Ici les hauteurs sont connues d'avance (chaque tuile déclare ses
 * proportions), donc la répartition est calculable.
 *
 * Deux temps : on remplit d'abord dans l'ordre déclaré, chaque tuile allant
 * dans la colonne la plus courte ; puis on déplace des tuiles de la colonne la
 * plus haute vers la plus basse tant que ça réduit l'écart. Le simple
 * remplissage glouton ne suffisait pas — sur le contenu réel à 2 colonnes, il
 * laissait encore un écart supérieur à la plus petite tuile.
 *
 * L'ordre déclaré est conservé À L'INTÉRIEUR de chaque colonne, pour que
 * l'alternance captures / vidéos reste lisible.
 */
export function repartirEnColonnes(items: Testimonial[], colonnes: number): Testimonial[][] {
  const n = Math.max(1, Math.floor(colonnes));
  if (n === 1) return [[...items]];

  const poids = items.map(hauteurRelative);
  const cols: number[][] = Array.from({ length: n }, () => []);
  const hauteurs = new Array<number>(n).fill(0);

  const plusBasse = () => hauteurs.reduce((min, h, i) => (h < hauteurs[min] ? i : min), 0);
  const plusHaute = () => hauteurs.reduce((max, h, i) => (h > hauteurs[max] ? i : max), 0);

  items.forEach((_, i) => {
    const c = plusBasse();
    cols[c].push(i);
    hauteurs[c] += poids[i];
  });

  // Passe d'amélioration : borne haute large, la boucle s'arrête d'elle-même
  // dès qu'aucun déplacement ne réduit l'écart.
  for (let tour = 0; tour < 100; tour++) {
    const haute = plusHaute();
    const basse = plusBasse();
    if (haute === basse) break;
    const ecart = hauteurs[haute] - hauteurs[basse];
    // Déplacer une tuile change les deux colonnes de son poids : elle n'aide
    // que si son poids est strictement inférieur à l'écart.
    let choix = -1;
    for (const i of cols[haute]) {
      if (poids[i] < ecart && (choix === -1 || poids[i] > poids[choix])) choix = i;
    }
    if (choix !== -1) {
      cols[haute].splice(cols[haute].indexOf(choix), 1);
      cols[basse].push(choix);
      hauteurs[haute] -= poids[choix];
      hauteurs[basse] += poids[choix];
      continue;
    }

    // Aucun déplacement possible : la colonne haute peut n'être faite que de
    // grandes tuiles. On tente alors un ÉCHANGE — une grande contre une
    // petite — qui rapproche les deux colonnes sans en vider aucune.
    let meilleur: [number, number] | null = null;
    let meilleurEcart = ecart;
    for (const i of cols[haute]) {
      for (const j of cols[basse]) {
        const apres = Math.abs(ecart - 2 * (poids[i] - poids[j]));
        if (poids[i] > poids[j] && apres < meilleurEcart) {
          meilleurEcart = apres;
          meilleur = [i, j];
        }
      }
    }
    if (!meilleur) break;
    const [i, j] = meilleur;
    cols[haute][cols[haute].indexOf(i)] = j;
    cols[basse][cols[basse].indexOf(j)] = i;
    hauteurs[haute] += poids[j] - poids[i];
    hauteurs[basse] += poids[i] - poids[j];
  }

  return cols.map((col) => col.sort((a, b) => a - b).map((i) => items[i]));
}
