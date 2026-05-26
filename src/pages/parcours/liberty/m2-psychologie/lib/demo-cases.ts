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

// ── Younes · Setting & Closing pour entrepreneurs musulmans ──
const YOUNES_PATCH: Partial<M2State> = {
  step: "step1",
  highest: 9,
  m1: {
    source: "demo_argent_setting_closing",
    completed_at: null,
    branche: "B",
    niche: {
      sub_niche: "Jeunes musulmans 18-30 ans qui veulent gagner 2 000-6 000€/mois en setting/closing pour des infopreneurs halal, en 90 jours",
      label: "Setting & Closing pour entrepreneurs musulmans",
      name: "Setting & Closing pour entrepreneurs musulmans",
      pain: "Jeune sans diplôme, marginalisé socialement, qui veut prouver qu'il peut réussir sans tricher",
      method: "Setting via DM Instagram + closing par appel téléphonique",
      contact_channels: "Instagram + TikTok + écosystème infopreneurs halal francophones",
      growth: "Marché closing francophone en forte croissance (+50%/an)",
      buying_power: "Programme 1 497€ pour cohorte 12 semaines, plus de 200 élèves formés",
      market: "B2C_INFO",
      market_domain: { id: "argent", label: "💰 Argent" },
      market_validation: null,
      archetype: { id: "strategie", emoji: "🎯", label: "Stratège" },
    },
    avatar: {
      name: "Younes", sex: "Homme", age: "22 ans", location: "Roubaix (59)",
      income: "Petits boulots Uber Eats · ~400€/mois",
      relationship: "Célibataire",
      family: "Vit chez ses parents, frère aîné cadre dans une banque",
      situation: "BTS abandonné en 2e année, en recherche d'une voie",
      photo_url: null,
      problem: "Honte sourde de devoir demander 20€ à sa mère à 22 ans, sentiment de devenir l'homme que son père méprise",
      goals: "Faire son premier 1500€ de commission en 60 jours, rendre l'argent à sa mère, acheter sa voiture cash",
      consequences: "Reste 5 ans à scroller TikTok depuis sa chambre, perd la confiance de sa famille",
      past: "BTS NDRC abandonné, Uber Eats, 2 formations YouTube jamais terminées",
      feeling: "Honte, doute sur sa propre intelligence, peur d'être encore là dans 5 ans",
      paradise: "Acheter sa voiture cash halal, klaxonner devant la maison familiale, voir son père comprendre",
      avatar_phrase: "J'ai 22 ans et je veux prouver qu'on peut réussir sans diplôme et sans tricher.",
    },
    promise: {
      statement: "Faire ton premier 1 500€ de commission en setting en 60 jours, sans diplôme, sans capital, depuis ta chambre.",
      text: "Faire ton premier 1 500€ de commission en setting en 60 jours, sans diplôme, sans capital, depuis ta chambre.",
    },
    market: "B2C_INFO",
    market_domain: { id: "argent", label: "💰 Argent" },
    archetype: { id: "strategie", emoji: "🎯", label: "Stratège" },
    signed_by: "Younes Lakhdari",
    signed_on: null,
  },
  data: {
    welcome: { imported: true, sourceTag: "Cas démo M2 · Younes (basé sur le persona M1 argent_setting_closing)" },
    step1: {
      pains: [
        { text: "Honte sourde de devoir demander 20€ à sa mère pour un test PCR ou une carte SIM, à 22 ans",
          scene: "Mardi 15h. Sa mère sort 20€ d'une enveloppe planquée derrière le micro-ondes. Elle dit rien. Il prend l'argent. Il sort. Il marche 200m sans regarder personne." },
        { text: "Sentiment d'être en train de devenir l'homme que son père méprise — celui qui ne ramène rien et qui se donne des excuses",
          scene: "Vendredi soir. Repas familial. Son père parle à son frère aîné qui bosse dans une banque. Il ne lui adresse pas la parole pendant tout le repas. Younes mange en silence. Il sait que son père a remarqué qu'il a encore demandé de l'argent à leur mère." },
        { text: "Peur viscérale d'être encore là dans 5 ans à scroller TikTok depuis sa chambre, en se disant qu'il va commencer demain",
          scene: "Dimanche 23h47. Il vient de regarder 3 vidéos consécutives de jeunes setters qui font 5K/mois. Il ferme l'app. Il regarde le plafond. Il se dit : « Demain je commence. » Il se ressouvient qu'il s'est dit ça il y a 4 mois." },
        { text: "Frustration de voir ses cousins de Belgique se débrouiller en deal douteux et avoir l'air libres, pendant qu'il joue le « gentil garçon » et n'a rien",
          scene: "Story Snap d'un cousin à Anvers : nouvelle voiture, allemande, propre. Younes sait que c'est pas halal. Il sait qu'il ne fera jamais ça. Mais il se demande à quoi ça sert d'être halal si on est aussi loser." },
        { text: "Doute sur sa propre intelligence — chaque fois qu'il échoue à un truc il se dit « peut-être que je suis juste pas assez malin »",
          scene: "Il ouvre une formation gratuite YouTube sur le copywriting. Au bout de 14 minutes il décroche. Il ferme. Il pense : « j'ai même pas la concentration pour ça. » Il ouvre Instagram pour s'anesthésier." },
      ],
    },
    step2: {
      desires: [
        { text: "Faire son premier 1 500€ de commission en setting et le voir tomber sur son compte — la preuve que sa vie peut basculer",
          scene: "Mardi 14h. Notification SMS : « Vous avez reçu 1 487,50€ ». Il s'assoit sur son lit. Il regarde l'écran 8 secondes sans bouger. Il appelle pas sa mère tout de suite — il veut savourer le silence." },
        { text: "Rendre les 20€ à sa mère, multipliés par 100, le jour de son premier mois à 4 000€",
          scene: "Premier dimanche du mois. Il pose 2 000€ en liquide sur la table de la cuisine. Sa mère regarde l'argent. Elle dit rien pendant 4 secondes. Puis elle dit « Subhanallah ». Il dit « Maman, c'est rien. C'est juste le début. »" },
        { text: "Acheter sa propre voiture cash, halal, et passer devant son père avec, sans rien dire, juste qu'il sache",
          scene: "Vendredi 18h. Il klaxonne 2 fois devant la maison. Son père sort. Il regarde la voiture. Younes dit rien. Son père dit « tu l'as payée comment ? ». Il répond : « tout cash, papa. Y'a un papier dans la boîte à gants si tu veux vérifier. »" },
        { text: "Être invité au mariage du prochain cousin et pouvoir offrir 500€ comme cadeau, sans réfléchir, sans avoir mal au ventre la veille",
          scene: "Samedi soir, mariage à Lille. Il glisse l'enveloppe dans la main du marié. 500€ propres. Il sourit. Il sait que sa famille a remarqué qu'il a même pas hésité." },
        { text: "Devenir lui-même un closer respecté dans l'écosystème — celui à qui les nouveaux setters demandent conseil",
          scene: "DM Instagram. Un mec de 19 ans : « Younes akhi, j'aimerais te poser 2 questions sur ma 1ère semaine ». Younes répond avec un audio de 3 minutes. Il prend ça au sérieux. Il sait ce que ça représente pour le gamin d'avoir une réponse." },
      ],
      identity: "Un mec de 22 ans qui a pris sa vie en main avant 25 ans. Le jeune que sa famille montre en exemple plutôt que comme contre-exemple. Quelqu'un qui a refusé la voie facile non halal ET la voie passive du salariat à 1 600€. Un musulman qui ramène, sans dévier.",
    },
    step3: {
      proofs: [
        { type: "Capture conversation Whatsapp/DM closing en temps réel", who: "Adel, 24 ans, ex-vendeur Orange Store, qui a fait sa première vente 1500€ commission en 19 jours après le programme", why: "Younes a 22 ans et il a besoin de voir que les jumeaux jeunes y arrivent vite. Adel = 2 ans plus vieux, mêmes origines, même point de départ scolaire (BTS abandonné)." },
        { type: "Vidéo screen-recording d'un appel de closing réel + débrief", who: "Sami, 26 ans, closer pour un coach high-ticket à 4500€, qui détaille les 3 objections qu'il a tuées dans cet appel", why: "Younes veut voir CONCRÈTEMENT comment on parle, pas juste des résultats. Le screen-recording montre que c'est une compétence apprenable, pas du talent magique." },
        { type: "Témoignage écrit avec photo + 2 captures bancaire (avant/après)", who: "Bilal, 21 ans, ex-stagiaire 600€/mois, passé à 4 200€/mois en 4 mois comme setter pour un coach business", why: "L'écart avant/après chiffré rassure Younes : il voit la trajectoire possible depuis son point de départ exact." },
      ],
    },
    step4: {
      rarete: { angle: "Cohorte de 15 places, 4× par an. Pas plus de 15 parce qu'au-delà je perds en suivi roleplay individuel (chaque élève fait 2 roleplay/semaine avec moi).", justif: "Le roleplay 1-to-1 hebdo est ce qui fait la différence entre savoir et faire. C'est ma vraie limite — je peux le démontrer avec mon Calendly bloqué 10h/semaine sur ces sessions." },
      reciprocite: { angle: "Masterclass live 90 min gratuite : '5 scripts de réponses aux 3 objections qui tuent toute vente'", justif: "Younes a déjà la sensation qu'il connaît la théorie (YouTube), mais qu'il bloque sur l'application. La masterclass lui DONNE des scripts qui marchent — il les utilise même sans payer. Ça crée la dette + démontre l'expertise." },
      engagement: { angle: "Masterclass gratuite → Ebook 'Le système 80/20 du closer' à 17€ → Bootcamp weekend à 297€ → Cohorte 1497€", justif: "À 22 ans, Younes n'a pas 1500€ liquides facilement. Mais il peut investir 17€, puis 297€, puis enfin 1497€ s'il voit que chaque étape paie déjà. L'échelle protège son budget et son ego." },
    },
    step5: {
      top3: [
        { bias: "confirmation", why_dominant: "Younes est jeune (22), sans diplôme (BTS abandonné), avec famille qui doute. Il cherche des preuves DÉSESPÉRÉMENT pour valider qu'il peut réussir sans le parcours classique. Le biais de confirmation est sa boussole quotidienne.", how_activate: "Lui montrer 15+ témoignages d'élèves de 20-26 ans, sans diplôme, qui sont passés à 3-8K€/mois. Chaque témoignage doit citer le niveau scolaire — Younes a besoin de voir que c'est pas un piège pour diplômés." },
        { bias: "aversion_perte", why_dominant: "Younes a 22 ans et regarde ses potes qui ont déjà 2 ans d'avance pro. Le coût de NE RIEN FAIRE est plus émotionnel : à 25 ans il sera distancé. Cadrer en perte fonctionne mieux qu'en gain.", how_activate: "Calculer : « Si tu continues comme ça, à 25 ans tu auras 36 mois d'écart avec un closer qui a démarré aujourd'hui. À 30 ans c'est l'écart de toute une vie. »" },
        { bias: "ikea", why_dominant: "Younes ne consomme pas la formation, il l'INCARNE. Il a besoin de se voir construire ses scripts, ses séquences DM, son agenda — pas juste regarder.", how_activate: "Programme = 8 livrables produits par l'élève : son script de 1er appel, ses 20 séquences DM, son tracker Notion, son CRM. Younes sort avec SES outils." },
      ],
    },
    step6: {
      phase: "consideration",
      justif: "Younes est en Considération avancée. Il a passé l'Inconscience (sait qu'il veut un métier en ligne) et la Prise de conscience (a identifié le closing comme voie). Il compare maintenant : closing vs SMMA vs content creation. Il regarde 5-10 chaînes YouTube par semaine sur ces métiers. Mon job : me différencier comme l'expert closing musulman francophone le plus rigoureux.",
      actions: "(1) Publier 3× par semaine sur Instagram : 1 témoignage jeune élève + 1 roleplay décortiqué + 1 réflexion sur l'éthique du closing. (2) Lancer un challenge gratuit '7 jours pour signer ton 1er rendez-vous closing' — pré-éducation pendant qu'il compare. (3) DM personnel à chaque commentaire 'comment tu fais?' avec un audio Loom de 90 sec — la personnalisation = bascule.",
    },
    step7: {
      market: "B2C_INFO",
      vocab: {
        douleur_mots: ["j'en ai marre des petits boulots", "mes potes avancent", "je suis le seul à ramer", "ma mère me regarde mal", "BTS abandonné", "rien à mettre sur le CV", "Uber Eats à 22 ans", "j'ai pas le diplôme", "tout le monde me dit non"],
        desir_mots: ["prouver à mes parents", "signer mon premier 1500€", "porter une vraie chemise", "rentrer le vendredi soir avec ma première vraie paye", "donner à ma mère sans calculer", "faire la omra", "être respecté par mes cousins"],
        positifs: ["closing éthique", "transmission", "halal", "discipline", "compétence", "skills", "real estate de la voix", "self-made", "sunnah du commerce"],
        negatifs: ["MLM", "pyramide", "vente forcée", "manipulation", "fake gourou", "Tony Robbins (trop blanc)", "vente à la pression", "scam", "promesse magique"],
        formulations: ["j'ai 22 ans et toujours rien", "mon père me dit de chercher un vrai boulot", "tous mes potes ont fini leur BTS sauf moi", "je sens que je peux le faire mais je sais pas comment", "Adel a démarré sans rien et regarde maintenant", "halal mais pas low-budget toute ma vie"],
      },
    },
    step8: {
      positionnement: "Le seul programme de closing 1to1 qui forme des jeunes musulmans francophones (20-28 ans) sans diplôme à devenir closers high-ticket éthiques en 90 jours avec des entreprises halal-friendly.",
      hook_principal: "« 22 ans, BTS abandonné, et 100€ de salaire qui te suffisent pas pour aider ta mère ? »",
      levier_secondaire: "Insister sur la légitimité par compétence (vs diplôme) + la fierté familiale (« le premier dans ta famille à porter une vraie chemise pour aller bosser »). Younes ne fait pas ça pour l'argent — il le fait pour exister.",
      biais_killer: "Confirmation. Mon mur de témoignages DOIT contenir 15+ jeunes de 20-26 ans sans diplôme, avec leur photo, leur ville, leur situation famille avant/après. Younes doit voir 5 jumeaux en 30 secondes ou il ferme la page.",
      phase_strategy: "Younes est en Considération. Donc : (1) Publication 3x/semaine témoignages + roleplay + éthique, (2) Challenge gratuit 7 jours = pré-éducation immersive, (3) DM personnel avec audio Loom 90 sec = bascule en Décision.",
      directives_copywriting: "À utiliser : closing éthique, skills, transmission, halal, sunnah du commerce, real estate de la voix, prouver, respect, discipline. À BANNIR : MLM, pyramide, vente forcée, gourou, easy money, Tony Robbins, Jordan Belfort, manipulation, abuse.",
    },
  },
  scores: { step1: 88, step2: 90, step3: 86, step4: 89, step5: 87, step6: 85, step7: 84, step8: 83 },
  attempts: { step1: 1, step2: 1, step3: 1, step4: 1, step5: 1, step6: 1, step7: 1, step8: 1 },
};

