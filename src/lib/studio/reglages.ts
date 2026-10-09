// Studio vidéo (cahier des charges de Sidali du 29/09/2026) : réglages de
// l'élève, valeurs par défaut et libellés. Tout le reste (format, polices,
// position des sous-titres, coupes…) est imposé dans le moteur.

// « naturel » : seul le visage est flouté, sans bulle ni couleur (choix de Hassan, 09/10).
// Les 6 styles du cahier des charges restent connus du moteur mais ne sont plus proposés.
export type StyleFlou = "naturel" | "flou" | "mosaique" | "verre" | "marqueur" | "sticker" | "neon";
export type NiveauSon = "leger" | "normal" | "fort";

export type PaletteId = "or_noir" | "emeraude" | "rose_poudre" | "bleu_electrique" | "rouge_passion" | "blanc_minimal" | "personnalise";

export interface Reglages {
  son: { ameliorer: boolean; niveau: NiveauSon };
  sous_titres: { texte: string; contour: string; ombre: string };
  visage: { flouter: boolean; style: StyleFlou; couleur: string; intensite: number; intensite_couleur: number };
  /** Motion design (phase 2) : palette, et prénom + titre pour la carte de présentation. */
  design: { actif: boolean; palette: PaletteId; principale: string; fond: string; texte: string; prenom: string; titre: string };
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
  son: { ameliorer: true, niveau: "normal" },
  sous_titres: { texte: "#FFFFFF", contour: "#000000", ombre: "#000000" },
  visage: { flouter: false, style: "naturel", couleur: "#C9A45C", intensite: 3, intensite_couleur: 3 },
  // activé par défaut (cahier des charges, section 4)
  design: { actif: true, palette: "or_noir", principale: "#C9A45C", fond: "#0F0F0F", texte: "#FFFFFF", prenom: "", titre: "" },
};

/** Les 6 palettes prêtes (couleur principale / fond des encadrés / texte des encadrés). */
export const PALETTES: { id: Exclude<PaletteId, "personnalise">; nom: string; principale: string; fond: string; texte: string }[] = [
  { id: "or_noir", nom: "Or & Noir", principale: "#C9A45C", fond: "#0F0F0F", texte: "#FFFFFF" },
  { id: "emeraude", nom: "Émeraude", principale: "#10B981", fond: "#0B2E24", texte: "#FFFFFF" },
  { id: "rose_poudre", nom: "Rose poudré", principale: "#F4A6B8", fond: "#FFFFFF", texte: "#1F1F1F" },
  { id: "bleu_electrique", nom: "Bleu électrique", principale: "#3B82F6", fond: "#0B1530", texte: "#FFFFFF" },
  { id: "rouge_passion", nom: "Rouge passion", principale: "#E11D48", fond: "#1A0A0F", texte: "#FFFFFF" },
  { id: "blanc_minimal", nom: "Blanc minimal", principale: "#111111", fond: "#FFFFFF", texte: "#111111" },
];

/** Les trois couleurs réellement utilisées (palette prête, ou couleurs libres). */
export function couleursDesign(d: Reglages["design"]): { principale: string; fond: string; texte: string } {
  const p = PALETTES.find((x) => x.id === d.palette);
  return p && d.palette !== "personnalise" ? p : { principale: d.principale, fond: d.fond, texte: d.texte };
}

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
  { id: "animations", nom: "Plan des animations" },
  { id: "floutage", nom: "Floutage du visage" },
  { id: "motion_design", nom: "Animations" },
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
    // les montages faits avec un ancien style (bulle colorée) repassent au flou naturel
    visage: { ...REGLAGES_PAR_DEFAUT.visage, ...(r?.visage ?? {}), style: "naturel" },
    design: { ...REGLAGES_PAR_DEFAUT.design, ...(r?.design ?? {}) },
  };
}

/** Étapes réellement parcourues : le floutage n'apparaît que s'il est demandé. */
export function etapesDuMontage(reglages: Partial<Reglages> | null | undefined) {
  const r = completerReglages(reglages);
  // floutage et animations se font dans la même passe : une seule étape affichée
  return ETAPES.filter(
    (e) => (e.id !== "floutage" || (r.visage.flouter && !r.design.actif)) && (e.id !== "motion_design" || r.design.actif),
  );
}

/** Clé du réglage du son, comme la calcule la base (studio_lancer). */
export function cleSon(reglages: Partial<Reglages> | null | undefined): string {
  const s = completerReglages(reglages).son;
  return s.ameliorer ? s.niveau : "off";
}

const ETAPES_PREPARATION = ["reception", "son", "transcription", "phrases_ratees", "coupes", "montage", "sous_titres", "animations"];

/**
 * Étapes à afficher pendant le montage. Quand la préparation est réutilisée
 * (seul le rendu est relancé), elle apparaît d'emblée comme faite.
 */
export function etapesAffichees(m: Pick<Montage, "reglages" | "etape" | "travail_pret" | "audio_prepare">) {
  const etapes = etapesDuMontage(m.reglages);
  const renduSeul = m.travail_pret && m.audio_prepare === cleSon(m.reglages);
  let courant = etapes.findIndex((e) => e.id === m.etape);
  // si la machine refait quand même la préparation (son changé), on suit ses vraies étapes
  if (renduSeul && (courant === -1 || m.etape === "reception")) {
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
