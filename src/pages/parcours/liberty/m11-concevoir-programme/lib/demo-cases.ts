/**
 * 10 démos M11 (casting Sidali, parité ISO v1.5.0). Données modules verbatim.
 * Les leçons sont générées au chargement via generateDefaultLeconsForModule (fallback
 * du loadDemo original) ; l'accountability et la durée sont calées par tier.
 */
import {
  type M11State, type Module, type Accountability, type Tier,
  defaultM11State, freshModule, deepClone,
} from "./types";
import { generateDefaultLeconsForModule } from "./validations";
import { LECONS_BY_DEMO_MODULE } from "./demo-lecons";

export type Segment = "argent" | "relations" | "sante";

interface DemoModuleRaw {
  id: string; obstacle_origine: string; nom: string; objectif_mesurable: string;
  niveau_bloom: string; duree_video: string; type_exercice: string;
  livrable_attendu: string; mise_situation: string; auto_evaluation: string;
}
interface DemoRaw {
  id: string; name: string; tag: string; segment: Segment;
  upstream: { m1?: any; m5?: any; m6?: any; m10?: any };
  data: {
    gate: any; point_a: string; point_b: string;
    obstacles_brut: string[]; obstacles_ordonnes: string[];
    modules: DemoModuleRaw[]; tier_bloom_target: Tier;
  };
}

