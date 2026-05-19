export type QuestionType = "text" | "textarea" | "select" | "multi";

export type BrandMode = "pass" | "liberty";

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  help?: string;
  options?: string[];
}

export interface BrandSection {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  questions: Question[];
}

// ─── REFONTE 19/05/2026 (Sidali) ───────────────────────────────────────
// Cette version reflète le mockup HTML "BRANDING - Interface-Unifiee.docx"
// envoyé par Sidali le 19/05. Changements majeurs vs version précédente :
//   - Labels raccourcis (style direct, mobile-first)
//   - Placeholders enrichis avec exemples narratifs concrets (3-5 lignes)
//   - Section IDENTITÉ : nouvelles options `competences` orientées "à monétiser"
//   - Section CIBLE : suppression de `cible_communaute` (musulmane par défaut),
//     options `cible_genre` raccourcies
//   - Section PERSONNALITÉ : suppression de `modele` (décision Hassan, hors
//     mockup Sidali), options `ton` et `valeurs` raccourcies
//   - Section CONTENU : `format_principal` réduit à 2 options (Face caméra /
//     Voix off), suppression de `format_pourquoi`, `outils_montage`, `sous_titres`
//   - Section PROFIL : `photo_profil` réduit à 4 options, highlights raccourcis
//
// Migration : voir LEGACY_VALUE_MAP / DEPRECATED_VALUES en bas du fichier.

// ─── SECTION IDENTITÉ — variante LIBERTY ──────────────────────────────
// Selon le doc Sidali, l'identité Liberty diffère de Pass sur 2 points :
//   1. Pas de question "compétences à monétiser" (le membre Liberty a déjà
//      son offre, il n'est pas en train de chercher quoi monétiser).
//   2. Libellé de "pourquoi" adapté : "Pourquoi tu as lancé ton activité ?"
//      au lieu de "Pourquoi te lancer dans le digital ?".
const IDENTITE_LIBERTY: BrandSection = {
  id: "identite",
  icon: "✦",
  title: "Ton Identité",
  subtitle: "Qui es-tu ?",
  questions: [
    { id: "prenom", label: "Ton prénom", type: "text", placeholder: "Ex : Yassine" },
    { id: "age", label: "Âge", type: "select", options: ["18-20", "21-24", "25-29", "30-35", "35+"] },
    {
      id: "situation",
      label: "Situation",
      type: "select",
      options: ["Étudiant(e)", "Salarié(e)", "En recherche d'emploi", "Freelance", "Entrepreneur(e)", "En reconversion"],
    },
    {
      id: "objectif_revenu",
      label: "Objectif revenu à 6 mois",
      type: "select",
      options: ["500-1000€", "1000-2000€", "2000-3000€", "3000-5000€", "5000-10000€", "10000€+"],
    },
    {
      id: "pourquoi",
      label: "Pourquoi tu as lancé ton activité ?",
      type: "textarea",
      placeholder:
        "Écris comme tu parles, avec un max de détails (3-5 lignes).\n\nEx : J'en peux plus de mon job en CDI à 1450€ net pour 38h. Je veux pouvoir prier à l'heure, voir mes enfants grandir, faire ma hijra au Maroc d'ici 2 ans inshaAllah. L'idée de finir comme mon père qui a bossé 40 ans pour une retraite à 900€, ça me file la nausée.",
    },
  ],
};

