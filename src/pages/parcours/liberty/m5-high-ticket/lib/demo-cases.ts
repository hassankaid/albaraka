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

// ── 2 · Younes · Setting/Closing — ⚠ ANTI-PATTERN name-drop ──────────
const YOUNES_PATCH: Partial<M5State> = {
  ...buildBaseDemo({
    avatar: "Younes",
    niche: "Entrepreneurs musulmans qui veulent embaucher des setters/closers musulmans formés",
    m2_pain: "Vendre seul est épuisant — il refuse des prospects faute de bande passante",
    m3_promesse: "Avoir une équipe de closers musulmans qui remplit ton calendrier",
    m3_mecanisme: "Closer Halal Academy",
    m3_prix: "4 997€",
    m4_strategy: "full",
    m4_ht_target: 15,
    m4_forced: true,
  }),
  data: {
    pont: {
      pointA: { selected_pain_idx: 0, custom_text: "", formulated: "Mon prospect type est un entrepreneur musulman qui veut grandir." },
      pointB: { measurable_outcome: "Avoir des closers qui ferment pour lui", timeframe_days: 60, formulated: "Il va explosé son business avec mon programme." },
      bridge_summary: "Avec moi tu apprends tout.",
    },
    conditions: {
      simple:       { score: 6, justification: "C'est simple, je donne tout.", delivery_mode: "DIY" },
      rapide:       { score: 9, justification: "En 30 jours t'es opérationnel.", timeframe_days: 30 },
      systematique: { score: 8, justification: "J'ai 3 témoignages et ça marche.", proof_type: "3 captures DM" },
      aspirante:    { score: 10, justification: "Devenir Iman Gadzhi version halal, c'est énorme.", amplitude: "Liberté financière totale" },
      weakest_axis: "simple",
      action_plan: "Communiquer plus fort sur les réseaux.",
    },
    eatcomplex: {
      rows: [
        { client_step: "Trouver des leads", what_you_eat: "Je donne les bons conseils", what_remains: "Faire tout le travail de prospection, créer les scripts, gérer les CRM, recruter, former, payer, tracker" },
        { client_step: "Closer des appels", what_you_eat: "J'enseigne la théorie", what_remains: "S'entraîner seul, faire ses propres appels, gérer les objections, gérer le mental, faire les follow-ups" },
        { client_step: "Recruter des closers", what_you_eat: "Je parle de recrutement", what_remains: "Tout le sourcing, les entretiens, les contrats, l'onboarding, le paiement, la gestion d'équipe" },
        { client_step: "", what_you_eat: "", what_remains: "" },
        { client_step: "", what_you_eat: "", what_remains: "" },
      ],
    },
    structure: {
      total_weeks: 8, promise_days: 60,
      phases: [
        { num: 1, name: "Mindset & vision", weeks: "1-3", livrables: "Tu comprends la vision" },
        { num: 2, name: "Closing avancé", weeks: "4-6", livrables: "Tu sais closer" },
        { num: 3, name: "Scaling", weeks: "7-8", livrables: "Tu scales" },
      ],
      mecanisme_anchor: "Closer Halal Academy",
    },
    conviction: {
      checklist: { sur_delivre: true, ten_clients: false, believe_price: true, recommend_to_brother: true, prepared_objections: false },
      missing: "J'ai pas encore les 10 clients heureux mais ça va venir vite.",
      next_action: "Lancer une grosse pub TikTok pour accélérer.",
    },
  },
  scores: { pont: 28, conditions: 38, eatcomplex: 22, structure: 32, conviction: 45 },
  attempts: { pont: 2, conditions: 2, eatcomplex: 2, structure: 2, conviction: 2 },
  forced: { pont: false, conditions: false, eatcomplex: false, structure: false, conviction: false },
  highest: "lock",
};

