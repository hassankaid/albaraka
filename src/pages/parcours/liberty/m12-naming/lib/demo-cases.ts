/**
 * 10 démos M12 NAMING (casting standard Sidali v1.2.1, verbatim).
 * Couverture : 5 techniques × 3 tiers. buildDemoState réplique loadDemo().
 */
import { type M12State, type M12Data, defaultM12State, deepClone } from "./types";

export interface DemoCase {
  id: string; name: string; tag: string;
  m1: any; m3: any; m5: any; m6: any; m11: any;
  data: M12Data;
}

export const M12_DEMO_CASES: DemoCase[] = [
  {
    id: "aicha_cocon", name: "Aïcha — mompreneurs voilées", tag: "Identité · Le Cocon · low ticket à 297 €",
    m1: { niche: "Mères musulmanes voilées 28-40 ans qui veulent lancer une activité depuis chez elles tout en restant alignées avec leurs valeurs religieuses et familiales", avatar_nom: "Kenza", avatar_age: "32 ans", avatar_revenu: "0-800 €/mois" },
    m3: { hero_mecanisme_nom: "Méthode Cocon Mompreneurs", headline_promesse: "Lancer ton activité depuis chez toi en 60 jours sans sacrifier ta famille" },
    m5: { ht_point_a: "Mère au foyer ou en congé parental sans revenu propre et frustrée de ne pas pouvoir contribuer financièrement", ht_point_b: "Première vente encaissée sur ton activité depuis ton salon, sans ouvrir de structure complexe", ht_timeframe_days: 60, headline_promesse: "Lancer ton activité depuis chez toi en 60 jours" },
    m6: { prix_ht: 297, halal_no_riba: true, or: { nom: "Méthode Cocon Mompreneurs" }, dominant_pain: "Vouloir contribuer financièrement sans abandonner ses enfants" },
    m11: { point_a: "Mère au foyer sans revenu propre", point_b: "Première vente encaissée sur son activité", tier_bloom_target: "lt", tier_bloom_target_label: "Low Ticket — Comprendre & Appliquer", duree_programme_mois: 2, nb_modules: 4, modules: [
      { index: 1, nom: "Trouver une compétence rentable depuis chez soi", objectif_mesurable: "Identifier 3 compétences monétisables en 7 jours", niveau_bloom_label: "Appliquer", livrable_attendu: "Liste validée de 3 compétences", duree_video_min: 25 },
      { index: 2, nom: "Tester son idée en 7 jours sans rien dépenser", objectif_mesurable: "Avoir parlé à 5 prospects et obtenu 2 intérêts concrets", niveau_bloom_label: "Appliquer", livrable_attendu: "5 conversations documentées", duree_video_min: 30 },
      { index: 3, nom: "Encaisser sa première vente", objectif_mesurable: "Encaisser 1 vente d'au moins 50 €", niveau_bloom_label: "Créer", livrable_attendu: "Preuve de paiement reçue", duree_video_min: 35 },
      { index: 4, nom: "Mettre en place une routine compatible famille", objectif_mesurable: "Documenter sa routine 4h/semaine sur 14 jours", niveau_bloom_label: "Analyser", livrable_attendu: "Journal de routine validé", duree_video_min: 20 },
    ] },
    data: {
      candidats: [
        { nom: "Le Cocon", technique: "identite", notes: "Évoque chaleur, protection, intimité du foyer." },
        { nom: "Mompreneur Halal", technique: "identite", notes: "Trop générique, trop long." },
        { nom: "Maman 60 Jours", technique: "chiffre_promesse", notes: "Chiffre clair mais trop centré sur 'maman'." },
        { nom: "Le Foyer Actif", technique: "metaphore", notes: "Pas mal, mais moins évocateur." },
        { nom: "Sakina Business", technique: "identite", notes: "Trop niche, pas assez large." },
      ],
      top3_indices: [0, 3, 4],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Yasmine (sœur) a redit « Le Cocon » sans hésiter au téléphone, premier essai.", google: true, google_trace: "Aucune offre concurrente directe sur la 1ère page Google ; quelques garderies et un blog déco.", promesse: true, promesse_trace: "Latifa (mère, 32 ans) a deviné « accompagnement business pour mamans » au mot.", resonance: true, resonance_trace: "Ouafa, Nadia, Karima — 3/3 ont validé « c'est exactement ça ».", nom_teste: "Le Cocon" } },
      final: { nom: "Le Cocon", baseline: "Lancer ton activité depuis chez toi en 60 jours sans sacrifier ta famille", technique: "identite", candidat_idx_source: 0 },
      positionnement: { cat_type: "accompagnement business", cat_cible: "pour les mamans qui veulent rester à la maison avec leurs enfants", cat_resultat: "et lancer une activité depuis leur salon sans structure complexe", ennemi_declare: "Les gourous masculins qui te disent de tout déléguer et de viser 100k/mois — ignorant ta réalité de mère" },
      methode: { nom: "", baseline: "", est_acronyme: false, acronyme_developpe: "" },
      modules_renommes: [],
      premier_choix_intuitif: "identite",
      generator_inputs: { acronyme_mots: "", metaphore_themes: "spirituel, nature, chaleur", chiffre_unite: "jours", chiffre_valeur: "60" },
    },
  },
  {
    id: "karim_closer", name: "Karim — closing halal éthique", tag: "Métaphore · Le Closer Halal · mid ticket à 2 497 €",
    m1: { niche: "Jeunes hommes musulmans 22-35 ans qui veulent générer 4-8k€/mois en remote sans riba ni manipulation", avatar_nom: "Ilyas", avatar_age: "27 ans" },
    m3: { hero_mecanisme_nom: "Méthode Closing Halal", headline_promesse: "Premier contrat closer signé à 8% en 90 jours, sans manipulation" },
    m5: { ht_point_a: "Diplômé sans diplôme ou en reconversion, sans revenu remote et sans savoir par où commencer", ht_point_b: "Premier contrat closer signé à 8% de commission sur tickets ≥ 3 000 €", ht_timeframe_days: 90, headline_promesse: "Premier contrat closer en 90 jours" },
    m6: { prix_ht: 2497, halal_no_riba: true, or: { nom: "Closing Halal Pro" }, dominant_pain: "Vouloir 4-8k/mois remote sans savoir comment closer éthiquement" },
    m11: { point_a: "Sans revenu remote, sans diplôme reconnu", point_b: "Premier contrat closer signé à 8% sur tickets ≥ 3k€", tier_bloom_target: "mt", tier_bloom_target_label: "Mid Ticket — Analyser & Évaluer", duree_programme_mois: 3, nb_modules: 5, modules: [
      { index: 1, nom: "Comprendre la psychologie d'un acheteur premium", objectif_mesurable: "Identifier les 5 leviers psychologiques en 15 minutes de call simulé", niveau_bloom_label: "Comprendre", livrable_attendu: "Cartographie des 5 leviers", duree_video_min: 45 },
      { index: 2, nom: "Maîtriser le script éthique en 4 blocs", objectif_mesurable: "Conduire un call de 45 min en respectant les 4 blocs sans script écrit", niveau_bloom_label: "Appliquer", livrable_attendu: "Enregistrement audio validé", duree_video_min: 60 },
      { index: 3, nom: "Traiter les objections sans manipulation", objectif_mesurable: "Traiter 10 objections en rôle-play avec ≥ 80% de qualité", niveau_bloom_label: "Analyser", livrable_attendu: "Grille d'évaluation signée", duree_video_min: 50 },
      { index: 4, nom: "Décrocher son premier closing job halal", objectif_mesurable: "Signer un contrat closer à 8% min sur ticket ≥ 3 000 €", niveau_bloom_label: "Créer", livrable_attendu: "Contrat signé", duree_video_min: 40 },
      { index: 5, nom: "Performer dans la durée et fidéliser", objectif_mesurable: "Maintenir un taux de closing ≥ 25% sur 30 jours consécutifs", niveau_bloom_label: "Évaluer", livrable_attendu: "Tableau de bord 30j", duree_video_min: 35 },
    ] },
    data: {
      candidats: [
        { nom: "Le Closer Halal", technique: "metaphore", notes: "Direct, image forte, dit la mission." },
        { nom: "Closing Halal Pro", technique: "resultat_methode", notes: "Trop sec, sonne marketing." },
        { nom: "BARAKA Closing", technique: "acronyme", notes: "Acronyme à expliciter." },
        { nom: "La Voix Juste", technique: "metaphore", notes: "Joli mais trop abstrait pour la cible." },
        { nom: "Halal Sales Academy", technique: "identite", notes: "Contient academy — trop générique." },
      ],
      top3_indices: [0, 2, 3],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Hamza (collègue) a redit « Le Closer Halal » sans erreur, premier essai.", google: true, google_trace: "1ère page Google : 4 résultats sur le closing classique, aucun positionné halal.", promesse: true, promesse_trace: "Ilyas (cible, 26 ans) a deviné « formation vente éthique pour musulmans ».", resonance: true, resonance_trace: "Yassine, Mehdi, Anas — 3/3 ont validé fortement la résonance.", nom_teste: "Le Closer Halal" } },
      final: { nom: "Le Closer Halal", baseline: "Premier contrat closer signé à 8% en 90 jours, sans manipulation", technique: "metaphore", candidat_idx_source: 0 },
      positionnement: { cat_type: "programme de closing", cat_cible: "pour jeunes musulmans qui veulent un revenu remote 4-8k/mois", cat_resultat: "et payent au résultat halal, sans manipulation", ennemi_declare: "Les méthodes de vente type Wolf of Wall Street fondées sur la pression psychologique et la manipulation" },
      methode: { nom: "BARAKA", baseline: "La méthode de closing éthique en 6 blocs", est_acronyme: true, acronyme_developpe: "Bienveillance, Authenticité, Récolte, Argumenter, Kif (alignement), Alliance" },
      modules_renommes: [],
      premier_choix_intuitif: "metaphore",
      generator_inputs: { acronyme_mots: "bienveillance authenticité récolte argumenter alliance", metaphore_themes: "spirituel, force", chiffre_unite: "jours", chiffre_valeur: "90" },
    },
  },
  {
    id: "sofia_reconversion", name: "Sofia — reconversion cadres en burn-out", tag: "Résultat+Méthode · Reconversion Mastery · high ticket à 6 997 €",
    m1: { niche: "Cadres salariés 35-50 ans en burn-out qui veulent quitter leur job alimentaire pour une activité freelance ou un nouveau poste épanouissant", avatar_nom: "Yasmina", avatar_age: "42 ans" },
    m3: { hero_mecanisme_nom: "Reconversion Method", headline_promesse: "Reconversion vers freelance 4k+ ou nouveau poste épanouissant en 6 mois" },
    m5: { ht_point_a: "Cadre en burn-out depuis 2 ans dans un job alimentaire sans savoir vers quoi se reconvertir et avec peur de tout perdre", ht_point_b: "Lancement freelance avec premier contrat ≥ 4 000 € HT OU nouveau poste salarié dans le secteur visé à ≥ 4 500 € net", ht_timeframe_days: 180, headline_promesse: "Reconversion réussie en 6 mois" },
    m6: { prix_ht: 6997, halal_no_riba: false, or: { nom: "Reconversion Mastery Premium" }, dominant_pain: "Burn-out dans un job alimentaire sans savoir vers quoi pivoter" },
    m11: { point_a: "Cadre en burn-out, sans direction claire", point_b: "Premier contrat freelance ≥ 4k€ HT ou poste à ≥ 4 500 € net", tier_bloom_target: "ht", tier_bloom_target_label: "High Ticket — Créer & Évaluer", duree_programme_mois: 6, nb_modules: 6, modules: [
      { index: 1, nom: "Cartographier ses vraies forces et appétences", objectif_mesurable: "Produire la matrice forces/appétences en 14 jours et la valider en coaching", niveau_bloom_label: "Analyser", livrable_attendu: "Matrice signée par le coach", duree_video_min: 60 },
      { index: 2, nom: "Choisir sa direction (freelance vs salarié)", objectif_mesurable: "Trancher entre 3 hypothèses avec un score pondéré documenté", niveau_bloom_label: "Évaluer", livrable_attendu: "Document de décision", duree_video_min: 50 },
      { index: 3, nom: "Construire son positionnement professionnel", objectif_mesurable: "Rédiger un pitch de 90 secondes validé en rôle-play", niveau_bloom_label: "Créer", livrable_attendu: "Pitch vidéo enregistré", duree_video_min: 75 },
      { index: 4, nom: "Activer son réseau et générer des entretiens", objectif_mesurable: "Décrocher 10 entretiens qualifiés en 30 jours", niveau_bloom_label: "Appliquer", livrable_attendu: "Tableau de bord 10 entretiens", duree_video_min: 65 },
      { index: 5, nom: "Décrocher son premier contrat / job", objectif_mesurable: "Signer un contrat ≥ 4 000 € HT ou un poste ≥ 4 500 € net", niveau_bloom_label: "Créer", livrable_attendu: "Contrat ou promesse d'embauche", duree_video_min: 55 },
      { index: 6, nom: "Sécuriser la transition financière et opérationnelle", objectif_mesurable: "Plan de transition 90 jours validé avec marge de sécurité 6 mois", niveau_bloom_label: "Évaluer", livrable_attendu: "Plan financier 90j", duree_video_min: 40 },
    ] },
    data: {
      candidats: [
        { nom: "Reconversion Mastery", technique: "resultat_methode", notes: "Dit clairement le résultat et la maîtrise." },
        { nom: "6 Months Pivot", technique: "chiffre_promesse", notes: "Pas mal mais sonne très anglo-saxon." },
        { nom: "Le Tremplin Pro", technique: "metaphore", notes: "Joli mais commun, déjà vu." },
        { nom: "Reconversion Sprint", technique: "resultat_methode", notes: "Trop court pour une reconversion 6 mois." },
        { nom: "PIVOT", technique: "acronyme", notes: "Acronyme intéressant mais à expliciter." },
      ],
      top3_indices: [0, 1, 2],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Marc (associé) a redit « Reconversion Mastery » sans difficulté.", google: true, google_trace: "1ère page Google : plusieurs concurrents sur la reconversion mais aucun avec « Mastery ».", promesse: true, promesse_trace: "Caroline (cible) a deviné « programme pour quitter son job » spontanément.", resonance: true, resonance_trace: "Stéphanie, Olivier, Frédérique — 2/3 ont validé, le 3e a trouvé « un peu marketing ».", nom_teste: "Reconversion Mastery" } },
      final: { nom: "Reconversion Mastery", baseline: "6 mois pour quitter ton job alimentaire et signer ton premier contrat freelance à 4k+ ou ton nouveau poste épanouissant", technique: "resultat_methode", candidat_idx_source: 0 },
      positionnement: { cat_type: "accompagnement reconversion", cat_cible: "pour cadres en burn-out qui refusent de repartir de zéro", cat_resultat: "et signent leur premier contrat à 4k+ ou un nouveau poste épanouissant en 6 mois", ennemi_declare: "Les bilans de compétences à 1 500 € qui te rendent un PDF générique et te laissent seul face à ton CV" },
      methode: { nom: "PIVOT", baseline: "Le framework reconversion en 5 piliers", est_acronyme: true, acronyme_developpe: "Positionner, Identifier, Valider, Offrir, Tenir" },
      modules_renommes: [
        { index: 1, nom_origine: "Cartographier ses vraies forces et appétences", nom_final: "Le Mapping Identité Pro", baseline: "Découvrir tes vraies forces sans test générique" },
        { index: 2, nom_origine: "Choisir sa direction (freelance vs salarié)", nom_final: "Le Choix Stratégique", baseline: "Trancher entre 3 hypothèses sans peur de te tromper" },
        { index: 3, nom_origine: "Construire son positionnement professionnel", nom_final: "Le Pitch de 90 secondes", baseline: "L'arme absolue pour décrocher tous tes entretiens" },
        { index: 4, nom_origine: "Activer son réseau et générer des entretiens", nom_final: "L'Activation Réseau", baseline: "10 entretiens qualifiés en 30 jours, sans LinkedIn spammé" },
        { index: 5, nom_origine: "Décrocher son premier contrat / job", nom_final: "La Première Signature", baseline: "Contrat 4k+ ou poste 4 500 € net dans les mains" },
        { index: 6, nom_origine: "Sécuriser la transition financière et opérationnelle", nom_final: "Le Filet de Sécurité", baseline: "Plan 90 jours qui te garantit 6 mois de visibilité" },
      ],
      premier_choix_intuitif: "resultat_methode",
      generator_inputs: { acronyme_mots: "positionner identifier valider offrir tenir", metaphore_themes: "mouvement, construction", chiffre_unite: "mois", chiffre_valeur: "6" },
    },
  },
  {
    id: "mehdi_dropshipping", name: "Mehdi — e-commerce débutant", tag: "Chiffre+Promesse · Le 90 Days Launch · mid ticket à 1 997 €",
    m1: { niche: "E-commerçants débutants 25-40 ans qui veulent lancer une boutique Shopify rentable en partant de zéro", avatar_nom: "Hassen", avatar_age: "29 ans" },
    m3: { hero_mecanisme_nom: "90 Days Launch", headline_promesse: "Boutique Shopify rentable à 5 000 € de CA mensuel en 90 jours" },
    m5: { ht_point_a: "Sans boutique, sans produit choisi, intimidé par la technique et noyé dans les tutoriels gratuits contradictoires", ht_point_b: "Boutique Shopify lancée et rentable à 5 000 € de CA mensuel avec ROAS ≥ 2", ht_timeframe_days: 90, headline_promesse: "Boutique rentable à 5k€/mois en 90 jours" },
    m6: { prix_ht: 1997, halal_no_riba: false, or: { nom: "90 Days Launch Plus" }, dominant_pain: "Vouloir une boutique Shopify rentable sans savoir choisir un produit ni driver du trafic" },
    m11: { point_a: "Sans boutique, sans produit, sans trafic", point_b: "Boutique à 5 000 € CA mensuel avec ROAS ≥ 2", tier_bloom_target: "mt", tier_bloom_target_label: "Mid Ticket — Analyser & Évaluer", duree_programme_mois: 3, nb_modules: 5, modules: [
      { index: 1, nom: "Choisir un produit gagnant en 7 jours", objectif_mesurable: "Valider 1 produit avec score ≥ 8/10 sur la matrice de validation", niveau_bloom_label: "Analyser", livrable_attendu: "Matrice produit signée", duree_video_min: 45 },
      { index: 2, nom: "Construire la boutique Shopify qui convertit", objectif_mesurable: "Boutique live avec 5 pages produits, mentions légales et tunnel de paiement testé", niveau_bloom_label: "Créer", livrable_attendu: "URL de la boutique live", duree_video_min: 60 },
      { index: 3, nom: "Lancer ses premières publicités Meta Ads", objectif_mesurable: "Premier achat client à un CAC ≤ 20 €", niveau_bloom_label: "Appliquer", livrable_attendu: "Screenshot du premier achat", duree_video_min: 70 },
      { index: 4, nom: "Scaler à 5 000 € de CA mensuel", objectif_mesurable: "Atteindre 5 000 € de CA mensuel avec ROAS ≥ 2 sur 30 jours consécutifs", niveau_bloom_label: "Évaluer", livrable_attendu: "Tableau de bord 30j", duree_video_min: 55 },
      { index: 5, nom: "Mettre en place le service client et la logistique", objectif_mesurable: "Process logistique documenté et délais ≤ 5 jours sur 95% des commandes", niveau_bloom_label: "Analyser", livrable_attendu: "SOP logistique", duree_video_min: 40 },
    ] },
    data: {
      candidats: [
        { nom: "Le 90 Days Launch", technique: "chiffre_promesse", notes: "Chiffre clair + promesse claire." },
        { nom: "5K Shopify Method", technique: "chiffre_promesse", notes: "Bien mais limité à un seul niveau de CA." },
        { nom: "Shopify Sprint", technique: "resultat_methode", notes: "Trop générique." },
        { nom: "Le Décollage", technique: "metaphore", notes: "Joli mais ne dit pas e-com." },
        { nom: "Dropship Mastery", technique: "resultat_methode", notes: "Trop ancré dropshipping seul." },
      ],
      top3_indices: [0, 1, 3],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Anis (cible, 31 ans) a redit « Le 90 Days Launch » sans hésiter au téléphone.", google: true, google_trace: "1ère page Google : aucune offre francophone avec ce nom exact.", promesse: true, promesse_trace: "Sarra (cible) a deviné « programme e-com chronométré sur 90 jours ».", resonance: true, resonance_trace: "Hassen, Walid, Khalil — 3/3 ont validé, le chiffre 90 a fortement parlé.", nom_teste: "Le 90 Days Launch" } },
      final: { nom: "Le 90 Days Launch", baseline: "90 jours pour lancer ta boutique Shopify rentable à 5 000 € de CA mensuel, en partant de zéro", technique: "chiffre_promesse", candidat_idx_source: 0 },
      positionnement: { cat_type: "programme e-commerce chronométré", cat_cible: "pour débutants qui veulent un résultat daté", cat_resultat: "et qui atteignent 5 000 € de CA mensuel en 90 jours, mesurable", ennemi_declare: "Les formations e-com à 47 € qui te promettent l'indépendance financière mais te laissent seul devant Shopify sans roadmap" },
      methode: { nom: "", baseline: "", est_acronyme: false, acronyme_developpe: "" },
      modules_renommes: [],
      premier_choix_intuitif: "chiffre_promesse",
      generator_inputs: { acronyme_mots: "", metaphore_themes: "mouvement", chiffre_unite: "jours", chiffre_valeur: "90" },
    },
  },
  {
    id: "yacine_baraka", name: "Yacine — dev perso jeunes musulmans", tag: "Acronyme · BARAKA · low ticket à 147 €",
    m1: { niche: "Jeunes musulmans 18-25 ans qui veulent structurer leur quotidien, leurs études et leur foi en parallèle", avatar_nom: "Hamza", avatar_age: "21 ans" },
    m3: { hero_mecanisme_nom: "BARAKA Method", headline_promesse: "Reprendre le contrôle de ton quotidien en 5 piliers en 30 jours" },
    m5: { ht_point_a: "Étudiant ou jeune actif qui jongle entre études, prière, distraction des réseaux et procrastination chronique", ht_point_b: "Routine quotidienne stabilisée avec 5 prières à l'heure et progression mesurable en études ou activité", ht_timeframe_days: 30, headline_promesse: "Quotidien aligné en 30 jours" },
    m6: { prix_ht: 147, halal_no_riba: true, or: { nom: "BARAKA Pro" }, dominant_pain: "Jongler études + prière + distraction sans repères" },
    m11: { point_a: "Quotidien désordonné, prières manquées, procrastination", point_b: "Routine stabilisée, 5 prières à l'heure, progression mesurable", tier_bloom_target: "lt", tier_bloom_target_label: "Low Ticket — Comprendre & Appliquer", duree_programme_mois: 1, nb_modules: 5, modules: [
      { index: 1, nom: "Auditer son quotidien sans se juger", objectif_mesurable: "Tenir un journal de 7 jours documentant temps réel par activité", niveau_bloom_label: "Comprendre", livrable_attendu: "Journal 7j complété", duree_video_min: 20 },
      { index: 2, nom: "Aligner ses prières au quotidien", objectif_mesurable: "Effectuer 5 prières à l'heure pendant 7 jours consécutifs", niveau_bloom_label: "Appliquer", livrable_attendu: "Tracker prière 7j", duree_video_min: 25 },
      { index: 3, nom: "Bâtir sa routine matinale et soirée", objectif_mesurable: "Tenir routine matin + soir sur 14 jours consécutifs", niveau_bloom_label: "Appliquer", livrable_attendu: "Tracker routine 14j", duree_video_min: 30 },
      { index: 4, nom: "Reprendre la maîtrise des écrans", objectif_mesurable: "Réduire temps écran social à ≤ 1h/jour pendant 14 jours", niveau_bloom_label: "Analyser", livrable_attendu: "Capture temps écran 14j", duree_video_min: 25 },
      { index: 5, nom: "Avancer concrètement sur un objectif d'études ou projet", objectif_mesurable: "Compléter une unité de cours ou un sous-projet sur 14 jours", niveau_bloom_label: "Créer", livrable_attendu: "Preuve d'avancement", duree_video_min: 30 },
    ] },
    data: {
      candidats: [
        { nom: "BARAKA", technique: "acronyme", notes: "Cinq piliers structurants, mémorable." },
        { nom: "Le Sentier", technique: "metaphore", notes: "Bien mais trop spirituel sans le pratique." },
        { nom: "NOOR", technique: "identite", notes: "Court mais pas assez prescriptif." },
        { nom: "Daily Halal", technique: "identite", notes: "Anglo-arabe, peut perdre la cible." },
        { nom: "IMAN Method", technique: "acronyme", notes: "Acronyme intéressant mais déjà très utilisé." },
      ],
      top3_indices: [0, 1, 4],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Khalil (frère) a redit « BARAKA » du premier coup, c'est ancré culturellement.", google: true, google_trace: "1ère page Google : plusieurs usages culturels et religieux, aucune offre concurrente sur le dev perso.", promesse: true, promesse_trace: "Ayoub (cible, 22 ans) a deviné « accompagnement dev perso musulman ».", resonance: true, resonance_trace: "Hamza, Bilal, Ismaël — 3/3 ont validé, fort attachement au mot.", nom_teste: "BARAKA" } },
      final: { nom: "BARAKA", baseline: "5 piliers pour reprendre le contrôle de ton quotidien en 30 jours, sans culpabilité", technique: "acronyme", candidat_idx_source: 0 },
      positionnement: { cat_type: "programme dev perso", cat_cible: "pour jeunes musulmans qui veulent aligner foi, études et quotidien", cat_resultat: "et qui intègre les 5 prières comme socle structurel, pas comme option", ennemi_declare: "Les méthodes productivité type Atomic Habits qui ignorent totalement la dimension spirituelle ou la traitent comme un add-on" },
      methode: { nom: "BARAKA", baseline: "Le framework quotidien en 5 piliers", est_acronyme: true, acronyme_developpe: "Bilan, Alignement, Routine, Action, Khayr (le bien)" },
      modules_renommes: [
        { index: 1, nom_origine: "Auditer son quotidien sans se juger", nom_final: "Bilan", baseline: "Voir vraiment où va ton temps en 7 jours" },
        { index: 2, nom_origine: "Aligner ses prières au quotidien", nom_final: "Alignement", baseline: "5 prières à l'heure pendant 7 jours d'affilée" },
        { index: 3, nom_origine: "Bâtir sa routine matinale et soirée", nom_final: "Routine", baseline: "Matin et soir verrouillés sur 14 jours" },
        { index: 4, nom_origine: "Reprendre la maîtrise des écrans", nom_final: "Action", baseline: "Écrans sociaux ≤ 1h/jour pendant 14 jours" },
        { index: 5, nom_origine: "Avancer concrètement sur un objectif d'études ou projet", nom_final: "Khayr", baseline: "Une vraie victoire concrète en 14 jours" },
      ],
      premier_choix_intuitif: "acronyme",
      generator_inputs: { acronyme_mots: "bilan alignement routine action khayr", metaphore_themes: "spirituel", chiffre_unite: "jours", chiffre_valeur: "30" },
    },
  },
  {
    id: "nora_cuisine", name: "Nora — cuisine famille healthy", tag: "Métaphore · La Cuisine Vivante · low ticket à 197 €",
    m1: { niche: "Femmes 28-45 ans qui veulent cuisiner sain et reprendre le contrôle de leur alimentation sans régime", avatar_nom: "Laure", avatar_age: "36 ans" },
    m3: { hero_mecanisme_nom: "Méthode Cuisine Vivante", headline_promesse: "Cuisiner sain et faire aimer les légumes à toute ta famille en 60 jours" },
    m5: { ht_point_a: "Cuisine répétitive et industrielle, enfants difficiles, sentiment d'échec à chaque repas", ht_point_b: "30 recettes maison maîtrisées que toute la famille demande, sans contrainte de régime", ht_timeframe_days: 60, headline_promesse: "Cuisine saine maîtrisée en 60 jours" },
    m6: { prix_ht: 197, halal_no_riba: false, or: { nom: "Cuisine Vivante Premium" }, dominant_pain: "Cuisine répétitive et industrielle, famille rétive aux légumes" },
    m11: { point_a: "Cuisine industrielle, enfants rétifs", point_b: "30 recettes maison validées famille", tier_bloom_target: "lt", tier_bloom_target_label: "Low Ticket — Comprendre & Appliquer", duree_programme_mois: 2, nb_modules: 4, modules: [
      { index: 1, nom: "Maîtriser les 10 légumes du quotidien", objectif_mesurable: "Cuisiner 10 légumes de 3 façons différentes en 14 jours", niveau_bloom_label: "Appliquer", livrable_attendu: "30 photos plats", duree_video_min: 35 },
      { index: 2, nom: "Réinventer les recettes du dimanche", objectif_mesurable: "5 recettes familiales validées par toute la famille", niveau_bloom_label: "Créer", livrable_attendu: "Carnet de famille", duree_video_min: 45 },
      { index: 3, nom: "Faire aimer les légumes aux enfants", objectif_mesurable: "Enfants mangent 5 légumes différents avec plaisir sur 14 jours", niveau_bloom_label: "Évaluer", livrable_attendu: "Tracker enfants 14j", duree_video_min: 30 },
      { index: 4, nom: "Construire ses menus saison par saison", objectif_mesurable: "Plan de menus 4 saisons documenté avec 30 recettes au total", niveau_bloom_label: "Créer", livrable_attendu: "Plan menus annuel", duree_video_min: 40 },
    ] },
    data: {
      candidats: [
        { nom: "La Cuisine Vivante", technique: "metaphore", notes: "Évoque vitalité, fraîcheur, naturel — ancre la promesse." },
        { nom: "Healthy Family Kitchen", technique: "identite", notes: "Trop anglais pour la cible." },
        { nom: "Le Marché de Saison", technique: "metaphore", notes: "Joli mais déjà utilisé partout." },
        { nom: "Cuisine Maison Mastery", technique: "resultat_methode", notes: "Trop marketing." },
        { nom: "60 Jours Sains", technique: "chiffre_promesse", notes: "Pas mal mais manque de chaleur." },
      ],
      top3_indices: [0, 2, 4],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Sophie (amie) a redit « La Cuisine Vivante » sans erreur au téléphone.", google: true, google_trace: "1ère page Google : quelques blogs cuisine mais aucune offre formation avec ce nom.", promesse: true, promesse_trace: "Caroline (cible, 38 ans) a deviné « cuisine saine pour famille ».", resonance: true, resonance_trace: "Anne-Laure, Émilie, Aude — 2/3 ont validé, la 3e trouvait « un peu vague ».", nom_teste: "La Cuisine Vivante" } },
      final: { nom: "La Cuisine Vivante", baseline: "60 jours pour cuisiner sain et faire aimer les légumes à toute ta famille, sans régime", technique: "metaphore", candidat_idx_source: 0 },
      positionnement: { cat_type: "méthode cuisine famille", cat_cible: "pour mamans qui veulent que toute la famille mange sain", cat_resultat: "et qui transforme les enfants difficiles en mangeurs curieux, sans contrainte ni régime", ennemi_declare: "Les comptes Instagram nutrition qui culpabilisent les mamans avec des bols Buddha photogéniques que personne ne fait vraiment au quotidien" },
      methode: { nom: "", baseline: "", est_acronyme: false, acronyme_developpe: "" },
      modules_renommes: [],
      premier_choix_intuitif: "metaphore",
      generator_inputs: { acronyme_mots: "", metaphore_themes: "nature, vie", chiffre_unite: "jours", chiffre_valeur: "60" },
    },
  },
  {
    id: "tarik_agency", name: "Tarik — agence growth B2B SaaS", tag: "Résultat+Méthode · Agency Sprint · high ticket à 12 000 €",
    m1: { niche: "Dirigeants de SaaS B2B early-stage 30-50 ans qui ont moins de 50 clients et veulent passer à 250 clients en 12 mois", avatar_nom: "Khaled", avatar_age: "41 ans" },
    m3: { hero_mecanisme_nom: "Agency Sprint Method", headline_promesse: "De 50 à 250 clients B2B en 12 mois avec un système d'acquisition prédictible" },
    m5: { ht_point_a: "SaaS B2B bloqué à 30-80 clients avec acquisition lente, dépendance au founder et churn flou", ht_point_b: "250 clients payants avec MRR ≥ 30k€ et taux d'acquisition prédictible mois après mois", ht_timeframe_days: 365, headline_promesse: "250 clients B2B en 12 mois" },
    m6: { prix_ht: 12000, halal_no_riba: false, or: { nom: "Agency Sprint Enterprise" }, dominant_pain: "Acquisition B2B lente, dépendance founder, churn flou" },
    m11: { point_a: "30-80 clients, acquisition lente, dépendance founder", point_b: "250 clients payants, MRR 30k€, acquisition prédictible", tier_bloom_target: "ht", tier_bloom_target_label: "High Ticket — Créer & Évaluer", duree_programme_mois: 12, nb_modules: 6, modules: [
      { index: 1, nom: "Cartographier son ICP avec données réelles", objectif_mesurable: "Définir ICP avec 5 critères validés sur les 20 derniers clients gagnés", niveau_bloom_label: "Analyser", livrable_attendu: "Document ICP signé", duree_video_min: 60 },
      { index: 2, nom: "Construire un funnel outbound prédictible", objectif_mesurable: "Funnel délivrant ≥ 30 meetings qualifiés/mois sur 60 jours", niveau_bloom_label: "Créer", livrable_attendu: "Dashboard 30 meetings/mois", duree_video_min: 90 },
      { index: 3, nom: "Mettre en place l'équipe SDR/AE", objectif_mesurable: "Équipe de 3 SDR + 2 AE opérationnelle avec ramp-up validé", niveau_bloom_label: "Créer", livrable_attendu: "Org chart + KPIs", duree_video_min: 75 },
      { index: 4, nom: "Optimiser le taux de closing et upsell", objectif_mesurable: "Taux closing ≥ 25% sur opportunités qualifiées + upsell ≥ 30% à 6 mois", niveau_bloom_label: "Évaluer", livrable_attendu: "Tableau de bord closing", duree_video_min: 65 },
      { index: 5, nom: "Réduire le churn sous 4%/mois", objectif_mesurable: "Churn mensuel ≤ 4% sur 90 jours consécutifs", niveau_bloom_label: "Évaluer", livrable_attendu: "Cohort analysis 90j", duree_video_min: 55 },
      { index: 6, nom: "Sécuriser une série A ou un cash-flow positif", objectif_mesurable: "Term sheet série A signée OU EBITDA positif 3 mois consécutifs", niveau_bloom_label: "Créer", livrable_attendu: "Term sheet ou rapport financier", duree_video_min: 50 },
    ] },
    data: {
      candidats: [
        { nom: "Agency Sprint", technique: "resultat_methode", notes: "Direct, dit la vitesse et le résultat." },
        { nom: "B2B Scale System", technique: "resultat_methode", notes: "Trop générique." },
        { nom: "SCALE-UP", technique: "acronyme", notes: "Pas mal mais déjà très utilisé." },
        { nom: "Le Pivot 250", technique: "chiffre_promesse", notes: "Chiffre fort mais énigmatique." },
        { nom: "Founder to CEO", technique: "identite", notes: "Joli message mais ne dit pas le mécanisme." },
      ],
      top3_indices: [0, 2, 3],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Reda (CEO ami) a redit « Agency Sprint » sans difficulté, premier essai.", google: true, google_trace: "1ère page Google : quelques agences anglo-saxonnes avec « sprint » mais pas en français B2B SaaS.", promesse: true, promesse_trace: "Mehdi (CEO cible) a deviné « accompagnement scale B2B chronométré ».", resonance: true, resonance_trace: "Khaled, Adel, Rachid — 3/3 ont validé, le mot « sprint » parle aux CEO.", nom_teste: "Agency Sprint" } },
      final: { nom: "Agency Sprint", baseline: "12 mois pour passer de 50 à 250 clients B2B avec un système d'acquisition prédictible mois après mois", technique: "resultat_methode", candidat_idx_source: 0 },
      positionnement: { cat_type: "accompagnement opérationnel", cat_cible: "pour CEO de SaaS B2B en early-stage qui veulent un système, pas une formation", cat_resultat: "et qui passent de 50 à 250 clients en 12 mois avec acquisition prédictible", ennemi_declare: "Les cabinets de conseil à 50k€ qui te livrent un PowerPoint de 80 slides et un Slack jamais relu" },
      methode: { nom: "SCALE", baseline: "Le framework B2B en 5 axes", est_acronyme: true, acronyme_developpe: "Segment, Cible, Acquisition, Livraison, Évaluation" },
      modules_renommes: [],
      premier_choix_intuitif: "resultat_methode",
      generator_inputs: { acronyme_mots: "segment cible acquisition livraison évaluation", metaphore_themes: "mouvement", chiffre_unite: "mois", chiffre_valeur: "12" },
    },
  },
  {
    id: "lina_fitness", name: "Lina — fitness femmes post-grossesse", tag: "Chiffre+Promesse · 12 Weeks Strong · mid ticket à 597 €",
    m1: { niche: "Femmes 28-45 ans qui veulent retrouver une forme physique solide et reprendre confiance en leur corps après une grossesse ou des années sans sport", avatar_nom: "Salima", avatar_age: "34 ans" },
    m3: { hero_mecanisme_nom: "12 Weeks Strong Method", headline_promesse: "Retrouver force, mobilité et confiance corporelle en 12 semaines, sans salle ni régime" },
    m5: { ht_point_a: "Sédentaire, douleurs lombaires, fatigue chronique, complexée par sa silhouette post-grossesse", ht_point_b: "Force fonctionnelle : 5 tractions assistées, 30 push-ups, 1 minute de planche, sans douleur", ht_timeframe_days: 84, headline_promesse: "Force et confiance en 12 semaines" },
    m6: { prix_ht: 597, halal_no_riba: false, or: { nom: "12 Weeks Strong Pro" }, dominant_pain: "Sédentarité post-grossesse, douleurs lombaires, complexes corporels" },
    m11: { point_a: "Sédentaire, douleurs lombaires, complexée", point_b: "5 tractions assistées, 30 push-ups, planche 1min, sans douleur", tier_bloom_target: "mt", tier_bloom_target_label: "Mid Ticket — Analyser & Évaluer", duree_programme_mois: 3, nb_modules: 4, modules: [
      { index: 1, nom: "Évaluer son état physique de départ", objectif_mesurable: "Test physique initial documenté (force, mobilité, douleur) avec photos", niveau_bloom_label: "Analyser", livrable_attendu: "Test initial signé", duree_video_min: 30 },
      { index: 2, nom: "Rééduquer le dos et la respiration", objectif_mesurable: "Routine quotidienne 15 min réalisée 5j/semaine pendant 4 semaines", niveau_bloom_label: "Appliquer", livrable_attendu: "Journal routine 4 sem", duree_video_min: 45 },
      { index: 3, nom: "Construire sa force fonctionnelle", objectif_mesurable: "Atteindre 3 tractions assistées + 20 push-ups en 4 semaines", niveau_bloom_label: "Évaluer", livrable_attendu: "Test mi-parcours vidéo", duree_video_min: 50 },
      { index: 4, nom: "Atteindre ses objectifs finaux et tenir dans la durée", objectif_mesurable: "5 tractions assistées + 30 push-ups + planche 1 min + 0 douleur lombaire", niveau_bloom_label: "Créer", livrable_attendu: "Test final vidéo + témoignage", duree_video_min: 45 },
    ] },
    data: {
      candidats: [
        { nom: "12 Weeks Strong", technique: "chiffre_promesse", notes: "Chiffre clair + promesse de force." },
        { nom: "Maman Forte", technique: "identite", notes: "Joli mais clive — toutes ne sont pas mamans." },
        { nom: "Force Mama", technique: "identite", notes: "Bof, sonne FB ads." },
        { nom: "Strong Method", technique: "resultat_methode", notes: "Trop banal." },
        { nom: "Le Réveil du Corps", technique: "metaphore", notes: "Beau mais vague." },
      ],
      top3_indices: [0, 4, 1],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Houda (amie) a redit « 12 Weeks Strong » sans erreur, premier essai.", google: true, google_trace: "1ère page Google : quelques programmes anglo-saxons mais aucun francophone avec ce nom.", promesse: true, promesse_trace: "Nadia (cible, 35 ans, jeune maman) a deviné « programme fitness 12 semaines ».", resonance: true, resonance_trace: "Souad, Amel, Linda — 3/3 ont validé, le « strong » a fait mouche.", nom_teste: "12 Weeks Strong" } },
      final: { nom: "12 Weeks Strong", baseline: "12 semaines pour retrouver force, mobilité et confiance corporelle — sans salle, sans régime", technique: "chiffre_promesse", candidat_idx_source: 0 },
      positionnement: { cat_type: "programme remise en forme", cat_cible: "pour femmes post-grossesse ou sédentaires de longue date", cat_resultat: "et qui vise la force fonctionnelle, pas la perte de poids cosmétique", ennemi_declare: "Les programmes minceur qui te promettent moins 10 kg mais ignorent que tu ne peux plus porter ton enfant sans douleur" },
      methode: { nom: "", baseline: "", est_acronyme: false, acronyme_developpe: "" },
      modules_renommes: [],
      premier_choix_intuitif: "chiffre_promesse",
      generator_inputs: { acronyme_mots: "", metaphore_themes: "force, mouvement", chiffre_unite: "semaines", chiffre_valeur: "12" },
    },
  },
  {
    id: "adam_patrimoine", name: "Adam — investissement immobilier halal", tag: "Identité · Le Patrimoine Halal · high ticket à 4 997 €",
    m1: { niche: "Investisseurs musulmans 30-50 ans qui veulent bâtir un patrimoine immobilier sans riba et sans compromettre leur foi", avatar_nom: "Younès", avatar_age: "38 ans" },
    m3: { hero_mecanisme_nom: "Patrimoine Halal Method", headline_promesse: "Premier investissement immobilier halal réalisé en 12 mois avec un cash-flow positif" },
    m5: { ht_point_a: "Salarié bien rémunéré qui veut investir mais bloqué par l'interdiction du riba et noyé dans les montages murabaha complexes", ht_point_b: "Premier bien immobilier acquis sans crédit conventionnel, avec cash-flow positif et structure légale halal documentée", ht_timeframe_days: 365, headline_promesse: "Premier bien immobilier halal en 12 mois" },
    m6: { prix_ht: 4997, halal_no_riba: true, or: { nom: "Patrimoine Halal Elite" }, dominant_pain: "Vouloir investir immo sans riba et sans montage complexe" },
    m11: { point_a: "Salarié sans patrimoine immo, bloqué par interdiction du riba", point_b: "Premier bien immobilier acquis sans riba, cash-flow positif", tier_bloom_target: "ht", tier_bloom_target_label: "High Ticket — Créer & Évaluer", duree_programme_mois: 12, nb_modules: 5, modules: [
      { index: 1, nom: "Comprendre les fondamentaux de la finance halal", objectif_mesurable: "QCM 90% sur les principes du riba, mudaraba, murabaha", niveau_bloom_label: "Comprendre", livrable_attendu: "QCM validé", duree_video_min: 75 },
      { index: 2, nom: "Définir sa stratégie patrimoniale alignée", objectif_mesurable: "Plan patrimonial 5 ans rédigé et validé en coaching", niveau_bloom_label: "Créer", livrable_attendu: "Plan 5 ans signé", duree_video_min: 90 },
      { index: 3, nom: "Maîtriser les montages halal (murabaha, ijara, partenariat)", objectif_mesurable: "Présenter 3 montages aux examinateurs avec score ≥ 8/10", niveau_bloom_label: "Analyser", livrable_attendu: "Présentation orale", duree_video_min: 85 },
      { index: 4, nom: "Identifier et négocier son premier bien", objectif_mesurable: "Compromis signé sur un bien avec cash-flow projeté positif", niveau_bloom_label: "Évaluer", livrable_attendu: "Compromis signé", duree_video_min: 70 },
      { index: 5, nom: "Finaliser l'acquisition et sécuriser le cash-flow", objectif_mesurable: "Acte authentique signé + premier loyer encaissé avec cash-flow positif", niveau_bloom_label: "Créer", livrable_attendu: "Acte + premier loyer", duree_video_min: 60 },
    ] },
    data: {
      candidats: [
        { nom: "Le Patrimoine Halal", technique: "identite", notes: "Univers fort, dit la mission, ancré." },
        { nom: "Halal Wealth Builder", technique: "identite", notes: "Anglais, perd la cible francophone." },
        { nom: "Méthode Murabaha", technique: "resultat_methode", notes: "Technique, sec, ne vend pas." },
        { nom: "Sakina Wealth", technique: "identite", notes: "Joli mais flou sur l'immo." },
        { nom: "BAYT", technique: "acronyme", notes: "Court, arabe, fort — à creuser." },
      ],
      top3_indices: [0, 4, 3],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Tariq (associé) a redit « Le Patrimoine Halal » sans difficulté.", google: true, google_trace: "1ère page Google : 2 articles d'info mais aucune offre directement concurrente.", promesse: true, promesse_trace: "Karim (cible, 41 ans) a deviné « accompagnement investissement halal ».", resonance: true, resonance_trace: "Anis, Mounir, Saïd — 3/3 ont validé fortement, « patrimoine » sonne sérieux et solide.", nom_teste: "Le Patrimoine Halal" } },
      final: { nom: "Le Patrimoine Halal", baseline: "12 mois pour bâtir ton premier bien immobilier sans riba, avec cash-flow positif dès le premier loyer", technique: "identite", candidat_idx_source: 0 },
      positionnement: { cat_type: "accompagnement immobilier", cat_cible: "pour investisseurs musulmans francophones qui refusent le riba", cat_resultat: "et qui acquièrent leur premier bien avec montage halal et cash-flow positif en 12 mois", ennemi_declare: "Les conseillers patrimoniaux conventionnels qui ignorent le riba et te poussent vers un crédit classique malgré tes valeurs" },
      methode: { nom: "BAYT", baseline: "Le framework patrimoine halal en 4 piliers", est_acronyme: true, acronyme_developpe: "Base (fondamentaux), Arbitrage (stratégie), Yield (rendement), Tenue (suivi)" },
      modules_renommes: [],
      premier_choix_intuitif: "identite",
      generator_inputs: { acronyme_mots: "base arbitrage yield tenue", metaphore_themes: "spirituel, construction", chiffre_unite: "mois", chiffre_valeur: "12" },
    },
  },
  {
    id: "sara_lumen", name: "Sara — photographie newborn", tag: "Acronyme · LUMEN · low ticket à 247 €",
    m1: { niche: "Photographes débutantes 25-40 ans qui veulent se spécialiser en photographie newborn et générer un revenu complémentaire stable", avatar_nom: "Yasmina", avatar_age: "31 ans" },
    m3: { hero_mecanisme_nom: "LUMEN Method", headline_promesse: "Première séance newborn payée 350 € en 90 jours, sans réseau ni studio" },
    m5: { ht_point_a: "Photographe passionnée mais sans clients, intimidée par les bébés et sans studio ni équipement spécifique", ht_point_b: "Première séance newborn facturée 350 € avec book de 5 séances réalisées et témoignages clients", ht_timeframe_days: 90, headline_promesse: "Première séance newborn payée en 90 jours" },
    m6: { prix_ht: 247, halal_no_riba: false, or: { nom: "LUMEN Pro" }, dominant_pain: "Photographe passionnée sans clients ni technique newborn" },
    m11: { point_a: "Photographe sans clients newborn, sans équipement spécifique", point_b: "Première séance facturée 350 €, book 5 séances, témoignages", tier_bloom_target: "lt", tier_bloom_target_label: "Low Ticket — Comprendre & Appliquer", duree_programme_mois: 3, nb_modules: 5, modules: [
      { index: 1, nom: "Maîtriser la sécurité et le confort du bébé", objectif_mesurable: "QCM sécurité 100% + grille de gestes validée par sage-femme", niveau_bloom_label: "Comprendre", livrable_attendu: "Certificat sécurité", duree_video_min: 40 },
      { index: 2, nom: "Maîtriser la lumière naturelle en intérieur", objectif_mesurable: "10 séries photo lumière naturelle validées en revue technique", niveau_bloom_label: "Appliquer", livrable_attendu: "10 séries photo", duree_video_min: 55 },
      { index: 3, nom: "Construire ses 5 poses signature newborn", objectif_mesurable: "5 poses signature documentées avec photos et schémas", niveau_bloom_label: "Créer", livrable_attendu: "Catalogue 5 poses", duree_video_min: 50 },
      { index: 4, nom: "Réaliser ses 5 premières séances test gratuites", objectif_mesurable: "5 séances test réalisées + 5 témoignages clients + book photo", niveau_bloom_label: "Appliquer", livrable_attendu: "Book + témoignages", duree_video_min: 45 },
      { index: 5, nom: "Vendre sa première séance payée à 350 €", objectif_mesurable: "1 séance facturée 350 € minimum avec contrat signé", niveau_bloom_label: "Créer", livrable_attendu: "Facture + contrat", duree_video_min: 40 },
    ] },
    data: {
      candidats: [
        { nom: "LUMEN", technique: "acronyme", notes: "Latin pour lumière — direct, court, mémorable." },
        { nom: "Newborn Mastery", technique: "resultat_methode", notes: "Trop générique." },
        { nom: "Première Lumière", technique: "metaphore", notes: "Beau mais long." },
        { nom: "Baby Light Method", technique: "resultat_methode", notes: "Trop FB ads." },
        { nom: "AURORE", technique: "identite", notes: "Joli, féminin — à creuser." },
      ],
      top3_indices: [0, 2, 4],
      tests_par_candidat: { "0": { telephone: true, telephone_trace: "Inès (sœur) a redit « LUMEN » sans erreur, court et facile.", google: true, google_trace: "1ère page Google : quelques marques tech mais aucune photographe newborn avec ce nom.", promesse: true, promesse_trace: "Lucie (cible, 29 ans) a deviné « formation photo, quelque chose avec la lumière ».", resonance: true, resonance_trace: "Émilie, Camille, Manon — 3/3 ont validé, « LUMEN » sonne précis et photographique.", nom_teste: "LUMEN" } },
      final: { nom: "LUMEN", baseline: "90 jours pour facturer ta première séance newborn 350 €, sans réseau ni studio, en maîtrisant la lumière naturelle", technique: "acronyme", candidat_idx_source: 0 },
      positionnement: { cat_type: "accompagnement newborn", cat_cible: "pour photographes débutantes qui veulent une spécialisation rentable", cat_resultat: "et qui démarre par la sécurité du bébé et finit par la première facture à 350 €", ennemi_declare: "Les formations photo en ligne génériques qui te montrent du portrait adulte sans aborder les gestes spécifiques au nouveau-né" },
      methode: { nom: "LUMEN", baseline: "Le protocole newborn en 5 étapes", est_acronyme: true, acronyme_developpe: "Lumière, Univers, Mouvement, Émotion, Négociation" },
      modules_renommes: [],
      premier_choix_intuitif: "acronyme",
      generator_inputs: { acronyme_mots: "lumière univers mouvement émotion négociation", metaphore_themes: "lumière", chiffre_unite: "jours", chiffre_valeur: "90" },
    },
  },
];

/** Réplique loadDemo() : state propre, demoMode, data clonée, upstream m1/m3/m5/m6/m11, démarre à l'étape 1. */
export function buildDemoState(demoId: string): M12State | null {
  const demo = M12_DEMO_CASES.find((d) => d.id === demoId);
  if (!demo) return null;
  const s = defaultM12State();
  s.demoMode = demo.id;
  s._activeDemo = demo.id;
  s.data = deepClone(demo.data);
  s.m1_data = demo.m1 || null; s.m1_source = "demo";
  s.m3_data = demo.m3 || null; s.m3_source = "demo";
  s.m5_data = demo.m5 || null; s.m5_source = "demo";
  s.m6_data = demo.m6 || null; s.m6_source = "demo";
  s.m11_data = demo.m11 || null; s.m11_source = "demo";
  s.highest = "lock";
  s.current = "comprendre";
  return s;
}
