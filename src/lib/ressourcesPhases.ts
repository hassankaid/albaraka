// Espace Training « Ressources » (Sidali, 13/10/2026) : toutes les ressources
// téléchargeables, rangées par phase. La page se construit à partir des
// ressources des chapitres des parcours : ce que Sidali ajoute dans un chapitre
// apparaît ici sans autre manipulation.

export type RubriqueRessource = "script_interne" | "script_template";

export interface DefinitionPhase {
  cle: string;
  titre: string;
  formationSlug: string;
  /** Mot du titre de la partie (module) qui porte la phase ; absent = toute la formation. */
  motCleModule?: string;
  /** Setting et Closing : scripts séparés en internes AL BARAKA / templates. */
  scriptsSepares?: boolean;
}

// Ordre demandé par Sidali.
export const PHASES_RESSOURCES: DefinitionPhase[] = [
  { cle: "personal-branding", titre: "Personal Branding", formationSlug: "parcours-community-management", motCleModule: "PERSONAL BRANDING" },
  { cle: "storytelling", titre: "Storytelling", formationSlug: "parcours-community-management", motCleModule: "STORYTELLING" },
  { cle: "marketing-digital", titre: "Marketing Digital", formationSlug: "parcours-community-management", motCleModule: "MARKETING DIGITAL" },
  { cle: "community-management", titre: "Community Management", formationSlug: "parcours-community-management", motCleModule: "COMMUNITY MANAGEMENT" },
  { cle: "setting", titre: "Setting", formationSlug: "parcours-setter-closer", motCleModule: "SETTING", scriptsSepares: true },
  { cle: "closing", titre: "Closing", formationSlug: "parcours-setter-closer", motCleModule: "CLOSING", scriptsSepares: true },
  { cle: "estimaction", titre: "Estimaction", formationSlug: "estimaction" },
];

export const SLUGS_FORMATIONS_RESSOURCES = [...new Set(PHASES_RESSOURCES.map((p) => p.formationSlug))];

export interface RessourceSource {
  id: string;
  titre: string;
  type: string;
  url: string;
  ordre: number;
  rubrique: RubriqueRessource | null;
}

export interface ChapitreSource {
  id: string;
  titre: string;
  ordre: number;
  status: string;
  chapitre_ressources: RessourceSource[];
}

export interface ModuleSource {
  id: string;
  titre: string;
  ordre: number;
  status: string;
  formation_chapitres: ChapitreSource[];
}

export interface FormationSource {
  id: string;
  slug: string;
  formation_modules: ModuleSource[];
}

export interface RessourceRangee extends RessourceSource {
  chapitreId: string;
  chapitreTitre: string;
}

export interface PhaseRessources {
  phase: DefinitionPhase;
  formationSlug: string;
  scriptsInternes: RessourceRangee[];
  scriptsTemplates: RessourceRangee[];
  autres: RessourceRangee[];
  total: number;
}

function normaliser(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

// « PARTIE 2 — CLOSING » porte la phase Closing ; on compare après le tiret pour
// que « PARTIE 1 — SETTING » ne capte pas un futur « … SETTING/CLOSING ».
function moduleDeLaPhase(m: ModuleSource, motCle: string): boolean {
  const titre = normaliser(m.titre);
  const apresTiret = titre.split(/[—–-]/).slice(1).join("-").trim() || titre;
  return apresTiret === normaliser(motCle) || apresTiret.startsWith(normaliser(motCle) + " ");
}

export function rangerRessources(formations: FormationSource[]): PhaseRessources[] {
  const parSlug = new Map(formations.map((f) => [f.slug, f]));
  const phases: PhaseRessources[] = [];

  for (const phase of PHASES_RESSOURCES) {
    const formation = parSlug.get(phase.formationSlug);
    // Élève non inscrit : la formation publiée reste lisible, mais sans modules (RLS).
    if (!formation || !formation.formation_modules?.length) continue;

    const modules = [...(formation.formation_modules ?? [])]
      .filter((m) => m.status === "published")
      .filter((m) => !phase.motCleModule || moduleDeLaPhase(m, phase.motCleModule))
      .sort((a, b) => a.ordre - b.ordre);

    const ressources: RessourceRangee[] = [];
    for (const m of modules) {
      const chapitres = [...(m.formation_chapitres ?? [])]
        .filter((c) => c.status === "published")
        .sort((a, b) => a.ordre - b.ordre);
      for (const c of chapitres) {
        const rs = [...(c.chapitre_ressources ?? [])].sort((a, b) => a.ordre - b.ordre);
        for (const r of rs) ressources.push({ ...r, chapitreId: c.id, chapitreTitre: c.titre });
      }
    }
    if (ressources.length === 0 && !phase.scriptsSepares) continue;

    const separe = !!phase.scriptsSepares;
    phases.push({
      phase,
      formationSlug: formation.slug,
      scriptsInternes: separe ? ressources.filter((r) => r.rubrique === "script_interne") : [],
      scriptsTemplates: separe ? ressources.filter((r) => r.rubrique === "script_template") : [],
      autres: separe ? ressources.filter((r) => !r.rubrique) : ressources,
      total: ressources.length,
    });
  }
  return phases;
}
