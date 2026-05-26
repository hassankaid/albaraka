/**
 * État global persistant du M4 VALUE LADDER (v1.2.3 Sidali).
 * 5 étapes (welcome + vue_ensemble + niveau_entree + passerelles + lock)
 * 4 marches (freemium / low / mid / high), Ultra reporté à M18
 * 4 stratégies d'entrée + 6 bridges possibles (filtrés par stratégie)
 */

export type M4Step = "welcome" | "vue_ensemble" | "niveau_entree" | "passerelles" | "lock";

export type MarketType = "b2c_info" | "b2c_transfo" | "b2b";

export type TierId = "freemium" | "low" | "mid" | "high";

export type EntryStrategy = "ht_only" | "ht_lt" | "ht_mt" | "full";

export type BridgeKey =
  | "free_to_low"
  | "free_to_mid"
  | "free_to_high"
  | "low_to_mid"
  | "low_to_high"
  | "mid_to_high";

export const VALIDATION_THRESHOLD = 80;
export const FORCE_AVAILABLE_AFTER = 3;
export const MIN_BRIDGE_LENGTH = 60;

// ─── Imports M1 + M2 + M3 ────────────────────────────────────────────────
export interface M1ImportData {
  source: string;
  sous_niche_2?: {
    phrase_finale?: string;
    cible?: string;
    douleur?: string;
    methode?: string;
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
    step8?: {
      positionnement?: string;
      hook_principal?: string;
      levier_secondaire?: string;
      biais_killer?: string;
      phase_strategy?: string;
      directives_copywriting?: string;
    };
    step2?: { identity?: string };
  };
  scores?: Record<string, number | null>;
}

/** Snapshot M3 — calque du push qu'effectue LockScreen M3 dans liberty_user_profile.m3 */
export interface M3ImportData {
  source: string;
  version?: string;
  complete?: boolean;
  market_type?: MarketType | null;
  promesse?: string;
  mecanisme?: { nom: string; etapes: string[] };
  vehicule?: { format: string; justification: string; validated: boolean };
  bonus?: Array<{ nom: string; valeur: string; raison: string }>;
  garantie?: { type: string; formulation: string };
  urgence?: { type: string; justification: string };
  prix?: {
    montant: string;
    leviers?: Record<string, { score: number; justification: string }>;
    levier_faible?: string;
    alignements?: { format: boolean; cible: boolean; ancrage: boolean };
  };
  scores?: Record<string, number>;
  /** Score global moyen calculé côté M3 LockScreen — sert au suggestEntryStrategy */
  prix_score_global?: number;
}

// ─── Tiers (marches) ─────────────────────────────────────────────────────
export interface TierState {
  id: string;
  name: string;
  price: string;
  format: string;
  rationale: string;
}

// ─── Entry strategy (étape 2) ────────────────────────────────────────────
export interface EntryState {
  strategy: EntryStrategy | null;
  rationale: string;
  score: number | null;
  feedback: string;
  ai_mode: "cloud" | "local" | null;
  attempts: number;
  forced: boolean;
  ht_monthly_target: string;
  lt_breakeven_check: string;
}

// ─── State global M4 ─────────────────────────────────────────────────────
export interface M4State {
  version: string;
  current_step: M4Step;
  market_type: MarketType | null;

  m1_data: M1ImportData | null;
  m2_data: M2ImportData | null;
  m3_data: M3ImportData | null;

  ladder: Record<TierId, TierState>;
  bridges: Record<BridgeKey, string>;
  entry: EntryState;

  signed: boolean;
  signed_name: string;
  signed_at: string | null;

  completed: boolean;
  demoMode: string | null;
  _updated_at?: string;
}

function emptyTier(): TierState {
  return { id: "", name: "", price: "", format: "", rationale: "" };
}

export function defaultM4State(): M4State {
  return {
    version: "v1.2.3",
    current_step: "welcome",
    market_type: null,
    m1_data: null,
    m2_data: null,
    m3_data: null,
    ladder: {
      freemium: emptyTier(),
      low: emptyTier(),
      mid: emptyTier(),
      high: emptyTier(),
    },
    bridges: {
      free_to_low: "",
      free_to_mid: "",
      free_to_high: "",
      low_to_mid: "",
      low_to_high: "",
      mid_to_high: "",
    },
    entry: {
      strategy: null,
      rationale: "",
      score: null,
      feedback: "",
      ai_mode: null,
      attempts: 0,
      forced: false,
      ht_monthly_target: "",
      lt_breakeven_check: "",
    },
    signed: false,
    signed_name: "",
    signed_at: null,
    completed: false,
    demoMode: null,
  };
}

// ─── Constantes Sidali (verbatim) ────────────────────────────────────────
export const TIERS: TierId[] = ["freemium", "low", "mid", "high"];

export const TIER_LABELS: Record<TierId, string> = {
  freemium: "Freemium / Lead magnet",
  low: "Low-ticket / Tripwire",
  mid: "Mid-ticket",
  high: "High-ticket",
};

