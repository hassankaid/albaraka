/**
 * État global persistant de l'outil M2 PSYCHOLOGIE DE L'ACHETEUR (V2 patch 1.5.0).
 * Réplique fidèle du STATE Sidali (~25 champs structurés sur 8 étapes).
 */

export type M2Step =
  | "welcome"
  | "step1"
  | "step2"
  | "step3"
  | "step4"
  | "step5"
  | "step6"
  | "step7"
  | "step8"
  | "lock";

export type MarketType = "B2C_INFO" | "B2C_TRANSFO" | "B2B";

// ─── M1 import (lu depuis liberty_user_profile_v1) ──────────────────────────
export interface M1ImportData {
  source: string;
  completed_at: string | null;
  branche: string | null;
  niche: {
    sub_niche: string;
    label: string;
    name: string;
    pain: string;
    method: string;
    contact_channels: string;
    growth: string;
    buying_power: string;
    market: MarketType | null;
    market_domain: any;
    market_validation: any;
    archetype: { emoji: string; label: string; id: string } | null;
  };
  avatar: {
    name: string | null;
    sex: string | null;
    age: string | null;
    location: string | null;
    income: string | null;
    relationship: string | null;
    family: string | null;
    situation: string | null;
    photo_url: string | null;
    problem: string | null;
    goals: string | null;
    consequences: string | null;
    past: string | null;
    feeling: string | null;
    paradise: string | null;
    avatar_phrase: string | null;
  };
  promise: { statement: string; text: string };
  market: MarketType | null;
  market_domain: any;
  archetype: { emoji: string; label: string; id: string } | null;
  signed_by: string | null;
  signed_on: string | null;
}

// ─── Étapes ─────────────────────────────────────────────────────────────────
export interface PainItem {
  text: string;
  scene: string;
}
export interface DesireItem {
  text: string;
  scene: string;
}
export interface ProofItem {
  type: string;
  who: string;
  why: string;
}
export interface LeverItem {
  angle: string;
  justif: string;
}
export interface BiasItem {
  bias: string;
  why_dominant: string;
  how_activate: string;
}

export type ParcoursPhase =
  | "inconscience"
  | "prise_de_conscience"
  | "consideration"
  | "decision"
  | null;

export interface VocabState {
  douleur_mots: string[];
  desir_mots: string[];
  positifs: string[];
  negatifs: string[];
  formulations: string[];
}

export interface Step1State {
  pains: PainItem[];
}
export interface Step2State {
  desires: DesireItem[];
  identity: string;
}
export interface Step3State {
  proofs: ProofItem[];
}
export interface Step4State {
  rarete: LeverItem;
  reciprocite: LeverItem;
  engagement: LeverItem;
}
export interface Step5State {
  top3: BiasItem[];
}
export interface Step6State {
  phase: ParcoursPhase;
  justif: string;
  actions: string;
}
export interface Step7State {
  vocab: VocabState;
  market?: MarketType | null;
}
export interface Step8State {
  positionnement: string;
  hook_principal: string;
  levier_secondaire: string;
  biais_killer: string;
  phase_strategy: string;
  directives_copywriting: string;
}

export interface StepScores {
  step1: number | null;
  step2: number | null;
  step3: number | null;
  step4: number | null;
  step5: number | null;
  step6: number | null;
  step7: number | null;
  step8: number | null;
}
export type StepKey =
  | "step1"
  | "step2"
  | "step3"
  | "step4"
  | "step5"
  | "step6"
  | "step7"
  | "step8";

export interface StepAttempts {
  step1: number; step2: number; step3: number; step4: number;
  step5: number; step6: number; step7: number; step8: number;
}
export interface StepForced {
  step1: boolean; step2: boolean; step3: boolean; step4: boolean;
  step5: boolean; step6: boolean; step7: boolean; step8: boolean;
}

export interface AIFeedback {
  score: number;
  fb: string;
  suggs: Array<{ target: string; tip: string }>;
}

