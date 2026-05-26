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
    summary: "Sœurs en quête de mariage halal serein (B2C transfo · cohorte 12 sem)",
    ready: false },
  { key: "parentalite_islamique", segment: "relations", emoji: "👶",
    title: "Parentalité islamique 3-12 ans",
    summary: "Mamans qui veulent éduquer dans le calme + la sunnah (B2C transfo · cohorte)",
    ready: false },
  { key: "sortir_dependance", segment: "relations", emoji: "🌿",
    title: "Sortir de la dépendance affective",
    summary: "Femmes en sortie de relation toxique qui veulent retrouver leur sakina (B2C transfo)",
    ready: false },
  // ─── SANTÉ (3) ───
  { key: "remise_en_forme_pudique", segment: "sante", emoji: "💪",
    title: "Remise en forme pudique à domicile",
    summary: "Programme sport halal pour sœurs voilées qui ne fréquentent pas les salles mixtes",
    ready: false },
  { key: "cycle_feminin", segment: "sante", emoji: "🌙",
    title: "Cycle féminin & fertilité naturelle",
    summary: "Méthodes naturelles compatibles avec la pratique musulmane (B2C transfo · cohorte)",
    ready: false },
  { key: "reset_post_ramadan", segment: "sante", emoji: "🍽",
    title: "Reset alimentaire post-Ramadan",
    summary: "Programme intensif 30 jours pour stabiliser le poids post-Ramadan (B2C transfo)",
    ready: false },
];
