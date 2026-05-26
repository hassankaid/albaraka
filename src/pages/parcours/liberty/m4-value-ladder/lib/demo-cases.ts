/**
 * Mode démo M4 — 10 cas pré-remplis (synchronisés M1/M2/M3 → M4).
 *
 * Transposition fidèle des `DEMO_LADDERS` Sidali v1.2.3 (HTML standalone).
 * 2 cas verbatim démarrés : Karim Affiliation Halal (bon cas ht_lt) + Lina
 * Anxiété Étudiants (anti-pattern full ladder fragile). Les 8 autres en
 * placeholder `ready: false` — à transcrire par lots ultérieurement comme on
 * a fait pour M3 (3+3+3).
 *
 * Mode démo : state non persisté en BDD (cf. usePersistedState).
 */

import type { M4State } from "./types";

export interface M4DemoCase {
  key: string;
  segment: "argent" | "relations" | "sante";
  emoji: string;
  title: string;
  summary: string;
  is_anti_pattern: boolean;
  ready: boolean;
  patch?: Partial<M4State>;
}

// ── 1 · Karim · Affiliation halal (bon cas, ht_lt) ─────────────────────────
const KARIM_AFFILIATION_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble",
  market_type: "b2c_transfo",
  m1_data: {
    source: "demo_argent_affiliation",
    sous_niche_2: {
      phrase: "Salariés musulmans 28-40 ans qui veulent générer 3000€/mois d'affiliation halal sans quitter leur CDI",
      phrase_finale: "Salariés musulmans 28-40 ans qui veulent générer 3000€/mois d'affiliation halal sans quitter leur CDI",
      cible: "Cadres salariés en CDI, mariés, 1-3 enfants",
      douleur: "Vivent du riba indirectement, veulent une source pure",
      methode: "Méthode AFFILIÉ AL BARAKA — 90 jours en 3 phases",
    },
    avatar: { socio: { nom: "Karim", age: "31 ans", situation: "Cadre marketing, marié, 2 enfants, 2 200€/mois", lieu: "Strasbourg" } },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: {
    source: "module_2_psychologie",
    version: "demo_v1",
    data: {
      step8: {
        positionnement: "Le salarié musulman qui prend en main son indépendance financière sans compromis religieux",
        hook_principal: "Bâtir une source 100% halal qui te libère progressivement du salariat conventionnel",
        levier_secondaire: "preuve",
        biais_killer: "riba banking",
        phase_strategy: "phase 2 — déjà tenté 2-3 méthodes (dropshipping, freelancing) — toutes ont échoué par manque de cadre",
      },
    },
  },
  m3_data: {
    source: "module_3_anatomie",
    complete: true,
    market_type: "b2c_transfo",
    promesse: "De 0€ à 3 000€/mois d'affiliation 100% halal en 90 jours, sans quitter ton CDI",
    mecanisme: { nom: "Méthode AFFILIÉ AL BARAKA — 90 jours en 3 phases", etapes: ["Sélection produits halal validés", "Tunnel prospection LinkedIn + DM", "Commissions récurrentes"] },
    vehicule: { format: "90j · groupe 12 max · 2 lives/sem + Slack", justification: "Format groupe pour rentabilité + accountability", validated: true },
    garantie: { type: "continuite", formulation: "Si pas signé ton 1er affilié en 60j, je continue 60j gratuit jusqu'à signature" },
    urgence: { type: "cohorte_limitee", justification: "12 places groupe" },
    prix: { montant: "3500", levier_faible: "delai" },
    prix_score_global: 78,
  },
  ladder: {
    freemium: { id: "free_quiz_1000", name: "Quiz « Ton 1er 1 000€ d'affiliation halal »", price: "0€", format: "Quiz Tally 7 questions · 5 min · plan d'action emailé", rationale: "Qualifie sans friction et donne un premier livrable en 5 min." },
    low: { id: "low_dm_starter", name: "Mini-formation « Tes 3 premiers DM qui closent »", price: "47€", format: "5 vidéos + 12 scripts DM + Excel tracker · accès à vie", rationale: "Résout LE sous-problème : il ne sait pas démarrer. Justifiable face à l'épouse." },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_90j", name: "AFFILIÉ AL BARAKA · 90 jours", price: "3 500€", format: "90j · groupe 12 max · 2 lives/sem + Slack + 4 calls 1-1", rationale: "Sommet : accompagnement dense pour atteindre 3 000€/mois en 90j. Issu de M3." },
  },
  bridges: {
    free_to_low: "Fin du quiz : page remerciement avec offre limitée 48h. « Tu as obtenu le score X — voici les 3 DM qu'il te faut, 27€ au lieu de 47€ ». Sur cohorte test : 30% conversion freemium → tripwire chez les salariés 28-40.",
    free_to_mid: "",
    free_to_high: "",
    low_to_mid: "",
    low_to_high: "Email J+10 du tripwire : « Tu as appliqué les 3 DM ? Si tu sens que ça marche et que tu veux 10× plus vite avec un accompagnement individuel, on ouvre 4 places pour AFFILIÉ AL BARAKA 90j. Call discovery pour voir si on bosse ensemble ». Conversion LT→HT ~3% mais ces 3% sont 100× plus qualifiés que les leads froids.",
    mid_to_high: "",
  },
  entry: {
    strategy: "ht_lt",
    rationale: "J'ai déjà signé 6 affiliés sur les 10 derniers mois et tous ont au moins doublé leurs revenus halal. Mon problème actuel, c'est que l'organique LinkedIn me ramène 30 leads/mois grand max et je remplis tout juste mes 4 places HT par trimestre. Je veux passer à 8 places par trimestre, ce qui veut dire doubler mon top of funnel. Un LT à 47€ va me servir à élargir la base ET à pré-éduquer — l'expérience montre qu'un acheteur tripwire est 5-10× plus probable de convertir en call HT qu'un téléchargeur de PDF gratuit. Mon indicateur de bascule : quand je remplis régulièrement 8 places HT/trim et que mon LT atteint 200 ventes/mois, je regarderai s'il faut ajouter un MT.",
    score: 88,
    feedback: "✓ Stratégie solide. Tu as identifié ton bottleneck (volume vs offer) et le levier (LT comme amplificateur de top of funnel). Tu as un indicateur de bascule précis (8 places/trim + 200 LT/mois). Le ratio 5-10× plus probable est issu de ton expérience — c'est exactement le niveau d'argumentation attendu.",
    ai_mode: "local",
    attempts: 1,
    forced: false,
    ht_monthly_target: "8 ventes HT/trimestre = ~2,7/mois à 3 500€ = ~9 300€/mois bruts",
    lt_breakeven_check: "LT 47€ avec CAC FB ads ~30-40€ = ~10€ de marge brute par LT. 200 LT/mois = 2 000€ qui amortit déjà les ads + reste positif. Pas en perte donc.",
  },
};

