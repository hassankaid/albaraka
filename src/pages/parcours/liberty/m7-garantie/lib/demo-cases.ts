/**
 * Mode démo M7 — 10 cas calibrés VERBATIM Sidali v1.0.0 (validés au premier essai, seuil 80).
 *
 * Couverture types : 5 refund · 3 continuité · 2 paiement_résultats.
 *
 * Casting Sidali M7 (peut diverger de M3/M4/M5/M6 — nous restons ISO M7) :
 * - karim : coaching business franco-arabe HT (refund 60j)
 * - imen : formation cuisine halal en ligne (continuité)
 * - khadija : coaching mariage musulman (refund 30j)
 * - aicha_tarek : couple coach finance halal (paiement_résultats 50/50)
 * - najet : consulting e-commerce Shopify (refund 90j sur palier CA)
 * - salima : coaching parental musulman (continuité)
 * - mehdi : closer/setter musulman (paiement_résultats après 1er deal)
 * - mounia_anas : agence SaaS B2B (refund 30j sur livrable précis)
 * - younes : coaching sportif premium (refund 60j transformation mesurée)
 * - lina : coaching reconversion (continuité jusqu'au 1er emploi/freelance)
 */

import type { M7State, M7Data } from "./types";

export interface M7DemoCase {
  key: string;
  segment: "argent" | "relations" | "sante";
  emoji: string;
  title: string;
  summary: string;
  ready: boolean;
  patch?: Partial<M7State>;
}

// ── Helper de construction démo ──────────────────────────────────────
function buildBase(opts: {
  avatar: string; niche: string; m2_pain: string;
  m3_promesse: string; m3_mecanisme: string; m3_prix: string;
  m4_strategy: string; m4_ht_target: number;
  m5_point_b: string; m5_days: number;
  m6_paiements: Record<string, boolean>; m6_pitch_frac: string;
}): Partial<M7State> {
  return {
    current: "type_garantie",
    m1_data: { source: "demo", sous_niche_2: { phrase: opts.niche, phrase_finale: opts.niche }, avatar: { socio: { nom: opts.avatar } }, marche: { id: "argent", label: "💰" } },
    m1_source: "profile",
    m2_data: { source: "demo", data: { dominant_pain: opts.m2_pain } },
    m2_source: "profile",
    m3_data: { source: "demo", complete: true, promesse: opts.m3_promesse, hero_mecanisme_nom: opts.m3_mecanisme, prix_display: opts.m3_prix },
    m3_source: "profile",
    m4_data: { source: "demo", complete: true, entry_strategy: opts.m4_strategy, ht_monthly_target: opts.m4_ht_target, strategy_score_is_forced: false, ht: { name: opts.m3_mecanisme, price: opts.m3_prix } },
    m4_source: "profile",
    m5_data: { source: "demo", complete: true, handoff_to_m6: { ht_point_b: opts.m5_point_b, ht_point_b_measurable: opts.m5_point_b, ht_point_b_timeframe_days: opts.m5_days, upstream_forced: false } },
    m5_source: "profile",
    m6_data: { source: "demo", complete: true, handoff_to_m7: { handoff_version: "m6_v1.2.0", prix_ht: opts.m3_prix, paiements_actives: opts.m6_paiements, pitch_fractionnement: opts.m6_pitch_frac, upstream_forced: false, avg_score: 88 } },
    m6_source: "profile",
    upstream_forced: false,
  };
}

const FULL_SCORES = { type_garantie: 88, promesse_garantie: 90, conditions_client: 86, math_garantie: 92, expose_garantie: 88, termes_conditions: 84 };
const FULL_ATTEMPTS = { type_garantie: 1, promesse_garantie: 1, conditions_client: 1, math_garantie: 1, expose_garantie: 1, termes_conditions: 1 };
const NO_FORCED = { type_garantie: false, promesse_garantie: false, conditions_client: false, math_garantie: false, expose_garantie: false, termes_conditions: false };

// ════════════════════════════════════════════════════════════════════════
// ARGENT (5 démos)
// ════════════════════════════════════════════════════════════════════════

// ── 1 · Karim · coaching business franco-arabe HT (refund 60j) ───────
const KARIM_DATA: M7Data = {
  type_garantie: {
    type_choisi: "refund",
    justification: "Mon avatar Yacine est un coach franco-arabe à 4 200€ de CA mensuel qui stagne depuis 2 ans. L'objection numéro 1 en call c'est « j'ai déjà essayé d'autres formations qui n'ont pas marché ». Une garantie refund 60j supprime cette objection directement et booste mon taux de transformation en call de 30%. En HT direct premium à 4 997€, le refund est le levier de conversion le plus brut.",
  },
  promesse_garantie: {
    resultat: "Atteindre 12 000€ de CA mensuel récurrents en signant au minimum 3 clients premium à 3 997€ via le système d'acquisition par DM enseigné",
    duree_valeur: 90, duree_unite: "jours",
    critere_objectif: "Relevés Stripe ou bordereaux de virements du client envoyés par mail à coaching@karim.fr à J+90, comparaison vs J+0 communiquée à l'inscription, capture d'écran datée",
  },
  conditions_client: {
    conditions_text: "Le client doit avoir terminé les 14 modules vidéo du programme (preuve : progression Kajabi à 100%)\nLe client doit avoir participé à au minimum 16 calls individuels sur 24 prévus (preuve : enregistrement Zoom)\nLe client doit avoir envoyé au minimum 200 DM prospects qualifiés via les scripts fournis (preuve : journal DM hebdomadaire envoyé)\nLe client doit avoir mené 30 calls de découverte (preuve : enregistrements + comptes-rendus)\nLe client doit avoir transmis ses captures Stripe mensuelles (preuve : screenshots datés)",
  },
  math_garantie: { clients_initiaux: 8, delta_estime: 3, taux_refund_pct: 10, net_positif: 2.1 },
  expose_garantie: {
    pitch_text: "Je dis à Yacine : « 4 997€ c'est l'investissement. Et je m'engage par contrat écrit : si à J+60 ton CA mensuel n'a pas atteint 12 000€ récurrents en suivant le système, je te rembourse les 4 997€ intégralement sous 30 jours bancaires. C'est mesurable dans tes Stripe, c'est binaire, c'est dans le contrat que je te partage à l'écran maintenant et que tu reçois par mail dès l'inscription. Le risque est entièrement sur moi. »",
    formule_marketing: "Coaching Business Liberty — ou je te rembourse",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE LIBERTY BUSINESS — édité par SASU Karim Coaching (SIREN 921 345 678, RCS Paris).\n\n1. OBJET. La présente garantie engage SASU Karim Coaching à rembourser intégralement le montant payé par le client (4 997€ TTC) si, à J+60 jours après inscription, le client n'a pas atteint 12 000€ de CA mensuel récurrents en signant au minimum 3 clients premium à 3 997€ via le système d'acquisition par DM enseigné.\n\n2. CONDITIONS D'ACTIVATION. Le remboursement n'est dû que si le client prouve avoir : (a) terminé les 14 modules vidéo (Kajabi à 100%), (b) participé à 16 calls individuels sur 24 (Zoom), (c) envoyé 200 DM prospects qualifiés (journal hebdomadaire), (d) mené 30 calls de découverte, (e) transmis les captures Stripe mensuelles.\n\n3. PROCÉDURE. Demande à coaching@karim.fr sous 21 jours après J+60. Remboursement sous 30 jours bancaires.\n\n4. EXCLUSIONS. Non-respect d'une condition du §2 = refus.\n\n5. DROIT APPLICABLE. Droit français. Médiation préalable. Juridiction : tribunal de commerce de Paris.",
    vendeur_statut: "SASU Karim Coaching — SIREN 921 345 678 — RCS Paris",
  },
};
const KARIM_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Karim", niche: "Entrepreneurs franco-arabes 25-40 ans qui stagnent à 3-5k€/mois",
    m2_pain: "Stagner à 3-5k/mois sans système répétable malgré 2 ans d'effort",
    m3_promesse: "12 000€ de CA mensuel récurrents grâce à un système d'acquisition par DM",
    m3_mecanisme: "Méthode Liberty Business™", m3_prix: "4 997€",
    m4_strategy: "ht_direct", m4_ht_target: 6,
    m5_point_b: "12 000€ de CA mensuel récurrents", m5_days: 90,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Tu peux régler en 3 fois sans frais à 1 666€/mois, sans riba.",
  }),
  data: KARIM_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 4 · Aïcha & Tarek · couple coach finance halal (paiement_résultats) ─
