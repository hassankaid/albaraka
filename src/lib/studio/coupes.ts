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

// ── La loupe de coupe (vocal de Sidali, 16/10/2026) ──────────────────────
// « Quand on sélectionne une coupe, un vrai zoom dessus, pour la décaler de quelques
// centièmes : soit on décale trop, soit pas assez. » Le montage est en 30 images par
// seconde et le moteur cale chaque passage sur une image : le plus petit pas qui
// change la vidéo est donc d'une image (1/30 s).

/** 72,43 → « 1:12,43 » (au centième, pour la loupe) */
export function minutagePrecis(t: number): string {
  const c = Math.round(Math.max(0, t) * 100);
  const m = Math.floor(c / 6000);
  return `${m}:${((c - m * 6000) / 100).toFixed(2).replace(".", ",").padStart(5, "0")}`;
}

/** Une image de la vidéo montée (30 i/s). */
export const IMAGE = 1 / 30;

/** Ramène un temps sur l'image la plus proche, comme le moteur. */
export const surImage = (t: number) => arrondi(Math.round(t / IMAGE) * IMAGE);

/** Le son, réduit à son niveau toutes les 10 ms, pour le dessiner et trouver où la voix s'arrête. */
export interface Enveloppe {
  /** niveau en dB par tranche de `pas` secondes, lissé sur 30 ms */
  db: Float32Array;
  pas: number;
  /** bruit de fond (10e centile) et voix forte (90e centile), en dB */
  bruit: number;
  voix: number;
}

function centile(valeurs: Float32Array, q: number): number {
  const tri = Float32Array.from(valeurs).sort();
  return tri[Math.floor((q / 100) * (tri.length - 1))] ?? -90;
}

export function enveloppe(echantillons: Float32Array, frequence: number, pas = 0.01): Enveloppe {
  const h = Math.max(1, Math.round(frequence * pas));
  const n = Math.floor(echantillons.length / h);
  const brut = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * h; j < (i + 1) * h; j++) s += echantillons[j] * echantillons[j];
    brut[i] = 20 * Math.log10(Math.sqrt(s / h) + 1e-9);
  }
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) db[i] = (brut[Math.max(0, i - 1)] + brut[i] + brut[Math.min(n - 1, i + 1)]) / 3;
  return { db, pas, bruit: n ? centile(db, 10) : -90, voix: n ? centile(db, 90) : -20 };
}

/** Le niveau du son à l'instant t, de 0 (bruit de fond) à 1 (voix forte), pour le dessin. */
export function niveau(env: Enveloppe, t: number): number {
  const v = env.db[Math.floor(t / env.pas)];
  if (v === undefined) return 0;
  return Math.max(0, Math.min(1, (v - env.bruit) / Math.max(1, env.voix - env.bruit)));
}

/** Seuil au-dessus duquel on entend encore la voix (fin de mot douce comprise). */
const seuilVoix = (env: Enveloppe) => Math.max(env.bruit + 10, env.voix - 25);

/** Silence franc : 80 ms d'affilée sous le seuil. */
const SILENCE = 0.08;
/** Marges gardées autour de la voix quand on cale un bord : un peu d'air, comme le moteur. */
export const MARGE_AVANT_VOIX = 0.08;
export const MARGE_APRES_VOIX = 0.12;

/**
 * « Caler sur la voix » : le bord d'un passage placé juste après la fin réelle de la voix
 * (bord « fin ») ou juste avant son début (bord « debut »), marge comprise, sur une image.
 * La recherche reste entre `min` et `max` (le passage voisin), à 0,6 s au plus du bord actuel.
 * Rend null s'il n'y a pas de voix près du bord.
 */
export function calerSurLaVoix(env: Enveloppe, bord: "debut" | "fin", t: number, min: number, max: number): number | null {
  const seuil = seuilVoix(env);
  const n = env.db.length;
  const f = (x: number) => Math.max(0, Math.min(n - 1, Math.round(x / env.pas)));
  const voisee = (k: number) => env.db[k] > seuil;
  const silencieux = (k: number, sens: 1 | -1) => {
    for (let j = 0; j < Math.round(SILENCE / env.pas); j++) {
      const x = k + sens * j;
      if (x < 0 || x >= n) return true;
      if (voisee(x)) return false;
    }
    return true;
  };
  const bas = f(Math.max(min, t - 0.6));
  const haut = f(Math.min(max, t + 0.6));
  let k = f(t);
  if (bord === "fin") {
    if (voisee(k)) {
      while (k < haut && !silencieux(k, 1)) k++; // la voix continue après le bord : on la suit
    } else {
      while (k > bas && !voisee(k)) k--; // le bord est dans un blanc : on revient à la voix
      if (!voisee(k)) return null;
      k++;
    }
    return Math.min(max, surImage(k * env.pas + MARGE_APRES_VOIX));
  }
  if (voisee(k)) {
    while (k > bas && !silencieux(k, -1)) k--;
  } else {
    while (k < haut && !voisee(k)) k++;
    if (!voisee(k)) return null;
  }
  return Math.max(min, surImage(k * env.pas - MARGE_AVANT_VOIX));
}

/** La coupe qui suit le passage n° i (i = -1 : la coupe du début de la vidéo). */
export function coupeApres(plages: Plage[], i: number, duree: number): Plage | null {
  const debut = i < 0 ? 0 : plages[i]?.[1];
  const fin = i + 1 < plages.length ? plages[i + 1][0] : duree;
  if (debut === undefined || fin - debut <= 0.001) return null;
  return [debut, fin];
}

/** Le passage qui précède une coupe (-1 si la coupe ouvre la vidéo). */
export function passageAvant(plages: Plage[], coupe: Plage): number {
  return plages.findIndex(([, b]) => Math.abs(b - coupe[0]) < 0.002);
}