// ── 3 · Imen · SMMA modest fashion (bon cas ht_lt) ───────────────────
const IMEN_PATCH: Partial<M5State> = {
  ...buildBaseDemo({
    avatar: "Imen",
    niche: "Étudiantes musulmanes 20-25 ans qui veulent monter une SMMA modest fashion en 90 jours",
    m2_pain: "Devoir choisir entre stages mal payés et abandon des études — elle ne veut ni l'un ni l'autre",
    m3_promesse: "Signer ton 1er client SMMA à 800€/mois en 45 jours dans la modest fashion",
    m3_mecanisme: "Modest SMMA Blueprint",
    m3_prix: "1 997€",
    m4_strategy: "ht_lt",
    m4_ht_target: 6,
    m4_forced: false,
  }),
  data: {
    pont: {
      pointA: { selected_pain_idx: 0, custom_text: "", formulated: "Imen est en M1 école de commerce, vit en colocation, fait des stages à 600€/mois et voit ses copines accepter des CDI subis pour finir leurs études." },
      pointB: { measurable_outcome: "Signer son 1er client SMMA à 800€/mois en 45 jours, prouvant qu'elle peut financer ses études sans compromis", timeframe_days: 45, formulated: "Imen passe d'étudiante stagiaire à 600€/mois à freelance SMMA qui facture 800€/mois récurrent en 45 jours." },
      bridge_summary: "Le pont : niche modest fashion, scripts de prospection adaptés au marché, templates Reels + UGC, accompagnement de pair à pair.",
    },
    conditions: {
      simple:       { score: 7, justification: "DWY : templates Reels, scripts de cold DM, brief client clé en main. Elle exécute 5h/sem en plus de ses cours.", delivery_mode: "DWY" },
      rapide:       { score: 8, justification: "45 jours pour le 1er client est crédible : on a 7 cas étudiants validés sur cette timeline.", timeframe_days: 45 },
      systematique: { score: 7, justification: "7 témoignages d'étudiantes ayant signé entre 30 et 60 jours. Pas encore de validation hors étudiantes.", proof_type: "7 captures Stripe + 4 témoignages filmés" },
      aspirante:    { score: 8, justification: "Financer son master sans CDI subi, garder ses valeurs, devenir indépendante avant 25 ans.", amplitude: "De stagiaire à 600€ → freelance 3 000€/mois en 6 mois" },
      weakest_axis: "simple",
      action_plan: "Créer un mini-CRM Notion pré-rempli pour réduire la charge mentale du tracking client.",
    },
    eatcomplex: {
      rows: [
        { client_step: "Trouver des boutiques modest qui ont besoin de réseaux", what_you_eat: "Annuaire de 80 boutiques modest fashion FR/UK pré-qualifiées (taille, budget, présence sociale)", what_remains: "Choisir 20 cibles prioritaires + personnaliser l'approche" },
        { client_step: "Écrire un cold DM qui convertit", what_you_eat: "Bibliothèque de 15 scripts DM testés sur 500 prospects, classés par profil de boutique", what_remains: "Adapter le ton à sa propre voix" },
        { client_step: "Faire un audit de compte Instagram crédible", what_you_eat: "Template d'audit Notion + Loom de 8 min pré-enregistré qu'elle peut customiser", what_remains: "Tourner le Loom personnalisé en 15 min par prospect" },
        { client_step: "Pricer son offre sans se vendre au rabais", what_you_eat: "Grille de prix benchmarkée + scripts de réponse aux objections prix", what_remains: "Annoncer le prix avec calme — répété en role-play en call" },
        { client_step: "Livrer le 1er mois sans paniquer", what_you_eat: "Checklist J+1 / J+7 / J+15 / J+30 + dashboard de reporting client clé en main", what_remains: "Faire les Reels et stories — adapter visuel à chaque boutique" },
      ],
    },
    structure: {
      total_weeks: 12, promise_days: 90,
      phases: [
        { num: 1, name: "Positionnement modest fashion", weeks: "1-3", livrables: "Sa niche micro précise + portfolio v0 + 3 audits gratuits déployés" },
        { num: 2, name: "Prospection ciblée", weeks: "4-7", livrables: "50 DM/sem + 10 audits offerts + 3 RDV décisionnels par semaine" },
        { num: 3, name: "1er client signé & onboarding", weeks: "8-12", livrables: "1 contrat 800€/mois signé + premier livrable validé + plan de scaling à 3 clients" },
      ],
      mecanisme_anchor: "Modest SMMA Blueprint",
    },
    conviction: {
      checklist: { sur_delivre: true, ten_clients: true, believe_price: true, recommend_to_brother: true, prepared_objections: true },
      missing: "",
      next_action: "Filmer 2 nouveaux témoignages avant juin pour le prochain lancement.",
    },
  },
  scores: { pont: 88, conditions: 84, eatcomplex: 91, structure: 86, conviction: 92 },
  attempts: { pont: 1, conditions: 1, eatcomplex: 1, structure: 1, conviction: 1 },
  forced: { pont: false, conditions: false, eatcomplex: false, structure: false, conviction: false },
  highest: "lock",
};