const AICHA_TAREK_DATA: M7Data = {
  type_garantie: {
    type_choisi: "paiement_resultats",
    justification: "Nos clients sont stressés financièrement (avatar Karim & Leila à 0€ d'épargne, 8 000€ de dettes). Demander 4 500€ comptant est psychologiquement bloquant. Le paiement aux résultats (2 250€ à l'inscription, 2 250€ quand ils atteignent 15 000€ d'épargne halal placée) aligne nos intérêts : on ne touche le reste QUE si on délivre. Cohérent avec nos options 2x et 6x déjà activées en M6.",
  },
  promesse_garantie: {
    resultat: "Atteindre 15 000€ d'épargne halal placée (compte épargne sans intérêts ou produit halal certifié) et avoir remboursé intégralement les 8 000€ de dettes consommation initiales à J+180",
    duree_valeur: 180, duree_unite: "jours",
    critere_objectif: "Captures Stripe / relevés bancaires du couple datés à J+180 envoyés à finance@aicha-tarek.fr, validation lors d'un call final de 60 minutes avec présentation des 3 relevés (épargne, ancien crédit soldé, compte courant)",
  },
  conditions_client: {
    conditions_text: "Le couple doit avoir terminé les 14 modules de formation conjointement (preuve : progression duo Kajabi)\nLe couple doit avoir participé à 12 calls couple sur 18 prévus (preuve : enregistrement Zoom des 2 époux présents)\nLe couple doit avoir tenu un budget mensuel pendant 6 mois consécutifs (preuve : tableurs envoyés mensuellement)\nLe couple doit avoir effectué les 8 ajustements de dépenses recommandés (preuve : avant/après documenté par capture)\nLe couple doit avoir transmis ses 6 relevés bancaires mensuels anonymisés (preuve : PDF envoyés à finance@aicha-tarek.fr)",
  },
  math_garantie: { clients_initiaux: 12, delta_estime: 6, taux_refund_pct: 8, net_positif: 4.56 },
  expose_garantie: {
    pitch_text: "Aïcha enchaîne après le prix : « 4 500€, oui — mais tu n'en paies que la moitié maintenant. Les 2 250€ restants tu nous les verses SEULEMENT quand tu as atteint 15 000€ d'épargne halal placée et soldé tes dettes consommation. Si tu n'y arrives pas en 6 mois en suivant la méthode, tu ne nous paies jamais ce solde. C'est écrit dans nos T&C que je peux te montrer à l'écran maintenant, et le contrat te sera envoyé par mail dès l'inscription. Le risque est sur nous, pas sur ton couple. »",
    formule_marketing: "Méthode Liberty Halal Wealth — payé au résultat",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE LIBERTY HALAL WEALTH — édité par EURL Halal Wealth (SIREN 943 678 901, RCS Lyon).\n\n1. OBJET. La présente garantie de paiement aux résultats engage EURL Halal Wealth à ne percevoir que la moitié du prix (2 250€ TTC) à l'inscription, le solde (2 250€ TTC) n'étant exigible que si le couple atteint 15 000€ d'épargne halal placée et a remboursé intégralement les 8 000€ de dettes consommation initiales à J+180 jours.\n\n2. CONDITIONS D'ACTIVATION DU NON-PAIEMENT DU SOLDE. Le couple n'est pas redevable du solde si, à J+180 et en ayant prouvé avoir : (a) terminé les 14 modules conjointement, (b) participé à 12 calls couple sur 18 (Zoom), (c) tenu un budget mensuel pendant 6 mois (tableurs), (d) effectué les 8 ajustements recommandés, (e) transmis 6 relevés bancaires mensuels anonymisés (PDF), le couple n'a pas atteint 15 000€ d'épargne halal et zéro dette consommation.\n\n3. PROCÉDURE. Notification à finance@aicha-tarek.fr sous 14 jours après J+180.\n\n4. EXCLUSIONS. Non-respect d'une condition = couple redevable du solde. Garantie ne couvre pas placements à intérêts (riba).\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal de commerce de Lyon.",
    vendeur_statut: "EURL Halal Wealth — SIREN 943 678 901 — RCS Lyon",
  },
};
const AICHA_TAREK_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Aïcha & Tarek", niche: "Couples musulmans 28-45 ans qui veulent gérer leurs finances sans riba",
    m2_pain: "Vivre dans l'angoisse financière chaque fin de mois sans jamais épargner ni investir halal",
    m3_promesse: "Couple avec 15 000€ d'épargne halal placée et zéro dette consommation à J+180",
    m3_mecanisme: "Méthode Liberty Halal Wealth™", m3_prix: "4 500€",
    m4_strategy: "ht_direct", m4_ht_target: 5,
    m5_point_b: "15 000€ d'épargne halal + zéro dette consommation", m5_days: 180,
    m6_paiements: { "1x": true, "3x": true, "6x": true, "12x": false },
    m6_pitch_frac: "Tu peux régler en 6 fois sans frais à 750€/mois, sans riba.",
  }),
  data: AICHA_TAREK_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 5 · Najet · consulting e-commerce Shopify (refund 90j palier CA) ─