export const TIER_PRICE_RANGES: Record<TierId, string> = {
  freemium: "0€",
  low: "7-97€",
  mid: "100-997€",
  high: "1 000-9 999€",
};

export const TIER_ROLES: Record<TierId, string> = {
  freemium: "Attirer ton avatar dans ton univers",
  low: "Tripwire — convertir le curieux en client (perte ou breakeven)",
  mid: "Capter les indécis avec une version DIY",
  high: "Sommet — moteur de profit, finance la value ladder",
};

export interface EntryStrategyDef {
  label: string;
  desc: string;
  when: string;
  active_tiers: TierId[];
  bridges_needed: BridgeKey[];
}

export const ENTRY_STRATEGIES: Record<EntryStrategy, EntryStrategyDef> = {
  ht_only: {
    label: "HT seul + lead magnet",
    desc: "Tu commercialises uniquement le high-ticket. Un freemium (quiz, audit, masterclass) capture les leads — qui aboutissent en appel discovery vers le HT. Pas de LT, pas de MT.",
    when: "Recommandé tant que tu n'as pas 10 happy clients HT documentés. C'est l'option par défaut.",
    active_tiers: ["freemium", "high"],
    bridges_needed: ["free_to_high"],
  },
  ht_lt: {
    label: "HT + LT (saut LT → HT)",
    desc: "Tu commercialises le HT ET un tripwire 7-97€. Le LT pré-qualifie les leads (un client qui paie 47€ est mille fois plus prêt à entendre l'offre HT qu'un téléchargeur de PDF gratuit).",
    when: "Quand tu veux scaler le volume de leads chauds qualifiés et que ton HT est déjà rodé (15+ clients HT).",
    active_tiers: ["freemium", "low", "high"],
    bridges_needed: ["free_to_low", "low_to_high"],
  },
  ht_mt: {
    label: "HT + MT (saut MT → HT)",
    desc: "Tu commercialises le HT ET une version DIY mid-ticket 297-997€. Le MT capte les indécis qui ne mettent pas 3 000€ mais 497€ oui.",
    when: "Quand tu observes beaucoup de prospects « trop chers pour moi » sur ton HT et que tu as une vraie matière pédagogique structurable en autonomie.",
    active_tiers: ["freemium", "mid", "high"],
    bridges_needed: ["free_to_mid", "mid_to_high"],
  },
  full: {
    label: "Full ladder (4 marches)",
    desc: "Tu construis et commercialises les 4 niveaux en parallèle. Tunnel automatisé qui fait monter le client de marche en marche.",
    when: "Réservé aux écosystèmes matures : 30+ ventes HT à ton actif, un MT déjà validé, un LT qui paie ses propres ads, du staff opérationnel pour gérer la complexité.",
    active_tiers: ["freemium", "low", "mid", "high"],
    bridges_needed: ["free_to_low", "low_to_mid", "mid_to_high"],
  },
};

export interface BridgeDef {
  id: BridgeKey;
  from: string;
  to: string;
  why: string;
  script: string;
  pitfall: string;
}

