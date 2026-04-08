export interface ScriptCase {
  type: "pos" | "neg";
  label: string;
  lines: string[];
}

export interface ScriptPhase {
  label: string;
  voix: string;
  lines: string[];
  cases?: ScriptCase[];
  lines2?: string[];
  cases2?: ScriptCase[];
}

export interface Script {
  id: string;
  nom: string;
  icon: string;
  couleur: string;
  cat: "messages" | "calls";
  description: string;
  phases: ScriptPhase[];
}

export const VOIX_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  raison: { label: "🧠 Voix de la raison", color: "text-slate-600 dark:text-slate-300", bgColor: "bg-slate-100 dark:bg-slate-800" },
  enthousiasme: { label: "🔥 Voix de l'enthousiasme", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  sincerite: { label: "💚 Voix de la sincérité", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  curiosite: { label: "🤔 Voix de la curiosité", color: "text-gold-500 dark:text-gold-300", bgColor: "bg-gold-100 dark:bg-gold-900/30" },
  mystere: { label: "🌙 Voix du mystère", color: "text-gold-600 dark:text-gold-300", bgColor: "bg-gold-100 dark:bg-gold-900/30" },
  empathie: { label: "💜 Voix de l'empathie", color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  certitude: { label: "💪 Voix de la certitude", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  evidence: { label: "✨ Voix de l'évidence", color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
};

export const SCRIPTS_SETTING: Script[] = [
  {
    id: "setting-rdv",
    nom: "Setting RDV",
    icon: "💬",
    couleur: "teal",
    cat: "messages",
    description: "Script pour la prise de rendez-vous téléphonique",
    phases: [
      {
        label: "Avant d'envoyer — ciblage",
        voix: "raison",
        lines: [
          "Cibler les bons profils AVANT d'envoyer.",
          "Le premier message doit être assez captivant pour susciter l'intérêt et générer une conversation.",
          "FAITES UN VOCAL — pas un message texte !"
        ]
      },
      {
        label: "1 — Vocal d'accroche",
        voix: "enthousiasme",
        lines: [
          "'Salamou 'alaykoum, moi c'est [prénom].'",
          "'Je travaille actuellement avec une équipe d'entrepreneurs et d'entrepreneuses et on essaye d'apporter des compétences utiles à la communauté pour l'aider à générer des revenus en ligne et potentiellement s'expatrier et quitter l'Europe car comme tu le sais c'est devenu compliqué.'",
          "'Est-ce que tu t'es déjà intéressé à ce genre d'activité ?'",
          "→ Attendre le OUI",
          "'En toute sincérité, je sais que ça ne va pas changer ta vie, mais j'ai une vidéo de 2-3 minutes sur un nouveau business model en ligne qui pourrait t'intéresser.'",
          "'Est-ce que t'es ok pour que je te l'envoie ? Tu me fais un retour juste après ?'",
          "→ Attendre le OUI et envoyer la vidéo"
        ]
      },
      {
        label: "2 — Après la vidéo",
        voix: "sincerite",
        lines: [
          "Attendre le retour. Si silence après 48h : relancer avec '?' uniquement."
        ],
        cases: [
          {
            type: "pos",
            label: "Si curiosité / 'Peux-tu m'en dire plus ?'",
            lines: [
              "'Bah écoute, je sais que la vidéo ne te dévoile pas tout et pour rester sincère, c'est voulu.'",
              "'En fait la réalité c'est qu'on ne peut pas expliquer tout un métier et tout un système par message, ce serait pas vraiment sérieux tu vois ?'",
              "'Mais si tu veux on peut en discuter de vive voix, ça te va ?'",
              "→ Attendre le OUI. Si non : souhaiter bonne journée et clôturer."
            ]
          },
          {
            type: "neg",
            label: "Si pas de réponse après 2 relances",
            lines: ["Clore proprement. Passer au profil suivant. Maximum 2 relances au total."]
          }
        ]
      },
      {
        label: "3 — Prise de RDV",
        voix: "curiosite",
        lines: [
          "[Voix curiosité] : 'Très bien, du coup dis-moi, c'est quoi ton prénom ?'",
          "[Voix sincérité] : 'Très bien [Prénom], ce que je peux te proposer, c'est un petit appel de quelques minutes comme ça on fait rapidement connaissance et je t'explique le métier, ça te va ?'",
          "→ Attendre le OUI. Si non : bonne journée et clôturer."
        ],
        cases: [
          {
            type: "pos",
            label: "Si disponible maintenant",
            lines: ["'OK, laisse-moi ton numéro stp, je vais t'appeler sur WhatsApp si c'est ok pour toi.'"]
          },
          {
            type: "neg",
            label: "Si indisponible",
            lines: [
              "'OK, tu seras disponible à quelle heure aujourd'hui ? Comme ça je m'organise de mon côté pour prendre le temps de t'expliquer.'",
              "Verrouiller l'heure précise du rendez-vous."
            ]
          }
        ]
      }
    ]
  },
  {
    id: "setting-conf",
    nom: "Setting Conférence",
    icon: "📣",
    couleur: "teal",
    cat: "messages",
    description: "Script pour l'invitation à une conférence",
    phases: [
      {
        label: "Avant d'envoyer — ciblage",
        voix: "raison",
        lines: [
          "Cibler les bons profils AVANT d'envoyer.",
          "FAITES UN VOCAL — pas un message texte !"
        ]
      },
      {
        label: "1 — Vocal d'accroche conférence",
        voix: "enthousiasme",
        lines: [
          "'Salamou 'alaykoum, moi c'est [prénom].'",
          "'Je travaille actuellement avec une équipe d'entrepreneurs et d'entrepreneuses et on essaye d'apporter des compétences utiles à la communauté pour l'aider à générer des revenus en ligne et potentiellement s'expatrier et quitter l'Europe.'",
          "'Est-ce que tu t'es déjà intéressé à ce genre d'activité ?'",
          "→ Attendre le OUI",
          "'En toute sincérité, je sais que ça ne va pas changer ta vie, mais j'ai une vidéo de 2-3 minutes sur un nouveau business model qui pourrait t'intéresser.'",
          "'Est-ce que t'es ok pour que je te l'envoie ? Tu me fais un retour juste après ?'",
          "→ Attendre le OUI. Envoyer la vidéo."
        ]
      },
      {
        label: "2 — Après la vidéo + invitation",
        voix: "sincerite",
        lines: [
          "Attendre le retour. Si silence après 48h : relancer avec '?'."
        ],
        cases: [
          {
            type: "pos",
            label: "Si curiosité",
            lines: [
              "'Bah écoute je sais que la vidéo ne te dévoile pas tout et pour rester sincère, c'est voulu.'",
              "'En fait la réalité c'est qu'on ne peut pas expliquer tout un métier et tout un système par message, c'est pour ça qu'on prend le temps de faire une conférence remplie de valeur pour les personnes qui souhaitent vraiment apprendre quelque chose de sérieux. En plus, la conférence est gratuite.'",
              "'Est-ce tu souhaites prendre le temps d'y participer de ton côté ? C'est dimanche à 18H30 inshaAllah.'",
              "→ Attendre le OUI. Si non : bonne journée et clôturer."
            ]
          },
          {
            type: "neg",
            label: "Si pas de réponse après 2 relances",
            lines: ["Clore proprement. Maximum 2 relances au total."]
          }
        ]
      },
      {
        label: "3 — Qualification",
        voix: "curiosite",
        lines: [
          "[Voix curiosité] : 'Très bien, avant de t'intégrer à la conférence, dis-moi, c'est quoi ton prénom ?'",
          "'Et t'habites où au fait [Prénom] ?'",
          "'Et qu'est-ce qui t'intéresse dans une activité en ligne ?'",
          "'OK et tu fais quoi actuellement dans la vie ? Tu travailles ? T'es étudiant.e ?'",
          "Si flou : 'Comment subviens-tu à tes besoins actuellement ?'"
        ],
        cases: [
          {
            type: "pos",
            label: "Voir si le profil convient",
            lines: [
              "[Voix curiosité] : 'Ce qu'on propose demande d'être un minimum à l'aise avec les gens et le français, est-ce que c'est ton cas ?'",
              "'Et tu serais prêt.e à apprendre à utiliser les réseaux sociaux (même sans te montrer) ?'",
              "[Voix de l'évidence] : 'Je pense que tu le sais, on ne peut pas gagner sa vie sans fournir d'effort, de ton côté est-ce que t'aurais au moins 2H/Jour si ça peut te permettre d'aller chercher 1 000€ à la fin du mois ?'",
              "→ Attendre le OUI. Si non : bonne journée."
            ]
          },
          {
            type: "neg",
            label: "Si condition bloquante",
            lines: ["Clore respectueusement. Passer au profil suivant."]
          }
        ]
      },
      {
        label: "4 — Intégration groupe WhatsApp",
        voix: "sincerite",
        lines: [
          "[Voix sincérité] : 'Très bien, bah c'est parti [Prénom], tu peux me donner ton numéro pour que je puisse t'intégrer au groupe stp ?'",
          "Envoyer le lien du groupe privé.",
          "'Sois bien connecté [JOUR] à [XXH] car le lien de la conférence sera envoyé dans le groupe 5 minutes avant.'",
          "'C'est ok pour toi ? Est-ce que tu veux que je t'envoie un message de rappel 1h avant ?'",
          "Puis lui souhaiter une bonne journée et clôturer."
        ]
      }
    ]
  }
];

export const SCRIPTS_CLOSING: Script[] = [
  {
    id: "appel-ads",
    nom: "Appel Découverte Ads",
    icon: "📞",
    couleur: "gold",
    cat: "calls",
    description: "Script pour les prospects venant des publicités",
    phases: [
      {
        label: "Phase 1 — Connexion (15-20s)",
        voix: "enthousiasme",
        lines: [
          "Contrôler ses émotions avant l'appel. Les 4 premières secondes sont CAPITALES.",
          "'Salamou 'alaykoum, c'est bien [Prénom] ?'",
          "'C'est [ton prénom] de l'équipe de Sidali. Je t'appelle parce que t'as rempli un formulaire sur une de nos pubs pour créer une activité digitale. Ça te dit quelque chose ?'"
        ],
        cases: [
          { type: "pos", label: "Si oui / se souvient", lines: ["Ton décontracté et friendly — enchaîner directement sur Phase 2."] },
          { type: "neg", label: "Si ne se souvient pas", lines: ["'Ok, peut-être que tu as cliqué sur plusieurs pubs alors — qu'est-ce qui t'intéresses dans le fait de créer ton activité en ligne ?'"] },
          { type: "neg", label: "Si plus intéressé", lines: ["'Ok, et pourquoi t'as rempli le formulaire dans ce cas ? Qu'est-ce qui fait que ça ne t'intéresse plus aujourd'hui ?'"] }
        ]
      },
      {
        label: "Phase 2 — Accroche et contexte (30-45s)",
        voix: "curiosite",
        lines: [
          "'Cool ! Alors dis-moi, qu'est-ce qui t'a donné envie de remplir le formulaire ?'",
          "Écouter attentivement — créer la connexion.",
          "'Ok je vois... c'est la première fois que tu t'intéresses à créer une activité en ligne ou tu avais déjà regardé un peu avant ?'"
        ],
        cases: [
          {
            type: "neg",
            label: "Si demande 'vous proposez quoi exactement ?'",
            lines: [
              "'Justement, le but de mon appel c'est de te faire gagner du temps car de toute manière on ne peut pas expliquer tout un écosystème en 5 minutes. Moi mon rôle, c'est surtout de voir si ça peut te correspondre et si c'est le cas on t'invitera à notre conférence où on t'expliquera plusieurs business models.'",
              "'Je te pose encore quelques questions rapidement et comme ça je vois si ça peut te correspondre, c'est bon pour toi ?'"
            ]
          }
        ]
      },
      {
        label: "Phase 3A — Qualification situation + Budget",
        voix: "raison",
        lines: [
          "'Aujourd'hui tu fais quoi dans la vie ? Tu bosses, t'es étudiant, t'es entrepreneur ?'",
          "'Et ça va tu t'en sors ?' [Créer un climat de confiance]",
          "'T'arrives à mettre un peu de côté ? T'arrives à mettre autour de combien concrètement ?'",
          "'Ok, kheir inshaAllah, et en termes d'économies, aujourd'hui t'as combien de côté concrètement ?'"
        ],
        cases: [
          { type: "pos", label: "Si donne un chiffre", lines: ["'Pour résumer, si je comprends bien tu peux mobiliser environ [montant]€ — c'est bien ça ?'"] },
          { type: "neg", label: "Si chiffre bas (moins de 500€)", lines: ["'Ok, et ça c'est ce que t'as de disponible directement ou c'est ce que tu serais prêt à mettre si tu voyais une vraie opportunité ?'"] },
          { type: "neg", label: "Si évite de répondre", lines: ["'Je comprends, tout le monde n'est pas à l'aise à parler d'argent. Mais je te le demande parce que selon ta situation nos solutions sont pas forcément les mêmes. Donc concrètement aujourd'hui c'est quoi ton capital de départ ?'"] },
          {
            type: "neg",
            label: "Si demande le prix",
            lines: [
              "'Ça dépend — on a plusieurs formules et plusieurs programmes, donc ça n'aurait pas de sens de te donner un montant au hasard.'",
              "'Par contre ton budget, lui, il est ce qu'il est. Quand tu souhaites acheter une maison, tu sais ce que tu peux investir t'es d'accord ?'",
              "Pause. 'Donc concrètement aujourd'hui, c'est quoi ton budget ?'"
            ]
          }
        ]
      },
      {
        label: "Phase 3B — Maturité, temps et profil",
        voix: "raison",
        lines: [
          "Maturité : 'Pour toi, est-ce que ça a du sens d'investir en toi pour maîtriser des compétences qui te permettront de stabiliser 2 000€ dans les 6 prochains mois ?'",
          "Temps : 'Ok super. Et niveau temps, est-ce que t'aurais 2H-3H/jour à consacrer pour aller stabiliser au moins 2 000€ dans les 6 prochains mois ?'",
          "Profil : 'Et dans la vie de tous les jours, t'es plutôt à l'aise avec les gens ou pas du tout ?'",
          "'Et est-ce que tu serais prêt.e à apprendre à utiliser les réseaux sociaux pour développer ton activité ?'"
        ]
      },
      {
        label: "Phase 4 — Motivation + Pré-engagement",
        voix: "raison",
        lines: [
          "'Et aujourd'hui, qu'est-ce qui te motive le plus dans l'idée de créer une activité en ligne ?'",
          "[Pause — noter ses motivations principales]",
          "'Et ça fait combien de temps que tu as cette envie ?'",
          "'Ok je vois, ça fait un bout de temps. Effectivement il serait temps de commencer à construire quelque chose.'",
          "'Donc après la conférence de dimanche, tu serais prêt.e à t'engager sérieusement si tu vois quelque chose qui pourrait te permettre de stabiliser 2 000€ d'ici les 6 prochains mois ?'"
        ]
      },
      {
        label: "Phase 5 — Transition vers la Conférence",
        voix: "sincerite",
        lines: [
          "'Écoute [Prénom], t'as un bon profil et j'apprécie ta transparence.'",
          "'Du coup, on organise une conférence dimanche prochain où on explique réellement comment fonctionnent les business en ligne et comment tu peux créer ton activité même si tu pars de zéro.'",
          "'C'est dimanche à [heure]. C'est en ligne donc t'auras juste à te connecter. Ça dure 2-3H. C'est gratuit. Tu es dispo dimanche à [heure] ?'"
        ],
        cases: [
          {
            type: "pos",
            label: "Si qualifié VERT ou ORANGE",
            lines: [
              "'Parfait ! Je vais t'envoyer le lien de notre groupe WhatsApp par message de suite, je te laisse cliquer dessus maintenant pendant qu'on est ensemble.'",
              "'C'est super important que tu te connectes à l'heure parce que ça commence pile à [heure].'",
              "✅ Check-list post-appel : lien envoyé ✓ / budget noté ✓ / score VERT-ORANGE-ROUGE ✓ / motivations ✓ / rappel la veille ✓"
            ]
          },
          {
            type: "neg",
            label: "Si ROUGE (aucun budget réel)",
            lines: ["'Je vois, malheureusement nous on propose un réel accompagnement avec tout un écosystème — si t'as aucun budget on ne pourra pas malheureusement t'aider. En tout cas j'espère que tu vas trouver ce qui te correspond. Qu'Allah facilite. Salamou 'alaykoum.'"]
          }
        ]
      }
    ]
  },
  {
    id: "appel-organique",
    nom: "Appel Découverte Organique",
    icon: "🎯",
    couleur: "gold",
    cat: "calls",
    description: "Script pour les prospects venant du sourcing organique",
    phases: [
      {
        label: "Ouverture — Connexion",
        voix: "enthousiasme",
        lines: [
          "Contrôler ses émotions avant l'appel. Les 4 premières secondes sont CAPITALES.",
          "[Voix calme + enthousiaste] : 'Salamou 'alaykoum [Prénom], c'est [prénom] de l'équipe AL BARAKA, comment ça va ?'",
          "[Voix curiosité] : 'Top top, au fait, t'es de quelle ville ? T'as du soleil chez toi aujourd'hui ?'",
          "'Juste avant de commencer, est-ce que t'es d'accord pour que j'enregistre l'appel ?'",
          "(Si demande pourquoi : 'Pour garder un souvenir de notre premier échange si tu souhaites aller plus loin.')"
        ]
      },
      {
        label: "Cadrage",
        voix: "mystere",
        lines: [
          "[Voix mystérieuse et intrigante] : 'Très bien [Prénom], c'est un appel rapide, je vais juste te poser quelques questions pour vérifier qu'on puisse t'aider.'",
          "'Et en fonction de tes réponses, et si t'estimes que c'est une bonne chose pour toi, on se fixera un autre appel pour que je t'explique le métier et notre écosystème.'",
          "[Voix de la raison] : 'Ça te va ?'",
          "→ Attendre un OUI clair, net et précis. Ne JAMAIS continuer sans ce OUI."
        ]
      },
      {
        label: "Qualification du problème",
        voix: "curiosite",
        lines: [
          "[Voix enthousiaste + curiosité] : 'Top, tu fais quoi actuellement dans la vie ?' [Vérifier qu'il ait une source de revenu]",
          "'Okey top, et du coup qu'est-ce qui t'a poussé à accepter cet appel avec moi ?'",
          "'Et y'a un problème en particulier que t'espères résoudre ? Ou un objectif particulier que t'aimerais atteindre ?'",
          "'[Prénom], si je résume bien, le problème principal pour toi aujourd'hui c'est [problème] — c'est ça ?'",
          "NOTER LE PROBLÈME DU PROSPECT avec ses propres mots.",
          "'Pourquoi ne pas te contenter de rester dans la situation d'aujourd'hui ?'",
          "[Voix de la raison] : 'Bien, au moins on sait que t'es vraiment prêt.e à bosser pour corriger ça !'"
        ]
      },
      {
        label: "Présentation du business model",
        voix: "raison",
        lines: [
          "'[Prénom], je pense que tu l'as remarqué mais il y a de plus en plus de pubs sur les réseaux et donc de plus en plus de personnes qui entreprennent en ligne. T'es d'accord avec moi ?'",
          "'En gros, tous ces gens ont forcément une offre à vendre. Et au lieu d'acheter comme tout le monde, je t'invite plutôt à passer de l'autre côté et à apprendre à vendre tous ces produits ou services numériques. C'est de ce côté-là qu'il y a vraiment de l'argent. T'es d'accord ?'",
          "'Notre business model : on apprend à la communauté à gérer l'acquisition client et la vente pour des coachs, des formateurs, et en échange ils sont payés de 500€ à 2500€/vente, tout ça à côté du boulot.'",
          "'Est-ce que c'est une chose qui pourrait te convenir ?'"
        ]
      },
      {
        label: "Questions finales + Budget",
        voix: "curiosite",
        lines: [
          "'Et toi du coup, t'es plutôt à l'aise avec les gens en général ?'",
          "'T'es prêt.e à apprendre à utiliser les réseaux sociaux ?'",
          "'Est-ce qu'aujourd'hui tu serais prêt.e à investir 2-3H/jour si ça peut te permettre de mieux gagner ta vie à terme ?'",
          "'Ce serait quoi pour toi un bon revenu, genre dans les 6 prochains mois t'aimerais gagner combien ?'"
        ],
        lines2: [
          "QUESTION 1 : 'Est-ce-que tu veux vraiment commencer à faire les causes pour avancer ou c'est secondaire pour toi ? Du coup tu souhaiterais commencer à partir de quand ?'",
          "QUESTION 2 : 'Est-ce que pour toi ce serait normal d'investir une somme raisonnable dans des compétences qui peuvent sérieusement te permettre de construire une réelle activité en ligne de manière 100% halal ?'",
          "→ En fonction de sa réponse : creuser sur ses revenus, combien il est prêt à investir, son budget."
        ]
      },
      {
        label: "Conclusion — Qualification / VISIO",
        voix: "sincerite",
        lines: [
          "[Voix calme + enthousiaste] : 'Prénom, je vais être franc avec toi, nous ce qu'on recherche c'est des personnes qui ont un bon relationnel, qui craignent Allah et qui sont de bonne volonté.'"
        ],
        cases: [
          {
            type: "pos",
            label: "Si qualifié",
            lines: [
              "'Je pense que tu fais partie de ce genre de personne Al Hamdoulilah. Je pense sincèrement qu'on peut t'aider à construire quelque chose de sérieux InshaAllah.'",
              "'Ce que je te propose c'est qu'on se fixe un appel en VISIO dans lequel je t'expliquerai en détails notre activité et comment fonctionne notre écosystème.'",
              "'J'ai des disponibilités demain à XXH ou sinon à XXH, tu préfères quoi ?'",
              "→ Réserver soi-même le créneau en direct au téléphone pour ne pas laisser au prospect l'occasion de reporter.",
              "[Voix de la raison] : 'Super, [Prénom] mon temps est vraiment important pour moi, je peux compter sur toi pour être à l'heure et dans un endroit calme inshaAllah ?'"
            ]
          },
          {
            type: "neg",
            label: "Si non qualifié",
            lines: [
              "'[Prénom], j'ai apprécié échanger avec toi. Ton profil est très intéressant, mais tu ne me sembles pas encore prêt.e pour un accompagnement comme le nôtre car [raison].'",
              "'Par contre, ce que je te propose, c'est de garder mon contact et le jour où tu penses être prêt.e, tu reviens vers moi.'",
              "Porte ouverte, jamais claquée."
            ]
          }
        ]
      }
    ]
  },
  {
    id: "closing-bizdev",
    nom: "Closing Business Developer",
    icon: "🔥",
    couleur: "amber",
    cat: "calls",
    description: "Script de closing complet pour convertir les prospects qualifiés",
    phases: [
      {
        label: "Phase 1 — Ouverture & Enregistrement",
        voix: "enthousiasme",
        lines: [
          "Les 4 premières secondes sont CAPITALES. Contrôler ses émotions.",
          "[Voix calme + enthousiaste] : 'Salamou 'alaykoum [Prénom], comment ça va ? Prêt.e pour notre appel ?'",
          "'Juste avant de commencer, est-ce que t'es d'accord pour que j'enregistre l'appel ?'",
          "(Si demande pourquoi : 'C'est pour garder un souvenir de notre premier échange si tu souhaites aller plus loin.')"
        ]
      },
      {
        label: "Phase 2 — Cadrage & Double pré-engagement",
        voix: "mystere",
        lines: [
          "[Voix mystérieuse] : 'BismiLah [Prénom]. Le but de cet appel est simple — on va vraiment comprendre ta situation actuelle et ce qui a pu te bloquer jusqu'aujourd'hui.'",
          "'Ensuite je vais t'expliquer notre métier en détail pour que tu puisses comprendre comment on peut générer des revenus de manière halal avec les compétences qu'on va te donner inshaAllah.'",
          "'Et évidemment vers la fin de l'appel, tu pourras décider si ça peut être un bien pour toi ou pas.'",
          "[Voix de la raison] : 'Ça te va comme fonctionnement ?' → Attendre OUI clair, net et précis."
        ],
        lines2: [
          "[Avec le sourire] : 'Par contre ce que j'veux pas c'est qu'on se cache derrière des excuses comme un 'il faut que je réfléchisse...' ou une autre excuse farfelue. Je pense que si t'es là avec moi c'est pour que tu puisses enfin avancer.'",
          "'Est-ce qu'on est sur la même longueur d'onde ?' → Attendre OUI.",
          "'J'ai besoin de savoir si tu étais prêt.e à faire les causes maintenant ou si au contraire tu préfères reporter encore 1, 2 ou encore 6 mois ?'",
          "→ On cherche la réponse 'le plus tôt possible !'"
        ]
      },
      {
        label: "Phase 3 — Creuser la Douleur",
        voix: "empathie",
        lines: [
          "[Voix empathie] : 'BismiLah [Prénom]. Hier tu m'as dit [Problème]. C'est bien ça ?'",
          "'OK, peux-tu m'en dire un peu plus ?'",
          "'C'est quoi pour toi une journée type avec [Problème] ?'",
          "'Depuis combien de temps tu supportes [Problème] ?'",
          "'T'as déjà entrepris quelque chose pour sortir de cette situation ? Et ça a donné quoi ?'"
        ],
        cases: [
          { type: "neg", label: "Si aucun résultat aux tentatives passées", lines: ["Amplifier : 'Ah oui, aucun résultat ? Zéro bénéfice ?!'"] }
        ],
        lines2: [
          "'Actuellement t'as aucune compétence ni système en place de ton côté pour que tu puisses générer ne serait-ce que 1000€ par mois de chez toi — c'est ça ?'",
          "'Du coup, est-ce tu dirais que t'es plutôt comblé de ta situation aujourd'hui, ou plutôt INSATISFAIT ?'"
        ],
        cases2: [
          {
            type: "pos",
            label: "Si INSATISFAIT",
            lines: [
              "'Ok, donc clairement — est-ce que tu acceptes de rester bloqué là ?'",
              "'Et quels sont les autres points qui font que tu n'aimes pas forcément là où tu en es ?'",
              "Poser toutes les questions qui vont chercher la douleur en profondeur."
            ]
          },
          {
            type: "neg",
            label: "Si COMBLÉ (rare)",
            lines: ["'Et quels sont les autres points qui font que tu n'aimes pas forcément là où tu en es avec [Problème] ?'"]
          }
        ]
      },
      {
        label: "Phase 4 — Projection & Grand Fossé",
        voix: "curiosite",
        lines: [
          "[Voix curiosité] : 'Prénom, tu peux me redire quelle somme tu souhaiterais stabiliser d'ici les 6 prochains mois inshaAllah ?'",
          "'Et finalement quel impact aura [X000]€ sur ta vie ? Ça changerait quoi ?'",
          "'C'est-à-dire ? Tu peux m'en dire plus à ce sujet ?'",
          "'Est-ce que c'est important pour toi de [objectif spécifique] ?'",
          "'OK [Prénom], si je résume — actuellement tu es [statut], le problème c'est [X], et ce que tu voudrais c'est [Y]. Entre ces deux situations il y a malheureusement un grand fossé. T'es d'accord ?'",
          "'Si à l'heure actuelle tu ne fais aucune cause et que tu ne te fais pas aider, est-ce que tu penses que tu pourrais [objectif] ?'",
          "'Qu'est-ce qui, selon toi, t'empêche de combler ce fossé et d'y parvenir tout.e seul.e ?'",
          "'Si tu ne fais pas les causes aujourd'hui, au long terme, ce serait quoi le risque pour toi ?'",
          "'Sur quoi est-ce que t'as le plus besoin d'aide aujourd'hui pour arriver à [objectif] ?'"
        ]
      },
      {
        label: "Phase 5 — Certitude & Transition vers les piliers",
        voix: "certitude",
        lines: [
          "[Voix certitude] : 'Prénom, tu sais… chez nous on ne travaille qu'avec des musulmans et al hamdouliLah ça fait du bien.'",
          "'On a aidé beaucoup de personnes comme toi qui aujourd'hui bossent avec nous, donc je pense sincèrement qu'on peut t'aider.'",
          "'Si aujourd'hui t'es là dans cet appel, c'est pas du hasard, je pense qu'on peut vraiment faire en sorte de changer les choses inshaAllah. Est-ce que t'es d'accord avec moi pour dire qu'il faut faire les causes si on veut que ça change ?'",
          "→ Attendre le OUI.",
          "'Maintenant, avant de t'expliquer en détails les compétences qu'on va te donner, j'ai juste deux questions pour toi.'",
          "→ Attendre 'OUI je t'écoute'."
        ],
        lines2: [
          "QUESTION 1 : 'J'ai besoin d'être sûr que tu es en capacité de te positionner. Ça veut dire que là je vais prendre le temps de tout t'expliquer, donc ce que je te demande c'est d'être capable de te positionner.'",
          "'Soit OUI [Prénom], je veux rejoindre. Soit NON, ça ne me correspond pas. Et si c'est le cas, y'aura aucun souci avec ça.'",
          "QUESTION 2 : 'J'ai besoin de savoir si tu étais prêt.e à faire les causes maintenant ou si tu préfères reporter encore 1, 2 ou encore 6 mois ?'",
          "→ On cherche la réponse 'le plus tôt possible !'"
        ]
      },
      {
        label: "Phase 6 — Les 4 Piliers",
        voix: "mystere",
        lines: [
          "[Voix mystérieuse] : 'BismiLah je t'explique, notre accompagnement se décompose en 4 grands piliers. Le but qu'on se fixe c'est d'aller chercher minimum 2 000€ dans les 3 prochains mois inshaAllah.'"
        ],
        lines2: [
          "PILIER 1 — Marketing d'acquisition [Voix énergique] :",
          "'Le 1er pilier c'est le marketing d'acquisition. Dedans, on va t'apprendre la psychologie du marketing, les différentes stratégies de contenus pour développer une audience sur les réseaux même sans te montrer et surtout l'art d'attirer tes premiers clients vers toi.'",
          "'Cette compétence tu pourras l'utiliser en bossant chez nous, en bossant ailleurs dans d'autres niches, ou même sur ton propre business si tu souhaites en lancer un plus tard.'",
          "'Pour ce premier pilier, on te fournit déjà en amont notre propre contenu pour te faire gagner du temps et accélérer tes résultats. Il te suffira de prendre les vidéos qu'on te donne et de les republier. Mais on t'apprend aussi à créer ton propre contenu pour garder ton authenticité.'",
          "→ [Attendre la réaction]",
          "'Ensuite, on va t'apprendre le sourcing et le setting. En gros c'est l'art de trouver des prospects sur les réseaux sociaux, de créer une conversation naturelle et de verrouiller un rendez-vous. On te fournit aussi nos scripts pour échanger avec les gens.'",
          "'Juste pour info, on a certaines personnes qui bossent avec nous qui ne se contentent que de cette compétence et rien qu'avec ce premier pilier elles peuvent générer 500€/vente juste en envoyant des messages et en intégrant des personnes à un groupe WhatsApp al Hamdoulilah.'",
          "→ [Attendre la réaction]",
          "'Cerise sur le gâteau, on te donne même un tunnel de vente qui te permettra de convertir le trafic en prospects qualifiés ! T'auras juste à le télécharger en un clic inshaAllah.'",
          "[Voix curiosité] : 'Voilà pour le premier pilier, avant qu'on passe au suivant, je t'écoute pour tes questions…'",
          "---",
          "PILIER 2 — Closing [Voix curiosité] :",
          "'Le 2nd pilier est dédié au closing, plus précisément à la vente d'offres haut de gamme.'",
          "'Chez nous les commissions vont de 500€ à 2500€/vente al hamdouliLah.'",
          "'L'avantage dans notre écosystème c'est que t'as même PAS besoin de créer une offre. À la fin de ta formation tu pourras d'office avoir un droit de revente sur nos différents programmes, et t'auras même accès à notre réseau de partenaires musulmans inshaAllah.'",
          "'De manière générale, ceux qui appliquent nos process arrivent à faire leur première vente en moins de 2 mois après leur inscription al hamdouliLah.'",
          "'Évidemment, on te fournira TOUS nos scripts de vente et TOUS nos processus à télécharger en 3 clics.'",
          "[Voix curiosité] : 'Voilà pour le second pilier, avant qu'on passe au suivant, je t'écoute pour tes questions…'",
          "---",
          "PILIER 3 — Publicité :",
          "'Le 3ème pilier c'est la publicité — uniquement quand tu stabilises déjà 3 000€/mois grâce aux piliers précédents.'",
          "'On t'apprend à créer une campagne publicitaire et automatiser l'acquisition client. Objectif : dépasser les 5 000€/mois inshaAllah.'",
          "'On te donnera même nos propres publicités que tu pourras utiliser. Tout est déjà prêt al HamdouliLah.'",
          "Pause.",
          "---",
          "PILIER 4 — Accompagnement personnalisé quotidien [Voix certitude] :",
          "'Et le 4ème et dernier pilier. C'est selon moi le plus important parce que c'est grâce à lui que t'obtiendras le plus de résultats inshaAllah — c'est simplement l'accompagnement personnalisé.'",
          "'Regarder des vidéos ça ne suffit pas. Il faut pratiquer. Le but de notre accompagnement c'est qu'on soit là au quotidien pour analyser ton travail de jour en jour et t'aider à t'améliorer.'",
          "'Tu auras des réponses 100% PERSONNALISÉES à tes questions, et en général on répond en moins d'une heure.'",
          "→ [Attendre la réaction]",
          "'En gros on est avec toi à chaque petite étape, tous les jours ! Notre système, C'EST UN FAIT, al hamdouliLah il FONCTIONNE. C'est comme prendre le volant d'une voiture avec un mentor à côté qui te dit quel chemin prendre à tout moment.'",
          "'Tu ne PEUX PAS ne pas arriver à destination. C'est pas possible. C'est parce que notre accompagnement est aussi poussé qu'on arrive à donner du résultat même à des personnes de plus de 50 ans al hamdouliLah.'",
          "---",
          "[Silence — laisser le prospect réagir et poser ses questions]",
          "'Je t'écoute pour tes questions…'",
          "'Non vraiment c'est le moment, il n'y a rien de flou pour toi ? Des points que tu souhaiterais que je développe ?'",
          "→ Montrer les résultats membres Discord / Dossier témoignages"
        ]
      },
      {
        label: "Phase 7 — Échelle de Certitude",
        voix: "raison",
        lines: [
          "[Voix curiosité] : 'Maintenant si t'as plus de questions, est-ce que tu me permets de t'en poser une de mon côté ?'",
          "'Sur une échelle de 1 à 10, à 1 tu penses que cet accompagnement te permettra pas de faire le moindre centime les prochains mois, et à 10 t'es sûr à 10 000% que si tu fais les causes sérieusement et qu'on soit derrière toi au quotidien, tu vas pouvoir générer un minimum de 2 000€ dans les 4 prochains mois.'",
          "'Ce serait quoi ta note spécifiquement sur la méthode et l'accompagnement ?'",
          "→ Écouter AUSSI la tonalité / conviction dans la voix."
        ],
        cases: [
          { type: "pos", label: "Si 9 ou 10/10 + voix convaincue", lines: ["Passer directement à l'annonce du prix."] },
          {
            type: "neg",
            label: "Si moins de 9 — ou 9 peu convaincu dans le ton",
            lines: [
              "'Ok [Prénom], juste par curiosité, qu'est-ce qui manquerait pour toi pour être à 10 ?'",
              "→ CAS 1 (doute méthode) : 'Pour être sûr, à part [X], il n'y a rien d'autre ?' → Traiter → relancer l'échelle.",
              "→ CAS 2 (doute sur soi) : 'Si on est derrière toi au quotidien, qu'est-ce qui pourrait t'empêcher d'y arriver comme les autres ? On a aidé des personnes de plus de 50 ans.' → Témoignages → relancer l'échelle."
            ]
          }
        ]
      },
      {
        label: "Phase 8 — Annonce du Prix",
        voix: "evidence",
        lines: [
          "'Donc si je comprends bien t'es plutôt confiant.e sur le fait d'avoir du résultat al hamdouliLah ?'",
          "[Voix de l'évidence] : 'OK al hamdouliLah, t'es prêt.e pour que je t'annonce le prix ?'",
          "→ Attendre le OUI.",
          "'Aujourd'hui on est à 2 500€.'",
          "+ SILENCE de 10 secondes minimum — laisser le prospect parler.",
          "CTA : 'Qu'est-ce qu'on fait bismillah ?'"
        ],
        cases: [
          {
            type: "pos",
            label: "Si GO oral",
            lines: [
              "'Qu'est-ce qui t'a fait décider ?' [Laisser parler — renforcement]",
              "Accompagner jusqu'au paiement finalisé sans raccrocher."
            ]
          },
          {
            type: "neg",
            label: "Si objection budget",
            lines: [
              "'Okey + SILENCE.'",
              "'En dehors de la question du budget, est-ce que t'as vraiment envie de nous rejoindre ?'",
              "'C'est une question de prix (ça ne vaut pas le coup) ou de budget (t'as pas la somme) ?'",
              "→ Si budget : facilités progressivement — 2x → 3x → 4x → 5x → 6x → 8x",
              "→ Si vraiment impossible : acompte 150€ → 100€ → 50€ pour bloquer la place."
            ]
          }
        ]
      },
      {
        label: "Phase 9 — GO Oral & Onboarding",
        voix: "sincerite",
        lines: [
          "'Pour procéder à l'inscription, j'ai juste besoin que tu me dises GO et je t'envoie le lien de paiement.'",
          "'Je reste avec toi jusqu'à la fin pour m'assurer que tu reçoives bien tes accès inshaAllah.'",
          "Après le GO : 'Félicitation [Prénom], meilleure décision de ta vie, al hamdouliLah !'",
          "RENFORCEMENT : 'Du coup dis-moi, c'est quoi qui t'a poussé à vouloir démarrer avec nous aujourd'hui ici et maintenant ?' [Laisser parler]",
          "'Et il y a quoi d'autre comme raison ?' [Laisser parler encore]",
          "Accompagnement paiement : 'Quand tu arriveras au bouton rejoindre, ça va te renvoyer vers ton application bancaire. Une fois validé, laisse la page te rediriger automatiquement.'",
          "Mail accès formation : Sujet 'votre accès à la formation' → cliquer → nom/prénom/mot de passe → accès confirmé.",
          "Rejoindre Discord → Vérifier accès formation dans les mails.",
          "Si paiement bloqué : changer de navigateur / vider le cache / vérifier plafond CB (augmentable depuis l'application bancaire)."
        ]
      }
    ]
  }
];
