// ─────────────────────────────────────────────────────────────────────────
// Les trois vidéos de nurturing d'avant-conférence.
//
// Elles sont envoyées par e-mail à J-5, J-3 et J-2 (séquences 21, 23 et 24 de
// `send-conference-mail`). Jusqu'ici le mail pointait sur un lien brut ; il
// pointe désormais sur ces pages, qui posent la vidéo dans le décor Al Baraka
// avec la date de la conférence et le passage à la suivante.
//
// Les accroches sont tirées des mails eux-mêmes, pas inventées : mail 21 « je
// veux me présenter », mail 23 « Ta sécurité est une illusion », mail 24 « Des
// musulmans comme toi ». Le visiteur retrouve le mot qui l'a fait cliquer.
//
// Identifiants, hash et durées lus dans l'API Vimeo le 23/09/2026. Le hash est
// OBLIGATOIRE — les vidéos du compte sont « masquées de Vimeo », sans lui le
// lecteur refuse de démarrer.
//
// ⚠️ Les trois vidéos autorisent `event.albarakaecosysteme.com` depuis le
// 23/09/2026. Ces pages ne sont servies que depuis ce domaine, et une vidéo
// non autorisée y renvoie 403 sans que ça se voie ailleurs.
// ─────────────────────────────────────────────────────────────────────────
import type { TunnelVariant } from "../variants";

export interface VideoNurturing {
  /** 1, 2 ou 3 — le numéro affiché et le chemin (/video-1…). */
  numero: 1 | 2 | 3;
  /** Libellé court de l'onglet, dans la barre des trois parties. */
  onglet: string;
  /** Le titre de la page, après « VIDÉO #N : ». */
  accroche: string;
  /**
   * La vignette de la barre des parties. URL du CDN Vimeo, relevée le
   * 23/09/2026 : elle ne porte pas de jeton daté, seulement l'empreinte de
   * l'image, donc elle ne périme pas. Elle change en revanche si la vidéo
   * est remplacée — un test vérifie que les trois répondent encore.
   */
  miniature: string;
  video: TunnelVariant;
}

export const VIDEOS: VideoNurturing[] = [
  {
    numero: 1,
    onglet: "Mon parcours",
    accroche: "Avant de t'en dire plus, je veux me présenter",
    miniature:
      "https://i.vimeocdn.com/video/2202994844-064652cbb5ae83672fa97ddfdb4c4b73ae15aab6f63b95fe9e106bd118f0c034-d_640x360",
    video: {
      key: "1",
      label: "Nurturing 1 — présentation",
      vimeoId: "1228532746",
      vimeoHash: "79e317f299",
    },
  },
  {
    numero: 2,
    onglet: "La vraie sécurité",
    accroche: "Ta sécurité est une illusion",
    miniature:
      "https://i.vimeocdn.com/video/2203006258-e544b19999d4db2c76d6cdcfba103c02635641a9f75f05e77f846b0d18446a6f-d_640x360",
    video: {
      key: "2",
      label: "Nurturing 2 — la compétence",
      vimeoId: "1228543782",
      vimeoHash: "9642eafb64",
    },
  },
  {
    numero: 3,
    onglet: "Leurs témoignages",
    accroche: "Des musulmans comme toi, et ce qui a changé pour eux",
    miniature:
      "https://i.vimeocdn.com/video/2203001329-916677d0da83053668a032169e75f262b207e2aa2fbdeb925aa14a997655c2c6-d_640x360",
    video: {
      key: "3",
      label: "Nurturing 3 — témoignages",
      vimeoId: "1228540094",
      vimeoHash: "cd8a34a5c6",
    },
  },
];

/** Le chemin public d'une vidéo. Utilisé par la barre et par le mail. */
export function cheminVideo(numero: number): string {
  return `/video-${numero}`;
}

export const BANDEAU = "Conférence exclusive";

/**
 * Une partie n'est ouverte que si le visiteur y est déjà passé.
 *
 * Les vidéos arrivent une par une, à J-5, J-3 puis J-2, et racontent une
 * histoire dans l'ordre. Sur la partie 1, les deux suivantes sont donc
 * grisées ; sur la partie 2, seule la troisième l'est. Revenir en arrière
 * reste possible — quelqu'un qui arrive par le mail J-2 n'a pas forcément vu
 * les précédentes.
 */
export function estOuverte(numero: number, courante: number): boolean {
  return numero <= courante;
}
