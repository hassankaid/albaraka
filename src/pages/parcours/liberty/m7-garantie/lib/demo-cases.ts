/**
 * Mode démo M7 — 10 cas calibrés (validés au premier essai, seuil 80).
 * Couvre les 3 types de garantie : refund · continuité · paiement_resultats.
 *
 * 3 démos initiales transcrites (Karim refund / Khadija continuité / Mounia paiement_resultats)
 * pour smoke test des 3 types. 7 autres en placeholder pour transcription par lots ultérieurs.
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

// ── 1 · Karim · Refund 60j (Affiliation halal) ───────────────────────
const KARIM_DATA: M7Data = {
  type_garantie: {
    type_choisi: "refund",
    justification: "Mon avatar Yacine est un coach franco-arabe à 4 200€ de CA mensuel qui stagne depuis 2 ans. L'objection numéro 1 en call c'est « j'ai déjà essayé d'autres formations qui n'ont pas marché ». Une garantie refund 60j supprime cette objection directement et booste mon taux de transformation en call de 30%. En HT direct premium à 4 997€, le refund est le levier de conversion le plus brut.",
  },
  promesse_garantie: {
    resultat: "Encaisser ta première commission affiliation halal de 300€+ validée et trackée via Stripe sur les 60 premiers jours du programme",
    duree_valeur: 60,
    duree_unite: "jours",
    critere_objectif: "Capture Stripe + relevé bancaire envoyés à audit@al-baraka.com, montrant la 1ère commission validée et encaissée entre J+0 et J+60",
  },
  conditions_client: {
    conditions_text: "• Avoir suivi 100% des 12 modules du programme (preuve : progression 100% loggée dans la plateforme)\n• Avoir envoyé minimum 100 DM prospects en utilisant les scripts fournis (preuve : capture Notion CRM)\n• Avoir participé à au moins 6 calls de groupe sur les 8 (preuve : présence loggée)\n• Faire la demande de remboursement entre J60 et J90 (pas avant, pas après)\n• Fournir 3 captures d'écran des conversations DM commencées (preuve qualitative)",
  },
  math_garantie: {
    clients_initiaux: 12,
    delta_estime: 6,
    taux_refund_pct: 10,
    net_positif: 4.2,
  },
  expose_garantie: {
    pitch_text: "Le programme AFFILIÉ AL BARAKA est garanti par contrat : si tu n'as pas encaissé ta première commission de 300€+ sur les 60 premiers jours en suivant la méthode, je te rembourse 100%. Le critère c'est ta capture Stripe — pas besoin de débattre. Les conditions sont dans les T&C que je te partage à l'écran maintenant. Le contrat est signé électroniquement à la souscription.",
    formule_marketing: "AFFILIÉ AL BARAKA ou vous ne nous payez pas",
  },
  termes_conditions: {
    tnc_text: "CONDITIONS D'ACTIVATION REMBOURSEMENT — Le client peut demander le remboursement entre J60 et J90 après inscription, à condition d'avoir : (1) terminé 100% des modules de la plateforme, (2) envoyé minimum 100 DM prospects avec les scripts fournis, (3) participé à au moins 6 calls de groupe.\n\nDÉLAI DE REMBOURSEMENT : Sous 14 jours ouvrés après acceptation du dossier.\n\nPREUVES À FOURNIR : Capture Stripe + capture Notion CRM + capture présence calls.\n\nJURIDICTION : Tribunal de Commerce de Paris. Droit applicable : droit français.\n\nNON-APPLICABLE : Remboursement refusé si conditions non remplies ou demande hors fenêtre J60-J90.",
    vendeur_statut: "SASU ETHICARENA · SIRET 123 456 789 00012 · 75 rue de la Paix, 75002 Paris · capital 5 000€",
  },
};
const KARIM_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Karim", niche: "Salariés musulmans 25-40 ans qui veulent générer 1 500-5 000€/mois en affiliation halal",
    m2_pain: "Frustration de bosser 35h/semaine pour un salaire qui ne lui permet ni d'épargner ni d'aider sa mère",
    m3_promesse: "Faire 1 000€ de commission sur ton premier cycle de 60 jours en affiliation halal, sans toucher au riba",
    m3_mecanisme: "Méthode Tawakkul Affiliate™", m3_prix: "2 997€",
    m4_strategy: "ht_lt", m4_ht_target: 8,
    m5_point_b: "1 000€ de commission halal validée sur les 60 premiers jours", m5_days: 60,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Tu peux régler en 3 fois sans frais à 999€/mois, sans riba.",
  }),
  data: KARIM_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 5 · Khadija · Continuité (Mariage halal) ─────────────────────────
const KHADIJA_DATA: M7Data = {
  type_garantie: {
    type_choisi: "continuite",
    justification: "Le mariage halal est un processus humain qui ne peut PAS être 100% sous contrôle (rencontres, timing, alignement spirituel). Refund serait malhonnête car les sœurs qui suivent le programme ont quand même reçu une transformation intérieure. Continuité est cohérente : si tu n'as pas rencontré ton époux en 12 mois, je continue à t'accompagner gratuitement jusqu'à 18 mois. C'est respectueux du processus tout en garantissant l'engagement.",
  },
  promesse_garantie: {
    resultat: "Démarrer au moins 3 démarches matrimoniales sérieuses (familles, associations, applis halal) + 1 rencontre concrète documentée dans les 6 premiers mois",
    duree_valeur: 6, duree_unite: "mois",
    critere_objectif: "Journal de bord rempli (envoyé à l'accompagnatrice) listant : nom des structures contactées + dates + retours obtenus + 1 récit de rencontre concret avec date",
  },
  conditions_client: {
    conditions_text: "• Avoir suivi les 12 modules audio (preuve : tracker plateforme)\n• Avoir rempli le journal de bord hebdomadaire pendant les 6 premiers mois (preuve : envoi mensuel)\n• Avoir participé à 4 calls de groupe minimum sur les 6 mois\n• Avoir effectivement contacté 3 structures matrimoniales musulmanes (preuve : captures emails)\n• Faire la demande de continuation entre M6 et M7",
  },
  math_garantie: {
    clients_initiaux: 8,
    delta_estime: 5,
    taux_refund_pct: 15,
    net_positif: 3.05,
  },
  expose_garantie: {
    pitch_text: "Le programme « Le chemin Khadija » est garanti continuité : si au bout des 6 premiers mois tu n'as pas démarré 3 démarches sérieuses et 1 rencontre concrète, je continue à t'accompagner gratuitement pendant 6 mois supplémentaires, jusqu'à 1 an. Les conditions sont dans les T&C — tu peux les relire. Je veux que tu sois en confiance, mais je veux aussi que tu fasses ta part.",
    formule_marketing: "Le chemin Khadija — ou nous vous accompagnons jusqu'à la rencontre",
  },
  termes_conditions: {
    tnc_text: "CONDITIONS D'ACTIVATION CONTINUITÉ — La cliente peut demander la continuation gratuite entre M6 et M7 si elle a : (1) suivi 100% des modules audio, (2) rempli son journal de bord hebdomadaire pendant 6 mois consécutifs, (3) participé à au moins 4 calls de groupe, (4) effectivement contacté 3 structures matrimoniales musulmanes (preuves emails à fournir).\n\nDURÉE DE CONTINUATION : 6 mois supplémentaires gratuits (total 12 mois d'accompagnement).\n\nMODALITÉS : Mêmes calls de groupe + journal de bord + accès communauté privée.\n\nJURIDICTION : Tribunal de Commerce de Marseille. Droit applicable : droit français.\n\nNON-APPLICABLE : Pas de remboursement cash (uniquement continuité service). Demande refusée si conditions non remplies.",
    vendeur_statut: "Khadija Bouali — EI · SIRET 987 654 321 00010 · 12 boulevard National, 13003 Marseille",
  },
};
const KHADIJA_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Khadija", niche: "Femmes musulmanes 22-30 ans qui veulent se marier dans l'année avec un homme aligné spirituellement",
    m2_pain: "Peur de mal choisir et de subir un mariage qui finit en divorce ou en silence prolongé",
    m3_promesse: "Trouver et te marier avec un homme aligné spirituellement en 12 mois",
    m3_mecanisme: "Le chemin Khadija™", m3_prix: "1 497€",
    m4_strategy: "ht_only", m4_ht_target: 5,
    m5_point_b: "3 démarches matrimoniales actives + 1 rencontre concrète à M6", m5_days: 180,
    m6_paiements: { "1x": true, "3x": true, "6x": false, "12x": false },
    m6_pitch_frac: "Tu peux régler en 3 fois sans frais à 499€/mois, sans riba.",
  }),
  data: KHADIJA_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 4 · Mounia & Anas · Paiement aux résultats (Immo halal) ─────────
const MOUNIA_DATA: M7Data = {
  type_garantie: {
    type_choisi: "paiement_resultats",
    justification: "Sur un programme immobilier halal à 4 997€, le couple investit déjà 250 000€+ dans le bien. Le paiement aux résultats (50% à la signature, 50% à l'acte notarié) est le plus cohérent : ils ne paient le solde que si on les a effectivement accompagnés jusqu'à l'acquisition réelle. Cohérent avec le rythme long (12-18 mois) et notre track record de 12 acquisitions validées.",
  },
  promesse_garantie: {
    resultat: "Acquérir un bien locatif halal via mourabaha avec acte notarié signé et bail signé dans les 12-18 mois (cash flow positif documenté à partir du 1er loyer encaissé)",
    duree_valeur: 18, duree_unite: "mois",
    critere_objectif: "Copie de l'acte notarié + 1er bail signé + capture du 1er loyer encaissé sur compte bancaire (envoyés à patrimoine@al-baraka.com)",
  },
  conditions_client: {
    conditions_text: "• Avoir suivi les 12 modules de la Méthode Mourabaha (preuve : plateforme 100%)\n• Avoir participé à minimum 4 des 6 calls de groupe couples\n• Avoir présenté minimum 3 dossiers de bien à l'équipe pour audit (preuve : tickets Slack)\n• Avoir signé un mandat de recherche avec un notaire partenaire (preuve : copie mandat)\n• Tenir une trésorerie de 10% du bien visé pour notaire/frais (preuve : extrait bancaire)",
  },
  math_garantie: {
    clients_initiaux: 4,
    delta_estime: 3,
    taux_refund_pct: 8,
    net_positif: 2.44,
  },
  expose_garantie: {
    pitch_text: "Le programme est en paiement aux résultats : tu règles 2 497€ à la signature (couvre la formation + le réseau partenaires), puis le solde de 2 500€ uniquement après l'acte notarié signé sur ton bien. Ça veut dire que je ne suis pas payé tant que tu n'es pas propriétaire halal. Les conditions et le contrat sont dans les T&C que tu peux consulter maintenant.",
    formule_marketing: "Mourabaha Property Path — payé au résultat (acte notarié)",
  },
  termes_conditions: {
    tnc_text: "MODALITÉS DE PAIEMENT — 50% (2 497€) à la signature : couvre formation + accès au réseau bancaire halal + accompagnement notaire (audits de dossiers). 50% (2 500€) à l'acte notarié signé sur le bien acquis.\n\nFENÊTRE DE PAIEMENT FINAL : Sous 30 jours après l'acte notarié.\n\nNON-PAIEMENT DU SOLDE : Si aucun acte notarié n'est signé dans les 18 mois, le solde n'est PAS dû. Les 2 497€ restent acquis (correspondent au temps déjà investi par l'équipe).\n\nCONDITIONS D'ACTIVATION : Avoir suivi 100% des modules + présenté 3 dossiers + signé un mandat notaire partenaire + tenu une trésorerie 10% du bien.\n\nJURIDICTION : Tribunal de Commerce de Rennes. Droit applicable : droit français.\n\nNON-APPLICABLE : Solde dû dans tous les cas si le couple acquiert via un canal différent du réseau accompagné.",
    vendeur_statut: "Mounia & Anas Patrimoine SARL · SIRET 555 444 333 00022 · 8 rue Mourabaha, 35000 Rennes · capital 10 000€",
  },
};
const MOUNIA_PATCH: Partial<M7State> = {
  ...buildBase({
    avatar: "Mounia & Anas", niche: "Couples musulmans 28-40 ans qui veulent acquérir leur 1er bien locatif sans riba en 12 mois",
    m2_pain: "Voir leurs économies dormir sur Livret A pendant que l'inflation les ronge",
    m3_promesse: "Acquérir ton 1er bien locatif halal en 12 mois sans contracter le moindre prêt à intérêt",
    m3_mecanisme: "Mourabaha Property Path", m3_prix: "4 997€",
    m4_strategy: "ht_lt", m4_ht_target: 4,
    m5_point_b: "Acte notarié signé + bail + cash flow positif 600€/mois", m5_days: 365,
    m6_paiements: { "1x": true, "3x": true, "6x": true, "12x": true },
    m6_pitch_frac: "Tu peux régler en 12 fois sans frais à 416€/mois, sans riba.",
  }),
  data: MOUNIA_DATA, scores: FULL_SCORES, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── Liste finale 10 cas (3 actives · 3 types couverts) ───────────────
export const M7_DEMO_CASES: M7DemoCase[] = [
  // ARGENT
  { key: "karim", segment: "argent", emoji: "💼", title: "Karim · Refund 60j (Affiliation halal)",
    summary: "Type REFUND · objection « j'ai déjà essayé » supprimée · 2 997€ ht_lt (scores 84-92)", ready: true, patch: KARIM_PATCH },
  { key: "younes", segment: "argent", emoji: "🎯", title: "Younes · Setting/Closing (à transcrire)",
    summary: "Type refund · 1 997€ ht_lt placement coach", ready: false },
  { key: "imen", segment: "argent", emoji: "📱", title: "Imen · SMMA modest fashion (à transcrire)",
    summary: "Type refund · 1 997€ ht_lt étudiantes", ready: false },
  { key: "mounia", segment: "argent", emoji: "🏠", title: "Mounia & Anas · Paiement résultats (Immo halal)",
    summary: "Type PAIEMENT AUX RÉSULTATS · 50%+50% à l'acte notarié · 4 997€ ht_lt (scores 84-92)", ready: true, patch: MOUNIA_PATCH },

  // RELATIONS
  { key: "khadija", segment: "relations", emoji: "💍", title: "Khadija · Continuité (Mariage halal)",
    summary: "Type CONTINUITÉ · 6 mois gratuits supplémentaires si pas de rencontre · 1 497€ ht_only (scores 84-92)", ready: true, patch: KHADIJA_PATCH },
  { key: "aicha", segment: "relations", emoji: "👶", title: "Aïcha & Tarek · Couple post-bébé (à transcrire)",
    summary: "Type refund · 997€ ht_only", ready: false },
  { key: "najet", segment: "relations", emoji: "🧸", title: "Najet · Éducation positive (à transcrire)",
    summary: "Type refund · 697€ ht_lt", ready: false },

  // SANTÉ
  { key: "salima", segment: "sante", emoji: "🌿", title: "Salima · Perte de poids (à transcrire)",
    summary: "Type continuité · 1 297€ ht_lt", ready: false },
  { key: "mehdi", segment: "sante", emoji: "💪", title: "Mehdi · Reprise sport 30+ (à transcrire)",
    summary: "Type refund · 897€ ht_only", ready: false },
  { key: "lina", segment: "sante", emoji: "🌀", title: "Lina · Anxiété étudiantes (à transcrire)",
    summary: "Type continuité · 897€ ht_lt", ready: false },
];