const NAJET_DATA: M7Data = {
  type_garantie: {
    type_choisi: "refund",
    justification: "Younes est un e-commerçant pragmatique qui compte tout en chiffres. Pour lui le refund 90j sur palier CA mesurable (30 000€/mois) est l'argument le plus rationnel : c'est mesurable, c'est binaire, c'est dans Shopify. Le HT direct premium à 6 997€ le fait hésiter à cause des 2 années à plafonner — le refund supprime ce frein. Cohérent.",
  },
  promesse_garantie: {
    resultat: "Atteindre 30 000€ de CA mensuel sur la boutique Shopify avec un ROAS publicitaire supérieur à 3, mesuré sur les 30 derniers jours roulants à J+90",
    duree_valeur: 90, duree_unite: "jours",
    critere_objectif: "Captures du dashboard Shopify analytics et du gestionnaire de publicités Meta/Google datées à J+90, envoyées à consulting@najet.fr, présentation lors d'un call de 45 minutes avec validation des 30 derniers jours roulants",
  },
  conditions_client: {
    conditions_text: "Le client doit avoir terminé les 16 modules du programme (preuve : progression Notion)\nLe client doit avoir participé à 10 calls individuels sur 12 (preuve : enregistrement Zoom)\nLe client doit avoir implémenté les 24 optimisations recommandées sur la boutique (preuve : screenshots avant/après datés)\nLe client doit avoir alloué un budget publicitaire minimum de 100€ par jour (preuve : factures Meta/Google)\nLe client doit avoir envoyé son tableau de bord hebdomadaire pendant 12 semaines (preuve : Google Sheet partagé)",
  },
  math_garantie: { clients_initiaux: 6, delta_estime: 3, taux_refund_pct: 15, net_positif: 1.65 },
  expose_garantie: {
    pitch_text: "Je dis à Younes : « 6 997€ c'est l'investissement. Et je m'engage par contrat écrit : si à J+90 jours ta boutique n'a pas atteint 30 000€ de CA mensuel avec un ROAS > 3, je te rembourse les 6 997€ intégralement sous 30 jours bancaires. Tu pourras me montrer les captures Shopify et Meta — c'est binaire, on le voit dans tes dashboards. Le contrat est dans les T&C que je te partage à l'écran maintenant et que je t'envoie par mail dès la signature. Le risque est entièrement sur moi. »",
    formule_marketing: "Méthode Scale Liberty — ou vous ne nous payez pas",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE SCALE LIBERTY — édité par SASU Najet Consulting (SIREN 932 567 890, RCS Bordeaux).\n\n1. OBJET. La présente garantie engage SASU Najet Consulting à rembourser intégralement le montant payé par le client (6 997€ TTC) si, à J+90 jours après inscription, la boutique Shopify du client n'a pas atteint 30 000€ de CA mensuel avec un ROAS publicitaire supérieur à 3, mesuré sur les 30 derniers jours roulants.\n\n2. CONDITIONS D'ACTIVATION. (a) 16 modules terminés (Notion 100%), (b) 10 calls individuels sur 12 (Zoom), (c) 24 optimisations implémentées (screenshots avant/après), (d) budget pub minimum 100€/jour pendant 90j (factures Meta/Google), (e) tableau de bord hebdo pendant 12 semaines (Google Sheet partagé).\n\n3. PROCÉDURE. Demande à consulting@najet.fr sous 21 jours après J+90. Remboursement sous 30 jours bancaires.\n\n4. EXCLUSIONS. Non-respect d'une condition = refus. Garantie ne couvre pas les changements de produit/fournisseur/positionnement non validés par le consultant.\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal de commerce de Bordeaux.",
    vendeur_statut: "SASU Najet Consulting — SIREN 932 567 890 — RCS Bordeaux",
  },
};
const NAJET_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Najet", niche: "E-commerçants 30-50 ans avec boutique Shopify entre 5k et 20k de CA mensuel",
    m2_pain: "Plafonner à 8-12k de CA mensuel malgré 200 commandes/mois et ne pas savoir scaler",
    m3_promesse: "Boutique Shopify à 30 000€ de CA mensuel récurrents avec ROAS publicitaire > 3",
    m3_mecanisme: "Méthode Scale Liberty™", m3_prix: "6 997€",
    m4_strategy: "ht_direct", m4_ht_target: 4,
    m5_point_b: "30 000€ CA mensuel + ROAS > 3 sur 30 jours roulants", m5_days: 90,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Tu peux régler en 3 fois sans frais à 2 333€/mois, sans riba.",
  }),
  data: NAJET_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 7 · Mehdi · closer/setter musulman (paiement_résultats après 1er deal) ─
const MEHDI_DATA: M7Data = {
  type_garantie: {
    type_choisi: "paiement_resultats",
    justification: "Ilyas est à 1 500€ net/mois en intérim. Lui demander 2 497€ comptant est psychologiquement impossible — c'est presque 2 mois de salaire net. Le paiement aux résultats (1 248€ à l'inscription, 1 248€ quand il signe son 1er contrat de closer) résout : il s'engage sans casser son budget, je touche le solde uniquement quand je délivre. Cohérent avec les options 2x et 4x activées en M6.",
  },
  promesse_garantie: {
    resultat: "Signer son premier contrat formel de closer avec une offre à minimum 8% de commission sur des tickets de 3 000€ ou plus à J+90",
    duree_valeur: 90, duree_unite: "jours",
    critere_objectif: "Capture du contrat de closer signé électroniquement (ou photographié) avec l'offre, mentionnant le pourcentage de commission et le ticket moyen, envoyée par mail à coaching@mehdi.fr à J+90 maximum",
  },
  conditions_client: {
    conditions_text: "Le client doit avoir terminé les 14 modules de formation closer (preuve : progression Kajabi à 100%)\nLe client doit avoir participé à 18 calls de groupe sur 24 prévus (preuve : enregistrement Zoom)\nLe client doit avoir effectué au minimum 80 candidatures et entretiens d'offres closer en 90 jours (preuve : journal hebdomadaire envoyé)\nLe client doit avoir réalisé au minimum 30 simulations de calls de closing avec ses pairs (preuve : enregistrement audio horodaté)\nLe client doit avoir transmis ses captures de profils LinkedIn et propositions envoyées (preuve : screenshots datés)",
  },
  math_garantie: { clients_initiaux: 14, delta_estime: 7, taux_refund_pct: 12, net_positif: 4.48 },
  expose_garantie: {
    pitch_text: "Je dis à Ilyas : « 2 497€ en HT, c'est ce que vaut la formation. Mais tu n'en paies que la moitié maintenant — 1 248€. Les 1 248€ restants tu me les verses SEULEMENT quand tu as signé ton premier contrat de closer à 8% minimum sur tickets 3k€+. Si tu n'y arrives pas en 90 jours en suivant la méthode, tu ne me paies jamais ce solde. C'est écrit dans le contrat que je peux te partager à l'écran maintenant, et qui te sera envoyé par mail dès la signature. Le risque est sur moi. »",
    formule_marketing: "Closer Liberty — payé au résultat",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE LIBERTY CLOSER — édité par EI Mehdi Formation (SIREN 974 567 123).\n\n1. OBJET. La présente garantie de paiement aux résultats engage EI Mehdi Formation à ne percevoir que la moitié du prix (1 248€ TTC) à l'inscription, le solde (1 249€ TTC) n'étant exigible que si le client a signé un premier contrat de closer à minimum 8% de commission sur tickets 3 000€ ou plus à J+90 jours après inscription.\n\n2. CONDITIONS D'EXIGIBILITÉ DU SOLDE. (a) 14 modules terminés (Kajabi 100%), (b) 18 calls de groupe sur 24 (Zoom), (c) 80 candidatures/entretiens en 90j (journal hebdomadaire), (d) 30 simulations de calls (enregistrement audio), (e) captures profils LinkedIn et propositions envoyées.\n\n3. PROCÉDURE. À J+90, le client transmet à coaching@mehdi.fr le statut de signature de contrat + preuves §2. Sans contrat signé, solde annulé.\n\n4. EXCLUSIONS. Non-respect d'une condition = solde dû même sans contrat closer. Garantie ne couvre pas refus volontaire de candidater à des offres conformes ou rupture volontaire d'un contrat signé.\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal de commerce de Lille.",
    vendeur_statut: "EI Mehdi Formation — SIREN 974 567 123",
  },
};
const MEHDI_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Mehdi", niche: "Hommes 22-32 ans qui veulent devenir closer/setter remote",
    m2_pain: "Travailler à l'usine ou en intérim et ne pas savoir comment basculer en remote rentable",
    m3_promesse: "Signer son 1er contrat de closer à minimum 8% de commission sur tickets 3k€+",
    m3_mecanisme: "Closer Liberty™", m3_prix: "2 497€",
    m4_strategy: "ht_direct", m4_ht_target: 8,
    m5_point_b: "1er contrat closer signé à 8% sur tickets 3k€+", m5_days: 90,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Tu peux régler en 2 fois à 1 248€/mois, sans riba.",
  }),
  data: MEHDI_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 8 · Mounia & Anas · agence SaaS B2B (refund 30j sur livrable) ──