// ─── SECTION OFFRE (mode Liberty uniquement) ──────────────────────────
// Vient s'insérer après "Histoire" dans le parcours Liberty (qui a sa
// propre offre à promouvoir vs les apporteurs Pass qui poussent l'écosystème).
export const OFFER_SECTION: BrandSection = {
  id: "offre",
  icon: "💰",
  title: "Ton Offre",
  subtitle: "Ce que tu vends",
  questions: [
    {
      id: "offre_nom",
      label: "Nom de ton offre",
      type: "text",
      placeholder: "Ex : Pap'o Top, Méthode Phoenix...",
    },
    {
      id: "offre_niche",
      label: "Ton domaine / ta niche",
      type: "textarea",
      placeholder:
        "Une phrase claire qui dit qui tu aides à faire quoi. Dans tes mots, comme à un pote.\n\nEx : J'aide les papas musulmans débordés à perdre 8-12kg en 90 jours sans frustration alimentaire, en s'adaptant à leur emploi du temps et leur foi (gestion du ramadan, recettes maghrébines, pas de protéines haram).",
    },
    {
      id: "offre_desc",
      label: "Décris ton offre en 2-3 phrases",
      type: "textarea",
      placeholder:
        "Comme à un(e) ami(e) qui te demande 'tu fais quoi exactement ?'. Format, durée, ce qui est inclus, comment ça se passe.\n\nEx : C'est un accompagnement de 90 jours, mi-formation mi-coaching. Y'a une plateforme avec 12 modules vidéo (~6h au total), un appel hebdo en groupe de 6 personnes, un Telegram privé où je réponds aux questions sous 24h, et un suivi de poids/photos chaque dimanche. Tu peux aussi me solliciter en direct si tu bloques sur quelque chose.",
    },
    {
      id: "offre_probleme",
      label: "Problème résolu ?",
      type: "textarea",
      placeholder:
        "Le problème que tes clients ont, dans leurs mots à eux quand ils t'écrivent en DM. Au format direct si possible.\n\nEx : 'J'ai essayé 5 régimes, je perds 3kg, je les reprends.' 'J'ai pas le temps de cuisiner sain avec 3 enfants et un boulot à 50h.' 'Tous les programmes proposent des recettes avec porc ou alcool — je peux pas les utiliser.' 'Mon poids me bouffe la confiance en moi devant ma femme.'",
    },
    {
      id: "offre_transfo",
      label: "Transformation promise ?",
      type: "textarea",
      placeholder: "Ex : -10kg en 90 jours, lancer son activité en 3 mois, retrouver confiance en 6 semaines...",
    },
    {
      id: "offre_prix",
      label: "Prix ?",
      type: "select",
      options: ["Gratuit", "1-50€", "50-200€", "200-500€", "500-1000€", "1000€+", "Pas fixé"],
    },
    {
      id: "offre_acces",
      label: "Accès ?",
      type: "select",
      options: ["Page de vente", "Appel découverte", "DM Instagram", "WhatsApp", "Formulaire", "Pas défini"],
    },
    {
      id: "offre_unique",
      label: "Ce qui te rend unique ?",
      type: "textarea",
      placeholder:
        "Ta méthode, ton angle, ce que personne d'autre fait pareil chez toi. Sois concret, pas slogan.\n\nEx : Le seul accompagnement perte de poids 100% halal validé par un nutritionniste musulman, qui prend en compte le ramadan (avec stratégie spécifique), les horaires de boulot décalés, et qui utilise des plats du Maghreb adaptés (couscous allégé, tajine léger) au lieu de bols de quinoa fade que personne tient sur la durée.",
    },
    {
      id: "offre_preuves",
      label: "Résultats / témoignages ?",
      type: "textarea",
      placeholder:
        "Tes résultats ou ceux de tes clients. Prénom + chiffre + détail. Si t'en as pas encore : écris simplement 'pas encore'.\n\nEx : Mohamed, 38 ans, papa de 3 : -11kg en 92 jours, sans frustration. Yacine, 42 ans : -14kg en 90 jours, son diabète type 2 a régressé selon ses analyses. Karim, 33 ans : -8kg en 60 jours, a recommencé le sport.\n\nOu si tu débutes : Pas encore, je lance l'offre dans 2 mois.",
    },
  ],
};

