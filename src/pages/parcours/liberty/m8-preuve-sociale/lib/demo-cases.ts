/**
 * 10 démos M8 — casting standard Sidali (parité ISO v1.3.1).
 * Aucune ne demande de force (M8 n'a pas de scoring). Chaque démo prérègle le
 * brief client + les imports amont pour démontrer la génération des 3 messages.
 */
import { defaultBrief, type M8State, type BriefClient } from "./types";

export interface M8DemoCase {
  key: string;
  name: string;
  tag: string;
  segment: "argent" | "relations" | "sante";
  patch: Partial<M8State>;
}

function mk(
  key: string, name: string, tag: string, segment: M8DemoCase["segment"],
  brief: BriefClient,
  imports: { m1?: any; m2?: any; m3?: any; m5?: any; m6?: any; m7?: any },
): M8DemoCase {
  return {
    key, name, tag, segment,
    patch: {
      current: "brief_client",
      data: { brief_client: { ...defaultBrief(), ...brief }, generation_count: 0 },
      m1_data: imports.m1 ?? null,
      m2_data: imports.m2 ?? null,
      m3_data: imports.m3 ?? null,
      m5_data: imports.m5 ?? null,
      m6_data: imports.m6 ?? null,
      m7_data: imports.m7 ?? null,
      _activeDemo: key,
    },
  };
}