export interface StepFeedbacks {
  step1: AIFeedback | null;
  step2: AIFeedback | null;
  step3: AIFeedback | null;
  step4: AIFeedback | null;
  step5: AIFeedback | null;
  step6: AIFeedback | null;
  step7: AIFeedback | null;
  step8: AIFeedback | null;
}

export interface SignedState {
  name: string;
  date: string | null;
}

export interface M2State {
  v: string;
  step: M2Step;
  highest: number; // index numérique de l'étape la plus avancée
  m1: M1ImportData | null;
  data: {
    welcome: { imported: boolean; sourceTag: string };
    step1: Step1State;
    step2: Step2State;
    step3: Step3State;
    step4: Step4State;
    step5: Step5State;
    step6: Step6State;
    step7: Step7State;
    step8: Step8State;
    _prefilled_from_m1?: boolean;
  };
  scores: StepScores;
  attempts: StepAttempts;
  forced: StepForced;
  lastFb: StepFeedbacks;
  signed: SignedState;
  demoMode: string | null;
  _updated_at?: string;
}

function blankPain(): PainItem { return { text: "", scene: "" }; }
function blankDesire(): DesireItem { return { text: "", scene: "" }; }
function blankProof(): ProofItem { return { type: "", who: "", why: "" }; }
function blankLever(): LeverItem { return { angle: "", justif: "" }; }
function blankBias(): BiasItem { return { bias: "", why_dominant: "", how_activate: "" }; }

export function defaultM2State(): M2State {
  return {
    v: "1.5.0",
    step: "welcome",
    highest: 0,
    m1: null,
    data: {
      welcome: { imported: false, sourceTag: "" },
      step1: { pains: [blankPain(), blankPain(), blankPain(), blankPain(), blankPain()] },
      step2: {
        desires: [blankDesire(), blankDesire(), blankDesire(), blankDesire(), blankDesire()],
        identity: "",
      },
      step3: { proofs: [blankProof(), blankProof(), blankProof()] },
      step4: { rarete: blankLever(), reciprocite: blankLever(), engagement: blankLever() },
      step5: { top3: [blankBias(), blankBias(), blankBias()] },
      step6: { phase: null, justif: "", actions: "" },
      step7: {
        vocab: { douleur_mots: [], desir_mots: [], positifs: [], negatifs: [], formulations: [] },
      },
      step8: {
        positionnement: "", hook_principal: "", levier_secondaire: "",
        biais_killer: "", phase_strategy: "", directives_copywriting: "",
      },
    },
    scores: {
      step1: null, step2: null, step3: null, step4: null,
      step5: null, step6: null, step7: null, step8: null,
    },
    attempts: {
      step1: 0, step2: 0, step3: 0, step4: 0,
      step5: 0, step6: 0, step7: 0, step8: 0,
    },
    forced: {
      step1: false, step2: false, step3: false, step4: false,
      step5: false, step6: false, step7: false, step8: false,
    },
    lastFb: {
      step1: null, step2: null, step3: null, step4: null,
      step5: null, step6: null, step7: null, step8: null,
    },
    signed: { name: "", date: null },
    demoMode: null,
  };
}

// ─── Helpers M1 mapping ─────────────────────────────────────────────────────
/**
 * Mapper Sidali _mapM1ProfileToM2 fidèle :
 * lit le profil pivot Liberty (M1) et le transforme en STATE.m1 attendu par M2.
 */
