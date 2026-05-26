/**
 * Mode démo — 10 niches pré-remplies (4 Argent · 3 Relations · 3 Santé).
 *
 * Transposition fidèle du `DEMO_NICHES` du HTML standalone Sidali V2.
 * Chaque démo charge le state directement à l'étape "sous_niche_2" (Crystal) :
 *  - sous_niche_2 et avatar sont pré-remplis (le coeur de la démo)
 *  - validation et engagement restent vides — l'élève peut tester l'écran
 *
 * En mode démo, le state n'est JAMAIS persisté en BDD (cf. usePersistedState).
 */

import type { M1State, M1Step } from "./types";

export interface DemoNiche {
  key: string;
  label: string;
  market: "Argent" | "Relations" | "Santé";
  icon: string;
  summary: string;
  /** Partial state appliqué au state courant (merge profond). */
  patch: Partial<M1State> & { step: M1Step };
}

// Base fonctionnelle — pour les démos, on entre directement à l'étape Crystal.
function basePatch(branch: "A" | "B" = "B"): Partial<M1State> & { step: M1Step } {
  return {
    step: "sous_niche_2",
    branch,
    completed: false,
  };
}

export const DEMO_NICHES: DemoNiche[] = [
  // ════════════════════════════════════════════════════════════════════
  // ARGENT (4)
  // ════════════════════════════════════════════════════════════════════
  {
    key: "argent_affiliation",
    label: "Affiliation digitale halal",
    market: "Argent",
    icon: "💼",
    summary:
      "Salariés musulmans qui veulent générer un revenu complémentaire éthique sans toucher au riba.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Salariés musulmans 25-40 ans, CDI/CDD, revenu 1 500-2 800€/mois, frustrés par leur travail et en quête d'un revenu complémentaire éthique",
        douleur:
          "Vivre sa religion à fond mais être prisonnier d'un job sans sens, regarder ses collègues non-pratiquants se libérer financièrement avec des business souvent non-halal, et se dire qu'on n'a pas d'option éthique",
        pouvoir_achat:
          "Pack écosystème AL BARAKA à 2 500€ vendu plusieurs centaines de fois. Pack LIBERTY à 5 000€. Concurrents (Sidali Hamel, Saad El Founisi, etc.) facturent entre 1 500€ et 7 000€. Marché documenté.",
        contact:
          "Instagram + groupes Telegram halal + ads YouTube ciblées musulmans 25-40 + collaborations avec l'écosystème AL BARAKA et infopreneurs halal.",
        croissance:
          "Marché du business halal e-learning en croissance +35%/an depuis 2020. L'écosystème AL BARAKA a triplé en 2 ans. Recherches 'business halal' : +180% sur 3 ans.",
        methode:
          "Méthode 3-2-1 : 3 contenus organiques/sem sur Insta, 2h prospection DM/jour, 1 closing call/jour. Premier 1000€ en 60 jours.",
        phrase:
          "Affiliation halal pour salariés musulmans 25-40 ans qui veulent 1 500-5 000€/mois en complément",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Homme", nom: "Karim", age: "31 ans",
          lieu: "Saint-Denis (93)", revenu: "Technicien réseaux CDI · 2 200€ net/mois",
          compagnon: "Marié depuis 4 ans, 1 enfant de 2 ans",
          relations: "Famille proche en banlieue, ami d'enfance entrepreneur",
          situation: "Locataire HLM · Aide ses parents 200€/mois · Vise un bien dans 3-5 ans",
        },
        psycho: {
          probleme:
            "Frustré de bosser pour un salaire qui ne lui permet ni d'épargner, ni de partir en vacances, ni d'aider sa famille. Voit ses collègues non-pratiquants se libérer avec trading/immo et se sent bloqué par ses valeurs.",
          objectifs:
            "Atteindre 4 000€/mois supplémentaires en 12 mois pour acheter cash sans riba, faire la omra avec sa femme, aider sa mère seule.",
          consequences:
            "Reste coincé 10 ans dans un CDI qu'il déteste, son fils grandit sans le voir, il regarde son père vieillir sans pouvoir l'aider matériellement.",
          passe:
            "Dropshipping (perdu 800€), trading crypto (-1 200€ crash 2022), MLM (2 mois, arrêté car non-éthique).",
          sentiment:
            "Coincé. Honte de ne pas mieux subvenir aux besoins de sa famille. Anxiété chronique le dimanche soir.",
          paradis:
            "Travailler 4-5h/jour de chez lui, voir son fils tous les soirs, prier à dohr sans stress, donner 200€/mois à sa mère sans calculer.",
          phrase_avatar:
            "Je veux gagner ma vie correctement sans avoir à choisir entre ma religion et mon avenir financier.",
        },
      },
    },
  },
  {
    key: "argent_setting_closing",
    label: "Setting & Closing pour entrepreneurs musulmans",
    market: "Argent",
    icon: "📞",
    summary:
      "Jeunes 18-30 ans qui veulent gagner rapidement sans diplôme via le setting/closing dans l'écosystème halal.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Jeunes musulmans 18-30 ans, sans diplôme valorisé, en précarité ou en quête d'autonomie rapide, idéalement bilingues FR/AR",
        douleur:
          "Voir ses pairs réussir online avec des méthodes douteuses, se sentir inutile à 22 ans, n'avoir ni capital ni diplôme, vivre encore chez ses parents et le vivre comme une humiliation",
        pouvoir_achat:
          "Programmes setting/closing à 1 500€-3 000€ vendus régulièrement (Kiyan Boukhari, Pass AL BARAKA). Public jeune mais parents qui financent souvent.",
        contact:
          "TikTok + Instagram (jeunes 18-30 très actifs) + ads ciblées + collaborations avec infopreneurs musulmans qui recrutent + groupes Telegram d'entraide.",
        croissance:
          "Métier de closer en explosion : recherches Google +82%/an. Tous les infopreneurs cherchent des setters/closers, demande > offre formée.",
        methode:
          "Méthode SCRIPT-VOLUME-TRACKING : 3 scripts, 100 contacts/jour, tracking. Premier client en 30j, première commission en 45j.",
        phrase:
          "Setting & Closing halal pour jeunes musulmans 18-30 sans diplôme — 2 000 à 6 000€/mois en 90 jours",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Homme", nom: "Younes", age: "22 ans",
          lieu: "Roubaix", revenu: "Livreur Uber Eats · ~1 400€/mois",
          compagnon: "Célibataire, en quête de mariage halal d'ici 2-3 ans",
          relations: "Vit chez ses parents, 3 frères et soeurs plus jeunes",
          situation: "BTS commerce abandonné, scooter financé par son père, économies = 0€",
        },
        psycho: {
          probleme:
            "Voit ses cousins 'percer' avec du trading ou des affaires douteuses. Sa mère lui demande à demi-mot quand il va 'devenir quelqu'un'. Sa fierté en prend un coup chaque jour.",
          objectifs:
            "3 000€/mois propres en 6 mois pour quitter la livraison, prendre un studio, économiser pour le mariage.",
          consequences:
            "Reste livreur 5 ans, son dos lâche à 28 ans, accepte un mariage 'par défaut' faute de stabilité, devient amer.",
          passe:
            "Trading crypto (-600€ d'économies de mariage), MLM nutrition (2 semaines), revente de baskets.",
          sentiment:
            "Frustration permanente. Honte devant les copains qui font des études. Peur de finir comme certains oncles.",
          paradis:
            "Travailler 5-6h/jour de chez lui ou d'un café, prier à l'heure, financer le hajj de sa mère, se marier en étant fier.",
          phrase_avatar:
            "Je veux prouver à ma famille et à moi-même que je peux réussir sans tricher et sans diplôme.",
        },
      },
    },
  },
  {
    key: "argent_smma_etudiants",
    label: "Agence SMMA pour étudiants musulmans",
    market: "Argent",
    icon: "🎯",
    summary:
      "Étudiants musulmans qui veulent monter une agence de social media management pour PME locales pendant leurs études.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Étudiants musulmans 18-25 ans, en licence/BTS/master, qui bossent en parallèle et veulent du temps + plus de revenus",
        douleur:
          "Galérer entre les cours et un job étudiant à 400€, voir ses parents stresser et ne rien pouvoir faire, voir des camarades non-musulmans monter du dropshipping/trading et ne pas avoir d'option éthique aussi rentable",
        pouvoir_achat:
          "Programmes SMMA généralistes vendus 1 500€-3 200€ (Yomi Denzel, Mehdi LMAATI). Public étudiant payé via parents (qui voient le retour rapide) ou via épargne d'alternance.",
        contact:
          "Instagram + TikTok + LinkedIn campus + partenariats associations étudiantes musulmanes + ads ciblées 18-25 étudiants.",
        croissance:
          "Recherches 'business étudiant', 'agence SMMA' : 12 400/mois en France, +40%/an estimé. SMMA en croissance soutenue.",
        methode:
          "Méthode SOLO-9 : 1 niche locale par étudiant, 9 clients max, prospection 30 jours puis fidélisation. Pas de scaling tant que pas de stabilité.",
        phrase:
          "Agence SMMA halal pour étudiants musulmans 18-25 — 3 000 à 5 000€/mois en 10h/semaine",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Imen", age: "20 ans",
          lieu: "Lille", revenu: "Étudiante L2 psycho · 350€/mois job Carrefour",
          compagnon: "Célibataire, focus études",
          relations: "Colocation avec 2 amies musulmanes, parents en banlieue de Lille",
          situation: "Bourse échelon 5 · 0€ d'épargne · Stresse pour le master (4 000€/an)",
        },
        psycho: {
          probleme:
            "Sa mère pleure parfois à cause des fins de mois. Elle veut aider mais ne peut pas avec son job étudiant. Voit des camarades partir en vacances et se sent en décalage.",
          objectifs:
            "2 500€/mois propres en 6 mois pour financer son master sans crédit, donner 300€/mois à sa famille, épargne mariage halal.",
          consequences:
            "Prend un crédit étudiant 8 000€, finit son master à bout, devient psy salariée 1 900€/mois, reproduit la précarité parentale.",
          passe: "Vinted (200€ en 6 mois), tutorat (50€/mois), MLM cosmétique (perdu 180€).",
          sentiment:
            "Fatigue. Culpabilité de ne pas aider plus. Frustration de voir le temps passer. Foi solide.",
          paradis:
            "5h/sem d'études en plus, financer le master cash, payer le pèlerinage de sa mère, être un exemple pour ses petits frères.",
          phrase_avatar:
            "Je veux réussir mes études et soulager mes parents en même temps, sans choisir entre les deux.",
        },
      },
    },
  },
  {
    key: "argent_immo_sans_riba",
    label: "Investissement immobilier sans riba",
    market: "Argent",
    icon: "🏠",
    summary:
      "Couples musulmans 30-45 ans qui veulent acheter leur premier bien sans crédit conventionnel.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Couples musulmans pratiquants 30-45 ans, revenus 3 500€-6 000€/mois, épargne 15 000€-50 000€, refusent le crédit conventionnel",
        douleur:
          "Voir le loyer payé chaque mois (1 100-1 500€) qui ne construira jamais de patrimoine, se sentir impuissants quand des amis non-pratiquants achètent à 28 ans, douter sous la pression sociale et familiale",
        pouvoir_achat:
          "Programmes immo halal 4 000€-12 000€ vendus (Easy Halal, Albaraka Avenir). Couples cibles ont 15-50k€ d'épargne et revenus suffisants pour un coaching premium.",
        contact:
          "Instagram + YouTube long format (immo halal performe) + ads Facebook ciblées 30-45 propriétaires d'épargne + groupes 'immo halal France' (10k+ membres).",
        croissance:
          "Recherches 'achat immobilier halal', 'crédit sans riba' : 22 100/mois, +110% en 3 ans. Explosion avec la conscience religieuse des 25-45.",
        methode:
          "Méthode 5 PILIERS : audit patrimonial, plan cash 24-36 mois, stratégie revente, choix du bien, négociation & acte. Suivi 12 mois post-acquisition.",
        phrase:
          "Achat immobilier sans riba pour couples musulmans 30-45 — RP cash en 24 à 48 mois",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme & Homme", nom: "Mounia & Anas", age: "32 et 35 ans",
          lieu: "Strasbourg (Neudorf)",
          revenu: "Anas artisan BTP 3 200€/mois · Mounia infirmière 1 600€/mois",
          compagnon: "Mariés depuis 8 ans, 1 enfant de 4 ans, projet 2ème dans 1 an",
          relations: "Famille d'Anas dans le BTP. Famille de Mounia au Maroc et en France",
          situation: "Locataires T3 1 050€/mois depuis 6 ans · Épargne combinée 32 000€",
        },
        psycho: {
          probleme:
            "Paient 1 050€/mois de loyer depuis 6 ans (= 75 600€ partis en fumée). Tous leurs amis non-pratiquants ont acheté avec un crédit classique. Le père de Mounia leur dit 'prenez un crédit comme tout le monde'.",
          objectifs:
            "Maison T4 cash en 24-36 mois (240 000€), élever leur 2ème enfant chez eux, prouver à la famille que c'est possible, exemple pour les enfants.",
          consequences:
            "Continuent à louer 5-10 ans, perdent 100 000€+ en loyers, leur conviction religieuse s'érode sous la pression familiale.",
          passe:
            "Ont consulté 3 banques islamiques (refusées pour montant), ont essayé d'épargner sans plan (épargne stagnante).",
          sentiment:
            "Lassés. Sentiment d'injustice. Foi solide mais ébranlée par la pression sociale.",
          paradis:
            "Maison à eux en 36 mois, leur 2ème enfant né dans leur propre chambre, leurs parents fiers, témoignage public pour aider d'autres couples.",
          phrase_avatar:
            "Nous voulons devenir propriétaires sans compromis religieux, et prouver que c'est possible.",
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // RELATIONS (3)
  // ════════════════════════════════════════════════════════════════════
  {
    key: "relations_mariage_halal",
    label: "Préparation au mariage halal",
    market: "Relations",
    icon: "💍",
    summary:
      "Sœurs musulmanes 25-35 ans qui veulent se préparer émotionnellement et pratiquement au mariage halal.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Sœurs musulmanes 25-35 ans, célibataires ou fiancées, en recherche d'un mariage halal solide, souvent CSP+ ou en études supérieures",
        douleur:
          "Voir les amies se marier ou divorcer en série, ne pas savoir comment se préparer à un vrai engagement halal, peur de reproduire le schéma parental, manque de modèles de couples sereins",
        pouvoir_achat:
          "Programmes 'mariage halal' à 600€-1 800€ existent et se vendent. Cibles CSP+ ou financées par les parents.",
        contact:
          "Instagram (très active), YouTube témoignages couples musulmans, podcasts mariage halal, ads ciblées 25-35 musulmanes, groupes Facebook fermés.",
        croissance:
          "Forte croissance du marché mariage halal coaching en France : +50%/an. La demande dépasse l'offre éthique.",
        methode:
          "Méthode 90 JOURS : audit émotionnel, clarification critères deen + dunya, préparation entretien familial, gestion attentes. Pas de promesse de 'trouver' mais d'être prête.",
        phrase:
          "Préparation au mariage halal pour sœurs musulmanes 25-35 ans — 90 jours pour clarifier et être prête",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Asma", age: "29 ans",
          lieu: "Paris 19e", revenu: "Cheffe de projet · 3 600€ net/mois",
          compagnon: "Célibataire, 2 ruptures de fiançailles dans les 3 dernières années",
          relations: "Famille proche, mère pressante sur le mariage, deux soeurs déjà mariées",
          situation: "Locataire studio · vit seule · pratiquante depuis 18 ans",
        },
        psycho: {
          probleme:
            "Sent que le temps passe et que les fiançailles tombent à l'eau à chaque fois. Confond romance et compatibilité de fond. Sa mère lui met une pression silencieuse à chaque réunion familiale.",
          objectifs:
            "Clarifier en 90 jours ses critères deen + dunya, gérer ses émotions face aux rencontres, choisir avec lucidité et pas par peur de finir seule.",
          consequences:
            "Accepte une 3ème fiançaille bancale, divorce dans 2 ans, retourne à la case départ blessée.",
          passe:
            "Application halal 'Muzz' (rencontres décevantes), conseils famille (contradictoires), conférenciers en ligne (théoriques).",
          sentiment:
            "Lassitude. Honte de retourner aux mariages d'amies. Foi qui la tient mais doute sur l'avenir.",
          paradis:
            "Mariage solide à 30-31 ans, complicité émotionnelle et spirituelle, transmission de modèle à ses futurs enfants.",
          phrase_avatar:
            "Je veux me marier une seule fois, bien, sans me précipiter ni me laisser presser.",
        },
      },
    },
  },
  {
    key: "relations_couple_enfants",
    label: "Couples musulmans après l'arrivée des enfants",
    market: "Relations",
    icon: "👨‍👩‍👧",
    summary:
      "Couples musulmans 30-40 ans qui veulent retrouver leur connexion conjugale après l'arrivée d'enfants.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Couples musulmans 30-40 ans, mariés 5-15 ans, 2-4 enfants jeunes, connexion conjugale dégradée, désir de réinvestir le couple sans culpabilité",
        douleur:
          "Le couple est devenu une co-gestion d'enfants, plus de complicité, plus d'intimité, sentiment de perdre la baraka du foyer, fatigue chronique, ressentiments accumulés",
        pouvoir_achat:
          "Programmes couple musulman vendus 1 800€-4 000€ par 4 acteurs. Marché niche mais à très haute valeur (cible mariée stable, revenu combiné solide).",
        contact:
          "Instagram, YouTube témoignages, podcasts couple musulman, ads Facebook ciblées couples 30-40 mariés avec enfants, partenariats imams modérateurs.",
        croissance:
          "Marché coaching couple en croissance +20%/an en général, niche couple musulman/halal en explosion (+40%/an estimé). Tabou qui se lève progressivement.",
        methode:
          "Méthode 5 PILIERS : reconnecter au pourquoi du mariage, restaurer le rituel conjugal, ré-équilibrer charge mentale, ré-investir l'intimité halal, transmettre aux enfants.",
        phrase:
          "Reconnexion conjugale halal pour couples musulmans 30-40 ans après l'arrivée des enfants — 12 semaines",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme & Homme", nom: "Khadija & Tariq", age: "34 et 37 ans",
          lieu: "Lyon", revenu: "Tariq cadre 4 200€/mois · Khadija mi-temps 1 800€/mois",
          compagnon: "Mariés depuis 11 ans, 3 enfants (8, 5, 2 ans)",
          relations: "Famille très présente, sollicite beaucoup l'entraide",
          situation: "Propriétaires d'une maison T5 banlieue lyonnaise · Stable financièrement",
        },
        psycho: {
          probleme:
            "Plus aucun moment à eux. Disputes répétées sur la charge mentale. Distance émotionnelle. Tariq prie à la mosquée pour souffler. Khadija pleure seule la nuit.",
          objectifs:
            "Retrouver 2 rendez-vous conjugaux/sem en 90 jours, restaurer la complicité émotionnelle et spirituelle, préserver les enfants des tensions.",
          consequences:
            "Continuent en mode 'co-gestion' jusqu'au burn-out conjugal, séparation discutée puis acceptée vers 40 ans, traumatisme enfants.",
          passe:
            "Thérapeute de couple non-musulmane (cadre incompatible), ont essayé 'plus de patience', séparation de chambres temporaire.",
          sentiment:
            "Vide. Culpabilité. Peur de finir comme des amis divorcés. Foi qui les tient encore ensemble.",
          paradis:
            "Complicité du début retrouvée, sentiment d'équipe parentale, intimité halal restaurée, modèle inspirant pour leurs enfants.",
          phrase_avatar:
            "Nous voulons redevenir un couple, pas juste des parents qui cohabitent.",
        },
      },
    },
  },
  {
    key: "relations_education_maman",
    label: "Éducation positive pour mamans musulmanes",
    market: "Relations",
    icon: "👩‍👧‍👦",
    summary:
      "Mamans musulmanes débordées qui veulent éduquer sans crier ni frapper, en alignement avec la sunnah.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Mamans musulmanes 28-42 ans, 2-5 enfants 2-12 ans, débordées, en lutte intérieure entre éducation 'à l'ancienne' et désir de douceur prophétique",
        douleur:
          "Crier sur les enfants tous les jours, culpabiliser après chaque crise, sentir qu'on perd la baraka du foyer, ne pas trouver de modèle entre 'éducation positive' déconnectée et 'éducation à l'ancienne' culpabilisante",
        pouvoir_achat:
          "Programmes éducation positive musulmane 600€-1 800€ vendus régulièrement. Public maman musulmane CSP+ ou financé par mari.",
        contact:
          "Instagram (très forte présence), TikTok, podcasts éducation halal, ads ciblées mamans 28-42, groupes Facebook 'mamans musulmanes'.",
        croissance:
          "Marché éducation positive en explosion. Niche musulmane sous-servie (+60%/an). Demande > offre éthique sunnah-compatible.",
        methode:
          "Méthode 8 SEMAINES : régulation maman d'abord, rituels familiaux 5x/jour, gestion crises, éducation prophétique, transmission deen sereine.",
        phrase:
          "Éducation positive ancrée dans la sunnah pour mamans musulmanes 28-42 — 8 semaines pour ne plus crier",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Fatima", age: "34 ans",
          lieu: "Banlieue Toulouse", revenu: "Maman au foyer, mari ingénieur 3 800€/mois",
          compagnon: "Mariée depuis 10 ans",
          relations: "Belle-famille présente et donneuse de leçons, sa mère décédée il y a 3 ans",
          situation: "3 enfants (8, 6, 3 ans) · Maison propriétaire · Pratiquante voilée depuis 12 ans",
        },
        psycho: {
          probleme:
            "Crie sur ses enfants 5-6 fois/jour. Culpabilise chaque soir. Sentiment de perdre la baraka. Sa belle-mère lui dit 'à mon époque on tapait, ils respectaient'. Pleure de fatigue.",
          objectifs:
            "Ne plus crier en 90 jours, éduquer dans la douceur prophétique, retrouver la connexion avec ses enfants, transmettre le deen sans culpabilité.",
          consequences:
            "Continue à crier, ses enfants intériorisent la violence verbale, son aîné se ferme à 12 ans, foyer en tension permanente.",
          passe:
            "Lu 3 livres éducation positive (laïques), réseaux sociaux (Instagram comptes éducation), conseils belle-famille.",
          sentiment:
            "Épuisée. Coupable. Honte. Foi qui la pousse à chercher des solutions sans compromis.",
          paradis:
            "Foyer paisible, enfants qui prient avec joie, complicité retrouvée, modèle pour ses sœurs, baraka palpable.",
          phrase_avatar:
            "Je veux éduquer mes enfants avec la douceur du Prophète ﷺ, pas dans la culpabilité ni la sévérité.",
        },
      },
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // SANTÉ (3)
  // ════════════════════════════════════════════════════════════════════
  {
    key: "sante_perte_poids_mamans",
    label: "Perte de poids halal pour mamans",
    market: "Santé",
    icon: "🥗",
    summary:
      "Mamans musulmanes débordées qui veulent perdre 10-15 kg sans aller en salle ni se priver.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Mamans musulmanes 30-45 ans, 2-4 enfants, surpoids post-grossesse 10-20 kg, sans temps pour la salle, en quête d'une approche halal et durable",
        douleur:
          "Ne plus se reconnaître dans le miroir, ne plus aimer s'habiller, peur de tomber malade jeune, ne pas avoir l'énergie pour ses enfants, complexes face au mari après l'accouchement",
        pouvoir_achat:
          "Programmes perte de poids 600€-2 000€ vendus par dizaines (Yoann Sablon, Yoga musulman). Cibles avec mari salarié CSP+ ou indépendantes.",
        contact:
          "Instagram (très active), YouTube avant/après, ads ciblées mamans 30-45, groupes Facebook 'mamans halal'.",
        croissance:
          "Marché perte de poids halal en croissance +30%/an. Demande forte de mamans musulmanes pour des programmes adaptés au voile, ramadan, prière.",
        methode:
          "Méthode 90 JOURS HALAL : nutrition adaptée à la cuisine maghrébine/française, micro-mouvements quotidiens, ajustements ramadan, gestion émotionnelle.",
        phrase:
          "Perte de poids halal pour mamans musulmanes 30-45 — 10 à 15 kg en 90 jours sans salle ni privation",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Nawal", age: "36 ans",
          lieu: "Marseille (13e)",
          revenu: "Aide-soignante mi-temps · 1 300€/mois (mari électricien CDI 2 600€)",
          compagnon: "Mariée depuis 13 ans, 3 enfants (10, 7, 4 ans)",
          relations: "Famille proche, sœurs aussi maman, belle-famille présente",
          situation: "Locataires HLM T4 · 28 kg pris en 3 grossesses · 0 sport depuis 6 ans",
        },
        psycho: {
          probleme:
            "Pleure devant la glace. N'ose plus enlever son hijab devant son mari le soir. Énergie au plus bas, s'endort à 22h épuisée. Tension artérielle élevée à 36 ans.",
          objectifs:
            "Perdre 12 kg en 90 jours, retrouver l'énergie pour ses enfants, oser à nouveau se montrer à son mari, ne pas finir diabétique comme sa mère.",
          consequences:
            "Continue à prendre du poids, diabète type 2 dans 5 ans, hypertension, dépend de médicaments à 45 ans, modèle négatif pour ses filles.",
          passe:
            "Régimes restrictifs (Dukan, Weight Watchers), produits coupe-faim (perdu 200€), salle de sport 2 mois (abandon).",
          sentiment:
            "Honte. Épuisée. Foi qui la pousse à prendre soin de son amana (corps).",
          paradis:
            "Énergie revenue, joue avec ses enfants, son mari la complimente, modèle sain pour ses filles, en bonne santé jusqu'à voir grandir ses petits-enfants.",
          phrase_avatar:
            "Je veux retrouver mon corps et mon énergie, halal, sans me priver ni me détester.",
        },
      },
    },
  },
  {
    key: "sante_sport_hommes_3550",
    label: "Reprise sportive pour hommes musulmans 35-50",
    market: "Santé",
    icon: "💪",
    summary:
      "Hommes musulmans 35-50 ans qui veulent reprendre le sport en gérant prière, ramadan et contraintes pro.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Hommes musulmans 35-50 ans, surcharge pondérale modérée, ont arrêté le sport depuis 5-15 ans, contraintes pro fortes, pratiquants modérés à pratiquants",
        douleur:
          "Plus de souffle à 40 ans, dos douloureux, sentiment de vieillir avant l'heure, ne plus pouvoir jouer avec ses enfants, peur de la crise cardiaque qui a touché un cousin",
        pouvoir_achat:
          "Programmes sport homme 800€-2 500€ vendus régulièrement. Cibles CSP+ ou indépendants avec revenu solide.",
        contact:
          "Instagram + YouTube transformations, podcasts santé homme, ads ciblées 35-50 cadres/indépendants, partenariats mosquées et imams pour intervenir sur la santé.",
        croissance:
          "Marché sport homme 35+ en croissance +25%/an. Niche musulmane sous-servie (adaptation prière, ramadan, voile).",
        methode:
          "Méthode 12 SEMAINES : audit santé, 3 séances/sem 40 min adaptables (maison ou salle), nutrition cuisine maghrébine, ajustements prière et ramadan.",
        phrase:
          "Reprise sportive halal pour hommes musulmans 35-50 — 12 semaines pour redevenir un père et un mari en forme",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Homme", nom: "Salim", age: "42 ans",
          lieu: "Lyon (8e)",
          revenu: "Cadre informatique CDI · 4 600€ net/mois",
          compagnon: "Marié depuis 14 ans, 3 enfants (12, 9, 5 ans)",
          relations: "Famille en région parisienne, voit ses parents 4x/an",
          situation: "Propriétaire d'une maison · 22 kg en trop · arrêt du sport depuis 12 ans",
        },
        psycho: {
          probleme:
            "S'essouffle en montant 3 étages. Dos qui bloque 2-3 fois par an. Cousin de 45 ans mort d'un infarctus l'an dernier — choc. Ses enfants commencent à le voir 'vieux'.",
          objectifs:
            "Perdre 15 kg en 12 semaines, jouer au foot avec son aîné, courir 5 km sans s'arrêter, ne pas mourir avant 70 ans, transmettre une amana saine.",
          consequences:
            "Diabète type 2 dans 3 ans, hypertension, traitement à vie, AVC vers 55 ans comme son oncle, ses enfants assistent à son déclin.",
          passe:
            "Salle de sport 3 mois (abandon), régime cétogène 6 sem (effet yoyo), application Yazio (a fait 2 semaines).",
          sentiment:
            "Honte. Peur. Foi qui le pousse à honorer son corps comme amana d'Allah.",
          paradis:
            "Forme retrouvée, joue au foot avec son fils, randonnée famille en montagne, en vie pour voir ses petits-enfants, modèle pour ses enfants.",
          phrase_avatar:
            "Je veux honorer mon corps comme une amana et être un père présent et solide pour mes enfants.",
        },
      },
    },
  },
  {
    key: "sante_anxiete_etudiants",
    label: "Anxiété & tawakkul pour étudiants musulmans",
    market: "Santé",
    icon: "🌿",
    summary:
      "Étudiants musulmans 16-25 ans qui veulent gérer leur anxiété en combinant outils psy et tawakkul.",
    patch: {
      ...basePatch("B"),
      sous_niche_2: {
        cible:
          "Étudiants musulmans 16-25 ans, en lycée/prépa/master, anxiété chronique ou crises de panique, en quête d'une approche combinant outils psy et spiritualité islamique",
        douleur:
          "Crises d'angoisse avant les exams, insomnies, perte de concentration, pression familiale forte pour réussir, sentiment de manquer de foi parce qu'on est anxieux",
        pouvoir_achat:
          "Programmes santé mentale spécifiques musulmans 600€-2 000€ par 5 acteurs (Asma Lamrabet, Najwa, etc.). Demande forte, peu de psys cliniciens dans la niche. Public étudiant payé via parents.",
        contact:
          "Instagram + TikTok (jeunes très actifs), podcasts santé mentale halal, partenariats associations étudiantes musulmanes, ads ciblées 16-25.",
        croissance:
          "Marché santé mentale jeune en explosion post-Covid (+80%/an). Niche musulmane sous-servie (besoin d'intégration spirituelle).",
        methode:
          "Méthode 8 SEMAINES : régulation neurovégétative (respiration, ancrages), restructuration cognitive halal, rituels tawakkul, gestion crises, prévention rechute.",
        phrase:
          "Anxiété & tawakkul pour étudiants musulmans 16-25 — 8 semaines pour reprendre le contrôle",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Sara", age: "20 ans",
          lieu: "Bordeaux (étudiante)",
          revenu: "Étudiante L2 médecine · bourse 460€/mois + parents 200€",
          compagnon: "Célibataire, focus études",
          relations: "Vit en cité U, famille à Paris, parents pharmaciens exigeants",
          situation: "L2 médecine, en grande pression de réussite, 3 crises de panique le mois dernier",
        },
        psycho: {
          probleme:
            "Crises d'angoisse 2-3x/sem, insomnies, peur de l'échec aux exams. Ses parents lui disent 'tu as la chance d'étudier, ressaisis-toi'. Sentiment d'avoir une foi 'défectueuse' parce qu'anxieuse.",
          objectifs:
            "Réguler les crises en 8 semaines, retrouver le sommeil, valider l'année, restaurer la confiance en Allah et en elle.",
          consequences:
            "Burn-out étudiant, redoublement, perte de confiance durable, dépendance anxiolytiques à 22 ans, abandon des études vers 24.",
          passe:
            "Médecin généraliste (anxiolytiques refusés), psy 3 séances (cadre laïque incompatible), conférences en ligne (théoriques).",
          sentiment:
            "Submergée. Honte. Foi vacillante. Solitude.",
          paradis:
            "Calme intérieur, sommeil régulier, succès au concours, modèle pour ses petits frères, foi solidifiée par la traversée.",
          phrase_avatar:
            "Je veux que ma foi soit une force qui m'apaise, pas une exigence supplémentaire qui m'écrase.",
        },
      },
    },
  },
];
