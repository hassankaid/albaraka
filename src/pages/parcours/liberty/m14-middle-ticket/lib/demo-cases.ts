/**
 * 10 démos M14 ARCHITECTURER MIDDLE-TICKET (casting standard Sidali v2.0.0, verbatim).
 * Couverture : 4 formats MT illustrés. buildDemoState réplique loadDemo().
 */
import { defaultM14State, freshData, type M14State, type Decision } from "./types";

export interface DemoModule { index: number; nom: string; objectif_mesurable: string; livrable_attendu: string; duree_video_min: number; }
export interface DemoDecision { decision: Decision; adaptation: string; }
export interface DemoCase {
  id: string; name: string; tag: string;
  m1: { niche: string; avatar_nom: string; avatar_age: string };
  m5: { ht_point_a: string; ht_point_b: string; ht_timeframe_days: number };
  m6: { prix_ht: number; halal_no_riba: boolean; or: { nom: string } };
  m11: { point_a: string; point_b: string; tier_bloom_target: string; tier_bloom_target_label: string; duree_programme_mois: number; nb_modules: number; modules: DemoModule[] };
  m12: { programme_nom: string; programme_baseline: string };
  format_choisi: string;
  format_justification: string;
  matrice_reponses: { temps: string; niche: string; cadence: string };
  decisions: DemoDecision[];
  prix_mt: number; prix_mt_unite: string; valeur_percue_eur: number; justification_prix: string;
}

const FORMATS_EXPLORES = ["formation", "groupe", "masterclass", "membership"];

