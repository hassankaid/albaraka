// Tableau de bord « Consommation IA » (admin, décisions de Hassan du 19/10/2026).
// Toute l'IA de la plateforme passe par OpenRouter ; chaque appel est noté dans
// ia_consommations. Ici : le catalogue des fonctionnalités (affichées même sans usage,
// pour recenser ce qui existe), les périodes et les formats.

export type GroupeIA = "studio" | "plateforme";

export interface FonctionnaliteIA {
  cle: string;
  nom: string;
  groupe: GroupeIA;
  /** où elle se trouve et ce qu'elle fait, en une phrase */
  description: string;
  /** n'est plus proposée aux utilisateurs (données conservées) */
  inactive?: string;
}

export const CATALOGUE: FonctionnaliteIA[] = [
  {
    cle: "studio_face_camera",
    nom: "Studio · Face caméra",
    groupe: "studio",
    description: "Montage d'une vidéo face caméra : transcription, coupes, sous-titres, animations.",
  },
  {
    cle: "studio_voix_off",
    nom: "Studio · Voix off",
    groupe: "studio",
    description: "Montage voix off : transcription, choix des plans dans la banque, sous-titres.",
  },
  {
    cle: "studio_theme",
    nom: "Studio · Thème du script",
    groupe: "studio",
    description: "Détection du thème d'un script voix off, avant le montage.",
  },
  {
    cle: "studio_banque",
    nom: "Studio · Indexation de la banque",
    groupe: "studio",
    description: "Analyse des vidéos ajoutées à la banque de plans (admin).",
  },
  {
    cle: "agent_setting",
    nom: "Agent IA Setting",
    groupe: "plateforme",
    description: "Réponses aux messages de prospects, à partir de la base de connaissance.",
  },
  {
    cle: "analyse_appels",
    nom: "Analyse d'appels",
    groupe: "plateforme",
    description: "Appel d'un élève déposé par un coach : transcription, voix séparées, notation avec la grille (≈ 0,06 $ par appel de setting).",
  },
  {
    cle: "coach_activite",
    nom: "Coach IA du jour",
    groupe: "plateforme",
    description: "Conseil quotidien dans « Mon Activité », selon les chiffres saisis.",
  },
  {
    cle: "recap_hebdo",
    nom: "Récap de la semaine",
    groupe: "plateforme",
    description: "Bilan envoyé chaque lundi matin à partir de l'activité de la semaine.",
  },
  {
    cle: "contenus_personal_brand",
    nom: "Contenus Personal Brand",
    groupe: "plateforme",
    description: "Génération de posts et de scripts pour les réseaux sociaux.",
    inactive: "Personal Brand désactivé depuis le 13/10",
  },
  {
    cle: "liberty_ancien",
    nom: "Ancien parcours Liberty",
    groupe: "plateforme",
    description: "Modules IA de l'ancien parcours Liberty.",
  },
  {
    cle: "lecture_rib",
    nom: "Lecture du RIB",
    groupe: "plateforme",
    description: "Lecture automatique d'un RIB déposé dans le profil (IBAN, BIC, titulaire).",
  },
];

const PAR_CLE = new Map(CATALOGUE.map((f) => [f.cle, f]));

/** La fiche d'une fonctionnalité ; une clé inconnue (nouvelle fonction) reste affichée telle quelle. */
export function fonctionnalite(cle: string): FonctionnaliteIA {
  return PAR_CLE.get(cle) ?? { cle, nom: cle, groupe: cle.startsWith("studio") ? "studio" : "plateforme", description: "" };
}

export interface LigneFonctionnalite {
  fonctionnalite: string;
  appels: number;
  cout: number;
  utilisateurs: number;
  dernier: string | null;
  erreurs: number;
}

/** Tout le catalogue (même sans usage sur la période) + les clés inconnues, les plus chères d'abord. */
export function recenser(lignes: LigneFonctionnalite[]): (LigneFonctionnalite & { fiche: FonctionnaliteIA })[] {
  const vues = new Map(lignes.map((l) => [l.fonctionnalite, l]));
  const cles = [...CATALOGUE.map((f) => f.cle), ...lignes.map((l) => l.fonctionnalite).filter((c) => !PAR_CLE.has(c))];
  return cles
    .map((cle) => ({
      ...(vues.get(cle) ?? { fonctionnalite: cle, appels: 0, cout: 0, utilisateurs: 0, dernier: null, erreurs: 0 }),
      fiche: fonctionnalite(cle),
    }))
    .sort((a, b) => Number(b.cout) - Number(a.cout) || b.appels - a.appels);
}

// ── périodes ──
export type Periode = "7j" | "30j" | "mois" | "mois_dernier" | "tout";

export const PERIODES: { valeur: Periode; label: string }[] = [
  { valeur: "7j", label: "7 derniers jours" },
  { valeur: "30j", label: "30 derniers jours" },
  { valeur: "mois", label: "Ce mois-ci" },
  { valeur: "mois_dernier", label: "Mois dernier" },
  { valeur: "tout", label: "Depuis le début" },
];

/** Le tout premier coût connu (Studio) date d'octobre 2026. */
const DEBUT = new Date("2026-01-01T00:00:00Z");

export function bornes(p: Periode, maintenant = new Date()): { debut: Date; fin: Date } {
  const fin = new Date(maintenant);
  const jours = (n: number) => {
    const d = new Date(maintenant);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (n - 1));
    return d;
  };
  switch (p) {
    case "7j":
      return { debut: jours(7), fin };
    case "30j":
      return { debut: jours(30), fin };
    case "mois":
      return { debut: new Date(maintenant.getFullYear(), maintenant.getMonth(), 1), fin };
    case "mois_dernier":
      return {
        debut: new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1),
        fin: new Date(maintenant.getFullYear(), maintenant.getMonth(), 1),
      };
    default:
      return { debut: DEBUT, fin };
  }
}

/** Les jours de la période, y compris ceux sans dépense (pour un graphique sans trous). */
export function joursDe(debut: Date, fin: Date, max = 92): string[] {
  const jours: string[] = [];
  const d = new Date(debut);
  d.setHours(12, 0, 0, 0);
  while (d < fin && jours.length < max) {
    jours.push(jourLocal(d));
    d.setDate(d.getDate() + 1);
  }
  return jours;
}

export function jourLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── formats ──
/** Dollars : 2 décimales, 3 sous 1 $ pour que les petits coûts ne s'affichent pas « 0,00 $ ». */
export function usd(n: number | string | null | undefined): string {
  const v = Number(n);
  if (n === null || n === undefined || !Number.isFinite(v)) return "—";
  if (v === 0) return "0 $";
  if (Math.abs(v) < 0.001) return "< 0,001 $";
  const dec = Math.abs(v) < 1 ? 3 : 2;
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} $`;
}

export function pourcent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function versCSV(lignes: (string | number | null)[][]): string {
  const cellule = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // point-virgule et BOM : s'ouvre proprement dans Excel en français
  return "﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\n");
}