// ── Imen · Agence SMMA pour étudiants musulmans ──
const IMEN_PATCH: Partial<M2State> = {
  step: "step1",
  highest: 9,
  m1: {
    source: "demo_argent_smma_etudiants",
    completed_at: null,
    branche: "B",
    niche: {
      sub_niche: "Étudiants musulmans 18-25 ans qui veulent monter une agence SMMA pour PME locales et générer 1 500-4 000€/mois pendant leurs études",
      label: "Agence SMMA pour étudiants musulmans",
      name: "Agence SMMA pour étudiants musulmans",
      pain: "Étudiante voilée qui culpabilise de voir sa mère faire des ménages, refuse de compromettre ses valeurs",
      method: "SMMA pour commerces halal locaux (restos, salons, boutiques mariage)",
      contact_channels: "Instagram + DM prospection PME locales + webinar mensuel",
      growth: "Marché des PME halal qui s'éveille au digital, croissance forte",
      buying_power: "Programme 990€ étudiants 4× facilités, plus de 100 étudiantes formées",
      market: "B2C_INFO",
      market_domain: { id: "argent", label: "💰 Argent" },
      market_validation: null,
      archetype: { id: "strategie", emoji: "🎯", label: "Stratège" },
    },
    avatar: {
      name: "Imen", sex: "Femme", age: "20 ans", location: "Lille (59)",
      income: "Job étudiant Carrefour · 350€/mois + bourse CROUS",
      relationship: "Célibataire",
      family: "Mère fait 3 ménages chez des familles aisées, parents galériens",
      situation: "Étudiante L2 Licence Info-Com, voilée, boursière CROUS",
      photo_url: null,
      problem: "Honte de refuser des sorties au restau parce que 12€ = 12€ de courses, culpabilité de voir sa mère épuisée",
      goals: "Signer 1er client SMMA à 800€/mois et dire à sa mère 'plus de ménage le dimanche', acheter ses livres neufs",
      consequences: "Finit ses études avec dettes étudiantes et zéro perspective, reproduit le piège de sa mère",
      past: "Job Carrefour, refus systématique de l'option OnlyFans des copines de promo",
      feeling: "Honte, culpabilité, sentiment d'être 'toujours en retard d'un mois'",
      paradise: "Inviter ses copines au restau libanais et payer pour 5, finir ses études avec une boîte rentable",
      avatar_phrase: "Je veux financer mes études sans crédit, sans dévier, sans dépendre.",
    },
    promise: {
      statement: "Signer ton 1er client SMMA à 800-1 200€/mois en 60 jours, en gardant tes études et ta pratique.",
      text: "Signer ton 1er client SMMA à 800-1 200€/mois en 60 jours, en gardant tes études et ta pratique.",
    },
    market: "B2C_INFO",
    market_domain: { id: "argent", label: "💰 Argent" },
    archetype: { id: "strategie", emoji: "🎯", label: "Stratège" },
    signed_by: "Imen Bensalem",
    signed_on: null,
  },
  data: {
    welcome: { imported: true, sourceTag: "Cas démo M2 · Imen (basé sur le persona M1 argent_smma_etudiants)" },
    step1: {
      pains: [
        { text: "Honte de devoir refuser des sorties avec ses copines de fac parce que 12€ pour le restau, c'est 12€ de courses chez Lidl",
          scene: "Mardi 12h45. Restau U. Ses 4 copines parlent de sortir au restau libanais ce soir. Elle dit « j'ai un truc de famille ce soir ». Elles savent qu'elle ment. Personne dit rien. Elle mange ses pâtes en silence." },
        { text: "Culpabilité de voir sa mère faire 3 ménages chez des familles aisées pour qu'elle puisse être à la fac",
          scene: "Dimanche soir. Sa mère rentre à 19h30, fatiguée, du ménage chez la 3ème famille. Elle ne dit rien, sourit à Imen, lui demande si elle a bien mangé. Imen voit les mains de sa mère et a la gorge serrée." },
        { text: "Sentiment d'être « toujours en retard d'un mois » sur tout — loyer, livres scolaires, abonnement transport, frais médicaux",
          scene: "Vendredi 14h. Notif CPAM : 38€ à payer pour les analyses de sang. Elle ferme. Elle sait qu'elle paiera dans 3 semaines, qu'elle aura 2 lettres de rappel d'ici là." },
        { text: "Peur que ses études se finissent et qu'elle se retrouve dans le même piège que sa mère — mais avec une licence en plus",
          scene: "Cours de Sociologie des médias. Sa prof titulaire d'un Master + Licence + 14 ans d'expérience parle de ses fins de mois compliquées avec son salaire de Maître de conf'. Imen comprend qu'un diplôme ne garantit rien." },
        { text: "Frustration en regardant des étudiantes non musulmanes monter leur petit business OnlyFans ou agence influenceuses douteuses, et de devoir choisir entre rester pauvre ou compromettre ses valeurs",
          scene: "Story Instagram d'une fille de sa promo qui a lancé sa marque de bijoux avec un sponsoring d'influenceuse en bikini sur la plage. Imen ferme. Elle se dit qu'elle ne peut pas faire ça. Elle se demande ce qui lui reste comme option propre." },
      ],
    },
    step2: {
      desires: [
        { text: "Signer son premier contrat SMMA à 800€/mois et le payer à sa mère en disant « maman, repose-toi le dimanche »",
          scene: "Premier vendredi d'octobre. Le client signe le contrat sur DocuSign. 800€/mois. Imen rentre, embrasse sa mère, dit : « Maman, à partir de janvier, plus de ménage le dimanche. Je m'en occupe. » Sa mère pleure 4 secondes en cuisinant." },
        { text: "Acheter ses livres scolaires neufs, sans culpabilité, sans attendre un don familial",
          scene: "Septembre. Librairie de la fac. Elle prend 3 manuels neufs. 187€. Elle paie. Elle ne calcule pas combien il lui reste. C'est la première fois depuis 2 ans." },
        { text: "Inviter ses 4 copines au restau libanais ET payer pour les 5, avec joie, juste pour le plaisir de la baraka",
          scene: "Vendredi 20h. Restau libanais à Lille. Elle rappelle l'addition discrètement. Elle paie. Ses copines protestent. Elle dit : « C'est sur moi. Mon agence a fait son meilleur mois. Ça vous arrivera aussi inshaAllah. »" },
        { text: "Finir ses études avec une boîte rentable et avoir le LUXE de choisir : continuer en master, ou se concentrer 100% sur le business",
          scene: "Juin, fin L3. Elle est sur le balcon avec un thé. Elle a 11 clients SMMA, 8 800€/mois en commissions. Elle se demande si elle fait le M2 marketing ou pas. Pour la première fois de sa vie, c'est une vraie question, pas un faux choix." },
        { text: "Devenir une référence dans l'écosystème : la sœur de 22 ans qui a fait sa boîte étudiante et inspire les autres jeunes étudiantes musulmanes",
          scene: "Juillet. Conférence AL BARAKA pour étudiants. Elle parle pendant 30 minutes devant 80 sœurs étudiantes. Elle raconte sans embellir : les 2 mois de galère, le 1er client, les erreurs. À la fin, 14 sœurs viennent lui demander conseil. Elle prend leur numéro et tient parole." },
      ],
      identity: "Une étudiante musulmane de 20 ans qui a refusé le faux choix entre 'fac sans argent' ou 'argent sans religion'. Une fille qui a inversé la dynamique avec sa mère — qui DONNE au lieu de prendre. Une entrepreneure jeune que ses copines de fac voient comme un modèle plutôt que comme la « pauvre Imen ». Une fille de musulmane qui rend hommage à sa mère par ses actes, pas par ses mots.",
    },
    step3: {
      proofs: [
        { type: "Capture WhatsApp client 'Tu peux gérer mes 3 restos cet été?' + facture 1800€", who: "Sara, 19 ans, étudiante BTS NDRC à Lyon, qui a signé son 1er client pizza halal à 600€/mois 8 semaines après le programme", why: "Imen se voit dans Sara : même âge, même situation étudiante, même origine — Lyon/banlieue. La capture WhatsApp + facture rendent le résultat tangible et reproductible." },
        { type: "Vidéo Loom 3 min : 'Comment j'ai trouvé mon 1er client en 2 semaines via Instagram'", who: "Mehdi, 22 ans, étudiant école de commerce Strasbourg, qui détaille les 7 DMs envoyés et les 2 calls qui ont signé", why: "Imen veut voir le PROCESS exact. Le Loom de Mehdi montre que c'est répétable et que c'est de la méthode, pas de la chance ou du charisme inné." },
        { type: "Témoignage écrit + photo + chiffres : 'De 350€/mois Carrefour à 2 200€/mois agence en 4 mois'", who: "Aïcha, 20 ans, ex-employée Carrefour Bordeaux, étudiante en alternance, 3 clients halal local actuels (kebab + couture + barbershop)", why: "L'angle 'gérer 3 clients halal local' fait totalement écho au monde de Imen : restos halal de quartier, salons de coiffure, boutiques de mariage = son écosystème naturel." },
      ],
    },
    step4: {
      rarete: { angle: "Cohorte de 20 étudiants, 2 fois par an (rentrée septembre + janvier). Calée sur le calendrier universitaire pour pas écraser les partiels.", justif: "Au-delà de 20, je ne peux plus faire les coachings groupe hebdo où chacun présente son client et reçoit feedback. La rareté est CALÉE sur la vie étudiante — c'est ce qui fait que ça marche pour cette niche." },
      reciprocite: { angle: "Webinar gratuit 'Comment signer ton 1er client SMMA halal en 30 jours' + Templates Notion offerts (prospection DM + onboarding client)", justif: "Imen n'a pas 200€ à mettre à l'aveugle. Le webinar lui DONNE la méthode, les templates lui DONNENT les outils. Si elle peut faire 1 client avec ça, elle reviendra pour la cohorte. Sinon elle n'a rien perdu." },
      engagement: { angle: "Templates gratuits → Ebook 47€ 'Le système 7 jours pour ton 1er client' → Bootcamp weekend 197€ → Cohorte 990€ (étudiants : 690€ + facilités 4×)", justif: "Pour des étudiants à 0-800€/mois, l'échelle de prix DOIT commencer bas. Le 990€ se paye en 4×, l'engagement progressif est ESSENTIEL — sinon Imen ne franchit jamais le pas." },
    },
    step5: {
      top3: [
        { bias: "confirmation", why_dominant: "Imen est étudiante, jeune femme musulmane voilée. Elle a INTÉRIORISÉ qu'elle aurait moins d'opportunités. Elle cherche désespérément des preuves que des FILLES COMME ELLE réussissent.", how_activate: "Mur de témoignages avec photos d'étudiantes musulmanes voilées qui ont signé leurs clients. Préciser leurs villes, leurs études, leurs origines. Imen doit voir 5 jumelles en 30 secondes." },
        { bias: "cadrage", why_dominant: "Le prix 990€ semble énorme pour une étudiante à 350€/mois. Mais 247€/mois × 4 paraît gérable. Le cadrage transforme le possible en accessible.", how_activate: "TOUJOURS communiquer le prix en mensualités : « 247€/mois × 4 mois = le prix d'un Pass étudiant Lyon-Paris ». Comparer à un budget qu'elle connaît, pas à un montant abstrait." },
        { bias: "ikea", why_dominant: "Imen ne veut pas une formation à regarder, elle veut un BUSINESS en construction. Son cerveau a besoin de produire pour valoriser.", how_activate: "Programme = 6 livrables construits semaine après semaine : son audit local, son portfolio template, ses 30 DMs prospects, son onboarding client, sa proposition commerciale. Elle sort avec un business, pas avec un cours." },
      ],
    },
    step6: {
      phase: "consideration",
      justif: "Imen est en Considération mais peu convaincue. Elle hésite entre 3 voies : SMMA, e-commerce, content creation. Elle suit 10+ chaînes YouTube depuis 6 mois. Le frein principal : peur de l'investissement (990€ = 3 mois de salaire étudiant) + peur que ce soit « pas pour elle » (femme, jeune, voilée). Mon job : la rassurer par des preuves spécifiques + cadrer le prix.",
      actions: "(1) Publier 2x/semaine des témoignages d'étudiantes musulmanes voilées qui réussissent SMMA — montrer son monde. (2) Lancer un challenge gratuit '7 jours pour identifier 10 commerces halal locaux qui ont besoin de toi' — concret + low-stakes. (3) Webinar mensuel 'SMMA pour étudiantes musulmanes' — communauté + adresse les peurs spécifiques.",
    },
    step7: {
      market: "B2C_INFO",
      vocab: {
        douleur_mots: ["j'ai pas les moyens", "mes parents galèrent", "Carrefour me suffit pas", "mes notes baissent à cause du job", "honte de demander", "je suis voilée donc moins d'opportunités", "je dois choisir entre études et survie"],
        desir_mots: ["financer mes études sans crédit", "aider ma mère discrètement", "rester voilée et réussir", "avoir mon propre revenu", "ne pas dépendre", "halal et libre", "fière de moi"],
        positifs: ["halal", "discrétion", "pudeur", "transmission", "indépendance", "baraka", "déjà voilée mais déterminée", "étudiante guerrière"],
        negatifs: ["sois belle et tais-toi", "tu n'y arriveras pas", "trop jeune", "trop voilée", "pas comme tout le monde", "gourou", "easy money", "MLM", "freedom Bali"],
        formulations: ["j'ai pas les moyens mais j'ai pas le choix", "mes parents pourront pas m'aider", "je dois être 2× meilleure pour être prise au sérieux", "voilée mais ambitieuse, ça dérange", "je veux pas finir caissière toute ma vie"],
      },
    },
    step8: {
      positionnement: "Le seul programme SMMA spécifiquement conçu pour les étudiantes musulmanes francophones qui veulent financer leurs études en gérant les réseaux sociaux de commerces halal locaux — sans dévier de leur pudeur.",
      hook_principal: "« 20 ans, voilée, étudiante : 3 commerces halal de ton quartier te paieraient déjà 1500€/mois si tu savais comment leur proposer »",
      levier_secondaire: "Insister sur la transmission familiale (« aide ta mère discrètement, paye tes études sans crédit, fais l'exemple pour tes petites sœurs »). Imen ne fait pas ça pour elle — elle le fait pour sa famille.",
      biais_killer: "Confirmation. Mon mur DOIT contenir 10+ témoignages d'étudiantes voilées avec photo, ville, prénom, école. Imen doit voir DES JUMELLES en 30 secondes ou elle décroche.",
      phase_strategy: "Imen est en Considération hésitante. Donc : (1) Témoignages 2x/semaine d'étudiantes musulmanes voilées qui réussissent, (2) Challenge gratuit '7 jours pour identifier 10 commerces halal locaux', (3) Webinar mensuel femmes uniquement = communauté safe.",
      directives_copywriting: "À utiliser : étudiante, voilée, halal, discret, indépendance, baraka, pudeur, fière, transmission, financer sans crédit. À BANNIR : freedom (trop bohème), Bali, easy money, gourou, MLM, riba, manipulateur, casser le plafond (trop féministe blanc).",
    },
  },
  scores: { step1: 89, step2: 90, step3: 87, step4: 88, step5: 86, step6: 85, step7: 88, step8: 84 },
  attempts: { step1: 1, step2: 1, step3: 1, step4: 1, step5: 1, step6: 1, step7: 1, step8: 1 },
};

