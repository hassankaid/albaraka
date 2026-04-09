import type { ObjectionCategory } from "./types";

export const CLOSING_OBJECTION_CATEGORIES: ObjectionCategory[] = [
  {
    id: "ecrans",
    label: "Écrans de fumée",
    icon: "💨",
    objections: [
      {
        id: "c-e1",
        situation: "« Laisse-moi y réfléchir »",
        reponse: "Nommer ce qui se passe, redéfinir la réflexion, puis fermer.",
        verbatim:
          "De toi à moi, en général quand on me dit ça, c'est soit que la personne n'ose pas dire non — et tu peux hein — soit que c'est une question de budget. Dans quel cas tu te situes ?",
        etapes: [
          "« De toi à moi, en général quand on me dit ça, c'est soit que la personne n'ose pas dire non — et tu peux hein — soit que c'est une question de budget. Dans quel cas tu te situes ? »",
          "« Laisse-moi redéfinir la réflexion. La réflexion c'est la durée entre le moment où t'as envie de lancer un projet et le moment où tu passes à l'action, n'est-ce pas ? »",
          "« Ça fait combien de temps que tu réfléchis ? Est-ce qu'il serait pas temps d'agir ? »",
          "Fermer : « Tu attends quoi concrètement ? Qu'on te laisse ruminer et tourner en rond, ou bien qu'on te fasse avancer ? Je te tends la main là, prends-la. »",
        ],
      },
      {
        id: "c-e2",
        situation: "« Envoie-moi un récap »",
        reponse: "Identifier ce qui manque comme info puis recentrer sur l'humain.",
        verbatim:
          "Oui je peux t'envoyer ça, mais est-ce qu'il y a une info que t'espères trouver dans ce récap que je ne t'ai pas donnée durant cet appel ?",
        etapes: [
          "« Oui je peux t'envoyer ça, mais est-ce qu'il y a une info que t'espères trouver dans ce récap que je ne t'ai pas donnée durant cet appel ? »",
          "« En vrai, rien ne vaut un humain qui t'explique tout, c'est mieux qu'un fichier PDF, et je pense que tu seras d'accord avec moi. »",
          "Fermer : « Concrètement, qu'est-ce qui t'empêche d'avancer aujourd'hui ? »",
        ],
      },
      {
        id: "c-e3",
        situation: "« Ce n'est pas le bon moment »",
        reponse: "Ça ne l'est jamais. La procrastination est l'ennemi de l'action.",
        verbatim:
          "Ça ne l'est jamais. Si on attend que tout aille pour le mieux avant de faire en sorte que ça aille mieux, on va attendre longtemps. La procrastination est le plus grand ennemi de l'action.",
      },
      {
        id: "c-e4",
        situation: "« J'ai déjà perdu de l'argent dans un programme »",
        reponse: "Empathie + rappeler sa propre confiance exprimée plus tôt.",
        verbatim:
          "Je comprends, malheureusement tu n'es pas le premier. Ça fait partie du parcours d'un entrepreneur — parfois tu gagnes, parfois tu perds.",
        etapes: [
          "« Je comprends, malheureusement tu n'es pas le premier. Ça fait partie du parcours d'un entrepreneur — parfois tu gagnes, parfois tu perds. »",
          "« Mais concrètement, tu m'as dit que tu étais plutôt très confiant dans le fait d'avoir du résultat. Est-ce que tu confirmes ? »",
          "Fermer : « Alors, qu'est-ce qu'on fait du coup ? Tu attends quoi concrètement ? »",
        ],
      },
      {
        id: "c-e5",
        situation: "« Combien de temps j'ai pour décider ? »",
        reponse: "Pas de pression mais recadrer sur la valeur du temps.",
        verbatim:
          "On ne met aucune pression. Par contre laisse-moi te poser une autre question : combien de temps de ta vie tu vas encore perdre sans agir pour changer de situation ?",
        etapes: [
          "« On ne met aucune pression. Par contre laisse-moi te poser une autre question : combien de temps de ta vie tu vas encore perdre sans agir pour changer de situation ? »",
          "« L'argent c'est un flux — ça va, ça vient. Mais le temps c'est un stock — chaque minute de ta vie qui s'en va ne reviendra jamais. »",
          "Fermer : « Je te tends la main, prends-la. Qu'est-ce qu'on fait ? On avance ou pas ? »",
        ],
      },
      {
        id: "c-e6",
        situation: "« Je ne prends jamais de décision à chaud »",
        reponse:
          "Challenger le process de décision. Pour avoir des résultats non ordinaires, prendre des décisions non ordinaires.",
        verbatim:
          "Je comprends. Et est-ce que tu admets que ce processus de décision a pu potentiellement te faire louper des opportunités ?",
        etapes: [
          "« Je comprends. Et est-ce que tu admets que ce processus de décision a pu potentiellement te faire louper des opportunités ? »",
          "« Toi, est-ce que tu veux laisser ce processus dicter tes résultats pour l'avenir, ou bien t'es prêt à prendre ton courage à deux mains pour changer ta situation cette fois ? »",
          "Fermer : « Pour avoir des résultats qui ne sont pas ordinaires, tu dois parfois prendre des décisions qui ne sont pas ordinaires. »",
        ],
      },
      {
        id: "c-e7",
        situation: "« Je vais continuer ce que je fais et je reviendrai »",
        reponse: "Faire constater l'incohérence du raisonnement.",
        verbatim:
          "OK, ce que tu me dis c'est que tu vas continuer sur quelque chose qui ne t'apporte pas de résultat en espérant un jour générer assez pour investir dans ce qui marche. Est-ce que c'est exact ?",
        etapes: [
          "« OK, ce que tu me dis c'est que tu vas continuer sur quelque chose qui ne t'apporte pas de résultat en espérant un jour générer assez pour investir dans ce qui marche. Est-ce que c'est exact ? »",
          "« Et pour toi c'est logique ce raisonnement ? »",
          "Fermer : « Donc concrètement, même si c'est difficile, ce serait la bonne décision à prendre aujourd'hui selon toi ? »",
        ],
      },
    ],
  },
  {
    id: "prix",
    label: "Prix & Budget",
    icon: "💰",
    objections: [
      {
        id: "c-p1",
        situation: "« Après l'échelle 1-10 : c'est le prix le problème »",
        reponse:
          "Distinguer prix (perception de valeur) vs budget (capacité financière).",
        verbatim:
          "En dehors de la question du budget, est-ce que t'as vraiment envie de nous rejoindre toi ?",
        etapes: [
          "« En dehors de la question du budget, est-ce que t'as vraiment envie de nous rejoindre toi ? »",
          "« Est-ce que pour toi c'est une question de prix — tu estimes que ça vaut pas le coup — ou une question de budget — tu n'as simplement pas la somme ? Parce que c'est pas la même chose… »",
        ],
      },
      {
        id: "c-p2",
        situation: "« C'est trop cher »",
        reponse:
          "Distinguer perception de valeur vs contrainte de budget. Si prix → recadrer en ROI. Si budget → facilités.",
        verbatim:
          "C'est trop cher ou bien c'est pas dans ton budget ? Parce que c'est pas la même chose…",
      },
      {
        id: "c-p3",
        situation: "« Ça ne rentre pas dans mon budget »",
        reponse:
          "Explorer les solutions. Attendre le OUI avant de proposer le paiement en plusieurs fois.",
        verbatim:
          "OK je comprends. Comment est-ce qu'on pourrait t'aider à ce niveau ?",
        etapes: [
          "« OK je comprends. Comment est-ce qu'on pourrait t'aider à ce niveau ? »",
          "« Si je fais en sorte que ça rentre dans ton budget, est-ce que t'es vraiment décidé à avancer ? »",
          "→ Attendre le OUI. Puis proposer le paiement en plusieurs fois.",
        ],
      },
      {
        id: "c-p4",
        situation: "« J'ai pas l'argent »",
        reponse:
          "Insister poliment pour obtenir un chiffre concret puis adapter les facilités.",
        verbatim:
          "L'argent n'est généralement pas un problème pour démarrer, car on trouve des solutions. Quand tu me dis que tu n'as pas l'argent, tu disposes de combien exactement ?",
      },
      {
        id: "c-p5",
        situation: "« C'est quoi le maximum de fois pour payer ? »",
        reponse:
          "Commencer bas (2-3x) et monter progressivement si nécessaire.",
        verbatim:
          "Sincèrement l'idée c'est de s'adapter à ton budget et pas d'aller au maximum parce que ça ne nous arrange pas forcément. L'idée c'est de voir si on peut s'adapter à ton budget et si on ne peut pas, on te le dira.",
      },
    ],
  },
  {
    id: "confiance",
    label: "Confiance & Doute",
    icon: "🤔",
    objections: [
      {
        id: "c-c1",
        situation: "« Je ne suis pas sûr que ça va marcher pour moi »",
        reponse:
          "Identifier la source du doute : confiance en nous ou confiance en soi.",
        verbatim:
          "Selon toi, aujourd'hui le problème est plutôt sur la confiance en nous ou bien sur la confiance en toi ?",
        etapes: [
          "« Selon toi, aujourd'hui le problème est plutôt sur la confiance en nous ou bien sur la confiance en toi ? »",
          "« Tu sais, t'es pas seul à avoir douté de toi. Ça me rappelle certaines personnes qui, comme toi, ont pu douter avant de se lancer. Mais une fois qu'elles ont vu les résultats, elles ont vite été rassurées. »",
          "Fermer : « Quelle étape du programme t'inquiète concrètement ? »",
        ],
      },
      {
        id: "c-c2",
        situation:
          "« J'ai déjà perdu de l'argent, pourquoi te faire confiance ? »",
        reponse:
          "On ne peut pas effacer les mauvaises expériences. Écouter son cœur.",
        verbatim:
          "Je comprends et malheureusement on ne peut pas effacer les mauvaises expériences que t'as eu. En réalité faut écouter ton cœur.",
      },
      {
        id: "c-c3",
        situation: "« Comment je sais que ça va marcher ? »",
        reponse:
          "Retourner la question puis traiter point par point avec des témoignages.",
        verbatim:
          "Qu'est-ce qui ferait que ça ne marcherait pas pour toi concrètement ?",
      },
    ],
  },
  {
    id: "temps-closing",
    label: "Temps",
    icon: "⏳",
    objections: [
      {
        id: "c-t1",
        situation: "« J'ai pas le temps »",
        reponse:
          "Le temps est la galère de tout le monde. Il faut faire des sacrifices.",
        verbatim:
          "Le temps c'est la galère de tout le monde malheureusement. Il faut forcément faire des sacrifices si tu veux avoir du résultat.",
      },
      {
        id: "c-t2",
        situation: "« Pas maintenant, dans 3 mois »",
        reponse:
          "Le problème sera toujours là dans 3 mois si on ne fait rien.",
        verbatim:
          "OK, mais du coup le problème qu'on a identifié, il sera toujours là dans 3 mois si on ne fait rien, non ? Imaginons que dans 3 mois tu sois au même endroit. Comment tu te sentirais ?",
      },
    ],
  },
  {
    id: "entourage",
    label: "Support & Entourage",
    icon: "👥",
    objections: [
      {
        id: "c-s1",
        situation: "« Je dois en parler à mon/ma conjoint(e) »",
        reponse:
          "Distinguer autorisation vs information. Proposer un appel à 3 si nécessaire.",
        verbatim:
          "Je comprends, mais quand tu me dis ça c'est dans quel sens ? Tu dois avoir son autorisation pour commencer ou bien c'est juste que tu souhaites l'informer de ta décision ?",
        etapes: [
          "« Je comprends, mais quand tu me dis ça c'est dans quel sens ? Tu dois avoir son autorisation pour commencer ou bien c'est juste que tu souhaites l'informer de ta décision ? »",
          "« OK et ta décision c'est quoi concrètement ? »",
          "« Si [conjoint] était entièrement d'accord, est-ce que TOI tu serais prêt(e) à démarrer ? »",
          "Si décidé : « Ce que je te propose, c'est de lui en parler, et on se rappelle à [heure] ce soir pour avancer. Ça te va ? »",
          "Si hésitant : « Ce que je te propose : on fixe un appel rapide tous les trois. »",
        ],
      },
      {
        id: "c-s2",
        situation: "« Je dois en parler à mes parents »",
        reponse:
          "Est-ce vraiment les parents qui décident ? Construire et prouver par les résultats.",
        verbatim:
          "Je comprends. Est-ce que c'est vraiment tes parents qui vont décider, ou c'est toi qui prends cette décision pour toi-même ?",
        etapes: [
          "« Je comprends. Est-ce que c'est vraiment tes parents qui vont décider, ou c'est toi qui prends cette décision pour toi-même ? »",
          "« OK et ta décision c'est quoi concrètement ? »",
          "« Est-ce que tu penses que tes parents vont te soutenir dans ce projet ? Car souvent, ils n'y croient pas malheureusement. »",
          "Fermer : « Du coup ce serait quoi la bonne chose à faire selon toi ? Construire ton projet et avoir du résultat pour leur prouver que tu es capable, ou bien leur en parler sachant qu'ils te freineront ? »",
        ],
      },
    ],
  },
  {
    id: "cadrage",
    label: "Cadrage début d'appel",
    icon: "🎯",
    objections: [
      {
        id: "c-ca1",
        situation: "« J'ai que 20 minutes là »",
        reponse:
          "Adapter selon le type d'appel. Ne jamais compresser un appel de vente.",
        verbatim:
          "Pas de soucis, je n'ai besoin que de 15 minutes. Je te propose qu'on aille directement dans le vif du sujet. Ça te convient ?",
        etapes: [
          "Si appel découverte : « Pas de soucis, je n'ai besoin que de 15 minutes. Je te propose qu'on aille directement dans le vif du sujet. Ça te convient ? »",
          "Si appel de vente : « Il vaut mieux reprogrammer alors. T'es disponible demain à [heure] ? »",
          "→ Ne jamais compresser un appel de vente. La qualité du diagnostic conditionne tout.",
        ],
      },
      {
        id: "c-ca2",
        situation: "« Donnez-moi directement le prix »",
        reponse: "Un médecin ne prescrit pas avant le diagnostic.",
        verbatim:
          "Écoute [Prénom], je comprends mais la réalité c'est qu'on a plusieurs formules et pour le moment je ne sais pas ce qui te correspond.",
        etapes: [
          "« Écoute [Prénom], je comprends mais la réalité c'est qu'on a plusieurs formules et pour le moment je ne sais pas ce qui te correspond. »",
          "« Un médecin ne prescrit pas avant d'avoir fait le diagnostic, non ? Nous c'est la même chose. »",
        ],
      },
    ],
  },
];

