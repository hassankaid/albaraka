/**
 * M14 — ARCHITECTURER TON MIDDLE-TICKET — constantes, types & helpers purs.
 * Portage React du code source Sidali v2.0.0 (5 étapes, SANS IA, génération mémo PDF).
 * welcome → format → architecture → pricing → lock.
 */

export const VERSION = "v2.0.0";
export const SCHEMA_VERSION = "m14_v2";
export const STORAGE_KEY = "m14_middle_ticket_state_v1";
export const PROFILE_KEY = "liberty_user_profile_v1";
export const MODULE_ID = "m14";
export const DEBOUNCE_MS = 500;

// ─── Étapes ──────────────────────────────────────────────────────────
export type M14Step = "welcome" | "format" | "architecture" | "pricing" | "lock";

export interface StepMeta { id: M14Step; short: string; full: string; }
export const STEPS_META: StepMeta[] = [
  { id: "welcome", short: "Welcome", full: "Bienvenue — architecturer ton Middle-Ticket" },
  { id: "format", short: "1 · Format", full: "1 · Choisir LE format MT (formation, groupe, masterclass, membership)" },
  { id: "architecture", short: "2 · Architecture", full: "2 · Architecture des modules MT — suggestions auto + ajustements" },
  { id: "pricing", short: "3 · Prix", full: "3 · Fixer le prix MT avec les garde-fous (ratio HT, plancher, valeur perçue)" },
  { id: "lock", short: "4 · Mémo PDF", full: "4 · Signature et génération du mémo PDF téléchargeable" },
];
export const STEP_KEYS: M14Step[] = STEPS_META.map((s) => s.id);
export function stepIndex(k: string): number { return STEP_KEYS.indexOf(k as M14Step); }
export function deepClone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }

// ─── Formats MT ──────────────────────────────────────────────────────
export type FormatKey = "formation" | "groupe" | "masterclass" | "membership";
export interface FormatConfig {
  key: FormatKey; label: string; range: string; desc: string; quand: string;
  prix_min: number; prix_max: number; type_paiement: "one_shot" | "mensuel";
}
export const FORMATS: Record<FormatKey, FormatConfig> = {
  formation: {
    key: "formation", label: "Formation en ligne", range: "197 € — 497 €",
    desc: "Cours vidéo structurés en modules + exercices + ressources téléchargeables. 100% automatisée : une fois créée, elle se vend sans ton intervention. Idéale pour les sujets qui ne nécessitent pas d'accompagnement individuel.",
    quand: "Choisis ce format si ta niche tolère l'autonomie totale (techniques, B2B, opérationnel) et que tu manques de temps pour des calls. Maximum d'automatisation, minimum de présence requise.",
    prix_min: 197, prix_max: 497, type_paiement: "one_shot",
  },
  groupe: {
    key: "groupe", label: "Programme de groupe", range: "297 € — 997 €",
    desc: "La formation vidéo complète + des calls de groupe hebdomadaires en live pour répondre aux questions et maintenir l'engagement. Format hybride : scalable mais avec un contact humain. Le call crée de l'accountability et de la communauté.",
    quand: "Indispensable pour les niches émotionnelles (mindset, relations, parentalité) où le lien fait 50% du résultat. Choisis ce format si tu veux maintenir un contact humain sans rester en 1-to-1.",
    prix_min: 297, prix_max: 997, type_paiement: "one_shot",
  },
  masterclass: {
    key: "masterclass", label: "Masterclass", range: "97 € — 297 €",
    desc: "Un atelier intensif de 3 à 4 heures sur un sujet précis. Rapide à créer, fort engagement, résultat immédiat. Peut être vendue en live puis revendue en replay. Excellent format pour tester un sujet avant de créer une formation complète.",
    quand: "Choisis ce format quand tu veux livrer une transformation rapide sur un sujet ultra-précis, ou quand tu veux tester un angle avant d'investir dans une formation longue.",
    prix_min: 97, prix_max: 297, type_paiement: "one_shot",
  },
  membership: {
    key: "membership", label: "Membership", range: "27 € — 97 € / mois",
    desc: "Contenu nouveau chaque mois + communauté exclusive. Génère des revenus récurrents prévisibles. Nécessite de produire du contenu régulièrement. Fonctionne bien quand ton audience a besoin de mises à jour continues (veille, tendances, nouveaux outils).",
    quand: "Choisis ce format si ton sujet évolue vite (e-commerce, marketing, tech) et que tes prospects ont besoin de mises à jour permanentes plutôt que d'une transformation ponctuelle.",
    prix_min: 27, prix_max: 97, type_paiement: "mensuel",
  },
};
export const FORMAT_KEYS: FormatKey[] = Object.keys(FORMATS) as FormatKey[];

// ─── Matrice de décision (3 critères → orientation format) ────────────
export interface MatriceOption { value: string; label: string; orient: FormatKey; }
export interface MatriceCritere { id: "temps" | "niche" | "cadence"; question: string; options: MatriceOption[]; }
export const MATRICE_CRITERES: MatriceCritere[] = [
  {
    id: "temps",
    question: "Combien de temps actif peux-tu consacrer chaque semaine à délivrer ce MT (calls, lives, support) ?",
    options: [
      { value: "zero", label: "0h — je veux du 100% automatisé", orient: "formation" },
      { value: "une_deux", label: "1 à 2h — un call de groupe par semaine maximum", orient: "groupe" },
      { value: "sprint", label: "Beaucoup ponctuellement, rien le reste du temps (un atelier en bloc)", orient: "masterclass" },
      { value: "continu", label: "Quelques heures chaque mois pour produire du nouveau contenu et animer une communauté", orient: "membership" },
    ],
  },
  {
    id: "niche",
    question: "Ta niche tolère-t-elle l'autonomie totale, ou le lien humain est-il décisif pour le résultat ?",
    options: [
      { value: "autonomie", label: "Autonomie OK — c'est technique ou opérationnel, l'élève peut avancer seul", orient: "formation" },
      { value: "lien_fort", label: "Lien indispensable — émotionnel, mindset, sujet où on doit être tenu", orient: "groupe" },
      { value: "lien_intense_ponctuel", label: "Lien intense mais ponctuel — un déclic en quelques heures", orient: "masterclass" },
      { value: "communaute", label: "Communauté forte — l'effet de groupe et la veille comptent autant que ton contenu", orient: "membership" },
    ],
  },
  {
    id: "cadence",
    question: "Sur quelle cadence tes prospects ont-ils besoin de toi ?",
    options: [
      { value: "transformation_unique", label: "Une transformation complète et durable (puis ils partent autonomes)", orient: "formation" },
      { value: "transformation_accompagnee", label: "Une transformation longue avec accountability hebdomadaire", orient: "groupe" },
      { value: "declic_court", label: "Un déclic / méthode précise sur quelques heures, pas de suivi long", orient: "masterclass" },
      { value: "continu_long_terme", label: "Du nouveau contenu et de la veille en continu sur des mois ou années", orient: "membership" },
    ],
  },
];

// ─── Pricing — règles dures ───────────────────────────────────────────
export const PRIX_PLANCHER_MT = 197; // sous ce seuil, valeur perçue chute violemment
export const RATIO_MAX = 0.33; // MT ≤ 1/3 du HT pour ne pas être confondu
export const RATIO_MIN = 0.1; // MT ≥ 1/10 du HT (en dessous = positionné low-ticket)
export const ECART_MIN_FACTOR = 3; // facteur d'écart minimum HT/MT
export const VALEUR_MULTIPLE_MIN = 5; // valeur perçue ≥ 5× le prix

// ─── Mots-pièges génériques ──────────────────────────────────────────
export const GENERIC_TRAPS = ["sérieux", "serieux", "sérieuse", "serieuse", "ambitieux", "ambitieuse", "premium", "complet", "complète", "complete", "ultimate", "best", "top", "expert", "expertise", "meilleur", "meilleure", "haut de gamme", "exclusif", "exclusive", "révolutionnaire", "revolutionnaire", "disruptif", "disruptive", "innovant", "innovante", "unique en son genre", "sans équivalent", "sans equivalent", "incomparable", "optimisé", "optimise", "optimisée", "professionnel", "professionnelle", "qualitatif", "qualitative"];
export const TRACE_MIN_LENGTH = 15;

// ─── Frictions (mots-clés signalant une dépendance au 1-to-1) ─────────
export interface FrictionPattern { key: string; patterns: RegExp[]; }
export const FRICTION_PATTERNS: FrictionPattern[] = [
  { key: "individuel_validation", patterns: [/valid[ée]?\s+(par|en)\s+(le\s+)?coach/i, /signé(e)?\s+par\s+le\s+coach/i, /1[\s-]?to[\s-]?1/i, /coaching\s+individuel/i, /individuell?ement/i, /retour\s+individuel/i, /grille\s+d['']évaluation\s+sign[ée]/i] },
  { key: "role_play_live", patterns: [/r[ôo]le[\s-]?play/i, /jeu\s+de\s+r[ôo]le/i, /audio\s+(validé|sign[ée])/i, /enregistrement\s+(audio|validé|sign[ée])/i] },
  { key: "suivi_long_personnel", patterns: [/60\s+jours?\s+cons[ée]cutifs?/i, /90\s+jours?\s+cons[ée]cutifs?/i, /accountability\s+hebdo/i, /accountability\s+coach/i, /tenir\s+\d+\s+jours?/i] },
  { key: "audit_personnel", patterns: [/audit\s+sign[ée]/i, /audit\s+chiffr[ée]/i, /document\s+de\s+d[ée]cision/i, /validé\s+par\s+expert/i] },
];

