/**
 * Mode démo M3 — 10 cas pré-remplis (Argent · Relations · Santé).
 *
 * Transposition fidèle des `DEMO_NICHES` Sidali V2.
 * Cake Design = cas verbatim complet. Les 9 autres sont en placeholder
 * `ready: false` — transcription mécanique au prochain lot.
 *
 * Mode démo : state non persisté en BDD (cf. usePersistedState).
 */

import type { M3State } from "./types";

export interface M3DemoCase {
  key: string;
  segment: "argent" | "relations" | "sante";
  emoji: string;
  title: string;
  summary: string;
  ready: boolean;
  patch?: Partial<M3State>;
}

// ── Cake Design (verbatim Sidali) ──────────────────────────────────────────
const CAKE_DESIGN_PATCH: Partial<M3State> = {
  current_step: "promesse",
  market_type: "b2c_transfo",
  m1_data: {
    source: "demo_cake_design",
    sous_niche_2: {
      phrase_finale: "Cake designers passionnées qui veulent vivre du cake design haut de gamme depuis chez elles",
      cible: "Femmes musulmanes francophones, 28-40 ans, déjà passionnées de pâtisserie, en reconversion ou en congé parental, qui font des gâteaux pour leur entourage et n'arrivent pas à les vendre à un prix juste",
      douleur: "Vendent leurs gâteaux 80€ alors qu'ils en valent 400€, ne savent pas se positionner sur le wedding cake haut de gamme, manquent de méthode pour passer de l'amateur au pro",
      methode: "Méthode Wedding-Premium™ : passer du gâteau d'anniversaire à 50€ au wedding cake à 600€+ en 90 jours",
    },
    avatar: {
      socio: { nom: "Inès", age: "31 ans", situation: "Infirmière à Toulouse, fait des gâteaux pour sa famille depuis 4 ans, veut quitter l'hôpital pour rester avec ses 2 enfants. Salaire 2 100€/mois, son mari gagne 3 800€." },
    },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: null,
  promesse: {
    text: "Aider les passionnées de cake design à signer leur premier wedding cake à 600€+ en 90 jours, sans passer par le CAP Pâtissier ni louer un atelier.",
    score: 92, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Promesse validée — SMDC respectés." },
    history: [],
  },
  mecanisme: {
    nom: "Méthode Wedding-Premium™",
    etapes: [
      "Cartographier ton portfolio actuel et identifier ton style signature",
      "Construire ta gamme premium (3 packs : 350€ / 600€ / 1200€)",
      "Mettre en place ton tunnel Instagram → demande de devis → vente",
      "Lancer les 3 premières commandes wedding cake en cohorte",
    ],
    score: 88, attempts: 2, validated: true, forced: false,
    feedback: { verdict: "✓ Mécanisme validé — nom propriétaire fort + étapes actionnables." },
    history: [],
  },
  vehicule: {
    format: "cohorte_groupe",
    justification: "Cohorte fermée de 12 femmes maximum, 1 live de groupe par semaine sur Zoom (les jeudis 21h après les enfants), Discord pour le partage de gâteaux quotidien, et 2 sessions 1to1 par mois pour personnaliser le suivi de leur portfolio. Programme sur 12 semaines.",
    validated: true,
  },
  bonus: {
    items: [
      { nom: "Pack Photos Pro · 30 fonds + scripts d'éclairage smartphone", valeur: "297€", raison: "Permet de produire des photos qui justifient un prix premium dès la semaine 2, avant même d'avoir terminé son nouveau portfolio." },
      { nom: "Templates de devis & contrats wedding cake", valeur: "197€", raison: "Tous les documents pour facturer comme une pro (devis, contrat, conditions d'annulation). Premier devis pro envoyé la semaine 1." },
      { nom: "Accès à la communauté Cake Premium pendant 6 mois", valeur: "120€/mois × 6 = 720€", raison: "Briser la solitude de l'auto-entrepreneuse à domicile. Soutien et entraide entre cake designers musulmanes francophones." },
    ],
    score: 90, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Bonus validés — chaque bonus a un nom + valeur + raison ancrée." },
    history: [],
  },
  garantie: {
    type: "continuite",
    formulation: "Si après avoir suivi les 8 premiers modules ET soumis tes 3 nouveaux gâteaux portfolio, tu n'as pas signé ta première commande wedding cake à 400€+ dans les 90 jours du programme, je continue à t'accompagner gratuitement pendant 60 jours supplémentaires — jusqu'à ce que tu y arrives.",
    score: 85, attempts: 2, validated: true, forced: false,
    feedback: { verdict: "✓ Garantie solide avec conditions claires + délai." },
    history: [],
  },
  urgence: {
    type: "cohorte_limitee",
    justification: "12 places dans la cohorte de septembre, parce que je ne peux pas accompagner sérieusement plus de 12 cake designers en même temps (les 1to1 + les revues de portfolio prennent du temps). Prochaine cohorte en janvier.",
    score: 82, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Urgence éthique — capacité d'accompagnement justifiée." },
    history: [],
  },
  prix: {
    montant: "1497",
    leviers: {
      resultat:    { score: 80, justification: "Promesse mesurable (premier wedding cake à 600€+) avec un résultat business clair. Bonus à valeur cumulée 1 214€ qui amplifie la perception." },
      probabilite: { score: 85, justification: "Mécanisme propriétaire structuré (Wedding-Premium™ avec 4 étapes nommées) + garantie continuité qui inverse le risque + cohorte 12 max + 1to1 mensuel = méthode crédible." },
      delai:       { score: 95, justification: "Délai annoncé : 90 jours (cadre clair). Quick-win semaine 2 (Pack Photos Pro). Étapes du mécanisme = livrables intermédiaires identifiables." },
      effort:      { score: 78, justification: "Véhicule cohorte + lives groupe + 1to1 mensuel + bonus templates de devis et contrats = parcours cadré, l'élève ne part pas d'une page blanche." },
    },
    levier_faible: "effort",
    alignements: { format: true, cible: true, ancrage: true },
    score: 86, attempts: 1, validated: true, forced: false,
    feedback: {
      verdict: "✓ Positionnement validé · Score 86/100 · 1497€ ancré, format cohérent, cible solvable.",
      weak: "Le levier FACILITÉ est le moins fort (78/100). Le programme demande encore de la production active (gâteaux portfolio, devis envoyés).",
      action_concrete: "Renforce les éléments done-for-you : checklists imprimables, scripts de réponse aux clients, calendrier de production guidé semaine par semaine.",
      propositions: [
        { text: "Ajouter un bonus 'Calendrier de production 12 semaines' qui dit exactement quoi faire chaque jour.", cible_etape: "Bonus" },
        { text: "Inclure un format 'corrections en direct' dans les lives — réduit l'effort de réflexion de l'élève.", cible_etape: "Véhicule" },
      ],
    },
    history: [],
  },
};

// ── Closing high-ticket à distance ─────────────────────────────────────────
const CLOSING_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_closing_high_ticket",
    sous_niche_2: {
      phrase_finale: "Soeurs en reconversion qui veulent générer 5-10k€/mois en closing à distance pour des businesses halal premium",
      cible: "Femmes musulmanes francophones 25-40 ans, salariées en CDI ou en congé parental, à l'aise à l'oral mais sans expérience commerciale, qui veulent un revenu à distance compatible avec leur rôle de mère",
      douleur: "Échangent leur temps en CDI 1800€/mois avec 2h de transport, ne peuvent pas démissionner sans filet, peur du démarchage et de la cold call agressive, ne trouvent pas de business halal qui recrute",
      methode: "Méthode Tawakkul Closing™ : passer de salariée à closer confirmée chez un infopreneur halal en 90 jours",
    },
    avatar: { socio: { nom: "Khadija", age: "29 ans", situation: "Assistante administrative à Marseille, 1 800€/mois, 2 enfants en bas âge, mari chauffeur poids lourd souvent absent, a déjà fait du SAV téléphonique pendant 3 ans." } },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: null,
  promesse: { text: "Permettre à 50 soeurs en reconversion de signer leur premier contrat closing à 5 000€ de commissions/mois en 90 jours, sans démarchage à froid ni renier leurs valeurs.", score: 88, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Promesse claire · résultat chiffré + délai + cible précise." }, history: [] },
  mecanisme: { nom: "Méthode Tawakkul Closing™", etapes: ["Cartographier les 30 businesses halal premium qui recrutent des closers", "Maîtriser le script d'appel inversé (le prospect te qualifie, pas l'inverse)", "Passer de 0 à 50 appels/semaine en gérant ses émotions", "Décrocher son premier mandat avec un infopreneur partenaire validé"], score: 86, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme nommé + 4 étapes actionnables avec livrables clairs." }, history: [] },
  vehicule: { format: "cohorte_groupe", justification: "Cohorte fermée de 15 closeuses, 8 semaines intensives. 3 lives de jeux de rôle par semaine (mardi/jeudi/samedi 21h), Telegram pour partage des appels enregistrés, debrief hebdo en groupe. Pas de solo : on apprend en se confrontant aux autres.", validated: true },
  bonus: { items: [
    { nom: "Bibliothèque de 80 scripts d'appel validés (par secteur halal)", valeur: "397€", raison: "Tu n'inventes rien : tu pars d'un script qui a déjà fait des ventes, tu le personnalises. Premier appel pro en semaine 1." },
    { nom: "Accès au réseau de 12 mandats partenaires (infopreneurs halal premium)", valeur: "Inestimable", raison: "On ne te laisse pas chercher un client après ta formation : on te présente directement à des entrepreneurs qui cherchent des closeuses." },
    { nom: "Audit 1to1 de tes 3 premiers appels enregistrés", valeur: "297€", raison: "Le piège du closer débutant : faire 200 appels mauvais sans s'en rendre compte. On t'écoute, on te corrige, tu progresses 10× plus vite." },
  ], score: 89, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus stratégiques — chacun lève une objection clé." }, history: [] },
  garantie: { type: "continuite", formulation: "Si après les 8 semaines de cohorte ET 100 appels passés ET tes 3 premiers appels audités, tu n'as toujours pas signé un mandat partenaire, je continue de t'accompagner jusqu'à ta première signature, gratuitement, pendant 60 jours.", score: 84, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Conditions claires (8 sem · 100 appels · 3 audits)." }, history: [] },
  urgence: { type: "cohorte_limitee", justification: "15 places maximum par cohorte. Au-delà, je ne peux plus auditer chaque appel et faire les jeux de rôle 1to1. Prochaine cohorte dans 4 mois.", score: 80, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Capacité d'accompagnement réelle, justifiée." }, history: [] },
  prix: {
    montant: "1997",
    leviers: {
      resultat:    { score: 90, justification: "Résultat ultra-chiffré (5 000€/mois) qui dépasse largement le salaire médian de la cible (1 800€). Le levier rêve est puissant." },
      probabilite: { score: 88, justification: "Mécanisme structuré + 12 mandats partenaires donnés + audit 1to1 des 3 premiers appels = la cliente n'a pas à chercher un client toute seule." },
      delai:       { score: 82, justification: "90 jours pour signer son premier mandat. Quick-win = premier appel pro en semaine 1 grâce aux scripts. Cohérent." },
      effort:      { score: 75, justification: "Cohorte intense (3 lives/sem) + 50 appels/sem = ce n'est pas done-for-you. Le travail est encore lourd, mais le cadre est posé." },
    },
    levier_faible: "effort", alignements: { format: true, cible: true, ancrage: true },
    score: 84, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Positionnement validé · 1997€ aligné avec un ROI possible dès le 1er mandat." }, history: [],
  },
};

// ── Immobilier locatif halal sans crédit ───────────────────────────────────
const IMMO_HALAL_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2c_info",
  m1_data: {
    source: "demo_immobilier_halal",
    sous_niche_2: {
      phrase_finale: "Pères musulmans qui veulent générer 1 500€/mois passifs en immobilier sans utiliser de crédit conventionnel",
      cible: "Hommes musulmans 30-45 ans, salariés ou indépendants, gagnant 2 500-5 000€/mois, qui ont 20-50k€ d'épargne dormante et veulent diversifier sans riba",
      douleur: "Refusent le crédit conventionnel (riba) donc bloqués pour investir, voient leur épargne se dévaluer, ne savent pas où chercher des solutions de financement participatif sérieuses, ont peur de l'incertitude",
      methode: "Système Baraka Immo™ : signer son premier bien locatif rentable (≥10% net) financé hors riba en 6 mois",
    },
    avatar: { socio: { nom: "Yassine", age: "37 ans", situation: "Technicien réseau à Lyon, 3 100€/mois, 35k€ d'épargne, 3 enfants, marié à une institutrice (1 900€/mois), n'a jamais investi parce qu'il refuse le crédit bancaire classique." } },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: null,
  promesse: { text: "Permettre à 30 pères musulmans de signer leur premier bien locatif rentable (≥10% net) financé sans crédit conventionnel, en 6 mois, à partir de 25k€ d'apport.", score: 91, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Promesse SMDC complète · résultat précis + cible + délai + condition." }, history: [] },
  mecanisme: { nom: "Système Baraka Immo™", etapes: ["Cartographier les 12 villes France les plus rentables en colocation/courte durée", "Monter un dossier de financement hybride (apport + financement participatif Wakalah + leasing islamique)", "Acheter, meubler et mettre en exploitation à distance", "Industrialiser : passer de 1 à 3 biens en 18 mois"], score: 89, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme propriétaire avec étapes business concrètes." }, history: [] },
  vehicule: { format: "hybride_custom", justification: "Formation vidéo 6 mois (16 modules) + 1to1 mensuel d'1h avec un mentor (audit des biens visés) + visites groupées trimestrielles dans les 4 villes-clés (Roubaix, Saint-Étienne, Mulhouse, Le Havre) + accès aux 3 partenaires de financement participatif validés.", validated: true },
  bonus: { items: [
    { nom: "Listing live des 50 villes France les plus rentables (mis à jour mensuellement)", valeur: "397€/an", raison: "Le marché bouge : ce qui était rentable en 2024 ne l'est plus en 2026. Tu as toujours la donnée fraîche, sans devoir scraper toi-même." },
    { nom: "Pack contrats validés halal (bail, gestion, caution, assurance loyers impayés)", valeur: "697€", raison: "Tous les documents ont été validés par un cabinet d'avocats + un comité scharia. Tu n'as pas à inventer ni à risquer une faille juridique." },
    { nom: "Accès à vie au réseau d'investisseurs Baraka Immo (Telegram + masterminds trimestriels)", valeur: "Inestimable", raison: "On co-investit, on partage les bonnes affaires, on s'entraide sur les rénovations. Tu n'es plus seul face à un notaire." },
  ], score: 87, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus alignés avec la vraie douleur (juridique + isolement)." }, history: [] },
  garantie: { type: "paye_au_resultat", formulation: "Si tu suis les 16 modules ET soumets 5 dossiers de bien avec ton mentor en 6 mois, et que tu n'as pas signé un compromis sur un bien rentable (≥10% net), tu es prolongé gratuitement et accompagné jusqu'à ta première signature.", score: 86, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Performance avec conditions actives — pas une garantie passive." }, history: [] },
  urgence: { type: "cohorte_limitee", justification: "20 places maximum par promotion. Les 1to1 mensuels et les visites groupées limitent strictement le nombre. Prochaine cohorte en janvier.", score: 81, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Cohérent avec le format hybride 1to1." }, history: [] },
  prix: {
    montant: "4997",
    leviers: {
      resultat:    { score: 92, justification: "Résultat = bien locatif rentable ≥10% net = 250-400€/mois passifs. Sur 10 ans, le ROI dépasse largement les 4997€. Levier rêve très fort." },
      probabilite: { score: 87, justification: "Mécanisme + 1to1 mensuel + accès aux 3 partenaires de financement + visites groupées = méthode très encadrée." },
      delai:       { score: 78, justification: "6 mois c'est honnête pour de l'immobilier mais c'est long. La cible peut perdre patience entre les étapes." },
      effort:      { score: 80, justification: "Hybride avec 1to1 mensuel + contrats donnés + listing villes maintenu = effort encadré, mais l'élève doit quand même visiter et négocier." },
    },
    levier_faible: "delai", alignements: { format: true, cible: true, ancrage: true },
    score: 84, attempts: 1, validated: true, forced: false,
    feedback: {
      verdict: "✓ Positionnement validé · 4997€ justifié par le ROI sur 18 mois.",
      weak: "Le délai (6 mois) est le levier le plus faible. C'est inhérent à l'immobilier mais ça peut décourager.",
      action_concrete: "Mets en avant un quick-win mois 1 (premier dossier de financement validé) pour que l'élève sente une victoire avant le compromis final.",
    },
    history: [],
  },
};

// ── Agence SEO local pour commerçants musulmans ────────────────────────────
const SEO_LOCAL_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2b",
  m1_data: {
    source: "demo_agence_seo_local",
    sous_niche_2: {
      phrase_finale: "Commerçants musulmans locaux (resto halal, boutique modeste, cabinet expertise) qui veulent +50 clients/mois sans toucher au digital",
      cible: "Gérants de commerces physiques musulmans en France, 35-55 ans, CA 100-500k€/an, qui ont une boutique correcte mais peu de visibilité Google, pas le temps ni les compétences pour gérer leurs avis et leur fiche Google Business",
      douleur: "Investissent en travaux et déco mais zéro en visibilité digitale, perdent des clients chaque jour parce qu'on ne les trouve pas sur Google Maps, ont peur des agences qui les arnaquent à 3000€/mois sans résultat",
      methode: "Méthode Hidaya Local™ : générer +20 nouveaux appels/mois pour un commerçant en 90 jours via SEO local + Google Business + photos pro",
    },
    avatar: { socio: { nom: "Mohamed (gérant de Hidaya Restaurant à Lille)", age: "44 ans", situation: "Restaurant halal 60 couverts, 280k€ de CA/an, 3 employés. Il a une fiche Google Business à 3,8★ avec 12 avis, photos floues, pas d'horaires à jour, et 70% de sa clientèle vient encore du bouche-à-oreille." } },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: null,
  promesse: { text: "Apporter +20 nouveaux appels qualifiés par mois aux commerces musulmans locaux en 90 jours via SEO local + Google Business, sans qu'ils ne touchent à un ordinateur.", score: 90, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Promesse business B2B très claire · résultat chiffré + délai + condition." }, history: [] },
  mecanisme: { nom: "Méthode Hidaya Local™", etapes: ["Audit Google Business + concurrentiel + mots-clés locaux (semaine 1)", "Refonte fiche : 30 photos pro + horaires + descriptif optimisé + catégories", "Production de 12 contenus locaux/an (articles, posts Instagram, vidéos) ciblés ZIP code", "Modération + sollicitation des avis Google + reporting mensuel transparent"], score: 87, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme avec livrables identifiables et reporting mensuel." }, history: [] },
  vehicule: { format: "consulting_done_with_you", justification: "Abonnement mensuel récurrent. Le commerçant nous donne ses accès Google Business et Instagram, on prend en charge 95% du travail. Une fois par mois on l'appelle 30min pour le briefer sur les chiffres et valider les contenus du mois suivant.", validated: true },
  bonus: { items: [
    { nom: "Site vitrine 1 page optimisé local (offert dès la signature)", valeur: "1 200€", raison: "Beaucoup de commerçants n'ont même pas de site. On leur en livre un en 14 jours, qui complète la fiche Google Business et capture les leads." },
    { nom: "30 photos pro de leur établissement (séance dédiée incluse)", valeur: "600€", raison: "Photos = levier n°1 sur Google Business. Sans photos pro, la fiche reste invisible. On envoie un photographe sur place dans les 30 jours." },
    { nom: "Formation rapide (1h) du gérant sur la modération des avis", valeur: "297€", raison: "Le gérant doit pouvoir répondre aux avis lui-même (impossible à déléguer pour le ton). On le forme une fois pour qu'il soit autonome." },
  ], score: 88, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus B2B alignés avec la vraie douleur (zéro temps, zéro compétence digitale)." }, history: [] },
  garantie: { type: "paye_au_resultat", formulation: "Si après 90 jours d'abonnement tu n'as pas reçu au moins +15 nouveaux appels/mois directement attribuables à ta fiche Google (mesurés par le tracking d'appels dédié qu'on installe), on te rembourse les 3 mois OU on continue gratuitement jusqu'à atteindre les +20 appels/mois.", score: 89, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Garantie B2B performance très puissante · résultat mesurable + tracking dédié." }, history: [] },
  urgence: { type: "cohorte_limitee", justification: "On prend 8 nouveaux clients par mois maximum, parce que les 30 photos pro et le site vitrine demandent du temps de production. Les commerces existants gardent toute leur capacité de service.", score: 79, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Capacité de production limitée, justifiée." }, history: [] },
  prix: {
    montant: "497",
    leviers: {
      resultat:    { score: 88, justification: "+20 appels/mois pour un resto halal = ~150 couverts supplémentaires = ~3 000€ de CA additionnel. Le ROI mensuel est très clair." },
      probabilite: { score: 91, justification: "Tracking d'appels dédié + reporting mensuel + garantie performance avec remboursement = preuve quantifiée. Le commerçant n'a pas à se fier à des promesses." },
      delai:       { score: 85, justification: "90 jours pour les premiers résultats SEO. Quick-win mois 1 = nouvelles photos pro + fiche optimisée immédiatement visible." },
      effort:      { score: 92, justification: "Done-for-you complet sauf 1h/mois pour valider les contenus + 30min/mois de réponse aux avis. Le commerçant garde son temps." },
    },
    levier_faible: "delai", alignements: { format: true, cible: true, ancrage: true },
    score: 89, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Positionnement validé · 497€/mois récurrent ancré · ROI prouvable au mois 4." }, history: [],
  },
};

// ── Préparation au mariage halal ──────────────────────────────────────────
const MARIAGE_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_preparation_mariage",
    sous_niche_2: {
      phrase_finale: "Soeurs musulmanes francophones célibataires 25-35 ans qui veulent se marier sereinement avec un conjoint aligné en moins d'un an",
      cible: "Femmes musulmanes pratiquantes 25-35 ans, en France ou Belgique, indépendantes financièrement, qui voient leurs amies se marier et qui ont déjà été déçues par 1 ou 2 tentatives via des plateformes de mariage halal",
      douleur: "Pression familiale croissante, peur du célibat prolongé, ne savent pas trier les profils sérieux, déçues par les sites de mariage halal pleins de profils non-pratiquants, isolement, baisse d'estime",
      methode: "Cheminement Sakina™ : trouver un conjoint aligné en sortant des plateformes douteuses et en clarifiant ce qu'on veut vraiment",
    },
    avatar: { socio: { nom: "Aïcha", age: "29 ans", situation: "Pharmacienne à Bruxelles, 3 200€/mois, voile depuis l'université, vit chez ses parents, 2 demandes en mariage déclinées en 18 mois (incompatibilité de pratique). Sa petite soeur s'est mariée il y a 6 mois." } },
    marche: { id: "relations", label: "🤝 Relations" },
  },
  m2_data: null,
  promesse: { text: "Accompagner 100 soeurs musulmanes pratiquantes à rencontrer un conjoint aligné et sérieux en 6 mois, en sortant des plateformes douteuses et en clarifiant ce qu'elles veulent vraiment avant de rencontrer.", score: 87, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Promesse claire et empathique · résultat (rencontrer) + délai + condition." }, history: [] },
  mecanisme: { nom: "Cheminement Sakina™", etapes: ["Clarifier tes 5 non-négociables et tes 5 préférences (semaine 1-2)", "Sortir de la dépendance émotionnelle aux échecs passés (semaine 3-6)", "Activer 3 réseaux de matchmaking sérieux (mosquées, wali, masterminds soeurs)", "Maîtriser l'entretien matrimonial (questions clés, signaux rouges, suite)", "Suivi post-rencontre jusqu'à la décision sereine"], score: 85, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme structuré + livrable propre par étape." }, history: [] },
  vehicule: { format: "coaching_groupe_1to1", justification: "Programme 6 mois. Groupe fermé de 20 soeurs sur Telegram + 2 lives mensuels en groupe (mardi 21h après ishā) + 4 sessions 1to1 individuelles d'1h sur les 6 mois pour le suivi personnalisé des rencontres en cours. Tout est en non-mixité totale.", validated: true },
  bonus: { items: [
    { nom: "Questionnaire approfondi 50 questions matrimoniales (validé par un imam)", valeur: "97€", raison: "Tu sais exactement quoi poser et dans quel ordre lors d'un entretien. Plus de blanc gênant, plus de question oubliée." },
    { nom: "Réseau de wali et de mosquées partenaires (12 villes francophones)", valeur: "Inestimable", raison: "On t'oriente vers des structures qui font du vrai matchmaking, pas des plateformes en libre-service. Tu gagnes 12 mois de tâtonnement." },
    { nom: "10 témoignages audio détaillés de couples mariés via la méthode", valeur: "Inclus", raison: "Tu vois exactement à quoi ressemble un parcours réel — pas juste les photos de mariage. Ça remet de la réalité dans tes attentes." },
  ], score: 86, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus alignés avec les vraies barrières (méthode + réseau + repères réalistes)." }, history: [] },
  garantie: { type: "continuite", formulation: "Si après 6 mois de programme tu n'as eu aucune rencontre matrimoniale sérieuse (au moins 1 entretien + suite engagée), je continue de t'accompagner gratuitement pendant 6 mois supplémentaires — jusqu'à ta première vraie rencontre.", score: 83, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Continuité honnête · pas de promesse de mariage automatique." }, history: [] },
  urgence: { type: "cohorte_limitee", justification: "20 soeurs maximum par cohorte, parce que les 4 sessions 1to1 + le suivi personnalisé des rencontres demandent un temps réel. Je ne peux pas servir d'intermédiaire pour 100 soeurs en parallèle.", score: 80, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Cohérent avec le format coaching de groupe + 1to1." }, history: [] },
  prix: {
    montant: "1297",
    leviers: {
      resultat:    { score: 88, justification: "Le résultat (rencontrer un conjoint aligné) est le rêve absolu de la cible. Transformation de vie majeure." },
      probabilite: { score: 81, justification: "Mécanisme + réseau partenaires + 4 sessions 1to1 = encadrement réel. Mais l'issue ne dépend pas que de la méthode." },
      delai:       { score: 78, justification: "6 mois c'est honnête pour une rencontre sérieuse. La cible peut s'impatienter mais la garantie de continuité compense." },
      effort:      { score: 79, justification: "L'élève doit sortir de chez elle, activer son réseau, faire les entretiens. Le programme cadre mais ne fait pas le travail à sa place." },
    },
    levier_faible: "delai", alignements: { format: true, cible: true, ancrage: true },
    score: 81, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Positionnement validé · 1297€ aligné avec la transformation de vie promise.", weak: "Le délai 6 mois est le levier le plus faible.", action_concrete: "Mets en avant un quick-win mois 1 (clarté sur ses non-négociables)." },
    history: [],
  },
};

// ── Parentalité islamique 3-12 ans ────────────────────────────────────────
const PARENTALITE_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_parentalite_islamique",
    sous_niche_2: {
      phrase_finale: "Mères musulmanes francophones d'enfants 3-12 ans qui veulent transformer 80% des crises quotidiennes en moments de transmission",
      cible: "Mères musulmanes 28-42 ans, 1-4 enfants, salariées ou au foyer, qui pratiquent mais s'épuisent à concilier autorité et tendresse, et qui culpabilisent de transmettre le deen avec colère ou de ne pas le transmettre du tout",
      douleur: "Crises quotidiennes (devoirs, écrans, prière, frères-soeurs) gérées avec colère puis culpabilité, alternance autorité/laxisme, peur de mal transmettre le deen, isolement face à la famille élargie qui juge",
      methode: "Méthode Tarbiya Sereine™ : transformer 80% des crises en moments de transmission grâce à 5 rituels et 10 scripts validés islamiquement",
    },
    avatar: { socio: { nom: "Sara", age: "34 ans", situation: "Comptable à mi-temps à Strasbourg, 3 enfants (4, 7, 10 ans), pratiquante depuis 8 ans, mari très occupé, sa belle-mère lui reproche d'être 'trop laxiste' et son école 'trop rigide'." } },
    marche: { id: "relations", label: "🤝 Relations" },
  },
  m2_data: null,
  promesse: { text: "Donner aux mères musulmanes francophones les outils concrets pour transformer 80% des crises quotidiennes en moments de transmission deen, en 60 jours, sans crier ni culpabiliser.", score: 90, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Promesse forte · transformation chiffrée + délai + bénéfice émotionnel clair." }, history: [] },
  mecanisme: { nom: "Méthode Tarbiya Sereine™", etapes: ["Comprendre les besoins développementaux par tranche d'âge (3-6, 7-9, 10-12)", "Sortir de la dichotomie autorité-rigide / laxisme-coupable (cadre 'ferme et chaleureux')", "Installer 5 rituels quotidiens de transmission (matin, repas, dou'a, lecture, dodo)", "Scripts validés pour 10 situations critiques (devoirs, écrans, prière, frères-soeurs, ramadan)"], score: 88, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme structuré · cadre théorique + livrables actionnables." }, history: [] },
  vehicule: { format: "programme_video", justification: "Programme vidéo 8 semaines, 24 modules courts (12-18min) accessibles à vie. Groupe Telegram fermé pour entraide quotidienne. 1 live mensuel de questions-réponses (3eme jeudi du mois 21h). Pensé pour des mères qui ont 30 minutes par jour, pas plus.", validated: true },
  bonus: { items: [
    { nom: "50 fiches enfant prêtes à l'emploi (par âge et par situation)", valeur: "147€", raison: "Tu n'as pas le temps de chercher comment réagir. Tu sors la fiche, tu suis le script, ça désamorce. Utilisable dès le jour 1." },
    { nom: "Kit Ramadan Kids (planner 30j + activités + duas illustrés enfants)", valeur: "97€", raison: "Le mois le plus difficile en parentalité musulmane. Tu arrives préparée au lieu d'improviser dans la fatigue." },
    { nom: "30 scripts de réponse aux questions difficiles", valeur: "67€", raison: "Tu n'es plus prise au dépourvu. Réponses validées par un imam, adaptées par tranche d'âge." },
  ], score: 87, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus utilisables immédiatement, valeur perçue claire." }, history: [] },
  garantie: { type: "remboursement", formulation: "Si après 30 jours d'utilisation et application de 5 modules au minimum, tu ne sens aucune amélioration sur la gestion des crises de tes enfants, tu es remboursée intégralement, sans question.", score: 84, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Garantie 30j claire · condition raisonnable (5 modules)." }, history: [] },
  urgence: { type: "bonus_expirant", justification: "Le 'Kit Ramadan Kids' est offert uniquement pour les inscriptions avant le 15 février. Après cette date, il reste accessible mais à l'achat séparé (97€). Cette urgence est éthique : Ramadan a une vraie date.", score: 82, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Urgence calée sur un événement réel (Ramadan)." }, history: [] },
  prix: {
    montant: "397",
    leviers: {
      resultat:    { score: 86, justification: "Transformation de la vie quotidienne familiale = bénéfice émotionnel énorme pour la mère ET les enfants." },
      probabilite: { score: 88, justification: "Mécanisme + 50 fiches + scripts + groupe Telegram + lives mensuels = la mère a tout en main pour réussir. Très outillée." },
      delai:       { score: 90, justification: "Quick-win semaine 1 (premier rituel installé) + transformation visible à 60 jours. Délai serré mais cohérent." },
      effort:      { score: 91, justification: "Done-for-you sur les scripts, les fiches, le kit ramadan. La mère applique, elle n'invente rien." },
    },
    levier_faible: "resultat", alignements: { format: true, cible: true, ancrage: true },
    score: 89, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Positionnement validé · 397€ low-ticket très accessible · ratio valeur/prix excellent." }, history: [],
  },
};

// ── Sortir de la dépendance affective ─────────────────────────────────────
const DEPENDANCE_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_sortir_dependance",
    sous_niche_2: {
      phrase_finale: "Femmes musulmanes 28-50 ans en rupture (divorce ou rupture famille) qui veulent retrouver leur estime, leur autonomie émotionnelle et financière en 90 jours",
      cible: "Femmes musulmanes pratiquantes 28-50 ans, divorcées récentes ou en rupture forte avec leur famille, mères célibataires ou avec garde alternée, qui se sentent perdues, dévalorisées, isolées",
      douleur: "Perte de repères, peur de l'avenir matériel et affectif, dévalorisation de soi, jugement de l'entourage et de la communauté, isolement, sentiment d'avoir 'gâché' sa vie",
      methode: "Parcours Hijra Intérieure™ : retrouver son estime, son autonomie émotionnelle et un cap de vie en 90 jours",
    },
    avatar: { socio: { nom: "Layla", age: "38 ans", situation: "Divorcée depuis 4 mois après 12 ans de mariage, 2 enfants (8 et 11 ans) en garde alternée, retournée chez ses parents à Lyon, ancienne assistante de direction au chômage, voile depuis 6 ans." } },
    marche: { id: "relations", label: "🤝 Relations" },
  },
  m2_data: null,
  promesse: { text: "Permettre à 80 femmes musulmanes en rupture de retrouver leur estime, leur autonomie émotionnelle et un cap de vie clair en 90 jours, sans tomber dans la victimisation ni renier leur foi.", score: 86, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Promesse délicate maîtrisée · transformation interne + cap externe + ton respectueux." }, history: [] },
  mecanisme: { nom: "Parcours Hijra Intérieure™", etapes: ["Faire le deuil de l'ancienne vie (semaines 1-2 · rituels et lecture coranique guidée)", "Déconstruire les schémas répétitifs (semaines 3-5 · travail psychologique avec coach validée)", "Poser 3 nouveaux repères de vie (foi · revenu · réseau)", "Construire l'autonomie financière de base (semaines 7-10)", "Refaire communauté féminine saine (semaines 11-12)"], score: 84, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme intériorisé respectueux + ouverture sur l'autonomie financière." }, history: [] },
  vehicule: { format: "coaching_groupe_1to1", justification: "Programme 90 jours. Groupe fermé de 12 femmes maximum sur Telegram (non-mixte total) + 1 live de groupe par semaine (jeudi 21h après les enfants couchés) + 1 session 1to1 hebdomadaire de 45min avec une coach formée et validée par un comité religieux. Suivi resserré indispensable vu la fragilité émotionnelle.", validated: true },
  bonus: { items: [
    { nom: "Kit méditation et duas adaptées à la rupture (audio + livret)", valeur: "147€", raison: "Apaisement immédiat dès la première écoute. Outils utilisables dans les moments de crise nocturne." },
    { nom: "Accès gratuit à un thérapeute / coach formée et validée (3 séances incluses)", valeur: "450€", raison: "Beaucoup de soeurs en rupture ont besoin d'un travail psychologique approfondi qu'un programme seul ne peut pas remplacer." },
    { nom: "Sororité Telegram à vie (même après les 90 jours)", valeur: "Inestimable", raison: "L'isolement post-rupture est le plus grand piège. La sororité reste accessible à vie pour ne plus jamais retomber dedans." },
  ], score: 88, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus adressent les 3 vraies douleurs (apaisement immédiat + soin profond + isolement)." }, history: [] },
  garantie: { type: "continuite", formulation: "Si après les 90 jours tu ne te sens toujours pas en mesure d'assumer ta nouvelle vie de manière autonome, je continue de t'accompagner gratuitement pendant 60 jours supplémentaires, et tu gardes l'accès à la sororité à vie quoi qu'il arrive.", score: 85, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Garantie continuité respectueuse · pas de promesse de bonheur." }, history: [] },
  urgence: { type: "cohorte_limitee", justification: "12 femmes maximum par cohorte. Les 1to1 hebdomadaires + la fragilité émotionnelle de la cible imposent un suivi rapproché. Je n'accepte pas de candidates au-delà de cette capacité.", score: 84, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Capacité réelle, justifiée par le caractère sensible du sujet." }, history: [] },
  prix: {
    montant: "1497",
    leviers: {
      resultat:    { score: 89, justification: "Reconstruire sa vie après divorce = transformation profonde, valeur émotionnelle quasi-infinie." },
      probabilite: { score: 86, justification: "1to1 hebdomadaire + 3 séances thérapeute + sororité = encadrement très solide." },
      delai:       { score: 81, justification: "90 jours c'est court pour une reconstruction profonde mais cohérent comme jalon. Garantie continuité compense." },
      effort:      { score: 79, justification: "Travail intérieur intense, 1to1 hebdomadaire à honorer, lives groupe à suivre." },
    },
    levier_faible: "effort", alignements: { format: true, cible: true, ancrage: true },
    score: 84, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Positionnement validé · 1497€ aligné avec une transformation de vie majeure." }, history: [],
  },
};

// ── Remise en forme pudique à domicile ────────────────────────────────────
const REMISE_FORME_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_remise_en_forme_pudique",
    sous_niche_2: {
      phrase_finale: "Femmes voilées 25-45 ans qui veulent perdre 5-15kg à domicile en 12 semaines sans salle mixte ni matériel coûteux",
      cible: "Femmes musulmanes voilées 25-45 ans, 1-4 enfants, qui ne fréquentent pas les salles de sport mixtes, ont 30 min/jour max, peu de matériel, et se sont déjà essayées à des programmes en ligne sans tenir",
      douleur: "Refus des salles mixtes (ou salles femmes hors de prix), pas de matériel, pas de temps, sentiment de ne pas se reconnaître dans le corps post-grossesses, programmes Instagram non adaptés (musique, tenues, mixité visuelle)",
      methode: "Programme Quwwa™ : -5 à -15 kg en 12 semaines à domicile, sans salle ni mixité, avec un tapis et des bandes élastiques",
    },
    avatar: { socio: { nom: "Soraya", age: "35 ans", situation: "Mère au foyer à Nantes, 3 enfants (2, 5, 8 ans), voilée depuis 10 ans, +12kg post-grossesses, mari informaticien (4200€/mois), 30 min/jour disponibles le matin avant que les enfants se réveillent." } },
    marche: { id: "sante", label: "🌱 Santé" },
  },
  m2_data: null,
  promesse: { text: "Perdre 5 à 15 kg en 12 semaines, à domicile, en moins de 30 min par jour, avec uniquement un tapis et des bandes élastiques, sans mixité ni musique inappropriée.", score: 91, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Promesse SMDC complète · résultat chiffré + délai + matériel + non-mixité." }, history: [] },
  mecanisme: { nom: "Programme Quwwa™", etapes: ["Bilan postural et de force initiale (semaine 0 · vidéo de test)", "Cycle 1 — mobilité et activation (semaines 1-3)", "Cycle 2 — endurance et combustion (semaines 4-6)", "Cycle 3 — force fonctionnelle (semaines 7-9)", "Cycle 4 — définition et ancrage des habitudes (semaines 10-12)"], score: 87, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme par cycles progressifs cohérents avec la science du sport." }, history: [] },
  vehicule: { format: "programme_video", justification: "Programme vidéo 12 semaines, 60 séances filmées avec une coach féminine voilée, accessibles à vie. Coach WhatsApp dédiée pour répondre aux questions matériel/posture. Groupe Telegram fermé non-mixte pour entraide. Aucune musique, aucune mixité visuelle.", validated: true },
  bonus: { items: [
    { nom: "100 recettes halal équilibrées par phase de cycle (collation, repas, batch cooking)", valeur: "97€", raison: "70% du résultat vient de l'assiette. Recettes adaptées aux goûts maghrébins, pas de quinoa-spiruline-tofu." },
    { nom: "Kit suivi mensuel (mesures, photos privées, journal d'humeur, bilan force)", valeur: "47€", raison: "Le suivi n'est pas que la balance. Tu vois ta progression réelle même quand le poids stagne." },
    { nom: "Accès au groupe WhatsApp coach (réponse sous 24h)", valeur: "297€", raison: "Tu ne restes jamais bloquée sur une posture ou une douleur. Tu envoies la vidéo, tu reçois la correction." },
  ], score: 86, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus alignés avec les 3 vraies barrières (alimentation, suivi, isolement technique)." }, history: [] },
  garantie: { type: "continuite", formulation: "Si après les 12 semaines de programme suivies à 80% (séances faites + photos hebdo + alimentation suivie) tu n'as pas perdu au moins 5 kg, je te prolonge l'accès gratuitement pendant 60 jours et je t'accompagne en 1to1 jusqu'à atteindre l'objectif.", score: 86, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Continuité avec conditions actives (80% suivi · photos · alim) — pas une garantie passive." }, history: [] },
  urgence: { type: "cohorte_limitee", justification: "Le coach WhatsApp ne peut pas répondre sereinement à plus de 50 femmes en parallèle. Une fois les 50 places remplies, on ferme jusqu'à la cohorte suivante.", score: 78, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Capacité de support technique limitée, justifiée." }, history: [] },
  prix: {
    montant: "297",
    leviers: {
      resultat:    { score: 88, justification: "5-15 kg en 12 semaines + condition physique retrouvée + estime de soi = transformation forte. Comparée aux salles femmes (80€/mois × 6 = 480€), le ROI est évident." },
      probabilite: { score: 84, justification: "Programme par cycles + coach WhatsApp + recettes + suivi mensuel = très outillée. Garantie continuité ajoute la sécurité." },
      delai:       { score: 89, justification: "Quick-win semaine 1 (séance test réussie) + résultats visibles à 6 semaines + objectif final 12 semaines. Délai serré et progressif." },
      effort:      { score: 88, justification: "30 min/jour · matériel minimal · recettes données · groupe support = effort cadré, accessible à une mère de famille." },
    },
    levier_faible: "probabilite", alignements: { format: true, cible: true, ancrage: true },
    score: 87, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Positionnement validé · 297€ low-ticket parfait · ratio valeur/prix excellent · cible solvable." }, history: [],
  },
};

// ── Cycle féminin & fertilité naturelle ───────────────────────────────────
const CYCLE_FEMININ_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_cycle_feminin",
    sous_niche_2: {
      phrase_finale: "Femmes musulmanes 25-40 ans souffrant de règles douloureuses ou en parcours fertilité qui veulent réguler leur cycle naturellement en 4 mois",
      cible: "Femmes musulmanes 25-40 ans, mariées, qui souffrent de SPM intense, règles très douloureuses, cycles irréguliers, ou en parcours fertilité depuis 6+ mois sans diagnostic médical clair",
      douleur: "Tour des médecins sans solution, refus des hormones de synthèse, fatigue chronique, déprime cyclique, peur de l'infertilité, sentiment de ne pas être prise au sérieux par le corps médical",
      methode: "Méthode Fitra™ : régulariser le cycle, soulager le SPM et booster la fertilité naturellement en 4 mois sans hormones de synthèse",
    },
    avatar: { socio: { nom: "Mariam", age: "31 ans", situation: "Mariée depuis 3 ans, professeure d'arabe à Paris, 2 800€/mois, parcours bébé depuis 14 mois sans grossesse, cycles 22-45 jours, médecin refuse Clomid à cause de ses douleurs prémenstruelles déjà fortes." } },
    marche: { id: "sante", label: "🌱 Santé" },
  },
  m2_data: null,
  promesse: { text: "Régulariser le cycle, soulager les douleurs prémenstruelles à 80% et booster la fertilité naturellement en 4 mois, sans hormones de synthèse, avec 30 min/jour de pratique.", score: 89, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Promesse SMDC + précision (80% des douleurs) + cadre méthode." }, history: [] },
  mecanisme: { nom: "Méthode Fitra™", etapes: ["Bilan complet (hormonal, alimentaire, charge mentale, cycle réel)", "Nettoyage hépatique sur 30 jours (alimentation + plantes spécifiques halal)", "Synchronisation cycle ↔ alimentation ↔ sport (4 phases du cycle)", "Phytothérapie ciblée selon le déséquilibre identifié (toutes plantes halal validées)"], score: 87, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme structuré et différencié selon le profil." }, history: [] },
  vehicule: { format: "coaching_groupe_1to1", justification: "Programme 4 mois. Groupe fermé de 30 femmes sur Telegram + 1 live mensuel + 4 sessions 1to1 d'1h avec une naturopathe certifiée musulmane (1 par mois pour ajuster le protocole selon les retours). Toutes les plantes recommandées sont halal et validées par un comité scharia.", validated: true },
  bonus: { items: [
    { nom: "Bilan biologique offert (kit prélèvement à domicile + analyses + lecture)", valeur: "247€", raison: "Beaucoup de femmes n'ont jamais eu de bilan hormonal complet. On pose un diagnostic objectif avant d'agir." },
    { nom: "80 recettes par phase de cycle (folliculaire, ovulatoire, lutéale, menstruelle)", valeur: "97€", raison: "Tu manges ce qui soutient ton corps à chaque phase. Plus de fringales sucre ni de SPM décuplé par l'alimentation." },
    { nom: "Livret duas et roqya pour la fertilité (validé par un imam)", valeur: "Inclus", raison: "Le pilier spirituel a sa place. Pour les soeurs qui le souhaitent, on intègre la dimension foi à la dimension corps." },
  ], score: 89, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus alignent corps + science + foi · valeur perçue très forte." }, history: [] },
  garantie: { type: "continuite", formulation: "Si après 4 mois ton cycle n'est pas plus régulier (variation < 5 jours) et que tes douleurs prémenstruelles ne sont pas significativement réduites (échelle objective), je continue à t'accompagner gratuitement jusqu'à régularisation complète, et tu gardes l'accès aux 1to1 jusqu'à 6 mois supplémentaires.", score: 87, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Garantie continuité avec critères objectifs (variation < 5j) — pas de promesse magique." }, history: [] },
  urgence: { type: "cohorte_limitee", justification: "30 places maximum par cohorte. Les 4 sessions 1to1 d'1h chacune avec la naturopathe + le suivi des protocoles individuels imposent une capacité limitée. Prochaine cohorte dans 4 mois.", score: 81, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Capacité d'accompagnement personnalisé limitée, justifiée." }, history: [] },
  prix: {
    montant: "997",
    leviers: {
      resultat:    { score: 90, justification: "Cycle régulier + SPM divisé par 5 + chance grossesse augmentée = transformation très forte pour la cible. Levier rêve maximal pour une femme en parcours bébé." },
      probabilite: { score: 87, justification: "Bilan biologique objectif + 4 sessions 1to1 + protocole individualisé + naturopathe certifiée = méthode très crédible et personnalisée." },
      delai:       { score: 80, justification: "4 mois c'est cohérent avec un cycle féminin (3-4 cycles complets) mais peut paraître long pour une femme qui souffre depuis 14 mois." },
      effort:      { score: 78, justification: "Protocole alimentaire à suivre + plantes à prendre + journal de cycle + 1to1 mensuel = engagement fort. Pas de raccourci." },
    },
    levier_faible: "effort", alignements: { format: true, cible: true, ancrage: true },
    score: 84, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Positionnement validé · 997€ aligné · cible motivée prête à investir pour sa santé reproductive." }, history: [],
  },
};

// ── Reset alimentaire post-Ramadan ────────────────────────────────────────
const RESET_RAMADAN_PATCH: Partial<M3State> = {
  current_step: "promesse", market_type: "b2c_info",
  m1_data: {
    source: "demo_reset_post_ramadan",
    sous_niche_2: {
      phrase_finale: "Hommes et femmes musulmans 25-50 ans qui veulent éviter la reprise de poids post-Ramadan et repartir sur des bases saines en 30 jours",
      cible: "Musulmans 25-50 ans (H/F), pratiquants qui font Ramadan tous les ans, qui ont l'expérience d'un Aïd qui efface le bénéfice du jeûne en 1 semaine, et qui veulent un protocole simple post-fêtes",
      douleur: "Tout le bénéfice du Ramadan effacé en 1 semaine de fêtes, fatigue digestive, reprise de poids systématique, démotivation, ne savent pas par où reprendre une alimentation saine sans frustration",
      methode: "Reset 30 Jours™ : repartir sur des bases saines après le Ramadan avec -3 à -6 kg, énergie retrouvée et 3 habitudes ancrées",
    },
    avatar: { socio: { nom: "Brahim", age: "39 ans", situation: "Cadre commercial à Toulouse, 4 200€/mois, marié 2 enfants. À chaque post-Ramadan il reprend les 3 kg perdus pendant le mois en moins de 10 jours. Il ne sait pas comment 'décrocher' des fêtes." } },
    marche: { id: "sante", label: "🌱 Santé" },
  },
  m2_data: null,
  promesse: { text: "Repartir sur des bases saines en 30 jours après le Ramadan : -3 à -6 kg, énergie retrouvée, et 3 bonnes habitudes alimentaires ancrées pour ne plus reprendre.", score: 88, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Promesse claire · résultat chiffré + délai serré + bénéfice durable." }, history: [] },
  mecanisme: { nom: "Reset 30 Jours™", etapes: ["Jeûne intermittent halal personnalisé selon le profil (semaines 1)", "Nettoyage 7 jours (alimentation simplifiée + plantes spécifiques + hijama optionnelle)", "Réintroduction graduelle des aliments (semaines 2-3)", "Ancrage de 3 habitudes durables avant le retour à la 'vie normale'"], score: 86, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Mécanisme progressif · cohérent avec la physiologie post-jeûne." }, history: [] },
  vehicule: { format: "programme_video", justification: "Programme vidéo 4 semaines, 16 modules courts (10-15min), démarrage groupé sur les 2 semaines suivant l'Aïd. Lives bi-hebdomadaires (mardi/vendredi 21h) pendant 4 semaines + coach WhatsApp pour les questions urgentes (réponse sous 12h).", validated: true },
  bonus: { items: [
    { nom: "30 menus complets + listes de courses halal hebdomadaires", valeur: "47€", raison: "Tu sais exactement quoi acheter et quoi manger chaque jour. Aucune décision à prendre dans la fatigue, donc aucun écart." },
    { nom: "Kit détox à recevoir chez toi (curcuma bio, gingembre frais, citron, infusion drainage)", valeur: "37€", raison: "Tu démarres concret dès la réception du colis. Pas de friction de courses spécifiques au début." },
    { nom: "E-book hijama post-Ramadan (en partenariat avec un hijamateur certifié)", valeur: "29€", raison: "Pour ceux qui veulent intégrer la sunnah du Prophète ﷺ. Pas obligatoire mais offert." },
  ], score: 84, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Bonus utiles immédiatement · valeur perçue cohérente avec le prix d'entrée." }, history: [] },
  garantie: { type: "continuite", formulation: "Si après 30 jours de programme suivi à 80% (modules vus + menus suivis + journal alimentaire rempli) tu n'as pas perdu au moins 3 kg, je te prolonge l'accès gratuitement pendant 30 jours supplémentaires et je t'accompagne par WhatsApp jusqu'à atteindre l'objectif.", score: 83, attempts: 2, validated: true, forced: false, feedback: { verdict: "✓ Continuité avec conditions actives · 3 kg c'est mesurable." }, history: [] },
  urgence: { type: "fenetre_temporelle", justification: "Le programme démarre uniquement sur les 2 semaines suivant l'Aïd, parce que c'est la fenêtre physiologique où le corps est le plus réceptif (sortie de jeûne récente). Hors de cette fenêtre, le programme perd 40% de son efficacité.", score: 80, attempts: 1, validated: true, forced: false, feedback: { verdict: "✓ Urgence physiologique réelle, pas marketing artificiel." }, history: [] },
  prix: {
    montant: "247",
    leviers: {
      resultat:    { score: 84, justification: "-3 à -6 kg + énergie + 3 habitudes durables = ROI émotionnel et physique évident, surtout en sortant du Ramadan." },
      probabilite: { score: 82, justification: "Mécanisme progressif + menus + kit détox livré + coach WhatsApp = très outillé pour 30 jours. Garantie ajoute la sécurité." },
      delai:       { score: 92, justification: "30 jours, quick-win dès la première semaine (énergie revenue), résultats poids visibles à J15. Délai parfait pour la cible." },
      effort:      { score: 87, justification: "Done-for-you sur les menus + kit détox livré + lives bi-hebdomadaires = très peu de friction. Application directe." },
    },
    levier_faible: "probabilite", alignements: { format: true, cible: true, ancrage: true },
    score: 86, attempts: 1, validated: true, forced: false,
    feedback: { verdict: "✓ Positionnement validé · 247€ low-ticket parfait pour entrée de gamme post-Ramadan." }, history: [],
  },
};

export const M3_DEMO_CASES: M3DemoCase[] = [
  // ─── ARGENT (4) ───
  { key: "cake_design", segment: "argent", emoji: "🎂",
    title: "Cake design haut de gamme",
    summary: "Wedding cakes 600€+ pour cake designers passionnées (B2C transfo · cohorte)",
    ready: true, patch: CAKE_DESIGN_PATCH },
  { key: "closing_high_ticket", segment: "argent", emoji: "💼",
    title: "Closing high-ticket à distance",
    summary: "Vendre des programmes 3-10k€ par téléphone, 100% halal (B2C transfo · cohorte)",
    ready: true, patch: CLOSING_PATCH },
  { key: "immobilier_halal", segment: "argent", emoji: "🏘",
    title: "Immobilier locatif halal sans crédit",
    summary: "Bailleur sans crédit conventionnel (B2C info · hybride 6 mois)",
    ready: true, patch: IMMO_HALAL_PATCH },
  { key: "agence_seo_local", segment: "argent", emoji: "📍",
    title: "Agence SEO local pour commerçants musulmans",
    summary: "B2B service récurrent · ramener des clients aux restos halal et boutiques modestes",
    ready: true, patch: SEO_LOCAL_PATCH },
  // ─── RELATIONS (3) ───
  { key: "preparation_mariage", segment: "relations", emoji: "💍",
    title: "Préparation au mariage pour sœurs",
    summary: "Sœurs en quête de mariage halal serein (B2C transfo · cohorte 6 mois)",
    ready: true, patch: MARIAGE_PATCH },
  { key: "parentalite_islamique", segment: "relations", emoji: "👶",
    title: "Parentalité islamique 3-12 ans",
    summary: "Mamans qui veulent éduquer dans le calme + la sunnah (B2C transfo · programme vidéo 8 sem)",
    ready: true, patch: PARENTALITE_PATCH },
  { key: "sortir_dependance", segment: "relations", emoji: "🌿",
    title: "Sortir de la dépendance affective",
    summary: "Femmes en sortie de rupture qui veulent retrouver leur sakina (B2C transfo · 90j)",
    ready: true, patch: DEPENDANCE_PATCH },
  // ─── SANTÉ (3) ───
  { key: "remise_en_forme_pudique", segment: "sante", emoji: "💪",
    title: "Remise en forme pudique à domicile",
    summary: "Programme sport halal pour sœurs voilées qui ne fréquentent pas les salles mixtes (B2C transfo · 12 sem)",
    ready: true, patch: REMISE_FORME_PATCH },
  { key: "cycle_feminin", segment: "sante", emoji: "🌙",
    title: "Cycle féminin & fertilité naturelle",
    summary: "Naturopathie pour sœurs en parcours bébé ou règles douloureuses (B2C transfo · 4 mois)",
    ready: true, patch: CYCLE_FEMININ_PATCH },
  { key: "reset_post_ramadan", segment: "sante", emoji: "🍽",
    title: "Reset alimentaire post-Ramadan",
    summary: "Détox + rééquilibrage 30 jours, lutte contre la reprise post-fêtes (B2C info · 4 semaines)",
    ready: true, patch: RESET_RAMADAN_PATCH },
];
