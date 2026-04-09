import type { Script } from "./types";

export const SETTING_SCRIPT: Script = {
  id: "setting-dm",
  nom: "Script DM Al Baraka",
  icon: "💬",
  couleur: "teal",
  cat: "messages",
  description: "Le parcours complet message par message — de l'approche à la qualification",
  phases: [
    {
      label: "Messages d'approche — Universels",
      voix: "enthousiasme",
      lines: [
        "#1 Identité directe",
        "« Salam aleykoum [Prénom] ! Je fais partie d'un écosystème d'accompagnement 100% halal créé pour les musulmans qui veulent entreprendre en ligne. Est-ce que c'est un sujet qui te parle ? »",
        "#2 Douleur décalage",
        "« Salam aleykoum [Prénom] ! Dis-moi franchement : t'as déjà ressenti ce décalage entre tes valeurs de musulman et ton environnement professionnel ? Je pose la question parce qu'on accompagne justement des frères et sœurs qui veulent sortir de cette situation. »",
        "#3 Communauté",
        "« Salam aleykoum [Prénom] ! Je suis tombé sur ton profil et je me suis dit que tu pourrais être intéressé : on a un écosystème d'accompagnement réservé aux musulmans qui veulent lancer leur activité en ligne. On est une vraie communauté. Ça te parle ? »",
      ],
    },
    {
      label: "Messages d'approche — Curiosité",
      voix: "curiosite",
      lines: [
        "#4 Curiosité AL BARAKA",
        "« Salam aleykoum [Prénom] ! T'as déjà entendu parler d'AL BARAKA ? C'est un écosystème d'accompagnement pour les musulmans qui veulent apprendre à entreprendre en ligne. On accompagne déjà plusieurs frères et sœurs. Je me suis dit que ça pourrait te parler ? »",
        "#8 Teasing mystère",
        "« Salam aleykoum [Prénom] ! Je bosse avec un projet qui fait pas mal de bruit en ce moment dans la communauté musulmane. C'est un écosystème d'accompagnement en ligne 100% halal. T'en as déjà entendu parler ? »",
        "#9 Question inversée",
        "« Salam aleykoum [Prénom] ! Petite question : si un écosystème d'accompagnement créé par et pour des musulmans pour apprendre à entreprendre en ligne existait — tu voudrais en faire partie ou c'est pas ton délire ? »",
        "→ Recommandation : commence par le #4 ou le #13. Ce sont les plus naturels.",
      ],
    },
    {
      label: "Messages d'approche — Ciblés",
      voix: "empathie",
      lines: [
        "#5 Parent",
        "« Salam aleykoum [Prénom] ! Je me permets de te contacter parce qu'on accompagne des parents musulmans qui veulent créer une source de revenus en ligne, halal, pour mieux subvenir aux besoins de leur famille — tout ça à côté du boulot. C'est quelque chose qui te parle ? »",
        "#6 Expatriation",
        "« Salam aleykoum [Prénom] ! T'as déjà pensé à t'expatrier ou à avoir une activité qui te permet de travailler de n'importe où ? On a un écosystème d'accompagnement pour les musulmans qui veulent se créer leur activité en ligne de manière halal. Ça te parle ? »",
        "#7 Profil ciblé",
        "« Salam aleykoum [Prénom] ! J'ai vu que tu suivais [compte/sujet]. Je me suis dit que tu pourrais être intéressé par l'écosystème AL BARAKA : on aide des musulmans sur diverses compétences digitales comme la création d'offre, la vente, le personal branding — le tout dans un cadre halal et éthique. C'est quelque chose qui pourrait t'intéresser ? »",
      ],
    },
    {
      label: "Messages d'approche — Fraternels",
      voix: "sincerite",
      lines: [
        "#10 Contre-pied",
        "« Salam aleykoum [Prénom] ! Je vais être honnête avec toi : je suis pas là pour te faire perdre ton temps. Je fais partie d'un écosystème qui s'appelle AL BARAKA — on fait des accompagnements pour les musulmans qui souhaitent entreprendre en ligne. Je voulais juste savoir si c'est un sujet qui t'intéressait ? »",
        "#11 Recommandation",
        "« Salam aleykoum [Prénom] ! J'ai découvert un écosystème d'accompagnement qui s'appelle AL BARAKA, c'est pensé pour les musulmans qui veulent apprendre à entreprendre en ligne de manière halal. Je le recommande autour de moi parce que ça vaut vraiment le coup. C'est une chose qui peut t'intéresser ? »",
        "#12 Partage naturel",
        "« Salam aleykoum [Prénom] ! Je sais pas si t'es au courant mais il y a un écosystème d'accompagnement en ligne qui commence à bien se développer dans la communauté musulmane — ça s'appelle AL BARAKA. J'en fais partie. T'en as déjà entendu parler ? »",
        "#13 Bouche-à-oreille",
        "« Salam aleykoum [Prénom] ! Est-ce que t'as déjà entendu parler d'AL BARAKA ? C'est un écosystème d'accompagnement créé pour les musulmans qui veulent entreprendre en ligne de manière halal. Ça commence à bien tourner, je me suis dit que ça pourrait t'intéresser ? »",
      ],
    },
    {
      label: "Étape 1 — Connexion",
      voix: "sincerite",
      lines: [
        "Le prospect a répondu positivement. Avant toute qualification, on s'intéresse à LUI.",
        "« Ah top ça fait plaisir ! Déjà c'est quoi ton prénom ? Moi c'est [Prénom], enchanté ! »",
        "« Enchanté [Prénom] ! Et t'habites où ? »",
        "Tu rebondis sur ce qu'il te dit. Sois toi-même.",
      ],
      cases: [
        { type: "pos", label: "S'il est en France", lines: ["« Ah [ville], beau coin ! T'es là-bas depuis longtemps ? »"] },
        { type: "pos", label: "S'il est au Maghreb / expatrié", lines: ["« Ah t'es au bled ! T'es de là-bas à la base ou t'es parti de France ? »"] },
        { type: "pos", label: "S'il est étudiant", lines: ["« Ah ok ! T'études quoi du coup ? Ça te plaît ? »"] },
        { type: "pos", label: "S'il est salarié", lines: ["« Ok je vois ! Et ça te plaît ce que tu fais ou t'aimerais autre chose ? »"] },
        { type: "pos", label: "S'il est parent", lines: ["« Ah mashAllah ! T'as combien d'enfants ? Qu'Allah te les préserve ! »"] },
        { type: "pos", label: "S'il mentionne la hijra", lines: ["« Ah c'est un beau projet ! T'as déjà une destination en tête ou t'es encore en réflexion ? »"] },
      ],
      lines2: [
        "→ 2-4 messages de small talk max. L'objectif c'est créer un minimum de lien avant de parler business.",
      ],
    },
    {
      label: "Étape 2 — Situation",
      voix: "curiosite",
      lines: [
        "« En tout cas [Prénom], content d'échanger avec toi ! Du coup dis-moi, tu fais quoi dans la vie actuellement ? »",
        "→ Si le prospect a DÉJÀ dit ce qu'il fait pendant le small talk, ne repose pas la question. Rebondis directement vers le budget.",
      ],
    },
    {
      label: "Étape 3 — Temps",
      voix: "raison",
      lines: [
        "« Ok je vois ! Et dis-moi, t'aurais au minimum 2h par jour à consacrer à un projet à côté ? »",
        "→ Si non → disqualifier proprement.",
      ],
    },
    {
      label: "Étape 4 — Budget",
      voix: "curiosite",
      lines: [
        "Tu qualifies la capacité financière SANS jamais parler de prix.",
        "« Ok nickel. Et au niveau financier, est-ce que t'arrives à mettre un peu de côté chaque mois actuellement ? »",
      ],
      cases: [
        {
          type: "pos",
          label: "Si oui → Creuser",
          lines: [
            "« Tu arrives à combien à peu près chaque mois ? »",
            "→ 300-500€/mois de côté = Pass en facilités faisable. 50€/mois + 0€ d'économies = compliqué pour 2 500€.",
          ],
        },
        {
          type: "neg",
          label: "Si « non pas du tout »",
          lines: [
            "« Ok et en termes d'économies t'as un peu de côté quand même ? »",
            "→ Dernière chance. Si vraiment rien → disqualifier.",
          ],
        },
      ],
    },
    {
      label: "Étape 5 — Mindset investissement",
      voix: "certitude",
      lines: [
        "« Ok nickel. Et dernière chose [Prénom] — est-ce que pour toi ça fait sens d'investir dans le développement de compétences pour créer une activité en ligne ? Ou t'es plutôt du genre à chercher des solutions gratuites ? »",
        "→ « oui clairement » = bon prospect. « gratuit » → disqualifier.",
      ],
      cases: [
        {
          type: "neg",
          label: "Si pas qualifié (à n'importe quelle étape)",
          lines: [
            "« Ok écoutes [Prénom], j'ai apprécié échanger avec toi. Pour l'instant c'est pas le bon timing mais garde mon contact — quand ta situation change, n'hésite pas à revenir vers moi inch'Allah. Qu'Allah te facilite ! »",
          ],
        },
      ],
    },
    {
      label: "Option A — Conférence du dimanche",
      voix: "enthousiasme",
      lines: [
        "Le prospect est qualifié. Tu le diriges vers la conférence privée gratuite du dimanche à 11H.",
        "« Ok parfait, c'est bon pour moi du coup [Prénom] ! Chaque dimanche à 11H on organise une conférence privée gratuite — c'est là que tu comprendras exactement comment fonctionne l'écosystème et ce qu'on peut t'apporter. T'es dispo ce dimanche ? »",
      ],
      cases: [
        {
          type: "pos",
          label: "Si oui → Intégration",
          lines: [
            "« Top ! Je vais t'envoyer le lien pour rejoindre le groupe WhatsApp de la conférence. Sois bien connecté(e) dimanche à 11H car le lien sera envoyé dans le groupe 5 minutes avant. Tu veux un rappel la veille ? »",
          ],
        },
        {
          type: "neg",
          label: "Si non → Proposer un appel",
          lines: [
            "« Pas de soucis ! Dans ce cas ce que je peux te proposer c'est un appel rapide d'une dizaine de minutes pour t'expliquer comment ça fonctionne de vive voix. Ça te dit ? »",
            "→ Si oui, basculer vers l'Option B (appel découverte).",
          ],
        },
      ],
      lines2: [
        "→ Après l'intégration → envoyer le lead magnet (quiz ou guide PDF) pour maintenir l'engagement en attendant dimanche.",
      ],
    },
    {
      label: "Option B — Appel découverte",
      voix: "curiosite",
      lines: [
        "« Ok parfait, c'est bon pour moi du coup [Prénom] ! Ce que je te propose c'est un appel rapide d'une dizaine de minutes — on fait connaissance de vive voix et je t'explique comment fonctionne l'écosystème en détail. Ça te dit ? »",
      ],
      cases: [
        {
          type: "pos",
          label: "Si oui",
          lines: ["« Top ! Tu préfères qu'on se fixe un créneau ou t'es disponible maintenant ? »"],
        },
        {
          type: "pos",
          label: "Si disponible maintenant",
          lines: ["« OK laisse-moi ton numéro, je t'appelle sur WhatsApp. »"],
        },
        {
          type: "pos",
          label: "Si pas disponible",
          lines: [
            "« Pas de soucis, tu serais dispo quand ? Plutôt demain ou après-demain ? Matin ou après-midi ? »",
            "→ Verrouiller l'heure précise.",
          ],
        },
        {
          type: "neg",
          label: "Si refuse l'appel",
          lines: [
            "« Aucun souci [Prénom], je comprends. Si jamais tu changes d'avis, n'hésite pas à me recontacter. Qu'Allah te facilite ! »",
            "→ Ne pas insister. Il n'est pas prêt.",
          ],
        },
      ],
      lines2: [
        "« C'est noté [Prénom] ! [Jour] à [heure] sur WhatsApp. Je t'appellerai pile à l'heure inch'Allah. À très vite ! »",
      ],
    },
    {
      label: "Relances",
      voix: "sincerite",
      lines: [
        "RELANCES CONFÉRENCE",
        "Rappel vendredi : « Salam [Prénom] ! T'es toujours chaud(e) pour la conférence de dimanche ? On commence à 11H pile, sois là du début à la fin inch'Allah tu vas kiffer ! »",
        "Rappel samedi soir : « Salamou 'alaykoum [Prénom] ! Petit rappel : c'est demain dimanche à 11H. Tu recevras le lien dans le groupe WhatsApp inshaAllah. Sois présent(e) du début à la fin pour profiter de la valeur ! »",
        "Rappel dimanche matin : « Salamou 'alaykoum [Prénom] ! C'est aujourd'hui — 11H. Regarde bien les vidéos dans le groupe inshaAllah c'est important ! À tout à l'heure ! »",
        "",
        "RELANCES APPEL",
        "Rappel 1H avant : « Salam [Prénom] ! On est toujours bon pour notre appel à [heure] ? »",
        "Si no-show : « Salam [Prénom] ! J'ai essayé de t'appeler à [heure] mais t'as pas décroché. Pas de soucis, dis-moi quand tu serais dispo pour qu'on se recale ça inch'Allah. »",
        "→ Maximum 1 report. Si 2ème no-show → passer au prospect suivant.",
        "",
        "RELANCES GÉNÉRALES",
        "Pas de réponse J+2 : « ah bah mon message est passé aux oubliettes à ce que je vois mdr t'es toujours là ? »",
        "Après envoi lead magnet J+3 : « Salam [Prénom] ! T'as eu le temps de regarder le guide/quiz que je t'ai envoyé ? T'en as pensé quoi ? »",
        "→ Règle d'or : maximum 3 relances par prospect. Au-delà, tu perds ta crédibilité.",
      ],
    },
    {
      label: "Lead Magnets",
      voix: "evidence",
      lines: [
        "Le Quiz AL BARAKA",
        "« Quelle compétence digitale est faite pour toi ? » — 7 questions → résultat personnalisé → CTA conférence.",
        "« En attendant la conférence, je t'envoie un petit quiz qui va t'aider à identifier quelle compétence te correspond le mieux. Ça te dit ? »",
        "",
        "Le Guide PDF",
        "Guide des compétences AL BARAKA — présente les formations et l'écosystème.",
        "« Je t'envoie un guide qui t'explique les différentes compétences qu'on enseigne chez AL BARAKA. Ça te donnera une idée plus claire avant la conférence. »",
      ],
    },
    {
      label: "Suivi post-conférence / post-appel",
      voix: "sincerite",
      lines: [
        "APRÈS LA CONFÉRENCE",
      ],
      cases: [
        {
          type: "pos",
          label: "Si présent — Suivi immédiat",
          lines: [
            "« Salamou 'alaykoum [Prénom] ! J'espère que la conférence t'a plu. T'en as pensé quoi ? Qu'est-ce qui t'a le plus marqué ? »",
            "→ Objectif : identifier s'il est chaud pour un appel de closing.",
          ],
        },
        {
          type: "neg",
          label: "Si absent",
          lines: [
            "« Salamou 'alaykoum [Prénom], t'as pu être présent hier ? Sinon je peux t'envoyer la rediffusion. Dis-moi si ça te va ? Par contre il faudra me faire un retour avant demain midi si tu souhaites bénéficier de l'offre. »",
            "→ Maximum 2 absences. Au-delà, passer au prospect suivant.",
          ],
        },
        {
          type: "pos",
          label: "Si intéressé → Fixer l'appel de closing",
          lines: [
            "« Top [Prénom] ! Je vois que t'es motivé(e). Ce que je te propose c'est un appel rapide avec un coach de l'équipe pour répondre à tes questions et voir ce qui te correspond le mieux. T'es dispo dans la journée ? Plutôt le matin ou l'après-midi ? »",
          ],
        },
      ],
      lines2: [
        "APRÈS L'APPEL DÉCOUVERTE",
      ],
      cases2: [
        {
          type: "pos",
          label: "Si chaud → Conférence ou closing",
          lines: [
            "« Top [Prénom] ! Content qu'on ait pu échanger. Du coup comme on en a parlé, je t'intègre au groupe WhatsApp pour la conférence de dimanche à 11H. Tu vas pouvoir voir l'écosystème en détail inch'Allah ! »",
            "→ Si le prospect est déjà très chaud, tu peux le diriger directement vers un appel de closing avec un coach.",
          ],
        },
        {
          type: "pos",
          label: "Si tiède",
          lines: [
            "« Pas de soucis [Prénom], prends le temps de digérer tout ça. En attendant je t'envoie un petit guide pour que tu puisses y voir plus clair. On se reparle bientôt inch'Allah ! »",
            "→ Envoyer le lead magnet + relancer dans 2-3 jours.",
          ],
        },
        {
          type: "neg",
          label: "Si non",
          lines: [
            "« Je comprends [Prénom], c'est pas un souci. En tout cas j'ai apprécié notre échange. Si un jour tu changes d'avis, tu sais où me trouver. Qu'Allah te facilite ! »",
          ],
        },
      ],
    },
    {
      label: "Règles d'or du setting",
      voix: "raison",
      lines: [
        "1. L'objectif du DM c'est d'amener à la conférence ou à un appel — PAS de vendre.",
        "2. Ne JAMAIS donner le prix par message.",
        "3. Ne JAMAIS expliquer tout le business model par message.",
        "4. Maximum 3 relances. Au-delà, tu perds ta crédibilité.",
        "5. Chaque message a un objectif précis : connecter → qualifier → inviter.",
        "6. Sois HUMAIN. Pas de copier-coller. Adapte chaque message au profil.",
        "7. Le VOCAL est toujours plus puissant que le texte. Privilégie-le.",
        "8. La conférence a lieu le DIMANCHE à 11H.",
        "9. Une objection = un manque d'info ou de confiance. Voir le guide des objections DM.",
        "10. La CONNEXION d'abord. La qualification ensuite. Jamais l'inverse.",
      ],
    },
  ],
};