export const PROCESS_ECHELLE: { label: string; etapes: string[] } = {
  label: "Process Échelle 1 à 10",
  etapes: [
    "Score < 9 : « OK [Prénom], juste par curiosité, qu'est-ce qui manquerait pour toi pour être à 10 ? »",
    "Isoler : « À part [vraie objection], il n'y a rien d'autre qui t'empêche d'être à 10/10 ? »",
    "Clarifier : « Que veux-tu dire par [objection], peux-tu développer ? »",
    "Traiter avec : Levier 1 (conviction + énergie), Levier 2 (témoignages), Levier 3 (logique rationnelle)",
    "Relancer : « Maintenant si je te repose la question, sur une échelle de 1 à 10, tu te situes à combien ? »",
    "9-10/10 → CLOSER",
    "< 9/10 → Recommencer le cycle OU présenter la GARANTIE",
  ],
};

export const ARMES_DERNIER_RECOURS: {
  label: string;
  techniques: { nom: string; texte: string }[];
} = {
  label: "Armes de dernier recours",
  techniques: [
    {
      nom: "La Question Magique",
      texte:
        "« Écoute, la VRAIE décision que tu prends, c'est pas de savoir si tu vas te lancer avec moi ou quelqu'un d'autre. C'est vraiment pas pertinent. La VRAIE décision que tu dois prendre, c'est de savoir si oui ou non t'es prêt(e) à t'engager pour avoir ce que tu veux dans ta vie — ou si tu veux continuer avec tes difficultés. C'est ça la VRAIE DÉCISION. »",
    },
    {
      nom: "La Montagne au Trésor",
      texte:
        "« [Prénom], imagine une montagne qui cache un coffre rempli d'or à son sommet. Tous les jours tu fais le tour en fantasmant sur tout ce que tu pourrais faire avec cet or. Mais pour profiter des pièces d'or, il faut être au sommet ! Là… ça fait un moment qu'on tourne autour. Si tu sais ce que tu veux, prends tes chaussures et commence à prendre des décisions comme celui qui est déjà au sommet. » Puis : « Alors, qu'est-ce que tu ressens ? »",
    },
  ],
};