// ── Mounia & Anas · Investissement immobilier sans riba ──
const MOUNIA_ANAS_PATCH: Partial<M2State> = {
  step: "step1",
  highest: 9,
  m1: {
    source: "demo_argent_immo_sans_riba",
    completed_at: null,
    branche: "B",
    niche: {
      sub_niche: "Couples musulmans 30-45 ans, salariés, qui veulent acheter leur premier bien immobilier sans riba en 24 mois",
      label: "Investissement immobilier sans riba",
      name: "Investissement immobilier sans riba",
      pain: "Couple locataire depuis 7 ans qui refuse le crédit conventionnel et stagne",
      method: "Murabaha + sukuk + apport familial + montage juridique optimisé",
      contact_channels: "Webinar mensuel + Instagram + audits couple gratuits",
      growth: "Marché finance islamique France en croissance (+15%/an), Inaya/Chaabi",
      buying_power: "Programme couple 2997€, accompagnement 18 mois jusqu'à signature notaire",
      market: "B2C_INFO",
      market_domain: { id: "argent", label: "💰 Argent" },
      market_validation: null,
      archetype: { id: "strategie", emoji: "🎯", label: "Stratège" },
    },
    avatar: {
      name: "Mounia & Anas", sex: "Couple", age: "32 et 35 ans", location: "Strasbourg (67)",
      income: "Couple cadres salariés · ~5 200€ net/mois combinés",
      relationship: "Mariés 9 ans, 2 enfants (7 ans et 4 ans)",
      family: "Familles pratiquantes, belle-mère insiste régulièrement sur l'achat",
      situation: "Locataires T3, 1200€/mois loyer, vise un T4 à 220k€",
      photo_url: null,
      problem: "Honte refoulée d'être encore locataires à 32 et 35 ans avec 2 enfants dans la même chambre, frustration de voir amis non-pratiquants signer leurs crédits",
      goals: "Signer l'acte chez le notaire pour un 1er bien 220k€ sans riba, transmettre à leurs enfants un patrimoine halal",
      consequences: "Restent locataires à 50 ans, transmettent à leurs enfants un sentiment d'impossibilité halal",
      past: "7 ans de location, 100 000€ jetés en loyer cumulé, 2 dossiers Inaya abandonnés faute d'accompagnement",
      feeling: "Frustration, pression silencieuse familiale, doute sur leur propre foi quand ils voient des frères dévier",
      paradise: "Signer chez le notaire à 220k€ sans crédit conventionnel, donner sa propre chambre à leur fille, transmettre un patrimoine halal",
      avatar_phrase: "On veut transmettre à nos enfants un patrimoine matériel ET la preuve que l'éthique paie.",
    },
    promise: {
      statement: "Te permettre d'acheter ton 1er bien sans crédit conventionnel en 18-24 mois, en optimisant épargne, montage juridique et stratégie d'achat.",
      text: "Te permettre d'acheter ton 1er bien sans crédit conventionnel en 18-24 mois, en optimisant épargne, montage juridique et stratégie d'achat.",
    },
    market: "B2C_INFO",
    market_domain: { id: "argent", label: "💰 Argent" },
    archetype: { id: "strategie", emoji: "🎯", label: "Stratège" },
    signed_by: "Mounia & Anas Bouali",
    signed_on: null,
  },
  data: {
    welcome: { imported: true, sourceTag: "Cas démo M2 · Mounia & Anas (basé sur le persona M1 argent_immo_sans_riba)" },
    step1: {
      pains: [
        { text: "Honte refoulée d'être encore locataires à 32 et 35 ans, dans un T3 avec 2 enfants qui partagent la même chambre",
          scene: "Dimanche soir. Leur fille de 6 ans demande à dormir dans son propre lit dans sa propre chambre 'comme Léa de l'école'. Mounia répond 'bientôt, ma chérie'. Elle ne sait pas si elle ment ou pas." },
        { text: "Frustration de voir leurs amis non-pratiquants signer leur crédit immobilier sans état d'âme et avancer dans la vie",
          scene: "Crémaillère du couple Sarah & Maxime, 28 et 30 ans. Maison à Schiltigheim, 280k€, financée à 100% à 1,9% sur 25 ans. Mounia sourit, félicite, mange le buffet. Sur le retour Anas dit pas un mot pendant 18 minutes." },
        { text: "Sentiment d'être en train de 'rater le train' — l'immobilier flambe, Strasbourg +18% en 5 ans, ils sont en train d'être distancés",
          scene: "Mardi 21h. Anas regarde SeLoger sur son ordi pour la 47ème fois cette année. Le T4 qu'ils suivaient à 240k€ il y a 2 ans est parti hier soir à 295k€. Il ferme l'ordinateur." },
        { text: "Pression silencieuse de la famille élargie qui demande tous les ans 'alors, vous achetez quand ?'",
          scene: "Aïd al Fitr. Belle-mère d'Anas, 67 ans, lui prend le bras : 'Anas, mon fils, tes parents avaient leur maison à ton âge.' Anas sourit, change de sujet. La belle-mère le sait — elle insiste pas, mais l'a dit." },
        { text: "Doute sur leur propre foi quand ils voient des frères dévoyer la règle (interpréter le riba à leur sauce) parce que c'est trop dur",
          scene: "Salon AL BARAKA. Un frère qu'ils respectent leur dit 'finalement on a pris le crédit, c'est niya qui compte'. Mounia regarde Anas. Anas ne dit rien. Sur le retour, ils en parlent 4 minutes puis arrêtent — le sujet est trop lourd." },
      ],
    },
    step2: {
      desires: [
        { text: "Signer l'acte chez le notaire pour leur 1er bien à 220 000€, payé sans crédit conventionnel, 100% halal",
          scene: "Vendredi 14h. Étude notariale. Ils signent. Le notaire leur tend les clés. Mounia tremble en les prenant. Anas serre le bras de sa femme. Aucun crédit hypothécaire. C'est le 1er notaire de Strasbourg à voir un dossier 100% sans riba." },
        { text: "Donner à leur fille sa propre chambre — celle dont elle parle depuis 2 ans",
          scene: "1er soir dans la nouvelle maison. Leur fille de 6 ans dans son propre lit, dans sa propre chambre rose. Elle pleure de joie 4 minutes. Mounia pleure aussi en silence dans le couloir." },
        { text: "Pouvoir dire à la belle-mère d'Anas 'on l'a fait, et sans riba' sans triomphalisme, juste un soulagement partagé",
          scene: "Aïd al-Adha. Belle-mère vient pour la 1ère fois dans la nouvelle maison. Elle fait le tour, touche les murs, embrasse son fils. Elle dit à Mounia : 'tu as bien fait pour mon fils, ma fille.' Mounia hoche, gorge serrée." },
        { text: "Devenir une référence dans leur cercle musulman — le couple qui a montré que c'était possible et qui transmet la méthode à d'autres frères/sœurs",
          scene: "Conférence AL BARAKA. Anas présente leur parcours en 25 minutes. 200 personnes dans la salle. À la fin, 18 couples viennent leur poser des questions. Mounia note 18 numéros et tient parole — elle accompagne 6 d'entre eux dans les 18 mois suivants." },
        { text: "Construire un patrimoine progressif (5 biens en 12 ans, tous halal) qu'ils transmettront à leurs enfants en héritage non pollué",
          scene: "Décembre, dans 8 ans. Bilan annuel autour d'un thé. Ils ont 4 biens, 380k€ de patrimoine net, aucun crédit. Leur fille a 14 ans, leur fils 11. Ils auront chacun leur héritage halal. Mounia dit à Anas : 'on l'a fait, mon amour.'" },
      ],
      identity: "Un couple musulman pratiquant qui a refusé le faux choix entre 'rester locataires toute la vie' et 'compromettre le riba'. Des parents qui transmettent à leurs enfants un patrimoine matériel ET une preuve concrète que l'éthique paie. Une référence pieuse mais accessible dans leur cercle, pas des intégristes ni des dévoyés. Des gens qui prouvent par l'action, pas par la parole.",
    },
    step3: {
      proofs: [
        { type: "Acte notarié + capture financement participatif Inaya Finance (montant + durée)", who: "Couple Adel & Inès, 29 et 27 ans, Lyon, cadres salariés, qui ont acheté leur 1er bien T3 175 000€ via murabaha 12 mois après le programme", why: "Mounia & Anas voient un couple identique au leur : âges proches, statut cadre, revenus combinés similaires. L'acte notarié + le détail du montage rendent ça TANGIBLE." },
        { type: "Vidéo témoignage 8 min : le couple visite leur appartement + raconte le parcours fiqh + financement", who: "Saïd & Houria, 40 et 38 ans, Marseille, artisan + femme au foyer, 4 enfants, qui ont acheté en sukuk + apport familial", why: "Cette vidéo répond à la peur de Mounia & Anas qu'« on n'y arrive pas en France ». Vrai couple, vraie maison, vrai notaire — pas une story marketing." },
        { type: "Tableau Excel comparatif détaillé : prêt classique vs murabaha vs sukuk vs ijara", who: "Karim, fiscaliste musulman qui a analysé 30 dossiers d'achat halal en France 2023-2024", why: "Anas est cadre, il pense en tableurs. Le comparatif chiffré (intérêts, durée, mensualités, conformité fiqh) lui parle immédiatement et démonte l'idée qu'on « perd de l'argent » en halal." },
      ],
    },
    step4: {
      rarete: { angle: "Promotion annuelle de 30 couples maximum (15 par session, 2 sessions par an). C'est ma capacité d'accompagnement personnalisé sur 18 mois — le délai moyen d'un achat.", justif: "Chaque couple a besoin de 12-18 mois de suivi : recherche bien, négo, montage dossier, signature. Au-delà de 15 par cohorte, je ne peux plus assurer l'appel mensuel personnalisé qui débloque les dossiers complexes." },
      reciprocite: { angle: "Webinar 90 min + simulateur Excel offert : 'Calcule ton montage halal en 5 min — murabaha vs sukuk vs apport familial'", justif: "Anas est cadre, il veut chiffrer AVANT de s'engager. Le simulateur lui DONNE la possibilité de modéliser SA situation. S'il voit que c'est faisable, il rentre dans le tunnel. Sinon il a quand même appris." },
      engagement: { angle: "Simulateur gratuit → Masterclass 47€ → Audit personnalisé 297€ (avec recommandation montage) → Programme 1 an 2997€ (couple)", justif: "L'achat immobilier est un engagement majeur (15-25 ans). Mounia & Anas ne peuvent pas confier ça à un inconnu d'Instagram. L'échelle leur permet de tester sérieusement à chaque palier — l'audit à 297€ est le seuil critique de bascule." },
    },
    step5: {
      top3: [
        { bias: "statu_quo", why_dominant: "Mounia & Anas sont LOCATAIRES depuis 7 ans. Le statu quo (location 1200€/mois jetés) est devenu invisible. Il faut leur faire SENTIR le coût caché : 7 ans × 12 × 1200 = 100 800€ partis en fumée.", how_activate: "Calculateur 'Combien tu as jeté en loyer depuis le début ?' + projection : 'À ce rythme, dans 10 ans tu auras donné 244 000€ à des proprios pendant que tes pairs ont remboursé leur emprunt halal.'" },
        { bias: "aversion_perte", why_dominant: "Mounia & Anas refusent le crédit conventionnel pour des raisons religieuses, mais ils PERDENT mensuellement en location + en investissement non fait. L'aversion à la perte doit cadrer en : « le riba a un coût, ne pas acheter a un coût supérieur ».", how_activate: "Cadrer : « Tu refuses le riba (bien). Mais tu acceptes de perdre 1200€/mois × 84 mois sans rien construire ? Le halal sans stratégie = perte garantie. Le halal AVEC stratégie = patrimoine constitué. »" },
        { bias: "confirmation", why_dominant: "Mounia & Anas ont entendu mille fois 'c'est pas possible en France' ou 'le halal coûte 30% plus cher'. Ils ont besoin de preuves CONCRÈTES françaises qu'on peut réussir.", how_activate: "Mur de couples musulmans français qui ont acheté en halal entre 2020-2024. Photos couple + photo bien + montant + montage + ville. Mounia & Anas doivent voir leurs jumeaux acheter au prix du marché." },
      ],
    },
    step6: {
      phase: "consideration",
      justif: "Mounia & Anas sont en Considération avancée. Ils ont passé Inconscience et Prise de conscience (savent qu'ils veulent acheter halal, pas conventionnel). Ils comparent maintenant les solutions : Inaya Finance vs Chaabi vs apport famille vs émigrer au Maroc. Ils ont écouté 8+ cours sur le sujet (Bajrafil, IESH, AAOIFI). Mon job : me différencier comme l'expert qui RAMÈNE l'achat en France à du concret, pas du théorique.",
      actions: "(1) Publier 1×/semaine un témoignage de couple musulman français qui a acheté halal en 2023-2024 avec détail du montage. (2) Webinar mensuel 'Acheter halal en France : ce qui marche en 2025' — pédagogique + adresse les peurs spécifiques. (3) Audit gratuit 45 min couple — la conversation chiffrée fait basculer en Décision.",
    },
    step7: {
      market: "B2C_INFO",
      vocab: {
        douleur_mots: ["7 ans en location", "1200€ jetés tous les mois", "tout le monde achète sauf nous", "on stagne", "on attend on attend on attend", "fatigue de l'attente", "famille qui demande quand", "Maroc trop loin pour la famille"],
        desir_mots: ["notre propre porte", "stabilité pour les enfants", "patrimoine halal", "ne plus dépendre du proprio", "fierté du chez-soi", "transmission aux enfants", "stable et halal"],
        positifs: ["halal", "murabaha", "sukuk", "ijara", "AAOIFI", "fiqh", "barakah", "patrimoine", "transmission", "stabilité", "famille", "Inaya"],
        negatifs: ["riba", "crédit classique", "intérêts", "usure", "haram", "compromis", "exception", "fatwa de complaisance", "presque halal"],
        formulations: ["on attend depuis 7 ans le bon moment", "nos parents nous demandent quand on achète", "on refuse le crédit mais on stagne", "halal c'est plus cher mais on assume", "on veut pas finir locataires à 50 ans", "transmettre à nos enfants la maison qu'on a construite halal"],
      },
    },
    step8: {
      positionnement: "Le seul accompagnement immobilier couple qui transforme l'intention 'acheter halal en France' en achat concret dans les 12-18 mois, en s'appuyant sur les institutions officielles (Inaya, Chaabi, AAOIFI) et les fatwas modernes.",
      hook_principal: "« 7 ans de location halal = 100 000€ donnés à des proprios pendant que tes voisins remboursent leur emprunt »",
      levier_secondaire: "Insister sur la transmission aux enfants (« le 1er patrimoine halal que tes enfants hériteront ») + la fierté familiale (« quand ta belle-mère viendra chez TOI, pas chez le proprio »). Mounia & Anas ne font pas ça pour eux — c'est pour la lignée.",
      biais_killer: "Statu quo. Mon offre DOIT activer la conscience du coût caché : « Chaque mois supplémentaire en location = 1200€ × 0 capital constitué. Tu ne décides pas de ne pas acheter — tu décides de continuer à payer un loyer halal à un proprio peut-être non-musulman. »",
      phase_strategy: "Mounia & Anas sont en Considération avancée. Donc : (1) Témoignages 1x/semaine de couples français acheteurs halal 2023-2024, (2) Webinar mensuel pédagogique sur les montages réels, (3) Audit gratuit couple 45 min = bascule en Décision avec calculs chiffrés.",
      directives_copywriting: "À utiliser : murabaha, sukuk, halal, patrimoine, transmission, stabilité, famille, AAOIFI, barakah, fiqh. À BANNIR : riba, crédit classique, intérêts, easy money, gourou, fatwa de complaisance, presque halal, exception.",
    },
  },
  scores: { step1: 91, step2: 89, step3: 88, step4: 90, step5: 88, step6: 87, step7: 89, step8: 85 },
  attempts: { step1: 1, step2: 1, step3: 1, step4: 1, step5: 1, step6: 1, step7: 1, step8: 1 },
};

