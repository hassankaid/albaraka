// État global persistant de l'outil M1 NICHE (V2).
// Réplique fidèle du `defaultState()` du HTML standalone Sidali.

export type M1Step =
  | "welcome"
  | "branchA_bilan"
  | "branchA_brainstorm"
  | "branchA_propositions"
  | "branchB_capture"
  | "branchB_stress"
  | "sous_niche_2"
  | "avatar"
  | "validation"
  | "engagement"
  | "recap";

export type M1Branch = "A" | "B" | null;

export interface BilanState {
  archetype: { id: string; emoji: string; label: string } | null;
  marche: { id: string; label: string; sous_segment: string } | null;
  vecu: string;
  competence: string;
}

export interface BrainstormState {
  niches: string[];        // 5 entrées
  competences: string[];   // 5 entrées
  vecu_long: string;
}

export interface AIProposition {
  titre: string;
  cible: string;
  douleur: string;
  pouvoir_achat: string;
  alignement: string;
  // Champs optionnels — l'IA peut aussi remplir ces champs pour pré-alimenter
  // la sous-niche 2.0 si elle veut prendre la liberté.
  contact?: string;
  croissance?: string;
  methode?: string;
  phrase?: string;
}

export interface StressVerdictData {
  verdict: "solide" | "fragile";
  titre: string;
  diagnostic: string;
  next_action: string;
}

export interface CaptureState {
  idee: string;
  vecu: string;
  pourquoi: string;
}

export interface StressTestState {
  lives_from_skill: string;
  three_people: string;
  revenue_proof: string;
  verdict: "solide" | "fragile" | null;
}

// Sous-niche 2.0 — V2 avec 7 champs (ajout de contact + croissance).
export interface SousNiche2State {
  cible: string;
  douleur: string;
  pouvoir_achat: string;
  contact: string;     // 📡 V2 — Facile à contacter (canaux)
  croissance: string;  // 📈 V2 — Croissance du marché (≥10%/an)
  methode: string;
  phrase: string;
}

export interface AvatarSocioState {
  sexe: string;
  nom: string;
  age: string;
  lieu: string;
  revenu: string;
  compagnon: string;
  relations: string;
  situation: string;
}

export interface AvatarPsychoState {
  probleme: string;
  objectifs: string;
  consequences: string;
  passe: string;
  sentiment: string;
  paradis: string;
  phrase_avatar: string;
}

export interface AvatarState {
  photo_url: string;
  socio: AvatarSocioState;
  psycho: AvatarPsychoState;
}

export interface ValidationState {
  demande_q1: string;
  demande_q2: string;
  concurrence_q1: string;
  concurrence_q2: string;
  perennite_q1: string;
  perennite_q2: string;
  perennite_q3: string;
  alignement_q1: string;
  alignement_q2: string;
  alignement_q3: string;
}

export interface EngagementState {
  nom_complet: string;
  date_signature: string | null;
}

export interface M1State {
  step: M1Step;
  branch: M1Branch;
  /** Sous-étape du Bilan d'orientation (Branche A) : 0..5 — persistée pour reprise au reload. */
  bilan_step?: number;
  // Branche A
  bilan: BilanState;
  brainstorm: BrainstormState;
  ai_propositions: AIProposition[];
  selected_proposition: number | null;
  // Branche B
  capture: CaptureState;
  stress_test: StressTestState;
  // Communes
  sous_niche_2: SousNiche2State;
  avatar: AvatarState;
  validation: ValidationState;
  engagement: EngagementState;
  // Méta
  completed: boolean;
  demoMode: string | null;
  _updated_at?: string;
}

export function defaultM1State(): M1State {
  return {
    step: "welcome",
    branch: null,
    bilan_step: 0,
    bilan: { archetype: null, marche: null, vecu: "", competence: "" },
    brainstorm: {
      niches: ["", "", "", "", ""],
      competences: ["", "", "", "", ""],
      vecu_long: "",
    },
    ai_propositions: [],
    selected_proposition: null,
    capture: { idee: "", vecu: "", pourquoi: "" },
    stress_test: {
      lives_from_skill: "",
      three_people: "",
      revenue_proof: "",
      verdict: null,
    },
    sous_niche_2: {
      cible: "",
      douleur: "",
      pouvoir_achat: "",
      contact: "",
      croissance: "",
      methode: "",
      phrase: "",
    },
    avatar: {
      photo_url: "",
      socio: {
        sexe: "", nom: "", age: "", lieu: "",
        revenu: "", compagnon: "", relations: "", situation: "",
      },
      psycho: {
        probleme: "", objectifs: "", consequences: "",
        passe: "", sentiment: "", paradis: "", phrase_avatar: "",
      },
    },
    validation: {
      demande_q1: "", demande_q2: "",
      concurrence_q1: "", concurrence_q2: "",
      perennite_q1: "", perennite_q2: "", perennite_q3: "",
      alignement_q1: "", alignement_q2: "", alignement_q3: "",
    },
    engagement: { nom_complet: "", date_signature: null },
    completed: false,
    demoMode: null,
  };
}

// Profil pivot — agrégat exporté vers `liberty_user_profile` à la fin du M1.
// Lu ensuite par M2 → M14, M16, M18 pour pré-remplir leurs champs.
export interface M1ProfilePivot {
  m1_completed_at: string;
  branch: M1Branch;
  archetype?: BilanState["archetype"];
  marche?: BilanState["marche"];
  sous_niche_2: SousNiche2State;
  avatar: AvatarState;
}