const MOUNIA_ANAS_DATA: M7Data = {
  type_garantie: {
    type_choisi: "refund",
    justification: "Hakim est un CTO rationnel qui mesure tout. Pour lui, le refund 30j conditionné à un livrable précis (l'audit churn + plan d'action priorisé livré sous 30j) est l'argument B2B classique : si on n'a pas livré un livrable contractuel et auditable sous 30 jours, refund intégral. Le prix élevé (12 000€) exige cette assurance. La continuité serait un piège pour un B2B avec board.",
  },
  promesse_garantie: {
    resultat: "Livrer un audit complet du churn (rapport de 40+ pages) et un plan d'action priorisé de 15 leviers chiffrés ROI > 3x à J+30, avec implémentation accompagnée garantissant une baisse de churn à moins de 2% mensuel à J+90",
    duree_valeur: 30, duree_unite: "jours",
    critere_objectif: "Livraison documentée du rapport (PDF horodaté), du plan d'action priorisé (Notion partagé) et du dashboard de suivi (Looker Studio), validation lors d'un call de présentation de 90 minutes avec le CTO et le COO à J+30",
  },
  conditions_client: {
    conditions_text: "Le client doit avoir donné accès en lecture aux 4 systèmes requis (Stripe, Mixpanel, Intercom, base produit) dans les 5 jours après signature (preuve : invitations envoyées)\nLe client doit avoir participé à 4 ateliers de découverte sur 4 prévus (preuve : enregistrement Zoom avec présence CTO et COO)\nLe client doit avoir transmis les 12 documents demandés (charte produit, roadmap, contrats clients top 20) dans les 10 jours (preuve : drive partagé)\nLe client doit avoir réalisé les 6 interviews clients churné fournies au consultant (preuve : enregistrements audio)\nLe client doit avoir validé les 3 jalons intermédiaires aux dates prévues (preuve : compte-rendu signé)",
  },
  math_garantie: { clients_initiaux: 8, delta_estime: 3, taux_refund_pct: 10, net_positif: 1.9 },
  expose_garantie: {
    pitch_text: "Anas dit au CTO : « 12 000€ pour un audit complet du churn et un plan d'action priorisé sur 30 jours, c'est l'investissement. Si on n'a pas livré le rapport de 40+ pages, le plan d'action avec 15 leviers chiffrés ROI > 3x ET le dashboard de suivi à J+30, on rembourse intégralement les 12 000€. C'est écrit, c'est binaire, c'est dans nos T&C que je vous partage à l'écran maintenant et que vous recevrez par mail. Le risque est sur nous, pas sur votre board. »",
    formule_marketing: "Audit Churn Liberty — livré sous 30 jours ou vous ne nous payez pas",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE LIBERTY CHURN AUDIT — édité par SARL Mounia & Anas Consulting (SIREN 985 678 912, RCS Paris).\n\n1. OBJET. La présente garantie engage SARL Mounia & Anas Consulting à rembourser intégralement le montant payé par le client (12 000€ HT) si, à J+30 jours après signature, le consultant n'a pas livré : (a) un rapport d'audit complet du churn d'au minimum 40 pages, (b) un plan d'action priorisé de 15 leviers chiffrés ROI > 3x, (c) un dashboard de suivi Looker Studio configuré.\n\n2. CONDITIONS D'ACTIVATION. (a) accès lecture aux 4 systèmes (Stripe/Mixpanel/Intercom/base) sous 5j, (b) 4 ateliers de découverte sur 4 (Zoom CTO+COO), (c) 12 documents transmis sous 10j (drive partagé), (d) 6 interviews clients churné (audio), (e) 3 jalons intermédiaires validés (comptes-rendus signés).\n\n3. PROCÉDURE. Demande à contact@mounia-anas.com sous J+30. Remboursement sous 30 jours bancaires.\n\n4. EXCLUSIONS. Non-respect d'une condition = refus. Garantie ne couvre pas l'absence d'implémentation des recommandations par le client après J+30.\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal de commerce de Paris.",
    vendeur_statut: "SARL Mounia & Anas Consulting — SIREN 985 678 912 — RCS Paris",
  },
};
const MOUNIA_ANAS_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Mounia & Anas", niche: "SaaS B2B 50-500 employés avec ARR entre 1M€ et 10M€",
    m2_pain: "Avoir un churn mensuel > 5% sans savoir identifier les causes ni les corriger",
    m3_promesse: "SaaS à churn mensuel < 2% avec rétention cohorte M+6 supérieure à 85% à J+90",
    m3_mecanisme: "Churn Audit Liberty™", m3_prix: "12 000€",
    m4_strategy: "ht_direct", m4_ht_target: 2,
    m5_point_b: "Churn mensuel < 2% + rétention M+6 > 85%", m5_days: 90,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Vous pouvez régler en 3 fois sans frais à 4 000€/mois, sans riba.",
  }),
  data: MOUNIA_ANAS_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ════════════════════════════════════════════════════════════════════════
