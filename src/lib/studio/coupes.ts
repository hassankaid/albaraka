// Studio : vérification des coupes (vocal de Sidali, 12/10/2026). « L'IA coupe tous
// les blancs, parfois trop vite : on veut voir ce qui a été coupé et pouvoir
// prolonger un passage avec un curseur, comme dans un logiciel de montage. »
//
// Une plage = un passage GARDÉ de la vidéo d'origine, en secondes [début, fin].
// Les coupes sont les trous entre les plages. Le moteur reçoit les plages telles
// quelles (réglage coupes.plages) et refait le montage sans refaire la transcription.

export type Plage = [number, number];

/** Plus court passage gardé : en dessous, la poignée ne peut plus réduire. */
export const PLAGE_MIN = 0.1;

export interface MotTravail {
  text: string;
  start: number;
  end: number;
}

/** Ce que la machine a gardé de la préparation (travail.json) et qui sert ici. */
export interface TravailCoupes {
  /** audio_seul : Voix off (la voix seule, sans image) */
  meta: { duration: number; audio_seul?: boolean };
  coupes: Plage[];
  mots: MotTravail[];
  retires: number[];
  retires_ia?: number[];
  rythme?: string;
  plages?: Plage[] | null;
  duree_sortie: number;
  apercu_video?: boolean;
}

const arrondi = (t: number) => Math.round(t * 1000) / 1000;

/** Plages triées, bornées à la vidéo, sans chevauchement ni passage trop court. */
export function normaliser(plages: Plage[], duree: number): Plage[] {
  const triees = plages
    .map(([a, b]) => [Math.max(0, Math.min(a, b)), Math.min(duree, Math.max(a, b))] as Plage)
    .filter(([a, b]) => b - a >= PLAGE_MIN)
    .sort((x, y) => x[0] - y[0]);
  const out: Plage[] = [];
  for (const [a, b] of triees) {
    const der = out[out.length - 1];
    if (der && a <= der[1]) der[1] = Math.max(der[1], b);
    else out.push([a, b]);
  }
  return out.map(([a, b]) => [arrondi(a), arrondi(b)]);
}

/** Les coupes (trous entre les passages gardés), début et fin de vidéo compris. */
export function coupesEntre(plages: Plage[], duree: number): Plage[] {
  const out: Plage[] = [];
  let t = 0;
  for (const [a, b] of plages) {
    if (a - t > 0.001) out.push([t, a]);
    t = b;
  }
  if (duree - t > 0.001) out.push([t, duree]);
  return out;
}

/** « Garder ce passage » : la coupe est remise, les deux passages voisins se rejoignent. */
export function garderCoupe(plages: Plage[], coupe: Plage, duree: number): Plage[] {
  return normaliser([...plages, coupe], duree);
}

/**
 * Déplace le début ou la fin du passage n° i (poignée). Le passage ne peut ni
 * passer sous PLAGE_MIN, ni dépasser la vidéo ; s'il touche son voisin, ils fusionnent.
 */
export function deplacerBord(plages: Plage[], i: number, bord: "debut" | "fin", t: number, duree: number): Plage[] {
  const p = plages[i];
  if (!p) return plages;
  const copie = plages.map((x) => [...x] as Plage);
  if (bord === "debut") copie[i][0] = Math.max(0, Math.min(t, p[1] - PLAGE_MIN));
  else copie[i][1] = Math.min(duree, Math.max(t, p[0] + PLAGE_MIN));
  return normaliser(copie, duree);
}

export const dureeGardee = (plages: Plage[]) => plages.reduce((s, [a, b]) => s + (b - a), 0);

/** Lecture « comme le montage » : où reprendre si t tombe dans une coupe (null = fin). */
export function tempsDeLecture(t: number, plages: Plage[]): number | null {
  for (const [a, b] of plages) {
    if (t < a - 0.02) return a;
    if (t < b - 0.02) return t;
  }
  return null;
}

/** Les mêmes plages ? (au millième, pour savoir si l'élève a changé quelque chose) */
export function memesPlages(x: Plage[] | null | undefined, y: Plage[] | null | undefined): boolean {
  if (!x || !y) return !x && !y;
  return x.length === y.length && x.every(([a, b], i) => Math.abs(a - y[i][0]) < 0.002 && Math.abs(b - y[i][1]) < 0.002);
}

/** Ce que la coupe enlève : une phrase recommencée (mots retirés par l'IA) ou un blanc. */
/** Whisper coupe « C'est » en « C » + « 'est » et « Nourris-les » en « Nourris » + « -les » :
 * à l'affichage, on recolle apostrophes et traits d'union. */
export function joindre(mots: string[]): string {
  return mots
    .join(" ")
    .replace(/\s+(?=['’-])/g, "")
    .replace(/(['’])\s+/g, "$1")
    .trim();
}

/** Les mots de la frise, recollés de la même façon (le premier garde le début, le dernier la fin). */
export function motsAffiches<M extends MotTravail>(mots: M[]): M[] {
  const out: M[] = [];
  for (const m of mots) {
    const avant = out[out.length - 1];
    if (avant && (/^['’-]/.test(m.text.trim()) || /['’]$/.test(avant.text.trim()))) {
      out[out.length - 1] = { ...avant, text: joindre([avant.text, m.text]), end: m.end };
    } else out.push({ ...m });
  }
  return out;
}

export function natureCoupe(coupe: Plage, travail: Pick<TravailCoupes, "mots" | "retires">): {
  phraseRatee: boolean;
  avant: string;
  apres: string;
  mots: string;
} {
  const retires = new Set(travail.retires);
  const dedans = travail.mots
    .map((m, i) => ({ ...m, i }))
    .filter((m) => (m.start + m.end) / 2 >= coupe[0] && (m.start + m.end) / 2 <= coupe[1]);
  const avant = joindre(travail.mots.filter((m) => m.end <= coupe[0] + 0.05).slice(-3).map((m) => m.text));
  const apres = joindre(travail.mots.filter((m) => m.start >= coupe[1] - 0.05).slice(0, 3).map((m) => m.text));
  return {
    phraseRatee: dedans.some((m) => retires.has(m.i)),
    avant,
    apres,
    mots: joindre(dedans.map((m) => m.text)),
  };
}

/** 72,4 → « 1:12,4 » */
export function minutage(t: number): string {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const reste = (s - m * 60).toFixed(1).replace(".", ",");
  return `${m}:${reste.padStart(4, "0")}`;
}
