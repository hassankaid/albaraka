// Studio vidéo (cahier des charges de Sidali du 29/09/2026) : réglages de
// l'élève, valeurs par défaut et libellés. Tout le reste (format, polices,
// position des sous-titres, coupes…) est imposé dans le moteur.

export type StyleFlou = "flou" | "mosaique" | "verre" | "marqueur" | "sticker" | "neon";
export type NiveauSon = "leger" | "normal" | "fort";

export interface Reglages {
  son: { ameliorer: boolean; niveau: NiveauSon };
  sous_titres: { texte: string; contour: string; ombre: string };
  visage: { flouter: boolean; style: StyleFlou; couleur: string; intensite: number; intensite_couleur: number };
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
  son: { ameliorer: true, niveau: "normal" },
  sous_titres: { texte: "#FFFFFF", contour: "#000000", ombre: "#000000" },
  visage: { flouter: false, style: "flou", couleur: "#C9A45C", intensite: 3, intensite_couleur: 3 },
};

/** Les 10 teintes proposées partout où l'élève choisit une couleur. */
export const PALETTE: { nom: string; hex: string }[] = [
  { nom: "Blanc", hex: "#FFFFFF" },
  { nom: "Noir", hex: "#000000" },
  { nom: "Or", hex: "#C9A45C" },
  { nom: "Crème", hex: "#FFE9B0" },
  { nom: "Jaune", hex: "#FACC15" },
  { nom: "Émeraude", hex: "#10B981" },
  { nom: "Bleu", hex: "#3B82F6" },
  { nom: "Rose", hex: "#F4A6B8" },
  { nom: "Rouge", hex: "#E11D48" },
  { nom: "Violet", hex: "#8B5CF6" },
];

export const STYLES_FLOU: { id: StyleFlou; nom: string; description: string }[] = [
  { id: "flou", nom: "Flou", description: "Flou doux teinté" },
  { id: "mosaique", nom: "Mosaïque", description: "Gros pixels colorés" },
  { id: "verre", nom: "Verre dépoli", description: "Ovale translucide avec reflet" },
  { id: "marqueur", nom: "Marqueur", description: "Coups de feutre" },
  { id: "sticker", nom: "Sticker", description: "Pastille pleine, contour blanc" },
  { id: "neon", nom: "Néon", description: "Visage assombri, anneau lumineux" },
];

export const NIVEAUX_SON: { id: NiveauSon; nom: string }[] = [
  { id: "leger", nom: "Léger" },
  { id: "normal", nom: "Normal" },
  { id: "fort", nom: "Fort" },
];

/** Étapes affichées sur l'écran d'attente, dans l'ordre. */
export const ETAPES: { id: string; nom: string }[] = [
  { id: "reception", nom: "Réception de la vidéo" },
  { id: "son", nom: "Nettoyage du son" },
  { id: "transcription", nom: "Transcription" },
  { id: "phrases_ratees", nom: "Repérage des phrases ratées" },
  { id: "coupes", nom: "Coupe des blancs" },
  { id: "montage", nom: "Montage" },
  { id: "sous_titres", nom: "Sous-titres" },
  { id: "floutage", nom: "Floutage du visage" },
  { id: "incrustation", nom: "Incrustation des sous-titres" },
  { id: "envoi", nom: "Finalisation" },
];

export type Statut = "import" | "preparation" | "pret" | "en_cours" | "termine" | "erreur";

export interface Montage {
  id: string;
  user_id: string;
  outil: "face_camera" | "voix_off";
  statut: Statut;
  etape: string | null;
  lance: boolean;
  reglages: Partial<Reglages>;
  source_nom: string | null;
  source_path: string | null;
  travail_pret: boolean;
  audio_prepare: string | null;
  apercu: { t: number; visages: number[][]; fichier?: string } | null;
  version: number;
  sortie_path: string | null;
  rapport: Record<string, unknown> | null;
  erreur: string | null;
  signalement: string | null;
  created_at: string;
  updated_at: string;
  termine_le: string | null;
  expire_le: string;
}

/** Réglages complets à partir de ce qui est enregistré (champs manquants = défaut). */
export function completerReglages(r: Partial<Reglages> | null | undefined): Reglages {
  return {
    son: { ...REGLAGES_PAR_DEFAUT.son, ...(r?.son ?? {}) },
    sous_titres: { ...REGLAGES_PAR_DEFAUT.sous_titres, ...(r?.sous_titres ?? {}) },
    visage: { ...REGLAGES_PAR_DEFAUT.visage, ...(r?.visage ?? {}) },
  };
}

/** Étapes réellement parcourues : le floutage n'apparaît que s'il est demandé. */
export function etapesDuMontage(reglages: Partial<Reglages> | null | undefined) {
  const flouter = completerReglages(reglages).visage.flouter;
  return ETAPES.filter((e) => e.id !== "floutage" || flouter);
}

/** Clé du réglage du son, comme la calcule la base (studio_lancer). */
export function cleSon(reglages: Partial<Reglages> | null | undefined): string {
  const s = completerReglages(reglages).son;
  return s.ameliorer ? s.niveau : "off";
}

const ETAPES_PREPARATION = ["reception", "son", "transcription", "phrases_ratees", "coupes", "montage", "sous_titres"];

/**
 * Étapes à afficher pendant le montage. Quand la préparation est réutilisée
 * (seul le rendu est relancé), elle apparaît d'emblée comme faite.
 */
export function etapesAffichees(m: Pick<Montage, "reglages" | "etape" | "travail_pret" | "audio_prepare">) {
  const etapes = etapesDuMontage(m.reglages);
  const renduSeul = m.travail_pret && m.audio_prepare === cleSon(m.reglages);
  let courant = etapes.findIndex((e) => e.id === m.etape);
  if (renduSeul && (courant === -1 || ETAPES_PREPARATION.includes(m.etape ?? ""))) {
    courant = etapes.findIndex((e) => !ETAPES_PREPARATION.includes(e.id));
  }
  return { etapes, courant: Math.max(0, courant) };
}

/** Le montage est-il en train de tourner (écran d'attente) ? */
export function enTraitement(m: Pick<Montage, "statut" | "lance">): boolean {
  return m.statut === "en_cours" || (m.statut === "preparation" && m.lance);
}

export const LIBELLE_STATUT: Record<Statut, string> = {
  import: "Import en cours",
  preparation: "Préparation",
  pret: "À régler",
  en_cours: "Montage en cours",
  termine: "Prête",
  erreur: "Échec",
};

export const FORMATS_ACCEPTES = ["video/mp4", "video/quicktime"];
export const TAILLE_MAX = 1024 * 1024 * 1024; // 1 Go
export const DUREE_MAX_S = 5 * 60;

/** Contrôle du fichier avant l'import (format, taille). La durée est vérifiée à part. */
export function verifierFichier(f: { name: string; type: string; size: number }): string | null {
  const ext = f.name.toLowerCase().split(".").pop();
  if (!FORMATS_ACCEPTES.includes(f.type) && ext !== "mp4" && ext !== "mov") {
    return "Format non accepté : importe une vidéo MP4 ou MOV.";
  }
  if (f.size > TAILLE_MAX) return "La vidéo dépasse 1 Go.";
  return null;
}

/** Où mène un montage de la liste : réglages à finir, ou écran du montage. */
export function lienDuMontage(m: Pick<Montage, "id" | "statut" | "lance">) {
  if ((m.statut === "preparation" && !m.lance) || m.statut === "pret") return `/studio/face-camera?id=${m.id}`;
  return `/studio/montage/${m.id}`;
}