// ── 10 · Lina · Anxiété étudiants — ⚠ ANTI-PATTERN full ladder ───────────
const LINA_ANXIETE_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble",
  market_type: "b2c_transfo",
  m1_data: {
    source: "demo_sante_anxiete_etudiants",
    sous_niche_2: {
      phrase: "Étudiantes musulmanes 19-26 ans qui font des crises d'anxiété avant exams et culpabilisent religieusement de leur état",
      phrase_finale: "Étudiantes musulmanes 19-26 ans qui font des crises d'anxiété avant exams et culpabilisent religieusement de leur état",
      cible: "Étudiantes cursus exigeant, bourse modeste, parents primo-arrivants",
      douleur: "Culpabilité spirituelle, parents qui minimisent, bourse trop juste pour psy",
      methode: "ANXIÉTÉ & TAWAKKUL — protocole 6 mois en 3 niveaux",
    },
    avatar: { socio: { nom: "Lina", age: "22 ans", situation: "Psychologue clinicienne récente, encore en cabinet hospitalier, démarre côté solo", lieu: "Région parisienne" } },
    marche: { id: "sante", label: "🌱 Santé" },
  },
  m2_data: {
    source: "module_2_psychologie",
    version: "demo_v1",
    data: {
      step8: {
        positionnement: "L'étudiante musulmane qui prend soin de sa santé mentale sans renoncer à sa foi",
        hook_principal: "Sortir durablement des crises en gardant son cursus, avec un cadre qui réconcilie TCC et tawakkul",
        levier_secondaire: "preuve",
        biais_killer: "culpabilité spirituelle",
        phase_strategy: "phase 2 — a consulté généraliste qui a proposé anxiolytiques (refus), cherche un cadre adapté",
      },
    },
  },
  m3_data: {
    source: "module_3_anatomie",
    complete: true,
    market_type: "b2c_transfo",
    promesse: "Sortir durablement de tes crises de panique en 6 mois, avec un cadre clinique TCC + tawakkul validé par savant",
    mecanisme: { nom: "ANXIÉTÉ & TAWAKKUL — protocole 6 mois en 3 niveaux", etapes: ["Reframing théologique", "Outils TCC", "Travail clinique 1-1"] },
    vehicule: { format: "6 mois · 6 séances 1-1 + masterclass mensuelles + Telegram étudiants + lettre parents arabe", justification: "Format clinique long pour ancrer durablement", validated: true },
    garantie: { type: "remboursement", formulation: "Si tu n'as pas réduit tes crises de 70% mesurées par échelle en 90 jours, je rembourse 50%" },
    urgence: { type: "cohorte_limitee", justification: "Petits groupes cliniques" },
    prix: { montant: "2500", levier_faible: "effort" },
    prix_score_global: 72,
  },
  ladder: {
    freemium: { id: "free_audio_tawakkul", name: "Podcast « Tu n'es pas une mauvaise musulmane si tu fais une crise »", price: "0€", format: "3 épisodes audio 30-45 min", rationale: "Reframing théologique avec savant. Débloque la culpabilité, condition de tout le reste." },
    low: { id: "low_protocole_exam", name: "Protocole TCC « Apaise tes crises avant exam »", price: "19€", format: "Vidéo 40 min + carnet PDF · accès à vie", rationale: "19€ = 1 repas étudiant. Protocole testable au prochain exam." },
    mid: { id: "mid_bootcamp_anxiete", name: "Bootcamp 30 jours « Psychoéducation + outils TCC »", price: "297€", format: "30 jours · 10 modules · 4 lives Q&A · groupe étudiants 60j", rationale: "1,5 mois de bourse — finançable parents si ROI scolaire montré." },
    high: { id: "high_anxiete_6m", name: "ANXIÉTÉ & TAWAKKUL · 6 mois clinique", price: "2 500€", format: "6 mois · 6 séances 1-1 + masterclass + lettre parents arabe", rationale: "Sommet : travail clinique 1-1 + lettre arabe aux parents pour débloquer financement." },
  },
  bridges: {
    free_to_low: "Fin du podcast : « Tu as compris que tu peux soigner ton anxiété sans renoncer à ta foi — voici le protocole TCC testable au prochain partiel, 19€ pendant 48h ». 36% de conversion.",
    free_to_mid: "",
    free_to_high: "",
    low_to_mid: "Email J+15 du tripwire : « Tu as utilisé le protocole en exam ? Bootcamp 30 jours pour la psychoéducation complète, 297€ ».",
    low_to_high: "",
    mid_to_high: "Live final J30 : « Tu as les outils et la compréhension. Pour le travail clinique sur 6 mois avec 6 séances individuelles + lettre arabe aux parents, programme professionnel à 2 500€ ».",
  },
  entry: {
    strategy: "full",
    rationale: "J'ai 9 étudiantes accompagnées et je veux pas perdre de temps. Le marché de la santé mentale étudiante explose, TikTok pousse les comptes mental health, et j'ai vu Sarah Knight et Mel Robbins construire des écosystèmes complets — il faut que je fasse pareil sinon je vais me faire prendre la place. J'ai déjà rédigé un draft du tripwire à 19€ et du bootcamp à 297€, donc autant lancer tout en même temps : le freemium podcast existe déjà, je peux assembler le LT en 2 semaines, le bootcamp en 4 semaines, et je tourne le HT à côté. Mes parents sont psy aussi donc j'ai du backup clinique. Je sens que c'est le moment.",
    score: 52,
    feedback: "✗ Stratégie incohérente avec ton stade et ta capacité. Tu as 9 étudiantes accompagnées. La règle empirique : tu valides un format avec 20+ clients HT avant de fragmenter. Trois alertes : (1) Référence Sarah Knight + Mel Robbins : ce sont des auteurs avec 100k+ followers et 10+ ans d'antériorité. Comparer ta phase de démarrage à leur écosystème mature est un piège. (2) Cohérence M3 : ton score Hormozi est à 72/100 — tu es en validation, pas en scale. Construire 4 marches en parallèle alors qu'aucune n'a 10 ventes va appauvrir chacune. (3) Capacité clinique : tu es psychologue, donc le delivery du HT n'est pas scalable mécaniquement (6 séances 1-1 par cliente × N clientes). Ajouter LT + MT te prend du temps de création de contenu = moins de temps de delivery HT. Recommandation IA : ht_only pendant 9-12 mois pour atteindre 25 étudiantes accompagnées et 8 témoignages vidéo (parents inclus). Ensuite : ht_lt avec le podcast comme freemium et la lettre parents arabe comme LT à 19€ — pas avant.",
    ai_mode: "local",
    attempts: 2,
    forced: false,
    ht_monthly_target: "2-3 ventes HT/mois à 2 500€ = 5 000-7 500€/mois bruts",
    lt_breakeven_check: "Pas calculé — l'élève n'a pas réfléchi à l'économie. Le LT à 19€ avec un CAC ads ~12€ en santé mentale étudiante laisserait 7€ de marge. À 50 LT/mois (volume réaliste à ce stade) = 350€/mois — ça ne couvre même pas les heures passées à créer les vidéos LT.",
  },
};

