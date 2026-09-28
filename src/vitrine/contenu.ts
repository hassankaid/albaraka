// ─────────────────────────────────────────────────────────────────────────
// Les textes du site vitrine — repris MOT POUR MOT du cahier des charges de
// Sidali (« Intégration du site vitrine AL BARAKA Écosystème », v1.0 du
// 25/09/2026, chapitres 4, 6 et 7).
//
// Le cahier est formel : « Les textes sont définitifs : les reprendre mot pour
// mot. » Ils vivent donc tous ici, et `contenu.test.ts` vérifie que chacun
// figure tel quel dans le document d'origine (`__fixtures__/cahier-site-v1.txt`).
// Une retouche, même d'une apostrophe, fait échouer le test : c'est voulu.
//
// Les mots entre {accolades} s'affichent en or. C'est la convention du cahier
// lui-même, reprise telle quelle pour que la comparaison reste littérale ;
// `<Or>` les transforme à l'affichage, les accolades n'apparaissent jamais.
//
// Seule exception : les cartes de témoignages, que le cahier laisse
// « [à fournir par Sidali] ». Elles vivent dans `temoignages.ts`.
// ─────────────────────────────────────────────────────────────────────────

export const MENU = {
  liens: [
    { ancre: "histoire", libelle: "Notre histoire" },
    { ancre: "mission", libelle: "Notre mission" },
    { ancre: "retours", libelle: "Les retours de nos membres" },
  ],
  bouton: "Prendre rendez-vous",
  boutonMobile: "Réserver un appel",
  signature: "ÉCOSYSTÈME BY ETHICARENA",
} as const;

export const ACCUEIL = {
  etiquette: "Formation & accompagnement entrepreneurial",
  etiquetteMobile: "Accompagnement entrepreneurial",
  titre: "Bâtissez une activité qui vous {ressemble.}",
  sousTitre:
    "Un accompagnement d’exception pour construire, lancer et développer votre activité digitale, de l’offre jusqu’à la vente.",
  boutonPrincipal: "Prendre rendez-vous",
  boutonSecondaire: "Notre histoire",
  preuveForte: "Plus de 340 membres",
  preuveSuite: "font confiance à AL BARAKA",
  pastille: "340+",
} as const;

export const HISTOIRE = {
  etiquette: "Notre histoire",
  titre: "Née sur le terrain, {bâtie avec exigence.}",
  nom: "Sidali",
  fonction: "Fondateur d’AL BARAKA Écosystème",
  paragraphes: [
    "Avant AL BARAKA, Sidali est lui aussi passé par le salariat. Son parcours dans le digital ressemble au vôtre : il s’est formé à de multiples compétences, les a pratiquées, puis a évolué sur le terrain jusqu’à devenir coach prestataire pour des centres de formation. Il a ensuite décidé de créer son propre accompagnement, adapté aux musulmans et à notre foi.",
    "Plus de 4 ans plus tard, il a accompagné plusieurs centaines de musulmans dans la construction de leur activité en ligne. AL BARAKA Écosystème est né de cette expérience : transmettre ce qui fonctionne vraiment.",
  ],
  signature: "Sidali",
  // `or` : la partie du chiffre affichée en or (« + », « ans »).
  chiffres: [
    { valeur: "340", or: "+", libelle: "membres actifs", libelleMobile: "membres" },
    { valeur: "4 ", or: "ans", libelle: "d’expérience terrain", libelleMobile: "d’expérience" },
    { valeur: "9", or: "", libelle: "expertises enseignées", libelleMobile: "expertises" },
  ],
} as const;

export const MISSION = {
  etiquette: "Notre mission",
  phrase:
    "Transmettre des compétences concrètes, avec éthique, et accompagner chaque membre {jusqu’au résultat.}",
  piliers: [
    {
      icone: "maison",
      titre: "Construire",
      description: "Une offre claire et une identité de marque forte.",
      competences: "Création d’offre · Personal branding · Storytelling",
    },
    {
      icone: "cible",
      titre: "Attirer",
      description: "Une visibilité qualifiée, organique et payante.",
      competences: "Copywriting · Marketing digital · Community management · Media buying",
    },
    {
      icone: "coche",
      titre: "Convertir",
      description: "Transformer l’intérêt en clients, avec méthode et intégrité.",
      competences: "Setting · Closing",
    },
  ],
  engagements: [
    "Aucune promesse de gains",
    "Aucun système pyramidal",
    "Paiements échelonnés sans riba",
    "Sessions en direct chaque semaine",
  ],
} as const;