export const M8_DEMO_CASES: M8DemoCase[] = [
  mk("karim", "Karim — coaching business franco-arabe HT", "Client Yacine · 12k€ MRR en 90j · Salam · plusieurs", "argent",
    { prenom_client: "Yacine", nom_offre: "Méthode Liberty Business", ton_salutation: "salam_alaykoum", posture: "plusieurs", contexte: "lifestyle", douleur_passe_hint: "Plafonner à 1-3k€ MRR malgré 2-3 ans d'activité" },
    { m1: { niche: "Entrepreneurs musulmans franco-arabes 25-40 ans (0-3k€ → 10-30k€ MRR sans riba)", avatar_nom: "Karim" }, m2: { dominant_pain: "Plafonner à 1-3k€ MRR malgré 2-3 ans d'activité" }, m3: { hero_mecanisme_nom: "Méthode Liberty Business", headline_promesse: "10k€ MRR halal en 90 jours" }, m5: { ht_point_b: "12 000 € MRR récurrents en ayant signé 3 clients premium", ht_timeframe_days: 90 }, m6: { or: { nom: "Méthode Liberty Business" }, prix_ht: 4500 }, m7: { vendeur_statut: "SASU Karim Coaching, SIREN 921 456 789, RCS Paris", formule_marketing: "Méthode Liberty Business — ou vous ne nous payez pas", promesse_resultat: "12 000 € MRR récurrents à J+90", promesse_duree_jours: 90 } }),
  mk("imen", "Imen — formation cuisine halal en ligne", "Cliente Fatima · 50 recettes à J+120 · Salam · seul", "relations",
    { prenom_client: "Fatima", nom_offre: "Cuisine Liberty Premium", ton_salutation: "salam_alaykoum", posture: "seul", contexte: "lifestyle", douleur_passe_hint: "Cuisiner toujours les mêmes plats ennuyeux et ne pas savoir reproduire les recettes complexes" },
    { m1: { niche: "Femmes 25-45 ans qui veulent cuisiner halal pour leur famille", avatar_nom: "Salima" }, m2: { dominant_pain: "Cuisiner toujours les mêmes plats ennuyeux" }, m3: { hero_mecanisme_nom: "Cuisine Liberty", headline_promesse: "50 recettes maîtrisées en 4 mois" }, m5: { ht_point_b: "Maîtrise 50 recettes maghrébines et levantines complexes", ht_timeframe_days: 120 }, m6: { or: { nom: "Cuisine Liberty Premium" }, prix_ht: 1497 }, m7: { vendeur_statut: "Auto-entrepreneur — Imen Benali, SIRET 902 345 678 00018", formule_marketing: "Cuisine Liberty — ou nous vous accompagnons jusqu'à maîtrise", promesse_resultat: "Maîtriser 50 recettes à J+120", promesse_duree_jours: 120 } }),
  mk("khadija", "Khadija — coaching mariage musulman", "Cliente Sarah · projet mariage à J+180 · Salam · seul", "relations",
    { prenom_client: "Sarah", nom_offre: "Méthode Liberty Mariage", ton_salutation: "salam_alaykoum", posture: "seul", contexte: "intime", douleur_passe_hint: "Multiplier les rencontres décevantes sur les apps sans trouver un homme religieusement engagé" },
    { m1: { niche: "Femmes musulmanes 25-38 ans cherchant à se marier religieusement", avatar_nom: "Sarah" }, m2: { dominant_pain: "Multiplier les rencontres décevantes sur les apps" }, m3: { hero_mecanisme_nom: "Méthode Liberty Mariage", headline_promesse: "Mariage avec un homme religieusement engagé en 6 mois" }, m5: { ht_point_b: "Relation sérieuse engagée vers un mariage religieux validé", ht_timeframe_days: 180 }, m6: { or: { nom: "Méthode Liberty Mariage" }, prix_ht: 2997 }, m7: { vendeur_statut: "Khadija Coaching — micro-entreprise, SIRET 853 121 234 00012", formule_marketing: "Méthode Liberty Mariage — ou vous ne nous payez pas", promesse_resultat: "Relation sérieuse menant à un projet de mariage à J+180", promesse_duree_jours: 180 } }),
  mk("aicha_tarek", "Aïcha & Tarek — couple coach finance halal", "Couple Hamza & Lina · 15k€ épargne à J+180 · Salam · plusieurs", "argent",
    { prenom_client: "Hamza", nom_offre: "Méthode Liberty Halal Wealth", ton_salutation: "salam_alaykoum", posture: "plusieurs", contexte: "lifestyle", douleur_passe_hint: "Vivre dans l'angoisse financière chaque fin de mois sans jamais épargner halal" },
    { m1: { niche: "Couples musulmans 28-45 ans qui veulent gérer leurs finances sans riba", avatar_nom: "Couple Karim & Leila" }, m2: { dominant_pain: "Vivre dans l'angoisse financière chaque fin de mois" }, m3: { hero_mecanisme_nom: "Méthode Liberty Halal Wealth", headline_promesse: "15k€ d'épargne halal + 0 dette en 6 mois" }, m5: { ht_point_b: "15 000 € d'épargne halal placée + 0 dette consommation à J+180", ht_timeframe_days: 180 }, m6: { or: { nom: "Méthode Liberty Halal Wealth" }, prix_ht: 4500 }, m7: { vendeur_statut: "SARL Aïcha & Tarek Conseil, SIREN 911 234 567, RCS Lyon", formule_marketing: "Méthode Liberty Halal Wealth — payé au résultat", promesse_resultat: "15 000 € d'épargne halal + 0 dette à J+180", promesse_duree_jours: 180 } }),
  mk("najet", "Najet — consulting e-commerce", "Client Mehdi · Shopify 32k€/mois à J+90 · Salam · plusieurs", "argent",
    { prenom_client: "Mehdi", nom_offre: "Méthode Scale Liberty", ton_salutation: "salam_alaykoum", posture: "plusieurs", contexte: "lifestyle", douleur_passe_hint: "Plafonner à 8-12k de CA mensuel malgré 200 commandes/mois sans savoir scaler" },
    { m1: { niche: "E-commerçants 30-50 ans · boutique Shopify 5-20k CA mensuel", avatar_nom: "Younes" }, m2: { dominant_pain: "Plafonner à 8-12k de CA mensuel" }, m3: { hero_mecanisme_nom: "Méthode Scale Liberty", headline_promesse: "30k€/mois sur Shopify en 90 jours" }, m5: { ht_point_b: "Boutique Shopify à 30 000 € de CA mensuel avec ROAS > 3", ht_timeframe_days: 90 }, m6: { or: { nom: "Méthode Scale Liberty" }, prix_ht: 6997 }, m7: { vendeur_statut: "SASU Najet Consulting, SIREN 932 567 890, RCS Bordeaux", formule_marketing: "Méthode Scale Liberty — ou vous ne nous payez pas", promesse_resultat: "30 000 € de CA mensuel avec ROAS > 3 à J+90", promesse_duree_jours: 90 } }),
  mk("salima", "Salima — coaching parental musulman", "Cliente Amina · cris < 1/sem à J+120 · Salam · seul", "relations",
    { prenom_client: "Amina", nom_offre: "Méthode Liberty Parental", ton_salutation: "salam_alaykoum", posture: "seul", contexte: "intime", douleur_passe_hint: "Crier sur ses enfants tous les jours et culpabiliser le soir sans savoir changer ce schéma" },
    { m1: { niche: "Mères musulmanes 28-42 ans qui veulent éduquer sans crier", avatar_nom: "Amina" }, m2: { dominant_pain: "Crier sur ses enfants tous les jours et culpabiliser le soir" }, m3: { hero_mecanisme_nom: "Méthode Liberty Parental", headline_promesse: "Éduquer sans crier en 4 mois" }, m5: { ht_point_b: "Réduire les épisodes de cris à moins d'1 par semaine sur 30 jours", ht_timeframe_days: 120 }, m6: { or: { nom: "Méthode Liberty Parental" }, prix_ht: 1997 }, m7: { vendeur_statut: "Auto-entrepreneur — Salima Khelifi, SIRET 891 234 567 00029", formule_marketing: "Méthode Liberty Parental — ou je t'accompagne jusqu'à résultat", promesse_resultat: "Moins d'1 épisode de cris par semaine à J+120", promesse_duree_jours: 120 } }),
  mk("mehdi", "Mehdi — formation closer/setter musulman", "Élève Ilyas · contrat closer 10% à J+90 · Salam · seul", "argent",
    { prenom_client: "Ilyas", nom_offre: "Méthode Liberty Closer", ton_salutation: "salam_alaykoum", posture: "seul", contexte: "lifestyle", douleur_passe_hint: "Vouloir un revenu remote 4-8k€/mois sans diplôme et sans savoir par où commencer" },
    { m1: { niche: "Hommes musulmans 22-35 ans · devenir closer/setter remote halal", avatar_nom: "Ilyas" }, m2: { dominant_pain: "Vouloir un revenu remote 4-8k€/mois sans diplôme" }, m3: { hero_mecanisme_nom: "Méthode Liberty Closer", headline_promesse: "Premier contrat closer en 90 jours" }, m5: { ht_point_b: "Premier contrat closer signé à 8-10% sur tickets ≥ 3 000 €", ht_timeframe_days: 90 }, m6: { or: { nom: "Méthode Liberty Closer" }, prix_ht: 2497 }, m7: { vendeur_statut: "EI Mehdi Formation, SIREN 974 567 123", formule_marketing: "Méthode Liberty Closer — payé au résultat", promesse_resultat: "Premier contrat closer à 8% min sur tickets ≥ 3 000 € à J+90", promesse_duree_jours: 90 } }),
  mk("mounia_anas", "Mounia & Anas — agence SaaS B2B", "Client Khaled (CEO SaaS) · audit churn livré · Bonjour · plusieurs", "argent",
    { prenom_client: "Khaled", nom_offre: "Audit Liberty Churn", ton_salutation: "bonjour", posture: "plusieurs", contexte: "b2b_premium", douleur_passe_hint: "Voir le churn dépasser 4%/mois sans comprendre ses leviers et craindre que la Series B soit refusée" },
    { m1: { niche: "CEO/COO de SaaS B2B post-Series A (5-30 M€ ARR) · churn > 4%/mois", avatar_nom: "Khaled" }, m2: { dominant_pain: "Voir le churn dépasser 4%/mois sans comprendre ses leviers" }, m3: { hero_mecanisme_nom: "Audit Liberty Churn", headline_promesse: "Audit churn complet + plan 15 leviers ROI > 3x en 30 jours" }, m5: { ht_point_b: "Rapport d'audit 40+ pages, plan 15 leviers ROI > 3x, dashboard Looker", ht_timeframe_days: 30 }, m6: { or: { nom: "Audit Liberty Churn" }, prix_ht: 12000 }, m7: { vendeur_statut: "SARL Mounia & Anas Consulting, SIREN 985 678 912, RCS Paris", formule_marketing: "Audit Liberty Churn — ou nous ne facturons pas", promesse_resultat: "Rapport audit 40+ pages + plan 15 leviers + dashboard à J+30", promesse_duree_jours: 30 } }),
  mk("younes", "Younes — coaching sportif premium", "Client Bilal · -14kg + sortie statines à J+120 · Salam · seul", "sante",
    { prenom_client: "Bilal", nom_offre: "Méthode Liberty Body", ton_salutation: "salam_alaykoum", posture: "seul", contexte: "intime", douleur_passe_hint: "Être sous statines à 45 ans en surpoids de 18kg et redouter un infarctus précoce" },
    { m1: { niche: "Hommes 35-55 ans en surpoids ≥ 15 kg sous statines voulant une santé métabolique", avatar_nom: "Bilal" }, m2: { dominant_pain: "Être sous statines à 45 ans en surpoids de 18kg" }, m3: { hero_mecanisme_nom: "Méthode Liberty Body", headline_promesse: "-12kg + IMC ≤ 26 + sortie des statines en 4 mois" }, m5: { ht_point_b: "-12 kg, IMC ≤ 26, bilan validant la sortie des statines sur 30 jours", ht_timeframe_days: 120 }, m6: { or: { nom: "Méthode Liberty Body" }, prix_ht: 3497 }, m7: { vendeur_statut: "EI Younes Coaching Performance, SIREN 956 432 871", formule_marketing: "Méthode Liberty Body — ou je te rembourse intégralement", promesse_resultat: "-12kg min + IMC ≤ 26 + sortie des statines à J+120", promesse_duree_jours: 120 } }),
  mk("lina", "Lina — coaching reconversion professionnelle", "Cliente Yasmina · freelance UX 2.8k€ HT à J+180 · Bonjour · seul", "relations",
    { prenom_client: "Yasmina", nom_offre: "Méthode Liberty Reconversion", ton_salutation: "bonjour", posture: "seul", contexte: "lifestyle", douleur_passe_hint: "Être en burn-out depuis 2 ans dans un job alimentaire sans savoir vers quoi se reconvertir" },
    { m1: { niche: "Salariés 28-45 ans en burn-out voulant se reconvertir freelance ou poste épanouissant", avatar_nom: "Yasmina" }, m2: { dominant_pain: "Être en burn-out ou ras-le-bol dans un job alimentaire" }, m3: { hero_mecanisme_nom: "Méthode Liberty Reconversion", headline_promesse: "Reconversion réussie en 6 mois" }, m5: { ht_point_b: "Premier contrat freelance ≥ 1 500 € HT OU poste à ≥ 3 500 € net", ht_timeframe_days: 180 }, m6: { or: { nom: "Méthode Liberty Reconversion" }, prix_ht: 2497 }, m7: { vendeur_statut: "EI Lina Hadj Coaching, SIREN 967 845 213", formule_marketing: "Méthode Liberty Reconversion — ou je t'accompagne jusqu'au résultat", promesse_resultat: "Premier contrat freelance ≥ 1 500 € HT OU poste à ≥ 3 500 € net à J+180", promesse_duree_jours: 180 } }),
];