// ── Khadija · Préparation au mariage halal ──
const KHADIJA_PATCH: Partial<M2State> = {
  step: "step1",
  highest: 9,
  m1: {
    source: "demo_relations_mariage_halal",
    completed_at: null,
    branche: "B",
    niche: {
      sub_niche: "Sœurs musulmanes 25-35 ans, célibataires ou en quête, qui veulent se préparer émotionnellement et pratiquement au mariage halal",
      label: "Préparation au mariage halal",
      name: "Préparation au mariage halal",
      pain: "Sœur 30 ans après 4 ans de recherches frustrantes, sentiment d'être 'trop' (vieille, exigeante, cassée)",
      method: "Programme 6 mois : charte critères + scénario entretien halal + procédure wassila",
      contact_channels: "Instagram + Newsletter hebdo + Workshops weekend non-mixtes",
      growth: "Marché des sœurs musulmanes en quête de cadre matrimonial halal en croissance",
      buying_power: "Programme 1497€, cohorte 12 sœurs × 3 fois par an",
      market: "B2C_TRANSFO",
      market_domain: { id: "relations", label: "🤝 Relations" },
      market_validation: null,
      archetype: { id: "transformation", emoji: "🦋", label: "Transformatrice" },
    },
    avatar: {
      name: "Khadija", sex: "Femme", age: "30 ans", location: "Toulouse (31)",
      income: "Infirmière CHU · 2 100€ net/mois",
      relationship: "Célibataire, 4 ans de recherches matrimoniales frustrantes",
      family: "Famille pratiquante, cousines mariées, nièce de 4 ans qui demande pourquoi tata n'a pas de mari",
      situation: "Locataire studio Toulouse centre, voilée, infirmière en cardio",
      photo_url: null,
      problem: "Honte sourde de remonter dans le métro après une rencontre ratée encore — la 8ème en 2 ans, sentiment d'être 'trop' pour le marché du mariage musulman",
      goals: "Faire son nikah dans 12 mois avec un frère qui sait ce qu'il veut, construire sa famille sur des fondations saines",
      consequences: "Reste seule à 40 ans, devient la 'tatie célibataire qu'on n'invite plus aux mariages'",
      past: "8 rencontres ratées en 2 ans, 2 fiançailles brisées, plusieurs frères qui parlent bien et fuient au 3ème échange",
      feeling: "Anxiété chaque vendredi soir, doute existentiel à chaque ramadan, peur de finir seule",
      paradise: "Faire son nikah à Toulouse devant sa famille, dans la sobriété qui lui ressemble, mari qu'elle respecte",
      avatar_phrase: "Je veux me préparer au mariage avec discernement, pas me précipiter par peur.",
    },
    promise: {
      statement: "Te poser dans la clarté en 90 jours : qui tu es, qui tu veux, comment trier — pour rencontrer mieux et mieux te rencontrer.",
      text: "Te poser dans la clarté en 90 jours : qui tu es, qui tu veux, comment trier — pour rencontrer mieux et mieux te rencontrer.",
    },
    market: "B2C_TRANSFO",
    market_domain: { id: "relations", label: "🤝 Relations" },
    archetype: { id: "transformation", emoji: "🦋", label: "Transformatrice" },
    signed_by: "Khadija Benali",
    signed_on: null,
  },
  data: {
    welcome: { imported: true, sourceTag: "Cas démo M2 · Khadija (basé sur le persona M1 relations_mariage_halal)" },
    step1: {
      pains: [
        { text: "Honte sourde de remonter dans le métro toulousain à 22h après une rencontre ratée, encore — la 8ème en 2 ans",
          scene: "Vendredi 22h17. Métro ligne A direction Basso Cambo. Elle a rencontré Karim au resto syrien à 19h30. À 21h elle savait que c'était mort. Elle a tenu 1h30 par politesse. Maintenant elle regarde le métro qui défile, et elle pense à sa belle robe portée pour rien." },
        { text: "Anxiété qui monte chaque vendredi soir quand ses cousines mariées partagent les photos de leur weekend en famille",
          scene: "Vendredi 21h45. Story Insta de sa cousine Salma : pique-nique au lac avec son mari et ses 3 enfants. Khadija ferme. Elle se sert un thé. Elle ouvre Netflix. Elle regarde 'Married at First Sight' parce que c'est tout ce qu'elle a." },
        { text: "Doute existentiel qui revient chaque ramadan : et si elle finissait seule ? Vraiment seule ? Pas par choix, par échec ?",
          scene: "Ramadan 2024. Iftar familial chez ses parents. Sa nièce de 4 ans demande pourquoi tata Khadija n'a pas de mari. Sa mère dit 'inshaAllah bientôt'. Personne ne dit rien d'autre. Khadija mange ses dattes." },
        { text: "Frustration de répéter les mêmes erreurs — tomber pour des hommes qui parlent bien la 1ère fois et fuient au 3ème échange",
          scene: "Mardi 14h. WhatsApp. Le frère qu'elle voyait depuis 5 semaines : 'salam alaykoum sœur, je crois qu'on n'est pas faits l'un pour l'autre, je préfère arrêter là, qu'Allah te facilite'. Elle relit 4 fois. Elle ne répond pas. Elle pleure 11 minutes dans les toilettes du service de cardio." },
        { text: "Sentiment d'être devenue 'trop' — trop ferme, trop méfiante, trop vieille, trop cassée pour être 'choisie' dans le marché du mariage musulman français",
          scene: "Salon AL BARAKA. Une sœur de 24 ans à côté d'elle parle de ses pré-fiançailles avec un médecin de 28 ans. Khadija sourit, félicite. Elle pense : 'à 24 ans j'aurais eu 3 propositions par mois. À 30, je suis une 'option de secours' pour les hommes qui ont raté la première vague.'" },
      ],
    },
    step2: {
      desires: [
        { text: "Sortir de chaque rencontre en sachant CLAIREMENT en 30 minutes si oui ou non, sans tergiverser 6 mois",
          scene: "Mardi 19h, café. Elle pose 4 questions structurées. Le frère répond. À 19h47 elle sait. Elle le lui dit avec respect à 20h12. Elle rentre. Elle dort bien. C'est la 1ère fois en 4 ans." },
        { text: "Rencontrer un frère qui sait ce qu'il veut, qui s'engage en 6 mois, et qui a fait son propre travail intérieur",
          scene: "Décembre. 4ème rencontre depuis qu'elle a fait le programme. Yacine, 33 ans, ingénieur, divorcé sans enfant, en quête de mariage durable. Au 6ème échange il propose les fiançailles dans le respect du cadre familial. Elle dit oui sans paniquer." },
        { text: "Faire son nikah dans 12 mois, en présence de sa famille, à Toulouse, dans la sobriété qui lui ressemble",
          scene: "Avril prochain. Mosquée de Toulouse, 14h. 80 invités. Son père prononce la khutba. Elle dit oui. Pas de larmes spectaculaires, juste un alhamdulillah long, profond." },
        { text: "Devenir une référence calme dans son cercle de sœurs célibataires — celle qui a réussi sans concession",
          scene: "Été. Café avec 4 sœurs célibataires de 28-34 ans. Elles lui demandent comment elle a fait. Elle prend le temps de répondre, sans triomphalisme. À la fin, 2 d'entre elles s'inscrivent au programme. Elle accepte d'être leur 'grande sœur' pendant les 6 mois." },
        { text: "Construire sa famille sur des fondations saines — un mari qu'elle respecte, pas qu'elle tolère, et qui la respecte aussi",
          scene: "Année 1 de mariage. Vendredi soir. Ils prient maghrib ensemble. Il lui demande comment elle a vécu sa semaine au CHU. Elle parle 12 minutes. Il écoute vraiment. Pas une seule fois il sort le téléphone. C'est la nouvelle normalité." },
      ],
      identity: "Une femme musulmane de 30 ans qui a refusé de se marier par peur (de la solitude, du qu'en-dira-t-on, de l'horloge biologique). Une fiancée puis une épouse qui sait ce qu'elle apporte ET ce qu'elle exige. Pas une femme aigrie, pas une femme désespérée — une femme posée. Une grande sœur pour les sœurs plus jeunes du cercle, pas une 'tatie célibataire qu'on n'invite plus aux mariages'.",
    },
    step3: {
      proofs: [
        { type: "Vidéo témoignage 5 min + photo mariage : du célibat à l'engagement halal en 11 mois", who: "Sofia, 32 ans, infirmière Toulouse, qui a mis fin à 4 ans de procrastination matrimoniale en 11 mois après le programme — mariée septembre 2024", why: "Khadija (30) se reconnaît dans Sofia : âge proche, profession soignante, mêmes patterns d'attente. La vidéo + photo mariage rendent le résultat tangible et reproductible." },
        { type: "Témoignage écrit + capture WhatsApp 'oui à wassila' à un mois précis", who: "Yasmine, 28 ans, prof Bordeaux, qui a fait sa demande de wassila pour la 1ère fois après 6 ans de blocage — fiancée en 5 mois", why: "Khadija comprend l'enjeu : oser PROPOSER, pas juste attendre. La capture WhatsApp datée montre le moment de courage concret." },
        { type: "Étude de cas écrite avec timeline 8 mois : du 'je vais mourir seule' au nikkah", who: "Mariam, 34 ans, ingénieure Paris, qui détaille les 7 entretiens halal qu'elle a faits avant de dire oui — sans compromettre sa pudeur", why: "Khadija a peur de paraître désespérée. Cette étude de cas montre qu'on peut être PROACTIVE tout en gardant sa dignité. Le timeline rassure." },
      ],
    },
    step4: {
      rarete: { angle: "Cohorte de 12 sœurs, 3 fois par an. Pas plus parce que les sessions de coaching individuel hebdo (45 min/sœur) prennent 9h par semaine.", justif: "Le travail sur l'attachement, les blocages familiaux, les patterns d'évitement DEMANDE du 1-to-1. C'est ma vraie limite. Je peux montrer mon Calendly bloqué — pas de marketing trick." },
      reciprocite: { angle: "Masterclass live 75 min + Workbook 'Les 7 patterns d'évitement matrimonial' offert", justif: "Khadija ne va pas mettre 1500€ chez une inconnue. La masterclass + workbook lui permettent d'IDENTIFIER ses patterns AVANT de s'engager. Elle voit la profondeur du travail. Si elle se reconnaît dans 4/7 patterns, elle saura qu'elle a besoin du programme." },
      engagement: { angle: "Workbook gratuit → Audio formation 47€ '5 entretiens halal réussis' → Workshop weekend 297€ → Programme 6 mois 1497€", justif: "Khadija est habituée à investir dans son développement perso. Elle a déjà acheté livres et formations. L'échelle de 47→297→1497 est cohérente avec son budget développement personnel et lui permet de tester sérieusement avant de s'engager profondément." },
    },
    step5: {
      top3: [
        { bias: "statu_quo", why_dominant: "Khadija célibataire depuis 4 ans est dans le statu quo le plus puissant possible : la routine. Travail-famille-amies-mosquée. Confortable malgré la solitude. La douleur est invisible parce que diffuse. Mon job : rendre VISIBLE le coût du temps qui passe.", how_activate: "Calculateur 'À 30 ans aujourd'hui, dans 5 ans tu auras 35. Tes amies auront 2-3 enfants. Tu auras eu 60 mois pour rencontrer ton mari. Ces 60 mois passent qu'on agisse ou pas. Lequel veux-tu vivre ?'" },
        { bias: "confirmation", why_dominant: "Khadija doute d'elle-même : 'je suis trop ceci', 'trop cela'. Elle cherche désespérément des preuves qu'une femme COMME ELLE peut trouver l'amour halal sans se trahir.", how_activate: "Mur de témoignages de sœurs 28-38 ans aux profils variés (voilée/non, médecin/prof/ingé, célibataires longue durée) qui ont trouvé. Khadija doit voir 5 jumelles." },
        { bias: "ikea", why_dominant: "Khadija ne veut pas une 'recette miracle'. Elle veut comprendre et construire SES propres règles. Son ego rejette la dépendance à un coach.", how_activate: "Programme = 6 livrables construits par elle-même : sa charte de critères, son scénario d'entretien halal, ses 5 questions clés, sa procédure de wassila, son journal d'évolution. Khadija sort avec SES outils." },
      ],
    },
    step6: {
      phase: "prise_de_conscience",
      justif: "Khadija sort de l'Inconscience (elle a accepté que sa solitude n'est pas un état permanent à subir). Mais elle est encore en Prise de conscience : elle commence à chercher des solutions. Pas encore en Considération active. Elle lit des livres, écoute des podcasts. Mon job : nommer précisément SES patterns (évitement, sabotage, attente passive) avec ses mots à elle.",
      actions: "(1) Publier 2-3×/semaine du contenu qui NOMME ses patterns : 'Tu attends qu'IL te repère ?', 'Tu refuses tout le monde sans même les rencontrer ?', 'Tu attends d'être parfaite pour mériter quelqu'un ?'. (2) Lead magnet 'Les 7 patterns d'évitement matrimonial' — quiz personnalisé. (3) Newsletter hebdo avec 1 témoignage de sœur.",
    },
    step7: {
      market: "B2C_TRANSFO",
      vocab: {
        douleur_mots: ["je vais mourir seule", "mes amies sont toutes mariées", "je suis trop exigeante", "personne ne veut de moi", "j'ai raté ma vie", "trop tard", "pas assez", "trop ceci trop cela", "honte au Aïd quand on me demande"],
        desir_mots: ["construire une famille", "transmettre", "ma propre tribu", "être mère insh'Allah", "sunnah du Prophète", "compagnonnage", "akhira ensemble", "sakina"],
        positifs: ["halal", "sunnah", "wassila", "nikkah", "sakina", "akhira", "dignité", "pudeur", "patience active", "tawakkul", "barakah"],
        negatifs: ["Tinder", "rencontres", "couple libre", "sortir", "se mettre à la coule", "compromis religieux", "feministe blanche", "thérapie occidentale décontextualisée"],
        formulations: ["j'ai 30 ans et toujours rien", "ma mère ne demande même plus", "on me prend pour la tata", "j'attends mais quoi", "j'ai trop attendu d'être prête", "et si je n'avais jamais ma maison à moi", "j'ai peur de finir seule"],
      },
    },
    step8: {
      positionnement: "Le seul programme pour sœurs musulmanes 28-38 ans qui transforme l'attente passive et la peur du célibat éternel en démarche matrimoniale halal, structurée et digne — sans dévier de la pudeur ni se rabaisser.",
      hook_principal: "« 30 ans, toutes tes amies sont mères, et toi t'es encore en train d'attendre que ça arrive tout seul ? »",
      levier_secondaire: "Insister sur la transmission (« tes futurs enfants attendent une mère qui a osé construire sa famille, pas une qui a subi son célibat ») + la sunnah du Prophète sur l'initiative matrimoniale. Khadija ne le fait pas pour elle — c'est pour la famille qu'elle veut créer.",
      biais_killer: "Statu quo. Mon offre DOIT activer la conscience que le célibat de Khadija n'est pas une situation NEUTRE — c'est un choix par défaut qui coûte chaque mois. « Tu n'es pas célibataire en attendant. Tu es célibataire en train de DEVENIR définitivement célibataire. »",
      phase_strategy: "Khadija est en Prise de conscience. Donc : (1) Contenu qui NOMME ses patterns, (2) Lead magnet quiz '7 patterns d'évitement', (3) Newsletter hebdo + 1 témoignage de sœur similaire. La bascule vers Considération se fait quand elle se reconnaît dans 4/7 patterns.",
      directives_copywriting: "À utiliser : sunnah, wassila, nikkah, sakina, dignité, patience active, tawakkul, transmission, famille, halal, pudeur. À BANNIR : Tinder, rencontres, compromis, sortir, dating, feministe libre, thérapie individualiste, gourou, easy love.",
    },
  },
  scores: { step1: 90, step2: 91, step3: 88, step4: 89, step5: 87, step6: 86, step7: 88, step8: 85 },
  attempts: { step1: 1, step2: 1, step3: 1, step4: 1, step5: 1, step6: 1, step7: 1, step8: 1 },
};

