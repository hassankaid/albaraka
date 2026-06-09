/**
 * Leçons rédigées à la main par démo/module (port verbatim Sidali v1.5.0).
 * Clés alignées sur `${demoId}_${moduleId}` (Mehdi mm*, Mounia&Anas mma* — alignés
 * sur les ids de modules pour que les 10 démos exploitent leurs leçons bespoke).
 */
type RawLecon = { titre: string; angle: string; duree_min: string; active_recall: string };

export const LECONS_BY_DEMO_MODULE: Record<string, RawLecon[]> = {
  // === KARIM ===
  karim_mk1: [
    { titre: "Trois traits d'une niche qui paie", angle: "Les 3 critères non-négociables : taille de marché ≥ 10k personnes, pouvoir d'achat documenté, douleur urgente reconnue. Exemples halal/non-halal contrastés.", duree_min: "10", active_recall: "Reformule en une phrase les 3 critères et applique-les à 3 niches que tu as en tête." },
    { titre: "Interviewer 5 personnes en 7 jours", angle: "Script d'interview de 20 min, plateformes pour recruter (Instagram, WhatsApp, Reddit), gestion des biais de complaisance. Démonstration sur un cas réel anonymisé.", duree_min: "15", active_recall: "Avant la suite, rédige ton script d'interview personnalisé et liste 10 personnes à contacter." },
    { titre: "Trancher entre 2-3 niches concurrentes", angle: "Grille de scoring en 10 critères pour comparer des candidates de niche. Sortie : une niche choisie en 3 mots avec preuve à l'appui.", duree_min: "12", active_recall: "Note les 3 critères qui ont le plus pesé dans ton arbitrage final." },
    { titre: "Valider sa niche avant d'investir", angle: "Test du \"j'achèterais demain à ce prix\" sur 3 prospects qualifiés. Procédure d'itération si moins de 1/3 mord. Quand abandonner et repivoter.", duree_min: "8", active_recall: "" },
  ],
  karim_mk2: [
    { titre: "Promesse mesurable, mécanisme unique", angle: "Formule canonique de la promesse high-ticket : résultat chiffré + délai + condition. Comment dériver un mécanisme unique défendable face à la concurrence.", duree_min: "14", active_recall: "Écris ta promesse en 1 phrase avec un nombre, un délai et une condition." },
    { titre: "Construire ta garantie de résultat", angle: "Les 3 types de garantie HT : conditionnelle, inconditionnelle, hybride. Quand chacune protège le client sans te ruiner. Cadre juridique français.", duree_min: "12", active_recall: "Rédige ta clause de garantie en une phrase qui passerait devant un avocat." },
    { titre: "BAO et stack de valeur", angle: "Architecture Bronze/Argent/Or en 3 paliers. Calibrage des inclusions pour pousser l'Argent ou l'Or. Calcul de la valeur perçue vs prix demandé.", duree_min: "16", active_recall: "Liste les 5-8 éléments de ton offre Or et chiffre la valeur perçue de chacun." },
    { titre: "Test prix en conditions réelles", angle: "Méthode du \"j'achète à ce prix\" sur 5 prospects qualifiés. Lecture des objections-type. Quand monter le prix et quand affiner la promesse.", duree_min: "18", active_recall: "" },
  ],
  karim_mk3: [
    { titre: "Calendrier de contenu 30 jours", angle: "Structure 4 piliers (autorité, vulnérabilité, méthode, preuve) × 8 posts/semaine. Variation des formats vidéo/carrousel/story. Cas Karim démonté minute par minute.", duree_min: "12", active_recall: "Écris tes 4 piliers personnalisés et 3 sujets par pilier." },
    { titre: "Hooks et premières 3 secondes", angle: "Bibliothèque des 12 hooks qui retiennent : promesse, contradiction, chiffre, question, vulnérabilité. Tests A/B sur tes 5 derniers posts.", duree_min: "14", active_recall: "Réécris tes 3 derniers posts avec 3 hooks différents et compare." },
    { titre: "DM setting structuré", angle: "Le flow en 4 étapes : trigger, qualification, build-up, close du call. Scripts adaptés au franco-arabe musulman. Anti-patterns du DM trop vendeur.", duree_min: "14", active_recall: "" },
    { titre: "Tracker les KPI hebdo", angle: "Tableau de bord à 5 KPI : vues, taux d'engagement, DM initiés, calls bookés, taux de transformation. Lecture des signaux et arbitrages mensuels.", duree_min: "10", active_recall: "Liste tes 5 KPI et leur seuil mensuel cible." },
  ],
  karim_mk4: [
    { titre: "Anatomie d'un appel de 60-90 min", angle: "Les 6 phases : rapport, douleur, vision, mécanisme, prix, close. Timing par phase. Erreurs qui font tomber le taux de transformation sous 10%.", duree_min: "15", active_recall: "Découpe ton dernier call enregistré en 6 phases et chiffre le temps de chacune." },
    { titre: "Les 12 objections high-ticket et leurs traitements", angle: "Bibliothèque complète : prix, conjoint, temps, dette, doute, conformité halal. Réponses-types validées sur 100+ calls. Distinction objection sincère vs prétexte.", duree_min: "18", active_recall: "Choisis 3 objections que tu rencontres le plus et écris ta réponse-type à chacune." },
    { titre: "Pratique en rôle-play avec debrief", angle: "Protocole d'entraînement en binôme : 3 calls de 30 min/semaine avec enregistrement audio. Grille d'évaluation en 15 critères. Plan de progression.", duree_min: "14", active_recall: "" },
    { titre: "Mesurer et améliorer ton taux", angle: "Calcul du book-to-show, show-to-close, close-to-paid. Diagnostic par étape si le taux global est sous 20%. Quand re-filmer le call type.", duree_min: "8", active_recall: "Calcule tes 3 ratios sur tes 10 derniers calls." },
  ],
  // === IMEN ===
  imen_mi1: [
    { titre: "Les 5 cuissons de base", angle: "Démonstration en cuisine des 5 cuissons : sauté, mijoté, grillé, vapeur, four. Points de vigilance halal (provenance, ustensiles). Erreurs classiques montrées.", duree_min: "12", active_recall: "Liste les 5 cuissons et le plat-type associé à chacune dans ta cuisine." },
    { titre: "Les 4 sauces mères halal", angle: "Hollandaise, béchamel, tomate, vinaigrette : ratios, températures, points de bascule. Substitutions halal pour les recettes au vin ou au porc.", duree_min: "14", active_recall: "Réalise les 4 sauces dans la semaine et photographie le résultat." },
    { titre: "Assemblage et mise en pratique", angle: "Trois plats simples combinant les techniques apprises. Vidéo plan de travail. Checklist du débutant pour ne rien oublier.", duree_min: "14", active_recall: "" },
  ],
  imen_mi2: [
    { titre: "Architecture d'un menu 3 services", angle: "Équilibre entrée-plat-dessert : textures, saveurs, lourdeur. Règle du dessert qui rachète tout. Exemples de menus saison par saison.", duree_min: "10", active_recall: "Compose 3 menus pour 8 personnes adaptés à 3 saisons différentes." },
    { titre: "Planning de cuisson minuté", angle: "Outil de planning rétro-temporel : du moment où tu sers à rebours. Identification des plats à préparer la veille, le matin, à la dernière minute.", duree_min: "12", active_recall: "Établis ton planning minuté pour un menu de ton choix." },
    { titre: "Liste de courses optimisée", angle: "Méthode pour grouper les achats par circuit halal, marché, supermarché. Anti-gaspillage et batch-cooking. Budget moyen pour 8 couverts.", duree_min: "13", active_recall: "" },
  ],
  imen_mi3: [
    { titre: "Tarte aux fruits façon pro", angle: "Pâte sablée parfaite, crème pâtissière sans œuf cru, dressage fruits saison. Astuces dressage instagrammable.", duree_min: "18", active_recall: "Réalise la tarte et photographie en plongée et en biais." },
    { titre: "Entremets chocolat 3 textures", angle: "Biscuit, ganache, mousse : maîtrise des températures et des prises. Substitution alcool par sirops aromatiques. Démonstration de A à Z.", duree_min: "20", active_recall: "Documente ta réalisation avec photo de chaque étape." },
    { titre: "Mignardises pour réception", angle: "Cinq mignardises rapides à dresser élégamment. Dressage à l'assiette ou au plateau. Conservation 24-48h sans perte de qualité.", duree_min: "12", active_recall: "" },
  ],
  imen_mi4: [
    { titre: "Planning minuté sans stress", angle: "Méthode des 3 zones temporelles : H-24, H-3, H-30 min. Délégation possible et ce qui doit rester en ta main. Anti-paniques.", duree_min: "10", active_recall: "Re-fais ton planning H-24 pour ton prochain repas réel." },
    { titre: "Mise en place et organisation cuisine", angle: "Setup de plan de travail efficace. Ustensiles à sortir avant, matériel à prêter. Hygiène et sécurité en pression.", duree_min: "10", active_recall: "" },
    { titre: "Gérer un imprévu en cuisine", angle: "Que faire si une cuisson rate, si tu manques d'un ingrédient, si un invité a une intolérance non prévue. Plans B documentés.", duree_min: "10", active_recall: "Liste 3 incidents possibles et ta réponse pour chacun." },
  ],
  // === KHADIJA ===
  khadija_mkh1: [
    { titre: "Bio qui filtre dès la première ligne", angle: "Structure de bio en 4 lignes : qui tu es, ce que tu cherches, tes non-négociables, ton ouverture au sérieux. Pudeur et clarté combinées.", duree_min: "12", active_recall: "Rédige ta bio en 4 lignes en suivant la structure." },
    { titre: "Choisir tes 3 photos", angle: "Critères de photos qui attirent les hommes sérieux : naturel, sourire, contexte de vie. Anti-patterns à éviter. Validation par 3 femmes mariées de ton entourage.", duree_min: "10", active_recall: "Choisis tes 3 photos et fais-les valider avant publication." },
    { titre: "Définir tes non-négociables", angle: "Liste des 5-7 critères non-négociables (deen, projet familial, mobilité, finances, valeurs). Différence entre non-négo et préférences.", duree_min: "10", active_recall: "" },
    { titre: "Choisir tes 2 apps avec discernement", angle: "Comparatif des 5 apps disponibles : public, sérieux, modération halal. Quelles 2 prioriser selon ton profil. Premiers réglages.", duree_min: "8", active_recall: "Crée tes 2 profils et fais une première vague de 10 likes ciblés." },
  ],
  khadija_mkh2: [
    { titre: "Bons et mauvais signaux dès le premier message", angle: "Grille de lecture : 5 signaux verts et 5 rouges sur les 3 premiers échanges. Quand poursuivre, quand couper court.", duree_min: "12", active_recall: "Relis tes 3 dernières conversations et applique la grille." },
    { titre: "Le cadre familial dès la 2e conversation", angle: "Comment proposer l'inclusion d'un wali / des familles tôt sans braquer. Formulation type. Quand c'est rédhibitoire qu'il refuse.", duree_min: "15", active_recall: "Rédige ta formulation type pour proposer l'inclusion famille." },
    { titre: "Questions de qualification en 30 min", angle: "Les 12 questions à poser avant de proposer une rencontre. Ordre stratégique. Réponses-rouges qui closent le dossier.", duree_min: "13", active_recall: "" },
  ],
  khadija_mkh3: [
    { titre: "Patterns familiaux qui se rejouent", angle: "Analyse des 3 patterns les plus fréquents (parent absent, parent étouffant, modèle conflictuel). Comment ils se traduisent dans tes choix actuels.", duree_min: "14", active_recall: "Identifie ton pattern dominant et donne 2 exemples concrets de manifestation." },
    { titre: "Patterns relationnels actuels à observer", angle: "Roue des comportements en couple : attente, fuite, contrôle, agression passive. Auto-diagnostic en 10 questions.", duree_min: "12", active_recall: "Remplis le diagnostic et identifie tes 2 comportements dominants." },
    { titre: "Plan de rééducation comportementale", angle: "Méthode pour remplacer un pattern destructeur par une réponse alternative. Suivi sur 30 jours.", duree_min: "10", active_recall: "" },
  ],
  khadija_mkh4: [
    { titre: "Projet de vie cohérent à 5 ans", angle: "Tableau de projection en 6 axes : famille, finances, mobilité, deen, carrière, loisirs. Comment l'écrire en couple sans s'imposer.", duree_min: "12", active_recall: "Remplis ton tableau à 5 ans pour les 6 axes." },
    { titre: "Compatibilité projet à projet", angle: "Grille de comparaison ton projet vs son projet sur les 6 axes. Quand un écart est rédhibitoire vs négociable.", duree_min: "12", active_recall: "" },
    { titre: "Décisions structurantes pré-mariage", angle: "Les 8 conversations difficiles à avoir avant l'engagement : enfants, parents âgés, finances, mobilité, vie sociale. Cadre de discussion.", duree_min: "14", active_recall: "Liste les 8 conversations et planifie au moins 2 dans le mois." },
  ],
  khadija_mkh5: [
    { titre: "Décision halal en conscience", angle: "Méthode du istikhara + consultation famille + analyse rationnelle. Comment combiner les 3 sans renier l'un. Cas de figure.", duree_min: "12", active_recall: "Si tu es en réflexion sur un prétendant, applique les 3 méthodes cette semaine." },
    { titre: "Engagement et étapes pratiques", angle: "Du khotba au mariage : étapes, durées moyennes, points de vigilance. Erreurs qui retardent ou cassent les processus.", duree_min: "10", active_recall: "" },
    { titre: "Préparation du mariage serein", angle: "Liste des tâches J-90 à J-1. Gestion des familles, des budgets, des invités. Anti-stress.", duree_min: "13", active_recall: "Établis ta to-do J-90 pour ton mariage projeté." },
  ],
  // === AÏCHA & TAREK ===
  aicha_tarek_mat1: [
    { titre: "Audit complet à 360°", angle: "Inventaire revenus, dettes, épargne, biens, charges. Outil de consolidation en 1h. Posture de transparence sans jugement.", duree_min: "15", active_recall: "Remplis ton tableau de bord financier de couple." },
    { titre: "Identifier les fuites halal", angle: "Repérage des produits non-halal cachés (assurance vie, livret A, certains fonds). Critères clairs. Étapes pour assainir.", duree_min: "14", active_recall: "Liste tes 3-5 produits à requalifier ou clôturer." },
    { titre: "Définir vos objectifs communs", angle: "Méthode pour aligner objectifs à 1, 5 et 10 ans. Gestion des désaccords. Priorisation par poids financier.", duree_min: "11", active_recall: "" },
  ],
  aicha_tarek_mat2: [
    { titre: "Les 4 véhicules halal en France", angle: "Comptes courants, fonds halal certifiés, or physique, immobilier. Avantages/inconvénients fiscaux. Allocation type selon âge.", duree_min: "16", active_recall: "Définis ton allocation cible en pourcentage des 4 véhicules." },
    { titre: "Construire un coussin de sécurité", angle: "Calcul du coussin idéal (3-6 mois de charges). Où le placer en restant halal. Combien temps pour le constituer.", duree_min: "12", active_recall: "Calcule ton coussin cible et ton délai réaliste." },
    { titre: "Plan d'épargne mensuel", angle: "Méthode des enveloppes virtuelles. Automatisation des virements. Suivi mensuel à 2.", duree_min: "12", active_recall: "" },
    { titre: "Pivoter en cas d'imprévu", angle: "Que faire si un revenu chute, si un poste de dépense explose. Plans B documentés.", duree_min: "10", active_recall: "Liste 3 imprévus possibles et ta réponse pour chacun." },
  ],
  aicha_tarek_mat3: [
    { titre: "Pourquoi l'immo halal et comment", angle: "Financement participatif halal (Murabaha, Ijara), achat comptant, SCI familiale. Comparatif. Cadre fiscal français.", duree_min: "18", active_recall: "Identifie le mode de financement adapté à votre situation." },
    { titre: "Sélectionner le bien rentable", angle: "Critères : emplacement, rentabilité brute, état, copropriété. Grille de notation. Pièges du débutant.", duree_min: "15", active_recall: "Analyse un bien concret avec la grille." },
    { titre: "Négocier et finaliser l'acquisition", angle: "Méthode de négo, étapes notariées, suivi post-achat. Documents à conserver.", duree_min: "12", active_recall: "" },
  ],
  aicha_tarek_mat4: [
    { titre: "Diversifier votre patrimoine sur 10 ans", angle: "Allocation cible par tranche d'âge. Rebalancing annuel. Anti-pattern de la sur-concentration.", duree_min: "14", active_recall: "Trace ta trajectoire patrimoniale à 10 ans en pourcentage par classe d'actif." },
    { titre: "Cadre successoral islamique", angle: "Faraid pour les couples mariés avec/sans enfants. Testament islamique en France. Limites légales et solutions.", duree_min: "14", active_recall: "Esquisse ton testament en respectant le faraid." },
    { titre: "Transmettre de son vivant", angle: "Donations, démembrement, assurance-vie halal. Quand commencer, à qui, combien. Aspects fiscaux.", duree_min: "12", active_recall: "" },
  ],
  // === NAJET ===
  najet_mn1: [
    { titre: "Lire les 8 KPI critiques en 30 min", angle: "Conversion, AOV, LTV, CAC, ROAS, taux de rétention, marge brute, taux d'abandon panier. Lecture croisée et signaux faibles.", duree_min: "14", active_recall: "Récupère les 8 KPI sur 1 site client réel et donne ton diagnostic en 1 paragraphe." },
    { titre: "Décortiquer le funnel de A à Z", angle: "Cartographie complète : acquisition → landing → produit → panier → checkout → post-achat. Identification des points de fuite.", duree_min: "16", active_recall: "Trace le funnel d'un site client avec les chiffres réels à chaque étape." },
    { titre: "Diagnostic UX et photo produit", angle: "Méthode de check UX en 12 critères. Photo produit : angles, lumière, contexte. Cas avant/après.", duree_min: "14", active_recall: "" },
    { titre: "Restitution diagnostic au client", angle: "Structure d'un rapport en 10 pages. Présentation orale en 45 min. Posture consultant senior.", duree_min: "11", active_recall: "Rédige le sommaire de ton rapport type." },
  ],
  najet_mn2: [
    { titre: "Optimisations CR à fort impact", angle: "Les 8 leviers qui montent le taux de conversion en moins de 30 jours : urgency, social proof, simplification checkout, options de paiement, photos.", duree_min: "15", active_recall: "Sélectionne les 3 leviers prioritaires pour un site client." },
    { titre: "A/B testing en 30 jours", angle: "Setup d'un test, durée minimale, taille d'échantillon. Outils (Google Optimize, VWO). Anti-pattern du test trop court.", duree_min: "14", active_recall: "Configure 1 test A/B avec son hypothèse et son seuil de validation." },
    { titre: "Rétention et email post-achat", angle: "Séquence email 90 jours : welcome, cross-sell, abandon panier, win-back. Templates franco-arabes.", duree_min: "13", active_recall: "" },
    { titre: "Suivi et reporting client mensuel", angle: "Tableau de bord en 5 KPI. Réunion mensuelle de 30 min. Comment vendre la valeur du suivi.", duree_min: "11", active_recall: "Construis ton template de report mensuel." },
  ],
  najet_mn3: [
    { titre: "Architecture campagnes Meta/Google", angle: "Structure de campagne par étape du funnel. Budgets de test vs scale. Ciblage et exclusions.", duree_min: "16", active_recall: "Esquisse l'architecture des campagnes pour 1 client réel." },
    { titre: "Optimisation des créas vidéo", angle: "Les 5 formats qui scalent : témoignage, démo, UGC, comparatif, before/after. Production maison vs externalisée.", duree_min: "14", active_recall: "Liste les 3 créas à tester en priorité ce mois-ci." },
    { titre: "Lecture des dashboards et arbitrages", angle: "Lecture quotidienne en 15 min. Quand couper, quand booster, quand changer la créa. Seuils de décision.", duree_min: "13", active_recall: "" },
  ],
  najet_mn4: [
    { titre: "Diagnostic des signaux de pivot", angle: "Quand un client doit pivoter de produit, de niche, de modèle. Signaux quantitatifs et qualitatifs. Cas réels.", duree_min: "14", active_recall: "Évalue 1 client sur les signaux de pivot et formule ta recommandation." },
    { titre: "Recommandation et roadmap pivot", angle: "Structure d'une reco en 5 slides. Roadmap 90 jours avec étapes mesurables. Gestion des objections du dirigeant.", duree_min: "14", active_recall: "Rédige ta reco type sur 5 slides." },
    { titre: "Accompagner le pivot dans la durée", angle: "Suivi hebdo pendant 90 jours, ajustement mensuel. Quand renoncer et rebrousser chemin.", duree_min: "11", active_recall: "" },
  ],
  najet_mn5: [
    { titre: "Pricing du consulting senior", angle: "TJM, forfait, success fee, retainer. Quand utiliser quoi. Repères de marché par niveau senior.", duree_min: "12", active_recall: "Construis ta grille tarifaire à 3 paliers." },
    { titre: "Démarche commerciale en 5 calls", angle: "Discovery → audit → proposition → négo → close. Templates de mails et de slides. Délais types.", duree_min: "14", active_recall: "Esquisse ta séquence type sur 5 calls." },
    { titre: "Closing et signature de mission", angle: "Documents juridiques : contrat, clauses, paiement. Comment closer un retainer 5k€/mois sans pression.", duree_min: "12", active_recall: "" },
  ],
  // === SALIMA ===
  salima_ms1: [
    { titre: "Analyser les 3 patterns de tension", angle: "Cri du parent, opposition de l'enfant, conflit fratrie. Causes profondes vs causes apparentes. Diagnostic en 7 questions.", duree_min: "14", active_recall: "Réponds aux 7 questions pour ta famille et identifie ton pattern dominant." },
    { titre: "Roue des comportements parents-enfants", angle: "Modèle relationnel : autoritaire, permissif, négligent, équilibré. Auto-positionnement et bascules contextuelles.", duree_min: "12", active_recall: "Positionne-toi sur la roue pour chacun de tes enfants." },
    { titre: "Plan d'observation 7 jours", angle: "Journal d'observation sans intervention. Comment poser les bases d'un changement durable sans précipitation.", duree_min: "10", active_recall: "" },
  ],
  salima_ms2: [
    { titre: "Sortir de la spirale du cri", angle: "Pourquoi crier ne marche pas et pourquoi on le fait quand même. 3 alternatives concrètes en situation tendue.", duree_min: "12", active_recall: "Pendant 7 jours, note chaque cri et son contexte. Identifie ton trigger principal." },
    { titre: "Cadre sécurisant : règles non-négociables", angle: "Maximum 5 règles non-négociables claires pour toute la fratrie. Comment les annoncer, les rappeler, les sanctionner.", duree_min: "13", active_recall: "Établis tes 5 règles non-négociables et affiche-les." },
    { titre: "Réparation après un dérapage", angle: "Comment se reprendre après avoir crié ou puni de façon injuste. Modèle de réparation en 4 étapes.", duree_min: "10", active_recall: "" },
  ],
  salima_ms3: [
    { titre: "Gérer la crise du jeune enfant", angle: "Crises 2-6 ans : reconnaître, désamorcer, accompagner. Pourquoi céder vaut parfois mieux que durcir.", duree_min: "12", active_recall: "Mets en pratique la grille de désamorçage sur 1 crise cette semaine." },
    { titre: "Gérer l'opposition de l'enfant 7-12 ans", angle: "Conflits autour des écrans, des devoirs, du rangement. Méthode des choix limités. Quand sanctionner.", duree_min: "12", active_recall: "Liste 3 conflits récurrents et applique la méthode des choix limités." },
    { titre: "Gérer le conflit entre frères et sœurs", angle: "Ne pas arbitrer : enseigner la résolution autonome. Outil du conseil de famille hebdomadaire.", duree_min: "11", active_recall: "" },
  ],
  salima_ms4: [
    { titre: "Rituels familiaux qui rapprochent", angle: "Salat en famille, dou'a du matin, lecture courte. Calibrage par âge. Anti-pattern de la contrainte qui dégoûte.", duree_min: "12", active_recall: "Choisis 2 rituels à instaurer cette semaine." },
    { titre: "Transmettre la valeur sans imposer", angle: "Méthode de la \"graine plantée\" : exemple, conversation, choix offert. Comment réagir au refus d'un ado.", duree_min: "14", active_recall: "Identifie 1 valeur à transmettre et trace ton plan en 3 étapes." },
    { titre: "Évaluer la dynamique familiale", angle: "Indicateurs simples du climat familial : qualité du dialogue, fréquence des conflits, joie partagée. Auto-évaluation mensuelle.", duree_min: "10", active_recall: "Remplis ta grille d'auto-évaluation famille ce mois-ci." },
  ],
  // === MEHDI (clés alignées mm*) ===
  mehdi_mm1: [
    { titre: "Les 6 phases d'un call qui convertit", angle: "Rapport, douleur, vision, mécanisme, prix, close. Timing par phase. Erreurs qui font tomber le taux sous 10%.", duree_min: "14", active_recall: "Découpe un de tes calls enregistrés en 6 phases et identifie ta phase faible." },
    { titre: "Scripts adaptés au profil musulman", angle: "Tournures qui résonnent : usage du dou'a, mention de baraka, respect des contraintes halal. Anti-patterns du closer occidental copié.", duree_min: "12", active_recall: "Réécris 3 transitions de ton script pour les adapter." },
    { titre: "Mesure du taux et ajustements", angle: "Calcul book-to-show, show-to-close. Diagnostic par étape. Quand re-filmer ton call type.", duree_min: "10", active_recall: "" },
  ],
  mehdi_mm2: [
    { titre: "Les 8 objections spécifiques au halal", angle: "Conformité, doute religieux, dette riba, autorisation conjoint, scepticisme communauté. Réponses-type sourcées.", duree_min: "15", active_recall: "Choisis tes 3 objections les plus fréquentes et écris ta réponse-type." },
    { titre: "Distinguer objection sincère vs prétexte", angle: "Lecture des signaux non-verbaux et verbaux. Quand creuser, quand passer. Trame de questions.", duree_min: "12", active_recall: "Sur tes 5 derniers calls, classe les objections en sincères vs prétextes." },
    { titre: "Annoncer un prix high-ticket sereinement", angle: "Posture, timing, formulation. Pourquoi le prix annoncé trop tôt tue le call. Méthode de l'ancrage.", duree_min: "11", active_recall: "Re-formule ton annonce de prix selon la méthode." },
    { titre: "Closer sans pression vendeuse", angle: "Techniques d'engagement progressif. Comment proposer la signature sans braquer. Suivi 48h post-call.", duree_min: "12", active_recall: "" },
  ],
  mehdi_mm3: [
    { titre: "Protocole d'entraînement hebdo", angle: "Binôme, enregistrement, grille en 15 critères, debrief structuré. 3 calls de 30 min/semaine pendant 8 semaines.", duree_min: "12", active_recall: "Trouve ton binôme et planifie les 3 premiers calls." },
    { titre: "Recevoir et donner du feedback constructif", angle: "Méthode du feedback en 4 phases : observation, impact, alternative, ré-essai. Anti-pattern du jugement.", duree_min: "11", active_recall: "Pratique le feedback sur un cas avec ton binôme." },
    { titre: "Suivre sa progression sur 60 jours", angle: "Tableau de bord : taux, score moyen sur grille, points de vigilance. Lecture mensuelle pour ajustements.", duree_min: "10", active_recall: "" },
    { titre: "Mesurer son taux en conditions réelles", angle: "Tracker ses 30 derniers calls. Cible 25%+ pour high-ticket. Plan d'action si sous-performant.", duree_min: "10", active_recall: "Calcule ton taux sur les 30 derniers et fixe ton objectif." },
  ],
  mehdi_mm4: [
    { titre: "Trouver et qualifier des entreprises clientes", angle: "Où chercher (LinkedIn, communautés, recommandation), comment qualifier (volume calls, niche, structure de commission).", duree_min: "14", active_recall: "Liste 20 entreprises à prospecter et qualifie-les avec la grille." },
    { titre: "Pitcher tes services de closer", angle: "Structure de pitch en 5 min. Garantie de résultat. Comment justifier ton % de commission.", duree_min: "12", active_recall: "Enregistre ton pitch en 5 min et compare à la structure." },
    { titre: "Signer ton premier contrat et démarrer", angle: "Aspects juridiques (auto-entreprise, statut), période d'essai, modalités de paiement. Onboarding chez le client.", duree_min: "13", active_recall: "" },
  ],
  // === MOUNIA & ANAS (clés alignées mma*) ===
  mounia_anas_mma1: [
    { titre: "Audit financier et opérationnel", angle: "CA, marge brute, marge nette par client. Taux d'occupation des équipes. Pricing vs valeur livrée.", duree_min: "16", active_recall: "Réalise ton audit en 1h avec le template fourni." },
    { titre: "Diagnostic positionnement et niche", angle: "Trop large vs trop étroit. Critères de niche profitable. Cas d'agences qui ont pivoté avec succès.", duree_min: "14", active_recall: "Note ton positionnement actuel et 3 niches plus précises possibles." },
    { titre: "Restituer le diagnostic à l'associé", angle: "Structure de présentation à un cofondateur. Gestion du désaccord constructif. Décisions à acter en commun.", duree_min: "12", active_recall: "" },
  ],
  mounia_anas_mma2: [
    { titre: "Cartographier les 5 leviers de croissance", angle: "Acquisition, conversion, panier moyen, fréquence, rétention. Calcul d'impact par levier. Priorisation.", duree_min: "14", active_recall: "Classe tes 5 leviers par ROI estimé sur 90 jours." },
    { titre: "Modéliser le retour sur investissement", angle: "Modèle financier à 12 mois par levier choisi. Sensibilité aux hypothèses. Quand abandonner un levier.", duree_min: "13", active_recall: "Modélise ton levier prioritaire sur 12 mois." },
    { titre: "Choisir 2 leviers prioritaires pour 90 jours", angle: "Pourquoi 2 et pas 5. Comment éviter la dispersion. Cas d'agences qui ont scaled grâce au focus.", duree_min: "11", active_recall: "" },
  ],
  mounia_anas_mma3: [
    { titre: "Pricing value-based vs time-based", angle: "Bascule progressive du TJM au forfait/value-based. Comment justifier 3x ton ancien prix. Anti-patterns.", duree_min: "15", active_recall: "Calcule ton nouveau prix value-based sur ton offre principale." },
    { titre: "Architecture en 3 paliers Bronze/Argent/Or", angle: "Calibrage des inclusions pour pousser le palier intermédiaire. Anchoring du palier Or. Cas réels.", duree_min: "14", active_recall: "Construis tes 3 paliers avec inclusions chiffrées." },
    { titre: "Tester le nouveau pricing sur 5 prospects", angle: "Méthodologie de test sans risquer le pipeline existant. Lecture des objections. Pivots possibles.", duree_min: "12", active_recall: "Identifie 5 prospects pour le test et planifie les calls." },
    { titre: "Re-pricer les clients existants", angle: "Comment annoncer une hausse à un client en cours. Posture et formulation. Cas où il faut accepter la perte.", duree_min: "11", active_recall: "" },
  ],
  mounia_anas_mma4: [
    { titre: "Outbound LinkedIn ciblé", angle: "Stratégie de Sales Navigator + séquence DM. Volumes hebdo. Taux de réponse cibles. Outils.", duree_min: "14", active_recall: "Définis ton ICP précis et liste 100 prospects à contacter ce mois-ci." },
    { titre: "Content marketing pour positionner l'expertise", angle: "Cadence de publication LinkedIn, format, ton. Cas d'agences qui génèrent du lead inbound.", duree_min: "13", active_recall: "Planifie 8 posts pour les 4 semaines à venir." },
    { titre: "Partenariats et recommandations", angle: "Identifier 10 partenaires complémentaires. Cadre de partenariat. Suivi des recommandations.", duree_min: "12", active_recall: "Liste tes 10 partenaires cibles et planifie les premiers calls." },
    { titre: "Mesurer et arbitrer entre les canaux", angle: "Tableau de bord CAC par canal. Quand couper, quand doubler la mise.", duree_min: "10", active_recall: "" },
  ],
  mounia_anas_mma5: [
    { titre: "Diagnostic des rôles à recruter en priorité", angle: "Matrice tâches / fréquence / coût opportunité du fondateur. Le premier recrutement qui dégage du temps.", duree_min: "13", active_recall: "Remplis la matrice et identifie ton premier recrutement." },
    { titre: "Processus de recrutement structuré", angle: "Sourcing, screening, test technique, entretiens, décision. Durée moyenne 30 jours. Anti-patterns.", duree_min: "14", active_recall: "Construis ton processus type pour le rôle à pourvoir." },
    { titre: "Onboarding du premier collaborateur", angle: "Plan 30/60/90 jours. Documentation des process. Premier check-in à J+15.", duree_min: "12", active_recall: "" },
    { titre: "Management quotidien et délégation", angle: "Rituels d'équipe : daily, weekly, monthly. Comment déléguer sans perdre la main. KPI partagés.", duree_min: "11", active_recall: "Définis tes 3 rituels d'équipe et lance-les cette semaine." },
  ],
  // === YOUNES ===
  younes_my1: [
    { titre: "Tests fonctionnels en 30 min", angle: "Mobilité, force, équilibre, posture. Protocole en 12 mouvements. Mesures à consigner.", duree_min: "14", active_recall: "Réalise les 12 tests sur toi et note les résultats." },
    { titre: "Interpréter les résultats et fixer les priorités", angle: "Grille de lecture des déficits courants. Quels priorités sur 90 jours selon le profil.", duree_min: "12", active_recall: "Identifie tes 3 priorités à partir de tes tests." },
    { titre: "Restitution au client en 45 min", angle: "Structure de restitution motivante. Comment annoncer des points faibles sans démotiver. Embarquement.", duree_min: "11", active_recall: "" },
  ],
  younes_my2: [
    { titre: "Architecture d'un cycle 12 semaines", angle: "Périodisation : adaptation, accumulation, intensification, déchargement. Calibrage par profil.", duree_min: "15", active_recall: "Construis le cycle 12 semaines pour 1 profil type." },
    { titre: "Choisir les exercices et progressions", angle: "Pool d'exercices par groupe musculaire. Progression linéaire vs ondulée. Adaptations selon contraintes.", duree_min: "13", active_recall: "Constitue ton pool de 30 exercices essentiels par catégorie." },
    { titre: "Calibrer charges et récupération", angle: "Calcul du 1RM, zones d'intensité, RPE. Récupération inter-séries et entre séances.", duree_min: "12", active_recall: "" },
  ],
  younes_my3: [
    { titre: "Détecter les erreurs techniques en temps réel", angle: "Les 12 erreurs de pattern les plus fréquentes (squat, deadlift, push, pull). Correction prioritaire.", duree_min: "14", active_recall: "Filme un client et applique la grille de détection." },
    { titre: "Donner du feedback technique efficace", angle: "Méthode des cues courts (1-3 mots). Hiérarchisation des corrections. Anti-pattern du sur-coaching.", duree_min: "11", active_recall: "Liste tes 5 cues les plus utilisés et leur impact." },
    { titre: "Gérer la session : énergie et timing", angle: "Construction d'une heure : échauffement, gros mouvements, accessoires, mobilité. Gestion énergie client.", duree_min: "12", active_recall: "" },
  ],
  younes_my4: [
    { titre: "Pricing d'un coaching premium", angle: "Repères de marché (300-600€/mois selon localisation). Pricing au résultat. Forfaits 3-6-12 mois.", duree_min: "12", active_recall: "Construis ta grille tarifaire sur 3 paliers de durée." },
    { titre: "Onboarding qualitatif d'un nouveau client", angle: "Premier rendez-vous, contrat, tests initiaux, fixation d'objectifs. Posture coach senior.", duree_min: "13", active_recall: "Trace ton parcours d'onboarding sur 30 jours." },
    { titre: "Fidéliser et faire renouveler", angle: "Suivi mensuel, ajustements, célébrations. Conversation de renouvellement à M-3. Anti-pattern de la perte de contact.", duree_min: "12", active_recall: "Liste 3 points de contact que tu veux instaurer chaque mois." },
  ],
  // === LINA ===
  lina_ml1: [
    { titre: "Cartographier tes blocages réels", angle: "Roue des 6 blocages : finances, légitimité, entourage, peur de l'échec, méconnaissance, fatigue. Diagnostic en 18 questions.", duree_min: "13", active_recall: "Remplis la roue et identifie tes 2 blocages dominants." },
    { titre: "Distinguer obstacles externes et internes", angle: "Pourquoi 80% des blocages sont internes. Méthode pour reconnaître un faux obstacle externe.", duree_min: "11", active_recall: "Reprends tes 2 blocages dominants et classe chacun en interne/externe." },
    { titre: "Plan d'action sur le blocage prioritaire", angle: "Choix du blocage à attaquer en premier. Premiers pas. Quand consulter un thérapeute en parallèle.", duree_min: "10", active_recall: "" },
  ],
  lina_ml2: [
    { titre: "Cartographier tes compétences acquises", angle: "Inventaire 360° : techniques, comportementales, transférables. Méthode du journal d'expériences.", duree_min: "13", active_recall: "Remplis ta cartographie en 90 min de réflexion guidée." },
    { titre: "Identifier ta zone de génie", angle: "Croisement compétences × énergie × marché. Outil de scoring. Distinction zone de compétence vs zone de génie.", duree_min: "12", active_recall: "Identifie 3 candidats de zone de génie et score-les." },
    { titre: "Tester 3 hypothèses de carrière", angle: "Méthode des 3 hypothèses parallèles. Validation par interviews et mini-projets. Quand creuser, quand abandonner.", duree_min: "13", active_recall: "Pose tes 3 hypothèses et planifie les interviews de validation." },
  ],
  lina_ml3: [
    { titre: "Cadre financier de la transition", angle: "Coussin nécessaire selon scénario (formation, freelance, salarié). Méthodes pour réduire le risque. Aides disponibles (CPF, France Travail).", duree_min: "14", active_recall: "Calcule ton coussin nécessaire selon ton scénario." },
    { titre: "Roadmap 90 jours opérationnelle", angle: "Découpage en 3 sprints de 30 jours. Jalons mesurables. Anti-pattern du plan trop large.", duree_min: "13", active_recall: "Construis ta roadmap 90 jours avec jalons hebdo." },
    { titre: "Test marché et premier client", angle: "Pour les reconversions freelance/entrepreneuriat : trouver un premier client payant en 60 jours. Méthodes éprouvées.", duree_min: "12", active_recall: "" },
    { titre: "Annoncer ta transition à ton entourage", angle: "Stratégie de communication progressive. Gestion des réticences conjoint, famille, employeur. Cas-types.", duree_min: "10", active_recall: "Rédige ton script d'annonce pour ton interlocuteur le plus difficile." },
  ],
  lina_ml4: [
    { titre: "Routines hebdomadaires de pilotage", angle: "Bilan hebdo en 20 min. Suivi des jalons. Quand pivoter, quand persévérer.", duree_min: "11", active_recall: "Établis ton rituel de bilan hebdo et tiens-le 4 semaines." },
    { titre: "Surmonter les périodes de doute", angle: "Les 3 moments classiques de doute (J+30, J+90, J+180). Outils de remobilisation. Quand demander de l'aide.", duree_min: "12", active_recall: "" },
    { titre: "Évaluer le succès à 6 mois", angle: "Critères de succès financiers, qualitatifs, identitaires. Auto-évaluation honnête. Décision de continuer/ajuster.", duree_min: "12", active_recall: "Définis tes 5 critères de succès à 6 mois dès maintenant." },
  ],
};
