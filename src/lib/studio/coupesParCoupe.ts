// « Ajuster les coupes », coupe par coupe (retour de Sidali du 20/10/2026, maquette validée :
// A oui · B vidéo finale · C réunir · D les deux pas).
//
// Pour l'élève, une « coupe » est un morceau GARDÉ de la vidéo finale, numéroté 1, 2, 3…
// (dans le code : une plage). La bande d'ensemble montre la vidéo finale : les coupes bout
// à bout, sans les parties retirées. On y repère la coupe à corriger, puis on règle son
// début et sa fin en plein écran.
import { joindre, natureCoupe, type MotTravail, type Plage, type TravailCoupes } from "@/lib/studio/coupes";

/** Où commence chaque coupe dans la vidéo finale (secondes). */
export function debutsDansLeMontage(plages: Plage[]): number[] {
  const out: number[] = [];
  let t = 0;
  for (const [a, b] of plages) {
    out.push(t);
    t += b - a;
  }
  return out;
}

/**
 * La coupe qu'on entend à l'instant `t` de la vidéo d'origine : celle qui le contient,
 * sinon la suivante (on est dans une partie retirée, la lecture saute à elle), sinon la dernière.
 */
export function coupeA(plages: Plage[], t: number): number {
  if (!plages.length) return -1;
  for (let i = 0; i < plages.length; i++) {
    if (t < plages[i][1] - 0.001) return i;
  }
  return plages.length - 1;
}

/** Temps de la vidéo d'origine → temps de la vidéo finale. */
export function versMontage(plages: Plage[], t: number): number {
  const i = coupeA(plages, t);
  if (i < 0) return 0;
  const debuts = debutsDansLeMontage(plages);
  const [a, b] = plages[i];
  return debuts[i] + Math.max(0, Math.min(b - a, t - a));
}

/** Temps de la vidéo finale → temps de la vidéo d'origine (pour le curseur qu'on glisse). */
export function versSource(plages: Plage[], x: number): number {
  if (!plages.length) return 0;
  const debuts = debutsDansLeMontage(plages);
  for (let i = plages.length - 1; i >= 0; i--) {
    if (x >= debuts[i]) {
      const [a, b] = plages[i];
      return Math.min(b, a + (x - debuts[i]));
    }
  }
  return plages[0][0];
}

/** Les mots qu'on entend dans une coupe (milieu du mot dans la plage). */
export function motsDeLaCoupe(mots: MotTravail[], [a, b]: Plage): string[] {
  return mots.filter((m) => (m.start + m.end) / 2 >= a && (m.start + m.end) / 2 <= b).map((m) => m.text);
}

/** « premiers mots … derniers mots » pour la liste (tout le texte s'il est court). */
export function resumeCoupe(mots: string[], n = 4): string {
  if (mots.length <= 2 * n + 1) return joindre(mots);
  return `${joindre(mots.slice(0, n))} … ${joindre(mots.slice(-n))}`;
}

/** Une phrase recommencée a-t-elle été retirée juste avant ou juste après cette coupe ? */
export function phrasesRetireesAutour(
  plages: Plage[],
  i: number,
  travail: Pick<TravailCoupes, "mots" | "retires">,
  duree: number,
): { avant: boolean; apres: boolean } {
  const trouAvant: Plage = [i === 0 ? 0 : plages[i - 1][1], plages[i][0]];
  const trouApres: Plage = [plages[i][1], i + 1 < plages.length ? plages[i + 1][0] : duree];
  const ratee = (trou: Plage) => trou[1] - trou[0] > 0.03 && natureCoupe(trou, travail).phraseRatee;
  return { avant: ratee(trouAvant), apres: ratee(trouApres) };
}

/**
 * Après un réglage : quelle coupe garder ouverte, et deux coupes ont-elles été réunies
 * (décision C de Sidali) ? `ancre` est un instant de la coupe ouverte avant le réglage.
 */
export function apresReglage(avant: Plage[], apres: Plage[], ancre: number): { coupe: number; reunies: boolean } {
  return { coupe: Math.max(0, coupeA(apres, ancre)), reunies: apres.length < avant.length };
}

/**
 * Supprimer une coupe entière (demande de Sidali du 23/10/2026) : son passage rejoint les
 * parties retirées. La dernière coupe ne se supprime pas : une vidéo vide n'existe pas.
 */
export function supprimerCoupe(plages: Plage[], i: number): Plage[] {
  if (plages.length <= 1 || i < 0 || i >= plages.length) return plages;
  return plages.filter((_, k) => k !== i);
}

/** Marge gardée autour d'un mot quand le point de coupe lâché dedans est ramené au bord. */
export const MARGE_MOT = 0.05;

/**
 * Le point de coupe lâché à la main ne coupe jamais un mot en deux : s'il tombe dans un
 * mot, il est ramené au bord le plus proche de ce mot (le mot est gardé entier ou retiré
 * entier). Les boutons « 1 image / 0,1 s » restent exacts : c'est le réglage fin.
 */
export function horsDesMots(mots: MotTravail[], t: number): number {
  const m = mots.find((x) => t > x.start + 0.01 && t < x.end - 0.01);
  if (!m) return t;
  const avant = Math.max(0, m.start - MARGE_MOT);
  const apres = m.end + MARGE_MOT;
  return t - m.start <= m.end - t ? avant : apres;
}

/** « 0:27 » (vidéo finale, à la seconde) */
export function minute(t: number): string {
  const s = Math.max(0, Math.round(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
