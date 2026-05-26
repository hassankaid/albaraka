/**
 * Mode démo — 10 niches pré-remplies (4 Argent · 3 Relations · 3 Santé).
 *
 * Transposition fidèle du `DEMO_NICHES` du HTML standalone Sidali V2.
 * Chaque démo charge un state complet (capture, stress_test, sous_niche_2,
 * avatar, validation, engagement) pour que l'élève puisse explorer tout le
 * flow comme dans la version originale.
 *
 * Comme dans Sidali, la démo démarre à l'écran `branchB_capture` — l'élève
 * voit la capture pré-remplie, peut avancer Stress test → Crystal → Avatar →
 * Validation → Lock. En mode démo, le state n'est JAMAIS persisté en BDD.
 */

import type { M1State, M1Step } from "./types";

export interface DemoNiche {
  key: string;
  label: string;
  market: "Argent" | "Relations" | "Santé";
  icon: string;
  summary: string;
  patch: Partial<M1State> & { step: M1Step };
}

const COMMON_PATCH = {
  step: "branchB_capture" as M1Step,
  branch: "B" as const,
  completed: false,
};

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
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour devenir affilié dans l'écosystème halal et générer 1500-5000€/mois en complément du salaire",
        vecu:
          "Affilié dans l'écosystème AL BARAKA depuis 2 ans, je suis passé de 0€ à 6 800€/mois de commissions en 14 mois en travaillant 2h/jour après mon CDI. J'ai accompagné 23 affiliés à dépasser leurs 1000€ de commission/mois.",
        pourquoi:
          "Parce que la plupart des salariés musulmans sont coincés entre un CDI qui les use et des opportunités online quasi toutes basées sur du riba ou du non-éthique. L'affiliation halal résout les deux.",
      },
      stress_test: {
        lives_from_skill:
          "Oui, depuis 2 ans. CA cumulé sur l'affiliation : 84 200€ en 18 mois. Captures Stripe + dashboard plateforme dispo. Mois record : 9 400€ en septembre.",
        three_people:
          "1. Karim, 31 ans, technicien réseaux Orange, 2 200€/mois, marié 1 enfant, en a marre des astreintes et veut un revenu mobile.\n2. Yacine, 27 ans, livreur Amazon, 1 800€/mois, célibataire, veut accumuler pour le mariage et un projet de vie au Maroc.\n3. Soraya, 35 ans, infirmière, 2 400€/mois, divorcée 2 enfants, veut quitter l'hôpital sans chuter financièrement.",
        revenue_proof:
          "Mes 23 accompagnés ont payé 2 500€ ou 5 000€ leur formation. 11 d'entre eux ont fait leur premier 1 000€ en moins de 60 jours. Concurrence directe : pack à 2 500-5 000€ vendus par 8+ infopreneurs musulmans francophones.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Salariés musulmans 25-40 ans, CDI/CDD, revenu 1 500-2 800€/mois, frustrés par leur travail et en quête d'un revenu complémentaire éthique",
        douleur:
          "Vivre sa religion à fond mais être prisonnier d'un job qui n'a pas de sens, regarder ses collègues catholiques/non-pratiquants se libérer financièrement avec des business souvent non halal, et se dire qu'on n'a pas d'option éthique",
        pouvoir_achat:
          "Pack écosystème AL BARAKA à 2 500€ vendu plusieurs centaines de fois. Pack LIBERTY à 5 000€. Concurrents (Saad El Founisi, Achraf Bali, etc.) facturent entre 1 500€ et 7 000€. Marché documenté.",
        contact:
          "Instagram + groupes Telegram halal + ads YouTube ciblées musulmans 25-40 + collaborations avec écosystème AL BARAKA et infopreneurs halal. Public actif sur les réseaux et engagé avec les comptes business musulmans.",
        croissance:
          "Marché du business halal e-learning en croissance +35%/an depuis 2020. L'écosystème AL BARAKA seul a triplé en 2 ans. Recherches Google 'business halal' et 'affiliation halal' : +180% sur 3 ans.",
        methode:
          "Méthode 3-2-1 : 3 contenus organiques/semaine sur Instagram, 2h de prospection DM/jour, 1 closing call/jour. Suivi structuré sur 90 jours avec tracker.",
        phrase:
          "J'aide les salariés musulmans qui veulent un revenu complémentaire éthique à devenir affilié dans l'écosystème halal et générer 1 500€ à 5 000€/mois en 90 jours, sans quitter leur CDI.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Homme", nom: "Karim", age: "31 ans",
          lieu: "Région parisienne (Saint-Denis)",
          revenu: "Technicien réseaux CDI · 2 200€ net/mois",
          compagnon: "Marié depuis 4 ans, 1 enfant de 2 ans",
          relations:
            "Famille proche en banlieue, frères et soeurs salariés, ami d'enfance entrepreneur (lui dans le BTP)",
          situation:
            "Locataire HLM · Paie 2 fois par mois ses parents (200€) · Veut acheter un bien dans 3-5 ans",
        },
        psycho: {
          probleme:
            "Frustré de bosser pour un salaire qui ne lui permet ni d'épargner sérieusement, ni de partir en vacances, ni d'aider sa famille comme il voudrait. Voit ses collègues non-pratiquants se libérer avec du trading ou de l'immobilier locatif et se sent bloqué par ses valeurs.",
          objectifs:
            "Atteindre 4 000€/mois supplémentaires en 12 mois pour acheter un appartement cash sans riba dans 4-5 ans, faire la omra avec sa femme, aider sa mère qui est seule.",
          consequences:
            "Si rien ne change : il reste coincé 10 ans dans un CDI qu'il déteste, son fils grandit sans le voir le soir, il regarde son père vieillir sans pouvoir l'aider matériellement. Il finit par lâcher sa pratique religieuse parce qu'il n'a 'pas le temps'.",
          passe:
            "A essayé : dropshipping (a perdu 800€), trading crypto (a perdu 1 200€ pendant le crash 2022), MLM (a fait 2 mois, a arrêté car non-éthique). Toujours dans le 'fait n'importe quoi sans méthode'.",
          sentiment:
            "Coincé. Honte de ne pas mieux subvenir aux besoins de sa famille. Anxiété chronique le dimanche soir. Sentiment d'avoir 'raté quelque chose' que ses cousins entrepreneurs ont eu.",
          paradis:
            "Travailler 4-5h/jour de chez lui, voir son fils tous les soirs, prier à la mosquée à dohr sans stress, partir 2 fois/an au Maroc voir sa famille, donner 200€/mois à sa mère sans calculer.",
          phrase_avatar:
            "Je veux gagner ma vie correctement sans avoir à choisir entre ma religion et mon avenir financier.",
        },
      },
      validation: {
        demande_q1:
          "Posté un lead magnet 'Comment générer 1000€/mois en affiliation halal' sur Instagram + LinkedIn. 412 téléchargements en 72h. 38 commentaires demandant 'comment faire'.",
        demande_q2:
          "Mots-clés Google : 'business halal', 'investissement halal', 'gagner argent islam' = 14 800 recherches/mois cumulées (France). Communauté Reddit r/MuslimEntrepreneurs : 8 200 membres actifs.",
        concurrence_q1:
          "Concurrents directs identifiés : 8 infopreneurs francophones (Sidali Hamel, Saad El Founisi, Imran Maghraoui, etc.). Tous facturent 1 500€-7 000€. Pas un n'a la combinaison 'salarié + 90 jours + halal pur'.",
        concurrence_q2:
          "Mon edge : je suis encore SALARIÉ moi-même (technicien Orange), pas un infopreneur full-time. Mes accompagnés s'identifient à mon profil. Les 'gourous' à 50k€/mois leur paraissent inaccessibles.",
        perennite_q1:
          "L'écosystème halal est en pleine structuration en France/Belgique/Canada. La demande dépasse l'offre. Aucun acteur dominant à >20% de part de marché.",
        perennite_q2:
          "Risque IA : faible (le coaching humain reste central). Risque régulation : nul (rien d'illégal). Risque saturation : moyen mais 5+ ans avant que ça arrive. Risque mode : faible (les valeurs ne sont pas une mode).",
        perennite_q3:
          "Je peux pivoter facilement vers d'autres marchés musulmans (Belgique, Maroc, Émirats francophones) ou élargir vers des sous-niches (étudiants musulmans, mamans musulmanes au foyer).",
        alignement_q1:
          "Ce travail me fait grandir spirituellement : je suis obligé d'être irréprochable dans mes propos, mes méthodes, mes promesses. Le tawakkul est central.",
        alignement_q2:
          "Aide réelle : 11 de mes accompagnés sont sortis de leur CDI. Témoignages vidéo + captures comptes Stripe. Aucune plainte en 2 ans.",
        alignement_q3:
          "Si je génère 10 000€/mois cette année avec ça, je continue. Si je tombe à 1 500€/mois, je continue aussi parce que c'est ma mission. Le revenu n'est pas le seul KPI.",
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
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour devenir setter ou closer dans l'écosystème halal et générer 2000-6000€/mois sans diplôme",
        vecu:
          "Closer pour 4 entrepreneurs musulmans depuis 18 mois. CA généré pour mes clients : 320 000€ en 2024. Mes commissions : 38 400€ sur l'année. J'ai formé 6 jeunes au métier de setter, 4 sont à 1 500€+/mois.",
        pourquoi:
          "Parce que des milliers de jeunes musulmans veulent sortir de la précarité et de la 'débrouille' sans diplôme. Le setting/closing est le métier le plus rapide à apprendre et le plus rentable, et l'écosystème halal manque cruellement de profils formés.",
      },
      stress_test: {
        lives_from_skill:
          "Oui depuis 18 mois. 4 clients récurrents (entrepreneurs musulmans français), commissions de 8% à 12%. Dashboards CRM + virements bancaires dispo.",
        three_people:
          "1. Younes, 22 ans, livreur Uber Eats, 1 400€/mois, étudiant en pause, veut un vrai métier rémunérateur.\n2. Asma, 26 ans, vendeuse en boutique, 1 600€/mois, célibataire, veut devenir indépendante avant le mariage.\n3. Bilal, 19 ans, en BTS commerce, 0€ de revenu, veut financer ses études sans crédit.",
        revenue_proof:
          "Mes 6 formés : 4 ont dépassé 1 500€/mois en moins de 90 jours. Programme vendu 1 500€ par 3 autres formateurs francophones. Demande très forte sur les groupes musulmans Telegram.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Jeunes musulmans 18-30 ans, sans diplôme valorisé ou en début de parcours, en précarité ou en quête d'autonomie rapide, idéalement bilingues français/arabe",
        douleur:
          "Voir ses pairs réussir online avec des méthodes douteuses ou non-éthiques, se sentir inutile ou en échec à 22 ans, n'avoir ni capital ni diplôme pour démarrer un business, vivre encore chez ses parents et le vivre comme une humiliation",
        pouvoir_achat:
          "Programmes setting/closing à 1 500€-3 000€ vendus régulièrement (Kiyan Boukhari, formations Pass AL BARAKA). Marché jeune mais avec parents qui financent souvent.",
        contact:
          "Instagram + TikTok (jeunes 18-30 très actifs) + ads ciblées musulmans 18-30 + collaborations avec infopreneurs musulmans qui recrutent des closers + groupes Telegram d'entraide.",
        croissance:
          "Métier de closer en explosion : recherches Google +82%/an. Tous les infopreneurs cherchent des setters/closers, la demande dépasse largement l'offre formée correctement. Marché jeune et en pleine structuration.",
        methode:
          "Méthode SCRIPT-VOLUME-TRACKING : maîtriser 3 scripts de prospection, faire 100 prises de contact/jour, tracker chaque conversation. Premier client en 30 jours, première commission en 45.",
        phrase:
          "J'aide les jeunes musulmans 18-30 sans diplôme à devenir closer pour des entrepreneurs musulmans et générer 2 000€ à 6 000€/mois en 90 jours, sans capital de départ.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Homme", nom: "Younes", age: "22 ans",
          lieu: "Roubaix",
          revenu: "Livreur Uber Eats · ~1 400€/mois (variable)",
          compagnon: "Célibataire, en quête de mariage halal d'ici 2-3 ans",
          relations:
            "Vit chez ses parents, 3 frères et soeurs plus jeunes, père retraité ouvrier, mère au foyer",
          situation:
            "BTS commerce abandonné en cours, scooter financé par son père, pas de permis voiture, économies = 0€",
        },
        psycho: {
          probleme:
            "Voit ses cousins et amis qui ont 'percé' avec du trading, du MLM ou des affaires douteuses. Lui veut faire les choses bien mais ne sait pas comment. Sa mère lui demande à demi-mots quand il va 'devenir quelqu'un'. Sa fierté en prend un coup chaque jour.",
          objectifs:
            "Atteindre 3 000€/mois propres en 6 mois pour quitter la livraison, prendre un studio à lui (sans pour autant abandonner sa famille), commencer à mettre de côté pour le mariage.",
          consequences:
            "Si rien ne change : il reste livreur 5 ans, son dos commence à lâcher à 28 ans, il accepte un mariage 'par défaut' parce qu'il n'a pas de stabilité, il devient amer.",
          passe:
            "Trading crypto (perdu 600€ d'économies de mariage), MLM nutrition (a essayé 2 semaines, abandonné), revente de baskets (a fait quelques centaines d'euros mais pas scalable).",
          sentiment:
            "Frustration permanente. Honte devant les copains qui font des études. Peur de finir comme certains de ses oncles, coincés dans le BTP. Espoir mêlé d'angoisse quand il scrolle Instagram.",
          paradis:
            "Travailler de chez lui ou d'un café 5-6h/jour, gagner correctement, prier à l'heure, faire ses 5 prières, financer le hajj de sa mère dans 3 ans, se marier en étant fier de ce qu'il a construit.",
          phrase_avatar:
            "Je veux prouver à ma famille et à moi-même que je peux réussir sans tricher et sans diplôme.",
        },
      },
      validation: {
        demande_q1:
          "Reels TikTok 'comment je fais 3K€/mois en closing à 22 ans' : 47K vues, 280 commentaires en 5 jours. Lead magnet 'kit setter débutant' : 890 téléchargements en 2 semaines.",
        demande_q2:
          "Recherches Google : 'devenir closer', 'setter sans diplôme', 'closing remote' = 5 600 recherches/mois en France. Forte croissance YoY (+82% sur 2 ans).",
        concurrence_q1:
          "Concurrents : Kiyan Boukhari, Yann Darwin (closing), Pass AL BARAKA (setting). Mes différenciants : prix accessible (1 500€ vs 3 500€+), placement direct chez des entrepreneurs musulmans halal.",
        concurrence_q2:
          "Edge : je suis JEUNE (24 ans), j'ai été à leur place il y a 2 ans. Pas un 'gourou' inaccessible. Je vis ce qu'ils vivent encore.",
        perennite_q1:
          "Métier en croissance : tous les infopreneurs cherchent des setters/closers. La demande dépasse largement l'offre formée correctement.",
        perennite_q2:
          "Risque IA : moyen (les chatbots font le setting basique mais pas le closing humain). Adaptable en se positionnant 'closer humain pour ventes >1 500€'.",
        perennite_q3:
          "Je peux étendre vers le coaching de teams de setters, le placement (% sur leurs commissions), ou pivoter vers le copywriting.",
        alignement_q1:
          "Je place uniquement chez des entrepreneurs musulmans qui vendent du halal. Pas de placement chez des coachs en séduction, en trading spéculatif, etc. Le filtre éthique est en amont.",
        alignement_q2:
          "4 sur 6 de mes formés ont quitté la précarité. Ils témoignent vidéo. Aucun cas où j'ai 'forcé' une vente — j'ai même refusé 2 prospects qui n'avaient pas le profil.",
        alignement_q3:
          "Si demain le métier disparaît, je pivote vers la formation pure ou le placement. Mes valeurs et mon vécu de 'sortir de la précarité par les compétences' restent.",
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
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour aider les étudiants musulmans à monter leur agence SMMA et facturer 3 à 5 PME locales 800-2000€/mois chacune",
        vecu:
          "Monté mon agence SMMA pendant ma licence en 2022. 9 clients PME locaux à 1 200€/mois en moyenne. CA 2024 : 132 800€. Sortie diplômé sans dette ni stress, à la tête d'une équipe de 3 personnes.",
        pourquoi:
          "Parce que des dizaines de milliers d'étudiants musulmans bossent en McDo ou en livraison pour financer leurs études et leur vie. Le SMMA bien fait permet de faire 3 000-5 000€/mois en 10h/semaine. Ça change leur vie.",
      },
      stress_test: {
        lives_from_skill:
          "Oui depuis 3 ans. 9 clients PME locaux récurrents (restaurants halal, boutiques mode modeste, salons de coiffure). Captures Stripe + comptabilité dispo. Reconnu comme expert dans le hub des agences SMMA francophones.",
        three_people:
          "1. Imen, 20 ans, étudiante en psycho à Lille, 350€/mois en job étudiant chez Carrefour, veut financer son master sans crédit.\n2. Mehdi, 22 ans, étudiant en école de commerce à Lyon, 800€/mois en alternance, veut quitter l'alternance et monter son business.\n3. Sara, 19 ans, en BTS NDRC, 0€, vit chez ses parents qui galèrent, veut aider à la maison.",
        revenue_proof:
          "Programme vendu 1 800€-3 200€ par 6 formateurs SMMA francophones (Yomi Denzel, Mehdi LMAATI, etc.). Mes 4 premiers étudiants formés ont signé 2 clients chacun en moins de 60 jours.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Étudiants musulmans 18-25 ans, en licence/BTS/master, qui bossent en parallèle (job étudiant ou alternance) et veulent du temps + plus de revenus pour leurs études et leur indépendance",
        douleur:
          "Galérer entre les cours et un job étudiant qui prend 20h/semaine pour 400€, voir ses parents stresser financièrement et ne rien pouvoir faire, voir certains camarades non-musulmans monter des business avec dropshipping/trading et ne pas avoir d'option éthique aussi rentable",
        pouvoir_achat:
          "Programmes SMMA généralistes vendus 1 500€-3 200€ régulièrement. Public étudiant : oui, payés via parents (qui voient le retour rapide), via crédit étudiant, ou via épargne d'alternance.",
        contact:
          "Instagram + TikTok + LinkedIn campus + partenariats associations étudiantes musulmanes + ads ciblées 18-25 étudiants. Forte présence des étudiants musulmans sur Instagram et TikTok business.",
        croissance:
          "Recherches Google 'business étudiant', 'agence SMMA' : 12 400/mois en France, croissance forte chez les 18-24. SMMA en croissance soutenue (+40%/an estimé) avec démocratisation des outils.",
        methode:
          "Méthode SOLO-9 : 1 niche locale par étudiant, 9 clients max, prospection systématique sur 30 jours puis fidélisation. Pas de scaling agency tant que pas de stabilité financière.",
        phrase:
          "J'aide les étudiants musulmans 18-25 à monter leur agence SMMA pour PME locales et facturer 3 000€ à 5 000€/mois en 10h/semaine, sans toucher à leurs études.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Imen", age: "20 ans",
          lieu: "Lille",
          revenu: "Étudiante L2 psycho · 350€/mois job Carrefour",
          compagnon: "Célibataire, focus études",
          relations:
            "Vit en colocation avec 2 amies musulmanes, parents en banlieue de Lille (père chauffeur, mère femme de ménage), 2 frères plus jeunes",
          situation: "Bourse échelon 5 (estimable). 0€ d'épargne. Stresse pour le master qui coûtera 4 000€/an",
        },
        psycho: {
          probleme:
            "Sa mère pleure parfois à cause des fins de mois. Elle veut aider mais ne peut pas avec son job étudiant. Elle voit ses camarades de master qui ont des parents aisés et part en vacances, et se sent en décalage.",
          objectifs:
            "Atteindre 2 500€/mois propres en 6 mois pour financer son master sans crédit étudiant, donner 300€/mois à sa famille, et commencer à se constituer une épargne de mariage halal.",
          consequences:
            "Si rien ne change : elle prend un crédit étudiant à 8 000€, finit son master à bout, devient psy salariée à 1 900€/mois, et reproduit le schéma de précarité de ses parents.",
          passe:
            "A essayé Vinted (a fait 200€ en 6 mois), un peu de tutorat (50€/mois), un MLM cosmétique conseillé par une cousine (a perdu 180€ et son temps).",
          sentiment:
            "Fatigue. Culpabilité de ne pas aider plus. Frustration de voir le temps passer. Foi solide qui la tient debout.",
          paradis:
            "Avoir 5h/semaine d'études en plus, financer son master cash, payer le pèlerinage de sa mère, devenir un exemple pour ses petits frères, avoir le calme d'esprit pour étudier.",
          phrase_avatar:
            "Je veux réussir mes études et soulager mes parents en même temps, sans choisir entre les deux.",
        },
      },
      validation: {
        demande_q1:
          "Post LinkedIn 'comment j'ai monté mon agence à 1500€/mois en étant étudiante' : 78 000 impressions, 340 demandes de contact en 10 jours.",
        demande_q2:
          "Recherches Google 'devenir freelance étudiant', 'agence SMMA', 'business étudiant' = 12 400 recherches/mois en France. Croissance forte chez les 18-24.",
        concurrence_q1:
          "Concurrents : formations SMMA généralistes (Yomi Denzel, Mehdi LMAATI). Pas un n'est ciblé étudiants musulmans avec contraintes spécifiques (ramadan, prières, deen).",
        concurrence_q2:
          "Mon edge : je suis l'exemple direct (étudiante de 23 ans qui a fini sa licence sans dette). Mes étudiants me ressemblent et croient au modèle.",
        perennite_q1:
          "Le SMMA est mature mais loin d'être saturé pour les PME locales (qui restent peu digitalisées). Marché de niche : énorme.",
        perennite_q2:
          "Risque IA : modéré (les outils IA font partie de la prestation, je l'enseigne). Risque saturation locale : faible si on diversifie les villes.",
        perennite_q3:
          "Je peux pivoter vers la formation à temps plein, ouvrir une agence à mon nom à plus grande échelle, ou former des formatrices.",
        alignement_q1:
          "Je n'enseigne que des prestations halal (pas de promotion d'alcool, de pari, de cosmétiques douteux). Filtres clairs sur les types de PME ciblées.",
        alignement_q2:
          "4 étudiantes formées, toutes ont signé au moins 1 client. Témoignages + captures comptables. Aucune plainte.",
        alignement_q3:
          "Si demain je gagne moins, ce travail garde son sens : aider des étudiantes à ne pas s'endetter et à servir leur famille.",
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
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour aider les couples musulmans à acheter leur résidence principale sans riba via les leviers cash, démembrement, et financement participatif",
        vecu:
          "Acheté ma propre RP cash en 2023 à 38 ans après 6 ans de stratégie cash + revente de mes 2 commerces. Accompagné depuis 14 couples musulmans à acquérir leur premier bien sans riba (12 RP + 2 locatifs). Aucun n'a contracté de crédit conventionnel.",
        pourquoi:
          "Parce que des centaines de milliers de couples musulmans en France paient un loyer pendant 20 ans en pensant que 'l'achat halal n'est pas possible'. C'est faux. Mais personne ne leur a montré comment, pas à pas, de façon réaliste.",
      },
      stress_test: {
        lives_from_skill:
          "Oui. Propriétaire RP en cash. 14 couples accompagnés sur 18 mois. CA accompagnement : 84 000€ (programmes 6 000€ × 14). Aucun n'a fait de riba.",
        three_people:
          "1. Mounia (32) et Anas (35), couple à Strasbourg, lui chef d'entreprise BTP, elle infirmière, revenus combinés 4 800€/mois, 1 enfant, 32 000€ d'épargne.\n2. Saïd (40) et Houria (38), couple à Marseille, lui artisan, elle au foyer, revenus 3 500€/mois, 4 enfants, 18 000€ d'épargne, locataires depuis 12 ans.\n3. Adel (29) et Inès (27), couple à Lyon, salariés cadres, revenus combinés 5 200€/mois, sans enfant, 45 000€ d'épargne, refusent un crédit classique.",
        revenue_proof:
          "Programmes immo halal vendus 4 000€-12 000€ par 5 acteurs francophones (Easy Halal, Albaraka Avenir, etc.). Marché en très forte croissance avec l'augmentation de la conscience religieuse des 25-45 ans.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Couples musulmans pratiquants 30-45 ans, revenus combinés 3 500€-6 000€/mois, ont 15 000€-50 000€ d'épargne, refusent le crédit conventionnel pour des raisons religieuses",
        douleur:
          "Voir le loyer qu'ils paient mois après mois (souvent 1 100€-1 500€) et savoir que cet argent ne construira jamais un patrimoine, se sentir impuissants quand des amis non-pratiquants achètent à 28 ans avec un crédit, douter de leurs convictions face à la pression sociale et familiale",
        pouvoir_achat:
          "Programmes 4 000€-12 000€ existent et se vendent (Easy Halal, Albaraka Avenir). Couples cibles ont entre 15 000€ et 50 000€ d'épargne et un revenu suffisant pour absorber un coaching premium si la valeur est démontrée.",
        contact:
          "Instagram + YouTube (contenu long format sur l'immo halal performe) + ads Facebook/Meta ciblées couples musulmans 30-45 propriétaires d'épargne + groupes Facebook 'immo halal France' (10k+ membres).",
        croissance:
          "Recherches Google 'achat immobilier halal', 'crédit sans riba', 'investissement halal France' : 22 100/mois, +110% en 3 ans. Marché en explosion avec montée de la conscience religieuse des 25-45 ans.",
        methode:
          "Méthode 5 PILIERS : (1) Audit patrimonial complet, (2) Plan cash agressif sur 24-36 mois, (3) Stratégie revente / activité parallèle, (4) Choix du bien (RP vs locatif vs SCPI halal), (5) Négociation et acte. Suivi 12 mois post-acquisition.",
        phrase:
          "J'aide les couples musulmans pratiquants 30-45 ans à acquérir leur première résidence principale sans riba en 24 à 48 mois, via une stratégie cash structurée et zéro compromis religieux.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme et Homme", nom: "Mounia & Anas", age: "32 et 35 ans",
          lieu: "Strasbourg (Neudorf)",
          revenu:
            "Anas : artisan BTP indépendant 3 200€/mois · Mounia : infirmière CDI 1 600€/mois",
          compagnon: "Mariés depuis 8 ans, 1 enfant de 4 ans, projet 2ème enfant dans 1 an",
          relations:
            "Famille d'Anas : père retraité maçon, frères dans le BTP. Famille de Mounia : parents au Maroc, soeurs dispersées en France",
          situation:
            "Locataires d'un T3 à 1 050€/mois depuis 6 ans · Épargne combinée 32 000€ · Voiture utilitaire d'Anas + voiture personnelle",
        },
        psycho: {
          probleme:
            "Ils paient 1 050€/mois en loyer depuis 6 ans (= 75 600€ partis en fumée). Tous leurs amis non-pratiquants ont acheté avec un crédit classique et ils sentent le décalage. Le père de Mounia leur dit régulièrement 'prenez un crédit comme tout le monde, on ne va pas se priver toute la vie'.",
          objectifs:
            "Acheter une maison T4 cash dans 24-36 mois (objectif 240 000€), élever leur 2ème enfant dans leur propre maison, prouver à leur famille que c'est possible, donner l'exemple à leurs enfants.",
          consequences:
            "Si rien ne change : 10 ans de loyer en plus = 126 000€ envolés. Cèdent à un crédit classique sous pression familiale et perdent leur conviction profonde. OU restent locataires et regrettent toute leur vie de ne pas avoir su comment faire.",
          passe:
            "Ont consulté un courtier (qui leur a dit 'l'achat halal n'existe pas en France'). Ont essayé d'épargner sans plan (épargne irrégulière, surconsommation). Ont écouté quelques podcasts mais pas d'action concrète.",
          sentiment:
            "Pression. Doute. Frustration de voir le temps passer. Fierté blessée par les remarques de la famille. Soif de cohérence entre leur foi et leur vie quotidienne.",
          paradis:
            "Recevoir leur famille dans LEUR maison cash, regarder leur enfant courir dans LEUR jardin, savoir qu'ils n'ont pas dévié, transmettre cette discipline à leurs enfants.",
          phrase_avatar:
            "Je veux construire un patrimoine sans dévier de mes principes, et prouver que c'est possible.",
        },
      },
      validation: {
        demande_q1:
          "Article 'Comment j'ai acheté ma RP cash sans crédit en 6 ans' : 18 200 vues sur Medium, 460 partages. 220 demandes d'accompagnement reçues en 4 mois.",
        demande_q2:
          "Recherches Google : 'achat immobilier halal', 'crédit sans riba', 'investissement halal France' = 22 100 recherches/mois. Croissance +110% en 3 ans.",
        concurrence_q1:
          "Concurrents : Easy Halal, Albaraka Avenir, quelques coachs immo halal. Mes différenciants : focus RP (pas locatif spéculatif), méthode cash sans produit financier intermédiaire, accompagnement humain personnalisé.",
        concurrence_q2:
          "Edge : je suis le résultat de ma méthode (RP cash à 38 ans). Pas un théoricien. Mes accompagnés voient un homme qui a fait ce qu'il enseigne.",
        perennite_q1:
          "Marché en croissance massive. Aucun acteur ne dépasse 5% de part de marché. La demande explose chaque année.",
        perennite_q2:
          "Risque régulation : faible (rien d'illégal dans les méthodes). Risque économique : sérieux (récession peut ralentir l'épargne) mais structurellement solide. Risque IA : nul.",
        perennite_q3:
          "Je peux étendre vers les locatifs halal, l'immobilier au Maroc/Émirats pour expatriés, ou la transmission patrimoniale islamique.",
        alignement_q1:
          "Cette mission renforce mon âme : aider des couples à rester droits face à la pression. C'est de l'action concrète au service du deen.",
        alignement_q2:
          "14 couples sont devenus propriétaires sans riba. Témoignages vidéo + actes notariés (avec leur accord). Aucune plainte ni dérapage.",
        alignement_q3:
          "Si demain les revenus chutent, ce travail garde son sens : aider la communauté à ne pas tomber dans le riba. Je continuerai même bénévolement.",
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
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour préparer les sœurs musulmanes 25-35 au mariage halal : cadre émotionnel, critères, gestion des entretiens, premières années",
        vecu:
          "Mariée depuis 6 ans après une recherche structurée de 18 mois. Accompagnatrice depuis 3 ans pour préparation au mariage halal. 47 sœurs accompagnées, 31 mariées (66%) en moins de 14 mois après le programme.",
        pourquoi:
          "Parce que des dizaines de milliers de soeurs musulmanes 25-35 vivent l'angoisse du célibat prolongé sans cadre. Ni la famille, ni les imams, ni les apps n'offrent un parcours structuré. Le résultat : choix précipités, mariages bancaux, ou célibat qui s'éternise.",
      },
      stress_test: {
        lives_from_skill:
          "Mariée depuis 6 ans, alhamdoulilah. 47 accompagnées sur 3 ans. Programmes vendus 1 800€-3 500€. Témoignages publics + privés.",
        three_people:
          "1. Khadija, 30 ans, prof de français en collège, 2 100€/mois, célibataire avec 4 ruptures de fiançailles, parents qui pressent.\n2. Layla, 27 ans, ingénieure infor, 2 800€/mois, célibataire jamais fiancée, mère qui menace de la marier au bled.\n3. Sumeya, 32 ans, kiné libérale, 3 200€/mois, divorcée 1 enfant, peur de rester seule.",
        revenue_proof:
          "Programmes mariage halal vendus 1 800€-4 000€ par 6 coachs francophones. Communauté de soeurs très active. Demande largement supérieure à l'offre qualitative.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Soeurs musulmanes pratiquantes 25-35 ans, célibataires ou divorcées sans enfant, actives professionnellement (revenus 2 000€-3 500€/mois), idéalement urbaines, avec famille qui exerce une pression matrimoniale",
        douleur:
          "Vivre la pression sociale et familiale chaque mois (mariages d'amies, remarques en famille), ne pas savoir ce qu'on cherche vraiment chez un mari, multiplier les entretiens infructueux, douter de soi à chaque rupture, sentir la peur de 'rater le bon moment'",
        pouvoir_achat:
          "Programmes 1 800€-4 000€ vendus régulièrement (Sister's Circle, coachings de soeurs reconnues). Public féminin avec emploi stable, prêt à investir pour son avenir matrimonial.",
        contact:
          "Instagram (formats Reels + carrousels) + groupes Facebook soeurs musulmanes (forts en France) + sites matrimoniaux halal (partenariats) + ads ciblées femmes 25-35 musulmanes pratiquantes.",
        croissance:
          "Marché matrimoniaux halal en croissance +25%/an. Recherches 'comment trouver un mari musulman', 'mariage halal France' en hausse constante. Multiplication des sites/plateformes matrimoniaux halal depuis 2021.",
        methode:
          "Méthode 4 PHASES : (1) Audit personnel et clarification des critères, (2) Travail sur soi (blessures, attentes, famille), (3) Activation : où chercher, comment qualifier, comment mener un entretien, (4) Pré-mariage et premières années.",
        phrase:
          "J'aide les soeurs musulmanes 25-35 ans à se préparer émotionnellement et pratiquement au mariage halal et à rencontrer un époux compatible en 6 à 14 mois, avec discernement et sérénité.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Khadija", age: "30 ans",
          lieu: "Toulouse",
          revenu: "Prof de français collège · 2 100€ net/mois",
          compagnon: "Célibataire, 4 ruptures de fiançailles entre 24 et 30 ans",
          relations:
            "Vit en location seule (T2). Parents au bled depuis 5 ans. 2 frères mariés. Soeurs et amies en majorité mariées ou en couple.",
          situation: "Stable financièrement, épargne 12 000€, voiture, autonome. Prière 5 fois/jour, hijab, jeûne ramadan.",
        },
        psycho: {
          probleme:
            "Chaque mariage de copine est un coup de poignard. Ses parents lui parlent peu mais elle sent leur déception. Ses 4 ruptures l'ont rendue méfiante : elle ne sait plus si c'est elle, eux, ou si elle est trop exigeante. Elle se sent 'sur la pile des invendues'.",
          objectifs:
            "Se marier dans 12 mois inshaAllah avec un homme aligné (foi, projet, caractère), construire un foyer, avoir des enfants avant 35 ans.",
          consequences:
            "Si rien ne change : 5 ans de plus passent, l'horloge biologique stresse, elle finit par accepter quelqu'un par défaut ou reste seule. Sa foi vacille parce qu'elle 'ne comprend pas pourquoi Allah ne l'aide pas'.",
          passe:
            "Apps de mariage halal (3 mois sur Inchallah, 0 résultat sérieux). Une matchmaker traditionnelle (présentations à 5 hommes, aucun aligné). Un coaching de séduction généraliste (700€, contre-productif pour elle).",
          sentiment:
            "Honte cachée. Solitude qui pèse plus chaque année. Doute permanent ('est-ce que je suis le problème ?'). Pression invisible mais constante.",
          paradis:
            "Rentrer chez elle le soir vers un mari aligné, fonder une famille, transmettre sa foi à ses enfants, sentir que son père est fier, ne plus avoir cette boule au ventre lors des mariages.",
          phrase_avatar:
            "Je veux me marier avec discernement et sérénité, pas par défaut ni par épuisement.",
        },
      },
      validation: {
        demande_q1:
          "Reels Instagram 'les 5 erreurs des soeurs en recherche de mari' : 380 000 vues, 1 200 commentaires en 7 jours. Lead magnet : 2 100 téléchargements en 14 jours.",
        demande_q2:
          "Recherches Google : 'mariage halal', 'préparer mariage islam', 'rencontre halal' = 18 600 recherches/mois. Communauté Instagram soeurs musulmanes : >500K abonnées cumulées.",
        concurrence_q1:
          "Concurrents : Sister's Circle, plusieurs coachs (Asma Lamrabet, Najwa, etc.). Mes différenciants : méthode structurée en 4 phases + suivi long (6 mois post-mariage), focus sur le discernement plutôt que la 'séduction halal'.",
        concurrence_q2:
          "Edge : je suis mariée depuis 6 ans (pas une 'coach célibataire'), j'ai vécu 18 mois de recherche structurée, mes soeurs accompagnées s'identifient à mon parcours.",
        perennite_q1: "Marché stable et en croissance avec la conscience religieuse des 25-35. Pas de saturation visible.",
        perennite_q2: "Risque IA : nul (sujet profondément humain). Risque mode : nul (le mariage est une institution). Risque saturation : faible.",
        perennite_q3: "Je peux étendre vers le coaching de jeunes mariées (1ère année), la prévention du divorce, ou les coachings de couples.",
        alignement_q1: "Mission au coeur du deen : préserver l'institution du mariage, aider des soeurs à fonder des foyers droits. C'est de l'akhira investi.",
        alignement_q2: "31 soeurs sur 47 mariées en moins de 14 mois. Témoignages vidéo + photos de mariage avec accord. Aucune plainte. Plusieurs grossesses heureuses.",
        alignement_q3: "Si demain je gagne moins, je continuerai bénévolement les cas précaires. Le revenu est un moyen, pas la finalité.",
      },
    },
  },
  {
    key: "relations_couple_post_bebe",
    label: "Couples musulmans après l'arrivée des enfants",
    market: "Relations",
    icon: "👨‍👩‍👧",
    summary:
      "Couples musulmans 30-40 ans qui veulent retrouver leur connexion conjugale après l'arrivée d'enfants.",
    patch: {
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour aider les couples musulmans à retrouver leur connexion conjugale et leur intimité après l'arrivée des enfants",
        vecu:
          "Mariée depuis 11 ans, 3 enfants. Suis passée par 18 mois très durs après mon 2ème enfant (lui distant, moi épuisée, sentiment qu'on était devenu colocataires). Reconstruit avec mon mari via une méthode que j'ai documentée. Accompagne des couples depuis 4 ans, 28 couples passés, dont 26 ont retrouvé une intimité saine.",
        pourquoi:
          "Parce que personne n'en parle. Les imams disent 'sois patiente'. Les psy occidentaux ignorent le cadre islamique. Et les couples musulmans s'éloignent silencieusement, parfois jusqu'au divorce, sans avoir compris ce qui se passait.",
      },
      stress_test: {
        lives_from_skill:
          "Mariée 11 ans, 3 enfants. Mon couple est public (livre publié, podcast). 28 couples accompagnés sur 4 ans. Programmes 1 800€-3 500€ avec ratio retours qualitatifs >90%.",
        three_people:
          "1. Aïcha (33) et Tarek (37), mariés 9 ans, 3 enfants (8/5/2 ans), n'ont plus eu de relations intimes depuis 4 mois, parlent à peine en dehors de la logistique.\n2. Meryem (35) et Brahim (40), mariés 12 ans, 4 enfants, dorment dans des chambres séparées depuis 1 an 'à cause des enfants'.\n3. Lina (31) et Hicham (33), mariés 6 ans, 2 enfants (4 et 1 an), elle déprime post-partum, lui ne sait pas comment réagir.",
        revenue_proof:
          "Programmes couple musulman vendus 1 800€-4 000€ par 4 acteurs. Marché niche mais à très haute valeur (cible mariée stable, revenu combiné solide).",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Couples musulmans pratiquants mariés depuis 5-15 ans, parents de 2 à 4 enfants, revenus combinés 4 000€-7 000€/mois, dont l'intimité conjugale (émotionnelle ET physique) s'est considérablement érodée depuis l'arrivée du 2ème enfant",
        douleur:
          "Vivre comme deux colocataires polis qui gèrent une logistique familiale, ne plus se voir vraiment, ne plus se toucher, sentir que l'amour s'évapore mais ne pas oser en parler, avoir peur du divorce sans savoir comment éviter le naufrage, culpabiliser religieusement",
        pouvoir_achat:
          "Programmes 1 800€-4 000€ vendus régulièrement. Cible âgée et stable financièrement. Forte volonté de payer pour 'sauver le couple' quand le déclic se fait.",
        contact:
          "Instagram couple (reels intimes mais halal) + podcasts musulmans francophones (audience cible) + ads Facebook ciblées couples mariés 30-45 parents + collaborations avec coachs spirituels reconnus.",
        croissance:
          "Marché coaching couple en croissance +20%/an en général, et niche couple musulman/halal en explosion (+40%/an estimé). Le tabou se lève progressivement, la demande émerge fortement.",
        methode:
          "Méthode 3 NIVEAUX : (1) Diagnostic individuel + couple, (2) Reconstruction émotionnelle + communication, (3) Reconstruction de l'intimité (cadre halal, sans tabou). Suivi 6 mois.",
        phrase:
          "J'aide les couples musulmans mariés 5-15 ans avec enfants à retrouver leur connexion émotionnelle et leur intimité conjugale en 6 mois, avec un cadre 100% islamique et zéro tabou.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme et Homme", nom: "Aïcha & Tarek", age: "33 et 37 ans",
          lieu: "Bordeaux",
          revenu: "Tarek : ingénieur 3 800€/mois · Aïcha : sage-femme 2 600€/mois (temps partiel)",
          compagnon: "Mariés depuis 9 ans, 3 enfants (8 ans, 5 ans, 2 ans)",
          relations:
            "Famille élargie présente mais peu confidente sur ces sujets. Quelques amis couples mais personne avec qui parler intimement de ces choses.",
          situation: "Propriétaires d'une maison T4. Vie matériellement stable. Mais émotionnellement à bout de souffle.",
        },
        psycho: {
          probleme:
            "Ils s'aimaient. Sincèrement. Mais 8 ans plus tard et 3 enfants après, ils se croisent, se parlent à peine, n'ont pas eu de relations intimes depuis 4 mois. Aïcha pleure parfois sous la douche. Tarek se réfugie dans le travail. Ils sentent que ça va craquer mais ne savent pas comment ouvrir le sujet.",
          objectifs:
            "Retrouver leur complicité d'avant, redevenir un couple et pas seulement des parents, avoir à nouveau une vie intime sereine, transmettre à leurs enfants l'image d'un couple uni.",
          consequences:
            "Si rien ne change : Aïcha demande le divorce dans 18-24 mois épuisée par la solitude. Ou ils restent mariés mais 'morts' affectivement, et leurs enfants grandissent dans un climat froid qu'ils reproduiront.",
          passe:
            "Ont essayé une thérapie de couple non-musulmane (3 séances, ont arrêté car le thérapeute ne comprenait pas leur cadre). Ont lu un livre 'islam et couple' générique sans application concrète.",
          sentiment:
            "Aïcha : épuisement, solitude, peur. Tarek : impuissance, fuite, culpabilité sourde. Tous deux : nostalgie d'avant.",
          paradis:
            "Se retrouver le soir une fois les enfants couchés, parler vraiment, rire ensemble, redevenir des amants au cadre halal, élever leurs enfants dans un foyer où l'amour entre les parents se voit.",
          phrase_avatar:
            "Je veux retrouver mon époux/épouse, pas juste co-parenter avec lui/elle.",
        },
      },
      validation: {
        demande_q1:
          "Podcast 'Quand le couple meurt en silence' : 240 000 écoutes en 3 mois. 850 messages reçus de couples qui se reconnaissent.",
        demande_q2:
          "Recherches Google : 'couple musulman conseils', 'sauver mon mariage islam', 'intimité couple islam' = 8 200 recherches/mois. Sujet sous-traité dans la communauté.",
        concurrence_q1:
          "Concurrents : 4 acteurs identifiés. Différenciant : approche holistique (émotionnel + physique + spirituel) avec absence de tabou dans le cadre halal.",
        concurrence_q2:
          "Edge : je suis passée par cette traversée moi-même, je documente publiquement (livre, podcast). Crédibilité incarnée.",
        perennite_q1: "Marché stable. Ce problème ne disparaîtra pas — il est même renforcé par les pressions modernes.",
        perennite_q2: "Risque mode : nul. Risque saturation : faible.",
        perennite_q3: "Extension possible : couples avant mariage, prévention divorce, couples post-divorce qui se remarient.",
        alignement_q1: "Préserver des foyers, c'est préserver la oumma. Aucune autre mission n'a autant de sens à mes yeux.",
        alignement_q2: "26 couples sur 28 ont retrouvé une intimité saine. Témoignages écrits (anonymes ou non). Plusieurs grossesses qui ont suivi.",
        alignement_q3: "Si je gagnais 0€, je continuerais quand même. Cette mission m'a sauvée moi-même.",
      },
    },
  },
  {
    key: "relations_education_positive",
    label: "Éducation positive pour mamans musulmanes",
    market: "Relations",
    icon: "👩‍👧‍👦",
    summary:
      "Mamans musulmanes débordées qui veulent éduquer sans crier ni frapper, en alignement avec la sunnah.",
    patch: {
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour aider les mamans musulmanes 28-40 (3+ enfants) à éduquer sans crier ni frapper, en alignement avec la sunnah",
        vecu:
          "Maman de 4 enfants, ai été cette mère qui criait. Formée en éducation positive (Faber & Mazlish, Filliozat) pendant 4 ans, puis croisé avec la pédagogie prophétique. Accompagne des mamans depuis 5 ans, 62 accompagnées, 54 ont arrêté de crier en moins de 90 jours selon leurs propres déclarations.",
        pourquoi:
          "Parce que la maternité dans la communauté musulmane est souvent solitaire. Les mamans gèrent 3-5 enfants avec peu de soutien, dans un cadre culturel où crier/frapper est toléré, et n'ont pas d'outils. Elles culpabilisent toutes en silence.",
      },
      stress_test: {
        lives_from_skill:
          "Mère de 4 enfants (12, 9, 6, 3 ans). Programmes 'Mama Sereine' vendus 1 200€-2 400€ depuis 3 ans. 62 mamans accompagnées. Témoignages + before/after vidéo (avec accord).",
        three_people:
          "1. Najet, 35 ans, maman au foyer, 3 enfants (7/5/2), mari très peu présent, crie 5+ fois/jour et culpabilise.\n2. Yasmina, 31 ans, infirmière 30h/sem, 4 enfants (10/8/5/1), épuisée, gifles données 'sans pouvoir s'en empêcher'.\n3. Sarah, 28 ans, en reconversion pro, 2 enfants en bas âge + 1 grossesse, crie de plus en plus et le vit mal.",
        revenue_proof:
          "Programmes éducation positive vendus 800€-2 500€ par 12 coachs francophones (Filliozat, Tribu Bonheur, etc.). Niche musulmane spécifique : 4 acteurs identifiés. Demande croissante.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Mamans musulmanes pratiquantes 28-40 ans, 3 enfants ou plus dont au moins 1 < 7 ans, débordées au quotidien, qui crient ou frappent et le vivent mal, avec un budget formation 1 000€-2 500€",
        douleur:
          "Crier sur ses enfants tous les jours, parfois donner une gifle, voir le regard de l'enfant changer, faire des doua de pardon le soir en pleurant en silence, redouter la prochaine crise, se sentir indigne de la oumma de Khadija et Aicha",
        pouvoir_achat:
          "Programmes 1 200€-2 400€ vendus régulièrement. Cible féminine avec mari pourvoyeur ou revenu propre, motivée par la culpabilité spirituelle ET maternelle.",
        contact:
          "Instagram + reels/TikTok maman musulmane (audiences naturelles énormes) + groupes Facebook 'mamans musulmanes France' + ads ciblées femmes 28-40 mères + collaborations avec coachs parentalité positive musulmane.",
        croissance:
          "Recherches Google 'arrêter de crier sur mes enfants', 'éducation positive islam', 'maman débordée musulmane' : 24 700/mois, croissance constante. Éducation parentale en croissance +30%/an en général.",
        methode:
          "Méthode 3 PILIERS : (1) Régulation émotionnelle de la mère (sommeil, charge mentale, prière), (2) Outils concrets en situation (5 phrases anti-cri, gestion des crises), (3) Rituels prophétiques au quotidien. Suivi 90 jours.",
        phrase:
          "J'aide les mamans musulmanes 28-40 à arrêter de crier sur leurs enfants en 90 jours, en combinant éducation positive et pédagogie prophétique, sans culpabilité.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Najet", age: "35 ans",
          lieu: "Banlieue lyonnaise",
          revenu: "Mère au foyer · revenu mari : commerçant 3 200€/mois variable",
          compagnon: "Mariée depuis 11 ans, 3 enfants (7, 5, 2 ans), mari présent physiquement mais peu impliqué dans l'éducation",
          relations: "Belle-famille proche mais critique. Sa mère au bled. 2 amies copines de mosquée mais peu intimes sur ces sujets.",
          situation: "Locataire T4, 0€ d'épargne propre, gère 80% du quotidien des enfants seule, voile, prière 5/5.",
        },
        psycho: {
          probleme:
            "Najet adore ses enfants. Mais à 18h elle est à bout, son grand fait des crises, le bébé pleure, le moyen ne lui parle plus que pour réclamer. Elle hurle. Parfois elle gifle. Le soir elle pleure dans son tapis de prière en demandant pardon, mais le lendemain ça recommence.",
          objectifs:
            "Arrêter de crier sous 3 mois inshaAllah. Retrouver la sérénité dans son foyer. Que ses enfants gardent une bonne image d'elle. Mériter le doua qu'ils feront pour elle après sa mort.",
          consequences:
            "Si rien ne change : son fils aîné de 7 ans commence déjà à reproduire ses cris sur sa soeur. Dans 10 ans, ses enfants reproduiront le schéma. Sa relation au deen vacille parce qu'elle 'ne se reconnaît pas' dans la mère qu'elle est devenue.",
          passe:
            "Lu 2 livres d'éducation positive (a essayé 1 semaine puis abandonné par épuisement). Suivi des comptes Instagram qui culpabilisent plus qu'ils n'aident. Crié sur sa mère qui critiquait sa façon d'élever, puis pleuré.",
          sentiment:
            "Culpabilité écrasante quotidienne. Solitude. Épuisement physique et émotionnel. Doute spirituel ('Allah est-il content de moi avec ces enfants ?').",
          paradis:
            "Vivre une journée entière sans crier. Voir ses enfants grandir avec confiance. Que son aîné lui dise 'maman tu es la meilleure'. Faire la prière du matin sereine, sans regret de la veille.",
          phrase_avatar:
            "Je veux être la mère que mes enfants méritent et que ma religion me demande d'être.",
        },
      },
      validation: {
        demande_q1:
          "Reel Instagram 'Comment j'ai arrêté de crier sur mes enfants en 30 jours' : 1,2M vues, 6 800 commentaires de mamans qui s'identifient. Lead magnet : 4 200 téléchargements en 1 semaine.",
        demande_q2:
          "Recherches Google : 'arrêter de crier sur mes enfants', 'éducation positive islam', 'maman débordée musulmane' = 24 700 recherches/mois. Croissance constante.",
        concurrence_q1:
          "Concurrents : 4 acteurs musulmans + dizaines de coachs généralistes. Différenciant : combinaison éducation positive scientifique + pédagogie prophétique authentifiée.",
        concurrence_q2: "Edge : maman de 4, j'ai été cette mère, mes outils sont testés en feu réel, pas en théorie.",
        perennite_q1: "Marché en explosion. Conscience parentale croît chaque année dans la communauté.",
        perennite_q2: "Risque IA : faible. Risque saturation : faible vu l'ampleur du marché potentiel.",
        perennite_q3: "Extensions : éducation enfants 7-15 ans, maternité spirituelle, papas musulmans.",
        alignement_q1: "C'est la mission qui me parle le plus profondément. Je vois Allah à travers les sourires retrouvés des mamans et de leurs enfants.",
        alignement_q2: "54 mamans sur 62 ont arrêté de crier (selon leurs auto-déclarations + témoignages mari). Aucune plainte en 5 ans.",
        alignement_q3: "Si je gagnais 0€, je continuerais. Cette mission m'apporte plus que de l'argent : du sens.",
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
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour aider les mamans musulmanes 30-45 à perdre 10-15 kg en 4-6 mois sans privation, sans salle, en mangeant halal et avec sport à domicile",
        vecu:
          "Maman de 3 enfants, ai pris 22 kg sur 2 grossesses. Perdu 18 kg en 7 mois en 2022 avec une méthode que j'ai documentée. Accompagne des mamans depuis 2,5 ans, 84 accompagnées, perte moyenne : 9,4 kg en 5 mois sans salle ni régime restrictif.",
        pourquoi:
          "Parce que les mamans musulmanes ont des contraintes spécifiques : pas de mixité en salle, pas de temps, repas familiaux halal à préparer, ramadan à gérer, hijab qui bloque certains sports. Aucun programme grand public n'intègre ces réalités.",
      },
      stress_test: {
        lives_from_skill:
          "Perdu 18 kg en 7 mois, photos before/after publiques. 84 mamans accompagnées sur 2,5 ans. Programmes vendus 1 200€-2 800€. Témoignages + photos.",
        three_people:
          "1. Salima, 38 ans, prof EPS reconvertie au foyer, 3 enfants, 78 kg pour 1m65, ne se reconnaît plus dans son corps.\n2. Karima, 34 ans, comptable, 2 enfants, 92 kg pour 1m70, début de pré-diabète.\n3. Houria, 41 ans, mère au foyer, 4 enfants, 84 kg pour 1m62, douleurs articulaires permanentes.",
        revenue_proof:
          "Programmes perte de poids spécifique mamans musulmanes : 5 acteurs identifiés à 1 000€-3 500€. Marché en forte croissance. Public féminin cible avec budget formation alloué.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Mamans musulmanes pratiquantes 30-45 ans, 2 enfants ou plus, 10-25 kg de surpoids, mariées (revenu mari ou revenu mixte 3 500€-6 000€/mois combinés), avec contraintes religieuses (mixité, hijab, ramadan)",
        douleur:
          "Ne plus se reconnaître dans le miroir, éviter les photos, craquer sur les fonds de plats des enfants, sentir le mari devenir distant, ne plus avoir d'énergie pour ses enfants, voir le pré-diabète arriver, sentir que la prière elle-même devient pénible",
        pouvoir_achat:
          "Programmes 1 200€-2 800€ vendus régulièrement. Mamans avec mari pourvoyeur ou propre revenu, motivées par la santé ET le couple ET l'image de soi.",
        contact:
          "Instagram + reels TikTok (transformations fitness féminin halal) + ads ciblées femmes 30-45 musulmanes + groupes Facebook 'sport femme hijab' + collaborations coachs fitness halal reconnues.",
        croissance:
          "Recherches Google 'maigrir maman', 'perte poids hijab', 'sport à la maison femme musulmane' : 34 000/mois, croissance forte. Fitness féminin musulman en explosion (+40%/an avec démocratisation hijab sport).",
        methode:
          "Méthode 4 PILIERS halal : (1) Alimentation halal sans privation (recettes familiales), (2) Sport à domicile 25 min/jour adaptable hijab, (3) Gestion ramadan (sans rebond), (4) Mindset (mère + identité). Suivi 6 mois.",
        phrase:
          "J'aide les mamans musulmanes 30-45 à perdre 10-15 kg en 5-6 mois, sans salle de sport mixte, sans privation et avec une cuisine halal familiale, en 25 min/jour.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Salima", age: "38 ans",
          lieu: "Région nantaise",
          revenu: "Ex-prof EPS au foyer · mari ingénieur 4 200€/mois",
          compagnon: "Mariée depuis 13 ans, 3 enfants (10, 7, 4 ans)",
          relations: "Vit dans une maison à elle, peu d'amies proches après la maternité, sa mère habite à 200 km",
          situation: "78 kg pour 1m65 (+22 kg post-grossesses), portait du 36 avant, porte du 44 maintenant, hijab depuis le mariage.",
        },
        psycho: {
          probleme:
            "Salima était sportive (prof EPS quand même). Aujourd'hui elle n'arrive plus à monter ses escaliers sans souffler. Elle achète des vêtements en ligne pour cacher (les magasins en hijab + cabines = traumatisme). Son mari ne dit rien mais elle sent. Elle pleure parfois en se douchant.",
          objectifs:
            "Perdre 12-15 kg en 6 mois inshaAllah. Retrouver son ancien corps avant 40 ans. Pouvoir jouer au foot avec ses fils. Être la femme dont son mari sera toujours fier.",
          consequences:
            "Si rien ne change : 5 kg de plus chaque grossesse à venir, pré-diabète à 42 ans, fatigue chronique, distance avec son mari, et un message envoyé à ses enfants ('on s'abandonne après les enfants').",
          passe:
            "Régime Dukan en 2018 (perdu 6 kg, repris 9). WW en 2020 (3 mois, perdu 4 kg, démissionné). Salle de sport mixte 1 an d'abonnement non utilisé. Coaching généraliste à 600€ : abandonné après 3 semaines.",
          sentiment:
            "Honte. Tristesse. Colère contre elle-même. Évitement (miroirs, photos, plages). Découragement spirituel parfois ('Allah accepte-t-il ma prière dans ce corps ?').",
          paradis:
            "Mettre une robe ajustée halal et se sentir belle pour son mari, courir avec ses enfants au parc, monter les escaliers sans souffler, retrouver l'énergie de ses 25 ans, être l'exemple pour ses filles.",
          phrase_avatar:
            "Je veux retrouver mon corps et mon énergie sans choisir entre ma religion, mes enfants et moi.",
        },
      },
      validation: {
        demande_q1: "Compte Instagram 'maman halal & santé' : 47K abonnées en 14 mois sans pub. Lead magnet 'recettes minceur halal famille' : 5 800 téléchargements en 3 semaines.",
        demande_q2: "Recherches Google : 'maigrir maman', 'perte poids hijab', 'sport à la maison femme musulmane' = 34 000 recherches/mois. Croissance forte.",
        concurrence_q1: "Concurrents : 5 acteurs identifiés. Mes différenciants : mère de 3, méthode 4 piliers spécifique mamans, prise en compte du ramadan + de l'hijab + des repas familiaux.",
        concurrence_q2: "Edge : ma transformation visible, ma vie qui ressemble à la leur, mes outils testés en feu réel.",
        perennite_q1: "Marché énorme et stable. Sous-segment musulman en explosion avec la conscience santé/déen.",
        perennite_q2: "Risque mode : faible (la santé reste). Risque IA : moyen mais l'humain reste central pour la motivation.",
        perennite_q3: "Extensions : remise en forme post-50 ans, préparation grossesse, post-partum.",
        alignement_q1: "Mission spirituelle : 'votre corps est un dépôt'. Aider mes soeurs à honorer ce dépôt c'est de l'ibada.",
        alignement_q2: "84 mamans accompagnées, perte moyenne 9,4 kg, 0 reprise sur les cas suivis 12+ mois. Photos témoignages.",
        alignement_q3: "Si je gagnais 0€, je continuerais avec un format gratuit. Cette mission est trop importante pour moi.",
      },
    },
  },
  {
    key: "sante_reprise_sport_hommes",
    label: "Reprise sportive pour hommes musulmans 35-50",
    market: "Santé",
    icon: "💪",
    summary:
      "Hommes musulmans 35-50 ans qui veulent reprendre le sport en gérant prière, ramadan et contraintes pro.",
    patch: {
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour aider les hommes musulmans 35-50 ans (sédentaires, 8-15 kg en trop) à reprendre une vie sportive durable en gérant prière, ramadan, vie de famille et travail",
        vecu:
          "À 41 ans, ex-rugbyman amateur reconverti dev, 18 kg pris en 8 ans de bureau. Repris en 2022 selon une méthode que j'ai documentée. Accompagne des frères depuis 2 ans, 47 hommes accompagnés, 39 ont retrouvé une routine sportive durable et perdu en moyenne 11 kg.",
        pourquoi:
          "Parce que les hommes musulmans 35-50 sont la population la moins ciblée par le marché du sport. Ils ont des contraintes spécifiques (5 prières, ramadan, vie de famille avec 3+ enfants, vies pros denses) et ne se retrouvent dans aucune offre généraliste.",
      },
      stress_test: {
        lives_from_skill:
          "Repris à 41 ans, perdu 16 kg en 9 mois, marathon couru à 42 ans. 47 hommes accompagnés sur 2 ans. Programmes 1 500€-3 000€. Photos before/after + témoignages.",
        three_people:
          "1. Mehdi, 39 ans, ingénieur, 92 kg pour 1m74, 4 enfants, sédentaire depuis 6 ans, fatigue chronique.\n2. Karim, 44 ans, commerçant, 98 kg pour 1m78, 3 enfants, mal de dos chronique, début de cholestérol.\n3. Saïd, 47 ans, prof, 88 kg pour 1m72, 5 enfants, 0 sport depuis 15 ans, hypertension.",
        revenue_proof:
          "Programmes coaching sport/santé hommes vendus 1 200€-3 500€ par 8 coachs francophones. Sous-segment musulman : 3 acteurs identifiés. Marché à fort potentiel.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Hommes musulmans pratiquants 35-50 ans, sédentaires depuis 5+ ans, 8-20 kg de surpoids, pères de 2 à 5 enfants, salariés ou indépendants 35-55h/sem, revenus 2 500€-5 000€/mois",
        douleur:
          "Voir son corps lâcher (mal de dos, essoufflement, prises de sang qui se dégradent), avoir 'vieilli' à 40 ans, ne plus pouvoir jouer au foot avec ses enfants, sentir que sa femme remarque, redouter de devenir 'le tonton bedonnant' avant 45 ans",
        pouvoir_achat:
          "Programmes 1 500€-3 000€ vendus régulièrement à cette cible. Hommes mariés stables financièrement, motivés par la santé + l'image + l'exemple aux enfants.",
        contact:
          "YouTube (contenu fitness long format performe pour hommes 35+) + Instagram + ads Facebook ciblées hommes 35-50 musulmans + podcasts masculins musulmans + collaborations avec coachs fitness reconnus.",
        croissance:
          "Fitness hommes 35+ en croissance soutenue (+25%/an). Niche fitness musulman/halal en explosion : la prise de conscience santé chez les pères de famille musulmans est récente et forte. Démocratisation salles 100% hommes ou domicile.",
        methode:
          "Méthode 4 PILIERS musulmans : (1) Sport adapté 30 min × 4/sem (compatible prière), (2) Alimentation halal pratique (sans préparer 2 repas), (3) Gestion ramadan (entretien + reprise progressive), (4) Mental + tawakkul. Suivi 6 mois.",
        phrase:
          "J'aide les hommes musulmans 35-50 à reprendre le sport durablement et perdre 8-15 kg en 6 mois, en respectant leurs 5 prières, le ramadan et leur vie de père et d'époux.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Homme", nom: "Mehdi", age: "39 ans",
          lieu: "Toulouse",
          revenu: "Ingénieur informatique 3 600€/mois",
          compagnon: "Marié depuis 14 ans, 4 enfants (12, 9, 6, 3 ans)",
          relations: "Famille proche, plusieurs amis musulmans dans la même tranche d'âge tous dans le même état physique",
          situation:
            "Propriétaire maison T5, sédentaire depuis l'arrivée du 2ème enfant, dernière activité physique = foot du dimanche abandonné en 2018.",
        },
        psycho: {
          probleme:
            "Mehdi pesait 74 kg à son mariage. Il pèse 92 aujourd'hui, à 39 ans. Il s'essouffle en jouant au foot 5 minutes avec ses fils. Sa femme ne dit rien mais il voit son regard sur les photos de mariage. Sa dernière prise de sang : cholestérol limite, début de glycémie suspecte. Il sait qu'il faut bouger mais 'il n'a pas le temps'.",
          objectifs:
            "Reprendre une routine sportive durable. Perdre 12-15 kg en 6-9 mois. Retrouver l'énergie pour ses enfants. Atteindre 40 ans en meilleure forme qu'à 39. Être un modèle pour ses fils.",
          consequences:
            "Si rien ne change : il atteint 100 kg à 42 ans, infarctus possible à 50 ans (son père a fait le sien à 53). Ses enfants reproduisent son schéma sédentaire. Il ne joue jamais au foot avec ses petits-enfants.",
          passe:
            "Abonnement salle de sport 2 ans non utilisé (8€/mois × 24 = 192€ jetés). 1 mois de tapis de course Decathlon abandonné. Régime cétogène 3 semaines (a craqué au repas familial). Ramadan 2024 : pris 4 kg à cause du rebond aux iftars.",
          sentiment:
            "Frustration. Honte douce. Sentiment d'avoir 'vieilli sans s'en rendre compte'. Anxiété santé latente. Honte de ne pas pouvoir tenir un sprint avec ses fils.",
          paradis:
            "Reprendre le foot avec les frères tous les vendredis, courir 10 km en 50 min, peser 78 kg à 42 ans, voir ses enfants sportifs grâce à son exemple, attendre 50 ans en meilleure forme qu'à 40.",
          phrase_avatar:
            "Je veux reprendre mon corps en main avant qu'il ne soit trop tard, sans sacrifier mon temps de famille ni ma religion.",
        },
      },
      validation: {
        demande_q1: "Article 'Comment j'ai repris à 41 ans en respectant mes 5 prières' : 28 000 vues, 320 demandes de programme. Stories Instagram 'sport homme musulman' = 18% de taux d'engagement.",
        demande_q2: "Recherches Google : 'reprendre le sport 40 ans', 'perte poids homme', 'sport musulman' = 31 200 recherches/mois.",
        concurrence_q1: "Concurrents : 3 acteurs musulmans + dizaines généralistes. Mes différenciants : pareil profil que la cible, intégration prière/ramadan, méthode 4 piliers.",
        concurrence_q2: "Edge : père de 4, ingénieur (donc compréhension de leur réalité), repris à 41 ans avec leurs contraintes.",
        perennite_q1: "Marché énorme et stable. Vieillissement de la communauté = clientèle qui grossit chaque année.",
        perennite_q2: "Risque IA : faible. Risque saturation : faible.",
        perennite_q3: "Extensions : préparation au pèlerinage (forme physique), 50-60 ans, accompagnement diabète type 2.",
        alignement_q1: "Le corps est un dépôt. Aider mes frères à honorer ce dépôt c'est de l'ibada concrète.",
        alignement_q2: "39 hommes sur 47 ont une routine durable et perte moyenne 11 kg. Témoignages + suivi 12 mois post-programme.",
        alignement_q3: "Si je gagnais 0€, je continuerais. Voir des frères revivre c'est ma plus belle paie.",
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
      ...COMMON_PATCH,
      capture: {
        idee:
          "Programme pour aider les étudiants musulmans 16-25 ans à gérer leur anxiété (études, avenir, identité) en combinant outils psychologiques et tawakkul",
        vecu:
          "Ai vécu 4 ans d'anxiété sévère pendant ma médecine (panique avant exams, insomnies chroniques). Diagnostic anxiété généralisée. Sortie via TCC + travail spirituel sur le tawakkul. Aujourd'hui psychologue clinicienne formée TCC + EMDR. Accompagne des étudiants musulmans depuis 3 ans, 89 accompagnés.",
        pourquoi:
          "Parce qu'une génération entière d'étudiants musulmans souffre en silence : pression académique, angoisses identitaires (islamophobie, école laïque, milieu pro), peur du futur. Les psy classiques ne comprennent pas le cadre religieux. Les imams ne sont pas formés à la santé mentale.",
      },
      stress_test: {
        lives_from_skill:
          "Psychologue clinicienne (DE), 6 ans d'expérience, formée TCC + EMDR. 89 étudiants musulmans accompagnés sur 3 ans. Programmes 800€-1 800€. Témoignages + suivi.",
        three_people:
          "1. Lina, 19 ans, en L2 médecine, crises de panique avant chaque partiel, parents pression, voile.\n2. Yacine, 22 ans, master ingénieur, paralysie face au mémoire, peur de l'avenir pro en tant que 'jeune musulman'.\n3. Sara, 17 ans, bac S, harcèlement scolaire à cause du voile, anxiété sociale chronique.",
        revenue_proof:
          "Programmes santé mentale spécifiques musulmans : 5 acteurs (Asma Lamrabet, Najwa, etc.) à 600€-2 000€. Forte demande, peu de psys cliniciens dans la niche. Public étudiant payé via parents souvent.",
        verdict: "solide",
      },
      sous_niche_2: {
        cible:
          "Étudiants musulmans pratiquants 16-25 ans (lycée terminale ou supérieur), avec anxiété installée (académique, identitaire, sociale), parents capables de financer 800€-1 800€ ou bourse étudiante avec aide financière",
        douleur:
          "Vivre des crises de panique avant les exams, ne pas dormir pendant des nuits entières, sentir l'islamophobie à l'école/fac sans pouvoir en parler à des parents 'qui en font trop', se sentir trahir sa foi parce qu'on prend des anxiolytiques, se croire 'cassé'",
        pouvoir_achat:
          "Programmes 800€-1 800€ accessibles via parents (qui voient leur enfant souffrir) ou bourses + épargne. Cible mineure ou jeune adulte avec famille soutenante financièrement.",
        contact:
          "TikTok (cible 16-25 ultra-active) + Instagram + ads ciblées 16-25 musulmans + collaborations associations étudiantes musulmanes (universités) + partenariats psys musulmans reconnus.",
        croissance:
          "Marché mental health 18-25 en explosion (+60%/an post-Covid). Niche spécifique 'anxiété + islam' émergente avec très peu d'acteurs sérieux : marché en construction, demande énorme, offre quasi inexistante.",
        methode:
          "Méthode 3 NIVEAUX cliniques : (1) Psychoéducation + outils anxiété (TCC adaptée), (2) Travail des croyances spirituelles (tawakkul authentique vs fataliste), (3) Activation comportementale + suivi 4 mois. Cadre clinique professionnel.",
        phrase:
          "J'aide les étudiants musulmans 16-25 à sortir de leur anxiété en 4-6 mois, en combinant psychologie clinique (TCC) et travail authentique sur le tawakkul, dans un cadre 100% professionnel.",
      },
      avatar: {
        photo_url: "",
        socio: {
          sexe: "Femme", nom: "Lina", age: "19 ans",
          lieu: "Paris",
          revenu: "Étudiante L2 médecine · bourse + aide parents (200€/mois)",
          compagnon: "Célibataire, focus études, voile depuis 16 ans",
          relations: "Vit en colocation. Parents en région parisienne (père chirurgien, mère pharmacienne). 1 frère plus jeune.",
          situation: "Bonne élève (mention bien au bac S), école de médecine prestigieuse, voile, prière 5/5, peu d'amies pratiquantes en fac",
        },
        psycho: {
          probleme:
            "Lina a fait sa première crise de panique 2 mois avant les concours PASS. Depuis, elle revit ça avant chaque partiel. Elle dort 4-5h les nuits d'avant, vomit le matin, ne mange plus 3 jours avant. Ses parents la voient maigrir. Sa mère lui parle de 'tawakkul' comme si c'était une solution magique. Lina a honte d'être 'une mauvaise musulmane qui ne fait pas confiance à Allah'.",
          objectifs:
            "Arrêter les crises de panique avant 6 mois inshaAllah. Dormir 7h les nuits d'examens. Réussir sa P2 sereinement. Comprendre que tawakkul ne veut PAS dire 'ne ressentir aucune anxiété'.",
          consequences:
            "Si rien ne change : redoublement P2, dépression à 21 ans, abandon médecine, crise spirituelle à 22 ans, 10 ans de psy plus tard pour reconstruire. C'est le scénario classique de la cohorte précédente.",
          passe:
            "Vu un psy 'généraliste' à 19 ans : 3 séances, le psy ne comprenait pas pourquoi le voile/prière était central. Anxiolytiques prescrits par le médecin de famille (refusés par culpabilité religieuse). Lectures Quran Q&R sur Reddit (parfois aidant, parfois nocif).",
          sentiment:
            "Peur permanente. Honte (envers ses parents, envers Allah). Solitude. Fatigue chronique. Sentiment d'être 'cassée'.",
          paradis:
            "Aborder un partiel avec un peu de stress sain, dormir la veille, ne plus avoir cette boule au ventre, comprendre que ses crises ne sont pas un manque de foi, devenir médecin sans s'effondrer.",
          phrase_avatar:
            "Je veux guérir mon anxiété sans renier ma foi, et comprendre que mes crises ne sont pas un manque de tawakkul.",
        },
      },
      validation: {
        demande_q1: "Compte Instagram 'psy musulmane' : 73K abonnés en 2 ans. Reels 'tu n'es pas une mauvaise musulmane si tu fais une crise de panique' : 480K vues, 2 800 commentaires.",
        demande_q2: "Recherches Google : 'anxiété musulman', 'crise panique islam', 'santé mentale et déen' = 14 800 recherches/mois. Forte croissance jeune génération.",
        concurrence_q1: "Concurrents : 5 acteurs identifiés. Mes différenciants : psy clinicienne (DE) reconnue, formation TCC + EMDR, méthode 3 niveaux validée scientifiquement et religieusement.",
        concurrence_q2: "Edge : j'ai vécu cette anxiété pendant ma médecine, je suis sortie via la même méthode que j'enseigne, je suis une professionnelle de santé reconnue.",
        perennite_q1: "Santé mentale = mégatendance. Communauté musulmane = sous-soigné historiquement. Demande qui explose chaque année.",
        perennite_q2: "Risque : aucun. Risque IA : nul (les apps ne remplacent pas un psy). Risque régulation : nul (cadre clinique respecté).",
        perennite_q3: "Extensions : adultes 25-40, post-partum, deuil, formation pour autres psys musulmans.",
        alignement_q1: "C'est ma raison d'être. Aider la oumma à sortir de l'ombre de la santé mentale c'est de l'ibada que je vivrai jusqu'à ma mort.",
        alignement_q2: "89 étudiants accompagnés, dont 78 sortis de la phase aiguë sous 4 mois. Suivi clinique professionnel + témoignages avec accord.",
        alignement_q3: "Si je gagnais 0€, je continuerais en cabinet libéral. Cette mission est ma vocation, pas mon business.",
      },
    },
  },
];
