// Logique pure de la préparation Vimeo des témoignages du site vitrine.
// Séparée de index.ts pour être testée depuis vitest (src/lib/vimeoTemoignages.test.ts).

/**
 * Les domaines où le lecteur doit s'ouvrir. Une vidéo fraîchement versée sur
 * Vimeo n'autorise que plateforme. et view. : sans le domaine du site, le
 * visiteur voit « changez les paramètres de confidentialité ».
 * plateforme. sert l'aperçu /site-vitrine.
 *
 * ⚠️ Vimeo range « www.albarakaecosysteme.com » sous « albarakaecosysteme.com »,
 * et cette entrée couvre les deux adresses (vérifié le 29/09/2026 : lecteur 200
 * depuis www.). Un « www. » ne figure donc jamais dans la liste relue : le
 * comparer tel quel ferait croire, à chaque passage, qu'il manque.
 */
export const DOMAINES_SITE = ["albarakaecosysteme.com", "plateforme.albarakaecosysteme.com"];

const normaliser = (d: string) => d.trim().toLowerCase().replace(/^www\./, "");

/** Le hash d'une vidéo masquée n'est PAS dans `link` : il est dans `player_embed_url`, sous `?h=`. */
export function extraireHash(playerEmbedUrl: string | null | undefined): string | null {
  if (!playerEmbedUrl) return null;
  const m = /[?&]h=([0-9a-f]{6,20})\b/.exec(playerEmbedUrl);
  return m ? m[1] : null;
}

/** Les domaines du site qui manquent à la liste blanche d'une vidéo (insensible à la casse). */
export function domainesManquants(autorises: string[]): string[] {
  const deja = new Set(autorises.map(normaliser));
  return DOMAINES_SITE.filter((d) => !deja.has(normaliser(d)));
}

/** La miniature 640 px la plus proche, sur le CDN de Vimeo uniquement. */
export function choisirMiniature(
  tailles: { width: number; link: string }[] | null | undefined,
): string | null {
  const sur = (tailles ?? []).filter((t) => t.link?.startsWith("https://i.vimeocdn.com/"));
  if (!sur.length) return null;
  sur.sort((a, b) => Math.abs(a.width - 640) - Math.abs(b.width - 640));
  return sur[0].link;
}

/** Les vidéos utilisées par plusieurs témoignages : presque toujours un lien collé deux fois. */
export function doublons(lignes: { vimeo_id: string; prenom: string }[]): Record<string, string[]> {
  const parVideo: Record<string, string[]> = {};
  for (const l of lignes) (parVideo[l.vimeo_id] ??= []).push(l.prenom);
  return Object.fromEntries(Object.entries(parVideo).filter(([, p]) => p.length > 1));
}
