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

/** « 12 octobre » : date à laquelle l'élève a tourné un script. */
export const dateTournage = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

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

/**
 * Accroche affichée sur la carte : le début du script, au moins 40 caractères
 * (« Eh ! » tout seul ne dit rien du script).
 */
export function proposerAccroche(texte: string): string {
  const t = uniformiserTexte(texte).replace(/\n+/g, " ");
  const phrases = t.match(/[^.!?…]+[.!?…]+[»"”]?(\s|$)|[^.!?…]+$/g) ?? [t];
  let accroche = "";
  for (const ph of phrases) {
    accroche = `${accroche} ${ph.trim()}`.trim();
    if (accroche.length >= 40) break;
  }
  return couper(accroche, 160);
}

/** Espaces insécables de la typographie française : « » ? ! : ; ne restent pas seuls en bout de ligne. */
export function typographie(texte: string): string {
  return texte.replace(/« /g, "«\u00a0").replace(/ (»|[?!:;])/g, "\u00a0$1");
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

/**
 * La voix off part-elle toujours du script de la bibliothèque ? Oui si l'élève en a
 * gardé l'essentiel (au moins 60 % des mots) : retouches permises, texte réécrit non.
 */
export function memeScript(bibliotheque: string, final: string): boolean {
  const mots = (t: string) => new Set(normaliserRecherche(t).split(/[^a-z0-9']+/).filter((m) => m.length > 2));
  const a = mots(bibliotheque);
  if (a.size === 0) return false;
  const b = mots(final);
  let communs = 0;
  for (const m of a) if (b.has(m)) communs++;
  return communs / a.size >= 0.6;
}