// RELATIONS (2 démos)
// ════════════════════════════════════════════════════════════════════════

// ── 3 · Khadija · coaching mariage musulman (refund 30j) ───────────
const KHADIJA_DATA: M7Data = {
  type_garantie: {
    type_choisi: "refund",
    justification: "Hanan est échaudée par 18 mois d'échecs et 12 rencontres ratées. Le risque psychologique en HT direct à 2 997€ est ÉNORME — elle pense « encore un programme qui ne marche pas ». Le refund est le seul levier qui désamorce immédiatement cette objection. La continuité serait un piège (personne ne veut être célibataire 1 an de plus). Le paiement résultats est inadapté au sujet sensible.",
  },
  promesse_garantie: {
    resultat: "Avoir engagé une relation sérieuse menant à un projet de mariage avec un homme compatible et engagé religieusement, validée par 3 entretiens parentaux à J+180",
    duree_valeur: 180, duree_unite: "jours",
    critere_objectif: "Validation par un entretien final à J+180 de 60 minutes avec moi (Khadija) et attestation écrite signée de la cliente confirmant l'engagement formel et la rencontre familiale validée, transmise par mail",
  },
  conditions_client: {
    conditions_text: "La cliente doit avoir terminé les 12 modules vidéo (preuve : progression Kajabi à 100%)\nLa cliente doit avoir participé à au minimum 16 calls individuels sur 24 prévus (preuve : enregistrement Zoom et compte-rendu signé)\nLa cliente doit avoir effectué au minimum 30 rencontres réelles selon le protocole enseigné (preuve : journal de rencontres mensuel envoyé)\nLa cliente doit avoir envoyé son carnet de bord hebdomadaire pendant 24 semaines (preuve : Notion partagé)\nLa cliente doit avoir transmis ses captures de profils utilisés et conversations menées (preuve : screenshots datés)",
  },
  math_garantie: { clients_initiaux: 8, delta_estime: 3, taux_refund_pct: 12, net_positif: 1.68 },
  expose_garantie: {
    pitch_text: "À Hanan je dis directement : « Tu as déjà eu 12 rencontres ratées, je comprends. C'est pour ça que je t'offre une garantie écrite : si à J+180 tu n'as pas engagé une relation sérieuse avec mariage en perspective en suivant la méthode, je te rembourse les 2 997€ intégralement par virement. C'est dans le contrat que je te signe et que je peux te partager à l'écran maintenant si tu veux le lire. Le risque n'est pas sur toi cette fois. »",
    formule_marketing: "Méthode Liberty Mariage — ou je te rembourse",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE LIBERTY MARIAGE — Khadija Coaching, micro-entreprise (SIRET 853 121 234 00012).\n\n1. OBJET. Le présent contrat engage Khadija Coaching à rembourser intégralement le montant payé par la cliente (2 997€ TTC) si, à J+180 jours après inscription, la cliente n'a pas engagé une relation sérieuse menant à un projet de mariage avec un homme compatible et engagé religieusement, validée par 3 entretiens parentaux.\n\n2. CONDITIONS D'ACTIVATION. (a) 12 modules vidéo terminés (Kajabi 100%), (b) 16 calls individuels sur 24 (Zoom + comptes-rendus signés), (c) 30 rencontres réelles selon le protocole (journal mensuel), (d) carnet de bord hebdomadaire pendant 24 semaines (Notion), (e) captures profils utilisés et conversations menées (screenshots datés).\n\n3. PROCÉDURE. Demande à khadija@mariageliberty.fr sous 30 jours après J+180 avec preuves §2. Remboursement sous 45 jours bancaires après validation.\n\n4. EXCLUSIONS. Non-respect d'une condition = refus. Garantie ne couvre pas les ruptures volontaires de la cliente sans motif religieux ou éthique.\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal judiciaire de Marseille.",
    vendeur_statut: "Khadija Coaching — micro-entreprise — SIRET 853 121 234 00012",
  },
};
const KHADIJA_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Khadija", niche: "Femmes musulmanes célibataires 28-38 ans qui veulent se marier sereinement",
    m2_pain: "Multiplier les rencontres infructueuses et perdre l'espoir de trouver un époux compatible",
    m3_promesse: "Engagée sérieusement avec un homme compatible et engagé dans les 6 mois suivant le programme",
    m3_mecanisme: "Méthode Liberty Mariage™", m3_prix: "2 997€",
    m4_strategy: "ht_direct", m4_ht_target: 6,
    m5_point_b: "Relation sérieuse engagée + mariage en perspective", m5_days: 180,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Tu peux régler en 3 fois sans frais à 999€/mois, sans riba.",
  }),
  data: KHADIJA_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 6 · Salima · coaching parental musulman (continuité) ───────────
