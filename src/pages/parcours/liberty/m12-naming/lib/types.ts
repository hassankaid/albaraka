/**
 * M12 NAMING — types, constantes & factories.
 * Portage React du code source Sidali v1.2.1 (outil heuristique, SANS IA Claude).
 * 9 étapes : welcome → comprendre → brainstorm → tests auto → choix+IRL → positionnement
 * → méthode (bonus) → renommer modules (bonus) → lock. Lit le handoff M11.
 */

export const VERSION = "v1.2.1";
export const SCHEMA_VERSION = "m12_v1";
export const STORAGE_KEY = "m12_naming_state_v1";
export const PROFILE_KEY = "liberty_user_profile_v1";
export const MODULE_ID = "m12";
export const DEBOUNCE_MS = 450;
export const TRACE_MIN_LENGTH = 15;

export type M12Step =
  | "welcome" | "comprendre" | "brainstorm_programme" | "tester_programme"
  | "valider_programme" | "positionnement" | "methode_unique" | "renommer_modules" | "lock";

export interface StepMeta { id: M12Step; short: string; full: string; }

export const STEPS_META: StepMeta[] = [
  { id: "welcome",              short: "Welcome",          full: "Bienvenue — naming et positionnement" },
  { id: "comprendre",           short: "1 · Comprendre",   full: "1 · Les 5 techniques et les 3 règles d'un bon nom" },
  { id: "brainstorm_programme", short: "2 · Brainstorm",   full: "2 · Brainstormer 5 à 10 candidats pour ton programme" },
  { id: "tester_programme",     short: "3 · Tests auto",   full: "3 · Auto-checks de ton top 3 (les tests humains viennent à l'étape 4)" },
  { id: "valider_programme",    short: "4 · Choix + IRL",  full: "4 · Nom final + baseline + 4 tests humains IRL" },
  { id: "positionnement",       short: "5 · Position",     full: "5 · Catégorie nouvelle et combat que tu prends" },
  { id: "methode_unique",       short: "6 · Méthode",      full: "6 · Nommer ta méthode propriétaire — bonus" },
  { id: "renommer_modules",     short: "7 · Modules",      full: "7 · Renommer les modules de ton programme — bonus" },
  { id: "lock",                 short: "8 · Lock",         full: "8 · Signature et transmission vers le module suivant" },
];
export const STEP_KEYS: M12Step[] = STEPS_META.map((s) => s.id);
export const BONUS_STEPS: M12Step[] = ["methode_unique", "renommer_modules"];
export const PEDA_STEP_KEYS: M12Step[] = ["comprendre", "brainstorm_programme", "tester_programme", "valider_programme", "positionnement"];
export function stepIndex(k: M12Step): number { return STEP_KEYS.indexOf(k); }
export function isBonusStep(k: M12Step): boolean { return BONUS_STEPS.indexOf(k) >= 0; }

// ─── Techniques de naming ─────────────────────────────────────────────
export type TechKey = "acronyme" | "metaphore" | "resultat_methode" | "chiffre_promesse" | "identite";
export const TECHNIQUES: Record<TechKey, { label: string; desc: string; examples: string }> = {
  acronyme: { label: "Acronyme", desc: "Chaque lettre = une étape de ta méthode. Le nom devient un acronyme prononçable qui structure ton enseignement.", examples: "SCALE, IMPACT, BARAKA, RAYONNE — chaque lettre porte une étape." },
  metaphore: { label: "Métaphore", desc: "Image forte qui évoque la transformation. Tu ne décris pas, tu fais voir — un objet, un lieu, un mouvement qui résume ton offre.", examples: "Le Tremplin, Al Baraka, Le Cocon, Le Phare, La Forge." },
  resultat_methode: { label: "Résultat + Méthode", desc: "Combine le bénéfice obtenu et le process — le prospect comprend en deux mots ce qu'il achète.", examples: "Closing Mastery, Revenue Engine, Agency Sprint, Reconversion Mastery." },
  chiffre_promesse: { label: "Chiffre + Promesse", desc: "Un chiffre précis crée une attente mesurable. Le prospect sait exactement ce qu'il va obtenir et en combien de temps.", examples: "90 Day Launch, The 10K System, 30 Day Challenge, 12 Weeks Strong." },
  identite: { label: "Identité / Univers", desc: "Positionne ton offre comme un système, un écosystème, un monde à part. Le prospect ne rejoint pas une formation, il entre dans un univers et un sentiment d'appartenance.", examples: "Liberty, Al Baraka, Offer Creation, Le Patrimoine Halal." },
};
export const TECHNIQUE_KEYS = Object.keys(TECHNIQUES) as TechKey[];

