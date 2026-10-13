// Studio, bibliothèque de scripts vidéo (Sidali, 13/10/2026) : des scripts qui ont
// fait leurs preuves, que les membres suivent pour tourner leurs vidéos. Sidali les
// ajoute lui-même ; la bibliothèque doit rester lisible avec des centaines de scripts.

export interface ScriptStudio {
  id: string;
  titre: string;
  accroche: string | null;
  texte: string;
  theme_id: string | null;
  mis_en_avant: boolean;
  publie: boolean;
  created_at: string;
}

export const SCRIPTS_PAR_PAGE = 24;

/** Même normalisation que public.texte_recherche() : sans accents ni majuscules. */
export function normaliserRecherche(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/’/g, "'")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Mots de la recherche (chacun doit apparaître dans le script). */
export function motsRecherche(saisie: string): string[] {
  return normaliserRecherche(saisie)
    .split(" ")
    .map((m) => m.replace(/[%_\\,()]/g, ""))
    .filter((m) => m.length >= 2)
    .slice(0, 6);
}

/** Texte collé depuis un PDF, Word ou Google Docs, remis au propre. */
export function uniformiserTexte(brut: string): string {
  return brut
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function premierePhrase(texte: string): string {
  const t = uniformiserTexte(texte).replace(/\n+/g, " ");
  const m = t.match(/^(.+?[.!?…])(\s|$)/);
  return (m ? m[1] : t).trim();
}

function couper(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(" ");
  return `${coupe.slice(0, dernierEspace > max * 0.6 ? dernierEspace : max).trim()}…`;
}

/** Titre proposé quand Sidali n'en met pas : le début de la première phrase. */
export function proposerTitre(texte: string): string {
  return couper(premierePhrase(texte).replace(/[.!?…]+$/, ""), 60);
}

/** Accroche affichée sur la carte : la première phrase du script. */
export function proposerAccroche(texte: string): string {
  return couper(premierePhrase(texte), 160);
}

/**
 * Ajout en lot : plusieurs scripts collés d'un coup, séparés par une ligne « --- ».
 * Si la première ligne d'un bloc commence par « Titre : », elle devient le titre.
 */
export function decouperLot(brut: string): { titre: string; texte: string }[] {
  return `\n${uniformiserTexte(brut)}\n`
    .split(/\n-{3,}(?=\n)/)
    .map((bloc) => bloc.trim())
    .filter(Boolean)
    .map((bloc) => {
      const [premiere, ...reste] = bloc.split("\n");
      const titreExplicite = premiere.match(/^titre\s*:\s*(.+)$/i);
      const texte = titreExplicite ? reste.join("\n").trim() : bloc;
      return { titre: titreExplicite ? titreExplicite[1].trim() : proposerTitre(texte), texte };
    })
    .filter((s) => s.texte.length > 0);
}
