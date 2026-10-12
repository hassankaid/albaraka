// Studio, Voix off : la banque de vidéos (cahier des charges de Sidali, section 7).
// Types et calculs de la page d'administration : couverture des thèmes, libellés.

export type StatutVideo = "a_indexer" | "indexation" | "indexee" | "erreur";

export interface VideoBanque {
  id: string;
  nom: string;
  dossier: string | null;
  statut: StatutVideo;
  erreur: string | null;
  exclue: boolean;
  duree: number | null;
  created_at: string;
}

export interface PlanBanque {
  id: string;
  video_id: string;
  rang: number;
  debut: number;
  fin: number;
  images: string[];
  description: string | null;
  themes: string[];
  mots_cles: string[];
  ambiance: string | null;
  qualite: "nette" | "floue" | "sombre" | null;
  logo: boolean | null;
  texte_ecran: boolean | null;
  visage_reconnaissable: boolean | null;
  exclu: boolean;
  secours: boolean;
}

export interface Theme {
  id: string;
  nom: string;
  ordre: number;
  actif: boolean;
}

/** Cahier : un thème avec moins de 30 plans utilisables « manque de plans ». */
export const SEUIL_THEME = 30;

/** Cahier : une cinquantaine de plans de secours « ambiance AL BARAKA ». */
export const OBJECTIF_SECOURS = 50;

export const LIBELLE_STATUT_VIDEO: Record<StatutVideo, string> = {
  a_indexer: "À indexer",
  indexation: "Indexation…",
  indexee: "Indexée",
  erreur: "Erreur",
};

/** Un plan utilisable dans un montage : ni exclu, ni flou ou trop sombre. */
export const planUtilisable = (p: Pick<PlanBanque, "exclu" | "qualite">) => !p.exclu && (p.qualite ?? "nette") === "nette";

/** Nombre de plans utilisables par thème, du plus pauvre au plus riche, avec l'alerte du cahier. */
export function couvertureThemes(themes: Theme[], plans: Pick<PlanBanque, "themes" | "exclu" | "qualite">[]) {
  const compte = new Map<string, number>();
  for (const p of plans) {
    if (!planUtilisable(p)) continue;
    for (const t of p.themes) compte.set(t, (compte.get(t) ?? 0) + 1);
  }
  return themes
    .filter((t) => t.actif)
    .map((t) => ({ ...t, plans: compte.get(t.id) ?? 0, manque: (compte.get(t.id) ?? 0) < SEUIL_THEME }))
    .sort((a, b) => a.plans - b.plans || a.ordre - b.ordre);
}

/** Vidéos de banque acceptées à l'import (le moteur les convertit en 9:16). */
export const FORMATS_BANQUE = ["mp4", "mov", "m4v", "webm"];
export const TAILLE_MAX_BANQUE = 2 * 1024 * 1024 * 1024;

export function verifierVideoBanque(f: { name: string; size: number }): string | null {
  const ext = f.name.toLowerCase().split(".").pop() ?? "";
  if (!FORMATS_BANQUE.includes(ext)) return `« ${f.name} » : format non accepté (MP4, MOV, M4V ou WebM).`;
  if (f.size > TAILLE_MAX_BANQUE) return `« ${f.name} » dépasse 2 Go.`;
  if (f.size === 0) return `« ${f.name} » est vide.`;
  return null;
}

/** Filtre de la grille des plans. */
export function filtrerPlans(
  plans: PlanBanque[],
  f: { theme: string | null; recherche: string; voir: "tous" | "utilisables" | "exclus" | "secours" },
) {
  const mots = f.recherche.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return plans.filter((p) => {
    if (f.theme && !p.themes.includes(f.theme)) return false;
    if (f.voir === "utilisables" && !planUtilisable(p)) return false;
    if (f.voir === "exclus" && !p.exclu) return false;
    if (f.voir === "secours" && !p.secours) return false;
    if (!mots.length) return true;
    const texte = `${p.description ?? ""} ${p.mots_cles.join(" ")} ${p.ambiance ?? ""}`.toLowerCase();
    return mots.every((m) => texte.includes(m));
  });
}