export const BRAND_SECTIONS: BrandSection[] = [
  {
    id: "identite",
    icon: "✦",
    title: "Ton Identité",
    subtitle: "Qui es-tu ?",
    questions: [
      { id: "prenom", label: "Ton prénom", type: "text", placeholder: "Ex : Yassine" },
      { id: "age", label: "Âge", type: "select", options: ["18-20", "21-24", "25-29", "30-35", "35+"] },
      {
        id: "situation",
        label: "Situation",
        type: "select",
        options: ["Étudiant(e)", "Salarié(e)", "En recherche d'emploi", "Freelance", "Entrepreneur(e)", "En reconversion"],
      },
      {
        id: "competences",
        label: "Compétences à monétiser ?",
        type: "multi",
        options: [
          "Personal Branding",
          "Storytelling",
          "Marketing Digital",
          "Community Management",
          "Setting DM",
          "Setting Téléphonique",
          "Closing",
          "Montage vidéo",
        ],
      },
      {
        id: "objectif_revenu",
        label: "Objectif revenu à 6 mois",
        type: "select",
        options: ["500-1000€", "1000-2000€", "2000-3000€", "3000-5000€", "5000€+"],
      },
      {
        id: "pourquoi",
        label: "Pourquoi te lancer dans le digital ?",
        type: "textarea",
        placeholder:
          "Écris comme tu parles, avec un max de détails (3-5 lignes).\n\nEx : J'en peux plus de mon job en CDI à 1450€ net pour 38h. Je veux pouvoir prier à l'heure, voir mes enfants grandir, faire ma hijra au Maroc d'ici 2 ans inshaAllah. L'idée de finir comme mon père qui a bossé 40 ans pour une retraite à 900€, ça me file la nausée.",
      },
    ],
  },
  {
    id: "histoire",
    icon: "💬",
    title: "Ton Histoire",
    subtitle: "Ce qui te rend unique",
    questions: [
      {
        id: "declic",
        label: "Ton déclic pour rejoindre AL BARAKA ?",
        type: "textarea",
        placeholder:
          "Le moment précis, l'histoire. Pas une généralité. Où t'étais, quelle heure, ce que tu ressentais.\n\nEx : Un soir à 23h j'ai vu la story d'un frère installé au Maroc qui faisait 3000€/mois depuis son téléphone. J'ai pleuré sur mon canapé. Je me suis dit 'pourquoi pas moi'. Le lendemain j'ai cherché AL BARAKA, j'ai fait ma istikhara, j'ai signé deux jours après.",
      },
      {
        id: "vie_ideale",
        label: "Ta vie idéale dans 6 mois ?",
        type: "textarea",
        placeholder:
          "Décris une journée type comme un film qu'on tourne. Horaires, lieux, qui est là, ce que tu ressens.\n\nEx : Je me réveille à 5h pour fajr sans réveil parce que j'ai bien dormi. Je prie dans le calme du salon. Café + lecture 30 min. À 9h je bosse 2h sur mon laptop depuis la cuisine. Je vais chercher mes enfants à 16h, vraiment présent (pas la tête au boulot). Le soir on mange en famille, on rit, je m'endors pas devant la TV.",
      },
      {
        id: "epreuves",
        label: "3 épreuves marquantes ?",
        type: "textarea",
        placeholder:
          "Les trucs qui t'ont construit(e). Numérote, sois précis sur le contexte ET l'impact que ça a eu sur toi.\n\nEx : 1) Le licenciement de mon père quand j'avais 14 ans, on a galéré 2 ans, j'ai appris à jamais dépendre d'un patron. 2) Ma première année de fac où j'ai compris que le diplôme allait pas me sauver. 3) La perte de ma grand-mère pendant que je faisais des heures sup pour boucler le mois — j'ai pas pu la voir. Plus jamais ça.",
      },
      {
        id: "fierte",
        label: "Ta plus grande fierté ?",
        type: "textarea",
        placeholder:
          "Pas une vitrine — un truc qui t'a touché toi personnellement. Raconte le moment, pas juste le résultat.\n\nEx : Avoir payé la Omra à mes parents avec mon premier vrai salaire. Quand je leur ai annoncé dans le salon, ma mère a pleuré, mon père m'a serré dans ses bras pour la première fois depuis 10 ans. Ce moment précis, c'est ce qui me fait avancer encore aujourd'hui.",
      },
      {
        id: "message_monde",
        label: "UNE chose à dire à ceux qui hésitent ?",
        type: "textarea",
        placeholder:
          "Ce que t'aurais aimé qu'on te dise quand t'étais bloqué(e). Tes vrais mots, comme dans une vraie conversation.\n\nEx : Arrête d'attendre d'être prêt. T'es jamais prêt. Tu te lances, tu galères 3 mois, tu doutes, et puis ça vient. Le vrai risque c'est pas d'échouer — c'est de te retrouver dans 5 ans exactement au même endroit et de regretter de pas avoir essayé.",
      },
    ],
  },
  {
    id: "cible",
    icon: "🎯",
    title: "Ta Cible",
    subtitle: "À qui tu parles ?",
    questions: [
      {
        id: "cible_qui",
        label: "Ton audience idéale ?",
        type: "textarea",
        placeholder:
          "Décris UNE personne précise comme si tu l'avais en face. Prénom (fictif si tu veux), âge, métier, sa journée, ses peurs, où elle vit.\n\nEx : Karim, 26 ans, magasinier dans un entrepôt logistique à Lyon. Il bosse 7h-15h, rentre crevé, joue à FIFA jusqu'à minuit. Il sent qu'il vaut mieux que sa situation. Il scroll TikTok et voit des frères à 5K/mois, il se dit 'pourquoi pas moi'. Il a peur de se faire arnaquer. Il vit encore chez ses parents.",
      },
      { id: "cible_age", label: "Âge cible ?", type: "multi", options: ["16-20", "20-25", "25-30", "30-40", "40+"] },
      {
        id: "cible_genre",
        label: "Genre ?",
        type: "select",
        options: ["Hommes", "Femmes", "Les deux", "Pas de préférence"],
      },
      {
        id: "cible_probleme",
        label: "Problème n°1 de ta cible ?",
        type: "textarea",
        placeholder:
          "Le truc qui les empêche de dormir, dans LEURS mots à eux (pas en langage marketing).\n\nEx : Ils sentent qu'ils valent mieux que leur job actuel mais ils savent pas par où commencer. Ils ont essayé 2-3 trucs avant (dropshipping, crypto) qui ont rien donné. Ils pensent que le digital c'est que pour les bons en marketing ou les fils de bourgeois. Et leur entourage les comprend pas, donc ils sont seuls dans leur tête.",
      },
      {
        id: "cible_reve",
        label: "Rêve de ta cible ?",
        type: "textarea",
        placeholder:
          "Pas 'gagner de l'argent'. La VIE concrète que cet argent permet. Sois précis sur les scènes.\n\nEx : Pouvoir prier à l'heure sans demander la permission à un patron. Quitter cette ville grise et s'installer au bled. Offrir des vacances à leurs parents qui ont jamais quitté la France. Se marier sans s'endetter. Faire le Hajj avec leur mère. Un coussin financier pour pas paniquer le jour où la voiture lâche.",
      },
      {
        id: "cible_objection",
        label: "Peur/objection n°1 ?",
        type: "textarea",
        placeholder:
          "Les phrases qu'ils se disent dans leur tête le soir avant de dormir, qui les empêchent d'agir. Au format direct.\n\nEx : 'C'est pas pour moi, j'ai pas le profil.' 'Si c'était si simple, tout le monde le ferait.' 'Et si c'est une arnaque ?' 'Si je galère, mes potes vont rire de moi.' 'J'ai pas le temps avec mon job actuel.' 'Je veux pas être un de ces vendeurs qui manipulent les gens.'",
      },
    ],
  },
  {
    id: "personnalite",
    icon: "🎭",
    title: "Personnalité",
    subtitle: "Ton image",
    questions: [
      {
        id: "archetype",
        label: "Personnalité ?",
        type: "select",
        options: [
          "Le Mentor — Sage, bienveillant",
          "Le Leader — Direct, cash",
          "L'Expert — Technique, pédagogue",
          "L'Inspirateur — Storytelling, émotions",
          "Le Provocateur — Clivant, franc",
          "Le Proche — Accessible, humain",
        ],
      },
      {
        id: "ton",
        label: "Ton ?",
        type: "multi",
        options: ["Sérieux", "Décontracté", "Motivant", "Vulnérable", "Humoristique", "Spirituel"],
      },
      {
        id: "valeurs",
        label: "3 valeurs ?",
        type: "multi",
        options: ["Halal", "Liberté", "Excellence", "Famille", "Foi", "Authenticité", "Entraide", "Ambition", "Discipline", "Impact"],
      },
      {
        id: "sujets_eviter",
        label: "Sujets à éviter ?",
        type: "textarea",
        placeholder:
          "Tout ce que tu veux jamais voir apparaître dans tes scripts.\n\nEx : Politique française, conflit Algérie/Maroc, vie privée de ma femme et mes enfants, anciennes relations sentimentales, show-off de revenus, comparaisons entre courants de l'islam, sujets qui pourraient nuire à ma réputation pro.",
      },
      {
        id: "ton_contenu",
        label: "Ton du contenu ?",
        type: "select",
        options: [
          "Émotionnel — Histoire et émotions",
          "Éducatif — Démos et tutos",
          "Sensible — Douceur et empathie",
        ],
      },
    ],
  },
  {
    id: "contenu",
    icon: "🎬",
    title: "Stratégie",
    subtitle: "Comment tu crées",
    questions: [
      {
        id: "format_principal",
        label: "Format vidéo ?",
        type: "select",
        options: ["Face caméra", "Voix off"],
      },
      {
        id: "plateformes",
        label: "Plateformes ?",
        type: "multi",
        options: ["Instagram", "TikTok", "YouTube Shorts", "YouTube long", "LinkedIn"],
      },
      {
        id: "frequence",
        label: "Rythme ?",
        type: "select",
        options: ["3/sem", "5/sem", "7/sem", "10/sem", "14+/sem"],
      },
      {
        id: "jour_creation",
        label: "Batching ?",
        type: "multi",
        options: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      },
      {
        id: "piliers",
        label: "Piliers ?",
        type: "multi",
        options: [
          "Éducatif",
          "Inspirationnel",
          "Storytelling",
          "Preuve sociale",
          "Coulisses",
          "Commercial",
          "Entertainment",
          "Spirituel",
        ],
      },
    ],
  },
  {
    id: "profil_prefs",
    icon: "📱",
    title: "Profil",
    subtitle: "Préférences",
    questions: [
      {
        id: "photo_profil",
        label: "Photo ?",
        type: "select",
        options: ["Photo pro", "Logo", "Photo naturelle", "Je ne sais pas"],
      },
      {
        id: "highlights",
        label: "Highlights ?",
        type: "multi",
        options: [
          "🎓 Parcours",
          "📚 Programmes",
          "💬 Témoignages",
          "🎁 Gratuit",
          "📞 RDV",
          "❓ FAQ",
          "🕌 Valeurs",
          "🎬 Coulisses",
        ],
      },
    ],
  },
];

