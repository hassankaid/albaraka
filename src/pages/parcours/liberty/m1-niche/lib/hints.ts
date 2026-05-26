/**
 * Dictionnaire d'exemples contextuels affichés dans les hints (?) Sidali V2.
 * 3 exemples par clé : 1 par marché core (argent · santé · relations).
 *
 * Transposition fidèle du `const EXAMPLES = {...}` du HTML standalone (lignes
 * 1967-2198). Permet à l'élève de voir des modèles concrets sans copier-coller.
 */

export interface HintExamples {
  argent: string;
  sante: string;
  relations: string;
}

export const EXAMPLES: Record<string, HintExamples> = {
  // ─── BILAN A1 ─────────────────────────────────────────────────────────
  bilan_vecu: {
    argent:
      "J'ai été commercial 8 ans, viré du jour au lendemain à 38 ans avec 2 enfants. J'ai créé mon activité freelance en 90 jours. Aujourd'hui je facture 4 800€/mois.",
    sante:
      "J'ai fait un burn-out parental après mon 2e enfant. J'ai mis en place une méthode Montessori adaptée maison + cohérence cardiaque. 90 jours pour retrouver l'équilibre.",
    relations:
      "Mon couple était au bord du divorce après 12 ans. On a fait une thérapie + 3 mois de communication non-violente. Aujourd'hui plus solides qu'avant.",
  },
  bilan_competence: {
    argent:
      "Je sais auditer un compte Meta Ads et identifier les 3 leviers qui font passer un ROAS de 1,5 à 4 en 30 jours.",
    sante:
      "Je maîtrise la pédagogie Montessori adaptée au domicile + les protocoles de gestion émotionnelle pour enfants 2-10 ans.",
    relations:
      "Je sais accompagner un couple en crise via la méthode Gottman, identifier les 4 cavaliers de l'apocalypse et reconstruire la connexion en 8 semaines.",
  },

  // ─── BRAINSTORM A2 ────────────────────────────────────────────────────
  brainstorm_niches: {
    argent:
      "Trading crypto · Immobilier locatif · E-commerce dropshipping · Freelance copywriting · Investissement bourse",
    sante:
      "Yoga prénatal · Nutrition cétogène · Sommeil enfant · Course à pied débutant · Méditation pleine conscience",
    relations:
      "Couple recomposé · Parentalité ado · Séduction post-divorce · Communication en entreprise · Amitié adulte",
  },
  brainstorm_competences: {
    argent:
      "Audit publicitaire · Closing par téléphone · Construction de tunnels de vente · Négociation B2B · Analyse financière",
    sante:
      "Méthode Montessori · Pratique du yoga · Cuisine cétogène · Cohérence cardiaque · Massage shiatsu",
    relations:
      "Communication non-violente · Médiation familiale · Coaching de couple · Animation de groupe · Écoute active",
  },
  brainstorm_vecu_long: {
    argent:
      "À 32 ans, en CDI à 2 800€/mois sans perspective. J'ai testé l'immobilier locatif (1 appart à Lille en 2021), puis le freelance copywriting (3 clients en 6 mois). Aujourd'hui je vis du copywriting B2B SaaS, 6 000€/mois. Ce qui a fait basculer : un mentor croisé sur LinkedIn qui m'a forcée à arrêter de me disperser.",
    sante:
      "Burn-out professionnel à 35 ans après la naissance de mon 2e enfant. Hospitalisée 3 jours. J'ai testé : médecin (antidépresseurs refusés), psy (8 mois), retraite vipassana (10 jours), sport (course 4×/sem). Ce qui m'a sauvée : la cohérence cardiaque (3×5 min/j) + une routine de sommeil stricte. 6 mois pour me reconstruire.",
    relations:
      "Divorcée à 36 ans après 9 ans de mariage et 2 enfants. Choc total. J'ai fait une thérapie individuelle (1 an), puis lu Esther Perel et Gottman. Reconstruite, je suis en couple depuis 3 ans, on a une vraie complicité parce que j'ai compris ce que j'avais raté la première fois.",
  },

  // ─── CAPTURE B1 ───────────────────────────────────────────────────────
  capture_idee: {
    argent:
      "Programme pour aider les développeurs senior à passer freelance et atteindre 8 000€/mois en 6 mois.",
    sante:
      "Programme pour aider les femmes en burn-out parental à se reconstruire en 90 jours via la méthode CAR (Cohérence-Ancrage-Routines).",
    relations:
      "Programme pour aider les couples en crise après l'arrivée du 2e enfant à reconstruire leur intimité en 12 semaines.",
  },
  capture_vecu: {
    argent:
      "Je suis freelance dev depuis 6 ans, je facture 750€/jour. J'ai accompagné 14 développeurs en mentoring informel à passer du salariat au freelance — 11 sur 14 facturent maintenant 5 000€+/mois. Le système marche.",
    sante:
      "J'ai vécu 2 burn-out parentaux (après mon 1er et 2e enfant). 3 ans de galère, hospitalisée une fois. J'ai construit ma méthode CAR sur ce que j'ai testé moi-même. J'accompagne des femmes en off depuis 18 mois, 23 femmes \"récupérées\".",
    relations:
      "Avec ma femme, on a failli divorcer après notre 2e enfant en 2019. Thérapie de couple + 8 mois de protocoles Gottman. Aujourd'hui on est plus soudés qu'avant. J'ai aidé 7 couples de notre entourage à passer le cap depuis.",
  },
  capture_pourquoi: {
    argent:
      "Parce que je vois trop de devs talentueux rester en CDI à 45K€ alors qu'ils pourraient être à 100K€ en freelance. Le frein n'est pas la compétence, c'est la peur. Je sais comment la lever, je l'ai fait pour moi et 14 autres.",
    sante:
      "Parce qu'aucune psy ne m'a vraiment aidée pendant mon burn-out, et que les bouquins parlaient à des gens sans enfants. J'ai dû me débrouiller seule. Ces femmes méritent qu'on parle leur langue.",
    relations:
      "Parce que personne ne dit aux couples qu'après le 2e enfant, c'est statistiquement la pire période. On nous fait croire que c'est exceptionnel, alors que c'est la norme. Et qu'on peut s'en sortir avec les bons outils.",
  },

  // ─── STRESS-TEST B2 ───────────────────────────────────────────────────
  stress_q1: {
    argent:
      "Oui, depuis 6 ans freelance dev. CA 2025 : 142 000€ HT. Je facture 750€/jour, full booké 3 mois à l'avance. Comptes chez ma comptable, tout traçable.",
    sante:
      "Non, je ne suis pas thérapeute formée mais j'ai vécu 2 burn-out, j'ai testé 11 méthodes différentes, et j'ai accompagné 23 femmes en off avec ma méthode CAR depuis 18 mois. Témoignages dispo.",
    relations:
      "Pas thérapeute de couple certifié, mais j'ai vécu la crise + la reconstruction avec ma femme, lu 23 livres sur le sujet, accompagné 7 couples de notre entourage. 6 sur 7 sont toujours ensemble 2 ans après.",
  },
  stress_q2: {
    argent:
      "1. Thomas, 32 ans, dev React en CDI à 52K€ chez une scale-up parisienne, en a marre du management, m'a déjà demandé conseil 3 fois.\n2. Karim, 35 ans, dev Java sénior en SSII à 48K€, marié 1 enfant, son couple souffre du manque de temps.\n3. Élodie, 29 ans, dev mobile à 56K€ chez un grand compte, veut partir aux US avec son copain.",
    sante:
      "1. Inès, 31 ans, infirmière à Toulouse, 2 enfants 3 et 5 ans, mari ingénieur 4 200€/mois, en arrêt maladie depuis 2 mois.\n2. Khadija, 35 ans, en congé parental après son 2e enfant, mari cadre. Me suit depuis 8 mois sur Insta, m'a écrit 4 fois.\n3. Sarah, 38 ans, prof à mi-temps, divorcée 3 enfants, en surcharge mentale chronique. Salaire 1 600€ + pension 800€.",
    relations:
      "1. Marc & Julie, 35 et 33 ans, 2 enfants (4 et 1 an), il est cadre, elle est en congé parental. Disputes quotidiennes depuis 6 mois.\n2. Karim & Léa, 38 et 36 ans, 2 enfants ado/bébé, lui chef de projet, elle médecin. Ne dorment plus dans la même chambre.\n3. Pierre & Anne, 41 et 39 ans, famille recomposée 3 enfants, lui artisan, elle prof. Au bord de la rupture.",
  },
  stress_q3: {
    argent:
      "14 développeurs accompagnés en mentoring depuis 2022 : 11 facturent maintenant 5 000€+/mois en freelance. 3 sont restés salariés (par choix). Témoignages vidéo + factures de leurs sociétés dispo.",
    sante:
      "23 femmes accompagnées en off depuis 18 mois (gratuit ou échange compétences) : 19 disent que leur vie a changé, 4 ont rechuté. Témoignages écrits dispo. J'ai documenté chaque cas dans un Notion.",
    relations:
      "7 couples accompagnés depuis 2021 (proches ou amis d'amis) : 6 sont toujours ensemble et témoignent que ça va mieux qu'avant. 1 a divorcé mais reste en bons termes pour les enfants. Tous sont prêts à témoigner.",
  },

  // ─── CRISTALLISATION ──────────────────────────────────────────────────
  crystal_phrase: {
    argent:
      "Méthode FreelanceShift™ pour développeurs senior 30-45 ans en CDI à 45-60K€ qui veulent passer à 8 000€/mois en freelance",
    sante:
      "Méthode CAR™ pour mères 30-45 ans en burn-out parental après le 2e enfant, sans temps ni soutien",
    relations:
      "Protocole 12-Weeks Reset™ pour couples 30-45 ans avec 2 enfants en bas âge, qui ne dorment plus dans la même chambre",
  },
  crystal_cible: {
    argent:
      "Hommes 30-45 ans, développeurs sénior CDI à 45-60K€, en région parisienne ou Lyon, marié(e)s avec 1-2 enfants en bas âge",
    sante:
      "Femmes 30-45 ans, mères de 2+ enfants en bas âge (0-7 ans), en France métropolitaine, revenu foyer 4 000€+/mois",
    relations:
      "Couples 30-45 ans, parents de 2+ enfants en bas âge, urbains, double revenu 6 000€+/mois, mariés ou pacsés depuis 5+ ans",
  },
  crystal_douleur: {
    argent:
      "Frustré de plafonner à 50K€ alors que des juniors moins bons passent à 80K€ en freelance. Peur du saut. Famille à charge.",
    sante:
      'Épuisée, irritable, déconnectée d\'elle-même. Pleure dans la voiture. A peur de devenir "une mauvaise mère" si elle craque.',
    relations:
      "Vivent comme colocataires depuis l'arrivée du 2e enfant. Plus aucune intimité. Pensent au divorce mais ont peur pour les enfants.",
  },
  crystal_pouvoir_achat: {
    argent:
      "Concurrents identifiés : Greg de Crème de la Crème à 2 500€, Octo Academy à 3 800€. Mes 14 mentorés avaient tous payé entre 1 500 et 3 000€ pour des formations inefficaces avant moi.",
    sante:
      "Marie Filliozat (formation parentalité) vend à 1 290€. Isabelle Filliozat à 2 400€. Mon avatar a un revenu foyer 4 000€+ et investit déjà dans la santé (yoga, ostéo, etc.).",
    relations:
      "Couples thérapie : Esther Perel programme online à 2 700€. Méthode Gottman certifiée 1 800€. Mes avatars sont CSP+ et ont déjà tenté 1 ou 2 thérapies à 80€/séance.",
  },
  crystal_contact: {
    argent:
      "LinkedIn (cible salariés tech) + posts Twitter/X engagés (les devs sénior y sont) + ads Meta ciblées 30-45 dev en CDI + collaborations avec influenceurs freelance reconnus.",
    sante:
      "Instagram (reels de mamans en burn-out, témoignages, exercices courts) + groupes Facebook 'mamans débordées' + ads Meta ciblées femmes 30-45 mères + collaborations avec coachs parentalité.",
    relations:
      "Instagram couple + podcasts couples francophones + ads Meta ciblées couples 30-45 mariés depuis 5+ ans + collaborations avec thérapeutes de couple reconnus.",
  },
  crystal_croissance: {
    argent:
      "Marché freelance tech en croissance +18%/an depuis 2020. Recherches Google 'devenir freelance dev' en hausse constante. Tant qu'il y aura du salariat tech mal payé, la douleur existera.",
    sante:
      "Burn-out parental reconnu officiellement depuis 2019. Recherches 'burn-out maman' multipliées par 4 depuis 2020. Marché coaching parentalité +30%/an estimé.",
    relations:
      "Marché du coaching de couple en croissance +20%/an. Démocratisation post-Covid (plus de couples consultent). Demande supérieure à l'offre qualifiée.",
  },
  crystal_methode: {
    argent: "Méthode FreelanceShift™ en 90 jours",
    sante: "Méthode CAR™ (Cohérence-Ancrage-Routines) en 90 jours",
    relations: "Protocole 12-Weeks Reset™ inspiré Gottman",
  },

  // ─── AVATAR SOCIO ─────────────────────────────────────────────────────
  avatar_sexe: {
    argent: "H (75% des dev senior sont des hommes)",
    sante: "F (cible majoritaire pour burn-out parental)",
    relations: "Couple mixte (2 personnages : H + F)",
  },
  avatar_nom: { argent: "Thomas R.", sante: "Sarah M.", relations: "Marc & Julie" },
  avatar_age: { argent: "34 ans", sante: "38 ans", relations: "35 et 33 ans" },
  avatar_lieu: {
    argent: "Paris 11e (open-space scale-up)",
    sante: "Lyon 6e (appartement familial)",
    relations: "Banlieue ouest parisienne (maison)",
  },
  avatar_revenu: {
    argent: "52K€/an + 8K€ de bonus (≈ 4 100€/mois net)",
    sante: "0€ (congé parental) — foyer : mari à 4 200€/mois",
    relations: "Marc 5 800€/mois + Julie 1 200€ (mi-temps prof)",
  },
  avatar_compagnon: {
    argent: "Marié depuis 5 ans, sa femme est en télétravail à 80%",
    sante: "Mariée 11 ans, mari ingénieur en présentiel",
    relations: "Mariés depuis 7 ans, un peu las mais s'aiment toujours",
  },
  avatar_relations: {
    argent: "Réseau pro LinkedIn actif. Peu d'amis IRL. Sa famille est en Bretagne.",
    sante:
      "Très proche de sa sœur (qu'elle voit 1×/mois). 2-3 amies de fac perdues de vue depuis le 2e enfant.",
    relations:
      "Cercle d'amis stable mais figé. Ne parlent plus à personne de leurs problèmes de couple — tabou.",
  },
  avatar_situation: {
    argent:
      "2 enfants (3 et 6 ans), garde alternée écrite mais flexible. Maison achetée en 2022 (crédit 1 850€/mois).",
    sante:
      "2 enfants (5 et 7 ans), école primaire, périscolaire jusqu'à 18h. Pas de famille à proximité.",
    relations:
      "2 enfants (5 ans et 18 mois). Le 2e ne fait toujours pas ses nuits. Plus de soirées ensemble depuis 14 mois.",
  },

  // ─── AVATAR PSYCHO ────────────────────────────────────────────────────
  avatar_probleme: {
    argent:
      "Plafonne à 60K€ en CDI alors qu'il sait que son marché vaut 100K€+ en freelance. Ressent une humiliation silencieuse à chaque salary review.",
    sante:
      "Pleure dans la voiture, hurle sur ses enfants pour des broutilles, n'a plus aucune libido depuis 14 mois. Se sent vide.",
    relations:
      "Vivent comme colocataires depuis 14 mois. Plus de sexe, plus de tendresse. Pensent au divorce mais ont peur pour les enfants.",
  },
  avatar_objectifs: {
    argent:
      "Passer freelance à 750€/jour minimum dans les 6 mois. Atteindre 100K€ en année 1. Garder ses enfants 50% du temps.",
    sante:
      "Retrouver de l'énergie dans 90 jours. Ne plus crier sur ses enfants. Reprendre une activité (sport ou pro) dans 6 mois.",
    relations:
      "Recommencer à dormir dans la même chambre dans 2 mois. Avoir 1 vraie soirée à 2 par semaine. Ne pas divorcer.",
  },
  avatar_consequences: {
    argent:
      "Restera à 60K€ jusqu'à 50 ans. Verra ses pairs partir devant. Se sentira de plus en plus enfermé. Possible burn-out à 5 ans.",
    sante:
      "Risque de dépression diagnostiquée. Risque de séparation conjugale. Enfants qui développent de l'anxiété par mimétisme.",
    relations:
      "Divorce dans 18 mois max. Garde alternée. Enfants déchirés. Vente du bien immobilier à perte. Reconstruction longue.",
  },
  avatar_passe: {
    argent:
      'Lu "Tim Ferriss : 4-Hour Workweek" il y a 2 ans. Inscrit à Crème de la Crème mais jamais mis le 1er mandat. Suivi 3 lives gratuits sans passer à l\'acte.',
    sante:
      "8 mois de psy à 80€/séance (a arrêté par fatigue). Médecin lui a proposé des antidépresseurs (refusés). Méditation Petit Bambou sans tenir + sport en pointillé.",
    relations:
      "6 séances de thérapie de couple à 120€ (sans suite). 1 livre de John Gottman lu à moitié. 2 weekends romantiques qui ont mal fini.",
  },
  avatar_sentiment: {
    argent:
      "Frustré, ennuyé en réunion, jaloux des copains qui ont sauté le pas. Le dimanche soir = boule au ventre.",
    sante:
      'Épuisée 24/7. Honte de ne pas "y arriver" alors que les autres mères ont l\'air gérer. Se sent invisible.',
    relations:
      "Tristes. Nostalgiques de leurs débuts. Énervés contre l'autre pour des broutilles. Se demandent s'ils ont fait une erreur en faisant le 2e enfant.",
  },
  avatar_paradis: {
    argent:
      "Réveil à 8h30 sans alarme. Café avec sa femme. 4h de travail sur son projet. Déjeuner avec un client à 600€ HT facturés. 8 000€/mois facturés.",
    sante:
      "Se réveille reposée. Patiente avec ses enfants. Reprend le yoga 2×/sem. Couple qui se reparle. Énergie pour un projet à elle.",
    relations:
      "Dorment ensemble. Se touchent en passant dans la cuisine. Une soirée par semaine en duo. Rient à nouveau. Refont des projets ensemble.",
  },
  avatar_phrase_avatar: {
    argent:
      "Thomas, 34 ans, dev senior parisien à 60K€, marié 2 enfants, qui plafonne et étouffe en CDI alors qu'il sait pouvoir tripler ses revenus en freelance.",
    sante:
      "Sarah, 38 ans, mère de 2 enfants à Lyon, en congé parental, en burn-out invisible depuis 14 mois et qui pleure dans la voiture en allant chercher l'aîné à l'école.",
    relations:
      "Marc & Julie, 35 et 33 ans, 2 enfants en bas âge, vivent comme colocataires depuis l'arrivée du 2e et oscillent entre divorce et acharnement.",
  },

  // ─── VALIDATION ───────────────────────────────────────────────────────
  val_demande_q1: {
    argent:
      'Sur Google "passer freelance développeur" : 14 000 recherches/mois. Sur LinkedIn, 2 800 posts/mois sur le sujet. Crème de la Crème, Malt et Comet vendent activement à cette cible.',
    sante:
      '"Burn-out parental" : 8 100 recherches/mois en France. 47 livres édités sur le sujet en 2024. Influenceuses comme @parentalitepositive ont 280K+ abonnés.',
    relations:
      '"Crise de couple après bébé" : 5 400 recherches/mois. Hashtag #couplerecompose : 12 000 posts Insta. Esther Perel a 2,4M de followers.',
  },
  val_demande_q2: {
    argent:
      "Oui — 14 000 recherches Google/mois × 12 = 168 000 personnes/an cherchent activement. Le marché du freelance tech est en croissance 18%/an depuis 2020.",
    sante:
      "Oui — 1,8M de naissances/an en France, 30% des mères vivent un épisode de burn-out modéré à sévère selon l'INSERM. Soit 540 000 nouvelles cibles/an.",
    relations:
      "Oui — 280 000 mariages/an, et 47% des couples disent traverser une crise majeure après l'arrivée du 2e enfant. Soit 130 000+ couples/an.",
  },
  val_concurrence_q1: {
    argent:
      "1. Greg Onizuka (FreelanceMakers, 2 500€)\n2. Crème de la Crème Academy (3 800€)\n3. Octo Academy reconversion freelance (1 900€)",
    sante:
      "1. Isabelle Filliozat — programme parentalité bienveillante (2 400€)\n2. Caroline Goldman — coaching parental (1 290€)\n3. Aurélie Crétin — programme burn-out maternel (1 800€)",
    relations:
      "1. Esther Perel — programme couple (2 700€)\n2. Méthode Gottman certifiée FR (1 800€)\n3. Mariekedevlieger — programme couple recomposé (1 490€)",
  },
  val_concurrence_q2: {
    argent:
      "Plusieurs offrent du mentoring freelance, mais aucun ne se concentre uniquement sur les développeurs senior 30-45 ans. C'est ma sous-niche 2.0 qui me différencie.",
    sante:
      "Beaucoup parlent de parentalité bienveillante, mais peu se concentrent sur le burn-out maternel post-2e enfant avec une méthode structurée. Je vois 2-3 concurrentes max sur ce créneau précis.",
    relations:
      "Esther Perel parle de couple en général, Gottman couvre tout. Personne ne cible spécifiquement la crise post-2e enfant avec un protocole 12 semaines. Niche peu peuplée.",
  },
  val_perennite_q1: {
    argent:
      "Oui — la freelancisation est une tendance lourde (croissance 18%/an depuis 2020 en France). Tant qu'il y aura du salariat tech mal payé, il y aura cette douleur.",
    sante:
      "Oui — tant qu'il y aura des femmes qui font des enfants en travaillant, il y aura du burn-out parental. C'est un sujet structurel, pas une mode.",
    relations:
      "Oui — la crise post-naissance touche les couples depuis toujours. Aucune raison que ça change. Au contraire, l'individualisme moderne aggrave le problème.",
  },
  val_perennite_q2: {
    argent:
      "L'IA pourrait remplacer le dev junior à 5 ans, ce qui valoriserait encore plus les dev senior. Régulation freelance France peu probable. Inflation salariale tech ralentie = encore plus de demande.",
    sante:
      "Si le congé parental allongeait massivement (loi politique improbable), demande baisserait. Sinon, tendance stable. Pas de risque IA — c'est un service humain.",
    relations:
      "Aucun événement réaliste ne diminuera cette douleur. Régulation thérapie peu probable. Pas de risque IA — c'est de l'accompagnement humain profond.",
  },
  val_perennite_q3: {
    argent:
      "Difficile sans avoir soi-même fait le saut freelance et tenu 5+ ans à 100K€+. Les coachs théoriques se font massacrer. Crédibilité = preuves de revenus + témoignages.",
    sante:
      "Difficile sans avoir vécu le burn-out maternel ET en être sortie ET avoir codifié une méthode. Les psy sans enfant n'ont pas la légitimité dans cette niche.",
    relations:
      "Difficile sans avoir traversé la crise en couple ET en être sortis ET avoir codifié les étapes. Les thérapeutes célibataires manquent de crédibilité auprès de cette cible.",
  },
  val_alignement_q1: {
    argent:
      "Oui — j'aime les profils ambitieux, structurés, qui veulent du concret. Les développeurs sont mes pairs, on parle le même langage.",
    sante:
      "Oui — j'aime profondément aider d'autres mères. C'est ma communauté, je suis passée par là. Le travail émotionnel ne me fatigue pas, il me nourrit.",
    relations:
      "Oui — j'adore travailler avec des couples engagés qui veulent vraiment s'en sortir. Les relations humaines sont ma passion depuis toujours.",
  },
  val_alignement_q2: {
    argent:
      "Oui — viser 25K€/mois en 18 mois, équipe de 3 dans 3 ans, possible vente de l'activité à 7 ans. Compatible avec ma vie de famille (full remote).",
    sante:
      "Oui — viser 8K€/mois en 12 mois en restant solo, garder du temps pour mes propres enfants. Pas envie de scaler à l'extrême.",
    relations:
      "Oui — accompagner 30 couples/an à 4 500€ = 135K€/an. Compatible avec mon couple, qui sert d'exemple.",
  },
  val_alignement_q3: {
    argent:
      "6 ans freelance dev. CA 142K€ en 2025. 14 mentorés accompagnés en off avec 11/14 qui facturent 5K€+. Mon expertise est documentée et traçable.",
    sante:
      "2 burn-out maternels traversés et résolus. 23 femmes accompagnées en off depuis 18 mois. Méthode CAR codifiée. Témoignages dispo.",
    relations:
      "Crise majeure traversée avec ma femme en 2019, sortis renforcés. 7 couples accompagnés depuis. Lecture intensive (Gottman, Perel, Tatkin).",
  },
};

export function hasHint(key: string): boolean {
  return key in EXAMPLES;
}

export function getHint(key: string): HintExamples | null {
  return EXAMPLES[key] ?? null;
}
