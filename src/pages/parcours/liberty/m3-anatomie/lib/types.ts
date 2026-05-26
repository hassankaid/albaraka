/**
 * État global persistant du M3 ANATOMIE D'UNE OFFRE (V2 finalisée).
 * Réplique fidèle du STATE Sidali avec 9 étapes (welcome + 7 step IA + lock)
 * et les 4 leviers Hormozi pour le prix.
 */

export type M3Step =
  | "welcome"
  | "promesse"
  | "mecanisme"
  | "vehicule"
  | "bonus"
  | "garantie"
  | "urgence"
  | "prix"
  | "lock";

export type MarketType = "b2c_info" | "b2c_transfo" | "b2b";

export const VALIDATION_THRESHOLD = 80;
export const FORCE_AVAILABLE_AFTER = 3;

// ─── Imports M1 + M2 (lus depuis liberty_user_profile) ───────────────────────
export interface M1ImportData {
  source: string;
  sous_niche_2?: {
    phrase_finale?: string;
    cible?: string;
    douleur?: string;
    methode?: string;
    pouvoir_achat?: string;
    contact?: string;
    croissance?: string;
    phrase?: string;
  } | null;
  avatar?: {
    socio?: { nom?: string; age?: string; lieu?: string; situation?: string };
    psycho?: { phrase_avatar?: string };
  } | null;
  marche?: { id: string; label: string; sous_segment?: string } | null;
  archetype?: { id: string; emoji: string; label: string } | null;
}

export interface M2ImportData {
  source: string;
  version: string;
  data: {
    step8: {
      positionnement: string;
      hook_principal: string;
      levier_secondaire: string;
      biais_killer: string;
      phase_strategy: string;
      directives_copywriting: string;
    };
    step2?: { identity?: string };
  };
  scores?: Record<string, number | null>;
}

// ─── Sub-states par étape ───────────────────────────────────────────────────
export interface AIFeedback {
  verdict?: string;
  weak?: string;
  action_concrete?: string;
  propositions?: Array<{ text: string; cible_etape?: string }>;
  [k: string]: any;
}

export interface HistoryEntry {
  ts: string;
  score: number;
  snapshot: any;
}

export interface PromesseState {
  text: string;
  score: number;
  attempts: number;
  validated: boolean;
  forced: boolean;
  history: HistoryEntry[];
  feedback: AIFeedback | null;
}

export interface MecanismeState {
  nom: string;
  etapes: string[];
  score: number;
  attempts: number;
  validated: boolean;
  forced: boolean;
  history: HistoryEntry[];
  feedback: AIFeedback | null;
}

export type VehiculeFormat =
  | "programme_video"
  | "cohorte_groupe"
  | "coaching_groupe_1to1"
  | "consulting_done_with_you"
  | "hybride_custom"
  | "";

export interface VehiculeState {
  format: VehiculeFormat;
  justification: string;
  validated: boolean;
}

export interface BonusItem {
  nom: string;
  valeur: string;
  raison: string;
}

export interface BonusState {
  items: BonusItem[];
  score: number;
  attempts: number;
  validated: boolean;
  forced: boolean;
  history: HistoryEntry[];
  feedback: AIFeedback | null;
}

export type GarantieType =
  | "remboursement"
  | "continuite"
  | "paye_au_resultat"
  | "satisfaction_double"
  | "";

export interface GarantieState {
  type: GarantieType;
  formulation: string;
  score: number;
  attempts: number;
  validated: boolean;
  forced: boolean;
  history: HistoryEntry[];
  feedback: AIFeedback | null;
}

export type UrgenceType =
  | "cohorte_limitee"
  | "bonus_expirant"
  | "prix_qui_monte"
  | "fenetre_temporelle"
  | "";

export interface UrgenceState {
  type: UrgenceType;
  justification: string;
  score: number;
  attempts: number;
  validated: boolean;
  forced: boolean;
  history: HistoryEntry[];
  feedback: AIFeedback | null;
}

export interface PrixLevier {
  score: number;
  justification: string;
}

export interface PrixState {
  montant: string;
  leviers: {
    resultat: PrixLevier;
    probabilite: PrixLevier;
    delai: PrixLevier;
    effort: PrixLevier;
  };
  levier_faible: string;
  alignements: {
    format: boolean;
    cible: boolean;
    ancrage: boolean;
  };
  score: number;
  attempts: number;
  validated: boolean;
  forced: boolean;
  history: HistoryEntry[];
  feedback: AIFeedback | null;
}

export interface EngagementState {
  nom_complet: string;
  date_signature: string | null;
}

export interface M3State {
  version: string;
  current_step: M3Step;
  market_type: MarketType | null;
  m1_data: M1ImportData | null;
  m2_data: M2ImportData | null;
  promesse: PromesseState;
  mecanisme: MecanismeState;
  vehicule: VehiculeState;
  bonus: BonusState;
  garantie: GarantieState;
  urgence: UrgenceState;
  prix: PrixState;
  engagement: EngagementState;
  completed: boolean;
  demoMode: string | null;
  _updated_at?: string;
}

function blankPromesse(): PromesseState {
  return { text: "", score: 0, attempts: 0, validated: false, forced: false, history: [], feedback: null };
}
function blankMecanisme(): MecanismeState {
  return { nom: "", etapes: ["", "", ""], score: 0, attempts: 0, validated: false, forced: false, history: [], feedback: null };
}
function blankVehicule(): VehiculeState {
  return { format: "", justification: "", validated: false };
}
function blankBonus(): BonusState {
  return {
    items: [{ nom: "", valeur: "", raison: "" }, { nom: "", valeur: "", raison: "" }],
    score: 0, attempts: 0, validated: false, forced: false, history: [], feedback: null,
  };
}
function blankGarantie(): GarantieState {
  return { type: "", formulation: "", score: 0, attempts: 0, validated: false, forced: false, history: [], feedback: null };
}
function blankUrgence(): UrgenceState {
  return { type: "", justification: "", score: 0, attempts: 0, validated: false, forced: false, history: [], feedback: null };
}
function blankPrix(): PrixState {
  return {
    montant: "",
    leviers: {
      resultat: { score: 0, justification: "" },
      probabilite: { score: 0, justification: "" },
      delai: { score: 0, justification: "" },
      effort: { score: 0, justification: "" },
    },
    levier_faible: "",
    alignements: { format: false, cible: false, ancrage: false },
    score: 0, attempts: 0, validated: false, forced: false, history: [], feedback: null,
  };
}

export function defaultM3State(): M3State {
  return {
    version: "v3",
    current_step: "welcome",
    market_type: null,
    m1_data: null,
    m2_data: null,
    promesse: blankPromesse(),
    mecanisme: blankMecanisme(),
    vehicule: blankVehicule(),
    bonus: blankBonus(),
    garantie: blankGarantie(),
    urgence: blankUrgence(),
    prix: blankPrix(),
    engagement: { nom_complet: "", date_signature: null },
    completed: false,
    demoMode: null,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function pickAvatarName(state: M3State): string {
  const nom = state.m1_data?.avatar?.socio?.nom?.trim();
  return nom || "ton avatar";
}

export function pickNiche(state: M3State): string {
  return state.m1_data?.sous_niche_2?.phrase_finale
    ?? state.m1_data?.sous_niche_2?.phrase
    ?? state.m1_data?.sous_niche_2?.cible
    ?? "ta niche";
}

export function pickMarketLabel(market: MarketType | null): string {
  if (!market) return "—";
  if (market === "b2c_info") return "B2C · Info (savoir, compétence)";
  if (market === "b2c_transfo") return "B2C · Transformation";
  return "B2B";
}