export const RETOURS = {
  etiquette: "Les retours",
  titre: "Ils nous ont fait {confiance.}",
  mention:
    "Témoignages authentiques de nos membres. Les résultats présentés leur sont propres et ne constituent pas une garantie.",
  consigneMobile: "Faites défiler pour voir les 10 témoignages",
} as const;

export const RENDEZ_VOUS = {
  etiquette: "Prendre rendez-vous",
  titre: "Parlons de {votre projet.}",
  texte:
    "Laissez vos coordonnées. Notre équipe vous recontacte pour convenir d’un échange et étudier votre projet avec vous.",
  pointsRassurants: [
    "Un échange personnalisé",
    "Une étude sérieuse de votre situation",
    "Des recommandations adaptées à votre projet et à votre profil",
  ],
} as const;

/** Chapitre 6. Les libellés de champs sont ceux du tableau du cahier. */
export const FORMULAIRE = {
  champs: {
    prenom: "Prénom",
    nom: "Nom",
    email: "Email",
    telephone: "Téléphone (WhatsApp)",
    situation: "Où en êtes-vous aujourd’hui ?",
  },
  situations: [
    "Je n’ai pas de compétence et je souhaite me former",
    "Je souhaite lancer mon activité autour de ma passion ou de ma compétence",
    "J’ai déjà une activité et je veux la développer",
  ],
  // Le consentement est découpé en trois morceaux parce que la parenthèse
  // s'affiche en petit (10 px) et que « politique de confidentialité » est un
  // lien. Recollés, ils redonnent exactement la phrase du cahier (testé).
  consentement: {
    avant: "J’accepte qu’AL BARAKA ",
    parenthese: "(by ETHICARENA L.L.C-FZ)",
    milieu: " utilise ces informations pour me recontacter, conformément à la ",
    lien: "politique de confidentialité",
    apres: ".",
  },
  bouton: "Demander un rendez-vous",
  // Le cahier en donne un seul, pour exemple ; les autres sont écrits sur son
  // modèle (courts, sans reproche). Ce ne sont pas des textes « définitifs ».
  erreurs: {
    prenom: "Merci d’indiquer votre prénom",
    nom: "Merci d’indiquer votre nom",
    email: "Merci d’indiquer un email valide",
    telephone: "Merci d’indiquer un numéro valide",
    situation: "Merci de choisir une réponse",
    consentement: "Merci de cocher cette case pour être recontacté",
    envoi: "L’envoi n’a pas abouti. Merci de réessayer dans un instant.",
  },
} as const;

/** Chapitre 7 — « Textes proposés, à valider par Sidali ». Repris tels quels. */
export const MERCI = {
  etiquette: "Demande reçue",
  titre: "Merci, {votre demande est bien reçue.}",
  texte:
    "Notre équipe étudie votre projet et vous recontacte très prochainement par WhatsApp ou par téléphone.",
  etapes: [
    "Nous étudions votre situation.",
    "Nous vous contactons pour convenir d’un échange.",
    "Nous définissons ensemble le parcours adapté à votre projet.",
  ],
  bouton: "Revoir les témoignages",
} as const;

export const PIED_DE_PAGE = {
  rappel: "Prendre rendez-vous →",
} as const;

/** Chapitre 8.2 et 8.3. */
export const REFERENCEMENT = {
  titre: "AL BARAKA Écosystème – Formation et accompagnement entrepreneurial",
  description:
    "Construisez, lancez et développez votre activité digitale avec un accompagnement éthique et exigeant. Plus de 340 membres accompagnés.",
  altPortrait: "Portrait de Sidali, fondateur d’AL BARAKA Écosystème",
  altLogo: "AL BARAKA Écosystème by Ethicarena",
} as const;