export const M11_DEMO_CASES: DemoRaw[] = [
  {
    id: "karim", name: "Karim — business B2C franco-arabe", tag: "5 obstacles · 4 modules · HT (3997€) · 8/8", segment: "argent",
    upstream: {
      m1: { niche: "Solopreneurs franco-arabes 25-40 ans qui veulent vivre du digital halal", avatar_nom: "Karim", avatar_age: "32 ans" },
      m5: { ht_point_a: "Plafonner à 1-3k€ MRR malgré 2 ans d'activité", ht_point_b: "Atteindre 10k€ MRR récurrents sur 3 mois consécutifs", ht_timeframe_days: 180 },
      m6: { prix_ht: 3997 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Plafonner à 1-3k€ MRR malgré 2 ans d'activité, sans système d'acquisition prévisible ni offre claire",
      point_b: "Atteindre 10k€ MRR récurrents pendant 3 mois consécutifs avec un programme high-ticket vendu en automatique",
      obstacles_brut: [
        "Ne sait pas définir une niche assez spécifique pour se différencier",
        "Ne sait pas construire une offre high-ticket cohérente avec un mécanisme unique",
        "Ne sait pas générer 30+ appels qualifiés par mois via contenu organique",
        "Ne sait pas closer un appel high-ticket avec un taux > 20%",
        "N'a pas de système pour fidéliser les clients et générer du bouche-à-oreille",
      ],
      obstacles_ordonnes: [
        "Ne sait pas définir une niche assez spécifique pour se différencier",
        "Ne sait pas construire une offre high-ticket cohérente avec un mécanisme unique",
        "Ne sait pas générer 30+ appels qualifiés par mois via contenu organique",
        "Ne sait pas closer un appel high-ticket avec un taux > 20%",
      ],
      modules: [
        { id: "mk1", obstacle_origine: "Ne sait pas définir une niche assez spécifique", nom: "Trouver ta niche spécifique", objectif_mesurable: "À la fin du module, l'élève aura validé une niche en 3 mots qu'il peut décrire sans hésiter, avec preuve de pouvoir d'achat et douleur urgente reconnue.", niveau_bloom: "creer", duree_video: "45", type_exercice: "livrable", livrable_attendu: "Fiche niche validée : cible précise + douleur dominante + pouvoir d'achat documenté + 3 témoignages d'avatar idéal", mise_situation: "Interviewer 5 personnes de la niche présumée pour valider la douleur et le pouvoir d'achat", auto_evaluation: "Grille en 10 critères : spécificité, accessibilité, urgence, pouvoir d'achat, etc. Seuil : 8/10 pour valider." },
        { id: "mk2", obstacle_origine: "Ne sait pas construire une offre high-ticket cohérente", nom: "Architecturer ton offre high-ticket", objectif_mesurable: "À la fin, l'élève aura rédigé son offre complète : promesse mesurable + mécanisme unique + garantie + prix justifié.", niveau_bloom: "creer", duree_video: "60", type_exercice: "livrable", livrable_attendu: "Document offre complète prête à présenter en call : Point A, Point B, mécanisme, garantie, prix, BAO Bronze/Argent/Or", mise_situation: "Présenter l'offre à 3 prospects et noter les objections récurrentes", auto_evaluation: "Test du \"j'achète à ce prix\" sur 3 prospects qualifiés — au moins 1 doit demander à signer." },
        { id: "mk3", obstacle_origine: "Ne sait pas générer 30+ appels qualifiés par mois", nom: "Construire ton système d'acquisition organique", objectif_mesurable: "L'élève sera capable de générer un flux récurrent de 30+ appels qualifiés/mois via un contenu vidéo + DM setting structuré.", niveau_bloom: "creer", duree_video: "50", type_exercice: "livrable", livrable_attendu: "Calendrier de contenu 30 jours + scripts DM setting + page de réservation Calendly configurée", mise_situation: "Publier 30 jours de contenu et tracker le nombre d'appels bookés", auto_evaluation: "KPI : nombre d'appels bookés/semaine. Seuil : 8 appels/semaine au bout de 30 jours." },
        { id: "mk4", obstacle_origine: "Ne sait pas closer un appel high-ticket avec un taux > 20%", nom: "Closer en high-ticket sur des calls 60-90 min", objectif_mesurable: "L'élève sera capable de mener un appel de 60-90 min avec un taux de transformation ≥ 20%, en suivant un script éprouvé.", niveau_bloom: "creer", duree_video: "55", type_exercice: "role_play", livrable_attendu: "Script de call personnalisé + grille de traitement des 12 objections classiques", mise_situation: "Mener 5 appels réels avec enregistrement et debrief", auto_evaluation: "Taux de transformation mesuré sur 10 calls consécutifs. Seuil : 20%." },
      ],
      tier_bloom_target: "ht",
    },
  },
  {
    id: "imen", name: "Imen — formation cuisine halal premium", tag: "5 obstacles · 4 modules · MT (797€) · 8/8", segment: "relations",
    upstream: {
      m1: { niche: "Femmes musulmanes 25-45 ans qui veulent recevoir comme dans les plus beaux restaurants halal", avatar_nom: "Yasmine", avatar_age: "34 ans" },
      m5: { ht_point_a: "Faire les mêmes 5 plats en boucle et stresser dès qu'il faut recevoir", ht_point_b: "Maîtriser un répertoire de 30 recettes haut de gamme et recevoir sans stress", ht_timeframe_days: 90 },
      m6: { prix_ht: 797 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Faire les mêmes 5 plats en boucle, stresser dès qu'il faut recevoir, manquer de techniques pour les pâtisseries fines",
      point_b: "Maîtriser un répertoire de 30 recettes haut de gamme halal et recevoir sans stress pour 8 personnes en 2 heures",
      obstacles_brut: [
        "Ne maîtrise pas les techniques de base (découpe, cuissons, sauces mères)",
        "Ne sait pas planifier un menu équilibré pour un grand repas",
        "Ne maîtrise pas les pâtisseries fines (macarons, entremets)",
        "Ne sait pas dresser une assiette comme au restaurant",
        "Stresse en cuisinant sous pression de temps",
      ],
      obstacles_ordonnes: [
        "Ne maîtrise pas les techniques de base (découpe, cuissons, sauces mères)",
        "Ne sait pas planifier un menu équilibré pour un grand repas",
        "Ne maîtrise pas les pâtisseries fines (macarons, entremets)",
        "Stresse en cuisinant sous pression de temps",
      ],
      modules: [
        { id: "mi1", obstacle_origine: "Ne maîtrise pas les techniques de base", nom: "Maîtriser les techniques fondamentales", objectif_mesurable: "L'élève sera capable d'exécuter les 5 cuissons et 4 sauces mères sans regarder de recette.", niveau_bloom: "appliquer", duree_video: "40", type_exercice: "livrable", livrable_attendu: "Vidéo de soi exécutant les 5 cuissons + 4 sauces mères en moins de 90 min", mise_situation: "Cuisiner pour la famille en n'utilisant que les techniques apprises pendant 7 jours", auto_evaluation: "Checklist 9 techniques cochées par soi-même + retour d'un proche sur la dégustation" },
        { id: "mi2", obstacle_origine: "Ne sait pas planifier un menu équilibré pour un grand repas", nom: "Composer un menu pour 8", objectif_mesurable: "L'élève saura composer un menu 3 services équilibré et l'exécuter en moins de 3h.", niveau_bloom: "evaluer", duree_video: "35", type_exercice: "template", livrable_attendu: "Menu écrit + planning de cuisson + liste de courses optimisée", mise_situation: "Recevoir 6 personnes pour un repas test avec menu écrit en amont", auto_evaluation: "Grille : timing tenu, équilibre des saveurs, satisfaction des invités (note /10)" },
        { id: "mi3", obstacle_origine: "Ne maîtrise pas les pâtisseries fines", nom: "Réaliser des pâtisseries fines halal", objectif_mesurable: "L'élève sera capable de réaliser 3 pâtisseries fines avec dressage instagrammable.", niveau_bloom: "appliquer", duree_video: "50", type_exercice: "livrable", livrable_attendu: "Photo + vidéo de 3 pâtisseries fines réalisées et dressées", mise_situation: "Réaliser et offrir 3 pâtisseries différentes à un proche", auto_evaluation: "Comparaison photo avant/après avec la photo de référence du module" },
        { id: "mi4", obstacle_origine: "Stresse en cuisinant sous pression de temps", nom: "Cuisiner sereinement sous pression", objectif_mesurable: "L'élève saura cuisiner 8 couverts en 2h sans stresser, en suivant un planning minuté.", niveau_bloom: "appliquer", duree_video: "30", type_exercice: "role_play", livrable_attendu: "Planning de cuisson minuté validé en conditions réelles", mise_situation: "Recevoir 8 personnes en condition réelle avec chronomètre", auto_evaluation: "Auto-notation stress de 1 à 10 + temps réel comparé au planning" },
      ],
      tier_bloom_target: "mt",
    },
  },
  {
    id: "khadija", name: "Khadija — coaching mariage musulman", tag: "5 obstacles · 5 modules · HT (2997€) · 8/8", segment: "relations",
    upstream: {
      m1: { niche: "Femmes musulmanes 28-38 ans qui veulent se marier avec un homme religieusement engagé", avatar_nom: "Sarah", avatar_age: "32 ans" },
      m5: { ht_point_a: "Multiplier les rencontres décevantes sur les apps", ht_point_b: "Relation sérieuse engagée vers un mariage religieux à J+180", ht_timeframe_days: 180 },
      m6: { prix_ht: 2997 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Multiplier les rencontres décevantes sur les apps sans trouver un homme religieusement engagé, perdre confiance, douter de pouvoir se marier",
      point_b: "Être engagée dans une relation sérieuse menant à un projet de mariage validé religieusement et familialement à J+180",
      obstacles_brut: [
        "Ne sait pas identifier les hommes religieusement compatibles",
        "Filtre mal en amont et perd du temps avec des profils non sérieux",
        "Ne sait pas se présenter pour attirer le bon type d'homme",
        "Ne sait pas conduire les premières conversations vers du concret",
        "Ne sait pas faire valider la rencontre par la famille et l'imam",
      ],
      obstacles_ordonnes: [
        "Ne sait pas se présenter pour attirer le bon type d'homme",
        "Ne sait pas identifier les hommes religieusement compatibles",
        "Filtre mal en amont et perd du temps avec des profils non sérieux",
        "Ne sait pas conduire les premières conversations vers du concret",
        "Ne sait pas faire valider la rencontre par la famille et l'imam",
      ],
      modules: [
        { id: "mkh1", obstacle_origine: "Ne sait pas se présenter pour attirer le bon type d'homme", nom: "Te présenter avec pudeur et clarté", objectif_mesurable: "L'élève aura rédigé un profil + bio pudique qui attire les hommes sérieux et fait fuir les non-sérieux.", niveau_bloom: "creer", duree_video: "40", type_exercice: "livrable", livrable_attendu: "Bio + 3 photos validées par la coach + critères non-négociables écrits", mise_situation: "Publier la bio sur 2 apps validées et recueillir 5 retours", auto_evaluation: "Comparaison qualité des matchs avant/après (grille en 6 critères)" },
        { id: "mkh2", obstacle_origine: "Ne sait pas identifier les hommes religieusement compatibles", nom: "Détecter la compatibilité religieuse", objectif_mesurable: "L'élève saura poser 7 questions diagnostic pour évaluer la pratique religieuse réelle dès les premiers échanges.", niveau_bloom: "evaluer", duree_video: "35", type_exercice: "template", livrable_attendu: "Grille de 7 questions diagnostic + signaux rouges/verts par catégorie", mise_situation: "Tester la grille sur 3 conversations réelles et noter les réponses", auto_evaluation: "Auto-évaluation post-conversation : a-t-on évité de perdre du temps ?" },
        { id: "mkh3", obstacle_origine: "Filtre mal en amont et perd du temps avec des profils non sérieux", nom: "Filtrer rapidement les profils", objectif_mesurable: "L'élève passera moins de 15 min par jour sur les apps en éliminant 80% des profils non-sérieux en amont.", niveau_bloom: "analyser", duree_video: "25", type_exercice: "qcm", livrable_attendu: "Checklist filtre 10 critères + temps moyen par profil mesuré", mise_situation: "Trier 30 profils en utilisant la checklist et chronométrer", auto_evaluation: "Quiz 10 questions + temps réel mesuré sur tri de 30 profils" },
        { id: "mkh4", obstacle_origine: "Ne sait pas conduire les premières conversations vers du concret", nom: "Conduire la première rencontre", objectif_mesurable: "L'élève saura conduire un premier appel/rencontre vers une décision claire en moins de 7 jours.", niveau_bloom: "creer", duree_video: "45", type_exercice: "role_play", livrable_attendu: "Plan de conversation + 5 questions de validation + script de \"décision claire\"", mise_situation: "Conduire 3 premières rencontres avec le plan", auto_evaluation: "Auto-debrief écrit après chaque rencontre selon une grille fournie" },
        { id: "mkh5", obstacle_origine: "Ne sait pas faire valider la rencontre par la famille et l'imam", nom: "Présenter à la famille et l'imam", objectif_mesurable: "L'élève saura présenter le candidat à sa famille et à l'imam dans les 30 jours suivant la décision mutuelle.", niveau_bloom: "creer", duree_video: "40", type_exercice: "template", livrable_attendu: "Lettre de présentation à la famille + dossier de présentation à l'imam", mise_situation: "Organiser la première rencontre familiale et tirer un retour", auto_evaluation: "Retour écrit de la famille + validation imam consignée" },
      ],
      tier_bloom_target: "ht",
    },
  },
  {
    id: "aicha_tarek", name: "Aïcha & Tarek — couple finance halal", tag: "5 obstacles · 4 modules · HT (4500€) · 8/8", segment: "relations",
    upstream: {
      m1: { niche: "Couples musulmans 28-45 ans qui veulent gérer leurs finances sans riba", avatar_nom: "Couple Karim & Leila", avatar_age: "34 et 31 ans" },
      m5: { ht_point_a: "Vivre dans l'angoisse financière chaque fin de mois", ht_point_b: "15 000 € d'épargne halal placée + 0 dette consommation à J+180", ht_timeframe_days: 180 },
      m6: { prix_ht: 4500 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Vivre dans l'angoisse financière chaque fin de mois sans jamais épargner ni investir halal, accumuler des découverts",
      point_b: "Avoir 15 000 € d'épargne halal placée et 0 dette de consommation, avec un budget couple piloté chaque mois",
      obstacles_brut: [
        "Ne sait pas faire un budget couple commun",
        "Ne sait pas sortir du découvert récurrent",
        "Ne connaît pas les véhicules d'épargne halal",
        "Ne sait pas placer son épargne sans riba",
        "Ne sait pas communiquer en couple sur l'argent sans conflit",
      ],
      obstacles_ordonnes: [
        "Ne sait pas communiquer en couple sur l'argent sans conflit",
        "Ne sait pas faire un budget couple commun",
        "Ne sait pas sortir du découvert récurrent",
        "Ne sait pas placer son épargne sans riba",
      ],
      modules: [
        { id: "mat1", obstacle_origine: "Ne sait pas communiquer en couple sur l'argent sans conflit", nom: "Maîtriser la communication financière de couple", objectif_mesurable: "Le couple sera capable de tenir une réunion budget mensuelle de 60 min sans conflit, avec 3 décisions actées.", niveau_bloom: "evaluer", duree_video: "40", type_exercice: "role_play", livrable_attendu: "Cadre de réunion budget + 7 questions à se poser à deux + règles de communication", mise_situation: "Tenir 3 réunions budget en condition réelle sur 3 mois consécutifs", auto_evaluation: "Auto-évaluation à deux après chaque réunion : tension perçue de 1 à 10, décisions actées" },
        { id: "mat2", obstacle_origine: "Ne sait pas faire un budget couple commun", nom: "Construire un budget couple", objectif_mesurable: "Le couple saura construire un budget mensuel couvrant 100% des dépenses avec 20% d'épargne minimum.", niveau_bloom: "creer", duree_video: "50", type_exercice: "template", livrable_attendu: "Budget couple complet sur Excel ou Notion + catégorisation des dépenses 12 derniers mois", mise_situation: "Suivre le budget pendant 60 jours et tracker les écarts hebdo", auto_evaluation: "Écart réel/prévu mesuré chaque semaine — seuil de validation : < 10%" },
        { id: "mat3", obstacle_origine: "Ne sait pas sortir du découvert récurrent", nom: "Sortir du découvert", objectif_mesurable: "Le couple aura un solde compte courant ≥ 0 € chaque fin de mois pendant 3 mois consécutifs.", niveau_bloom: "appliquer", duree_video: "35", type_exercice: "livrable", livrable_attendu: "Plan de désendettement 90 jours chiffré + liste des charges supprimables", mise_situation: "Appliquer le plan pendant 90 jours et reporter les soldes", auto_evaluation: "Capture d'écran soldes mensuels — KPI : 0 découvert sur 3 mois" },
        { id: "mat4", obstacle_origine: "Ne sait pas placer son épargne sans riba", nom: "Placer son épargne halal", objectif_mesurable: "Le couple aura placé 5 000 € minimum dans 2 véhicules halal différents et validés.", niveau_bloom: "creer", duree_video: "55", type_exercice: "etude_cas", livrable_attendu: "Récap des placements effectués + dossier de validation halal", mise_situation: "Effectuer 2 placements réels et documenter le process", auto_evaluation: "Validation par un scholar référent ou par la coach sur le caractère halal des placements" },
      ],
      tier_bloom_target: "ht",
    },
  },
  {
    id: "najet", name: "Najet — consulting e-commerce", tag: "6 obstacles · 5 modules · HT (6997€) · 8/8", segment: "argent",
    upstream: {
      m1: { niche: "E-commerçants 30-50 ans avec boutique Shopify entre 5k et 20k de CA mensuel", avatar_nom: "Younes", avatar_age: "38 ans" },
      m5: { ht_point_a: "Plafonner à 8-12k de CA mensuel", ht_point_b: "Boutique Shopify à 30 000 € de CA mensuel récurrents avec ROAS > 3", ht_timeframe_days: 90 },
      m6: { prix_ht: 6997 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Plafonner à 8-12k de CA mensuel malgré 200 commandes/mois, sans savoir scaler ni améliorer la rentabilité",
      point_b: "Atteindre 30 000 € de CA mensuel récurrents avec un ROAS > 3 et une marge nette > 20% sur 3 mois consécutifs",
      obstacles_brut: [
        "Ne connaît pas son vrai coût d'acquisition par produit",
        "Ne sait pas optimiser ses pages produit pour la conversion",
        "Ne sait pas structurer ses campagnes Meta Ads pour scaler",
        "Ne sait pas augmenter le panier moyen (upsell, cross-sell, bundle)",
        "Ne sait pas fidéliser pour générer du LTV récurrent",
        "Ne sait pas lire ses KPI hebdomadaires pour piloter",
      ],
      obstacles_ordonnes: [
        "Ne connaît pas son vrai coût d'acquisition par produit",
        "Ne sait pas optimiser ses pages produit pour la conversion",
        "Ne sait pas augmenter le panier moyen (upsell, cross-sell, bundle)",
        "Ne sait pas structurer ses campagnes Meta Ads pour scaler",
        "Ne sait pas fidéliser pour générer du LTV récurrent",
      ],
      modules: [
        { id: "mn1", obstacle_origine: "Ne connaît pas son vrai coût d'acquisition par produit", nom: "Auditer les unit economics du client", objectif_mesurable: "L'élève aura un dashboard live qui affiche CAC, AOV, marge par produit, mis à jour automatiquement.", niveau_bloom: "analyser", duree_video: "50", type_exercice: "livrable", livrable_attendu: "Dashboard Looker Studio configuré avec CAC, AOV, marge par produit", mise_situation: "Audit complet des 30 derniers jours avec recalcul des marges", auto_evaluation: "Validation par la coach : tous les KPI affichés + écart < 5% avec Shopify Analytics" },
        { id: "mn2", obstacle_origine: "Ne sait pas optimiser ses pages produit pour la conversion", nom: "Optimiser tes pages produit", objectif_mesurable: "L'élève aura optimisé ses 5 produits top et augmenté le taux de conversion d'au moins 30% sur ces produits.", niveau_bloom: "creer", duree_video: "45", type_exercice: "livrable", livrable_attendu: "5 pages produit refondues + A/B test programmés sur les éléments clés", mise_situation: "Mesurer le CR avant/après sur 14 jours de trafic équivalent", auto_evaluation: "KPI taux de conversion par page — seuil : +30%" },
        { id: "mn3", obstacle_origine: "Ne sait pas augmenter le panier moyen", nom: "Augmenter le panier moyen", objectif_mesurable: "L'élève saura augmenter son panier moyen d'au moins 25% via upsell, cross-sell et bundles.", niveau_bloom: "creer", duree_video: "40", type_exercice: "livrable", livrable_attendu: "3 bundles + 2 upsells configurés + 1 cross-sell post-achat", mise_situation: "Mesurer AOV avant/après sur 30 jours", auto_evaluation: "AOV en hausse de 25% minimum + zéro réclamation client" },
        { id: "mn4", obstacle_origine: "Ne sait pas structurer ses campagnes Meta Ads pour scaler", nom: "Scaler en Meta Ads", objectif_mesurable: "L'élève saura passer de 100 € à 500 €/jour en gardant un ROAS > 3 sur 14 jours.", niveau_bloom: "creer", duree_video: "60", type_exercice: "livrable", livrable_attendu: "Structure de compte 3 niveaux (TOF/MOF/BOF) + 5 creas testés", mise_situation: "Scaler le budget de 100 → 500 € en 14 jours sur trafic réel", auto_evaluation: "ROAS mesuré en J14 — seuil : > 3" },
        { id: "mn5", obstacle_origine: "Ne sait pas fidéliser pour générer du LTV récurrent", nom: "Construire ta fidélisation et augmenter la LTV", objectif_mesurable: "L'élève aura mis en place 3 séquences post-achat qui génèrent 20% de réachat sous 90 jours.", niveau_bloom: "creer", duree_video: "40", type_exercice: "livrable", livrable_attendu: "3 séquences email post-achat + 1 programme de fidélité", mise_situation: "Lancer les séquences et mesurer le taux de réachat à J+90", auto_evaluation: "Taux de réachat 90 jours mesuré — seuil : 20%" },
      ],
      tier_bloom_target: "ht",
    },
  },
  {
    id: "salima", name: "Salima — coaching parental musulman", tag: "5 obstacles · 4 modules · MT (1997€) · 7/8 + override", segment: "relations",
    upstream: {
      m1: { niche: "Mères musulmanes 28-42 ans qui veulent éduquer sans crier dans le respect des valeurs islamiques", avatar_nom: "Amina", avatar_age: "34 ans" },
      m5: { ht_point_a: "Crier sur ses enfants tous les jours", ht_point_b: "Moins d'1 épisode de cris/semaine sur 30j consécutifs", ht_timeframe_days: 120 },
      m6: { prix_ht: 1997 },
      m10: { happy_clients_count: 8, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: false, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: true },
      point_a: "Crier sur ses enfants tous les jours et culpabiliser le soir sans savoir comment changer ce schéma",
      point_b: "Avoir moins d'1 épisode de cris par semaine sur 30 jours consécutifs, en maintenant l'autorité parentale sans violence verbale",
      obstacles_brut: [
        "Ne sait pas identifier les déclencheurs de ses propres cris",
        "Ne connaît pas les techniques de communication non-violente",
        "Ne sait pas poser un cadre clair sans crier",
        "Ne sait pas gérer ses propres émotions sous pression",
        "Ne sait pas se réparer après un dérapage",
      ],
      obstacles_ordonnes: [
        "Ne sait pas identifier les déclencheurs de ses propres cris",
        "Ne sait pas gérer ses propres émotions sous pression",
        "Ne connaît pas les techniques de communication non-violente",
        "Ne sait pas poser un cadre clair sans crier",
      ],
      modules: [
        { id: "ms1", obstacle_origine: "Ne sait pas identifier les déclencheurs de ses propres cris", nom: "Identifier tes déclencheurs", objectif_mesurable: "L'élève aura identifié et listé les 3 à 5 déclencheurs principaux de ses propres cris.", niveau_bloom: "analyser", duree_video: "30", type_exercice: "template", livrable_attendu: "Journal des déclencheurs sur 14 jours + top 5 identifiés", mise_situation: "Tenir le journal 14 jours et noter chaque épisode", auto_evaluation: "Validation par la coach lors du point hebdo : les déclencheurs sont-ils précis ?" },
        { id: "ms2", obstacle_origine: "Ne sait pas gérer ses propres émotions sous pression", nom: "Gérer tes émotions sous pression", objectif_mesurable: "L'élève saura utiliser 3 techniques de régulation émotionnelle en moins de 30 secondes dans un moment de tension.", niveau_bloom: "appliquer", duree_video: "35", type_exercice: "role_play", livrable_attendu: "Fiche des 3 techniques personnalisées + log d'utilisation", mise_situation: "Utiliser au moins 1 technique sur 5 situations de tension réelles", auto_evaluation: "Auto-évaluation : ai-je réussi à ne pas crier ? Note sur 5 par situation" },
        { id: "ms3", obstacle_origine: "Ne connaît pas les techniques de communication non-violente", nom: "Pratiquer la communication non-violente", objectif_mesurable: "L'élève saura reformuler 5 phrases du quotidien en CNV (observation, sentiment, besoin, demande).", niveau_bloom: "appliquer", duree_video: "40", type_exercice: "qcm", livrable_attendu: "Liste de 10 phrases du quotidien reformulées en CNV", mise_situation: "Utiliser la CNV 3 fois par jour pendant 7 jours", auto_evaluation: "Quiz 10 questions + retour écrit des enfants si âge suffisant" },
        { id: "ms4", obstacle_origine: "Ne sait pas poser un cadre clair sans crier", nom: "Poser un cadre sans crier", objectif_mesurable: "L'élève sera capable d'énoncer 5 règles familiales claires et de les faire respecter sans hausser la voix.", niveau_bloom: "evaluer", duree_video: "35", type_exercice: "livrable", livrable_attendu: "Tableau des 5 règles affiché + protocole de conséquences non-violentes", mise_situation: "Appliquer le cadre pendant 30 jours et tenir un journal d'épisodes", auto_evaluation: "KPI : nombre d'épisodes de cris/semaine — seuil < 1" },
      ],
      tier_bloom_target: "mt",
    },
  },
  {
    id: "mehdi", name: "Mehdi — formation closer musulman", tag: "5 obstacles · 4 modules · HT (2497€) · 8/8", segment: "argent",
    upstream: {
      m1: { niche: "Hommes musulmans 22-35 ans qui veulent devenir closer/setter remote halal", avatar_nom: "Ilyas", avatar_age: "26 ans" },
      m5: { ht_point_a: "Vouloir un revenu remote 4-8k€/mois sans diplôme", ht_point_b: "Premier contrat closer signé à 8-10% à J+90", ht_timeframe_days: 90 },
      m6: { prix_ht: 2497 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Vouloir un revenu remote 4-8k€/mois sans diplôme et sans savoir par où commencer, perdre du temps avec des formations gratuites bidon",
      point_b: "Avoir signé un premier contrat closer à 8% minimum de commission sur tickets ≥ 3 000 €, avec 3 calls/jour bookés",
      obstacles_brut: [
        "Ne connaît pas les bases de la vente high-ticket",
        "Ne sait pas pitcher pour décrocher un contrat closer",
        "Ne sait pas mener un appel découverte de A à Z",
        "Ne sait pas traiter les 12 objections classiques",
        "Ne sait pas gérer la pression et les refus",
      ],
      obstacles_ordonnes: [
        "Ne connaît pas les bases de la vente high-ticket",
        "Ne sait pas pitcher pour décrocher un contrat closer",
        "Ne sait pas mener un appel découverte de A à Z",
        "Ne sait pas traiter les 12 objections classiques",
      ],
      modules: [
        { id: "mm1", obstacle_origine: "Ne connaît pas les bases de la vente high-ticket", nom: "Maîtriser les fondamentaux de la vente HT", objectif_mesurable: "L'élève sera capable de réciter et appliquer les 7 principes de la vente HT en situation simulée.", niveau_bloom: "appliquer", duree_video: "50", type_exercice: "qcm", livrable_attendu: "Quiz 30 questions validé à 80% + 1 simulation de call enregistrée", mise_situation: "Faire 5 simulations en peer-coaching", auto_evaluation: "Score quiz + grille de notation peer (10 critères)" },
        { id: "mm2", obstacle_origine: "Ne sait pas pitcher pour décrocher un contrat closer", nom: "Pitcher pour décrocher ton premier contrat", objectif_mesurable: "L'élève aura envoyé 50 pitchs personnalisés et obtenu au moins 3 RDV avec des coachs HT.", niveau_bloom: "creer", duree_video: "45", type_exercice: "livrable", livrable_attendu: "50 pitchs DM/email envoyés + tableau de suivi + 3 RDV programmés", mise_situation: "Pitcher en condition réelle pendant 30 jours", auto_evaluation: "KPI : 3 RDV obtenus en 30 jours minimum" },
        { id: "mm3", obstacle_origine: "Ne sait pas mener un appel découverte de A à Z", nom: "Mener un appel découverte", objectif_mesurable: "L'élève saura mener un appel découverte de 30-45 min en suivant un cadre structuré, avec validation par enregistrement.", niveau_bloom: "creer", duree_video: "55", type_exercice: "role_play", livrable_attendu: "5 appels enregistrés + grille d'analyse par appel", mise_situation: "Mener 5 appels découverte en conditions réelles", auto_evaluation: "Auto-debrief + retour coach sur chaque appel" },
        { id: "mm4", obstacle_origine: "Ne sait pas traiter les 12 objections classiques", nom: "Traiter les objections", objectif_mesurable: "L'élève saura répondre instantanément aux 12 objections classiques avec un taux de retournement ≥ 30%.", niveau_bloom: "creer", duree_video: "60", type_exercice: "role_play", livrable_attendu: "Banque de 12 réponses personnalisées + 3 sessions de roleplay enregistrées", mise_situation: "Roleplay live 1h avec coach sur les 12 objections", auto_evaluation: "Taux de retournement mesuré sur 20 calls — seuil ≥ 30%" },
      ],
      tier_bloom_target: "ht",
    },
  },
  {
    id: "mounia_anas", name: "Mounia & Anas — agence SaaS B2B", tag: "5 obstacles · 5 modules · HT (12000€) · 8/8", segment: "argent",
    upstream: {
      m1: { niche: "CEO et COO de SaaS B2B post-Series A entre 5 et 30 M€ ARR", avatar_nom: "Khaled", avatar_age: "41 ans" },
      m5: { ht_point_a: "Churn > 4%/mois sans levier identifié", ht_point_b: "Rapport audit + plan 15 leviers + dashboard à J+30", ht_timeframe_days: 30 },
      m6: { prix_ht: 12000 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Voir le churn dépasser 4%/mois sans comprendre ses leviers et craindre que la Series B soit refusée à cause de la rétention",
      point_b: "Disposer d'un rapport d'audit 40+ pages, d'un plan d'action 15 leviers chiffrés ROI > 3x et d'un dashboard Looker Studio configuré à J+30",
      obstacles_brut: [
        "Ne sait pas auditer ses cohortes de churn de manière granulaire",
        "Ne sait pas identifier les 5 segments à risque",
        "Ne sait pas prioriser les leviers d'activation et de rétention",
        "Ne sait pas mettre en place un système de monitoring continu",
        "Ne sait pas piloter une refonte d'onboarding en 30 jours",
      ],
      obstacles_ordonnes: [
        "Ne sait pas auditer ses cohortes de churn de manière granulaire",
        "Ne sait pas identifier les 5 segments à risque",
        "Ne sait pas prioriser les leviers d'activation et de rétention",
        "Ne sait pas piloter une refonte d'onboarding en 30 jours",
        "Ne sait pas mettre en place un système de monitoring continu",
      ],
      modules: [
        { id: "mma1", obstacle_origine: "Ne sait pas auditer ses cohortes de churn de manière granulaire", nom: "Auditer tes cohorts en granulaire", objectif_mesurable: "L'élève aura produit un audit complet des cohortes 12 derniers mois avec causes de churn identifiées.", niveau_bloom: "analyser", duree_video: "55", type_exercice: "etude_cas", livrable_attendu: "Rapport audit 40+ pages avec graphes de cohort + top 5 causes documentées", mise_situation: "Mener l'audit complet sur ses propres données", auto_evaluation: "Validation par le coach : couverture complète des 12 derniers mois + causes étayées par data" },
        { id: "mma2", obstacle_origine: "Ne sait pas identifier les 5 segments à risque", nom: "Segmenter les utilisateurs à risque", objectif_mesurable: "L'élève aura segmenté sa base client en 5 segments à risque avec score de churn par segment.", niveau_bloom: "analyser", duree_video: "40", type_exercice: "livrable", livrable_attendu: "Tableau de segmentation + score de churn par segment + top 3 actions par segment", mise_situation: "Appliquer la segmentation sur sa base et tester sur 30 jours", auto_evaluation: "Précision du modèle mesurée à J+30 : taux de bonne classification" },
        { id: "mma3", obstacle_origine: "Ne sait pas prioriser les leviers d'activation et de rétention", nom: "Prioriser les 15 leviers", objectif_mesurable: "L'élève aura priorisé 15 leviers avec impact estimé sur le NRR et plan d'exécution à 90 jours.", niveau_bloom: "evaluer", duree_video: "45", type_exercice: "template", livrable_attendu: "Matrice 15 leviers (impact/effort) + plan d'exécution 90 jours", mise_situation: "Présenter le plan au comex et obtenir validation", auto_evaluation: "Validation comex + score d'effort/impact par levier" },
        { id: "mma4", obstacle_origine: "Ne sait pas piloter une refonte d'onboarding en 30 jours", nom: "Refondre l'onboarding en 30j", objectif_mesurable: "L'élève aura refondu l'onboarding et mesuré une activation +20% sur les cohortes post-refonte.", niveau_bloom: "creer", duree_video: "60", type_exercice: "livrable", livrable_attendu: "Onboarding refondu + tracking events configuré + A/B test", mise_situation: "Déployer la refonte sur 30% des nouvelles cohortes", auto_evaluation: "Taux d'activation J+7 mesuré — seuil : +20%" },
        { id: "mma5", obstacle_origine: "Ne sait pas mettre en place un système de monitoring continu", nom: "Monitorer ton dashboard en continu", objectif_mesurable: "L'élève aura un dashboard Looker Studio live trackant churn, NRR et activation par cohorte hebdo.", niveau_bloom: "creer", duree_video: "50", type_exercice: "livrable", livrable_attendu: "Dashboard Looker partagé avec le comex + alerting Slack configuré", mise_situation: "Présenter le dashboard hebdo au comex pendant 4 semaines", auto_evaluation: "Validation du comex sur la fiabilité + zéro écart > 5% avec sources" },
      ],
      tier_bloom_target: "ht",
    },
  },
  {
    id: "younes", name: "Younes — coaching sportif premium", tag: "5 obstacles · 4 modules · HT (3497€) · 8/8", segment: "sante",
    upstream: {
      m1: { niche: "Hommes 35-55 ans en surpoids ≥ 15 kg avec hypertension/cholestérol sous statines", avatar_nom: "Bilal", avatar_age: "46 ans" },
      m5: { ht_point_a: "Sous statines à 45 ans, surpoids de 18kg", ht_point_b: "-12 kg + IMC ≤ 26 + sortie statines", ht_timeframe_days: 120 },
      m6: { prix_ht: 3497 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Être sous statines à 45 ans en surpoids de 18kg et redouter un infarctus précoce sans réussir à se mettre au sport durablement",
      point_b: "Atteindre -12 kg minimum, IMC ≤ 26 et un bilan sanguin validant la sortie des statines, sans reprise sur 30 jours consécutifs",
      obstacles_brut: [
        "Ne connaît pas son point de départ métabolique précis",
        "Ne sait pas structurer une nutrition adaptée à sa pathologie",
        "Ne sait pas s'entraîner sans se blesser",
        "Ne sait pas gérer le stress et le sommeil qui impactent le poids",
        "Ne sait pas tenir dans la durée sans rechute",
      ],
      obstacles_ordonnes: [
        "Ne connaît pas son point de départ métabolique précis",
        "Ne sait pas structurer une nutrition adaptée à sa pathologie",
        "Ne sait pas s'entraîner sans se blesser",
        "Ne sait pas tenir dans la durée sans rechute",
      ],
      modules: [
        { id: "my1", obstacle_origine: "Ne connaît pas son point de départ métabolique précis", nom: "Réaliser un bilan métabolique complet", objectif_mesurable: "L'élève aura un bilan sanguin complet + composition corporelle + mesures de référence consignées.", niveau_bloom: "analyser", duree_video: "35", type_exercice: "livrable", livrable_attendu: "Tableau de bilan complet : poids, IMC, tour de taille, bilan sanguin, tension", mise_situation: "Réaliser bilan sanguin + mesures + tension sur 7 jours", auto_evaluation: "Validation des 8 indicateurs présents et datés" },
        { id: "my2", obstacle_origine: "Ne sait pas structurer une nutrition adaptée à sa pathologie", nom: "Adapter sa nutrition au profil", objectif_mesurable: "L'élève saura composer 14 jours de menus respectant les contraintes médicales et générant un déficit calorique de 500 kcal.", niveau_bloom: "creer", duree_video: "50", type_exercice: "template", livrable_attendu: "Plan alimentaire 14 jours + liste de courses + équivalents", mise_situation: "Suivre le plan 30 jours et noter le ressenti", auto_evaluation: "KPI : perte de poids semaine = 0.6 à 1 kg + adhérence > 80%" },
        { id: "my3", obstacle_origine: "Ne sait pas s'entraîner sans se blesser", nom: "Construire l'entraînement adapté au débutant", objectif_mesurable: "L'élève saura exécuter un programme musculation 3x/sem + cardio 2x/sem sans blessure pendant 90 jours.", niveau_bloom: "appliquer", duree_video: "45", type_exercice: "livrable", livrable_attendu: "Programme 12 semaines + vidéo de soi exécutant les 6 mouvements clés", mise_situation: "Suivre 90 jours et tenir un journal d'entraînement", auto_evaluation: "Auto-évaluation hebdo : douleurs, charges, ressenti — zéro blessure" },
        { id: "my4", obstacle_origine: "Ne sait pas tenir dans la durée sans rechute", nom: "Tenir dans la durée", objectif_mesurable: "L'élève saura mettre en place 5 routines anti-rechute pour tenir 12 mois post-programme.", niveau_bloom: "evaluer", duree_video: "40", type_exercice: "qcm", livrable_attendu: "Fiche de 5 routines anti-rechute + plan de relance si dérapage", mise_situation: "Tester les routines pendant 60 jours", auto_evaluation: "Auto-évaluation hebdo : routines tenues, dérapages identifiés, plan de relance activé" },
      ],
      tier_bloom_target: "ht",
    },
  },
  {
    id: "lina", name: "Lina — coaching reconversion pro", tag: "5 obstacles · 4 modules · HT (2497€) · 8/8", segment: "relations",
    upstream: {
      m1: { niche: "Salariés 28-45 ans en burn-out ou ras-le-bol qui veulent se reconvertir", avatar_nom: "Yasmina", avatar_age: "36 ans" },
      m5: { ht_point_a: "Burn-out depuis 2 ans dans un job alimentaire", ht_point_b: "Premier contrat freelance ≥ 1500€ HT OU poste à ≥ 3500€ net", ht_timeframe_days: 180 },
      m6: { prix_ht: 2497 },
      m10: { happy_clients_count: 10, onboarding_validated: true, retours_positifs: true },
    },
    data: {
      gate: { niche_specifique: true, offre_validee: true, appels_qualifies: true, acquisition_automatisee: true, closing_valide: true, integration_validee: true, retours_positifs: true, dix_clients_heureux: true, override_warning: false },
      point_a: "Être en burn-out ou ras-le-bol depuis 2 ans dans un job alimentaire sans savoir vers quoi se reconvertir et avoir peur de tout perdre",
      point_b: "Avoir signé son premier contrat freelance ≥ 1 500 € HT OU décroché un nouveau poste à ≥ 3 500 € net dans le secteur visé",
      obstacles_brut: [
        "Ne sait pas identifier ses appétences et compétences valorisables",
        "Ne sait pas choisir entre freelance et salariat",
        "Ne sait pas construire un portfolio crédible sans expérience",
        "Ne sait pas prospecter ses premiers clients ou employeurs",
        "Ne sait pas gérer la peur du saut financier",
      ],
      obstacles_ordonnes: [
        "Ne sait pas identifier ses appétences et compétences valorisables",
        "Ne sait pas choisir entre freelance et salariat",
        "Ne sait pas construire un portfolio crédible sans expérience",
        "Ne sait pas prospecter ses premiers clients ou employeurs",
      ],
      modules: [
        { id: "ml1", obstacle_origine: "Ne sait pas identifier ses appétences et compétences valorisables", nom: "Évaluer tes appétences et compétences", objectif_mesurable: "L'élève aura validé ses 3 appétences fortes et 5 compétences valorisables avec preuves concrètes.", niveau_bloom: "analyser", duree_video: "40", type_exercice: "template", livrable_attendu: "Cartographie appétences/compétences + 10 témoignages externes recoupés", mise_situation: "Interviewer 10 personnes de l'entourage pour valider", auto_evaluation: "Validation par triangulation : ≥ 3 sources convergentes par compétence" },
        { id: "ml2", obstacle_origine: "Ne sait pas choisir entre freelance et salariat", nom: "Choisir freelance ou salariat", objectif_mesurable: "L'élève aura tranché son orientation avec une matrice décisionnelle chiffrée et un plan d'action 90 jours.", niveau_bloom: "evaluer", duree_video: "35", type_exercice: "template", livrable_attendu: "Matrice décisionnelle pondérée + plan 90 jours signé", mise_situation: "Tester l'orientation 30 jours en mode reconnaissance", auto_evaluation: "Auto-validation à J+30 : a-t-on encore le même choix ?" },
        { id: "ml3", obstacle_origine: "Ne sait pas construire un portfolio crédible sans expérience", nom: "Construire un portfolio crédible", objectif_mesurable: "L'élève aura construit un portfolio de 5 pièces visibles + une bio Linkedin optimisée pour la nouvelle cible.", niveau_bloom: "creer", duree_video: "50", type_exercice: "livrable", livrable_attendu: "Portfolio en ligne avec 5 pièces + bio Linkedin + 3 recommandations Linkedin", mise_situation: "Publier le portfolio et obtenir 50 vues authentiques en 14 jours", auto_evaluation: "KPI : 50 vues + 5 retours qualitatifs en 14 jours" },
        { id: "ml4", obstacle_origine: "Ne sait pas prospecter ses premiers clients ou employeurs", nom: "Prospecter les premiers clients/employeurs", objectif_mesurable: "L'élève aura contacté 100 cibles qualifiées et obtenu 5 RDV concrets en 30 jours.", niveau_bloom: "creer", duree_video: "45", type_exercice: "livrable", livrable_attendu: "100 contacts envoyés + tableau de suivi + 5 RDV planifiés", mise_situation: "Prospecter 30 jours en condition réelle", auto_evaluation: "KPI : 5 RDV obtenus en 30 jours + 1 piste sérieuse identifiée" },
      ],
      tier_bloom_target: "ht",
    },
  },
];

function accountabilityForTier(tier: Tier): Accountability {
  if (tier === "ht") return { validation_par_defaut: "coach_async", frequence_contact_humain: "hebdo", engagement_initial: "declaration", progression_modules: "gate_livrable" };
  if (tier === "mt") return { validation_par_defaut: "pair", frequence_contact_humain: "mensuel", engagement_initial: "declaration", progression_modules: "drip" };
  return { validation_par_defaut: "auto", frequence_contact_humain: "global", engagement_initial: "declaration", progression_modules: "tout_ouvert" };
}

/** Réplique loadDemo() : construit un M11State complet (leçons générées, accountability/durée par tier). */
export function buildDemoState(demoId: string): M11State | null {
  const demo = M11_DEMO_CASES.find((d) => d.id === demoId);
  if (!demo) return null;
  const s = defaultM11State();
  s.demoMode = demo.id;
  s._activeDemo = demo.id;
  const tier = demo.data.tier_bloom_target;
  s.data = {
    ...s.data,
    gate: deepClone(demo.data.gate),
    point_a: demo.data.point_a,
    point_b: demo.data.point_b,
    obstacles_brut: deepClone(demo.data.obstacles_brut),
    obstacles_ordonnes: deepClone(demo.data.obstacles_ordonnes),
    tier_bloom_target: tier,
    duree_programme_mois: tier === "ht" ? "6" : tier === "mt" ? "3" : "2",
    accountability: accountabilityForTier(tier),
    modules: demo.data.modules.map((mr, i) => {
      const m: Module = { ...freshModule(), ...mr, niveau_bloom: mr.niveau_bloom as any, type_exercice: mr.type_exercice as any, lecons: [] };
      const specific = LECONS_BY_DEMO_MODULE[demo.id + "_" + (m.id || "m" + i)];
      m.lecons = (Array.isArray(specific) && specific.length > 0)
        ? specific.map((l, li) => ({ id: "lec_" + demo.id + "_" + (m.id || i) + "_" + (li + 1), titre: l.titre || "", angle: l.angle || "", duree_min: l.duree_min || "", active_recall: l.active_recall || "" }))
        : generateDefaultLeconsForModule(m, i);
      return m;
    }),
  };
  if (demo.upstream.m1) { s.m1_data = demo.upstream.m1; s.m1_source = "demo"; }
  if (demo.upstream.m5) { s.m5_data = demo.upstream.m5; s.m5_source = "demo"; }
  if (demo.upstream.m6) { s.m6_data = demo.upstream.m6; s.m6_source = "demo"; }
  if (demo.upstream.m10) { s.m10_data = demo.upstream.m10; s.m10_source = "demo"; }
  s.highest = "lock";
  s.current = "gate_transition";
  return s;
}