const SALIMA_DATA: M7Data = {
  type_garantie: {
    type_choisi: "continuite",
    justification: "Fatima est dans la souffrance émotionnelle quotidienne. Le refund serait un non-sens : si la garantie est activée, c'est qu'elle est ENCORE en train de crier sur ses enfants — l'argent ne répare pas. La continuité gratuite jusqu'à atteindre l'objectif comportemental est l'unique réponse cohérente : tant qu'elle n'y arrive pas, je l'accompagne. Cohérent avec une échelle de valeur où le HT est l'aboutissement.",
  },
  promesse_garantie: {
    resultat: "Réduire les épisodes de cris à moins de 1 par semaine et utiliser les 5 techniques de communication non-violente enseignées au quotidien, validé sur 30 jours consécutifs à J+120",
    duree_valeur: 120, duree_unite: "jours",
    critere_objectif: "Journal de bord parental tenu quotidiennement pendant les 30 derniers jours envoyé à coaching@salima.fr, validation lors d'un call de 60 minutes à J+120 avec analyse des incidents notés et des techniques utilisées",
  },
  conditions_client: {
    conditions_text: "La cliente doit avoir terminé les 10 modules du programme (preuve : progression Teachable à 100%)\nLa cliente doit avoir participé à 8 calls individuels sur 12 (preuve : enregistrement Zoom)\nLa cliente doit avoir tenu un journal de bord parental quotidien pendant 16 semaines (preuve : Notion partagé)\nLa cliente doit avoir appliqué les 5 techniques enseignées au moins 3 fois par semaine (preuve : journal documenté)\nLa cliente doit avoir partagé ses captures écran des bilans hebdo (preuve : screenshots datés)",
  },
  math_garantie: { clients_initiaux: 12, delta_estime: 5, taux_refund_pct: 6, net_positif: 3.98 },
  expose_garantie: {
    pitch_text: "Je dis à Fatima : « 1 997€ c'est pour 4 mois d'accompagnement. Et si à J+120 tu n'arrives pas à réduire tes cris à moins d'1 par semaine sur 30 jours consécutifs en utilisant les techniques, ce n'est PAS toi qui prolonges en payant — c'est moi qui continue à t'accompagner gratuitement jusqu'à ce que tu y arrives. C'est écrit dans le contrat que je te partage à l'écran maintenant et que je t'envoie par mail dès l'inscription. Le risque que tu restes coincée, c'est moi qui le porte. »",
    formule_marketing: "Méthode Liberty Parental — ou nous vous accompagnons jusqu'à apaisement",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE LIBERTY PARENTAL — Salima Khelifi, auto-entrepreneur (SIRET 891 234 567 00029).\n\n1. OBJET. Le présent contrat engage Salima Khelifi à prolonger l'accompagnement de la cliente sans frais supplémentaires si, à J+120 jours après inscription, la cliente n'est pas parvenue à réduire ses épisodes de cris à moins d'1 par semaine sur 30 jours consécutifs, en utilisant les 5 techniques de communication non-violente enseignées.\n\n2. CONDITIONS D'ACTIVATION. (a) 10 modules terminés (Teachable 100%), (b) 8 calls individuels sur 12 (Zoom), (c) journal de bord parental quotidien 16 semaines (Notion), (d) 5 techniques appliquées ≥3 fois/semaine (journal), (e) captures bilans hebdo (screenshots datés).\n\n3. PROCÉDURE. Notification à coaching@salima.fr sous 14 jours après J+120 avec journal des 30 derniers jours et preuves §2. Accompagnement prolongé par tranches de 30 jours renouvelables jusqu'à validation.\n\n4. EXCLUSIONS. Non-respect d'une condition = refus. Aucun remboursement monétaire ne peut être réclamé.\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal judiciaire de Toulouse.",
    vendeur_statut: "Salima Khelifi — auto-entrepreneur — SIRET 891 234 567 00029",
  },
};
const SALIMA_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Salima", niche: "Mères musulmanes 30-45 ans avec enfants 4-12 ans",
    m2_pain: "Crier sur ses enfants quotidiennement et culpabiliser sans savoir comment changer",
    m3_promesse: "Réduit les épisodes de cris à moins de 1 par semaine et utilise les 5 techniques de communication non-violente",
    m3_mecanisme: "Méthode Liberty Parental™", m3_prix: "1 997€",
    m4_strategy: "ladder", m4_ht_target: 10,
    m5_point_b: "< 1 cri/semaine sur 30 jours consécutifs", m5_days: 120,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Tu peux régler en 3 fois sans frais à 665€/mois, sans riba.",
  }),
  data: SALIMA_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ════════════════════════════════════════════════════════════════════════
// SANTÉ / LIFESTYLE (3 démos)
// ════════════════════════════════════════════════════════════════════════

// ── 2 · Imen · formation cuisine halal en ligne (continuité) ────────
const IMEN_DATA: M7Data = {
  type_garantie: {
    type_choisi: "continuite",
    justification: "La cuisine ne se mesure pas en euros, donc le refund n'a pas de sens. Salima veut être rassurée que je vais l'accompagner jusqu'à ce qu'elle MAÎTRISE — c'est exactement ce que la continuité promet. Plus elle reste, plus elle progresse, et mes coûts marginaux sont faibles (les modules existent déjà). Cohérent avec une échelle de valeur où mon HT est l'aboutissement.",
  },
  promesse_garantie: {
    resultat: "Maîtriser au minimum 50 recettes maghrébines et levantines complexes et savoir construire 12 menus complets sans recette à J+120",
    duree_valeur: 120, duree_unite: "jours",
    critere_objectif: "Évaluation finale par live cooking de 90 minutes à J+120 avec moi (Imen), réalisation de 3 plats imposés tirés au sort dans le programme, validation sur 12 critères techniques notés par grille publique",
  },
  conditions_client: {
    conditions_text: "La cliente doit avoir terminé les 10 modules de formation (preuve : progression Teachable à 100%)\nLa cliente doit avoir réalisé et photographié au minimum 30 recettes pendant la formation (preuve : album photos partagé)\nLa cliente doit avoir participé à 6 lives de groupe sur 10 (preuve : présence enregistrée)\nLa cliente doit avoir envoyé son carnet de bord hebdo pendant 16 semaines (preuve : Notion partagé)\nLa cliente doit avoir présenté ses 3 plats imposés lors de l'évaluation finale (preuve : enregistrement vidéo)",
  },
  math_garantie: { clients_initiaux: 15, delta_estime: 5, taux_refund_pct: 5, net_positif: 4.0 },
  expose_garantie: {
    pitch_text: "Je dis à Salima : « 1 497€ c'est l'investissement pour 4 mois. Et si à J+120 tu n'as pas maîtrisé les 50 recettes maghrébines et levantines complexes enseignées et que tu ne sais pas construire les 12 menus complets sans recette, ce n'est PAS toi qui prolonges en payant — c'est MOI qui continue à t'accompagner gratuitement jusqu'à maîtrise complète. Tu peux lire le contrat tout de suite, je partage mon écran si tu veux, c'est écrit dans les T&C que je t'enverrai par mail à l'inscription. Le risque qu'on rate ta progression et que tu ne maîtrises pas, c'est moi qui le porte. »",
    formule_marketing: "Cuisine Liberty — ou nous vous accompagnons jusqu'à maîtrise complète",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE CUISINE LIBERTY — Imen Benali, auto-entrepreneur (SIRET 902 345 678 00018).\n\n1. OBJET. Le présent contrat engage Imen Benali à prolonger l'accompagnement de la cliente sans frais supplémentaires si, à J+120 jours après inscription, la cliente n'a pas maîtrisé au minimum 50 recettes maghrébines et levantines et n'est pas capable de construire 12 menus complets sans recette.\n\n2. CONDITIONS D'ACTIVATION. (a) 10 modules terminés (Teachable 100%), (b) 30 recettes réalisées et photographiées (album partagé), (c) 6 lives de groupe sur 10 (présence enregistrée), (d) carnet de bord hebdo 16 semaines (Notion), (e) 3 plats imposés lors évaluation finale (enregistrement vidéo).\n\n3. PROCÉDURE. Notification à imen@cuisineliberty.fr sous 14 jours après l'évaluation finale à J+120. Accompagnement prolongé par tranches de 30 jours renouvelables jusqu'à validation.\n\n4. EXCLUSIONS. Non-respect d'une condition = refus. Aucun remboursement monétaire.\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal judiciaire de Lyon.",
    vendeur_statut: "Imen Benali — auto-entrepreneur — SIRET 902 345 678 00018",
  },
};
const IMEN_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Imen", niche: "Femmes 25-45 ans qui veulent cuisiner halal pour leur famille",
    m2_pain: "Cuisiner toujours les mêmes plats ennuyeux et ne pas savoir reproduire les recettes complexes",
    m3_promesse: "Maîtrise 50 recettes maghrébines et levantines complexes et confectionne des menus complets sans recette",
    m3_mecanisme: "Cuisine Liberty™", m3_prix: "1 497€",
    m4_strategy: "ladder", m4_ht_target: 12,
    m5_point_b: "Maîtrise 50 recettes complexes + 12 menus sans recette", m5_days: 120,
    m6_paiements: { "1x": true, "3x": true, "6x": true, "12x": false },
    m6_pitch_frac: "Tu peux régler en 6 fois sans frais à 250€/mois, sans riba.",
  }),
  data: IMEN_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 9 · Younes · coaching sportif premium (refund 60j transformation) ─