export const M14_DEMO_CASES: DemoCase[] = [
  {
    id: "aicha_cocon", name: "Aïcha — mompreneurs voilées", tag: "Groupe · MT 397 € · HT 1 497 €",
    m1: { niche: "Mères musulmanes voilées 28-40 ans qui veulent lancer une activité depuis chez elles tout en restant alignées avec leurs valeurs religieuses et familiales", avatar_nom: "Kenza", avatar_age: "32 ans" },
    m5: { ht_point_a: "Mère au foyer ou en congé parental sans revenu propre, frustrée de ne pas pouvoir contribuer financièrement", ht_point_b: "Première vente encaissée sur son activité depuis le salon, sans ouvrir de structure complexe", ht_timeframe_days: 60 },
    m6: { prix_ht: 1497, halal_no_riba: true, or: { nom: "Le Cocon Premium" } },
    m11: {
      point_a: "Mère au foyer sans revenu propre", point_b: "Première vente encaissée sur son activité",
      tier_bloom_target: "lt", tier_bloom_target_label: "Low Ticket — Comprendre & Appliquer", duree_programme_mois: 2, nb_modules: 4,
      modules: [
        { index: 1, nom: "Trouver une compétence rentable depuis chez soi", objectif_mesurable: "Identifier 3 compétences monétisables en 7 jours", livrable_attendu: "Liste validée de 3 compétences", duree_video_min: 25 },
        { index: 2, nom: "Tester son idée en 7 jours sans rien dépenser", objectif_mesurable: "Avoir parlé à 5 prospects et obtenu 2 intérêts concrets", livrable_attendu: "5 conversations documentées", duree_video_min: 30 },
        { index: 3, nom: "Encaisser sa première vente", objectif_mesurable: "Encaisser 1 vente d'au moins 50 €", livrable_attendu: "Preuve de paiement reçue", duree_video_min: 35 },
        { index: 4, nom: "Mettre en place une routine compatible famille", objectif_mesurable: "Documenter sa routine 4h/semaine sur 14 jours", livrable_attendu: "Journal de routine validé", duree_video_min: 20 },
      ],
    },
    m12: { programme_nom: "Le Cocon", programme_baseline: "Lancer ton activité depuis chez toi en 60 jours sans sacrifier ta famille" },
    format_choisi: "groupe",
    format_justification: "Mes mères ont besoin du call hebdo pour rompre l'isolement du foyer et oser parler de leur activité — sans ce lien, 80% abandonnent au 2e module faute d'accountability.",
    matrice_reponses: { temps: "une_deux", niche: "lien_fort", cadence: "transformation_accompagnee" },
    decisions: [
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Ajouter un template de message de prospection clés-en-main et remplacer le retour individuel du HT par un partage en call de groupe." },
      { decision: "garder", adaptation: "" },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 397, prix_mt_unite: "one_shot", valeur_percue_eur: 6000,
    justification_prix: "Une vente à 200 € encaissée justifie 397 € investis — et la valeur perçue sur 12 mois d'activité familiale est largement au-dessus.",
  },
  {
    id: "karim_closer", name: "Karim — closing halal éthique", tag: "Formation · MT 697 € · HT 4 497 €",
    m1: { niche: "Jeunes hommes musulmans 22-35 ans qui veulent générer 4-8k€/mois en remote sans riba ni manipulation", avatar_nom: "Ilyas", avatar_age: "27 ans" },
    m5: { ht_point_a: "Diplômé sans diplôme ou en reconversion, sans revenu remote et sans savoir par où commencer", ht_point_b: "Premier contrat closer signé à 8% de commission sur tickets ≥ 3 000 €", ht_timeframe_days: 90 },
    m6: { prix_ht: 4497, halal_no_riba: true, or: { nom: "Le Closer Halal Premium" } },
    m11: {
      point_a: "Sans revenu remote, sans diplôme reconnu", point_b: "Premier contrat closer signé à 8% sur tickets ≥ 3k€",
      tier_bloom_target: "mt", tier_bloom_target_label: "Mid Ticket — Analyser & Évaluer", duree_programme_mois: 3, nb_modules: 5,
      modules: [
        { index: 1, nom: "Comprendre la psychologie d'un acheteur premium", objectif_mesurable: "Identifier les 5 leviers psychologiques en 15 minutes de call simulé", livrable_attendu: "Cartographie des 5 leviers", duree_video_min: 45 },
        { index: 2, nom: "Maîtriser le script éthique en 4 blocs", objectif_mesurable: "Conduire un call de 45 min en respectant les 4 blocs sans script écrit", livrable_attendu: "Enregistrement audio validé", duree_video_min: 60 },
        { index: 3, nom: "Traiter les objections sans manipulation", objectif_mesurable: "Traiter 10 objections en rôle-play avec ≥ 80% de qualité", livrable_attendu: "Grille d'évaluation signée", duree_video_min: 50 },
        { index: 4, nom: "Décrocher son premier closing job halal", objectif_mesurable: "Signer un contrat closer à 8% min sur ticket ≥ 3 000 €", livrable_attendu: "Contrat signé", duree_video_min: 40 },
        { index: 5, nom: "Performer dans la durée et fidéliser", objectif_mesurable: "Maintenir un taux de closing ≥ 25% sur 30 jours consécutifs", livrable_attendu: "Tableau de bord 30j", duree_video_min: 35 },
      ],
    },
    m12: { programme_nom: "Le Closer Halal", programme_baseline: "Premier contrat closer signé à 8% en 90 jours, sans manipulation" },
    format_choisi: "formation",
    format_justification: "Mes élèves sont autonomes, techniques et préfèrent avancer à leur rythme. Le call de groupe ralentit les rapides et ne sert pas les profils business qui veulent du contenu dense et exécutable seul.",
    matrice_reponses: { temps: "zero", niche: "autonomie", cadence: "transformation_unique" },
    decisions: [
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Remplacer le retour audio individuel du coach par une grille d'auto-évaluation et 3 audios modèles à imiter, avec checklist en 12 points." },
      { decision: "adapter", adaptation: "Fournir 30 enregistrements de vrais closes commentés à la voix off plutôt que des rôle-plays vivants — l'élève bosse seul en boucle." },
      { decision: "garder", adaptation: "" },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 697, prix_mt_unite: "one_shot", valeur_percue_eur: 8000,
    justification_prix: "8% de commission sur un ticket à 5 000 € fait 400 € — donc le programme est rentabilisé dès le 2e closing.",
  },
  {
    id: "sofia_reconversion", name: "Sofia — reconversion cadres en burn-out", tag: "Groupe · MT 997 € · HT 6 997 €",
    m1: { niche: "Cadres salariés 35-50 ans en burn-out qui veulent quitter leur job alimentaire pour une activité freelance ou un nouveau poste épanouissant", avatar_nom: "Yasmina", avatar_age: "42 ans" },
    m5: { ht_point_a: "Cadre en burn-out dans un job alimentaire sans savoir vers quoi se reconvertir et avec peur de tout perdre", ht_point_b: "Lancement freelance avec premier contrat ≥ 4 000 € HT OU nouveau poste salarié dans le secteur visé à ≥ 4 500 € net", ht_timeframe_days: 180 },
    m6: { prix_ht: 6997, halal_no_riba: false, or: { nom: "Reconversion Mastery Premium" } },
    m11: {
      point_a: "Cadre en burn-out, sans direction claire", point_b: "Premier contrat freelance ≥ 4k€ HT ou poste à ≥ 4 500 € net",
      tier_bloom_target: "ht", tier_bloom_target_label: "High Ticket — Créer & Évaluer", duree_programme_mois: 6, nb_modules: 6,
      modules: [
        { index: 1, nom: "Cartographier ses vraies forces et appétences", objectif_mesurable: "Produire la matrice forces/appétences en 14 jours et la valider en coaching", livrable_attendu: "Matrice signée par le coach", duree_video_min: 60 },
        { index: 2, nom: "Choisir sa direction (freelance vs salarié)", objectif_mesurable: "Trancher entre 3 hypothèses avec un score pondéré documenté", livrable_attendu: "Document de décision", duree_video_min: 50 },
        { index: 3, nom: "Construire son positionnement professionnel", objectif_mesurable: "Rédiger un pitch de 90 secondes validé en rôle-play", livrable_attendu: "Pitch vidéo enregistré", duree_video_min: 75 },
        { index: 4, nom: "Activer son réseau et générer des entretiens", objectif_mesurable: "Décrocher 10 entretiens qualifiés en 30 jours", livrable_attendu: "Tableau de bord 10 entretiens", duree_video_min: 65 },
        { index: 5, nom: "Décrocher son premier contrat / job", objectif_mesurable: "Signer un contrat ≥ 4 000 € HT ou un poste ≥ 4 500 € net", livrable_attendu: "Contrat ou promesse d'embauche", duree_video_min: 55 },
        { index: 6, nom: "Sécuriser la transition financière et opérationnelle", objectif_mesurable: "Plan de transition 90 jours validé avec marge de sécurité 6 mois", livrable_attendu: "Plan financier 90j", duree_video_min: 40 },
      ],
    },
    m12: { programme_nom: "Reconversion Mastery", programme_baseline: "6 mois pour quitter ton job alimentaire et signer ton premier contrat freelance à 4k+ ou ton nouveau poste épanouissant" },
    format_choisi: "groupe",
    format_justification: "Le burn-out demande de l'accountability hebdomadaire — sans call de groupe, mes cadres procrastinent 3 mois et abandonnent. Le lien fait 50% du résultat sur ce sujet émotionnel.",
    matrice_reponses: { temps: "une_deux", niche: "lien_fort", cadence: "transformation_accompagnee" },
    decisions: [
      { decision: "adapter", adaptation: "Remplacer la validation 1-to-1 par une auto-évaluation guidée + validation peer-to-peer en call de groupe semaine 2." },
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Rôle-play en groupe de 4 sur 30 minutes pendant le call hebdo, plutôt que coaching individuel — chacun reçoit 3 feedbacks." },
      { decision: "garder", adaptation: "" },
      { decision: "garder", adaptation: "" },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 997, prix_mt_unite: "one_shot", valeur_percue_eur: 12000,
    justification_prix: "Un contrat freelance signé à 4 000 € rentabilise 4 fois le programme. La valeur sur 12 mois de revenu freelance est largement supérieure.",
  },
  {
    id: "mehdi_ecom", name: "Mehdi — e-commerce dropshipping éthique", tag: "Membership · MT 67 €/mois · HT 2 997 €",
    m1: { niche: "Jeunes entrepreneurs 22-32 ans qui veulent monter un e-commerce dropshipping rentable et durable sans tomber dans les arnaques du game", avatar_nom: "Wassim", avatar_age: "25 ans" },
    m5: { ht_point_a: "Salarié sans business en ligne qui regarde des reels d'e-commerce sans jamais lancer", ht_point_b: "Boutique e-com rentable à 3 000 €/mois de bénéfice net stable sur 60 jours consécutifs", ht_timeframe_days: 120 },
    m6: { prix_ht: 2997, halal_no_riba: false, or: { nom: "E-com Bootcamp Premium" } },
    m11: {
      point_a: "Salarié sans aucune boutique en ligne lancée", point_b: "Boutique rentable à 3k€/mois net stable",
      tier_bloom_target: "mt", tier_bloom_target_label: "Mid Ticket — Analyser & Évaluer", duree_programme_mois: 4, nb_modules: 5,
      modules: [
        { index: 1, nom: "Choisir une niche e-com rentable et durable", objectif_mesurable: "Valider une niche avec 3 critères chiffrés en 7 jours", livrable_attendu: "Fiche niche signée", duree_video_min: 55 },
        { index: 2, nom: "Trouver et sourcer un produit gagnant", objectif_mesurable: "Identifier 1 produit avec une marge brute > 60% en 14 jours", livrable_attendu: "Test produit Shopify lancé", duree_video_min: 70 },
        { index: 3, nom: "Construire une boutique qui convertit", objectif_mesurable: "Lancer une boutique avec ≥ 2% de taux de conversion sur 100 visiteurs", livrable_attendu: "Boutique live et analytics", duree_video_min: 80 },
        { index: 4, nom: "Lancer les premières publicités Meta", objectif_mesurable: "Atteindre un ROAS ≥ 2 sur 1 000 € de dépense pub", livrable_attendu: "Dashboard ads à ROAS 2+", duree_video_min: 90 },
        { index: 5, nom: "Scaler à 3 000 € net/mois et stabiliser", objectif_mesurable: "Tenir 60 jours consécutifs à 3 000 €+ de net", livrable_attendu: "Statements bancaires sur 2 mois", duree_video_min: 60 },
      ],
    },
    m12: { programme_nom: "E-com Bootcamp", programme_baseline: "Boutique e-com rentable à 3k€/mois en 120 jours sans bullshit gourou" },
    format_choisi: "membership",
    format_justification: "L'e-com évolue tous les mois (algos Meta, plateformes, produits). Mes élèves ont besoin de veille continue plus que d'une transformation ponctuelle — un membership colle mieux que tout autre format.",
    matrice_reponses: { temps: "continu", niche: "communaute", cadence: "continu_long_terme" },
    decisions: [
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Remplacer le 1-to-1 sur la validation produit par une chaîne Discord dédiée + un live mensuel d'audit collectif des produits proposés." },
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Contenu de base livré + 1 update mensuel sur les changements d'algo Meta — c'est ce qui justifie le membership récurrent." },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 67, prix_mt_unite: "mensuel", valeur_percue_eur: 6000,
    justification_prix: "67 €/mois = 800 €/an, soit 4 fois moins qu'une seule formation Shopify Plus. Une seule pub qui marche grâce à un update mensuel paie 6 mois d'abonnement.",
  },
  {
    id: "yacine_devperso", name: "Yacine — dev perso musulman", tag: "Masterclass · MT 247 € · HT 1 997 €",
    m1: { niche: "Hommes musulmans 25-40 ans qui veulent reconnecter à leur deen tout en réussissant professionnellement dans un cadre francophone", avatar_nom: "Sofiane", avatar_age: "29 ans" },
    m5: { ht_point_a: "Musulman pratiquant épuisé par le décalage entre sa pratique religieuse et sa vie pro qui semble vide", ht_point_b: "Routine matinale spirituelle + clarté sur sa mission de vie alignée, tenue 90 jours d'affilée", ht_timeframe_days: 90 },
    m6: { prix_ht: 1997, halal_no_riba: true, or: { nom: "Niyya & Naissance Premium" } },
    m11: {
      point_a: "Décalage entre pratique religieuse et vie pro vide", point_b: "Routine spirituelle + mission de vie claire sur 90 jours",
      tier_bloom_target: "mt", tier_bloom_target_label: "Mid Ticket — Analyser & Évaluer", duree_programme_mois: 3, nb_modules: 4,
      modules: [
        { index: 1, nom: "Diagnostiquer son décalage spirituel/professionnel", objectif_mesurable: "Compléter un journal 14 jours avec 3 zones de friction identifiées", livrable_attendu: "Journal de 14 jours documenté", duree_video_min: 45 },
        { index: 2, nom: "Installer la routine matinale fajr + dhikr + intention", objectif_mesurable: "Tenir la routine 21 jours consécutifs avec preuves quotidiennes", livrable_attendu: "Tracker 21 jours signé", duree_video_min: 35 },
        { index: 3, nom: "Définir sa mission de vie alignée (niyya)", objectif_mesurable: "Rédiger sa niyya en 3 paragraphes validés par un coach", livrable_attendu: "Document niyya signé", duree_video_min: 55 },
        { index: 4, nom: "Aligner son agenda pro à sa niyya sur 90 jours", objectif_mesurable: "Bloquer 80% de son agenda pro selon les 3 zones d'alignement", livrable_attendu: "Agenda 90j aligné", duree_video_min: 40 },
      ],
    },
    m12: { programme_nom: "Niyya & Naissance", programme_baseline: "Reconnecter à ton deen sans sacrifier ta carrière, en 90 jours" },
    format_choisi: "masterclass",
    format_justification: "Mes élèves veulent un déclic clair en quelques heures, pas un parcours de 3 mois — la prise de conscience se fait dans un atelier intensif, le reste suit naturellement.",
    matrice_reponses: { temps: "sprint", niche: "lien_intense_ponctuel", cadence: "declic_court" },
    decisions: [
      { decision: "adapter", adaptation: "Compressé en exercice de 30 minutes pendant la masterclass live : 3 questions guidées + identification immédiate des frictions." },
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Format atelier en direct pendant la masterclass : chaque participant écrit sa niyya en 45 minutes guidées, feedback peer-to-peer." },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 247, prix_mt_unite: "one_shot", valeur_percue_eur: 4000,
    justification_prix: "4h d'atelier transformateur valent largement 247 € — un séminaire d'une journée équivalent se vend couramment 600 à 900 €.",
  },
  {
    id: "nora_cuisine", name: "Nora — cuisine famille halal", tag: "Formation · MT 247 € · HT 997 €",
    m1: { niche: "Mères de famille 30-45 ans francophones qui veulent cuisiner sain pour 4-5 enfants en moins de 30 min/repas sans se ruiner", avatar_nom: "Rachida", avatar_age: "36 ans" },
    m5: { ht_point_a: "Mère épuisée qui fait du basique tous les jours et culpabilise de ne pas mieux nourrir ses enfants", ht_point_b: "Routine 30 jours de menus famille équilibrés à moins de 5 €/personne, validée par les enfants", ht_timeframe_days: 60 },
    m6: { prix_ht: 997, halal_no_riba: true, or: { nom: "Sourire à Table Premium" } },
    m11: {
      point_a: "Mère épuisée qui répète les mêmes 5 plats", point_b: "Menus famille équilibrés < 5 €/personne validés par les enfants",
      tier_bloom_target: "lt", tier_bloom_target_label: "Low Ticket — Comprendre & Appliquer", duree_programme_mois: 2, nb_modules: 4,
      modules: [
        { index: 1, nom: "Bâtir un planning de menus 14 jours équilibré", objectif_mesurable: "Avoir un planning 14 jours validé nutritionnellement", livrable_attendu: "Planning signé", duree_video_min: 30 },
        { index: 2, nom: "Optimiser ses courses à moins de 5 €/personne", objectif_mesurable: "Réussir 7 courses consécutives sous le seuil", livrable_attendu: "Tickets de caisse archivés", duree_video_min: 25 },
        { index: 3, nom: "Cuisiner 30 plats famille en moins de 30 min", objectif_mesurable: "Réaliser 30 plats chronométrés sous 30 min", livrable_attendu: "30 photos avec timer visible", duree_video_min: 60 },
        { index: 4, nom: "Faire valider ses plats par les enfants", objectif_mesurable: "Avoir 80% de note ≥ 4/5 des enfants sur 30 plats", livrable_attendu: "Grille de notation 30 plats", duree_video_min: 20 },
      ],
    },
    m12: { programme_nom: "Sourire à Table", programme_baseline: "Des menus famille équilibrés à moins de 5 €/personne, validés par tes enfants" },
    format_choisi: "formation",
    format_justification: "Une mère de famille avec 4 enfants ne peut pas honorer un call hebdo fixe. Elle a besoin de contenu accessible à 22h après le coucher des petits, à son rythme.",
    matrice_reponses: { temps: "zero", niche: "autonomie", cadence: "transformation_unique" },
    decisions: [
      { decision: "garder", adaptation: "" },
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Remplacer la validation coach par une checklist visuelle en 7 critères et 30 vidéos de référence côté-à-côte." },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 247, prix_mt_unite: "one_shot", valeur_percue_eur: 2400,
    justification_prix: "Économiser 50 € par semaine sur les courses sur 12 mois fait 2 600 € — déjà plus que 10× le prix du programme.",
  },
  {
    id: "tarik_agence", name: "Tarik — agence B2B SaaS", tag: "Groupe · MT 997 € · HT 5 997 €",
    m1: { niche: "Fondateurs d'agences B2B SaaS 30-45 ans qui veulent passer de 30k€ à 100k€/mois MRR sans s'épuiser", avatar_nom: "Vincent", avatar_age: "38 ans" },
    m5: { ht_point_a: "Patron d'agence à 30k€/mois plafonné par sa propre charge de travail, sans système réplicable", ht_point_b: "Agence à 100k€/mois MRR avec une équipe autonome de 4 personnes et 10h/semaine en CEO", ht_timeframe_days: 180 },
    m6: { prix_ht: 5997, halal_no_riba: false, or: { nom: "Agency Scale Premium" } },
    m11: {
      point_a: "Agence à 30k€/mois plafonnée", point_b: "Agence à 100k€/mois avec équipe autonome",
      tier_bloom_target: "ht", tier_bloom_target_label: "High Ticket — Créer & Évaluer", duree_programme_mois: 6, nb_modules: 6,
      modules: [
        { index: 1, nom: "Auditer ses 90 derniers jours et identifier les goulots", objectif_mesurable: "Produire un audit chiffré sur 12 KPI", livrable_attendu: "Audit signé", duree_video_min: 70 },
        { index: 2, nom: "Construire l'offre packagée à 5k€/mois récurrent", objectif_mesurable: "Vendre 3 contrats à ≥ 5k€/mois en 60 jours", livrable_attendu: "3 contrats signés", duree_video_min: 80 },
        { index: 3, nom: "Recruter et former son premier closer-CSM", objectif_mesurable: "Avoir un closer-CSM opérationnel en 45 jours", livrable_attendu: "Onboarding 30j complété", duree_video_min: 75 },
        { index: 4, nom: "Automatiser la prospection outbound 50 RDV/mois", objectif_mesurable: "Tenir 50 RDV qualifiés/mois sur 60 jours", livrable_attendu: "CRM avec historique 60j", duree_video_min: 90 },
        { index: 5, nom: "Industrialiser la delivery avec SOP et templates", objectif_mesurable: "Réduire le temps CEO sur delivery à < 5h/semaine", livrable_attendu: "Library SOP complète", duree_video_min: 85 },
        { index: 6, nom: "Atteindre 100k€/mois et stabiliser sur 60 jours", objectif_mesurable: "Tenir 60 jours à ≥ 100k€/mois MRR", livrable_attendu: "Statements 2 mois consécutifs", duree_video_min: 60 },
      ],
    },
    m12: { programme_nom: "Agency Scale", programme_baseline: "De 30k€ à 100k€/mois en 6 mois sans s'épuiser, avec une équipe autonome" },
    format_choisi: "groupe",
    format_justification: "Les patrons d'agence à 30k€/mois ont besoin d'échanger entre pairs sur leurs cas spécifiques — un Slack actif + 1 call hebdo de 4 patrons donne 80% de la valeur du 1-to-1 à 1/6 du prix.",
    matrice_reponses: { temps: "une_deux", niche: "lien_fort", cadence: "transformation_accompagnee" },
    decisions: [
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Remplacer la review individuelle de l'offre par un atelier 'hot seat' en call de groupe — chaque patron passe sur le grill 20 min, les 3 autres challengent." },
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Ajouter une banque de séquences outbound entre patrons (chacun partage ses 3 meilleures) + 1 audit Slack mensuel sur les KPI prospection." },
      { decision: "garder", adaptation: "" },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 997, prix_mt_unite: "one_shot", valeur_percue_eur: 15000,
    justification_prix: "Un contrat à 5k€/mois sur 12 mois fait 60 000 € — soit 60× le prix. Même un seul contrat signé en 60 jours rentabilise largement.",
  },
  {
    id: "lina_fitness", name: "Lina — fitness féminin chez soi", tag: "Membership · MT 39 €/mois · HT 1 497 €",
    m1: { niche: "Femmes 25-45 ans qui veulent retrouver une forme physique régulière à la maison sans salle de sport et sans matériel coûteux", avatar_nom: "Mélanie", avatar_age: "34 ans" },
    m5: { ht_point_a: "Femme qui démarre un programme tous les 3 mois et abandonne entre la 2e et 4e semaine", ht_point_b: "Routine sportive 4×30 min/semaine tenue 90 jours d'affilée avec progression mesurable", ht_timeframe_days: 90 },
    m6: { prix_ht: 1497, halal_no_riba: false, or: { nom: "Force Femme Premium" } },
    m11: {
      point_a: "Démarre un programme et abandonne en 3-4 semaines", point_b: "Routine 4×30min/semaine tenue 90 jours avec progression",
      tier_bloom_target: "lt", tier_bloom_target_label: "Low Ticket — Comprendre & Appliquer", duree_programme_mois: 3, nb_modules: 4,
      modules: [
        { index: 1, nom: "Évaluer son niveau et fixer 3 KPI mesurables", objectif_mesurable: "Avoir 3 KPI baseline mesurés en J0 et J90", livrable_attendu: "Fiche baseline et photos", duree_video_min: 30 },
        { index: 2, nom: "Suivre le programme 4×30 min/semaine niveau adapté", objectif_mesurable: "Faire 48 séances sur 90 jours (4/semaine × 12 semaines)", livrable_attendu: "Tracker séances signé", duree_video_min: 720 },
        { index: 3, nom: "Adapter son alimentation famille sans régime drastique", objectif_mesurable: "Tenir le cadre alimentaire 80% du temps sur 60 jours", livrable_attendu: "Journal alimentaire 60j", duree_video_min: 45 },
        { index: 4, nom: "Maintenir la routine au-delà des 90 jours", objectif_mesurable: "Continuer 30 jours après la fin du programme", livrable_attendu: "Tracker post-J90", duree_video_min: 25 },
      ],
    },
    m12: { programme_nom: "Force Femme", programme_baseline: "Une routine sportive tenue 90 jours, à la maison, sans matériel" },
    format_choisi: "membership",
    format_justification: "Mes femmes abandonnent quand le programme finit — le membership avec nouveau contenu chaque mois maintient l'engagement à long terme et résout le vrai problème (abandon).",
    matrice_reponses: { temps: "continu", niche: "communaute", cadence: "continu_long_terme" },
    decisions: [
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Nouvelle série de 12 séances chaque mois pour entretenir la variation et l'engagement — c'est le coeur du membership, c'est ce qui justifie l'abonnement." },
      { decision: "adapter", adaptation: "1 mini-formation alimentation par trimestre + recettes hebdo dans le groupe Telegram. Pas de coaching individuel." },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 39, prix_mt_unite: "mensuel", valeur_percue_eur: 800,
    justification_prix: "39 €/mois = moins d'une seule séance avec un coach perso, et la santé sur 12 mois vaut mille fois ce prix.",
  },
  {
    id: "adam_immobilier", name: "Adam — immobilier halal", tag: "Masterclass · MT 297 € · HT 2 497 €",
    m1: { niche: "Salariés musulmans 30-45 ans qui veulent devenir propriétaires sans contracter de crédit conventionnel avec riba", avatar_nom: "Mounir", avatar_age: "36 ans" },
    m5: { ht_point_a: "Salarié locataire qui veut acheter sans riba mais ne sait pas par où commencer et a peur des montages douteux", ht_point_b: "Premier bien immobilier acquis par financement halal validé (Murabaha, Ijara ou apport+SCI famille), acte signé", ht_timeframe_days: 180 },
    m6: { prix_ht: 2497, halal_no_riba: true, or: { nom: "Patrimoine Halal Premium" } },
    m11: {
      point_a: "Salarié locataire sans patrimoine, peur du riba et des montages flous", point_b: "Premier bien acquis par financement halal validé, acte signé",
      tier_bloom_target: "mt", tier_bloom_target_label: "Mid Ticket — Analyser & Évaluer", duree_programme_mois: 6, nb_modules: 5,
      modules: [
        { index: 1, nom: "Comprendre les 3 vrais montages halal disponibles en France", objectif_mesurable: "Savoir expliquer Murabaha, Ijara et SCI famille en 5 min chacun", livrable_attendu: "Fiche synthèse 3 montages", duree_video_min: 80 },
        { index: 2, nom: "Calculer sa capacité d'achat réelle hors riba", objectif_mesurable: "Avoir un budget chiffré et validé en 14 jours", livrable_attendu: "Budget signé par expert", duree_video_min: 60 },
        { index: 3, nom: "Repérer le bien et négocier au juste prix", objectif_mesurable: "Avoir une short-list de 5 biens en zone choisie en 30 jours", livrable_attendu: "Short-list documentée", duree_video_min: 90 },
        { index: 4, nom: "Monter le dossier financier halal complet", objectif_mesurable: "Dossier accepté en pré-validation par 1 organisme", livrable_attendu: "Accord de principe écrit", duree_video_min: 75 },
        { index: 5, nom: "Signer l'acte authentique chez le notaire", objectif_mesurable: "Avoir l'acte signé en 6 mois max", livrable_attendu: "Acte de propriété", duree_video_min: 50 },
      ],
    },
    m12: { programme_nom: "Patrimoine Halal", programme_baseline: "Devenir propriétaire en 6 mois avec un montage validé sans riba" },
    format_choisi: "masterclass",
    format_justification: "Mes prospects ont besoin d'un déclic en 4 heures : comprendre les 3 vrais montages halal. Une fois ce déclic posé, ils peuvent agir seuls sur leur dossier — pas besoin de 6 mois d'accompagnement.",
    matrice_reponses: { temps: "sprint", niche: "lien_intense_ponctuel", cadence: "declic_court" },
    decisions: [
      { decision: "adapter", adaptation: "Bloc 1 de la masterclass (90 min) : explication des 3 montages avec cas concrets chiffrés + Q&R en live." },
      { decision: "adapter", adaptation: "Bloc 2 (60 min) : calculatrice fournie + chacun calcule sa capacité en live et la partage anonymement pour validation collective." },
      { decision: "retirer", adaptation: "" },
      { decision: "adapter", adaptation: "Bloc 3 (60 min) : checklist détaillée du dossier + 3 templates de courriers aux organismes Murabaha." },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 297, prix_mt_unite: "one_shot", valeur_percue_eur: 8000,
    justification_prix: "Économiser 80 000 € d'intérêts sur 20 ans en passant par un montage halal validé vaut plus que les 297 € d'investissement initial.",
  },
  {
    id: "sara_photo", name: "Sara — photographie newborn", tag: "Formation · MT 397 € · HT 1 997 €",
    m1: { niche: "Photographes débutants/intermédiaires 25-45 ans qui veulent se spécialiser sur le créneau newborn premium à 600€+ la séance", avatar_nom: "Charlotte", avatar_age: "32 ans" },
    m5: { ht_point_a: "Photographe généraliste qui galère à se faire payer et alterne baby/mariage/corporate sans vraiment percer", ht_point_b: "Studio newborn rentable avec 6 séances/mois à 600 €+ et 3 mois d'avance de réservations", ht_timeframe_days: 120 },
    m6: { prix_ht: 1997, halal_no_riba: false, or: { nom: "Newborn Mastery Premium" } },
    m11: {
      point_a: "Photographe généraliste qui galère sur les tarifs", point_b: "Studio newborn rentable 6 séances/mois à 600€+",
      tier_bloom_target: "mt", tier_bloom_target_label: "Mid Ticket — Analyser & Évaluer", duree_programme_mois: 4, nb_modules: 5,
      modules: [
        { index: 1, nom: "Maîtriser les 12 poses newborn safe en studio", objectif_mesurable: "Réaliser les 12 poses sur 3 newborns différents", livrable_attendu: "Portfolio 36 photos", duree_video_min: 90 },
        { index: 2, nom: "Construire un studio à moins de 1 500 € de matériel", objectif_mesurable: "Avoir un studio fonctionnel chiffré et photographié", livrable_attendu: "Inventaire + photos studio", duree_video_min: 60 },
        { index: 3, nom: "Créer son portfolio newborn signature", objectif_mesurable: "Portfolio de 30 photos validées en cohérence visuelle", livrable_attendu: "Site portfolio en ligne", duree_video_min: 75 },
        { index: 4, nom: "Trouver et signer ses 6 premiers clients à 600 €+", objectif_mesurable: "Signer 6 contrats à ≥ 600 € la séance en 60 jours", livrable_attendu: "6 contrats signés", duree_video_min: 80 },
        { index: 5, nom: "Construire 3 mois d'avance de réservations", objectif_mesurable: "Avoir 18 séances réservées sur 90 jours", livrable_attendu: "Calendrier réservation", duree_video_min: 50 },
      ],
    },
    m12: { programme_nom: "Newborn Mastery", programme_baseline: "Studio newborn rentable à 600€/séance en 4 mois" },
    format_choisi: "formation",
    format_justification: "Mes photographes sont visuels, autodidactes, et préfèrent revoir une démo de pose 30 fois plutôt qu'attendre un call. Le format vidéo seul colle à leur mode d'apprentissage naturel.",
    matrice_reponses: { temps: "zero", niche: "autonomie", cadence: "transformation_unique" },
    decisions: [
      { decision: "garder", adaptation: "" },
      { decision: "garder", adaptation: "" },
      { decision: "adapter", adaptation: "Remplacer la review individuelle du portfolio par 15 portfolios commentés en vidéo + checklist de cohérence visuelle en 8 critères." },
      { decision: "adapter", adaptation: "Fournir 5 templates de messages de prospection + 3 scripts de call commercial enregistrés en démo plutôt que rôle-play individuel." },
      { decision: "retirer", adaptation: "" },
    ],
    prix_mt: 397, prix_mt_unite: "one_shot", valeur_percue_eur: 5000,
    justification_prix: "Une seule séance à 600 € rentabilise déjà 1.5× le programme. La valeur sur 12 mois d'activité spécialisée newborn dépasse largement.",
  },
];

/** Réplique loadDemo() : sauvegarde implicite (gérée par la Page), bascule démo, atterrit à l'étape format. */
export function buildDemoState(demoId: string): M14State | null {
  const demo = M14_DEMO_CASES.find((d) => d.id === demoId);
  if (!demo) return null;
  const base = defaultM14State();
  const modules_decision = demo.m11.modules.map((mod, i) => ({
    index: mod.index || i + 1,
    nom_origine: mod.nom || "",
    objectif_origine: mod.objectif_mesurable || "",
    livrable_origine: mod.livrable_attendu || "",
    duree_video_min: mod.duree_video_min || 0,
    decision: demo.decisions[i]?.decision || ("" as Decision),
    adaptation: demo.decisions[i]?.adaptation || "",
  }));
  return {
    ...base,
    demoMode: demo.id,
    _activeDemo: demo.id,
    current: "format",
    highest: "lock",
    m1_data: demo.m1,
    m5_data: demo.m5,
    m6_data: demo.m6,
    m11_data: demo.m11,
    m12_data: demo.m12,
    data: {
      ...freshData(),
      formats_explores: [...FORMATS_EXPLORES],
      format_choisi: demo.format_choisi,
      format_justification: demo.format_justification,
      matrice_reponses: { ...demo.matrice_reponses },
      modules_decision,
      modules_decision_format_origine: demo.format_choisi,
      prix_mt: demo.prix_mt,
      prix_mt_unite: demo.prix_mt_unite,
      valeur_percue_eur: demo.valeur_percue_eur,
      justification_prix: demo.justification_prix,
    },
  };
}