// ── Liste finale ──────────────────────────────────────────────────────────
export const M4_DEMO_CASES: M4DemoCase[] = [
  // ARGENT
  { key: "argent_affiliation", segment: "argent", emoji: "💼", title: "Karim · salarié → affilié halal",
    summary: "Cadre 31 ans · CDI 2 200€/mois · vise 3 000€/mois d'affiliation halal (ht_lt validé)",
    is_anti_pattern: false, ready: true, patch: KARIM_AFFILIATION_PATCH },
  { key: "argent_setting_closing", segment: "argent", emoji: "⚠", title: "Younes · setter — ANTI-PATTERN full trop tôt",
    summary: "Livreur 24 ans · 3 HT signés · choisit full ladder → IA pousse back (à transcrire)",
    is_anti_pattern: true, ready: false },
  { key: "argent_smma_etudiants", segment: "argent", emoji: "📈", title: "SMMA étudiantes (ht_lt)",
    summary: "Agence sociale pour TPE musulmanes · entry HT+LT (à transcrire)",
    is_anti_pattern: false, ready: false },
  { key: "argent_immo_sans_riba", segment: "argent", emoji: "🏘", title: "Immo sans riba (ht_mt)",
    summary: "Investissement immobilier halal (à transcrire)",
    is_anti_pattern: false, ready: false },

  // RELATIONS
  { key: "relations_couple_post_bebe", segment: "relations", emoji: "👶", title: "Couple post-bébé (ht_only)",
    summary: "Couples en burnout post-naissance · ht_only par sensibilité (à transcrire)",
    is_anti_pattern: false, ready: false },
  { key: "relations_education_positive", segment: "relations", emoji: "👨‍👩‍👧", title: "Éducation positive (ht_lt insight)",
    summary: "Mamans éducation cohérente · ht_lt avec insight (à transcrire)",
    is_anti_pattern: false, ready: false },

  // SANTÉ
  { key: "sante_perte_poids_mamans", segment: "sante", emoji: "🤰", title: "Perte de poids mamans (ht_lt saisonnier)",
    summary: "Mamans post-grossesse · ht_lt saisonnier (à transcrire)",
    is_anti_pattern: false, ready: false },
  { key: "sante_reprise_sport_hommes", segment: "sante", emoji: "💪", title: "Reprise sport hommes (ht_only)",
    summary: "Hommes 35-50 sédentaires · ht_only conservateur (à transcrire)",
    is_anti_pattern: false, ready: false },
  { key: "sante_anxiete_etudiants", segment: "sante", emoji: "⚠", title: "Lina · psy — ANTI-PATTERN full fragile",
    summary: "Psychologue 22 ans · 9 étudiantes accompagnées · full ladder fragile → IA refuse",
    is_anti_pattern: true, ready: true, patch: LINA_ANXIETE_PATCH },

  // (10ème case démo à compléter — placeholder)
  { key: "argent_freelance_dev", segment: "argent", emoji: "💻", title: "Freelance dev halal (à transcrire)",
    summary: "Dev musulman qui sort du salariat · stratégie (à transcrire)",
    is_anti_pattern: false, ready: false },
];
