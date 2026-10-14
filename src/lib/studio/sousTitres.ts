// Studio : « Corriger les sous-titres » (demande de Sidali, 14/10/2026).
//
// Les sous-titres de l'IA restent dans travail.json ; l'élève enregistre ses corrections
// dans ses réglages (sous_titres.corrections), appliquées à chaque rendu :
//   - une correction vise le sous-titre de l'IA qui a exactement le même texte ;
//   - un mot corrigé (4 lettres et plus) est corrigé partout où il réapparaît, y compris
//     quand les sous-titres ont été regroupés après un changement de coupes.
// Même logique côté machine : studio/corrections.py (les deux doivent rester identiques).

export interface SousTitre {
  small: string;
  big: string;
  start: number;
  end: number;
}

export interface CorrectionSousTitre {
  /** Texte de l'IA visé (petite ligne et mot clé). */
  small_ia: string;
  big_ia: string;
  /** Texte voulu par l'élève. */
  small: string;
  big: string;
}

export const MAX_PETIT = 90;
export const MAX_GRAND = 40;
export const MAX_CORRECTIONS = 400;
const PONCTUATION = new Set(Array.from(".,;:!?«»\"'’()…-"));

// eslint-disable-next-line no-control-regex
const INTERDITS = /[{}\\<>\u0000-\u001f\u007f]/g;

/** Texte saisi → texte sûr pour les sous-titres (pas de balise ni de saut de ligne). */
export function nettoyer(texte: string | null | undefined, longueur: number): string {
  const t = String(texte ?? "")
    .replace(INTERDITS, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(t).slice(0, longueur).join("").trim();
}

const cle = (petit: string | null | undefined, grand: string | null | undefined) =>
  `${String(petit ?? "").trim()}\u0000${String(grand ?? "").trim()}`;

/** « (Sidaly), » → ["(", "Sidaly", "),"] */
function coeur(mot: string): [string, string, string] {
  const c = Array.from(mot);
  let debut = 0;
  while (debut < c.length && PONCTUATION.has(c[debut])) debut++;
  let fin = c.length;
  while (fin > debut && PONCTUATION.has(c[fin - 1])) fin--;
  if (fin <= debut) return [mot, "", ""];
  return [c.slice(0, debut).join(""), c.slice(debut, fin).join(""), c.slice(fin).join("")];
}

const mots = (t: string) => t.split(/\s+/).filter(Boolean);

export function correctionsValides(corrections: unknown): CorrectionSousTitre[] {
  if (!Array.isArray(corrections)) return [];
  return corrections
    .slice(0, MAX_CORRECTIONS)
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && !Array.isArray(c))
    .map((c) => ({
      small_ia: String(c.small_ia ?? ""),
      big_ia: String(c.big_ia ?? ""),
      small: nettoyer(c.small as string, MAX_PETIT),
      big: nettoyer(c.big as string, MAX_GRAND),
    }));
}

/** Mots changés un pour un ({ sidaly: "Sidali" }) ; un mot corrigé de deux façons est ignoré. */
export function motsCorriges(corrections: CorrectionSousTitre[]): Map<string, string> {
  const vus = new Map<string, Set<string>>();
  for (const c of corrections) {
    const avant = mots(`${c.small_ia} ${c.big_ia}`);
    const apres = mots(`${c.small} ${c.big}`);
    if (avant.length !== apres.length) continue;
    avant.forEach((a, i) => {
      const ca = coeur(a)[1];
      const ka = ca.toLowerCase();
      const cb = coeur(apres[i])[1];
      if (Array.from(ka).length >= 4 && cb && ca !== cb) {
        if (!vus.has(ka)) vus.set(ka, new Set());
        vus.get(ka)!.add(cb);
      }
    });
  }
  const carte = new Map<string, string>();
  for (const [k, v] of vus) if (v.size === 1) carte.set(k, [...v][0]);
  return carte;
}

export function remplacerMots(texte: string, carte: Map<string, string>): string {
  if (!carte.size || !texte) return texte;
  return texte
    .split(" ")
    .map((mot) => {
      const [avant, c, apres] = coeur(mot);
      const voulu = c ? carte.get(c.toLowerCase()) : undefined;
      return voulu !== undefined ? avant + voulu + apres : mot;
    })
    .join(" ");
}

/** Sous-titres de l'IA + corrections de l'élève → sous-titres de la vidéo (mêmes temps). */
export function appliquer(sousTitres: SousTitre[], corrections: unknown): SousTitre[] {
  const valides = correctionsValides(corrections);
  if (!valides.length) return sousTitres.map((c) => ({ ...c }));
  const exactes = new Map(valides.map((c) => [cle(c.small_ia, c.big_ia), c]));
  const carte = motsCorriges(valides);
  return sousTitres.map((c) => {
    const k = exactes.get(cle(c.small, c.big));
    if (k && (k.small || k.big)) return { ...c, small: k.small, big: k.big };
    return { ...c, small: remplacerMots(c.small ?? "", carte), big: remplacerMots(c.big ?? "", carte) };
  });
}

/** La correction (brute, telle que saisie) qui vise ce sous-titre de l'IA, s'il y en a une. */
export function correctionDe(ia: SousTitre, corrections: CorrectionSousTitre[]): CorrectionSousTitre | undefined {
  const k = cle(ia.small, ia.big);
  return corrections.find((c) => cle(c.small_ia, c.big_ia) === k);
}

/** L'élève modifie un sous-titre : sa correction remplace la précédente (ou disparaît si le texte revient à celui de l'IA). */
export function corriger(
  corrections: CorrectionSousTitre[],
  ia: SousTitre,
  texte: { small: string; big: string },
): CorrectionSousTitre[] {
  const k = cle(ia.small, ia.big);
  const autres = corrections.filter((c) => cle(c.small_ia, c.big_ia) !== k);
  if (cle(texte.small, texte.big) === k) return autres;
  return [...autres, { small_ia: ia.small, big_ia: ia.big, small: texte.small, big: texte.big }];
}

/** À enregistrer : corrections nettoyées, seulement celles qui visent un sous-titre de la vidéo et changent quelque chose. */
export function corrigesAEnregistrer(sousTitres: SousTitre[], corrections: CorrectionSousTitre[]): CorrectionSousTitre[] {
  const presents = new Set(sousTitres.map((c) => cle(c.small, c.big)));
  return correctionsValides(corrections).filter(
    (c) => presents.has(cle(c.small_ia, c.big_ia)) && cle(c.small, c.big) !== cle(c.small_ia, c.big_ia),
  );
}

/** Corrections enregistrées qui ne visent plus aucun sous-titre (regroupés après un changement de coupes). */
export function corrigesOrphelins(sousTitres: SousTitre[], corrections: unknown): number {
  const presents = new Set(sousTitres.map((c) => cle(c.small, c.big)));
  return correctionsValides(corrections).filter((c) => !presents.has(cle(c.small_ia, c.big_ia))).length;
}

/** Sous-titre affiché au temps t (le dernier commencé). */
export function indexAuTemps(sousTitres: SousTitre[], t: number): number {
  let i = -1;
  for (let k = 0; k < sousTitres.length; k++) {
    if (sousTitres[k].start <= t + 0.01) i = k;
    else break;
  }
  return i >= 0 && t <= sousTitres[i].end + 0.05 ? i : -1;
}

/** Un sous-titre doit garder du texte (petite ligne ou mot clé). */
export const sousTitreVide = (t: { small: string; big: string }) => !nettoyer(t.small, MAX_PETIT) && !nettoyer(t.big, MAX_GRAND);
