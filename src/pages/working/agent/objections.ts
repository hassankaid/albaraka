export interface AgentObjection {
  id: string;
  situation: string;
  contexte: string;
  question: string;
  erreurs: string[];
  bonne_reponse: string;
  verbatim?: string;
}

export const OBJECTIONS_SETTING: AgentObjection[] = [
  {
    id: "s1",
    situation: "Silence total — pas de réponse",
    contexte: "Tu as envoyé ton vocal d'accroche il y a 48h. Le prospect ne répond pas.",
    question: "Comment relancer sans paraître insistant ?",
    erreurs: [
      "Renvoyer le même message en plus long",
      "Expliquer pourquoi on relance",
      "Envoyer plusieurs messages d'affilée",
    ],
    bonne_reponse:
      "Envoyer uniquement '?' — rien d'autre. Cette relance silencieuse est non-intrusive. Si toujours pas de réponse après 24h, passer au profil suivant. Maximum 2 relances au total.",
    verbatim: "?",
  },
  {
    id: "s2",
    situation: "'Peux-tu m'en dire plus ?'",
    contexte: "Le prospect a regardé la vidéo et demande plus d'informations par message.",
    question: "Comment répondre sans dévoiler le métier ?",
    erreurs: [
      "Expliquer le business model par message",
      "Envoyer des liens",
      "Répondre à toutes les questions avant l'appel",
    ],
    bonne_reponse:
      "'Bah écoute, on ne peut pas expliquer tout un métier par message — si tu veux on peut en discuter de vive voix, ça te va ?' Rediriger vers l'appel ou la conférence sans donner plus de détails.",
    verbatim: "Bah écoute, on ne peut pas expliquer tout un métier par message — si tu veux on peut en discuter de vive voix, ça te va ?",
  },
  {
    id: "s3",
    situation: "'C'est combien votre truc ?'",
    contexte: "Dès le premier échange, le prospect demande le prix.",
    question: "Comment répondre sans parler de prix ?",
    erreurs: [
      "Donner un prix approximatif",
      "Dire 'ça dépend'",
      "Se justifier longuement",
    ],
    bonne_reponse:
      "'On ne parle pas de prix par message — c'est une des choses qu'on verra ensemble lors d'un échange. Mon rôle là c'est d'abord de voir si ça peut te correspondre.' Puis proposer directement le RDV ou la conférence.",
    verbatim: "On ne parle pas de prix par message — c'est une des choses qu'on verra ensemble lors d'un échange. Mon rôle là c'est d'abord de voir si ça peut te correspondre.",
  },
  {
    id: "s4",
    situation: "'Pas intéressé'",
    contexte: "Le prospect répond sèchement qu'il n'est pas intéressé.",
    question: "Comment conclure cette conversation ?",
    erreurs: [
      "Demander 'pourquoi pas intéressé ?'",
      "Tenter de convaincre",
      "Envoyer un dernier argument",
    ],
    bonne_reponse:
      "'Pas de problème, bonne journée inshaAllah !' Court, chaleureux, sans insistance. Ne jamais tenter de convaincre quelqu'un qui a dit non clairement.",
    verbatim: "Pas de problème, bonne journée inshaAllah !",
  },
  {
    id: "s5",
    situation: "'Trop occupé en ce moment'",
    contexte: "Le prospect répond qu'il n'a pas le temps.",
    question: "Comment garder la porte ouverte sans insister ?",
    erreurs: [
      "Insister en disant que ça prend peu de temps",
      "Proposer de rappeler sans confirmation",
    ],
    bonne_reponse:
      "'Pas de souci, à quel moment tu serais plus disponible ?' Une seule tentative. Si le prospect reste flou, clore proprement. Maximum 2 relances au total.",
    verbatim: "Pas de souci, à quel moment tu serais plus disponible ?",
  },
  {
    id: "s6",
    situation: "'Ça ressemble à du MLM'",
    contexte: "Le prospect exprime une méfiance par rapport à des systèmes pyramidaux.",
    question: "Comment désamorcer cette objection ?",
    erreurs: [
      "Défendre l'offre longuement par message",
      "Répondre agressivement",
    ],
    bonne_reponse:
      "'Je comprends totalement ta méfiance, c'est légitime. C'est justement pourquoi on ne peut pas expliquer ça par message. Si tu me donnes 15 minutes, tu pourras juger toi-même si c'est sérieux. Et si ça ne te convient pas, aucun souci.' Proposer l'appel ou la conférence.",
    verbatim: "Je comprends totalement ta méfiance, c'est légitime. C'est justement pourquoi on ne peut pas expliquer ça par message. Si tu me donnes 15 minutes, tu pourras juger toi-même si c'est sérieux. Et si ça ne te convient pas, aucun souci.",
  },
  {
    id: "s7",
    situation: "'J'ai déjà essayé, ça marche pas'",
    contexte: "Le prospect a eu une mauvaise expérience avec une autre formation.",
    question: "Comment répondre à cette expérience négative ?",
    erreurs: [
      "Critiquer les autres programmes",
      "Faire des promesses excessives",
    ],
    bonne_reponse:
      "'Je comprends, malheureusement il y a beaucoup d'arnaques dans ce milieu. C'est justement pourquoi on ne peut pas expliquer ça par message. Est-ce que tu serais prêt à donner 15 minutes pour voir si c'est différent ?' Garder le ton empathique.",
    verbatim: "Je comprends, malheureusement il y a beaucoup d'arnaques dans ce milieu. C'est justement pourquoi on ne peut pas expliquer ça par message. Est-ce que tu serais prêt à donner 15 minutes pour voir si c'est différent ?",
  },
];