export const BRIDGE_DEFINITIONS: BridgeDef[] = [
  {
    id: "free_to_low",
    from: "Freemium",
    to: "Low-ticket",
    why: "Le prospect a consommé ton lead magnet. La friction qui le bloque maintenant n'est plus l'intérêt (résolu par le freemium) mais l'engagement : « est-ce qu'il vaut le coup que je sorte ma carte ? » Le LT répond à ça en demandant un effort minimal (7-97€) qui crée la première transaction — psychologiquement c'est le saut le plus dur.",
    script: "Email J+3 après lead magnet : « Tu as téléchargé le quiz 'Es-tu fait pour le closing' la semaine dernière. Pour 27€, j'ai préparé un mini-cours de 90 min qui te montre les 3 premières conversations type d'un setter — exact mots à dire, gestion des 5 objections de base, mes propres captures d'écran de DMs qui ont signé. »",
    pitfall: "L'erreur classique : vendre directement le HT après un lead magnet. Le saut est trop violent — tu perds 95% du trafic.",
  },
  {
    id: "free_to_mid",
    from: "Freemium",
    to: "Mid-ticket",
    why: "Sans LT intermédiaire, le saut freemium → MT (~497€) demande un argument plus solide. Le freemium doit donc être plus engageant (masterclass live de 60 min, simulateur poussé, audit gratuit) — pas un simple PDF. La masterclass crée la conviction nécessaire à un achat 497€ direct.",
    script: "Fin de masterclass live : « Si tu as senti que cette masterclass t'a clarifié 80% du chemin, le programme 30 jours s'ouvre à 497€ avec un bonus offert pour les présents au live — Q&A en fin de session pour qu'on aborde TON cas. »",
    pitfall: "L'erreur classique : avoir un freemium « PDF passif » trop faible pour amorcer un achat 497€ direct. Soit tu mets un LT entre les deux, soit tu muscles ton freemium en live ou en outil interactif.",
  },
  {
    id: "free_to_high",
    from: "Freemium",
    to: "High-ticket",
    why: "Saut direct lead magnet → call discovery HT (3 000€+). C'est la stratégie HT seul. Possible UNIQUEMENT si ton freemium est très qualifiant (quiz pointu, audit personnalisé sous 48h, masterclass storytelling avec preuve avant/après écrasante) et si ton call discovery est cadré pour pré-qualifier brutalement.",
    script: "Fin du quiz/audit : « Ton diagnostic montre que tu es en phase 3/4 — c'est exactement les profils sur lesquels notre programme 90 jours fonctionne le mieux. Voici le lien pour réserver un call discovery de 30 min — pas un appel commercial, vraiment une analyse de ta situation pour voir si on peut bosser ensemble. »",
    pitfall: "L'erreur classique : convertir trop large au lead magnet → tu te retrouves avec 80% de prospects non qualifiés en call. Soit ton freemium qualifie, soit tu te noies dans des calls non-rentables.",
  },
  {
    id: "low_to_mid",
    from: "Low-ticket",
    to: "Mid-ticket",
    why: "Le client LT t'a payé 27€, il sait que tu livres. Il a vu ta méthode marcher sur ses premières actions mais il plafonne sur l'application — il a les outils, il lui manque le cadre. Le MT répond : « même méthode, mais avec une structure 30-60 jours qui te tient la main. »",
    script: "Upsell page-pricing direct dans le LT : « Tu viens de finir le mini-cours. Si tu sens que tu as la matière mais qu'il te faut un cadre pour passer à l'action sérieusement, j'ai un programme 30 jours à 297€ qui te donne le plan exact + un Slack d'élèves + 1 audit hebdo en groupe. »",
    pitfall: "L'erreur classique : faire un MT qui est juste « plus long » que le LT. Le MT doit ajouter une vraie couche (structure, cadre, communauté) — sinon il cannibalise le LT.",
  },
  {
    id: "low_to_high",
    from: "Low-ticket",
    to: "High-ticket",
    why: "Stratégie HT + LT sans MT. Le LT pré-qualifie le prospect (premier achat = signal d'intention), puis tu sautes directement au HT. La passerelle doit fortement valoriser le passage du DIY (LT) à l'accompagnement humain dense (HT).",
    script: "Email J+7 du tripwire : « Tu as appliqué les 3 DM ? Si tu sens que la méthode marche mais que tu veux 10× plus vite avec un accompagnement individuel, on ouvre 4 places pour le programme 90 jours — un call discovery pour voir si on bosse ensemble. »",
    pitfall: "L'erreur classique : le saut est trop grand sans MT pour amortir. Si ton LT est à 27€ et ton HT à 5 000€, tu perds 90% des LT en route. Ce bridge ne marche que si ton LT est ≥ 47€ et ton HT ≤ 3 500€.",
  },
  {
    id: "mid_to_high",
    from: "Mid-ticket",
    to: "High-ticket",
    why: "Le client MT a appliqué la méthode, il a obtenu des premiers résultats (témoignages, métriques mesurables). Il rencontre l'obstacle suivant : la croissance lui demande quelque chose qu'il ne sait pas faire seul (négocier, déléguer, scaler, structurer juridiquement). Le HT répond.",
    script: "Live final J28 du MT : « Vous avez démarré, vous savez que la méthode marche. L'étape suivante c'est de signer 5 clients en 90 jours avec un audit individuel mensuel + un Slack 1-1 prioritaire. J'offre un call de bilan offert aux élèves MT. »",
    pitfall: "L'erreur classique : laisser le MT être une fin en soi. Sans bridge explicite vers le HT, 80% des clients MT restent là — alors qu'ils étaient prêts à monter.",
  },
];

export const BRIDGE_BY_ID: Record<BridgeKey, BridgeDef> = BRIDGE_DEFINITIONS.reduce(
  (acc, b) => { acc[b.id] = b; return acc; },
  {} as Record<BridgeKey, BridgeDef>,
);

// ─── Helpers ────────────────────────────────────────────────────────────
export function pickAvatarName(state: M4State): string {
  const nom = state.m1_data?.avatar?.socio?.nom?.trim();
  return nom || "ton avatar";
}

export function pickNiche(state: M4State): string {
  return state.m1_data?.sous_niche_2?.phrase_finale
    ?? state.m1_data?.sous_niche_2?.phrase
    ?? state.m1_data?.sous_niche_2?.cible
    ?? "ta niche";
}

export function pickMarketLabel(market: MarketType | null): string {
  if (!market) return "—";
  if (market === "b2c_info") return "B2C · Info";
  if (market === "b2c_transfo") return "B2C · Transfo";
  return "B2B";
}

/** Suggère la stratégie d'entrée selon le score moyen M3 (règle d'or Sidali). */
export function suggestEntryStrategy(state: M4State): EntryStrategy {
  const m3 = state.m3_data;
  if (!m3 || !m3.complete) return "ht_only";
  const score = m3.prix_score_global ?? 0;
  if (score < 80) return "ht_only";
  // 80-89 → ht_mt (règle "10 clients HT avant un MT")
  // 90+ → ht_mt reste conservateur (full requiert conditions externes)
  return "ht_mt";
}
