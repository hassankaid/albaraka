/**
 * Outil 8 — Script de setting (étape 12, après « Créez votre script de setting »).
 * Il n'existait pas d'outil de setting à adapter : il est construit sur la structure
 * des scripts DM d'AL BARAKA (décision 4A de Sidali, 16/10/2026) — premier contact,
 * lien, qualification sans prix, invitation à l'appel, objections avec C.A.R.E.,
 * relances —, adaptée à l'offre de l'élève. Rien de propre à AL BARAKA : ni leads
 * froids ou chauds, ni commissions, ni conférence du dimanche, ni coachs.
 * Règles et questions : slides 225 à 228 du PowerPoint du parcours.
 */
import { lignes, ligneRemplie, liste, texte, type DefinitionOutil, type Ligne, type Profil, type SectionDoc } from "./modele";
import { cible, delai, nomOffre, problemesAvatar, promesseSpecifique, rappelAvatar, resultat } from "./partage";

/** Les règles du setting (slide 225), rappelées dans l'outil et dans le document. */
export const REGLES_SETTING = [
  "Un vocal dès le premier message.",
  "Jamais de prix donné pendant le setting.",
  "Des objections traitées avec la méthode C.A.R.E. (Clarifier, Accuser réception, Recadrer, Engager).",
  "2 relances au maximum après un silence (J+2, J+5), aucune après un refus clair.",
  "Quelques messages par jour, jamais en masse, pour protéger votre compte.",
  "Un appel de 20 minutes, 15 pour quelqu'un qui vous a écrit en premier.",
];

/** D'où vient la personne : le premier message part de ce qu'elle a vu ou fait. */
export const SITUATIONS_CONTACT = [
  "Elle a commenté une vidéo",
  "Elle a répondu à une story",
  "Elle vient de s'abonner",
  "Elle vous a écrit en premier",
  "Elle a regardé votre VSL",
];

const MODELES_CONTACT: Record<string, string> = {
  "Elle a commenté une vidéo": "Bonjour [Prénom], merci pour votre commentaire sur ma vidéo [sujet] ! Qu'est-ce qui vous a parlé dedans ?",
  "Elle a répondu à une story": "Merci pour votre réponse [Prénom] ! C'est quelque chose que vous vivez aussi en ce moment ?",
  "Elle vient de s'abonner": "Bonjour [Prénom], merci pour l'abonnement ! Qu'est-ce qui vous a amené jusqu'à mon compte ?",
  "Elle vous a écrit en premier": "Bonjour [Prénom], merci pour votre message ! Avec plaisir. Pour bien vous répondre, dites-m'en un peu plus : où en êtes-vous aujourd'hui ?",
  "Elle a regardé votre VSL": "Bonjour [Prénom], j'ai vu que vous aviez regardé ma vidéo. Qu'en avez-vous pensé ?",
};

/** Les objections les plus fréquentes en message, avec une réponse C.A.R.E. de départ. */
function objectionsDeDepart(p: Profil): Ligne[] {
  const objectionAvatar = texte(p, "avatar.objection");
  return [
    ...(objectionAvatar ? [{ objection: objectionAvatar }] : []),
    {
      objection: "« C'est combien ? »",
      clarifier: "Vous me demandez le prix pour savoir si c'est dans vos moyens ?",
      accuser: "C'est normal de vouloir le savoir.",
      recadrer: "Le prix dépend de votre situation : je préfère d'abord comprendre où vous en êtes, pour vous dire honnêtement si je peux vous aider.",
      engager: "On en parle 20 minutes au téléphone ? Si ce n'est pas fait pour vous, je vous le dirai.",
    },
    {
      objection: "« Envoyez-moi plutôt des infos par message »",
      clarifier: "Qu'est-ce que vous aimeriez savoir en priorité ?",
      accuser: "Je comprends, vous voulez y voir clair avant d'aller plus loin.",
      recadrer: "Chaque situation est différente : par message, je risque de vous donner des infos qui ne vous concernent pas.",
      engager: "En 20 minutes, je vous dis exactement ce qui marcherait pour vous. Plutôt demain ou après-demain ?",
    },
    {
      objection: "« Je n'ai pas le temps »",
      clarifier: "Pas le temps pour un appel, ou pas le temps de vous en occuper en ce moment ?",
      accuser: "Je comprends, vos journées sont déjà bien remplies.",
      recadrer: "Justement, l'appel sert à voir comment l'intégrer à votre emploi du temps, sans tout chambouler.",
      engager: "Vingt minutes, au moment qui vous arrange le mieux : le soir, ça vous irait ?",
    },
  ];
}

