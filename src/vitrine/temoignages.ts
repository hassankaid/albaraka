// ─────────────────────────────────────────────────────────────────────────
// Les 10 témoignages vidéo du carrousel.
//
// Le cahier les laisse « [à fournir par Sidali avec les liens Vimeo] ». En
// attendant, dix cartes de réserve reprennent la maquette : « [Prénom] » et
// « [Activité] », sans vidéo. Une carte sans `vimeoId` s'affiche mais ne se
// lit pas — on ne montre jamais un lecteur qui ne démarrerait pas.
//
// À terme (§5), la liste vit en base et se modifie depuis la plateforme, sans
// toucher au code. Cette liste-ci ne sera plus alors qu'un repli.
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