export function mapM1ProfileToM2(profile: any): M1ImportData | null {
  if (!profile || typeof profile !== "object") return null;
  const sn = profile.sous_niche_2;
  if (!sn || !sn.cible || !String(sn.cible).trim()) return null;
  const av = profile.avatar || {};
  const socio = av.socio || {};
  const psycho = av.psycho || {};
  const marcheId: string | null = profile.marche?.id ?? null;
  const marketMap: Record<string, MarketType> = {
    argent: "B2C_INFO",
    sante: "B2C_TRANSFO",
    relations: "B2C_TRANSFO",
  };
  const market: MarketType | null = marcheId ? (marketMap[marcheId] ?? null) : null;

  return {
    source: "module_1_niche",
    completed_at: profile.m1_completed_at || null,
    branche: profile.branche_origine || profile.branch || null,
    niche: {
      sub_niche: sn.cible || "",
      label: sn.cible || "",
      name: sn.cible || "",
      pain: sn.douleur || "",
      method: sn.methode || "",
      contact_channels: sn.contact || "",
      growth: sn.croissance || "",
      buying_power: sn.pouvoir_achat || "",
      market,
      market_domain: profile.marche || null,
      market_validation: profile.marche || null,
      archetype: profile.archetype || null,
    },
    avatar: {
      name: socio.nom?.trim() || null,
      sex: socio.sexe || null,
      age: socio.age || null,
      location: socio.lieu || null,
      income: socio.revenu || null,
      relationship: socio.compagnon || null,
      family: socio.relations || null,
      situation: socio.situation || null,
      photo_url: av.photo_url || null,
      problem: psycho.probleme || null,
      goals: psycho.objectifs || null,
      consequences: psycho.consequences || null,
      past: psycho.passe || null,
      feeling: psycho.sentiment || null,
      paradise: psycho.paradis || null,
      avatar_phrase: psycho.phrase_avatar || null,
    },
    promise: {
      statement: sn.phrase || "",
      text: sn.phrase || "",
    },
    market,
    market_domain: profile.marche || null,
    archetype: profile.archetype || null,
    signed_by: profile.engagement_signe_par || null,
    signed_on: profile.engagement_signe_le || null,
  };
}

/** Récupère le prénom de l'avatar pour le copy contextualisé. */
export function pickAvatarName(state: M2State): string {
  return state.m1?.avatar?.name?.trim() || "ton avatar";
}

/** Récupère le marché pour le hint system. */
export function pickMarket(state: M2State): MarketType | null {
  return state.m1?.market ?? state.data.step7?.market ?? null;
}

/**
 * Pré-remplit les champs M2 vides à partir du contexte M1 importé.
 * Réplique fidèle de prefillFromM1() Sidali.
 */
export function prefillFromM1(state: M2State): M2State {
  if (!state.m1) return state;
  if (state.data._prefilled_from_m1) return state;
  const m1 = state.m1;
  const av = m1.avatar;
  const next = JSON.parse(JSON.stringify(state)) as M2State;
  let changed = false;

  // Step 1 — Douleur (1er bloc)
  if (av.problem && !next.data.step1.pains[0].text.trim()) {
    next.data.step1.pains[0].text = av.problem;
    changed = true;
  }
  if (av.past && !next.data.step1.pains[0].scene.trim()) {
    next.data.step1.pains[0].scene = av.past;
    changed = true;
  }
  // Step 2 — Désir (1er bloc)
  if ((av.paradise || av.goals) && !next.data.step2.desires[0].text.trim()) {
    next.data.step2.desires[0].text = av.paradise || av.goals || "";
    changed = true;
  }
  if (av.feeling && !next.data.step2.desires[0].scene.trim()) {
    next.data.step2.desires[0].scene = av.feeling;
    changed = true;
  }
  // Step 2 — Identité (depuis psycho.phrase_avatar)
  if (av.avatar_phrase && !next.data.step2.identity.trim()) {
    next.data.step2.identity = av.avatar_phrase;
    changed = true;
  }
  // Step 8 — Positionnement seed depuis promise.statement
  if (m1.promise?.statement && !next.data.step8.positionnement.trim()) {
    next.data.step8.positionnement = m1.promise.statement;
    changed = true;
  }
  // Step 8 — Phase strategy seed depuis niche.method
  if (m1.niche?.method && !next.data.step8.phase_strategy.trim()) {
    next.data.step8.phase_strategy = m1.niche.method;
    changed = true;
  }

  if (changed) {
    next.data._prefilled_from_m1 = true;
  }
  return next;
}