const objections = (p: Profil) => lignes(p, "setting.objections").filter(ligneRemplie);

export const outil8ScriptSetting: DefinitionOutil = {
  code: "liberty_script_setting",
  numero: 8,
  etape: "Étape 12",
  nom: "Script de setting",
  objectif: "Transformer les personnes qui vous écrivent en rendez-vous qualifiés, avec un script adapté à votre offre et aux mots de votre avatar.",
  fichier: "Liberty_Etape12_Script_setting",
  formats: ["docx", "pdf"],
  ecrans: [
    {
      titre: "Le premier contact",
      intro: "Partez de ce que la personne a vu ou fait : un commentaire, une story, un abonnement, un message. Une question ouverte, puis un vocal dès que possible.",
      champs: [
        {
          cle: "info.reglesSetting", type: "info", libelle: "",
          rendu: () => ({ ton: "alerte", titre: "Les règles du setting", texte: REGLES_SETTING.map((r) => `• ${r}`).join("\n") }),
        },
        {
          cle: "info.offreSetting", type: "info", libelle: "",
          rendu: (p) => {
            const l = [
              promesseSpecifique(p) ? `Votre promesse : ${promesseSpecifique(p)}` : "",
              nomOffre(p) ? `Votre offre : ${nomOffre(p)}` : "",
            ].filter(Boolean);
            return l.length ? { ton: "rappel", titre: "Repris des outils 2 et 3", texte: l.join("\n") } : null;
          },
        },
        {
          cle: "setting.premiersMessages", type: "blocs", nomBloc: "Premier message", ajout: "Ajouter une situation", initial: 3, max: 5,
          libelle: "Vos premiers messages",
          aide: "Un message par situation. Choisissez la situation : « Partir d'un modèle » recopie un exemple à adapter.",
          prerempli: () => SITUATIONS_CONTACT.slice(0, 3).map((situation) => ({ situation })),
          colonnes: [
            { cle: "situation", libelle: "La situation", type: "choix", options: SITUATIONS_CONTACT },
            { cle: "message", libelle: "Votre message", type: "long", modele: (l) => MODELES_CONTACT[l.situation ?? ""] ?? "", exemple: "Merci pour votre commentaire ! Qu'est-ce qui vous a parlé dans la vidéo ?" },
          ],
        },
        {
          cle: "setting.vocal", type: "long", libelle: "Votre premier vocal (30 secondes)",
          aide: "Le vocal crée la confiance : on entend une vraie personne. Remerciez, présentez-vous en une phrase, posez une question.",
          prerempli: (p) => `Bonjour [Prénom], c'est [votre prénom] ! Merci pour votre message. Je me permets un petit vocal, c'est plus simple. J'aide ${cible(p) || "[votre sous-niche]"} à ${resultat(p) || "[résultat]"}. Dites-moi : où en êtes-vous aujourd'hui avec ça ?`,
        },
      ],
    },
    {
      titre: "Créer le lien et qualifier",
      intro: "D'abord la personne, ensuite la qualification. 2 à 4 messages d'échange sincère, puis vos questions, sans jamais parler de prix.",
      champs: [
        {
          cle: "setting.lien", type: "liste", ajout: "Ajouter une question",
          libelle: "Vos questions pour créer le lien",
          aide: "Rebondissez sur ce qu'elle vous dit. Ne parlez pas encore de votre offre.",
          prerempli: () => ["Ah super ! Et vous êtes d'où ?", "Et dans la vie, vous faites quoi ?", "Ça vous plaît ou vous aimeriez autre chose ?"],
          exemple: "Vous avez des enfants ?",
        },
        { cle: "info.avatarSetting", type: "info", libelle: "", rendu: rappelAvatar },
        {
          cle: "setting.qualification", type: "liste", ajout: "Ajouter une question",
          libelle: "Vos questions de qualification",
          aide: "Elles vérifient que la personne a le problème que vous réglez, l'envie de le régler maintenant, et l'état d'esprit pour investir. Sans prix.",
          prerempli: () => [
            "Où en êtes-vous aujourd'hui avec [votre sujet] ?",
            "C'est une priorité pour vous de régler ça dans les prochaines semaines ?",
            "Vous auriez du temps à y consacrer chaque semaine ?",
            "Pour vous, ça a du sens d'investir pour être accompagné, ou vous cherchez plutôt des solutions gratuites ?",
          ],
        },
        {
          cle: "setting.decouverte", type: "liste", ajout: "Ajouter une question",
          libelle: "Vos questions pour faire ressortir le problème",
          aide: "Avec les mots de votre avatar. Notez ses réponses mot pour mot : elles nourrissent vos contenus et votre script de closing.",
          prerempli: () => [
            "Quel est votre plus gros problème aujourd'hui ? Depuis quand ?",
            "Qu'avez-vous déjà essayé ? Pourquoi ça n'a pas marché ?",
            "Que se passerait-il si rien ne changeait d'ici 6 mois ?",
            "À quoi ressemblerait la situation idéale pour vous ?",
          ],
        },
        {
          cle: "setting.nonQualifie", type: "long", libelle: "Si la personne n'est pas qualifiée",
          aide: "Avec respect, sans fermer la porte.",
          prerempli: () => "J'ai apprécié échanger avec vous. Pour l'instant, je ne pense pas être la bonne personne pour vous aider, et je préfère vous le dire franchement. Si votre situation change, n'hésitez pas à revenir vers moi.",
        },
      ],
    },
    {
      titre: "L'invitation à l'appel",
      intro: "La personne est qualifiée : proposez l'appel de 20 minutes. Le prix ne se donne jamais par message.",
      champs: [
        {
          cle: "setting.transition", type: "long", libelle: "Votre transition vers l'appel",
          prerempli: (p) => `D'après ce que vous me dites, je pense pouvoir vous aider à ${resultat(p) || "[résultat]"}${delai(p) ? ` en ${delai(p)}` : ""}. Le plus simple, c'est qu'on en parle 20 minutes au téléphone : je vous pose quelques questions, et je vous dis honnêtement si je peux vous aider. Vous seriez disponible plutôt demain ou après-demain ?`,
        },
        {
          cle: "setting.creneau", type: "long", libelle: "Fixer le créneau",
          aide: "Proposez deux choix précis, puis verrouillez le jour et l'heure.",
          prerempli: () => "Plutôt le matin ou l'après-midi ? … Parfait, c'est noté : [jour] à [heure]. Je vous appelle sur WhatsApp, à très vite !",
        },
        {
          cle: "info.prixSetting", type: "info", libelle: "",
          rendu: () => ({ ton: "alerte", titre: "Jamais de prix par message", texte: "Le prix se présente en appel, une fois que vous avez compris la situation de la personne et qu'elle a vu comment vous pouvez l'aider." }),
        },
        {
          cle: "setting.prix", type: "long", libelle: "Votre réponse quand on vous demande le prix",
          prerempli: () => "Ça dépend vraiment de votre situation : je préfère d'abord comprendre où vous en êtes, pour vous dire si je peux vous aider et comment. C'est justement l'objet de l'appel. Et si ce n'est pas fait pour vous, je vous le dirai. Ça vous va ?",
        },
        {
          cle: "setting.refusAppel", type: "long", libelle: "Si la personne refuse l'appel",
          aide: "On n'insiste pas : elle n'est pas prête.",
          prerempli: () => "Aucun souci, je comprends. Si jamais vous changez d'avis, n'hésitez pas à me réécrire. Belle journée à vous !",
        },
      ],
    },
    {
      titre: "Les objections",
      intro: "Une objection, c'est un manque d'information ou de confiance, pas un refus. On ne se justifie pas : on clarifie, on accuse réception, on recadre, et on ramène vers l'appel.",
      champs: [
        {
          cle: "info.care", type: "info", libelle: "",
          rendu: () => ({ ton: "rappel", titre: "La méthode C.A.R.E.", texte: "Clarifier : une question pour comprendre ce qu'il y a derrière.\nAccuser réception : montrer que vous avez compris.\nRecadrer : ramener à ce qui compte vraiment pour elle.\nEngager : proposer l'étape suivante, l'appel." }),
        },
        {
          cle: "setting.objections", type: "blocs", nomBloc: "Objection", ajout: "Ajouter une objection", max: 10,
          libelle: "Vos réponses aux objections de votre niche",
          aide: "La première reprend l'objection de votre avatar (outil 1). Ajoutez celles que vous entendez vraiment.",
          prerempli: objectionsDeDepart,
          colonnes: [
            { cle: "objection", libelle: "L'objection", type: "court", exemple: "« J'ai déjà essayé, ça n'a pas marché »" },
            { cle: "clarifier", libelle: "Clarifier", type: "long", exemple: "Qu'est-ce que vous aviez essayé exactement ?" },
            { cle: "accuser", libelle: "Accuser réception", type: "long", exemple: "Je comprends votre méfiance après ça." },
            { cle: "recadrer", libelle: "Recadrer", type: "long", exemple: "Ce qui change ici, c'est que vous n'êtes pas seul : on vous suit chaque semaine." },
            { cle: "engager", libelle: "Engager", type: "long", exemple: "On en parle 20 minutes pour voir si c'est différent pour vous ?" },
          ],
        },
      ],
    },
    {
      titre: "Relances et confirmation",
      intro: "2 relances au maximum après un silence, aucune après un refus clair. Une fois l'appel fixé : la confirmation avec la vidéo avant l'appel, et un rappel.",
      apercu: true,
      champs: [
        {
          cle: "setting.relance1", type: "long", libelle: "Relance 1 (J+2, sans réponse)",
          aide: "Un ton léger, jamais insistant.",
          prerempli: () => "Je reviens vers vous [Prénom] : mon message est peut-être passé à la trappe. Toujours d'accord pour en parler ?",
        },
        {
          cle: "setting.relance2", type: "long", libelle: "Relance 2 (J+5, la dernière)",
          prerempli: () => "Dernier petit message de ma part : si ce n'est pas le bon moment, aucun souci. Je reste disponible si besoin, belle journée !",
        },
        {
          cle: "setting.confirmation", type: "long", libelle: "Message de confirmation de l'appel",
          aide: "Avec le lien de votre vidéo avant l'appel (outil 4) : la personne arrive préparée.",
          prerempli: (p) => `C'est noté pour [jour] à [heure] ! D'ici là, regardez cette courte vidéo, elle vous aidera à profiter au maximum de notre appel : ${texte(p, "liens.videoAvantAppel") || "[lien de votre vidéo avant l'appel]"}`,
        },
        {
          cle: "setting.rappel", type: "long", libelle: "Rappel une heure avant",
          prerempli: () => "Bonjour [Prénom] ! On est toujours bon pour notre appel à [heure] ?",
        },
        {
          cle: "setting.absence", type: "long", libelle: "Si la personne ne répond pas à l'appel",
          aide: "Un seul report. À la deuxième absence, passez à la personne suivante.",
          prerempli: () => "Bonjour [Prénom], j'ai essayé de vous appeler à [heure] mais je n'ai pas réussi à vous joindre. Pas de souci : dites-moi quand vous seriez disponible pour qu'on recale ça.",
        },
      ],
    },
  ],
  document: (p: Profil) => {
    const premiers = lignes(p, "setting.premiersMessages").filter((l) => (l.message ?? "").trim());
    const sections: SectionDoc[] = [
      {
        titre: "Votre offre",
        blocs: [
          { t: "phrase", libelle: "Votre promesse", valeur: promesseSpecifique(p) },
          { t: "champ", libelle: "Votre offre", valeur: nomOffre(p) },
          { t: "liste", libelle: "Les problèmes de votre avatar", items: problemesAvatar(p) },
          { t: "liste", libelle: "Les règles", items: REGLES_SETTING },
        ],
      },
      {
        titre: "1. Le premier contact",
        blocs: [
          ...(premiers.length
            ? premiers.map((l) => ({ t: "champ" as const, libelle: l.situation || "Premier message", valeur: l.message ?? "" }))
            : [{ t: "champ" as const, libelle: "Premier message", valeur: "" }]),
          { t: "phrase", libelle: "Votre premier vocal", valeur: texte(p, "setting.vocal") },
        ],
      },
      {
        titre: "2. Créer le lien",
        blocs: [{ t: "liste", items: liste(p, "setting.lien") }],
      },
      {
        titre: "3. Qualifier, sans parler de prix",
        blocs: [
          { t: "liste", libelle: "Vos questions de qualification", items: liste(p, "setting.qualification") },
          { t: "liste", libelle: "Pour faire ressortir le problème", items: liste(p, "setting.decouverte") },
          { t: "champ", libelle: "Si la personne n'est pas qualifiée", valeur: texte(p, "setting.nonQualifie") },
        ],
      },
      {
        titre: "4. L'invitation à l'appel",
        blocs: [
          { t: "phrase", libelle: "Votre transition", valeur: texte(p, "setting.transition") },
          { t: "champ", libelle: "Fixer le créneau", valeur: texte(p, "setting.creneau") },
          { t: "champ", libelle: "Quand on vous demande le prix", valeur: texte(p, "setting.prix") },
          { t: "champ", libelle: "Si la personne refuse l'appel", valeur: texte(p, "setting.refusAppel") },
        ],
      },
      {
        titre: "5. Les objections (C.A.R.E.)",
        blocs: objections(p).length
          ? objections(p).map((o) => ({
              t: "tableau" as const,
              colonnes: [o.objection || "Objection", ""],
              lignes: [
                ["Clarifier", o.clarifier ?? ""],
                ["Accuser réception", o.accuser ?? ""],
                ["Recadrer", o.recadrer ?? ""],
                ["Engager", o.engager ?? ""],
              ],
            }))
          : [{ t: "tableau", colonnes: ["Objection", ""], lignes: [["Clarifier", ""], ["Accuser réception", ""], ["Recadrer", ""], ["Engager", ""]] }],
      },
      {
        titre: "6. Relances et confirmation",
        blocs: [
          { t: "champ", libelle: "Relance 1 (J+2)", valeur: texte(p, "setting.relance1") },
          { t: "champ", libelle: "Relance 2 (J+5)", valeur: texte(p, "setting.relance2") },
          { t: "champ", libelle: "Confirmation de l'appel", valeur: texte(p, "setting.confirmation") },
          { t: "champ", libelle: "Rappel une heure avant", valeur: texte(p, "setting.rappel") },
          { t: "champ", libelle: "Si la personne ne répond pas", valeur: texte(p, "setting.absence") },
        ],
      },
    ];
    return { titre: "Script de setting", sections };
  },
};
