/**
 * Mode démo — 10 cas pré-remplis pour le M2 PSYCHOLOGIE.
 * Réplique des `DEMO_CASES` Sidali V2 patch 1.5.0.
 *
 * Le 1er cas (Karim · Affiliation halal) est complet à 100% (ready=true).
 * Les 9 autres sont en placeholder (ready=false) — clic affiche un toast.
 * Les states complets viendront en transcription mécanique au prochain lot.
 *
 * En mode démo : state non persisté en BDD (cf. usePersistedState).
 */

import type { M2State } from "./types";

export interface M2DemoCase {
  key: string;
  segment: "argent" | "relation" | "sante";
  emoji: string;
  title: string;
  summary: string;
  ready: boolean;
  /** Partial state à charger en mémoire. step est forcé à `step1` pour démarrer la démo. */
  patch?: Partial<M2State>;
}

// ── Karim · Affiliation digitale halal (cas démo COMPLET, transcrit du HTML V2) ──
const KARIM_PATCH: Partial<M2State> = {
  step: "step1",
  highest: 9,
  m1: {
    source: "demo_argent_affiliation",
    completed_at: null,
    branche: "B",
    niche: {
      sub_niche:
        "Salariés musulmans 25-40 ans qui veulent générer 1 500-5 000€/mois en affiliation halal en 90 jours",
      label: "Affiliation digitale halal",
      name: "Affiliation digitale halal",
      pain: "Frustration de bosser pour un salaire insuffisant + manque d'option éthique",
      method: "Méthode 3-2-1 (contenu / DM / closing call)",
      contact_channels: "Instagram + Telegram halal + ads YouTube ciblées",
      growth: "Marché halal e-learning +35%/an",
      buying_power: "Pack 2 500€ vendu plusieurs centaines de fois sur la communauté",
      market: "B2C_INFO",
      market_domain: { id: "argent", label: "💰 Argent" },
      market_validation: null,
      archetype: { id: "strategie", emoji: "🎯", label: "Stratège" },
    },
    avatar: {
      name: "Karim", sex: "Homme", age: "31 ans", location: "Saint-Denis (93)",
      income: "Technicien réseaux CDI · 2 200€ net/mois",
      relationship: "Marié 4 ans, 1 enfant",
      family: "Famille en banlieue, ami d'enfance entrepreneur",
      situation: "Locataire HLM · vise un bien dans 3-5 ans",
      photo_url: null,
      problem:
        "Frustré de bosser pour un salaire qui ne lui permet ni d'épargner, ni d'aider sa famille",
      goals: "4 000€/mois supplémentaires en 12 mois, omra, aider sa mère",
      consequences: "Reste coincé 10 ans en CDI, son père vieillit sans aide matérielle",
      past: "Dropshipping (-800€), trading crypto (-1 200€), MLM abandonné",
      feeling: "Coincé, anxieux le dimanche soir, honte",
      paradise: "4h/jour de chez lui, son fils tous les soirs, donner sans calculer",
      avatar_phrase: "Je veux gagner ma vie sans choisir entre ma religion et mon avenir.",
    },
    promise: {
      statement: "Faire 1 000€ de commission sur ton premier cycle de 60 jours, sans riba.",
      text: "Faire 1 000€ de commission sur ton premier cycle de 60 jours, sans riba.",
    },
    market: "B2C_INFO",
    market_domain: { id: "argent", label: "💰 Argent" },
    archetype: { id: "strategie", emoji: "🎯", label: "Stratège" },
    signed_by: null,
    signed_on: null,
  },
  data: {
    welcome: {
      imported: true,
      sourceTag: "Cas démo M2 · Karim (basé sur le persona M1 argent_affiliation)",
    },
    step1: {
      pains: [
        {
          text: "Frustration de bosser 35h/semaine pour un salaire qui ne lui permet ni d'épargner, ni d'aider sa mère, ni de partir au Maroc voir sa famille",
          scene:
            "Lundi 8h17, RER B en direction de Châtelet. Il regarde son téléphone, voit le SMS Orange : « Vous serez d'astreinte ce weekend ». Il ferme l'app. Il pense à son fils qu'il ne verra pas dimanche. Il sent ce truc dans la poitrine — pas de la colère, plus pire : la résignation.",
        },
        {
          text: "Honte de devoir attendre la prime de 13ème mois pour acheter le tapis de prière neuf que sa femme veut depuis 6 mois",
          scene:
            "Vendredi 18h. Il rentre, sa femme est dans la cuisine. Elle ne lui dit rien sur le tapis qui s'effiloche dans le salon. Il sait qu'elle a remarqué. Il monte se changer et ferme la porte de la chambre 3 secondes pour respirer.",
        },
        {
          text: "Anxiété chronique du dimanche soir qui revient à chaque fin de weekend depuis 6 ans, et qui empire chaque année",
          scene:
            "Dimanche 21h47. Les enfants dorment. Sa femme regarde un truc sur le canapé. Lui scroll Instagram, voit Sidali poster un screenshot Stripe à 28K€. Il met le téléphone à plat sur la table. Il fixe le mur 12 secondes.",
        },
        {
          text: "Sentiment d'être passé à côté d'un truc que ses cousins entrepreneurs ont compris il y a 5 ans — et de ne plus pouvoir rattraper",
          scene:
            "Mariage d'un cousin, dîner. Son cousin Adel parle de son agence, signe d'un nouveau client à 8K€. Tout le monde rit. Karim sourit aussi. Il se dit qu'il a 31 ans, qu'Adel en a 28, et que l'écart va se creuser.",
        },
        {
          text: "Peur sourde de regarder son père vieillir sans pouvoir l'aider matériellement — et d'avoir à dire « j'avais pas les moyens » à sa propre conscience",
          scene:
            "Visite chez ses parents. Son père a un problème de plomberie. Il refuse l'aide d'un pro. Karim comprend que son père gère parce qu'il sait que son fils ne peut pas payer 400€ de réparation. Il dit rien. Il tient la lampe pendant que son père bricole.",
        },
      ],
    },
    step2: {
      desires: [
        {
          text: "Encaisser 4 000€ de commission halal en un mois, le voir s'afficher sur le dashboard, et savoir que c'est reproductible",
          scene:
            "Vendredi 14h32. Il est chez lui, en télétravail. Notification Stripe : +890€. Sa 4ème commission de la semaine. Il sourit pour la première fois depuis longtemps sans que sa femme ait à lui demander pourquoi il ne sourit jamais.",
        },
        {
          text: "Pouvoir donner 200€/mois à sa mère sans calculer, sans regarder son solde 3 fois avant",
          scene:
            "Premier vendredi du mois. Il fait le virement à sa mère. 200€. Il ne checke pas le solde. Il ferme l'app. Il sait qu'il refera ça dans 30 jours, et dans 60, et dans 360.",
        },
        {
          text: "Quitter Orange à la date qu'IL choisit, sans drame, en posant sa démission un lundi calme parce que son business ramène 3x son salaire depuis 6 mois",
          scene:
            "Mardi 10h. Il est dans le bureau de son N+1. Il dit : « Je vais te poser ma démission. » Il ne tremble pas. Il a 47 000€ sur son livret et un pipeline de 8 000€/mois sécurisé.",
        },
        {
          text: "Faire la omra avec sa femme l'an prochain, payer cash, sans crédit",
          scene:
            "Avril. Il est à Médine. Sa femme à côté de lui. Il pense au Karim de 31 ans qui rentrait du RER B le dimanche soir. Il pleure 3 secondes.",
        },
        {
          text: "Voir 11 de ses propres accompagnés sortir de leur CDI grâce à ce qu'il leur a transmis — et savoir que la baraka est dans la chaîne",
          scene:
            "WhatsApp. Yacine, son 9ème accompagné, lui envoie une capture : il vient de signer son 7ème client à 2 200€. Karim répond avec un audio de 14 secondes. Il dit alhamdulillah 3 fois.",
        },
      ],
      identity:
        "Un salarié musulman qui a refusé de choisir entre sa religion et son avenir. Quelqu'un que sa femme regarde avec autre chose que de la patience. Un fils qui peut enfin assumer son rôle. Un père qui rentre tôt parce qu'il a fini son boulot, pas parce qu'il a craqué.",
    },
    step3: {
      proofs: [
        {
          type: "Vidéo témoignage 90 sec d'un élève qui a la même tête que Karim",
          who: "Yacine, 33 ans, magasinier banlieue lyonnaise, marié 2 enfants, passé de 0 à 4 200€/mois en 5 mois d'affiliation halal",
          why: "Karim se reconnaît immédiatement — même profil socio, même contraintes religieuses, même point de départ.",
        },
        {
          type: "Capture Stripe dashboard avec montant + date",
          who: "Karim Boudjelal lui-même — chiffres précis : 1er mois 380€, 2e mois 1 240€, 3e mois 3 100€",
          why: "La progression chiffrée mois par mois rassure : Karim voit que ce n'est pas un coup de chance.",
        },
        {
          type: "Étude de cas écrite avec timeline + erreurs commises",
          who: "Mohamed, 38 ans, ex-livreur Stuart, qui détaille les 4 erreurs qu'il a faites les 60 premiers jours",
          why: "L'honnêteté sur les erreurs crée la confiance. Karim a marre des success stories trop lisses.",
        },
      ],
    },
    step4: {
      rarete: {
        angle: "Cohorte fermée à 12 places, 1 par trimestre. Vraie capacité de coaching 1-to-1 hebdo.",
        justif:
          "Au-delà de 12, je ne peux plus faire les calls hebdo individuels. C'est ma limite réelle, je peux montrer mon Calendly pour le prouver.",
      },
      reciprocite: {
        angle: "Audit gratuit 30 min (sans pitch) + Guide PDF « 5 erreurs qui coûtent 3 mois en affiliation halal »",
        justif:
          "Karim a déjà été déçu par 2 formations à 800€+ vides. L'audit prouve la qualité AVANT qu'il sorte sa carte.",
      },
      engagement: {
        angle: "Guide PDF gratuit → Mini-formation 27€ → Masterclass 97€ → Cohorte 1997€",
        justif: "Karim ne va pas mettre 2000€ direct chez un inconnu. L'échelle de paliers consolide la confiance.",
      },
    },
    step5: {
      top3: [
        {
          bias: "aversion_perte",
          why_dominant:
            "Karim a peur de re-perdre — il a déjà perdu 800€ en 2 formations vides. Le statu quo lui semble « sûr ».",
          how_activate:
            "Calculer le coût de l'inaction lors de l'audit : « 3 mois × 1500€ de manque à gagner = 4500€ perdus ». Cadrer en perte, pas en gain.",
        },
        {
          bias: "confirmation",
          why_dominant:
            "Karim cherche des preuves que c'est aussi pour des gens comme lui. Il a besoin de témoignages de salariés musulmans, banlieusards.",
          how_activate:
            "Mur de témoignages d'élèves musulmans, banlieusards, salariés. Préciser leur job d'origine (Orange, Carrefour), leur banlieue.",
        },
        {
          bias: "ikea",
          why_dominant:
            "Karim n'est pas un consommateur passif. Il valorise ce qu'il construit. Les formations vidéo passives le déçoivent.",
          how_activate:
            "Mon programme = 8 livrables co-construits (sa landing, ses 10 contenus, ses 5 emails). Karim sort avec SES outils.",
        },
      ],
    },
    step6: {
      phase: "consideration",
      justif:
        "Karim est en Considération. Il SAIT qu'il veut un revenu halal. Il a regardé 5 chaînes YouTube en 6 mois. Il compare maintenant les méthodes (affiliation, e-com, content). Mon job : me différencier par mon angle éthique + mes preuves musulmanes.",
      actions:
        "(1) Publier 1 témoignage/semaine d'un élève qui ressemble à Karim. (2) Lead magnet '5 erreurs en affiliation halal'. (3) Audit gratuit 30 min sans pitch.",
    },
    step7: {
      market: "B2C_INFO",
      vocab: {
        douleur_mots: [
          "j'en peux plus", "je vois mes potes avancer", "j'ai honte", "résignation",
          "je calcule chaque fin de mois", "scroll Instagram puis dégoût",
          "fatigue du dimanche soir", "il me dit rien mais je sens le regard",
        ],
        desir_mots: [
          "respirer enfin", "donner sans calculer", "être fier devant ma mère",
          "transmettre", "sans dévier du halal", "rentrer tôt parce que j'ai fini",
          "voir Stripe afficher", "alhamdulillah",
        ],
        positifs: ["halal", "baraka", "transmission", "dignité", "autonomie", "sunnah", "communauté", "akhira", "taqwa", "rigueur", "éthique"],
        negatifs: ["riba", "easy money", "gourou", "dropshipping douteux", "fake", "get rich quick", "arnaque", "MLM", "promesse vide"],
        formulations: [
          "j'ai pas le temps mais surtout j'ai pas la méthode",
          "j'ai déjà cramé 800€ dans 2 formations",
          "si seulement quelqu'un m'avait expliqué ça il y a 5 ans",
          "je veux pas me retrouver à 40 ans à dire que j'ai pas osé",
          "Adel l'a fait, pourquoi pas moi",
          "halal mais pas pauvre",
        ],
      },
    },
    step8: {
      positionnement:
        "Le seul accompagnement d'affiliation digitale halal qui combine rigueur fiqh + reproductibilité technique pour les salariés musulmans qui en ont marre des formations vides.",
      hook_principal: "« Le dimanche soir, tu calcules combien il te reste pour finir le mois ? »",
      levier_secondaire:
        "Insister sur la dimension transmission + dignité familiale (« tes enfants te verront comme l'oncle Adel qui a osé »). Karim ne fait pas ça pour l'argent — il le fait pour ne plus avoir honte.",
      biais_killer:
        "Aversion à la perte. Mon offre DOIT cadrer en perte : « chaque mois sans démarrer = X€ perdus ». Karim préfère ne pas tenter à risquer d'échouer — il faut renverser ça en : ne pas tenter = échouer par défaut.",
      phase_strategy:
        "Karim est en Considération. (1) Témoignages d'élèves jumeaux. (2) Lead magnet '5 erreurs en affiliation halal'. (3) Audit gratuit 30 min sans pitch.",
      directives_copywriting:
        "À UTILISER : baraka, dignité, transmission, halal, méthode, rigueur, akhira, sunnah, alhamdulillah, communauté. À BANNIR : riba, easy money, fake gourou, dropshipping, get rich quick, MLM, freedom (trop bobo), success (trop blanc), nomade digital.",
    },
  },
  scores: { step1: 90, step2: 88, step3: 85, step4: 91, step5: 89, step6: 88, step7: 87, step8: 86 },
  attempts: { step1: 1, step2: 1, step3: 1, step4: 1, step5: 1, step6: 1, step7: 1, step8: 1 },
};

