export type QuestionType = "text" | "textarea" | "select" | "multi";

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

export const BRAND_SECTIONS: BrandSection[] = [
  {
    id: "identite",
    icon: "✦",
    title: "Ton Identité",
    subtitle: "Qui es-tu vraiment ?",
    questions: [
      { id: "prenom", label: "Ton prénom", type: "text", placeholder: "Ex : Yassine, Amira..." },
      { id: "age", label: "Ton âge", type: "select", options: ["18-20 ans", "21-24 ans", "25-29 ans", "30-35 ans", "35+ ans"] },
      { id: "situation", label: "Ta situation actuelle", type: "select", options: ["Étudiant(e)", "Salarié(e)", "En recherche d'emploi", "Freelance / Indépendant(e)", "Entrepreneur(e)", "En reconversion"] },
      {
        id: "competences",
        label: "Quelles compétences as-tu ou souhaites-tu développer ?",
        type: "multi",
        options: ["Setting (prise de RDV)", "Closing (vente par téléphone)", "Marketing Digital", "Création de contenu", "Copywriting", "Community Management", "Montage vidéo", "Personal Branding", "Autre"],
      },
      { id: "objectif_revenu", label: "Ton objectif de revenu mensuel à 6 mois", type: "select", options: ["500-1000€", "1000-2000€", "2000-3000€", "3000-5000€", "5000€+"] },
      {
        id: "pourquoi",
        label: "Pourquoi tu veux te lancer dans le digital ? (Ta motivation profonde)",
        type: "textarea",
        placeholder: "Ex : Quitter mon job, être libre financièrement, aider ma famille, vivre de ma passion en respectant mes valeurs...",
      },
    ],
  },
  {
    id: "histoire",
    icon: "💬",
    title: "Ton Histoire",
    subtitle: "Ce qui te rend unique",
    questions: [
      { id: "declic", label: "Qu'est-ce qui t'a poussé(e) à rejoindre l'écosystème AL BARAKA ?", type: "textarea", placeholder: "Raconte librement ce qui a déclenché ta décision — un événement, une frustration, une rencontre, un ras-le-bol..." },
      { id: "vie_ideale", label: "Décris-moi ta vie idéale dans 6 mois. À quoi ressemble ta journée parfaite ?", type: "textarea", placeholder: "Ex : Je me réveille sans alarme, je travaille de chez moi, je gère mon temps comme je veux, je suis présent(e) pour ma famille..." },
      { id: "epreuves", label: "Quelles sont les 3 épreuves les plus marquantes que tu aies traversées dans ta vie ?", type: "textarea", placeholder: "Ce qui t'a construit(e), ce qui t'a fait grandir, ce qui te donne la force aujourd'hui. Partage autant que tu te sens à l'aise." },
      { id: "fierte", label: "De quoi es-tu le/la plus fier(e) dans ta vie, même si c'est petit ?", type: "textarea", placeholder: "Un moment, une décision, un accomplissement qui te rappelle que tu es capable..." },
      { id: "message_monde", label: "Si tu pouvais dire UNE seule chose à toutes les personnes qui te ressemblaient il y a 1 an, ce serait quoi ?", type: "textarea", placeholder: "Le message que tu aurais aimé entendre quand tu hésitais encore..." },
    ],
  },
  {
    id: "cible",
    icon: "🎯",
    title: "Ta Cible Idéale",
    subtitle: "À qui tu t'adresses ?",
    questions: [
      { id: "cible_qui", label: "Tu souhaites aider qui exactement ?", type: "textarea", placeholder: "Ex : Les jeunes musulmans qui veulent se lancer dans le business en ligne, les mamans au foyer qui veulent un revenu complémentaire halal..." },
      { id: "cible_age", label: "Quelle tranche d'âge vises-tu ?", type: "multi", options: ["16-20 ans", "20-25 ans", "25-30 ans", "30-40 ans", "40+ ans"] },
      { id: "cible_genre", label: "Tu t'adresses plutôt à...", type: "select", options: ["Hommes uniquement", "Femmes uniquement", "Les deux", "Pas de préférence"] },
      { id: "cible_probleme", label: "Quel est le PLUS GROS problème de ta cible ?", type: "textarea", placeholder: "Ex : Ils ne savent pas comment gagner de l'argent en ligne de manière halal, ils sont perdus entre toutes les formations..." },
      { id: "cible_reve", label: "Quel est le rêve / la transformation que ta cible recherche ?", type: "textarea", placeholder: "Ex : Avoir une activité rentable en ligne tout en gardant leurs valeurs, quitter le salariat..." },
      { id: "cible_objection", label: "Quelle est la plus grande peur / objection de ta cible ?", type: "textarea", placeholder: "Ex : Peur que ce soit haram, peur de l'arnaque, peur de ne pas y arriver..." },
      { id: "cible_communaute", label: "Ta cible est-elle issue de la communauté musulmane ?", type: "select", options: ["Oui, exclusivement", "Principalement oui", "Pas forcément, mais valeurs compatibles"] },
    ],
  },
  {
    id: "personnalite",
    icon: "🎭",
    title: "Ta Personnalité en Ligne",
    subtitle: "L'image que tu veux véhiculer",
    questions: [
      {
        id: "archetype",
        label: "Quel type de personnalité veux-tu incarner sur les réseaux ?",
        type: "select",
        options: [
          "Le Mentor — Sage, expérimenté, bienveillant (style grand frère/grande sœur)",
          "Le Leader — Direct, cash, motivant, sans filtre",
          "L'Expert — Technique, précis, pédagogue, data-driven",
          "L'Inspirateur — Storytelling, émotions, parcours personnel",
          "Le Provocateur — Clivant, franc, qui secoue les consciences",
          "Le Proche — Accessible, humain, dans le quotidien",
        ],
      },
      { id: "ton", label: "Quel ton veux-tu adopter ?", type: "multi", options: ["Sérieux et professionnel", "Décontracté et accessible", "Motivant et énergique", "Authentique et vulnérable", "Humoristique", "Inspirant et spirituel"] },
      { id: "valeurs", label: "Quelles valeurs veux-tu transmettre ? (choisis les 3 principales)", type: "multi", options: ["Éthique / Halal", "Liberté financière", "Excellence / Travail acharné", "Famille", "Foi / Spiritualité", "Authenticité", "Entraide communautaire", "Ambition", "Discipline", "Impact positif"] },
      { id: "sujets_eviter", label: "Y a-t-il des sujets que tu veux absolument éviter ?", type: "textarea", placeholder: "Ex : Politique, sujets trop personnels, musique, mixité..." },
      { id: "modele", label: "Cite 2-3 créateurs qui t'inspirent (même hors de ta niche)", type: "textarea", placeholder: "Ex : Iman Gadzhi, Hormozi, un influenceur musulman..." },
    ],
  },
  {
    id: "contenu",
    icon: "🎬",
    title: "Ta Stratégie de Contenu",
    subtitle: "Comment tu vas créer",
    questions: [
      {
        id: "format_principal",
        label: "Quel format de vidéo te correspond le mieux ?",
        type: "select",
        options: [
          "Face caméra — Tu parles directement à la caméra (plus personnel, plus engageant)",
          "Voix off — On entend ta voix mais on ne te voit pas (plus anonyme, focus sur le contenu)",
          "B-rolls — Montage visuel sans toi à l'écran (cinématique, lifestyle)",
          "Mix face caméra + B-rolls (le plus recommandé pour la crédibilité)",
          "Mix voix off + B-rolls (bon compromis si tu ne veux pas te montrer)",
        ],
      },
      {
        id: "format_pourquoi",
        label: "Pourquoi ce format ? (sois honnête)",
        type: "select",
        options: [
          "Je suis à l'aise devant la caméra",
          "Je ne suis pas encore à l'aise mais je veux m'y mettre",
          "Je ne veux pas montrer mon visage (pudeur, anonymat...)",
          "Je veux tester et voir ce qui marche le mieux",
        ],
      },
      { id: "plateformes", label: "Sur quelles plateformes veux-tu publier ?", type: "multi", options: ["Instagram (Reels + Stories)", "TikTok", "YouTube (Shorts)", "YouTube (vidéos longues)", "LinkedIn"] },
      {
        id: "frequence",
        label: "À quel rythme es-tu capable de publier chaque semaine ?",
        type: "select",
        options: [
          "3 vidéos/semaine (le strict minimum pour être visible)",
          "5 vidéos/semaine (bon rythme de croissance)",
          "7 vidéos/semaine — 1 par jour (rythme normal d'un créateur sérieux)",
          "10 vidéos/semaine (rythme soutenu — croissance accélérée)",
          "14+ vidéos/semaine — 2 par jour (mode machine — croissance explosive)",
        ],
      },
      { id: "jour_creation", label: "Quel(s) jour(s) de la semaine prévois-tu pour créer ton contenu (batching) ?", type: "multi", options: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] },
      {
        id: "piliers",
        label: "Quels types de contenu veux-tu publier ? (choisis 3-4 piliers)",
        type: "multi",
        options: [
          "Éducatif — Tutos, astuces, valeur pure",
          "Inspirationnel — Ton parcours, citations, motivation",
          "Storytelling — Histoires personnelles, avant/après",
          "Preuve sociale — Résultats, témoignages",
          "Coulisses — Ton quotidien d'entrepreneur musulman",
          "Commercial — Présentation de tes services/offres",
          "Entertainment — Trends, humour, format viral",
          "Spirituel — Rappels, lien business & foi",
        ],
      },
      {
        id: "outils_montage",
        label: "Quel outil de montage vas-tu utiliser ?",
        type: "select",
        options: [
          "VN Video Editor (recommandé AL BARAKA — gratuit)",
          "CapCut (gratuit, facile)",
          "Adobe Premiere Pro / Final Cut",
          "DaVinci Resolve (gratuit, pro)",
          "Je ne sais pas encore",
        ],
      },
      {
        id: "sous_titres",
        label: "Quel outil pour les sous-titres ?",
        type: "select",
        options: [
          "Caption (recommandé — ~70€/an, qualité pro)",
          "CapCut (sous-titres automatiques gratuits)",
          "Sous-titres manuels",
          "Je ne sais pas encore",
        ],
      },
    ],
  },
  {
    id: "profil_prefs",
    icon: "📱",
    title: "Ton Profil Instagram & TikTok",
    subtitle: "Quelques préférences avant de générer",
    questions: [
      {
        id: "photo_profil",
        label: "Quel type de photo de profil vas-tu utiliser ?",
        type: "select",
        options: [
          "Photo professionnelle (visage, fond neutre ou lifestyle)",
          "Photo avec logo ou initiales",
          "Logo / monogramme uniquement",
          "Photo naturelle / authentique",
          "Je ne sais pas encore",
        ],
      },
      {
        id: "highlights",
        label: "Quels highlights (stories à la une) vas-tu créer ?",
        type: "multi",
        options: [
          "🎓 Qui suis-je / Mon parcours",
          "📚 Formations / Programmes",
          "💬 Témoignages / Résultats",
          "🎁 Ressource gratuite",
          "📞 Prendre RDV",
          "❓ FAQ",
          "🕌 Mes valeurs / Ma foi",
          "🎬 Coulisses",
        ],
      },
    ],
  },
];

export type BrandAnswers = Record<string, string | string[]>;

export function countAnsweredQuestions(answers: BrandAnswers): number {
  return Object.keys(answers).filter((k) => {
    const v = answers[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return !!v;
  }).length;
}

export function totalQuestions(): number {
  return BRAND_SECTIONS.reduce((acc, s) => acc + s.questions.length, 0);
}
