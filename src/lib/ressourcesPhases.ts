// Espace Training « Ressources » (Sidali, 13/10/2026) : toutes les ressources
// téléchargeables, rangées par phase. La page se construit à partir des
// ressources des chapitres des parcours : ce que Sidali ajoute dans un chapitre
// apparaît ici sans autre manipulation.
//
// 19/10/2026 : une partie d'un parcours qui n'a pas de phase ci-dessous (une
// « PARTIE 6 » créée plus tard) devient sa propre catégorie, après les autres,
// pour qu'aucune ressource ne reste invisible.

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

/** Parties volontairement absentes de Ressources (pas de fichiers à télécharger, choix
 * du 13/10/2026). Administratif : 6 liens vers des sites officiels, en attente de la
 * décision de Sidali (19/10/2026). */
export const PARTIES_EXCLUES = ["MUSLIM MINDSET", "ADMINISTRATIF"];

// Les parcours découpés en parties (Estimaction prend toute sa formation).
const PARCOURS_PAR_PARTIES = [...new Set(PHASES_RESSOURCES.filter((p) => p.motCleModule).map((p) => p.formationSlug))];

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
function nomDeLaPartie(titreModule: string): string {
  const titre = normaliser(titreModule).replace(/\s+/g, " ").trim();
  return titre.split(/[—–-]/).slice(1).join("-").trim() || titre;
}

function moduleDeLaPhase(m: ModuleSource, motCle: string): boolean {
  const apresTiret = nomDeLaPartie(m.titre);
  return apresTiret === normaliser(motCle) || apresTiret.startsWith(normaliser(motCle) + " ");
}

const SIGLES = new Set(["ia", "dm", "cm", "seo", "pdf", "b2b", "b2c", "crm", "ugc"]);
const PETITS_MOTS = new Set(["de", "du", "des", "la", "le", "les", "et", "a", "à", "en", "au", "aux", "pour", "sur"]);

/** « PARTIE 6 — PROSPECTION SUR LINKEDIN » → « Prospection sur Linkedin » (accents gardés). */
export function titreDeLaPartie(titreModule: string): string {
  const brut = titreModule.replace(/\s+/g, " ").trim();
  const nom = brut.split(/[—–]|\s-\s/).slice(1).join(" - ").trim() || brut;
  return nom
    .toLocaleLowerCase("fr-FR")
    .split(" ")
    .map((mot, i) =>
      SIGLES.has(mot) ? mot.toUpperCase()
        : i > 0 && PETITS_MOTS.has(mot) ? mot
        : mot.charAt(0).toLocaleUpperCase("fr-FR") + mot.slice(1))
    .join(" ");
}

function ressourcesDesModules(modules: ModuleSource[]): RessourceRangee[] {
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
  return ressources;
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

    const ressources = ressourcesDesModules(modules);
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

  // Les parties sans phase connue : une catégorie chacune, dans l'ordre des parcours.
  // Une même partie présente dans deux parcours n'en fait qu'une, sans doublon.
  const autresParties = new Map<string, PhaseRessources>();
  for (const slug of PARCOURS_PAR_PARTIES) {
    const formation = parSlug.get(slug);
    if (!formation?.formation_modules?.length) continue;
    const connues = PHASES_RESSOURCES.filter((p) => p.formationSlug === slug && p.motCleModule);
    const modules = [...formation.formation_modules]
      .filter((m) => m.status === "published")
      .filter((m) => !connues.some((p) => moduleDeLaPhase(m, p.motCleModule!)))
      .filter((m) => !PARTIES_EXCLUES.some((x) => moduleDeLaPhase(m, x)))
      .sort((a, b) => a.ordre - b.ordre);
    for (const m of modules) {
      const ressources = ressourcesDesModules([m]);
      if (ressources.length === 0) continue;
      const cle = "partie-" + nomDeLaPartie(m.titre).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const deja = autresParties.get(cle);
      if (deja) {
        const vues = new Set(deja.autres.map((r) => `${r.titre}|${r.url}`));
        for (const r of ressources) if (!vues.has(`${r.titre}|${r.url}`)) deja.autres.push(r);
        deja.total = deja.autres.length;
      } else {
        autresParties.set(cle, {
          phase: { cle, titre: titreDeLaPartie(m.titre), formationSlug: slug },
          formationSlug: slug,
          scriptsInternes: [],
          scriptsTemplates: [],
          autres: ressources,
          total: ressources.length,
        });
      }
    }
  }
  return [...phases, ...autresParties.values()];
}