// ─── Détecteurs heuristiques ──────────────────────────────────────────
export const WEAK_WORDS = ["formation", "programme", "coaching", "academy", "academie", "académie", "training", "masterclass", "bootcamp", "ultimate", "best", "top", "expert", "expertise"];
export const YEAR_PATTERN = /\b(19|20)\d{2}\b/;
export const GENERIC_TRAPS = ["sérieux", "serieux", "sérieuse", "serieuse", "ambitieux", "ambitieuse", "premium", "complet", "complète", "complete", "ultimate", "best", "top", "expert", "expertise", "meilleur", "meilleure", "haut de gamme", "exclusif", "exclusive", "révolutionnaire", "revolutionnaire", "disruptif", "disruptive", "innovant", "innovante", "unique en son genre", "sans équivalent", "sans equivalent", "incomparable"];

// ─── Modèle de données ────────────────────────────────────────────────
export interface Candidat { nom: string; technique: "" | TechKey; notes: string; }
export interface Tests {
  telephone: boolean; telephone_trace: string;
  google: boolean; google_trace: string;
  promesse: boolean; promesse_trace: string;
  resonance: boolean; resonance_trace: string;
  nom_teste: string;
}
export interface Final { nom: string; baseline: string; technique: "" | TechKey; candidat_idx_source: number; }
export interface Positionnement { cat_type: string; cat_cible: string; cat_resultat: string; ennemi_declare: string; }
export interface Methode { nom: string; baseline: string; est_acronyme: boolean; acronyme_developpe: string; }
export interface ModuleRenomme { index: number; nom_origine: string; nom_final: string; baseline: string; }
export interface GeneratorInputs { acronyme_mots: string; metaphore_themes: string; chiffre_unite: string; chiffre_valeur: string; }

export interface M12Data {
  candidats: Candidat[];
  top3_indices: number[];
  tests_par_candidat: Record<string, Tests>;
  final: Final;
  positionnement: Positionnement;
  methode: Methode;
  modules_renommes: ModuleRenomme[];
  generator_inputs: GeneratorInputs;
  premier_choix_intuitif: "" | TechKey;
}

export interface M12State {
  version: string; module: string; schema_version: string;
  data: M12Data;
  highest: M12Step; current: M12Step;
  signed: boolean; signed_at: string | null; signed_by: string;
  demoMode: string | null; _activeDemo: string | null;
  upstream_forced: boolean;
  _commit?: boolean;
  m1_data?: any; m1_source?: string | null;
  m2_data?: any; m2_source?: string | null;
  m3_data?: any; m3_source?: string | null;
  m4_data?: any; m4_source?: string | null;
  m5_data?: any; m5_source?: string | null;
  m6_data?: any; m6_source?: string | null;
  m7_data?: any; m7_source?: string | null;
  m8_data?: any; m8_source?: string | null;
  m10_data?: any; m10_source?: string | null;
  m11_data?: any; m11_source?: string | null;
  last_save?: string | null;
  _updated_at?: string;
}

// ─── Factories ────────────────────────────────────────────────────────
export function freshCandidat(): Candidat { return { nom: "", technique: "", notes: "" }; }
export function freshTests(): Tests {
  return { telephone: false, telephone_trace: "", google: false, google_trace: "", promesse: false, promesse_trace: "", resonance: false, resonance_trace: "", nom_teste: "" };
}
export function freshData(): M12Data {
  return {
    candidats: [freshCandidat(), freshCandidat(), freshCandidat(), freshCandidat(), freshCandidat()],
    top3_indices: [],
    tests_par_candidat: {},
    final: { nom: "", baseline: "", technique: "", candidat_idx_source: -1 },
    positionnement: { cat_type: "", cat_cible: "", cat_resultat: "", ennemi_declare: "" },
    methode: { nom: "", baseline: "", est_acronyme: false, acronyme_developpe: "" },
    modules_renommes: [],
    generator_inputs: { acronyme_mots: "", metaphore_themes: "", chiffre_unite: "jours", chiffre_valeur: "90" },
    premier_choix_intuitif: "",
  };
}
export function defaultM12State(): M12State {
  return {
    version: VERSION, module: "M12_NAMING", schema_version: SCHEMA_VERSION,
    data: freshData(), highest: "welcome", current: "welcome",
    signed: false, signed_at: null, signed_by: "",
    demoMode: null, _activeDemo: null, upstream_forced: false,
    m1_data: null, m2_data: null, m3_data: null, m4_data: null, m5_data: null,
    m6_data: null, m7_data: null, m8_data: null, m10_data: null, m11_data: null,
    last_save: null,
  };
}

export function deepClone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }
