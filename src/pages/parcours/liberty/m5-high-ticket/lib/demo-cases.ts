/**
 * Mode démo M5 — 11 cas pré-remplis (10 cohortes + 1 zone warn Aïcha v0.5)
 * Calque DEMO_CASES Sidali v1.1.1 — anti-patterns Younes + Lina, scoring durci.
 *
 * 3 cas initiaux activés (Karim + Lina + Aïcha v0.5) — les 8 autres en
 * placeholder `ready: false` pour transcription par lots ultérieurs.
 */

import type { M5State } from "./types";

export interface M5DemoCase {
  key: string;
  segment: "argent" | "relations" | "sante";
  emoji: string;
  title: string;
  summary: string;
  is_anti_pattern: boolean;
  warn_zone?: boolean;
  ready: boolean;
  patch?: Partial<M5State>;
}

// ── Helpers de construction démo ──────────────────────────────────────
function buildBaseDemo(opts: {
  avatar: string;
  niche: string;
  m2_pain: string;
  m3_promesse: string;
  m3_mecanisme: string;
  m3_prix: string;
  m4_strategy: M5State["m4_data"]["entry_strategy"];
  m4_ht_target: number;
  m4_forced: boolean;
}): Partial<M5State> {
  return {
    step: "pont",
    m1_data: {
      source: "demo",
      sous_niche_2: { phrase: opts.niche, phrase_finale: opts.niche },
      avatar: { socio: { nom: opts.avatar } },
      marche: { id: "argent", label: "💰" },
    },
    m1_source: "profile",
    m2_data: {
      source: "demo",
      data: { dominant_pain: opts.m2_pain },
    },
    m2_source: "profile",
    m3_data: {
      source: "demo",
      complete: true,
      promesse: opts.m3_promesse,
      headline_promesse: opts.m3_promesse,
      hero_mecanisme_nom: opts.m3_mecanisme,
      prix_display: opts.m3_prix,
      prix_score_global: 78,
    },
    m3_source: "profile",
    m4_data: {
      source: "demo",
      complete: true,
      entry_strategy: opts.m4_strategy,
      ht_monthly_target: opts.m4_ht_target,
      strategy_score_is_forced: opts.m4_forced,
      ht: { name: opts.m3_mecanisme, price: opts.m3_prix, format: "12 sem · groupe + 1to1", rationale: "" },
    },
    m4_source: "profile",
    upstream_forced: opts.m4_forced,
  };
}

// ── 1 · Karim · Affiliation halal (bon cas, ht_lt, scoring 88-95) ──────
const KARIM_PATCH: Partial<M5State> = {
  ...buildBaseDemo({
    avatar: "Karim",
    niche: "Salariés musulmans 25-40 ans qui veulent générer 1 500-5 000€/mois en affiliation halal en 90 jours",
    m2_pain: "Frustration de bosser 35h/semaine pour un salaire qui ne lui permet ni d'épargner sérieusement, ni d'aider sa mère",
    m3_promesse: "Faire 1 000€ de commission sur ton premier cycle de 60 jours en affiliation halal, sans toucher au riba",
    m3_mecanisme: "Méthode Tawakkul Affiliate™",
    m3_prix: "2 997€",
    m4_strategy: "ht_lt",
    m4_ht_target: 8,
    m4_forced: false,
  }),
  data: {
    pont: {
      pointA: { selected_pain_idx: 0, custom_text: "", formulated: "Karim est un salarié à 2 200€/mois qui a la peur du dimanche soir, n'arrive pas à épargner, et ne peut pas aider sa mère ni assumer son rôle de fils." },
      pointB: { measurable_outcome: "Encaisser 1 000€ de commission halal sur son premier cycle de 60 jours, prouvant la reproductibilité du système", timeframe_days: 60, formulated: "Karim passe de salarié coincé à 2 200€/mois à affilié halal qui ramène 1 000€ de commission validée en 60 jours." },
      bridge_summary: "Le pont : un système d'affiliation 100% halal, 30 produits sélectionnés, scripts DM éprouvés, coaching humain, communauté de pairs.",
    },
    conditions: {
      simple:       { score: 8, justification: "DWY : on fournit les produits, scripts, funnels. Karim n'a qu'à exécuter 7h/sem. Pas de DFY (il fait ses DM), mais 80% du chemin est pré-mâché.", delivery_mode: "DWY" },
      rapide:       { score: 7, justification: "Promesse en 60 jours pour la 1ère commission. C'est rapide pour un revenu complémentaire halal — la concurrence promet souvent 6 mois.", timeframe_days: 60 },
      systematique: { score: 6, justification: "11 témoignages clients existent. Méthode appliquée à un avatar précis. Manque encore de cas dans des sous-segments (femmes, jeunes diplômés).", proof_type: "11 témoignages vidéo + captures Stripe" },
      aspirante:    { score: 9, justification: "Quitter Orange, faire la omra cash, aider sa mère 200€/mois sans calculer — tout en restant 100% halal. La promesse couvre les 3 leviers : argent, foi, dignité familiale.", amplitude: "Quitter le CDI en 18 mois + omra cash + aide familiale régulière" },
      weakest_axis: "systematique",
      action_plan: "Prioriser la collecte de 5 témoignages dans des sous-profils manquants (mères, jeunes diplômés) avant le prochain lancement, pour que la promesse devienne plus universelle.",
    },
    eatcomplex: {
      rows: [
        { client_step: "Trouver 30 produits halal qui paient bien", what_you_eat: "Annuaire de 50 produits halal commissionnés pré-vérifiés en sharia, classés par secteur", what_remains: "Choisir les 5 qui résonnent avec ses valeurs et son audience" },
        { client_step: "Créer un funnel DM qui convertit", what_you_eat: "Pack de 30 scripts DM testés sur 200 prospects + templates landing pages dupliquables", what_remains: "Adapter les variables {prénom}, {pain point} à son avatar" },
        { client_step: "Apprendre à closer un appel à 2 500€", what_you_eat: "Setters/closers AL BARAKA en place : Karim rabat les leads, ils ferment", what_remains: "Faire les DM et stories — le closing est externalisé" },
        { client_step: "Gérer ses émotions face au refus", what_you_eat: "Module mindset + 1 call collectif/semaine + communauté Telegram active", what_remains: "Poster ses victoires + ses doutes dans la communauté" },
        { client_step: "Tracker ses chiffres pour optimiser", what_you_eat: "Dashboard Notion pré-construit avec formules de conversion auto-calculées", what_remains: "Remplir 10 min/jour : prospects contactés, RDV, signatures" },
      ],
    },
    structure: {
      total_weeks: 12, promise_days: 90,
      phases: [
        { num: 1, name: "Fondation halal & cartographie", weeks: "1-3", livrables: "Sa liste de 5 produits validés + son angle éthique unique + son tunnel Instagram + LinkedIn opérationnel" },
        { num: 2, name: "Activation prospection", weeks: "4-7", livrables: "50 conversations qualifiées/semaine + 10 RDV pris + intégration au flux setters/closers AL BARAKA" },
        { num: 3, name: "Première commission & scaling", weeks: "8-12", livrables: "Première commission de 300€+ encaissée + plan de scaling à 1 500€/mois récurrent + témoignage filmé" },
      ],
      mecanisme_anchor: "Méthode Tawakkul Affiliate™",
    },
    conviction: {
      checklist: { sur_delivre: true, ten_clients: true, believe_price: true, recommend_to_brother: true, prepared_objections: true },
      missing: "Rien de critique. La conviction est solide après 18 mois de tracking et 11 transformations validées.",
      next_action: "Continuer à filmer 1 témoignage par mois pour renforcer la preuve sociale.",
    },
  },
  scores: { pont: 92, conditions: 88, eatcomplex: 90, structure: 87, conviction: 95 },
  attempts: { pont: 1, conditions: 1, eatcomplex: 1, structure: 1, conviction: 1 },
  forced: { pont: false, conditions: false, eatcomplex: false, structure: false, conviction: false },
  highest: "lock",
};

// ── 10 · Lina · Anti-pattern full ladder + name-drop ───────────────────
const LINA_PATCH: Partial<M5State> = {
  ...buildBaseDemo({
    avatar: "Lina",
    niche: "Étudiantes musulmanes qui veulent gérer leur anxiété sans antidépresseurs",
    m2_pain: "Avoir des crises d'angoisse pendant les examens",
    m3_promesse: "Te débarrasser de ton anxiété",
    m3_mecanisme: "Sereine Méthode",
    m3_prix: "2 497€",
    m4_strategy: "full",
    m4_ht_target: 20,
    m4_forced: true,
  }),
  data: {
    pont: {
      pointA: { selected_pain_idx: 0, custom_text: "", formulated: "Mes clientes sont stressées par les études." },
      pointB: { measurable_outcome: "Devenir plus sereine", timeframe_days: 30, formulated: "Elle va devenir zen." },
      bridge_summary: "Je leur apprends à respirer.",
    },
    conditions: {
      simple:       { score: 9, justification: "C'est très simple, juste à écouter mes audios.", delivery_mode: "DIY" },
      rapide:       { score: 10, justification: "En 21 jours c'est plié.", timeframe_days: 21 },
      systematique: { score: 7, justification: "9 étudiantes m'ont remerciée, comme Sarah Knight et Mel Robbins le font avec leurs followers.", proof_type: "9 DMs de remerciement" },
      aspirante:    { score: 10, justification: "Être libérée à vie de l'anxiété, c'est immense.", amplitude: "Guérir l'anxiété pour toujours" },
      weakest_axis: "rapide",
      action_plan: "Pousser plus fort sur TikTok pour ne pas me faire prendre la place par d'autres.",
    },
    eatcomplex: {
      rows: [
        { client_step: "Apprendre à gérer ses crises", what_you_eat: "Je donne des conseils dans les audios", what_remains: "Faire le travail intérieur, comprendre ses déclencheurs, tenir un journal, appliquer en conditions réelles dans les examens et les confrontations familiales, gérer les rechutes seule" },
        { client_step: "Comprendre ses pensées", what_you_eat: "J'explique en vidéo", what_remains: "Identifier ses propres patterns, faire la thérapie cognitive seule, gérer les nuits sans sommeil, apprendre à respirer en pleine crise sans aide extérieure" },
        { client_step: "", what_you_eat: "", what_remains: "" },
        { client_step: "", what_you_eat: "", what_remains: "" },
        { client_step: "", what_you_eat: "", what_remains: "" },
      ],
    },
    structure: {
      total_weeks: 6, promise_days: 30,
      phases: [
        { num: 1, name: "Comprendre", weeks: "1-2", livrables: "Tu comprends ton anxiété" },
        { num: 2, name: "Pratiquer", weeks: "3-4", livrables: "Tu pratiques les outils" },
        { num: 3, name: "Maîtriser", weeks: "5-6", livrables: "Tu maîtrises tout" },
      ],
      mecanisme_anchor: "Sereine Méthode",
    },
    conviction: {
      checklist: { sur_delivre: true, ten_clients: true, believe_price: true, recommend_to_brother: true, prepared_objections: true },
      missing: "",
      next_action: "Lancer un mid-ticket et un low-ticket en même temps pour scaler.",
    },
  },
  scores: { pont: 22, conditions: 35, eatcomplex: 18, structure: 28, conviction: 32 },
  attempts: { pont: 2, conditions: 2, eatcomplex: 2, structure: 2, conviction: 2 },
  forced: { pont: false, conditions: false, eatcomplex: false, structure: false, conviction: false },
  highest: "lock",
};

// ── 11 · Aïcha v0.5 · zone warn (80-90) — pont solide, conditions molles ─
const AICHA_V05_PATCH: Partial<M5State> = {
  ...buildBaseDemo({
    avatar: "Aïcha · v0.5",
    niche: "Femmes 27-34 ans, prêtes pour le mariage halal, post-7 années d'errance affective",
    m2_pain: "Je ne sais plus si je dois encore espérer ou apprendre à vivre seule. Je suis épuisée par les déceptions.",
    m3_promesse: "Trouver son époux halal en 90 jours sans Tinder ni rabattre ses critères",
    m3_mecanisme: "Méthode Préparée pour le Nikkah™",
    m3_prix: "2 497€",
    m4_strategy: "full",
    m4_ht_target: 12,
    m4_forced: false,
  }),
  data: {
    pont: {
      pointA: { selected_pain_idx: 0, custom_text: "", formulated: "27 ans, célibataire depuis 7 ans, 4 fiançailles brisées en 3 ans. Famille pousse pour le mariage à chaque Aïd. Sa meilleure amie vient de se fiancer la 2e fois — elle est restée à attendre. À 3h du matin elle se demande si elle doit faire le deuil du mariage ou continuer." },
      pointB: { measurable_outcome: "1 mariage halal célébré en 90 jours avec un homme respectant ses non-négociables (deen, projet, famille).", timeframe_days: 90, formulated: "Mariée halal avec un homme aligné en 90 jours — sans baisser ses critères islamiques ni faire Tinder." },
      bridge_summary: "Méthode Préparée pour le Nikkah™ : 3 phases d'accompagnement (clarification + rencontres encadrées + closing du mariage).",
    },
    conditions: {
      simple:       { score: 8, justification: "Format clair en 3 phases, plateforme avec replays. Mais quelques participantes m'ont dit que la phase 2 demande beaucoup d'énergie émotionnelle.", delivery_mode: "Coaching de groupe + 1-1 ciblé" },
      rapide:       { score: 8, justification: "Promesse à 90 jours. 7 sur 10 dernières clientes ont été fiancées dans ce délai.", timeframe_days: 90 },
      systematique: { score: 7, justification: "J'ai des résultats mais pas encore documenté assez de cas. Je suis en train de filmer 5 témoignages cette semaine.", proof_type: "12 mariages célébrés, 3 témoignages filmés" },
      aspirante:    { score: 9, justification: "Le mariage halal est un sujet immense — j'ai vu des transformations profondes en sortie de programme.", amplitude: "Famille fondée vs solitude" },
      weakest_axis: "systematique",
      action_plan: "Filmer les 5 témoignages restants d'ici fin du mois pour passer la condition Systématique de 7 à 9.",
    },
    eatcomplex: {
      rows: [
        { client_step: "Identifier ses non-négociables sans rabattre ses critères", what_you_eat: "Worksheet « 10 critères deen + 10 critères humains » pré-classés par moi à partir de 50 entretiens. Pas à inventer.", what_remains: "Cocher ses 20 critères" },
        { client_step: "Sortir du mental « j'attends qu'il vienne »", what_you_eat: "4 séances de groupe sur le repositionnement intérieur, scripts de prière spécifiques, accès aux ressources savants.", what_remains: "Assister aux séances, faire l'istikhara" },
        { client_step: "Rencontres encadrées (familles ou structures halal)", what_you_eat: "Mon annuaire de 20 structures matrimoniales halal vérifiées + scripts pour les contacter + templates de présentation.", what_remains: "Choisir 3 structures à contacter cette semaine" },
        { client_step: "Filtrer les profils sans perdre 6 mois", what_you_eat: "Grille de 15 questions à poser dès le 1er échange. Mes 7 red flags les plus fréquents documentés.", what_remains: "Poser les 15 questions, noter les réponses" },
        { client_step: "Closing du Nikkah (préparation et engagement)", what_you_eat: "Checklist pré-Nikkah + accompagnement de la famille + prière de demande personnalisée.", what_remains: "Présenter à sa famille et fixer la date" },
      ],
    },
    structure: {
      total_weeks: 12, promise_days: 90,
      phases: [
        { num: 1, name: "Clarification de soi", weeks: "1-4", livrables: "Critères verrouillés + 20 entretiens d'auto-évaluation + alignement spirituel (istikhara hebdo)" },
        { num: 2, name: "Rencontres encadrées", weeks: "5-9", livrables: "Contact avec 3 structures halal + 5 premiers profils filtrés + grilles d'entretien remplies" },
        { num: 3, name: "Closing du Nikkah", weeks: "10-12", livrables: "Présentation officielle aux familles + date fixée + accompagnement spirituel pré-mariage" },
      ],
      mecanisme_anchor: "Méthode Préparée pour le Nikkah™",
    },
    conviction: {
      checklist: { sur_delivre: true, ten_clients: false, believe_price: true, recommend_to_brother: true, prepared_objections: false },
      missing: "Il me manque encore 3-5 témoignages filmés solides pour vraiment vendre à 2 497€ sans hésitation. Et je sais que ma préparation aux objections n'est pas encore prête — je n'ai pas écrit les réponses aux 7 objections principales.",
      next_action: "Cette semaine : (1) finaliser les 5 témoignages filmés en cours, (2) bloquer 2h vendredi pour écrire les réponses aux 7 objections. Signal : 5 vidéos publiables + document objections finalisé d'ici dimanche.",
    },
  },
  scores: { pont: 86, conditions: 82, eatcomplex: 84, structure: 81, conviction: 80 },
  attempts: { pont: 1, conditions: 1, eatcomplex: 1, structure: 1, conviction: 1 },
  forced: { pont: false, conditions: false, eatcomplex: false, structure: false, conviction: false },
  highest: "lock",
};

// ── Liste finale 11 cas ──────────────────────────────────────────────
export const M5_DEMO_CASES: M5DemoCase[] = [
  // ARGENT
  { key: "argent_affiliation", segment: "argent", emoji: "💼", title: "Karim · Affiliation digitale halal",
    summary: "Salarié 31 ans · CDI 2 200€/mois · 11 témoignages · ht_lt 2 997€ (audit fort, scores 87-95)",
    is_anti_pattern: false, ready: true, patch: KARIM_PATCH },
  { key: "argent_setting_closing", segment: "argent", emoji: "⚠", title: "Younes · setter — ANTI-PATTERN full trop tôt",
    summary: "Livreur 24 ans · 3 HT signés · full ladder + name-drop Iman Gadzhi (à transcrire · scoring durci)",
    is_anti_pattern: true, ready: false },
  { key: "argent_smma_etudiants", segment: "argent", emoji: "🎯", title: "Imen · agence SMMA halal (à transcrire)",
    summary: "Étudiante 21 ans · 8 transformations · ht_lt 2 700€",
    is_anti_pattern: false, ready: false },
  { key: "argent_immo_sans_riba", segment: "argent", emoji: "🏠", title: "Mounia & Anas · RP halal (à transcrire)",
    summary: "Couple 4 800€/mois · 15 couples accompagnés · ht_lt 4 200€",
    is_anti_pattern: false, ready: false },

  // RELATIONS
  { key: "relations_mariage_halal", segment: "relations", emoji: "💍", title: "Khadija · mariage halal (à transcrire)",
    summary: "Prof 28 ans · 6 mariages confirmés · ht_only 3 200€",
    is_anti_pattern: false, ready: false },
  { key: "relations_couple_post_bebe", segment: "relations", emoji: "👨‍👩‍👧", title: "Aïcha & Tarek · couple post-bébé (à transcrire)",
    summary: "Couple 34 & 37 · 12 couples accompagnés · ht_only 3 600€",
    is_anti_pattern: false, ready: false },
  { key: "relations_education_positive", segment: "relations", emoji: "🤱", title: "Najet · mama sereine (à transcrire)",
    summary: "Mère 35 ans · 22 mamans accompagnées · ht_lt 2 500€ (insight conjugal)",
    is_anti_pattern: false, ready: false },

  // SANTÉ
  { key: "sante_perte_poids_mamans", segment: "sante", emoji: "🌿", title: "Salima · perte de poids (à transcrire)",
    summary: "Maman 37 ans · 18 transformations · ht_lt 2 900€ (saisonnier ramadan)",
    is_anti_pattern: false, ready: false },
  { key: "sante_reprise_sport_hommes", segment: "sante", emoji: "🏃", title: "Mehdi · reprise sport 40+ (à transcrire)",
    summary: "Cadre 42 ans · 14 frères accompagnés · ht_only 2 700€ (patient sur preuves)",
    is_anti_pattern: false, ready: false },
  { key: "sante_anxiete_etudiants", segment: "sante", emoji: "⚠", title: "Lina · psy — ANTI-PATTERN full fragile",
    summary: "Psy 22 ans · 9 étudiantes · name-drop Sarah Knight / Mel Robbins · scoring durci (~22-35/100)",
    is_anti_pattern: true, ready: true, patch: LINA_PATCH },

  // ZONE WARN (cas pédagogique 11)
  { key: "warn_aicha_v05", segment: "relations", emoji: "🎯", title: "Aïcha v0.5 · zone warn (à durcir)",
    summary: "Pont solide, conditions un peu molles, scores 80-86 — l'IA pousse à enrichir (warn zone pédagogique)",
    is_anti_pattern: false, warn_zone: true, ready: true, patch: AICHA_V05_PATCH },
];