export type BrandAnswers = Record<string, string | string[]>;

// Retourne les sections selon le mode :
//   - pass    : 6 sections classiques (identité avec "compétences", CTA tunnel)
//   - liberty : 7 sections, identité allégée (pas de question compétences,
//               libellé "pourquoi" adapté) + section Offre insérée après "Histoire"
export function getSections(mode: BrandMode): BrandSection[] {
  if (mode === "liberty") {
    // On remplace la section identité par sa variante Liberty
    // et on insère la section Offre après "Histoire".
    const rest = BRAND_SECTIONS.slice(1); // toutes sauf identite (la première)
    const idxHistoire = rest.findIndex((s) => s.id === "histoire");
    const insertAt = idxHistoire >= 0 ? idxHistoire + 1 : 1;
    return [
      IDENTITE_LIBERTY,
      ...rest.slice(0, insertAt),
      OFFER_SECTION,
      ...rest.slice(insertAt),
    ];
  }
  return BRAND_SECTIONS;
}

export function countAnsweredQuestions(answers: BrandAnswers, mode: BrandMode = "pass"): number {
  const sections = getSections(mode);
  const validIds = new Set(sections.flatMap((s) => s.questions.map((q) => q.id)));
  return Object.keys(answers).filter((k) => {
    if (!validIds.has(k)) return false;
    const v = answers[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return !!v;
  }).length;
}

export function totalQuestions(mode: BrandMode = "pass"): number {
  return getSections(mode).reduce((acc, s) => acc + s.questions.length, 0);
}

// Détermine si le questionnaire est "complet" (toutes les questions
// requises pour ce mode ont une réponse). Sert à débloquer les étapes 2/3.
export function isQuestionnaireComplete(answers: BrandAnswers, mode: BrandMode): boolean {
  return countAnsweredQuestions(answers, mode) >= totalQuestions(mode);
}

// ─── MIGRATION 19/05/2026 ──────────────────────────────────────────────
// Helpers pour gérer les ~57 utilisateurs ayant déjà rempli le quiz avant
// la refonte. Stratégie : pas de migration SQL, on adapte juste l'UI.
//
// LEGACY_VALUE_MAP : remap silencieux (l'utilisateur ne voit même pas qu'il
// y a eu un changement, car l'ancienne valeur est synonyme de la nouvelle).
//
// DEPRECATED_VALUES : valeurs qui n'existent plus dans les options actuelles
// et qui doivent déclencher une re-confirmation utilisateur (l'utilisateur
// doit explicitement choisir une nouvelle valeur).

export const LEGACY_VALUE_MAP: Record<string, Record<string, string>> = {
  // cible_genre : on retire le "uniquement" qui sonnait trop strict
  cible_genre: {
    "Hommes uniquement": "Hommes",
    "Femmes uniquement": "Femmes",
  },
  // age : ancien suffixe "ans" retiré
  age: {
    "18-20 ans": "18-20",
    "21-24 ans": "21-24",
    "25-29 ans": "25-29",
    "30-35 ans": "30-35",
    "35+ ans": "35+",
  },
  // cible_age : idem
  "cible_age:": { // workaround : multi traité côté hook
    "16-20 ans": "16-20",
    "20-25 ans": "20-25",
    "25-30 ans": "25-30",
    "30-40 ans": "30-40",
    "40+ ans": "40+",
  },
  // jour_creation : multi, anciennes valeurs longues
  "jour_creation:": {
    Lundi: "Lun",
    Mardi: "Mar",
    Mercredi: "Mer",
    Jeudi: "Jeu",
    Vendredi: "Ven",
    Samedi: "Sam",
    Dimanche: "Dim",
  },
};

// Champs supprimés dans la refonte 19/05 — les réponses restent dans
// `user_personal_brand.answers` JSONB mais ne sont plus lues par buildPrompts.
export const REMOVED_QUESTION_IDS = new Set([
  "modele",
  "format_pourquoi",
  "outils_montage",
  "sous_titres",
  "cible_communaute",
]);

// Valeurs qui n'existent plus dans les options actuelles et requièrent
// une re-confirmation utilisateur (UI : bandeau + reset valeur).
export const DEPRECATED_VALUES: Record<string, Set<string>> = {
  // format_principal : passage de 5 options à 2 → les 3 supprimées doivent
  // être re-confirmées par l'utilisateur (cf. Commit 3 migration UX).
  format_principal: new Set([
    "B-rolls — Montage visuel sans toi à l'écran (cinématique, lifestyle)",
    "Mix face caméra + B-rolls (le plus recommandé pour la crédibilité)",
    "Mix voix off + B-rolls (bon compromis si tu ne veux pas te montrer)",
    // Anciens labels avec suffixe long → re-confirmation pour passer aux nouveaux courts
    "Face caméra — Tu parles directement à la caméra (plus personnel, plus engageant)",
    "Voix off — On entend ta voix mais on ne te voit pas (plus anonyme, focus sur le contenu)",
  ]),
  // competences : anciennes options supprimées → re-confirmation
  competences: new Set([
    "Setting (prise de RDV)",
    "Closing (vente par téléphone)",
    "Création de contenu",
    "Copywriting",
    "Autre",
  ]),
  // ton : anciens libellés longs → re-confirmation pour passer aux courts
  ton: new Set([
    "Sérieux et professionnel",
    "Décontracté et accessible",
    "Motivant et énergique",
    "Authentique et vulnérable",
    "Inspirant et spirituel",
  ]),
  // valeurs : idem
  valeurs: new Set([
    "Éthique / Halal",
    "Liberté financière",
    "Excellence / Travail acharné",
    "Foi / Spiritualité",
    "Entraide communautaire",
    "Impact positif",
  ]),
  // archetype : anciens libellés longs avec parenthèses
  archetype: new Set([
    "Le Mentor — Sage, expérimenté, bienveillant (style grand frère/grande sœur)",
    "Le Leader — Direct, cash, motivant, sans filtre",
    "L'Expert — Technique, précis, pédagogue, data-driven",
    "L'Inspirateur — Storytelling, émotions, parcours personnel",
    "Le Provocateur — Clivant, franc, qui secoue les consciences",
    "Le Proche — Accessible, humain, dans le quotidien",
  ]),
  // ton_contenu : anciens libellés
  ton_contenu: new Set([
    "Émotionnel — Histoires et émotions (anecdotes, confessions, vécu)",
    "Éducatif — Démos, tutos, mythes à casser (curiosité, faits)",
    "Sensible — Connexion et douceur (sans choc ni provocation)",
  ]),
  // frequence : anciens libellés
  frequence: new Set([
    "3 vidéos/semaine (le strict minimum pour être visible)",
    "5 vidéos/semaine (bon rythme de croissance)",
    "7 vidéos/semaine — 1 par jour (rythme normal d'un créateur sérieux)",
    "10 vidéos/semaine (rythme soutenu — croissance accélérée)",
    "14+ vidéos/semaine — 2 par jour (mode machine — croissance explosive)",
  ]),
  // piliers : anciens libellés longs
  piliers: new Set([
    "Éducatif — Tutos, astuces, valeur pure",
    "Inspirationnel — Ton parcours, citations, motivation",
    "Storytelling — Histoires personnelles, avant/après",
    "Preuve sociale — Résultats, témoignages",
    "Coulisses — Ton quotidien d'entrepreneur musulman",
    "Commercial — Présentation de tes services/offres",
    "Entertainment — Trends, humour, format viral",
    "Spirituel — Rappels, lien business & foi",
  ]),
  // plateformes : anciens libellés longs
  plateformes: new Set([
    "Instagram (Reels + Stories)",
    "YouTube (Shorts)",
    "YouTube (vidéos longues)",
  ]),
  // highlights : anciens libellés longs
  highlights: new Set([
    "🎓 Qui suis-je / Mon parcours",
    "📚 Formations / Programmes",
    "💬 Témoignages / Résultats",
    "🎁 Ressource gratuite",
    "📞 Prendre RDV",
    "🕌 Mes valeurs / Ma foi",
  ]),
  // photo_profil : ancienne option "avec logo ou initiales" supprimée
  photo_profil: new Set([
    "Photo professionnelle (visage, fond neutre ou lifestyle)",
    "Photo avec logo ou initiales",
    "Logo / monogramme uniquement",
    "Photo naturelle / authentique",
    "Je ne sais pas encore",
  ]),
  // offre_prix / offre_acces : anciens libellés
  offre_prix: new Set(["Gratuit / Lead magnet", "Pas encore fixé"]),
  offre_acces: new Set([
    "Page de vente / Tunnel",
    "Appel découverte (Calendly)",
    "Formulaire d'inscription",
    "Pas encore défini",
  ]),
  // outils_montage : ancienne valeur encore en lecture seule
  outils_montage: new Set([
    "VN Video Editor (recommandé AL BARAKA — gratuit)",
    "CapCut (gratuit, facile)",
    "Adobe Premiere Pro / Final Cut",
    "DaVinci Resolve (gratuit, pro)",
    "Je ne sais pas encore",
  ]),
  // sous_titres : idem
  sous_titres: new Set([
    "Caption (recommandé — ~70€/an, qualité pro)",
    "CapCut (sous-titres automatiques gratuits)",
    "Sous-titres manuels",
    "Je ne sais pas encore",
  ]),
};

// Applique le remap silencieux LEGACY_VALUE_MAP à une valeur stockée.
// Pour les questions multi, traite chaque entrée du tableau.
// Pour les questions deprecated (cf. DEPRECATED_VALUES), ne fait rien :
// l'UI affichera un bandeau de re-confirmation.
export function migrateLegacyValue(
  questionId: string,
  value: string | string[] | undefined,
): string | string[] | undefined {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) {
    const map = LEGACY_VALUE_MAP[`${questionId}:`] || LEGACY_VALUE_MAP[questionId] || {};
    return value.map((v) => map[v] ?? v);
  }
  const map = LEGACY_VALUE_MAP[questionId] || {};
  return map[value] ?? value;
}

// Détermine si une réponse contient des valeurs obsolètes nécessitant
// une re-confirmation utilisateur (cf. DEPRECATED_VALUES + le remap silencieux
// a déjà été appliqué auparavant via migrateLegacyValue).
export function hasDeprecatedValue(
  questionId: string,
  value: string | string[] | undefined,
): boolean {
  if (value === undefined || value === null) return false;
  const deprecated = DEPRECATED_VALUES[questionId];
  if (!deprecated) return false;
  if (Array.isArray(value)) return value.some((v) => deprecated.has(v));
  return deprecated.has(value);
}

// Filtre les valeurs obsolètes d'une réponse multi (retire celles qui ne sont
// plus dans les options actuelles). Pour les questions single (select), retourne
// "" si la valeur est obsolète (l'utilisateur devra re-choisir).
export function stripDeprecatedValue(
  questionId: string,
  value: string | string[] | undefined,
): string | string[] | undefined {
  if (value === undefined || value === null) return value;
  const deprecated = DEPRECATED_VALUES[questionId];
  if (!deprecated) return value;
  if (Array.isArray(value)) return value.filter((v) => !deprecated.has(v));
  return deprecated.has(value) ? "" : value;
}