export const OBJECTIONS_CLOSING: AgentObjection[] = [
  {
    id: "c1",
    situation: "Score 6/10 sur l'échelle de certitude",
    contexte: "Tu viens de présenter les 4 piliers. Le prospect donne un 6/10.",
    question: "Comment remonter à 9-10 avant d'annoncer le prix ?",
    erreurs: [
      "Annoncer le prix malgré un score bas",
      "Accepter un 8 hésitant",
    ],
    bonne_reponse:
      "'Qu'est-ce qui manquerait pour être à 10 ?' Identifier : Cas 1 = doute sur la méthode / Cas 2 = doute sur lui-même. Traiter avec conviction + témoignages. Relancer l'échelle. Ne JAMAIS annoncer le prix avant 9-10 solide avec voix convaincue.",
    verbatim: "Qu'est-ce qui manquerait pour être à 10 ?",
  },
  {
    id: "c2",
    situation: "'C'est trop cher'",
    contexte: "Tu as annoncé 2500€. Le prospect dit que c'est trop cher.",
    question: "Comment répondre après l'annonce du prix ?",
    erreurs: [
      "Justifier le prix immédiatement",
      "Proposer les facilités avant de distinguer prix vs budget",
    ],
    bonne_reponse:
      "SILENCE d'abord. 'En dehors de la question du budget, est-ce que t'as vraiment envie de nous rejoindre ?' Puis : 'C'est une question de prix (ça ne vaut pas le coup) ou de budget (tu n'as pas la somme) ?' Si budget : facilités progressivement (2x, 3x, 4x...).",
    verbatim: "En dehors de la question du budget, est-ce que t'as vraiment envie de nous rejoindre ? C'est une question de prix (ça ne vaut pas le coup) ou de budget (tu n'as pas la somme) ?",
  },
  {
    id: "c3",
    situation: "'Je dois en parler à ma femme/mari'",
    contexte: "Le prospect est intéressé mais doit consulter son conjoint.",
    question: "Comment gérer cette objection ?",
    erreurs: [
      "Accepter sans date précise",
      "Ne pas distinguer soutien et autorisation",
    ],
    bonne_reponse:
      "'Ta décision à toi c'est quoi ?' Distinguer soutien vs autorisation. Si soutien : 'Parle-lui maintenant pendant qu'on est ensemble.' Si impossible : 'Je garde ta place jusqu'à demain midi.' Maximum 24h.",
    verbatim: "Ta décision à toi c'est quoi ?",
  },
  {
    id: "c4",
    situation: "'Je n'ai pas les fonds disponibles'",
    contexte: "Le prospect est convaincu mais n'a pas l'argent disponible maintenant.",
    question: "Comment explorer les solutions ?",
    erreurs: [
      "Abandonner trop vite",
      "Ne pas proposer l'acompte",
    ],
    bonne_reponse:
      "'En dehors du budget, t'as vraiment envie d'avancer ?' Facilités de paiement. 'Quand est-ce que tu auras la somme ?' Proposer un acompte pour bloquer la place (150€, 100€, 50€ si nécessaire).",
    verbatim: "En dehors du budget, t'as vraiment envie d'avancer ? Quand est-ce que tu auras la somme ?",
  },
  {
    id: "c5",
    situation: "'Je ne prends jamais de décision à chaud'",
    contexte: "Le prospect dit que c'est un principe de vie.",
    question: "Comment challenger ce mode de fonctionnement ?",
    erreurs: [
      "Accepter le principe sans challenger",
      "Forcer la décision brutalement",
    ],
    bonne_reponse:
      "Option 1 : 'Est-ce que tu estimes que ce qu'on propose est une opportunité ?' OUI. 'Quelle serait la meilleure chose à faire — saisir l'opportunité ou passer à côté encore ?' Option 2 : 'Est-ce que tu peux admettre qu'un jour ce mode de fonctionnement peut te faire rater une vraie opportunité ?'",
    verbatim: "Est-ce que tu estimes que ce qu'on propose est une opportunité ? Quelle serait la meilleure chose à faire — saisir l'opportunité ou passer à côté encore ?",
  },
  {
    id: "c6",
    situation: "'Je vais y réfléchir'",
    contexte: "Après la présentation complète, le prospect dit qu'il a besoin de temps.",
    question: "Comment répondre à cet écran de fumée ?",
    erreurs: [
      "Dire 'OK prends le temps'",
      "Proposer de rappeler sans date précise",
    ],
    bonne_reponse:
      "'Est-ce qu'il y a quelque chose en particulier sur lequel tu veux réfléchir ?' Puis : 'La réflexion c'est l'espace entre l'envie et l'action. Ça fait combien de temps que tu réfléchis à changer ta situation ?' CTA direct.",
    verbatim: "Est-ce qu'il y a quelque chose en particulier sur lequel tu veux réfléchir ? La réflexion c'est l'espace entre l'envie et l'action. Ça fait combien de temps que tu réfléchis à changer ta situation ?",
  },
  {
    id: "c7",
    situation: "'J'ai participé à d'autres programmes sans résultat'",
    contexte: "Le prospect a déjà investi dans des formations et est déçu.",
    question: "Comment répondre ?",
    erreurs: [
      "Dénigrer les autres programmes",
      "Promettre des résultats garantis",
    ],
    bonne_reponse:
      "'Il y a quelqu'un en qui tu n'as pas confiance et c'est soit moi, soit toi — lequel penses-tu que c'est ?' Identifier : confiance dans la méthode ou dans sa propre capacité. Utiliser les témoignages de personnes dans la même situation qui ont réussi.",
    verbatim: "Il y a quelqu'un en qui tu n'as pas confiance et c'est soit moi, soit toi — lequel penses-tu que c'est ?",
  },
  {
    id: "c8",
    situation: "Score 9/10 mais voix hésitante",
    contexte: "Le prospect donne un 9 mais sa voix manque de conviction.",
    question: "Comment gérer un 9 'mou' ?",
    erreurs: [
      "Annoncer le prix sur un 9 hésitant",
      "Ne pas écouter la tonalité",
    ],
    bonne_reponse:
      "Ne pas annoncer le prix. 'Je t'entends donner un 9 mais je sens une légère hésitation. Qu'est-ce qui manquerait pour être vraiment à 10 solide ?' Un 9 convaincu dans le ton : annoncer le prix. Un 9 incertain : creuser l'objection cachée.",
    verbatim: "Je t'entends donner un 9 mais je sens une légère hésitation. Qu'est-ce qui manquerait pour être vraiment à 10 solide ?",
  },
];
