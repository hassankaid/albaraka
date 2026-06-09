/**
 * 10 démos officielles AL BARAKA — extraites verbatim de la source Script Forge.
 * (Extraction programmatique : contenu identique au code source d'origine.)
 */
import type { FormData } from "./types";

export interface DemoCase {
  id: string;
  name: string;
  formData: FormData;
}

export const DEMOS: DemoCase[] = [
  // ─── ARGENT (4) ───
  {
    id: 'cake_design',
    name: 'Cake design haut de gamme',
    formData: {
      type: 'closing', segment: 'argent', profile: 'C',
      offerName: 'Méthode Wedding-Premium™',
      price: '1 497€', promise: 'signer ton premier wedding cake à 600€+', delay: '90 jours',
      founder: '',
      distinctiveValue: 'passer du gâteau d\'anniversaire à 50€ au wedding cake à 600€+ sans passer par le CAP Pâtissier ni louer un atelier',
      components: 'Module 1 — Diagnostic & Style Signature : on cartographie ton portfolio actuel, on identifie ton style signature (ce qui te distingue des 1000 autres cake designers Instagram) et tu repars avec une roadmap claire de tes 3 prochains gâteaux portfolio à produire\nModule 2 — Gamme Premium 3 packs : tu construis ta gamme à 3 niveaux (mariage civil 350€, signature 600€, royal 1 200€) avec les détails techniques, ingrédients, marges et arguments de vente pour chaque pack\nModule 3 — Tunnel Instagram → Devis → Vente : tu mets en place ta page Instagram pro, ton process automatisé de demande de devis et ton parcours commercial jusqu\'à l\'acompte de réservation\nModule 4 — Premières Commandes Wedding Cake : tu lances tes 3 premiers wedding cakes en cohorte avec mon soutien direct, du brief client à la livraison de l\'événement\nLives groupe hebdo (jeudi 21h) + 2 sessions 1to1/mois : 12 lives Zoom pour valider tes décisions de la semaine et voir les portfolios des autres, plus 2 sessions individuelles par mois pour la revue personnalisée de ton portfolio et l\'audit de ta page\nDiscord 24/7 entre cake designers musulmanes : partage de tes gâteaux du jour, demande d\'avis instantané, fin de la solitude de l\'auto-entrepreneuse à domicile\nPack Photos Pro inclus (valeur 297€) : 30 fonds téléchargeables + scripts d\'éclairage smartphone pour produire des photos premium dès la semaine 2, avant même d\'avoir terminé ton nouveau portfolio\nTemplates devis & contrats wedding cake (valeur 197€) : tous les documents validés juridiquement (devis, contrat, conditions d\'annulation, clauses wedding) pour facturer comme une pro dès ta première commande',
      avatar: 'cake designers passionnées 28-40 ans, en reconversion ou en congé parental, qui font des gâteaux pour leur entourage mais n\'arrivent pas à les vendre au juste prix',
      mainPain: 'vendre tes gâteaux 80€ alors qu\'ils en valent 400€, sans savoir te positionner sur le wedding cake haut de gamme',
      bigIdea: 'la Méthode Wedding-Premium™ qui te fait passer du gâteau d\'anniversaire à 50€ au wedding cake à 600€+ en 90 jours, sans CAP Pâtissier ni atelier',
      mainBonus: 'Pack Photos Pro (30 fonds + scripts d\'éclairage smartphone) pour produire des photos premium dès la semaine 2',
      guaranteeResult: 'signer ton premier wedding cake à 600€+',
      marketPrice: 'entre 2 500€ et 4 000€',
      inactionCost: '12 000€/an de gâteaux sous-facturés à 80€ au lieu de 400€',
      prospectOrigin: 'inbound',
      pillar1Name: 'Diagnostic & Style Signature',
      pillar2Name: 'Gamme Premium & Vente',
      callerName: '', channel: 'Instagram DM', finalEvent: 'masterclass « comment vendre ton premier wedding cake à 600€ sans CAP Pâtissier »'
    }
  },
  {
    id: 'closing_high_ticket',
    name: 'Closing high-ticket à distance',
    formData: {
      type: 'closing', segment: 'argent', profile: 'C',
      offerName: 'Méthode Tawakkul Closing™',
      price: '1 997€', promise: 'décrocher ton premier mandat closing et faire tes premières commissions chez un infopreneur halal sérieux', delay: '90 jours',
      founder: '',
      distinctiveValue: 'le seul programme qui te branche directement à 12 mandats partenaires d\'infopreneurs halal premium',
      components: 'Module 1 — Fondamentaux du Closing Halal : tu maîtrises le mindset du closer, la psychologie d\'achat sans manipulation et la posture de l\'experte qui guide (pas qui vend) — base indispensable pour tenir 50 appels par semaine sans s\'épuiser\nModule 2 — Le Script d\'Appel Inversé : la technique qui retourne l\'appel — le prospect te qualifie au lieu de l\'inverse — applicable dès ta première semaine sur tes premiers appels d\'entraînement\nModule 3 — Gérer ses émotions en appel : comment passer 50 appels/semaine sans s\'effondrer après un refus, avec les techniques d\'ancrage avant l\'appel et de récupération entre 2 appels\nModule 4 — Closer le High-Ticket : la séquence complète pour vendre des programmes 3-10k€ par téléphone, depuis l\'ouverture jusqu\'au paiement en direct, en passant par l\'annonce du prix et le traitement des objections\n3 lives jeux de rôle par semaine (mardi/jeudi/samedi 21h) : tu rejoues des appels réels avec les autres closeuses de la cohorte, je corrige en direct devant tout le monde — c\'est en se trompant devant les autres qu\'on apprend le plus vite\nAudit 1to1 de tes 3 premiers appels enregistrés (valeur 297€) : tu envoies l\'enregistrement, je décortique mot par mot — le piège du closer débutant c\'est de faire 200 appels mauvais sans s\'en rendre compte, on l\'évite\nBibliothèque de 80 scripts d\'appel validés par secteur halal (valeur 397€) : tu pars d\'un script qui a déjà fait des ventes (formation, coaching, e-commerce halal, immobilier halal) — tu personnalises, tu n\'inventes rien\nAccès au réseau de 12 mandats partenaires : 12 infopreneurs halal premium qui recrutent des closeuses — on ne te laisse pas chercher un client après la formation, on te présente directement à des entrepreneurs qui veulent te former à leur offre',
      avatar: 'soeurs 25-40 ans salariées en CDI ou en congé parental, à l\'aise à l\'oral mais sans expérience commerciale, qui veulent un revenu à distance compatible avec leur rôle de mère',
      mainPain: 'échanger ton temps en CDI 1 800€/mois avec 2h de transport, sans pouvoir démissionner sans filet, et ne trouver aucun business halal qui recrute',
      bigIdea: 'la Méthode Tawakkul Closing™ qui te fait passer de salariée à closer confirmée chez un infopreneur halal premium en 90 jours, sans démarchage à froid ni renier tes valeurs',
      mainBonus: 'Accès au réseau de 12 mandats partenaires : on ne te laisse pas chercher un client après la formation, on te présente directement',
      guaranteeResult: 'décrocher ton premier mandat et faire tes premières commissions',
      marketPrice: 'entre 3 500€ et 6 000€',
      inactionCost: 'rester salariée à 1 800€/mois pendant 2 années de plus minimum',
      prospectOrigin: 'webinar',
      pillar1Name: 'Fondamentaux & Posture du Closer',
      pillar2Name: 'Closing High-Ticket en Action',
      callerName: '', channel: 'WhatsApp', finalEvent: 'masterclass « comment décrocher ton premier mandat closing chez un infopreneur halal »'
    }
  },
  {
    id: 'immobilier_halal',
    name: 'Immobilier locatif halal sans crédit',
    formData: {
      type: 'closing', segment: 'argent', profile: 'C',
      offerName: 'Système Baraka Immo™',
      price: '4 997€', promise: 'monter ton premier dossier de financement halal solide et négocier ton premier bien locatif rentable', delay: '6 mois',
      founder: '',
      distinctiveValue: 'l\'unique programme immobilier qui combine financement participatif Wakalah + leasing islamique pour acheter sans riba',
      components: 'Module 1 — Fondamentaux de l\'Immobilier Locatif Halal : comprendre la chaîne complète (acquisition, rénovation, mise en location, fiscalité LMNP) sans aucun recours au crédit conventionnel à intérêts\nModule 2 — Cartographie des 12 villes rentables France : identifier les zones où le rendement net dépasse 10% (Roubaix, Saint-Étienne, Mulhouse, Le Havre…) avec analyses chiffrées quartier par quartier et profil locataire idéal\nModule 3 — Monter ton Dossier de Financement Halal : maîtriser les 3 mécanismes — Wakalah, Mourabaha, leasing islamique — et choisir le plus adapté à ta situation patrimoniale et à ton bien visé\nModule 4 — Acheter, Meubler, Mettre en Exploitation à Distance : le process complet pour acquérir un bien à 500 km sans y mettre les pieds, jusqu\'à la signature, la rénovation pilotée à distance et la mise en location\n1to1 mensuel d\'1h avec ton mentor : audit personnalisé de chaque bien que tu envisages — sur 6 mois, tu auras consulté ton mentor sur 5 à 8 dossiers concrets avant de te décider\nVisites groupées trimestrielles dans les 4 villes-clés : tu visites en groupe avec d\'autres investisseurs musulmans, on rencontre les chasseurs immobiliers, notaires et artisans locaux ensemble — tu construis ton réseau de confiance\nAccès direct aux 3 partenaires de financement participatif validés : pas de prospection, tu es présenté(e) directement aux opérateurs sérieux du marché halal qu\'on a négociés pour toi\nListing live des 50 villes France les plus rentables (valeur 397€/an) : mis à jour mensuellement, donnée fraîche pour ne plus investir sur des marchés 2024 qui sont devenus saturés\nPack contrats halal complets (valeur 697€) : bail, gestion, caution, assurance loyers impayés, mandat de gestion — tous validés par un cabinet d\'avocats et un comité scharia',
      avatar: 'pères musulmans 30-45 ans, salariés ou indépendants, qui gagnent 2 500-5 000€/mois et ont 20-50k€ d\'épargne dormante à investir sans riba',
      mainPain: 'refuser le crédit conventionnel donc rester bloqué pour investir, voir son épargne se dévaluer, et ne pas savoir où chercher des solutions de financement participatif sérieuses',
      bigIdea: 'le Système Baraka Immo™ qui te fait monter ton premier dossier de financement halal solide et négocier ton premier bien locatif rentable (≥10% net) en 6 mois, grâce à 3 partenaires validés (Wakalah + leasing islamique)',
      mainBonus: 'Pack contrats halal complets (bail, gestion, caution, assurance) validés par un cabinet d\'avocats + comité scharia',
      guaranteeResult: 'monter ton premier dossier de financement halal solide et négocier ton premier bien',
      marketPrice: 'entre 7 000€ et 12 000€',
      inactionCost: '30 000€ d’épargne dormante qui perd 2-5% par an à l’inflation',
      prospectOrigin: 'webinar',
      pillar1Name: 'Cartographie & Financement Halal',
      pillar2Name: 'Acquisition & Exploitation à Distance',
      callerName: '', channel: 'WhatsApp', finalEvent: 'webinaire « investir dans l\'immobilier locatif rentable sans crédit conventionnel »'
    }
  },
  {
    id: 'agence_seo_local',
    name: 'Agence SEO local — commerçants musulmans',
    formData: {
      type: 'discovery', segment: 'argent', profile: 'B',
      offerName: 'Méthode Hidaya Local™',
      price: '497€/mois', promise: '+20 nouveaux appels qualifiés par mois pour ton commerce', delay: '90 jours',
      founder: '',
      distinctiveValue: 'la seule agence SEO local qui te garantit +15 appels/mois mesurés (sinon remboursé ou continué gratuitement)',
      components: 'Audit Google Business + analyse concurrentielle (semaine 1) : on identifie tes 3 concurrents directs dans un rayon de 5 km, on analyse pourquoi ils ressortent mieux que toi sur Google Maps, et on liste les 12 actions précises à mener pour passer devant eux\nSéance photo pro sur place (mois 1) : on envoie un photographe certifié dans ton établissement, il produit 30 photos professionnelles qui passent immédiatement sur ta fiche Google — premier levier de visibilité activé en 7 jours\nRefonte complète de ta fiche Google Business : nouveau descriptif optimisé pour ta zone (10 km autour de toi), horaires précis, catégories principales + secondaires, attributs (Wi-Fi, accessibilité, parking, halal certifié…)\n12 contenus locaux par an (1 par mois) : articles localisés ciblés ZIP code, posts Instagram géolocalisés, 1 vidéo trimestrielle — tout est rédigé, produit et publié pour toi, tu ne touches à rien\nModération + sollicitation systématique des avis Google : on demande à chaque client satisfait de laisser un avis (script SMS automatisé fourni), on répond à TOUS les avis dans les 24h avec le ton adapté à ton image\nTracking d\'appels dédié : on installe un numéro de tracking pour mesurer chaque appel qui vient de ta fiche Google — tu vois exactement combien d\'appels tu reçois grâce à nous, mois après mois\nReporting mensuel transparent : 1 PDF par mois avec tes positions Google Maps, nombre d\'appels reçus, avis collectés, contenus publiés — pas de jargon SEO, juste les chiffres qui comptent pour ton CA\n30 minutes par mois avec ton account manager : on valide ensemble les contenus du mois suivant et on ajuste la stratégie selon tes résultats — tu gardes la main sur le message de ton commerce\nSite vitrine 1 page optimisé local offert dès la signature (valeur 1 200€) : beaucoup de commerçants n\'ont même pas de site, on t\'en livre un en 14 jours qui complète ta fiche Google et capture les leads venus du SEO',
      avatar: 'gérants de commerces physiques musulmans (resto halal, boutique modeste, cabinet) 35-55 ans, CA 100-500k€/an, qui ont peu de visibilité Google et zéro temps pour la gérer',
      mainPain: 'investir en travaux et déco mais zéro en visibilité digitale, perdre des clients chaque jour parce qu\'on ne te trouve pas sur Google Maps, avoir peur des agences qui arnaquent à 3 000€/mois sans résultat',
      bigIdea: 'la Méthode Hidaya Local™ qui apporte +20 nouveaux appels par mois en 90 jours via SEO local + Google Business + photos pro, sans que tu touches à un ordinateur',
      mainBonus: 'Site vitrine 1 page optimisé local offert dès la signature (valeur 1 200€)',
      guaranteeResult: '20 nouveaux appels qualifiés mensuels mesurés sur ton tracking',
      marketPrice: 'entre 800€ et 2 000€/mois selon les agences',
      inactionCost: 'perte de 5-8 clients par mois faute de visibilité Google',
      prospectOrigin: 'cold',
      pillar1Name: 'Audit & Refonte Google Business',
      pillar2Name: 'Production & Reporting Mensuel',
      callerName: '', channel: 'Téléphone', finalEvent: 'audit Google Business offert d\'1h avec analyse concurrentielle'
    }
  },
  // ─── RELATIONS (3) ───
  {
    id: 'preparation_mariage',
    name: 'Préparation au mariage pour soeurs',
    formData: {
      type: 'closing', segment: 'relations', profile: 'C',
      offerName: 'Cheminement Sakina™',
      price: '1 297€', promise: 'engager des rencontres matrimoniales sérieuses avec des profils alignés à tes valeurs', delay: '6 mois',
      founder: '',
      distinctiveValue: 'le seul programme qui te sort des plateformes douteuses et t\'ouvre 3 réseaux de matchmaking sérieux (mosquées, wali, masterminds)',
      components: 'Phase 1 — Clarification de tes Non-Négociables (semaines 1-2) : tu identifies tes 5 critères absolus + 5 préférences avec un travail guidé sur ta foi, tes valeurs et ton projet de vie — on évite que tu acceptes par défaut un profil incompatible\nPhase 2 — Sortir de la Dépendance aux Échecs (semaines 3-6) : tu fais la paix avec les rencontres décevantes du passé et tu déconstruis les schémas répétitifs qui t\'enferment dans les mauvais choix matrimoniaux\nPhase 3 — Activer 3 Réseaux Matrimoniaux Sérieux : tu sors des plateformes douteuses pour rejoindre nos mosquées partenaires, des wali fiables et des masterminds entre soeurs en cheminement matrimonial\nPhase 4 — Maîtriser l\'Entretien Matrimonial : 50 questions structurées (validées par un imam), 10 signaux rouges à repérer, comment conclure ou clôturer un entretien sans malaise ni regret\nPhase 5 — Suivi Post-Rencontre (sur toute la durée) : pendant 6 mois, je t\'accompagne entre tes entretiens pour t\'aider à décider sereinement — ni précipitation par peur du célibat, ni procrastination par peur de se tromper\n4 sessions 1to1 d\'1h sur les 6 mois : tu m\'envoies les profils sérieux qui se présentent, on en parle ensemble, je t\'aide à voir ce que tu ne vois pas\n2 lives mensuels en groupe (mardi 21h après ishā) + Groupe Telegram fermé 20 soeurs (non-mixte total) : pédagogie collective et entraide quotidienne entre soeurs dans le même cheminement\nQuestionnaire approfondi 50 questions matrimoniales (valeur 97€) : validé par un imam, structuré par thème (foi, projet de vie, finances, famille, parentalité, intimité) — tu n\'oublies aucune question essentielle\nAccès au réseau de wali et mosquées partenaires (12 villes francophones) : on t\'oriente vers des structures qui font du vrai matchmaking, pas des plateformes en libre-service — tu gagnes 12 mois de tâtonnement',
      avatar: 'soeurs musulmanes pratiquantes 25-35 ans, indépendantes financièrement, qui voient leurs amies se marier et qui ont déjà été déçues par 1 ou 2 tentatives via les plateformes de mariage halal',
      mainPain: 'la pression familiale croissante, la peur du célibat prolongé, et l\'incapacité à trier les profils sérieux parmi des plateformes pleines de non-pratiquants',
      bigIdea: 'le Cheminement Sakina™ qui te fait engager des rencontres matrimoniales sérieuses en sortant des plateformes douteuses et en clarifiant ce que tu veux vraiment avant chaque entretien',
      mainBonus: 'Accès au réseau de wali et de mosquées partenaires dans 12 villes francophones — tu gagnes 12 mois de tâtonnement',
      guaranteeResult: 'engager des rencontres matrimoniales sérieuses avec au moins 3 profils alignés',
      marketPrice: 'entre 2 000€ et 3 500€',
      inactionCost: 'encore 12 à 24 mois de célibat ou de rencontres décevantes',
      prospectOrigin: 'inbound',
      pillar1Name: 'Clarification & Sortie des Schémas',
      pillar2Name: 'Réseau & Maîtrise de l’Entretien',
      callerName: '', channel: 'WhatsApp', finalEvent: 'atelier en ligne « les 5 non-négociables à clarifier avant un entretien matrimonial »'
    }
  },
  {
    id: 'parentalite_islamique',
    name: 'Parentalité éducation islamique 3-12 ans',
    formData: {
      type: 'discovery', segment: 'relations', profile: 'B',
      offerName: 'Méthode Tarbiya Sereine™',
      price: '397€', promise: 'gérer tes crises quotidiennes avec sérénité et transformer une partie d\'entre elles en moments de transmission', delay: '60 jours',
      founder: '',
      distinctiveValue: '5 rituels + 10 scripts validés islamiquement par un imam, prêts à appliquer dès le jour 1',
      components: 'Cycle 1 — Comprendre les besoins développementaux (modules 1-6) : par tranche d\'âge (3-6, 7-9, 10-12 ans), tu apprends ce qui se joue vraiment chez ton enfant à chaque étape — ce qui transforme une crise incompréhensible en signal lisible que tu peux désamorcer\nCycle 2 — Sortir de la Dichotomie Autorité-Rigide / Laxisme-Coupable (modules 7-12) : tu adoptes le cadre « ferme ET chaleureux » validé en psychologie infantile et compatible avec la pédagogie du Prophète ﷺ\nCycle 3 — Installer 5 Rituels Quotidiens de Transmission (modules 13-18) : matin, repas, dou\'a, lecture, dodo — chaque rituel devient un ancrage du deen sans effort, naturellement intégré au quotidien de ta famille\nCycle 4 — Maîtriser les 10 Situations Critiques (modules 19-24) : devoirs, écrans, prière, frères-soeurs, Ramadan, école, jugement de la famille élargie — un script validé islamiquement pour chaque situation difficile\n50 fiches enfant prêtes à l\'emploi (valeur 147€) : par âge et par situation — tu sors la fiche au moment de la crise, tu suis le script étape par étape, ça désamorce en moins de 5 minutes\n30 scripts de réponse aux questions difficiles (valeur 67€) : « pourquoi je dois prier ? », « pourquoi pas comme à l\'école ? », « pourquoi pas comme à la télé ? » — réponses validées par un imam, adaptées par tranche d\'âge\nGroupe Telegram fermé d\'entraide + 1 live mensuel Q&R (3ème jeudi 21h) : entraide quotidienne entre mères musulmanes qui vivent les mêmes situations, plus 1 live mensuel pour mes réponses personnalisées\nKit Ramadan Kids inclus (valeur 97€) : planner 30 jours + activités quotidiennes + duas illustrés enfants — le mois le plus difficile en parentalité musulmane devient maîtrisé et joyeux',
      avatar: 'mères musulmanes 28-42 ans, 1-4 enfants entre 3 et 12 ans, qui pratiquent mais s\'épuisent à concilier autorité et tendresse et culpabilisent de transmettre le deen avec colère',
      mainPain: 'gérer les crises quotidiennes avec colère puis culpabiliser, alterner autorité et laxisme, et avoir peur de mal transmettre le deen',
      bigIdea: 'la Méthode Tarbiya Sereine™ qui te fait passer de la colère à la sérénité dans la gestion des crises, grâce à 5 rituels quotidiens et 10 scripts validés islamiquement',
      mainBonus: 'Kit Ramadan Kids (planner 30j + activités + duas illustrés enfants) — valeur 97€',
      guaranteeResult: 'gérer les crises de tes enfants sans crier ni culpabiliser',
      marketPrice: 'entre 700€ et 1 500€',
      inactionCost: 'des années de relation tendue avec ses enfants et un climat familial dégradé',
      prospectOrigin: 'webinar',
      pillar1Name: 'Comprendre & Sortir de la Dichotomie',
      pillar2Name: 'Rituels & Situations Critiques',
      callerName: '', channel: 'Instagram DM', finalEvent: 'masterclass « les 3 mots qui désamorcent une crise sans crier »'
    }
  },
  {
    id: 'sortir_dependance',
    name: 'Sortir de la dépendance affective',
    formData: {
      type: 'closing', segment: 'relations', profile: 'C',
      offerName: 'Parcours Hijra Intérieure™',
      price: '1 497€', promise: 'amorcer ta reconstruction, retrouver de l\'estime et poser un cap de vie clair', delay: '6 mois',
      founder: '',
      distinctiveValue: 'le seul programme post-divorce qui combine travail intérieur, autonomie financière et coach validée par un comité religieux',
      components: 'Phase 1 — Faire le Deuil de l\'Ancienne Vie (semaines 1-2) : rituels et lecture coranique guidée pour accepter le passage, sans déni ni amertume — base indispensable avant tout travail psychologique profond, qu\'aucun coach laïc ne pourra te proposer\nPhase 2 — Déconstruire les Schémas Répétitifs (semaines 3-5) : travail psychologique en profondeur avec une coach validée par un comité religieux — comprendre pourquoi tu attires ce qui te fait du mal et comment briser le cycle\nPhase 3 — Poser 3 Nouveaux Repères de Vie (semaines 6-8) : foi, revenu, réseau — les 3 piliers à reconstruire en parallèle pour ne pas dépendre uniquement de l\'émotionnel ou d\'un futur conjoint\nPhase 4 — Construire ton Autonomie Financière de Base (semaines 9-10) : audit de tes ressources, plan de stabilisation, premiers pas concrets vers un revenu autonome qui te libère de la dépendance financière\nPhase 5 — Refaire Communauté Féminine Saine (semaines 11-12) : on t\'aide à rebâtir un cercle de soeurs alignées, pour ne plus jamais retomber dans l\'isolement post-rupture qui t\'a piégée\n1 session 1to1 hebdomadaire de 45min : suivi personnalisé avec une coach formée et validée par un comité religieux — la fragilité émotionnelle post-rupture impose un suivi resserré, on ne peut pas la traiter en groupe\n3 séances offertes avec un thérapeute/coach formé (valeur 450€) : pour le travail psychologique en profondeur qu\'un programme seul ne peut pas remplacer — on ne fait pas semblant que la méthode suffit\nKit méditation et duas adaptées à la rupture (audio + livret, valeur 147€) : apaisement immédiat dès la première écoute, outils utilisables dans les moments de crise nocturne quand le téléphone n\'est plus une option\nSororité Telegram à vie : même après les 90 jours, le groupe reste accessible pour toujours — l\'isolement post-rupture est le plus grand piège, on protège contre la rechute à long terme',
      avatar: 'femmes musulmanes pratiquantes 28-50 ans, divorcées récentes ou en rupture forte avec leur famille, mères célibataires ou avec garde alternée, qui se sentent perdues et dévalorisées',
      mainPain: 'avoir perdu tous tes repères, te sentir dévalorisée, jugée par la communauté, et avoir le sentiment d\'avoir « gâché » ta vie',
      bigIdea: 'le Parcours Hijra Intérieure™ qui amorce ta reconstruction post-rupture en 6 mois — retrouver de l\'estime, poser les bases de ton autonomie émotionnelle et un cap de vie clair, sans tomber dans la victimisation ni renier ta foi',
      mainBonus: '3 séances offertes avec un thérapeute/coach formée et validée par un comité religieux',
      guaranteeResult: 'amorcer ta reconstruction, retrouver de l’estime et poser un cap de vie clair',
      marketPrice: 'entre 2 500€ et 4 500€',
      inactionCost: 'des années à se sentir bloquée et à reproduire les mêmes schémas',
      prospectOrigin: 'referral',
      pillar1Name: 'Deuil & Déconstruction',
      pillar2Name: 'Reconstruction des 3 Piliers de Vie',
      callerName: '', channel: 'WhatsApp', finalEvent: 'webinaire « les 3 étapes pour amorcer ta reconstruction après une rupture »'
    }
  },
  // ─── SANTÉ (3) ───
  {
    id: 'remise_en_forme_pudique',
    name: 'Remise en forme pudique à domicile',
    formData: {
      type: 'discovery', segment: 'sante', profile: 'B',
      offerName: 'Programme Quwwa™',
      price: '297€', promise: 'perdre 4 à 10 kg à domicile en moins de 30 min par jour', delay: '12 semaines',
      founder: '',
      distinctiveValue: 'le seul programme avec une coach féminine voilée, sans aucune mixité visuelle ni musique inappropriée',
      components: 'Bilan postural et de force initiale (semaine 0) : vidéo de test à faire chez toi en 15 min, on identifie tes points faibles (épaules, posture, abdos, équilibre) pour adapter le programme à TON corps post-grossesses\nCycle 1 — Mobilité et Activation (semaines 1-3) : 15 séances pour réveiller ton corps en douceur, retrouver de la mobilité articulaire, sans courbatures qui te dégoûtent dès le début et te font abandonner\nCycle 2 — Endurance et Combustion (semaines 4-6) : 15 séances où l\'intensité monte progressivement — c\'est ici que les premiers kilos partent visiblement, et c\'est aussi ici que la motivation revient toute seule\nCycle 3 — Force Fonctionnelle (semaines 7-9) : 15 séances avec bandes élastiques pour construire du muscle qui consomme des calories même au repos — c\'est ce qui empêche la reprise après le programme\nCycle 4 — Définition et Ancrage des Habitudes (semaines 10-12) : 15 séances pour fixer les résultats, plus l\'installation de 3 habitudes durables qui survivront à la fin du programme\nCoach WhatsApp dédiée (réponse sous 24h, valeur 297€) : tu envoies une vidéo de ta posture en cas de doute, tu reçois la correction en moins de 24h — tu ne restes jamais bloquée sur un exercice ou une douleur\n100 recettes halal par phase de cycle (valeur 97€) : collation, repas principal, batch cooking weekend — adaptées aux goûts maghrébins et orientaux, pas de quinoa-tofu-spiruline qui te font fuir\nKit suivi mensuel (valeur 47€) : mesures (tour de taille, hanches, cuisses), photos privées, journal d\'humeur, bilan force — tu vois ta progression réelle même quand le poids stagne temporairement\nGroupe Telegram fermé non-mixte : entraide quotidienne entre soeurs voilées dans le même programme — fin de la solitude du sport à domicile et soutien dans les moments de découragement',
      avatar: 'femmes musulmanes voilées 25-45 ans, 1-4 enfants, qui ne fréquentent pas les salles mixtes, ont 30 min/jour max et peu de matériel',
      mainPain: 'refuser les salles mixtes mais ne pas avoir le matériel, le temps ni un programme adapté à ta tenue et tes valeurs',
      bigIdea: 'le Programme Quwwa™ qui te fait perdre 4 à 10 kg en 12 semaines à domicile, avec uniquement un tapis et des bandes élastiques, sans mixité ni musique inappropriée',
      mainBonus: '100 recettes halal par phase de cycle adaptées aux goûts maghrébins (pas de quinoa-tofu) — valeur 97€',
      guaranteeResult: 'perdre 4 à 10 kg en 12 semaines à domicile sans matériel ni salle mixte',
      marketPrice: 'entre 600€ et 1 200€',
      inactionCost: 'des années à se sentir mal dans son corps et à éviter les miroirs',
      prospectOrigin: 'webinar',
      pillar1Name: 'Mobilité & Combustion',
      pillar2Name: 'Force & Ancrage Durable',
      callerName: '', channel: 'Instagram DM', finalEvent: 'masterclass « les 3 erreurs qui sabotent la perte de poids à la maison »'
    }
  },
  {
    id: 'cycle_feminin',
    name: 'Cycle féminin & fertilité naturelle',
    formData: {
      type: 'closing', segment: 'sante', profile: 'B',
      offerName: 'Méthode Fitra™',
      price: '997€', promise: 'régulariser ton cycle, soulager significativement les douleurs prémenstruelles et optimiser tes conditions naturelles de fertilité', delay: '4 mois',
      founder: '',
      distinctiveValue: 'la seule méthode naturopathie 100% halal (plantes validées par un comité scharia) avec naturopathe certifiée musulmane',
      components: 'Mois 1 — Bilan Complet (hormonal, alimentaire, charge mentale, cycle réel) : on pose un diagnostic objectif sur ce qui dérègle ton cycle aujourd\'hui — beaucoup de soeurs n\'ont jamais eu de bilan hormonal complet, c\'est notre point de départ obligatoire\nMois 1 — Nettoyage Hépatique sur 30 jours : alimentation ciblée + plantes spécifiques halal (chardon-marie, radis noir, romarin) pour décongestionner le foie — la fonction hépatique est centrale dans la régulation hormonale\nMois 2-3 — Synchronisation Cycle ↔ Alimentation ↔ Sport : adapter ce que tu manges et comment tu bouges aux 4 phases du cycle (folliculaire, ovulatoire, lutéale, menstruelle) — fini les fringales et la fatigue inexpliquée\nMois 3-4 — Phytothérapie Ciblée : protocole de plantes halal personnalisé selon le déséquilibre identifié à ton bilan initial — toutes les plantes validées par un comité scharia, aucune molécule de synthèse\n4 sessions 1to1 d\'1h avec une naturopathe certifiée musulmane : 1 par mois pour ajuster ton protocole selon les évolutions de ton cycle et tes ressentis personnels — c\'est ce qui rend la méthode efficace là où d\'autres échouent\nBilan biologique offert (valeur 247€) : kit prélèvement à domicile + analyses complètes + lecture commentée avec la naturopathe — diagnostic objectif avant d\'agir, pas de la naturopathie à l\'aveugle\n80 recettes par phase de cycle (valeur 97€) : tu manges ce qui soutient ton corps à chaque moment du mois — fini les fringales de sucre en phase lutéale ou les ballonnements en ovulation\nLivret duas et roqya pour la fertilité (validé par un imam) : pour les soeurs qui le souhaitent, le pilier spirituel a sa place — intégration de la dimension foi à la dimension corps\nGroupe Telegram 30 femmes + 1 live mensuel : entraide quotidienne entre soeurs en parcours fertilité ou règles douloureuses — tu n\'es plus seule face à un sujet qu\'on ose à peine évoquer ailleurs',
      avatar: 'femmes musulmanes 25-40 ans mariées, qui souffrent de SPM intense, règles douloureuses, cycles irréguliers, ou en parcours fertilité depuis 6+ mois sans diagnostic clair',
      mainPain: 'avoir fait le tour des médecins sans solution, refuser les hormones de synthèse, et te sentir jamais prise au sérieux par le corps médical',
      bigIdea: 'la Méthode Fitra™ qui régularise ton cycle, soulage significativement le SPM et optimise tes conditions naturelles de fertilité en 4 mois, sans hormones de synthèse, avec uniquement des plantes halal',
      mainBonus: 'Bilan biologique offert (kit prélèvement à domicile + analyses + lecture) — un diagnostic objectif avant d\'agir',
      guaranteeResult: 'régulariser ton cycle et soulager significativement le SPM',
      marketPrice: 'entre 1 800€ et 3 000€',
      inactionCost: 'des années à supporter règles douloureuses et SPM sans solution',
      prospectOrigin: 'referral',
      pillar1Name: 'Bilan & Nettoyage Hépatique',
      pillar2Name: 'Synchronisation & Phytothérapie',
      callerName: '', channel: 'WhatsApp', finalEvent: 'webinaire « les 4 phases du cycle féminin et comment réguler ton SPM naturellement »'
    }
  },
  {
    id: 'reset_post_ramadan',
    name: 'Reset alimentaire post-Ramadan',
    formData: {
      type: 'discovery', segment: 'sante', profile: 'B',
      offerName: 'Reset 30 Jours™',
      price: '247€', promise: '-3 à -6 kg, énergie retrouvée et 3 habitudes ancrées', delay: '30 jours',
      founder: '',
      distinctiveValue: 'le seul programme post-Aïd cadré sur la fenêtre physiologique optimale (les 2 semaines suivant l\'Aïd)',
      components: 'Semaine 1 — Jeûne Intermittent Halal Personnalisé : protocole adapté à ton profil (homme/femme, niveau d\'activité, type d\'emploi) pour prolonger les bénéfices physiologiques du Ramadan sans rechute brutale\nSemaine 1-2 — Nettoyage 7 Jours : alimentation simplifiée + plantes spécifiques (curcuma, gingembre, citron, infusion drainage) + option hijama avec un praticien certifié partenaire\nSemaines 2-3 — Réintroduction Graduelle des Aliments : on remet les aliments un par un, dans le bon ordre, pour ne pas réveiller les inflammations digestives accumulées pendant les fêtes de l\'Aïd\nSemaine 4 — Ancrage de 3 Habitudes Durables : 3 ancrages comportementaux à fixer AVANT le retour à la « vie normale » — c\'est ce qui empêche la reprise systématique qui te fait perdre les bénéfices chaque année\nLives bi-hebdomadaires (mardi/vendredi 21h) pendant 4 semaines : 8 lives au total pour valider tes progrès, répondre aux questions et maintenir la motivation collective avec les autres participants\n30 menus complets + listes de courses halal hebdomadaires (valeur 47€) : aucune décision à prendre dans la fatigue du début — tu sais exactement quoi acheter et quoi manger chaque jour, donc aucun écart\nKit détox livré chez toi (valeur 37€) : curcuma bio, gingembre frais, citron, infusion drainage — tu démarres concret dès la réception du colis, pas de friction de courses spécifiques au démarrage\nCoach WhatsApp pour les questions urgentes (réponse sous 12h) : tu n\'es jamais bloquée sur une question alimentaire ou un ressenti — réponse rapide pour ne pas perdre la motivation\nE-book hijama post-Ramadan (valeur 29€) : en partenariat avec un hijamateur certifié — pour ceux qui veulent intégrer la sunnah du Prophète ﷺ dans leur reset, pas obligatoire mais offert',
      avatar: 'musulmans 25-50 ans pratiquants qui font Ramadan tous les ans et voient le bénéfice du jeûne effacé par 1 semaine de fêtes',
      mainPain: 'voir tout le bénéfice du Ramadan effacé en 1 semaine de fêtes, et ne pas savoir par où reprendre une alimentation saine sans frustration',
      bigIdea: 'le Reset 30 Jours™ qui te fait repartir sur des bases saines en 30 jours après le Ramadan : -3 à -6 kg, énergie retrouvée et 3 habitudes ancrées pour ne plus reprendre',
      mainBonus: 'Kit détox livré à domicile (curcuma bio, gingembre frais, citron, infusion drainage) pour démarrer concret dès la réception',
      guaranteeResult: '-3 à -6 kg, énergie retrouvée et 3 habitudes alimentaires ancrées',
      marketPrice: 'entre 400€ et 800€',
      inactionCost: 'reprendre 3-5 kg chaque post-Ramadan et perdre les bénéfices du jeûne',
      prospectOrigin: 'webinar',
      pillar1Name: 'Nettoyage & Réintroduction',
      pillar2Name: 'Ancrage des Habitudes Durables',
      callerName: '', channel: 'Email', finalEvent: 'webinaire « comment éviter la reprise de poids post-Aïd en 7 gestes »'
    }
  }
];