// ── 4 · Mounia & Anas · Immo sans riba (bon cas ht_lt, DFY+ premium) ─
const MOUNIA_ANAS_PATCH: Partial<M5State> = {
  ...buildBaseDemo({
    avatar: "Mounia & Anas",
    niche: "Couples musulmans 28-40 ans qui veulent acquérir leur 1er bien locatif sans riba en 12 mois",
    m2_pain: "Voir leurs économies dormir sur Livret A pendant que l'inflation les ronge, sans savoir comment investir halal",
    m3_promesse: "Acquérir ton 1er bien locatif halal en 12 mois sans contracter le moindre prêt à intérêt",
    m3_mecanisme: "Mourabaha Property Path",
    m3_prix: "4 997€",
    m4_strategy: "ht_lt",
    m4_ht_target: 4,
    m4_forced: false,
  }),
  data: {
    pont: {
      pointA: { selected_pain_idx: 0, custom_text: "", formulated: "Mounia & Anas ont 45 000€ sur Livret A depuis 4 ans. Ils refusent les prêts à intérêt par conviction. Ils voient leurs amis non-musulmans acquérir des biens et eux stagnent." },
      pointB: { measurable_outcome: "Signer un compromis de vente halal sur un bien locatif générant 600€/mois de cash flow en 12 mois", timeframe_days: 365, formulated: "Mounia & Anas passent de 45k qui dorment à propriétaires d'un bien locatif halal générant 600€/mois en 12 mois." },
      bridge_summary: "Le pont : accompagnement personnalisé sur le cycle complet (recherche, financement Mourabaha, négo, notaire) avec réseau de partenaires halal validés.",
    },
    conditions: {
      simple:       { score: 9, justification: "DFY+ : on les accompagne sur chaque étape, on présente les partenaires, on relit les actes. C'est de la prestation premium.", delivery_mode: "DFY+" },
      rapide:       { score: 7, justification: "12 mois est la timeline réaliste pour un achat immobilier serein. Plus court = précipitation dangereuse.", timeframe_days: 365 },
      systematique: { score: 8, justification: "12 acquisitions validées sur 18 mois. Méthode testée sur banques islamiques européennes (Al Rayan, BLME, KT Bank).", proof_type: "12 actes notariés + 8 témoignages vidéo" },
      aspirante:    { score: 10, justification: "Sortir du Livret A, préparer l'avenir des enfants halal, ne plus voir son argent dormir, rejoindre une communauté de propriétaires musulmans.", amplitude: "De 45k dormant → patrimoine immobilier croissant et conforme" },
      weakest_axis: "systematique",
      action_plan: "Documenter 5 cas additionnels sur des profils différents (célibataire, retraité, mère seule) d'ici Q4 2026.",
    },
    eatcomplex: {
      rows: [
        { client_step: "Comprendre Mourabaha, Ijara, Musharaka", what_you_eat: "Module 1h30 : vidéo + slides + Q&R compilées des cas réels", what_remains: "Décider quel véhicule colle à leur projet (on les guide)" },
        { client_step: "Trouver une banque qui finance halal en France", what_you_eat: "Annuaire de 7 partenaires validés + contacts directs des chargés de clientèle musulmans", what_remains: "Prendre RDV (on facilite l'intro)" },
        { client_step: "Évaluer un bien locatif sans se faire avoir", what_you_eat: "Grille d'analyse Excel + audit du bien par notre expert avant compromis", what_remains: "Visiter le bien physiquement" },
        { client_step: "Négocier le prix d'achat", what_you_eat: "Scripts de négo + bench des prix au m² sur 50 villes + accès à un négociateur partenaire", what_remains: "Faire la visite finale + signer" },
        { client_step: "Gérer le bien après acquisition", what_you_eat: "Templates baux + checklist état des lieux + accès au groupe propriétaires halal pour entraide", what_remains: "Choisir entre gestion locative ou direct (on a un prestataire partenaire)" },
      ],
    },
    structure: {
      total_weeks: 52, promise_days: 365,
      phases: [
        { num: 1, name: "Stratégie & véhicule halal", weeks: "1-12", livrables: "Profil patrimonial validé + choix véhicule Mourabaha/Ijara + dossier de financement prêt" },
        { num: 2, name: "Sourcing & négociation", weeks: "13-32", livrables: "5 biens analysés + 1 offre acceptée + financement bouclé" },
        { num: 3, name: "Acquisition & mise en location", weeks: "33-52", livrables: "Compromis signé + acte notarié + bail signé + cash flow positif" },
      ],
      mecanisme_anchor: "Mourabaha Property Path",
    },
    conviction: {
      checklist: { sur_delivre: true, ten_clients: true, believe_price: true, recommend_to_brother: true, prepared_objections: true },
      missing: "",
      next_action: "Continuer à documenter chaque acquisition pour enrichir la base de cas.",
    },
  },
  scores: { pont: 90, conditions: 92, eatcomplex: 94, structure: 89, conviction: 95 },
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
  { key: "argent_setting_closing", segment: "argent", emoji: "🎯", title: "Younes · setting & closing — ANTI-PATTERN name-drop",
    summary: "Entrepreneur · 3 HT signés · full forcé + name-drop Iman Gadzhi + structure floue (scores 22-45)",
    is_anti_pattern: true, ready: true, patch: YOUNES_PATCH },
  { key: "argent_smma_etudiants", segment: "argent", emoji: "📱", title: "Imen · SMMA modest fashion",
    summary: "Étudiante M1 · 7 témoignages étudiantes · ht_lt 1 997€ (audit solide, scores 84-92)",
    is_anti_pattern: false, ready: true, patch: IMEN_PATCH },
  { key: "argent_immo_sans_riba", segment: "argent", emoji: "🏠", title: "Mounia & Anas · investir immo halal",
    summary: "Couple 45k Livret A · 12 acquisitions validées · ht_lt 4 997€ DFY+ (scores 89-95 exemplaires)",
    is_anti_pattern: false, ready: true, patch: MOUNIA_ANAS_PATCH },

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