const YOUNES_DATA: M7Data = {
  type_garantie: {
    type_choisi: "refund",
    justification: "Rachid a déjà essayé 5 régimes en 10 ans et reprend systématiquement le poids. L'objection psychologique principale c'est « encore une méthode qui ne marche pas ». Le refund 60j sur transformation mesurée (-12 kg, bilan sanguin) est l'argument qui démine cette objection en une phrase. Le HT direct premium à 3 497€ le justifie pleinement. La continuité serait perçue comme du « tu vas encore me faire payer » et le paiement résultats est inadapté en santé.",
  },
  promesse_garantie: {
    resultat: "Perdre au minimum 12 kg, descendre à un IMC ≤ 26, retrouver une énergie quotidienne stable, et obtenir un bilan sanguin validant la sortie des Statines (sortie de médication) à J+120, sans reprise sur les 30 jours suivants",
    duree_valeur: 120, duree_unite: "jours",
    critere_objectif: "Pesée filmée à J+0 et J+120, bilan sanguin daté envoyé par mail à coaching@younes.fr, validation lors d'un call de 45 minutes avec présentation des 3 documents (pesée, bilan, courbe IMC)",
  },
  conditions_client: {
    conditions_text: "Le client doit avoir terminé les 16 modules vidéo (preuve : progression Kajabi à 100%)\nLe client doit avoir participé à 14 calls individuels sur 16 prévus (preuve : enregistrement Zoom)\nLe client doit avoir réalisé 4 séances de sport par semaine pendant 16 semaines (preuve : capture Apple Watch ou Garmin hebdomadaire)\nLe client doit avoir tenu son carnet alimentaire quotidien pendant 16 semaines (preuve : Notion partagé)\nLe client doit avoir transmis ses 4 pesées intermédiaires (J+30, J+60, J+90, J+120) filmées avec balance datée (preuve : vidéos)",
  },
  math_garantie: { clients_initiaux: 10, delta_estime: 4, taux_refund_pct: 12, net_positif: 2.32 },
  expose_garantie: {
    pitch_text: "Je dis à Rachid : « Je sais que tu as essayé 5 régimes. C'est pour ça que je te garantis par contrat écrit : si à J+120 tu n'as pas perdu 12 kg minimum avec un IMC ≤ 26 et un bilan sanguin validant la sortie des Statines, je te rembourse les 3 497€ intégralement sous 30 jours. C'est mesurable, c'est dans le contrat que je te partage à l'écran maintenant et que tu reçois par mail. Le risque que ça rate encore, c'est moi qui le porte cette fois. »",
    formule_marketing: "Méthode Liberty Body — ou je te rembourse",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE LIBERTY BODY — édité par EI Younes Coaching Performance (SIREN 956 432 871).\n\n1. OBJET. La présente garantie engage EI Younes Coaching Performance à rembourser intégralement le montant payé par le client (3 497€ TTC) si, à J+120 jours après inscription, le client n'a pas perdu au minimum 12 kg, n'a pas atteint un IMC ≤ 26 et n'a pas obtenu un bilan sanguin validant la sortie des Statines, sans reprise sur les 30 jours suivants.\n\n2. CONDITIONS D'ACTIVATION. (a) 16 modules vidéo (Kajabi 100%), (b) 14 calls individuels sur 16 (Zoom), (c) 4 séances de sport/semaine pendant 16 semaines (Apple Watch/Garmin), (d) carnet alimentaire quotidien 16 semaines (Notion), (e) 4 pesées intermédiaires filmées (J+30/60/90/120).\n\n3. PROCÉDURE. Demande à coaching@younes.fr sous 21 jours après J+120 avec pesée finale filmée, bilan sanguin et preuves §2. Remboursement sous 30 jours bancaires.\n\n4. EXCLUSIONS. Non-respect d'une condition = refus. Garantie ne couvre pas les contre-indications médicales déclarées en cours ni les arrêts volontaires non motivés.\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal judiciaire de Nice.",
    vendeur_statut: "EI Younes Coaching Performance — SIREN 956 432 871",
  },
};
const YOUNES_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Younes", niche: "Hommes 30-50 ans cadres en surcharge pondérale 15-25kg",
    m2_pain: "Avoir essayé 5 régimes en 10 ans, reprendre systématiquement le poids et perdre confiance",
    m3_promesse: "Cadre à 78 kg, IMC 25, sans médication, énergie quotidienne stable validée par bilan sanguin",
    m3_mecanisme: "Méthode Liberty Body™", m3_prix: "3 497€",
    m4_strategy: "ht_direct", m4_ht_target: 5,
    m5_point_b: "-12 kg + IMC ≤ 25 + sortie Statines validée", m5_days: 120,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Tu peux régler en 3 fois sans frais à 1 165€/mois, sans riba.",
  }),
  data: YOUNES_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 10 · Lina · coaching reconversion professionnelle (continuité) ──