export const M2_DEMO_CASES: M2DemoCase[] = [
  // ─── ARGENT (4) ───
  { key: "argent_affiliation", segment: "argent", emoji: "💼",
    title: "Karim · Affiliation digitale halal",
    summary: "Salarié 31 ans, technicien Orange, banlieue parisienne. Veut un revenu complémentaire éthique sans dévier du halal.",
    ready: true, patch: KARIM_PATCH },
  { key: "argent_setting_closing", segment: "argent", emoji: "📞",
    title: "Younes · Setting & Closing pour entrepreneurs musulmans",
    summary: "22 ans, Roubaix, BTS abandonné. Veut prouver qu'il peut réussir sans diplôme et sans tricher.",
    ready: false },
  { key: "argent_smma_etudiants", segment: "argent", emoji: "🎯",
    title: "Imen · Agence SMMA pour étudiants musulmans",
    summary: "Étudiante 20 ans, Lille. Veut financer son master sans crédit + soulager sa famille.",
    ready: false },
  { key: "argent_immo_sans_riba", segment: "argent", emoji: "🏠",
    title: "Mounia & Anas · Investissement immobilier sans riba",
    summary: "Couple 32-35 ans, Strasbourg. Veulent acheter leur RP cash sans crédit conventionnel.",
    ready: false },
  // ─── RELATIONS (3) ───
  { key: "relations_mariage_halal", segment: "relation", emoji: "💍",
    title: "Khadija · Préparation au mariage halal",
    summary: "Sœur 30 ans, prof à Toulouse, 4 ruptures de fiançailles. Veut se marier avec discernement.",
    ready: false },
  { key: "relations_couple_post_bebe", segment: "relation", emoji: "👨‍👩‍👧",
    title: "Aïcha & Tarek · Couples musulmans après l'arrivée des enfants",
    summary: "Couple 33-37 ans, 3 enfants. Vivent comme colocataires, veulent retrouver leur connexion.",
    ready: false },
  { key: "relations_education_positive", segment: "relation", emoji: "👩‍👧‍👦",
    title: "Najet · Éducation positive pour mamans musulmanes",
    summary: "Maman 35 ans de 3 enfants, banlieue lyonnaise. Crie tous les jours et culpabilise.",
    ready: false },
  // ─── SANTÉ (3) ───
  { key: "sante_perte_poids_mamans", segment: "sante", emoji: "🥗",
    title: "Salima · Perte de poids halal pour mamans",
    summary: "Maman 38 ans, ex-prof EPS, 3 enfants. +22 kg post-grossesses, veut retrouver son corps.",
    ready: false },
  { key: "sante_reprise_sport_hommes", segment: "sante", emoji: "💪",
    title: "Mehdi · Reprise sportive pour hommes musulmans 35-50",
    summary: "Père 39 ans de 4 enfants, ingénieur. 92 kg sédentaire, peur de l'infarctus comme son cousin.",
    ready: false },
  { key: "sante_anxiete_etudiants", segment: "sante", emoji: "🌿",
    title: "Lina · Anxiété & tawakkul pour étudiants musulmans",
    summary: "Étudiante 19 ans en L2 médecine. Crises de panique avant chaque exam.",
    ready: false },
];