// ─── Adaptations pré-écrites (format × friction) ──────────────────────
export const ADAPTATIONS_PAR_FORMAT: Record<FormatKey, Record<string, string>> = {
  formation: {
    individuel_validation: "Remplacer la validation individuelle par 3 audios/vidéos modèles commentés + une grille d'auto-évaluation en 10-12 points que l'élève remplit seul.",
    role_play_live: "Fournir 5 à 10 enregistrements de cas réels commentés en voix off, plus une checklist d'auto-évaluation. L'élève bosse en autonomie en s'auto-filmant si besoin.",
    suivi_long_personnel: "Découper en mini-jalons hebdomadaires avec un tracker imprimable autonome — chaque semaine l'élève coche ses preuves.",
    audit_personnel: "Fournir un template d'audit pré-rempli avec exemples de 3 cas-types différents, à dupliquer et adapter.",
  },
  groupe: {
    individuel_validation: "Atelier hot seat pendant le call de groupe hebdo : chaque élève passe 15-20 minutes sur le grill, les autres challengent et valident peer-to-peer.",
    role_play_live: "Rôle-play en sous-groupes de 3-4 pendant le call de groupe : chacun reçoit 2-3 feedbacks de pairs, le coach intervient seulement sur les blocages structurels.",
    suivi_long_personnel: "Le call de groupe hebdo sert d'accountability check — chaque élève reporte ses preuves en 2 minutes au début, le groupe relance ceux qui décrochent.",
    audit_personnel: "Audit collectif en call de groupe : 3 élèves volontaires partagent leur audit, les autres analysent et challengent en collectif.",
  },
  masterclass: {
    individuel_validation: "Bloc live de 45-60 min pendant la masterclass avec exercice guidé en direct + validation peer-to-peer en binômes éphémères.",
    role_play_live: "Démonstration commentée en live par toi (20 min) puis exercice flash en binômes (20 min) avec retour collectif.",
    suivi_long_personnel: "Sortir ce module — un suivi long ne tient pas dans une masterclass de 3-4h. Garder seulement le déclic initial.",
    audit_personnel: "Audit guidé en direct sur 1 cas-type fourni par toi + chaque participant fait son propre audit en parallèle (30-40 min).",
  },
  membership: {
    individuel_validation: "Chaîne dédiée dans le Discord/Telegram où les membres postent leurs preuves et reçoivent du feedback peer-to-peer + 1 live d'audit collectif mensuel.",
    role_play_live: "Banque d'enregistrements partagée par les membres + 1 session d'analyse collective par mois en live.",
    suivi_long_personnel: "Tracker partagé dans la communauté + 1 update mensuel sur les bonnes pratiques émergentes.",
    audit_personnel: "Audit mensuel : 3 membres volontaires soumettent leur cas, analyse en live, archive dans la bibliothèque.",
  },
};

// ─── State ───────────────────────────────────────────────────────────
export type Decision = "" | "garder" | "adapter" | "retirer";
export interface ModuleDecision {
  index: number; nom_origine: string; objectif_origine: string; livrable_origine: string;
  duree_video_min: number; decision: Decision; adaptation: string;
}
export interface MatriceReponses { temps: string; niche: string; cadence: string; }
export interface M14Data {
  formats_explores: string[];
  format_choisi: string;
  format_justification: string;
  matrice_reponses: MatriceReponses;
  modules_decision: ModuleDecision[];
  modules_decision_format_origine: string;
  prix_mt: number;
  prix_mt_unite: string;
  valeur_percue_eur: number;
  justification_prix: string;
}
export interface M14State {
  version: string; module: string; schema_version: string;
  data: M14Data;
  highest: M14Step; current: M14Step;
  signed: boolean; signed_at: string | null; signed_by: string;
  demoMode: string | null; _activeDemo: string | null; _commit?: boolean;
  upstream_forced: boolean;
  m1_data: any; m1_source: string | null;
  m3_data: any; m3_source: string | null;
  m5_data: any; m5_source: string | null;
  m6_data: any; m6_source: string | null;
  m7_data: any; m7_source: string | null;
  m10_data: any; m10_source: string | null;
  m11_data: any; m11_source: string | null;
  m12_data: any; m12_source: string | null;
  m13_data: any; m13_source: string | null;
  last_save?: string | null;
  _updated_at?: string;
}

export function freshData(): M14Data {
  return {
    formats_explores: [],
    format_choisi: "",
    format_justification: "",
    matrice_reponses: { temps: "", niche: "", cadence: "" },
    modules_decision: [],
    modules_decision_format_origine: "",
    prix_mt: 0,
    prix_mt_unite: "",
    valeur_percue_eur: 0,
    justification_prix: "",
  };
}
export function defaultM14State(): M14State {
  return {
    version: VERSION, module: "M14_MIDDLE_TICKET", schema_version: SCHEMA_VERSION,
    data: freshData(),
    highest: "welcome", current: "welcome",
    signed: false, signed_at: null, signed_by: "",
    demoMode: null, _activeDemo: null, _commit: false,
    upstream_forced: false,
    m1_data: null, m1_source: null,
    m3_data: null, m3_source: null,
    m5_data: null, m5_source: null,
    m6_data: null, m6_source: null,
    m7_data: null, m7_source: null,
    m10_data: null, m10_source: null,
    m11_data: null, m11_source: null,
    m12_data: null, m12_source: null,
    m13_data: null, m13_source: null,
    last_save: null,
  };
}