const LINA_DATA: M7Data = {
  type_garantie: {
    type_choisi: "continuite",
    justification: "Khalil est en burn-out depuis 6 ans, terrifié par le vide financier d'une reconversion. Le refund n'a pas de sens : si à J+180 il n'a pas trouvé, l'argent ne le remettra pas en marche, il restera bloqué. La continuité gratuite jusqu'au premier emploi/freelance lui dit explicitement : « je ne te lâche pas tant que tu n'as pas atterri ». C'est exactement la sécurité qu'il cherche. Cohérent avec échelle de valeur où le HT est l'aboutissement.",
  },
  promesse_garantie: {
    resultat: "Lancer son activité freelance (avec premier contrat signé minimum 1 500€ HT) ou prendre un nouveau poste salarié à revenu mensuel ≥ 3 500€ net dans le secteur de reconversion visé à J+180",
    duree_valeur: 180, duree_unite: "jours",
    critere_objectif: "Capture du premier contrat freelance signé OU du contrat de travail signé avec mention salaire, envoyée par mail à coaching@lina.fr, validation lors d'un call final de 60 minutes à J+180 avec présentation du document",
  },
  conditions_client: {
    conditions_text: "Le client doit avoir terminé les 18 modules vidéo (preuve : progression Kajabi à 100%)\nLe client doit avoir participé à 16 calls individuels sur 24 prévus (preuve : enregistrement Zoom)\nLe client doit avoir effectué au minimum 60 candidatures ou prospections freelance en 6 mois (preuve : journal de candidatures hebdomadaire envoyé)\nLe client doit avoir réalisé 8 interviews terrain de professionnels du secteur visé (preuve : enregistrements et synthèses)\nLe client doit avoir partagé son carnet de bord hebdomadaire pendant 24 semaines (preuve : Notion partagé)",
  },
  math_garantie: { clients_initiaux: 16, delta_estime: 6, taux_refund_pct: 9, net_positif: 4.02 },
  expose_garantie: {
    pitch_text: "Je dis à Khalil : « 2 497€ pour 6 mois d'accompagnement reconversion. Et si à J+180 tu n'as pas lancé ton activité freelance avec un premier contrat à 1 500€ minimum OU pris un nouveau poste à 3 500€ net dans le secteur visé, ce n'est PAS toi qui repaies — c'est moi qui continue à t'accompagner gratuitement jusqu'à ce que tu atterrisses. C'est écrit dans le contrat que je te partage à l'écran maintenant et que tu reçois par mail à l'inscription. Le risque que tu restes coincé, c'est moi qui le prends. »",
    formule_marketing: "Méthode Liberty Reconversion — ou nous vous accompagnons jusqu'à atterrissage",
  },
  termes_conditions: {
    tnc_text: "TERMES ET CONDITIONS DE LA GARANTIE LIBERTY RECONVERSION — édité par EI Lina Hadj Coaching (SIREN 967 845 213).\n\n1. OBJET. Le présent contrat engage EI Lina Hadj Coaching à prolonger l'accompagnement du client sans frais supplémentaires si, à J+180 jours après inscription, le client n'a pas lancé son activité freelance avec un premier contrat signé d'au minimum 1 500€ HT OU n'a pas pris un nouveau poste salarié à revenu mensuel ≥ 3 500€ net dans le secteur de reconversion visé.\n\n2. CONDITIONS D'ACTIVATION. (a) 18 modules vidéo (Kajabi 100%), (b) 16 calls individuels sur 24 (Zoom), (c) 60 candidatures/prospections en 6 mois (journal hebdomadaire), (d) 8 interviews terrain (enregistrements + synthèses), (e) carnet de bord hebdomadaire 24 semaines (Notion).\n\n3. PROCÉDURE. Notification à coaching@lina.fr sous 21 jours après J+180 avec preuves §2. Accompagnement prolongé par tranches de 30 jours renouvelables jusqu'à atteinte du résultat.\n\n4. EXCLUSIONS. Non-respect d'une condition = refus. Aucun remboursement monétaire.\n\n5. DROIT APPLICABLE. Droit français. Médiation. Juridiction : tribunal judiciaire de Strasbourg.",
    vendeur_statut: "EI Lina Hadj Coaching — SIREN 967 845 213",
  },
};
const LINA_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Lina", niche: "Salariés 35-50 ans en burn-out ou désengagement profond",
    m2_pain: "Détester son job depuis 6 ans sans oser sauter par peur du vide financier et professionnel",
    m3_promesse: "Lancé en freelance ou nouveau poste aligné avec un revenu mensuel ≥ 3 500€ net dans le secteur visé",
    m3_mecanisme: "Méthode Liberty Reconversion™", m3_prix: "2 497€",
    m4_strategy: "ladder", m4_ht_target: 8,
    m5_point_b: "1er contrat freelance 1 500€ HT OU poste à 3 500€ net", m5_days: 180,
    m6_paiements: { "1x": true, "3x": true, "6x": true, "12x": false },
    m6_pitch_frac: "Tu peux régler en 6 fois sans frais à 416€/mois, sans riba.",
  }),
  data: LINA_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ════════════════════════════════════════════════════════════════════════
// LISTE FINALE 10/10 — parité ISO Sidali v1.0.0
// ════════════════════════════════════════════════════════════════════════
export const M7_DEMO_CASES: M7DemoCase[] = [
  // ARGENT (5)
  { key: "karim", segment: "argent", emoji: "💼", title: "Karim · Coaching business franco-arabe",
    summary: "Type REFUND 60j · +30% conv en call · 4 997€ ht_direct (scores 84-92)", ready: true, patch: KARIM_PATCH },
  { key: "aicha_tarek", segment: "argent", emoji: "👫", title: "Aïcha & Tarek · Couple coach finance halal",
    summary: "Type PAIEMENT RÉSULTATS 50/50 · 4 500€ ht_direct (scores 84-92)", ready: true, patch: AICHA_TAREK_PATCH },
  { key: "najet", segment: "argent", emoji: "🛒", title: "Najet · Consulting e-commerce Shopify",
    summary: "Type REFUND 90j sur palier CA 30k€/mois · 6 997€ ht_direct (scores 84-92)", ready: true, patch: NAJET_PATCH },
  { key: "mehdi", segment: "argent", emoji: "🎯", title: "Mehdi · Closer/setter musulman",
    summary: "Type PAIEMENT RÉSULTATS après 1er deal closé · 2 497€ ht_direct (scores 84-92)", ready: true, patch: MEHDI_PATCH },
  { key: "mounia_anas", segment: "argent", emoji: "🏢", title: "Mounia & Anas · Agence SaaS B2B",
    summary: "Type REFUND 30j sur livrable précis (audit churn) · 12 000€ ht_direct (scores 84-92)", ready: true, patch: MOUNIA_ANAS_PATCH },

  // RELATIONS (2)
  { key: "khadija", segment: "relations", emoji: "💍", title: "Khadija · Coaching mariage musulman",
    summary: "Type REFUND 30j conditionné assiduité · 2 997€ ht_direct (scores 84-92)", ready: true, patch: KHADIJA_PATCH },
  { key: "salima", segment: "relations", emoji: "👨‍👩‍👧", title: "Salima · Coaching parental musulman",
    summary: "Type CONTINUITÉ jusqu'à objectif comportemental · 1 997€ ladder (scores 84-92)", ready: true, patch: SALIMA_PATCH },

  // SANTÉ / LIFESTYLE (3)
  { key: "imen", segment: "sante", emoji: "🍽️", title: "Imen · Formation cuisine halal en ligne",
    summary: "Type CONTINUITÉ jusqu'à maîtrise 50 recettes · 1 497€ ladder (scores 84-92)", ready: true, patch: IMEN_PATCH },
  { key: "younes", segment: "sante", emoji: "💪", title: "Younes · Coaching sportif premium",
    summary: "Type REFUND 60j sur transformation mesurée (-12kg + IMC + Statines) · 3 497€ ht_direct (scores 84-92)", ready: true, patch: YOUNES_PATCH },
  { key: "lina", segment: "sante", emoji: "🚀", title: "Lina · Coaching reconversion professionnelle",
    summary: "Type CONTINUITÉ jusqu'au 1er emploi/freelance · 2 497€ ladder (scores 84-92)", ready: true, patch: LINA_PATCH },
];
