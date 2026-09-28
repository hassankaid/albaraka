// ─────────────────────────────────────────────────────────────────────────
// Les 10 témoignages vidéo du carrousel.
//
// Le cahier les laisse « [à fournir par Sidali avec les liens Vimeo] ». En
// attendant, dix cartes de réserve reprennent la maquette : « [Prénom] » et
// « [Activité] », sans vidéo. Une carte sans `vimeoId` s'affiche mais ne se
// lit pas — on ne montre jamais un lecteur qui ne démarrerait pas.
//
// La vraie liste vit en base (`temoignages_vitrine`) et se modifie depuis la
// plateforme, page « Site vitrine » de l'administration, sans toucher au code
// (cahier §5). Les cartes de réserve ne servent que tant qu'elle est vide.
//
// ⚠️ UNE VIDÉO NE SE LIT QUE SUR LES DOMAINES AUTORISÉS CÔTÉ VIMEO. Chaque
// vidéo est « masquée de Vimeo », intégrable sur liste blanche : il faudra y
// ajouter `albarakaecosysteme.com` et `www.albarakaecosysteme.com`, sinon le
// lecteur répond 403. Et le `hash` se lit dans `player_embed_url` (`?h=…`),
// jamais dans `link` — sans lui, le lecteur refuse aussi de démarrer.
// ─────────────────────────────────────────────────────────────────────────

export interface Temoignage {
  /** Identifiant numérique Vimeo. Absent : carte de réserve, non lisible. */
  vimeoId?: string;
  /** Le `h=` de l'URL d'intégration, obligatoire pour une vidéo masquée. */
  hash?: string;
  /** Miniature enregistrée à la saisie : la page ne contacte pas Vimeo avant le clic. */
  miniature?: string;
  prenom: string;
  activite: string;
}

export const TEMOIGNAGES_DE_RESERVE: Temoignage[] = Array.from({ length: 10 }, () => ({
  prenom: "[Prénom]",
  activite: "[Activité]",
}));

/**
 * L'adresse du lecteur, avec les paramètres exigés par le cahier (§5) :
 * `dnt=1` (aucun suivi), ni titre ni auteur ni portrait, lecture automatique
 * — le clic a déjà eu lieu — et lecture en ligne sur iPhone.
 */
export function urlLecteurVimeo(t: Temoignage): string | null {
  if (!t.vimeoId || !/^\d+$/.test(t.vimeoId)) return null;
  const p = new URLSearchParams();
  if (t.hash) p.set("h", t.hash);
  p.set("dnt", "1");
  p.set("title", "0");
  p.set("byline", "0");
  p.set("portrait", "0");
  p.set("autoplay", "1");
  p.set("playsinline", "1");
  return `https://player.vimeo.com/video/${t.vimeoId}?${p.toString()}`;
}

/**
 * Lit un lien Vimeo collé tel quel, sous toutes les formes qu'on copie en
 * pratique :
 *   https://vimeo.com/123456789/abcdef1234          (lien de partage, vidéo masquée)
 *   https://player.vimeo.com/video/123456789?h=abc   (lien d'intégration)
 *   https://vimeo.com/123456789                       (vidéo publique)
 *   123456789                                         (identifiant seul)
 * Renvoie `null` si l'identifiant est introuvable.
 */
export function lireLienVimeo(texte: string): { vimeoId: string; hash: string | null } | null {
  const t = texte.trim();
  if (/^\d{5,12}$/.test(t)) return { vimeoId: t, hash: null };
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return null;
  }
  if (!/(^|\.)vimeo\.com$/.test(url.hostname)) return null;
  const morceaux = url.pathname.split("/").filter(Boolean);
  const i = morceaux.findIndex((m) => /^\d{5,12}$/.test(m));
  if (i < 0) return null;
  const hashChemin = morceaux[i + 1] && /^[0-9a-f]{6,20}$/.test(morceaux[i + 1]) ? morceaux[i + 1] : null;
  const hashParam = url.searchParams.get("h");
  const hash = hashParam && /^[0-9a-f]{6,20}$/.test(hashParam) ? hashParam : hashChemin;
  return { vimeoId: morceaux[i], hash };
}

/**
 * Les témoignages publiés, lus avec la clé publique (le site n'est pas
 * connecté ; la table n'expose que les lignes visibles). En cas d'échec ou de
 * liste vide, le carrousel garde ses cartes de réserve.
 */
export async function lireTemoignagesPublies(url: string, cle: string): Promise<Temoignage[]> {
  const res = await fetch(
    `${url}/rest/v1/temoignages_vitrine?select=vimeo_id,hash,miniature,prenom,activite&visible=eq.true&order=ordre.asc,created_at.asc`,
    { headers: { apikey: cle, Authorization: `Bearer ${cle}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const lignes = (await res.json()) as {
    vimeo_id: string;
    hash: string | null;
    miniature: string | null;
    prenom: string;
    activite: string;
  }[];
  return lignes.map((l) => ({
    vimeoId: l.vimeo_id,
    hash: l.hash ?? undefined,
    miniature: l.miniature ?? undefined,
    prenom: l.prenom,
    activite: l.activite,
  }));
}
