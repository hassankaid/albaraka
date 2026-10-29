// Studio, outil Voix off (cahier des charges de Sidali, section 3) : script, prompteur,
// enregistrement de la voix dans le navigateur.

export const SCRIPT_MAX = 5000;
/** Cahier : enregistrement de 3 minutes au plus. */
export const ENREGISTREMENT_MAX_S = 3 * 60;
/** Débit de lecture moyen à voix haute, pour estimer la durée d'un script. */
const MOTS_PAR_MINUTE = 150;

export const compterMots = (texte: string) => (texte.trim() ? texte.trim().split(/\s+/).length : 0);

/** Durée de lecture estimée d'un script, en secondes. */
export const secondesLecture = (texte: string) => Math.round((compterMots(texte) / MOTS_PAR_MINUTE) * 60);

/** « 1 min 20 » : durée de lecture estimée d'un script. */
export function dureeLecture(texte: string): string {
  const s = secondesLecture(texte);
  if (s < 60) return `${Math.max(s, 0)} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${String(r).padStart(2, "0")}` : `${m} min`;
}

export type NiveauMicro = "silence" | "faible" | "bon" | "fort";

/**
 * Niveau du micro à partir du volume (dBFS). « fort » : la voix sature (trop près ou
 * trop fort) ; « faible » : trop loin. Le cahier demande un indicateur qui passe au rouge.
 */
export function niveauMicro(dbfs: number): NiveauMicro {
  if (dbfs >= -3) return "fort";
  if (dbfs < -55) return "silence";
  if (dbfs < -38) return "faible";
  return "bon";
}

export const CONSEIL_NIVEAU: Record<NiveauMicro, string> = {
  silence: "Parle : on ne t'entend pas encore",
  faible: "Rapproche-toi du micro",
  bon: "Niveau parfait",
  fort: "Trop fort : éloigne un peu le micro",
};

/** dBFS d'un bloc d'échantillons (-1..1). */
export function dbfs(echantillons: ArrayLike<number>): number {
  let somme = 0;
  for (let i = 0; i < echantillons.length; i++) somme += echantillons[i] * echantillons[i];
  const rms = Math.sqrt(somme / Math.max(1, echantillons.length));
  return rms > 0 ? 20 * Math.log10(rms) : -100;
}

/** Format d'enregistrement : WebM/Opus (Chrome, Android), sinon MP4/AAC (Safari iPhone). */
export function formatEnregistrement(supporte: (type: string) => boolean): string {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"].find(supporte) ?? "";
}

/** Fichiers audio acceptés à l'import (enregistrement fait ailleurs, micro externe…). */
export const FORMATS_AUDIO = ["mp3", "m4a", "wav", "webm", "ogg", "aac", "mp4"];

export function verifierAudio(f: { name: string; size: number }): string | null {
  const ext = f.name.toLowerCase().split(".").pop() ?? "";
  if (!FORMATS_AUDIO.includes(ext)) return "Format non accepté : MP3, M4A, WAV, WebM ou OGG.";
  if (f.size > 200 * 1024 * 1024) return "Le fichier dépasse 200 Mo.";
  if (f.size === 0) return "Le fichier est vide.";
  return null;
}

/** « 1:05 » */
export const chrono = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