// ── Aïcha & Tarek · Couple post-bébé ──
const AICHA_TAREK_PATCH: Partial<M2State> = {
  step: "step1",
  highest: 9,
  m1: {
    source: "demo_relations_couple_post_bebe",
    completed_at: null,
    branche: "B",
    niche: {
      sub_niche: "Couples musulmans 30-40 ans en distance émotionnelle après l'arrivée des enfants, qui veulent retrouver leur connexion conjugale",
      label: "Couples post arrivée des enfants",
      name: "Couples post arrivée des enfants",
      pain: "Couple en distance émotionnelle 18 mois, devenus colocataires polis, peur du divorce silencieux",
      method: "Programme 3 mois : charte couple + planning intimité + protocole disputes + rituels",
      contact_channels: "Instagram + Quiz couple + Audio Loom + Workshops weekend mixtes",
      growth: "Marché des couples musulmans post-bébé en demande croissante de soutien halal-friendly",
      buying_power: "Programme couple 1297€, cohorte 8 couples × 4 sessions par an",
      market: "B2C_TRANSFO",
      market_domain: { id: "relations", label: "🤝 Relations" },
      market_validation: null,
      archetype: { id: "transformation", emoji: "🦋", label: "Transformatrice" },
    },
    avatar: {
      name: "Aïcha & Tarek", sex: "Couple", age: "33 et 37 ans", location: "Bordeaux (33)",
      income: "Couple cadre + maman 3/5 · ~4 800€ net/mois combinés",
      relationship: "Mariés 9 ans, 2 enfants (7 ans et 4 ans)",
      family: "Familles pratiquantes, cercle musulman observant qui demande comment ça va",
      situation: "Appartement payé en commun à Bordeaux, voiture, mobilier IKEA monté ensemble",
      photo_url: null,
      problem: "Vivent comme colocataires depuis 18 mois — politesse fonctionnelle, zéro chaleur, plus de conversations à 2",
      goals: "Retrouver la connexion, avoir une vraie conversation hebdo, weekend mensuel à 2, qu'il pose sa main sans raison utilitaire",
      consequences: "73% des couples 36 mois distance se séparent dans les 5 ans — érosion silencieuse, enfants qui intériorisent",
      past: "Mariés 9 ans, 3 grossesses, dernier baiser réel il y a 14 mois, dernier weekend à 2 il y a 18 mois",
      feeling: "Solitude conjugale, peur du divorce non verbalisée, honte d'envier la complicité d'autres couples",
      paradise: "Vendredi 21h30, enfants couchés, téléphones dans le tiroir, parler 47 min sans tension, marcher dans les vignes main dans la main",
      avatar_phrase: "On veut redevenir un couple, pas une co-gestion familiale.",
    },
    promise: {
      statement: "Te redonner un couple, pas une co-gestion familiale, en 90 jours — avec des outils concrets et un cadre halal.",
      text: "Te redonner un couple, pas une co-gestion familiale, en 90 jours — avec des outils concrets et un cadre halal.",
    },
    market: "B2C_TRANSFO",
    market_domain: { id: "relations", label: "🤝 Relations" },
    archetype: { id: "transformation", emoji: "🦋", label: "Transformatrice" },
    signed_by: "Aïcha & Tarek Mansouri",
    signed_on: null,
  },
  data: {
    welcome: { imported: true, sourceTag: "Cas démo M2 · Aïcha & Tarek (basé sur le persona M1 relations_couple_post_bebe)" },
    step1: {
      pains: [
        { text: "Sentiment de vivre avec un colocataire au lieu d'un mari/femme — politesse fonctionnelle, zéro chaleur",
          scene: "Mardi 21h47. Tarek finit la vaisselle. Aïcha prépare les repas du lendemain. Ils ne se sont pas parlés 5 minutes consécutives depuis vendredi. Il dit 'je vais me coucher'. Elle dit 'OK'. Pas un regard, pas un baiser, pas une main sur l'épaule." },
        { text: "Frustration qui s'accumule de ne plus avoir de moments à 2 — toutes les conversations sont logistiques (école, courses, planning)",
          scene: "Vendredi 19h. Iftar à 18h53. Ils mangent vite parce que Yacine, 4 ans, jette des pâtes par terre. Aïcha gère Yacine. Tarek nettoie. À 20h les enfants sont au lit. Tarek prend son téléphone. Aïcha prend le sien. Aucun échange jusqu'à 22h30." },
        { text: "Anxiété de réaliser que leur fille de 7 ans ne les a plus jamais vus rire ensemble depuis qu'elle a 5 ans",
          scene: "Diner avec amis (couple non-musulman) qui rit. Leur fille observe en silence. Sur le retour en voiture, elle demande à sa mère : 'maman, pourquoi avec papa vous riez plus comme tonton et tata ?'. Aïcha invente une réponse. Tarek conduit en silence." },
        { text: "Peur sourde que leur couple soit déjà perdu — et qu'aucun ne l'avoue avant 5 ans",
          scene: "Dimanche 23h. Aïcha lit un article 'comment savoir si votre couple est en train de mourir'. Elle reconnaît 7 signes sur 10. Elle ferme l'article. Elle ne le dit pas à Tarek. Elle se demande s'il aurait pu reconnaître les mêmes signes." },
        { text: "Honte d'envier la complicité d'autres couples musulmans dans leur cercle, et de feindre l'épanouissement quand on leur demande comment ça va",
          scene: "Aïd al-Adha. Couple ami, mariés 12 ans. Le mari embrasse la main de sa femme spontanément en public. Aïcha détourne le regard. Tarek aussi. Ils en parleront pas en rentrant — c'est devenu trop douloureux." },
      ],
    },
    step2: {
      desires: [
        { text: "Avoir 1 conversation conjugale par semaine — vraie, profonde, sans téléphone, sans interruption — qui ne soit pas sur les courses",
          scene: "Vendredi 21h30. Enfants couchés. Aïcha pose son téléphone dans le tiroir de la cuisine. Tarek aussi. Ils s'asseyent au salon avec un thé. Pendant 47 minutes ils parlent de leur année qui vient. Pour la 1ère fois depuis 2 ans, c'est pas tendu." },
        { text: "Sentir Tarek poser sa main sur la sienne sans raison utilitaire, juste pour le contact",
          scene: "Lundi 7h45. Petit-déjeuner. Yacine renverse son lait. Tarek essuie. En se rasseyant il pose sa main 4 secondes sur celle d'Aïcha. Elle ne dit rien. Elle a la gorge serrée." },
        { text: "Retrouver leur weekend mensuel à 2 (sans les enfants chez la grand-mère) qui leur a manqué pendant 18 mois",
          scene: "Vendredi soir, hôtel halal-friendly à Saint-Émilion. Les enfants chez la mère de Tarek pour 36h. Ils marchent dans les vignes. Ils se tiennent la main pour la 1ère fois depuis 14 mois. Aïcha pleure 9 secondes. Tarek le voit, ne dit rien, lui serre la main plus fort." },
        { text: "Que leurs enfants grandissent en voyant un couple qui s'aime — pas un couple qui co-existe poliment",
          scene: "Dans 1 an. Repas familial. Aïcha rit d'une blague nulle de Tarek. Leur fille de 8 ans sourit. Yacine ne remarque pas mais l'absorbe. Sur les photos de famille de l'année, ils se touchent à nouveau." },
        { text: "Devenir un couple témoin pour leur cercle musulman — pas un couple modèle, juste un couple qui a survécu et reconstruit",
          scene: "Conférence AL BARAKA sur le mariage. Tarek raconte 8 minutes leur traversée. Aïcha complète. Pas de pathos. Juste des faits. À la fin, 4 couples viennent leur poser des questions concrètes. Ils prennent les numéros." },
      ],
      identity: "Un couple musulman pratiquant qui a refusé de glisser vers le 'on reste pour les enfants'. Des parents qui ont compris que la meilleure éducation pour leurs enfants c'est de montrer un couple vivant, pas de leur sacrifier le couple. Des époux qui ont réappris à se voir. Pas un modèle parfait — un couple sauvé.",
    },
    step3: {
      proofs: [
        { type: "Vidéo témoignage couple 6 min — main dans la main, sourires posés, pas filmée comme un reel marketing", who: "Yacine & Sara, 35 et 31 ans, 2 enfants 6 et 3 ans, Lille — 5 mois sans intimité, ont retrouvé 2 relations/semaine après 90 jours du programme, 4e enfant annoncé 8 mois plus tard", why: "Aïcha & Tarek voient un couple comme eux — pas des influenceurs lifestyle Bali. Sara est en hijab discret, Yacine porte la barbe taillée court. Ils racontent les non-dits, le « on dort dos à dos » sans en faire un drame instagram. Aïcha reconnaît son propre silence du soir." },
        { type: "Audio Loom de 12 min : la femme parle seule de SA transformation, sans le mari à l'image", who: "Meryem, 36 ans, ex-couple en chambres séparées depuis 14 mois, 4 enfants, Strasbourg — programme + 1 retraite couple Eid el-Adha", why: "Aïcha a besoin d'entendre une AUTRE FEMME nommer ce qu'elle vit. Pas son mari, pas un coach mâle qui explique. Une sœur qui dit : « j'ai cru qu'on allait divorcer pendant 8 mois. J'ai pleuré dans la voiture après le drive du KFC un mardi. Aujourd'hui on planifie notre 5e enfant. » Le format audio (pas vidéo) permet à Aïcha de l'écouter en faisant la vaisselle, sans que Tarek voie ce qu'elle regarde." },
        { type: "Étude de cas écrite 4 pages avec timeline mois par mois + 2 photos du couple (1 'avant' floutée, 1 'après' nette)", who: "Lina & Hicham, 33 et 35 ans, 2 enfants 5 et 2 ans, dépression post-partum d'elle + démission psychologique de lui, Toulouse — sortie de crise en 5 mois", why: "Tarek (l'homme) a besoin du contenu écrit. Aïcha lui transfère le PDF par mail un dimanche soir. Il le lit sur les toilettes le lendemain matin (seul endroit calme de la maison). Il voit que Hicham, ingénieur informaticien comme lui, a osé ouvrir la conversation. Format texte = format Tarek." },
      ],
    },
    step4: {
      rarete: { angle: "Cohorte fermée à 8 couples, 4 sessions par an (mars, juin, septembre, décembre). 8 et pas plus parce qu'on fait 1 appel couple individuel hebdomadaire de 45 min + 1 atelier groupe non-mixte hebdo de 90 min (femmes d'un côté, hommes de l'autre).", justif: "Au-delà de 8, je ne peux plus tenir le 1-to-1 hebdomadaire qui débloque les vrais sujets (intimité, finances, belle-famille). Mon Calendly est bloqué : lundi-mardi calls hommes, mercredi-jeudi calls femmes, vendredi atelier couple. C'est ma vraie limite humaine, pas un trick. Je peux montrer les captures de mon agenda." },
      reciprocite: { angle: "Quiz couple gratuit '7 signaux que ton couple s'éteint sans que vous le voyiez' (40 questions, 12 min, résultat personnalisé avec PDF de 14 pages) + Audio de 28 min 'La discussion qui sauve un couple en 90 jours — le script exact mot par mot'", justif: "Aïcha & Tarek ont besoin de PROUVER au conjoint qu'il y a un problème. Le quiz est l'OUTIL DIPLOMATIQUE : ce n'est pas Aïcha qui dit que ça va mal, c'est le quiz qui le score. Ça désamorce la défense. Le PDF de 14 pages + l'audio donnent assez de matière pour démarrer une vraie conversation, même si le couple n'achète jamais. Si le programme leur permet déjà de poser la première brique, ils sauront que je peux les emmener loin." },
      engagement: { angle: "Quiz + audio gratuits → Mini-formation audio 47€ '4 conversations pour relancer ton couple en 30 jours' → Workshop weekend en couple (2 jours, présentiel à Paris ou Lyon) à 397€ par couple → Programme 3 mois 1297€ par couple", justif: "Le couple a 2 cerveaux à convaincre, pas un. Aïcha décide vite, Tarek décide lentement. L'échelle de prix est calée sur ce double consentement : à 47€ Aïcha peut décider seule ('je m'achète une formation'), à 397€ ils doivent en parler ensemble (engagement conjoint), à 1297€ ils ont déjà testé 2 paliers et savent que ça marche. Sans cette gradation, Tarek bloque au premier prix." },
    },
    step5: {
      top3: [
        { bias: "statu_quo", why_dominant: "Aïcha & Tarek vivent dans le statu quo le plus puissant qui existe : la routine famille avec 2 enfants (Yacine 4 ans, leur fille 7 ans). Métro-boulot-écoles-courses-coucher des enfants-Netflix-dormir. Ils ne se DISPUTENT même plus, ils CO-EXISTENT. La douleur est diffuse, jamais aigüe. Tant que personne ne pose le problème explicitement, le statu quo paraît supportable. Mon job : rendre l'invisible visible et chiffrer le coût caché. Sans ça, ils restent dans la résignation polie pendant 5 ans encore.", how_activate: "Calculateur 'Combien de mois depuis ta dernière vraie connexion conjugale ?' avec projection : « Vous êtes à 18 mois de distance émotionnelle. Dans 18 mois de plus vous serez à 3 ans cumulés. Statistiquement, 73% des couples qui passent 36 mois en distance émotionnelle se séparent dans les 5 ans. Pas par dispute. Par érosion. » Aïcha lit ça et frissonne, Tarek lit ça et arrête de respirer 3 secondes." },
        { bias: "aversion_perte", why_dominant: "Ce qu'Aïcha & Tarek ont à PERDRE est massif et chiffré : leur fille de 7 ans + Yacine 4 ans qui grandiraient entre deux maisons à Bordeaux, une vie matérielle construite à deux (appartement payé en commun, voiture, mobilier IKEA monté ensemble un dimanche de 2017), 9 ans d'investissement émotionnel commun. La peur du divorce n'est pas verbalisée mais elle est PRÉSENTE. L'aversion à la perte fonctionne ici à 200% : ils sont prêts à beaucoup pour ne pas perdre ce qu'ils ont mis 9 ans à construire.", how_activate: "Cadrer en perte dans le pitch : « Vous avez 9 ans de mariage, 2 enfants, un appartement à Bordeaux. Ne pas agir AUJOURD'HUI, c'est accepter une probabilité de 28% de divorce dans les 5 ans selon les études INSEE 2023. C'est aussi accepter que vos enfants vous voient devenir des coloc. Le coût n'est pas notre programme à 1297€. Le coût, c'est ces 5 ans de glissement silencieux. »" },
        { bias: "ikea", why_dominant: "Aïcha & Tarek ont MONTÉ leur couple ensemble. Ils ont aussi monté physiquement leur cuisine IKEA (Pax armoire, Malm cadre de lit, table de cuisson posée à 4 mains un samedi 2018). Ils valorisent ce qui a été construit à 2 mains. Une 'thérapie de couple' où on les écoute passivement ne marchera pas. Ils ont besoin de FABRIQUER quelque chose ensemble — un nouveau rituel, une nouvelle communication, une nouvelle planification.", how_activate: "Le programme se structure autour de 12 livrables co-construits : leur 'Charte du couple 2.0' (signée à 2 noms), leur planning d'intimité hebdomadaire (oui, intimité = on planifie comme tout le reste), leur protocole de gestion des disputes en 5 étapes, leur rituel du dimanche soir 'on parle du couple 30 min sans téléphone'. Aïcha & Tarek sortent du programme avec UN DOSSIER de 47 pages qui est LEUR couple repensé. Pas mon contenu. Leur travail." },
      ],
    },
    step6: {
      phase: "prise_de_conscience",
      justif: "Aïcha est en Prise de conscience claire — elle SAIT que quelque chose ne va plus depuis ~6 mois. Elle a googlé 'couple sans intimité après bébé', 'mon mari ne me touche plus', 'mariage musulman en crise'. Elle a regardé 4-5 vidéos Insta de coaches couple. Mais elle est encore SEULE dans cette phase. Tarek est plus en arrière — il est entre Inconscience et Prise de conscience. Il ressent un malaise diffus mais ne l'a pas nommé. La complexité : il faut un marketing qui parle À AÏCHA d'abord (pour qu'elle se reconnaisse), puis qui lui donne les OUTILS pour amener Tarek à l'étape suivante. Le couple ne consomme pas le marketing au même rythme.",
      actions: "(1) Contenu Instagram 3x/semaine qui PARLE À LA FEMME en priorité — Aïcha doit se reconnaître dans des reels qui nomment ses non-dits ('quand t'es couchée à côté de lui et que tu te sens seule', 'quand tu fais semblant de dormir parce que t'as plus envie d'expliquer'). (2) Lead magnet Quiz couple — Aïcha le fait, elle a un score qui légitime sa préoccupation, elle le partage à Tarek par WhatsApp avec 'regarde le résultat'. C'est l'OUTIL DIPLOMATIQUE qui ouvre la conversation chez eux. (3) Audio gratuit 28 min — Tarek peut l'écouter SEUL en voiture sur le chemin du boulot, sans pression sociale. Il fait son chemin de prise de conscience à son rythme.",
    },
    step7: {
      market: "B2C_TRANSFO",
      vocab: {
        douleur_mots: ["on parle plus", "on est devenus colocataires", "il ne me touche plus depuis des mois", "j'ai l'impression d'être transparente", "on dort dos à dos", "fatigue chronique", "on s'engueule plus on s'évite", "j'ai plus envie", "il rentre tard exprès", "elle est tout le temps avec les enfants", "on a oublié comment on faisait avant", "je sais plus si je l'aime"],
        desir_mots: ["retrouver la connexion", "qu'il me regarde comme avant", "complicité d'avant les enfants", "sakina", "akhira ensemble", "qu'on rigole encore", "un weekend en amoureux pour la 1ère fois en 3 ans", "se redécouvrir", "construire la suite", "élever nos enfants à 2 vraiment", "redevenir une femme désirée", "redevenir un mari désiré"],
        positifs: ["sakina", "mawadda", "rahma", "barakah du foyer", "fiqh du couple", "sunnah du Prophète SAW avec ses femmes", "communauté", "transmission aux enfants", "intimité halal", "discrétion conjugale", "pudeur sacrée"],
        negatifs: ["divorce", "thérapie occidentale", "couple ouvert", "polyamour", "féministe woke", "sexologue mixte", "tantra", "Tinder", "se remettre en cause individuellement (sans le couple)", "couple platonique accepté"],
        formulations: ["on est plus dans le couple, on gère juste les enfants", "le dimanche soir je rentre en mode résigné", "j'ai peur de voir mes enfants grandir avec des parents qui s'ignorent", "j'ai pas envie de finir comme mes parents", "j'aime ma femme mais je sais plus comment le montrer", "j'aime mon mari mais il m'agace 90% du temps", "on est plus la même équipe", "on a survécu à 3 grossesses mais pas sûr qu'on survive aux 10 prochaines années"],
      },
    },
    step8: {
      positionnement: "Le seul accompagnement couple musulman francophone qui restaure l'intimité conjugale après l'arrivée des enfants — en combinant la rigueur du fiqh conjugal (références AAOIFI), la précision de la psychologie clinique (TCC + théorie de l'attachement) et le format halal-friendly (sessions non-mixtes, sexologue femme uniquement pour les sœurs).",
      hook_principal: "« 18 mois sans vraie connexion avec ton conjoint — et le pire c'est que personne ne l'a remarqué, pas même vous, jusqu'à ce que cette phrase te perce le ventre ? »",
      levier_secondaire: "Insister sur la transmission aux enfants (« tes enfants apprennent ce qu'est un couple en vous regardant — qu'est-ce qu'ils observent en ce moment exactement ? ») + la peur du regret tardif (« à 50 ans, quand les enfants partiront du foyer, vous serez deux étrangers polis sous le même toit — ou bien deux compagnons qui se redécouvrent ? »). Aïcha & Tarek ne font pas ça pour leur intimité — c'est pour que leur fille de 7 ans et Yacine 4 ans grandissent avec un modèle de couple vivant, pas pour ne pas reproduire le couple éteint de leurs propres parents.",
      biais_killer: "Statu quo. Mon offre DOIT activer la conscience du coût caché de l'inaction. Pas un drame, pas un alarmisme — une comptabilité froide : « Vous vivez en distance conjugale depuis 18 mois. Yacine a 4 ans : la moitié de sa vie consciente, il a vu deux co-parents polis. Pas un couple. Le modèle qu'il intériorise maintenant, c'est celui qu'il appliquera à 30 ans avec sa femme. »",
      phase_strategy: "Aïcha en Prise de conscience, Tarek encore entre Inconscience et Prise de conscience. Donc : (1) Contenu Insta 3x/semaine qui parle À AÏCHA d'abord (elle est l'entry point), (2) Lead magnet Quiz couple = outil diplomatique qui légitime sa préoccupation et ouvre la conversation avec Tarek, (3) Audio gratuit 28 min écoutable EN SOLO par Tarek dans la voiture — son chemin de prise de conscience est privé et à son rythme. Bascule en Considération quand ils ont fait le quiz ENSEMBLE.",
      directives_copywriting: "À utiliser : sakina, mawadda, rahma, barakah du foyer, intimité halal, sunnah conjugale, transmission aux enfants, fiqh, discrétion, pudeur, redécouverte. À BANNIR : divorce (trop direct sauf en deep funnel), thérapie de couple (occidentalisme suspect), sexologue (sauf préciser : femme uniquement, formée fiqh), désir (sauf très encadré pudiquement), Tinder, couple ouvert, polyamour, féministe libre, individuation, self-care (sonne trop bobo), wellness.",
    },
  },
  scores: { step1: 91, step2: 90, step3: 89, step4: 90, step5: 88, step6: 86, step7: 87, step8: 85 },
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
    ready: true, patch: YOUNES_PATCH },
  { key: "argent_smma_etudiants", segment: "argent", emoji: "🎯",
    title: "Imen · Agence SMMA pour étudiants musulmans",
    summary: "Étudiante 20 ans, Lille. Veut financer son master sans crédit + soulager sa famille.",
    ready: true, patch: IMEN_PATCH },
  { key: "argent_immo_sans_riba", segment: "argent", emoji: "🏠",
    title: "Mounia & Anas · Investissement immobilier sans riba",
    summary: "Couple 32-35 ans, Strasbourg. Veulent acheter leur RP cash sans crédit conventionnel.",
    ready: true, patch: MOUNIA_ANAS_PATCH },
  // ─── RELATIONS (3) ───
  { key: "relations_mariage_halal", segment: "relation", emoji: "💍",
    title: "Khadija · Préparation au mariage halal",
    summary: "Sœur 30 ans, prof à Toulouse, 4 ruptures de fiançailles. Veut se marier avec discernement.",
    ready: true, patch: KHADIJA_PATCH },
  { key: "relations_couple_post_bebe", segment: "relation", emoji: "👨‍👩‍👧",
    title: "Aïcha & Tarek · Couples musulmans après l'arrivée des enfants",
    summary: "Couple 33-37 ans, 3 enfants. Vivent comme colocataires, veulent retrouver leur connexion.",
    ready: true, patch: AICHA_TAREK_PATCH },
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
