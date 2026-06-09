/**
 * 10 démos M18 VALUE LADDER (casting canonique, cohérent M5/M11/M12/M14).
 * 3 cas « sans LT » (sofia, tarik, lina). MT membership = prix ANNUALISÉ (mehdi 804, lina 468).
 * buildDemoState réplique loadDemo() : data fusionnée, amont source 'demo', highest='lock', current='echelle'.
 */
import { freshData, freshState, deepClone, type M18State } from "./types";

export interface DemoCase { id: string; name: string; tag: string; m1: any; m6: any; m12: any; m14: any; data: any; }

export const DEMOS: DemoCase[] = [
  {
    id: "aicha_cocon", name: "Aïcha — mompreneurs voilées", tag: "LT 37 € · MT 397 € · HT 1 497 € · LTV 2,6×",
    m1: { niche: "Mères musulmanes voilées 28-40 ans qui veulent lancer une activité depuis chez elles tout en restant alignées avec leurs valeurs religieuses et familiales", avatar_nom: "Kenza", avatar_age: "32 ans" },
    m6: { prix_ht: 1497, halal_no_riba: true, or: { nom: "Le Cocon" } },
    m12: { programme_nom: "Le Cocon", programme_baseline: "Lancer ton activité depuis chez toi en 60 jours", methode_nom: "La Méthode Cocon", categorie_nouvelle: "business familial aligné" },
    m14: { mt_prix: 397, mt_prix_annualise: 397, mt_format_label: "Programme de groupe", methode_nom: "Le Cocon — version autonome", programme_ht_nom: "Le Cocon", prix_ht: 1497, halal_no_riba: true },
    data: {
      niveaux: {
        gratuit: { nom: "Décortiquer une activité lancée depuis le salon en 60 secondes", canaux: "Instagram + Reels", src: "manual" },
        lead_magnet: { nom: "La checklist des 7 activités lançables depuis chez soi sans diplôme", src: "manual" },
        lt: { nom: "Le mini-cours « ta première compétence rentable en 7 jours »", prix: 37, src: "manual" },
        mt: { nom: "Le Cocon — version autonome", prix: 397, format: "Programme de groupe", src: "manual" },
        ht: { nom: "Le Cocon", prix: 1497, src: "manual" },
      },
      connexion_lt_mt: "Le mini-cours fait identifier UNE compétence rentable ; Le Cocon enseigne tout le système pour en vivre — la compétence n’est que la première brique.",
      transitions: { lt_mt: "Séquence de 5 jours : jour 1 livraison + quick win, jour 3 témoignage d’une mère qui a encaissé, jour 5 offre du Cocon en groupe à -100 € pendant 48h.", mt_ht: "En fin de programme de groupe, bilan offert de 20 min ; celles qui veulent un accompagnement rapproché passent au Cocon en suivi individuel." },
      ltv: { taux_lt_mt: 15, taux_mt_ht: 10 },
    },
  },
  {
    id: "karim_closer", name: "Karim — closing halal éthique", tag: "LT 37 € · MT 697 € · HT 4 497 € · LTV 3,6×",
    m1: { niche: "Jeunes hommes musulmans 22-35 ans qui veulent générer 4-8k€/mois en remote sans riba ni manipulation", avatar_nom: "Ilyas", avatar_age: "27 ans" },
    m6: { prix_ht: 4497, halal_no_riba: true, or: { nom: "Le Closer Halal" } },
    m12: { programme_nom: "Le Closer Halal", programme_baseline: "Premier contrat closer signé à 8% en 90 jours", methode_nom: "La Méthode Sceau", categorie_nouvelle: "closing éthique" },
    m14: { mt_prix: 697, mt_prix_annualise: 697, mt_format_label: "Formation en ligne", methode_nom: "Le Closer Halal — version autonome", programme_ht_nom: "Le Closer Halal", prix_ht: 4497, halal_no_riba: true },
    data: {
      niveaux: {
        gratuit: { nom: "Analyser les erreurs de closing dans des appels réels (avec accord)", canaux: "YouTube + LinkedIn", src: "manual" },
        lead_magnet: { nom: "Le script de qualification éthique en 5 étapes (PDF)", src: "manual" },
        lt: { nom: "Le mini-training « traiter 3 objections sans manipulation »", prix: 37, src: "manual" },
        mt: { nom: "Le Closer Halal — version autonome", prix: 697, format: "Formation en ligne", src: "manual" },
        ht: { nom: "Le Closer Halal", prix: 4497, src: "manual" },
      },
      connexion_lt_mt: "Le mini-training résout les objections d’UN appel ; la formation enseigne tout le système de closing dont les objections ne sont qu’une étape. Le prospect réalise qu’il lui manque la structure complète.",
      transitions: { lt_mt: "Séquence 6 jours : démonstration d’un closing complet, étude de cas chiffrée, puis fenêtre d’inscription à la formation avec bonus role-play.", mt_ht: "À la fin de la formation, ceux qui veulent décrocher leur premier contrat sous 90 jours candidatent à l’accompagnement complet (places limitées)." },
      ltv: { taux_lt_mt: 14, taux_mt_ht: 9 },
    },
  },
  {
    id: "sofia_reconversion", name: "Sofia — reconversion cadres en burn-out", tag: "sans LT · MT 997 € · HT 6 997 € · entrée MT directe",
    m1: { niche: "Cadres salariés 35-50 ans en burn-out qui veulent quitter leur job alimentaire pour une activité freelance ou un nouveau poste épanouissant", avatar_nom: "Yasmina", avatar_age: "42 ans" },
    m6: { prix_ht: 6997, halal_no_riba: false, or: { nom: "Reconversion Mastery" } },
    m12: { programme_nom: "Reconversion Mastery", programme_baseline: "Quitter ton job alimentaire en 6 mois, sereinement", methode_nom: "La Méthode Cap", categorie_nouvelle: "reconversion accompagnée" },
    m14: { mt_prix: 997, mt_prix_annualise: 997, mt_format_label: "Programme de groupe", methode_nom: "Reconversion Mastery — cohorte", programme_ht_nom: "Reconversion Mastery", prix_ht: 6997 },
    data: {
      niveaux: {
        gratuit: { nom: "Décrypter un parcours de reconversion réussi", canaux: "LinkedIn + YouTube", src: "manual" },
        lead_magnet: { nom: "Le bilan « ton métier de transition idéal en 12 questions »", src: "manual" },
        lt: { nom: "", prix: 0, src: "manual" },
        mt: { nom: "Reconversion Mastery — cohorte", prix: 997, format: "Programme de groupe", src: "manual" },
        ht: { nom: "Reconversion Mastery", prix: 6997, src: "manual" },
      },
      connexion_lt_mt: "",
      transitions: { lt_mt: "", mt_ht: "À la fin de la cohorte, celles qui veulent un accompagnement individuel sur toute leur transition (et pas seulement le cadre) passent au programme complet." },
      ltv: { taux_lt_mt: 0, taux_mt_ht: 8 },
    },
  },
  {
    id: "mehdi_ecom", name: "Mehdi — e-commerce dropshipping éthique", tag: "LT 47 € · MT 67 €/mois · HT 2 997 € · LTV 2,9×",
    m1: { niche: "Jeunes entrepreneurs 22-32 ans qui veulent monter un e-commerce dropshipping rentable et durable sans tomber dans les arnaques du game", avatar_nom: "Wassim", avatar_age: "25 ans" },
    m6: { prix_ht: 2997, halal_no_riba: true, or: { nom: "E-com Bootcamp" } },
    m12: { programme_nom: "E-com Bootcamp", programme_baseline: "Première boutique rentable en 90 jours", methode_nom: "La Méthode Produit Durable", categorie_nouvelle: "e-commerce sain" },
    m14: { mt_prix: 67, mt_prix_annualise: 804, mt_format_label: "Membership (67 €/mois)", methode_nom: "Le Cercle E-com", programme_ht_nom: "E-com Bootcamp", prix_ht: 2997, halal_no_riba: true },
    data: {
      niveaux: {
        gratuit: { nom: "Analyses de boutiques qui tiennent dans la durée", canaux: "YouTube + TikTok", src: "manual" },
        lead_magnet: { nom: "La liste des 20 fournisseurs fiables et vérifiés", src: "manual" },
        lt: { nom: "Le mini-cours « trouver 3 produits gagnants sans te faire avoir »", prix: 47, src: "manual" },
        mt: { nom: "Le Cercle E-com", prix: 804, format: "Membership (67 €/mois)", src: "manual" },
        ht: { nom: "E-com Bootcamp", prix: 2997, src: "manual" },
      },
      connexion_lt_mt: "Le mini-cours fait trouver le produit ; le Cercle accompagne la boutique mois après mois (tests, scaling, SAV) — le produit seul ne suffit jamais.",
      transitions: { lt_mt: "À l’achat du mini-cours, essai du Cercle à 1 € le premier mois pour ancrer l’habitude, puis abonnement plein.", mt_ht: "Les membres prêts à scaler et déléguer rejoignent le Bootcamp avec accompagnement intensif et mises en relation fournisseurs." },
      ltv: { taux_lt_mt: 11, taux_mt_ht: 7 },
    },
  },
  {
    id: "yacine_devperso", name: "Yacine — dev perso musulman", tag: "LT 27 € · MT 247 € · HT 1 997 € · LTV 1,9×",
    m1: { niche: "Hommes musulmans 25-40 ans qui veulent reconnecter à leur deen tout en réussissant professionnellement dans un cadre francophone", avatar_nom: "Sofiane", avatar_age: "29 ans" },
    m6: { prix_ht: 1997, halal_no_riba: true, or: { nom: "Niyya & Naissance" } },
    m12: { programme_nom: "Niyya & Naissance", programme_baseline: "Aligner ta réussite pro et ta foi en 90 jours", methode_nom: "La Méthode Niyya", categorie_nouvelle: "développement aligné" },
    m14: { mt_prix: 247, mt_prix_annualise: 247, mt_format_label: "Masterclass", methode_nom: "Niyya & Naissance — masterclass", programme_ht_nom: "Niyya & Naissance", prix_ht: 1997, halal_no_riba: true },
    data: {
      niveaux: {
        gratuit: { nom: "Concilier deen et ambition pro en 60 secondes", canaux: "Instagram + YouTube", src: "manual" },
        lead_magnet: { nom: "Le rituel matinal de l’homme aligné (PDF + audio)", src: "manual" },
        lt: { nom: "La masterclass express « reprendre le contrôle de tes journées »", prix: 27, src: "manual" },
        mt: { nom: "Niyya & Naissance — masterclass", prix: 247, format: "Masterclass", src: "manual" },
        ht: { nom: "Niyya & Naissance", prix: 1997, src: "manual" },
      },
      connexion_lt_mt: "La masterclass express donne le déclic sur les journées ; le programme installe tout le système d’alignement (deen, travail, famille) sur la durée.",
      transitions: { lt_mt: "Séquence 5 jours : un premier rituel tenu, témoignage d’un homme qui a retrouvé l’équilibre, puis offre de la masterclass complète.", mt_ht: "Ceux qui veulent un accompagnement sur 90 jours avec suivi rejoignent le programme Niyya & Naissance." },
      ltv: { taux_lt_mt: 10, taux_mt_ht: 7 },
    },
  },
  {
    id: "nora_cuisine", name: "Nora — cuisine famille halal", tag: "LT 19 € · MT 247 € · HT 997 € · LTV 2,6×",
    m1: { niche: "Mères de famille 30-45 ans francophones qui veulent cuisiner sain pour 4-5 enfants en moins de 30 min/repas sans se ruiner", avatar_nom: "Rachida", avatar_age: "36 ans" },
    m6: { prix_ht: 997, halal_no_riba: true, or: { nom: "Sourire à Table" } },
    m12: { programme_nom: "Sourire à Table", programme_baseline: "Des repas sains pour toute la famille en moins de 30 min", methode_nom: "La Méthode Batch", categorie_nouvelle: "cuisine familiale saine" },
    m14: { mt_prix: 247, mt_prix_annualise: 247, mt_format_label: "Formation en ligne", methode_nom: "Sourire à Table — version autonome", programme_ht_nom: "Sourire à Table", prix_ht: 997, halal_no_riba: true },
    data: {
      niveaux: {
        gratuit: { nom: "Un repas familial sain en 30 secondes chrono", canaux: "Instagram + TikTok", src: "manual" },
        lead_magnet: { nom: "Le plan de 7 dîners halal équilibrés pour 5 en moins de 30 min", src: "manual" },
        lt: { nom: "Le mini-cours « 21 repas batch-cookés pour la semaine »", prix: 19, src: "manual" },
        mt: { nom: "Sourire à Table — version autonome", prix: 247, format: "Formation en ligne", src: "manual" },
        ht: { nom: "Sourire à Table", prix: 997, src: "manual" },
      },
      connexion_lt_mt: "Le mini-cours donne les repas tout prêts ; la formation apprend à composer soi-même ses menus batch sur la durée — le mini-cours crée l’envie de tenir dans le temps.",
      transitions: { lt_mt: "Séquence 5 jours : une première semaine batch-cookée réussie, témoignage d’une maman soulagée, puis offre de la formation complète.", mt_ht: "Les mamans qui veulent un accompagnement et des menus sur-mesure passent au programme complet avec suivi." },
      ltv: { taux_lt_mt: 12, taux_mt_ht: 6 },
    },
  },
  {
    id: "tarik_agence", name: "Tarik — agence B2B SaaS", tag: "sans LT · MT 997 € · HT 5 997 € · entrée MT directe",
    m1: { niche: "Fondateurs d'agences B2B SaaS 30-45 ans qui veulent passer de 30k€ à 100k€/mois MRR sans s'épuiser", avatar_nom: "Vincent", avatar_age: "38 ans" },
    m6: { prix_ht: 5997, halal_no_riba: false, or: { nom: "Agency Scale" } },
    m12: { programme_nom: "Agency Scale", programme_baseline: "Passer de 30k à 100k/mois MRR en 6 mois", methode_nom: "La Méthode Scale", categorie_nouvelle: "scaling d’agence" },
    m14: { mt_prix: 997, mt_prix_annualise: 997, mt_format_label: "Programme de groupe", methode_nom: "Agency Scale — mastermind", programme_ht_nom: "Agency Scale", prix_ht: 5997 },
    data: {
      niveaux: {
        gratuit: { nom: "Décortiquer la croissance d’agences SaaS qui scalent", canaux: "LinkedIn + X", src: "manual" },
        lead_magnet: { nom: "Le tableau de bord MRR de l’agence à 100k", src: "manual" },
        lt: { nom: "", prix: 0, src: "manual" },
        mt: { nom: "Agency Scale — mastermind", prix: 997, format: "Programme de groupe", src: "manual" },
        ht: { nom: "Agency Scale", prix: 5997, src: "manual" },
      },
      connexion_lt_mt: "",
      transitions: { lt_mt: "", mt_ht: "Les fondateurs du mastermind qui veulent un accompagnement 1-to-1 sur leur scaling et leurs recrutements rejoignent le programme complet." },
      ltv: { taux_lt_mt: 0, taux_mt_ht: 10 },
    },
  },
  {
    id: "lina_fitness", name: "Lina — fitness féminin chez soi", tag: "sans LT · MT 39 €/mois · HT 1 497 € · entrée MT directe",
    m1: { niche: "Femmes 25-45 ans qui veulent retrouver une forme physique régulière à la maison sans salle de sport et sans matériel coûteux", avatar_nom: "Mélanie", avatar_age: "34 ans" },
    m6: { prix_ht: 1497, halal_no_riba: false, or: { nom: "Force Femme" } },
    m12: { programme_nom: "Force Femme", programme_baseline: "Une forme physique durable à la maison en 12 semaines", methode_nom: "La Méthode Force", categorie_nouvelle: "fitness maison" },
    m14: { mt_prix: 39, mt_prix_annualise: 468, mt_format_label: "Membership (39 €/mois)", methode_nom: "Le Club Force Femme", programme_ht_nom: "Force Femme", prix_ht: 1497 },
    data: {
      niveaux: {
        gratuit: { nom: "Un exercice efficace par jour, sans matériel", canaux: "Instagram + TikTok", src: "manual" },
        lead_magnet: { nom: "Le programme 7 jours sans matériel (PDF + vidéos)", src: "manual" },
        lt: { nom: "", prix: 0, src: "manual" },
        mt: { nom: "Le Club Force Femme", prix: 468, format: "Membership (39 €/mois)", src: "manual" },
        ht: { nom: "Force Femme", prix: 1497, src: "manual" },
      },
      connexion_lt_mt: "",
      transitions: { lt_mt: "", mt_ht: "Les membres du Club qui veulent un plan sur-mesure et un suivi rapproché passent au programme Force Femme sur 12 semaines." },
      ltv: { taux_lt_mt: 0, taux_mt_ht: 7 },
    },
  },
  {
    id: "adam_immobilier", name: "Adam — immobilier halal", tag: "LT 29 € · MT 297 € · HT 2 497 € · LTV 2,0×",
    m1: { niche: "Salariés musulmans 30-45 ans qui veulent devenir propriétaires sans contracter de crédit conventionnel avec riba", avatar_nom: "Mounir", avatar_age: "36 ans" },
    m6: { prix_ht: 2497, halal_no_riba: true, or: { nom: "Patrimoine Halal" } },
    m12: { programme_nom: "Patrimoine Halal", programme_baseline: "Ton premier achat immobilier sans riba en 6 mois", methode_nom: "La Méthode Tayyib", categorie_nouvelle: "accession conforme" },
    m14: { mt_prix: 297, mt_prix_annualise: 297, mt_format_label: "Masterclass", methode_nom: "Patrimoine Halal — masterclass", programme_ht_nom: "Patrimoine Halal", prix_ht: 2497, halal_no_riba: true },
    data: {
      niveaux: {
        gratuit: { nom: "Décrypter un montage immobilier halal", canaux: "YouTube + LinkedIn", src: "manual" },
        lead_magnet: { nom: "Le comparatif des 4 montages immobiliers sans riba", src: "manual" },
        lt: { nom: "La masterclass « ton premier achat sans crédit conventionnel »", prix: 29, src: "manual" },
        mt: { nom: "Patrimoine Halal — masterclass", prix: 297, format: "Masterclass", src: "manual" },
        ht: { nom: "Patrimoine Halal", prix: 2497, src: "manual" },
      },
      connexion_lt_mt: "La masterclass donne la première stratégie d’achat ; le programme construit tout le plan patrimonial halal (financement, sourcing, fiscalité) dont elle n’est qu’une brique.",
      transitions: { lt_mt: "Séquence 6 jours : un premier montage compris, étude d’un achat réalisé sans riba, puis offre de la masterclass complète.", mt_ht: "Ceux qui veulent un accompagnement sur leur vrai projet d’achat passent au Patrimoine Halal avec rendez-vous individuels." },
      ltv: { taux_lt_mt: 10, taux_mt_ht: 8 },
    },
  },
  {
    id: "sara_photo", name: "Sara — photographie newborn", tag: "LT 27 € · MT 397 € · HT 1 997 € · LTV 2,8×",
    m1: { niche: "Photographes débutants/intermédiaires 25-45 ans qui veulent se spécialiser sur le créneau newborn premium à 600€+ la séance", avatar_nom: "Charlotte", avatar_age: "32 ans" },
    m6: { prix_ht: 1997, halal_no_riba: false, or: { nom: "Newborn Mastery" } },
    m12: { programme_nom: "Newborn Mastery", programme_baseline: "Tes séances newborn vendues à 600 € en 90 jours", methode_nom: "La Méthode Signature", categorie_nouvelle: "photo newborn premium" },
    m14: { mt_prix: 397, mt_prix_annualise: 397, mt_format_label: "Formation en ligne", methode_nom: "Newborn Mastery — version autonome", programme_ht_nom: "Newborn Mastery", prix_ht: 1997 },
    data: {
      niveaux: {
        gratuit: { nom: "Avant/après de retouches newborn expliquées", canaux: "Instagram + Pinterest", src: "manual" },
        lead_magnet: { nom: "Le guide des 5 poses sécurisées pour nouveau-nés", src: "manual" },
        lt: { nom: "Le mini-cours « ta première séance newborn vendue 350 € »", prix: 27, src: "manual" },
        mt: { nom: "Newborn Mastery — version autonome", prix: 397, format: "Formation en ligne", src: "manual" },
        ht: { nom: "Newborn Mastery", prix: 1997, src: "manual" },
      },
      connexion_lt_mt: "Le mini-cours fait vendre une première séance ; la formation enseigne tout le système (technique, retouche, vente premium) pour en vivre — la première vente crée l’envie de structurer.",
      transitions: { lt_mt: "Séquence 5 jours : une première séance vendue, étude d’une photographe passée au premium, puis offre de la formation complète.", mt_ht: "Les photographes qui veulent un retour sur leurs vraies séances et un suivi de mise en marché rejoignent le programme Newborn Mastery." },
      ltv: { taux_lt_mt: 12, taux_mt_ht: 8 },
    },
  },
];

/** Réplique loadDemo() : fresh state, data fusionnée, amont source 'demo', highest='lock', current='echelle'. */
export function buildDemoState(id: string): M18State | null {
  const demo = DEMOS.find((d) => d.id === id);
  if (!demo) return null;
  const fresh = freshState();
  fresh.demoMode = true;
  fresh._activeDemo = { id: demo.id, name: demo.name };
  fresh.data = Object.assign(freshData(), deepClone(demo.data));
  fresh.m1_data = demo.m1 ? { ...demo.m1 } : null; fresh.m1_source = demo.m1 ? "demo" : null;
  fresh.m6_data = demo.m6 ? { ...demo.m6 } : null; fresh.m6_source = demo.m6 ? "demo" : null;
  fresh.m12_data = demo.m12 ? { ...demo.m12 } : null; fresh.m12_source = demo.m12 ? "demo" : null;
  fresh.m14_data = demo.m14 ? { ...demo.m14 } : null; fresh.m14_source = demo.m14 ? "demo" : null;
  fresh.highest = "lock";
  fresh.current = "echelle";
  fresh._welcomeView = "choice";
  return fresh;
}
