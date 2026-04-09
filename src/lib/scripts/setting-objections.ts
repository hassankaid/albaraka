import type { ObjectionCategory } from "./types";

export const SETTING_OBJECTION_CATEGORIES: ObjectionCategory[] = [
  {
    id: "curiosite",
    label: "Curiosité & Demande d'information",
    icon: "💡",
    objections: [
      {
        id: "s-c1",
        situation: "« C'est quoi exactement ce que vous proposez ? »",
        reponse: "Expliquer brièvement AL BARAKA puis rediriger vers la vérification de profil.",
        verbatim:
          "On fait partie d'un écosystème qui s'appelle AL BARAKA. On accompagne des musulmans francophones à lancer leur activité en ligne de manière halal — avec des formations, du coaching et une communauté. L'idée c'est de voir si tu corresponds au profil qu'on recherche et si c'est le cas, on t'invite à une conférence gratuite. T'as 2 minutes pour qu'on vérifie ça ensemble ?",
      },
      {
        id: "s-c2",
        situation: "« C'est combien ? »",
        reponse: "Ne jamais donner de prix. Rediriger vers la conférence.",
        verbatim:
          "On a plusieurs formules chez AL BARAKA donc ça va dépendre de ce qui te correspond. L'idée ici c'est juste de vérifier qu'on puisse t'aider et si c'est le cas tu seras invité à notre conférence privée gratuite de dimanche. Qu'en penses-tu ?",
      },
      {
        id: "s-c3",
        situation: "« C'est quoi le business model exactement ? »",
        reponse: "Ne pas tout expliquer par message. Rediriger vers la conférence.",
        verbatim:
          "Je comprends ta curiosité ! On ne peut pas expliquer tout un écosystème par message parce que justement on propose plusieurs compétences, c'est à toi de voir ce qui te correspond — c'est justement pour ça qu'on organise une conférence privée chaque dimanche où tout est expliqué en détail. L'idée ici c'est juste de voir si on peut t'aider. T'es ok pour qu'on vérifie ensemble ?",
      },
      {
        id: "s-c4",
        situation: "« Tu peux m'envoyer un lien / une vidéo / un site ? »",
        reponse: "Pas de lien public. La conférence est privée et réservée aux profils sérieux.",
        verbatim:
          "On n'a pas de lien ou de vidéo publique — c'est volontaire. Notre conférence est privée et réservée aux profils sérieux. C'est justement ce qui fait la différence avec tout ce qu'on voit en ligne. Toi tu préfères une conférence dans laquelle tu vas vraiment avoir de la valeur ou bien un PDF inutile ?",
      },
      {
        id: "s-c5",
        situation: "« C'est de l'affiliation ? Du dropshipping ? Du trading ? »",
        reponse: "Non. On forme aux vraies compétences digitales.",
        verbatim:
          "Non, rien de tout ça. On forme aux vraies compétences digitales — création d'offres, vente, personal branding. Le modèle est expliqué en détail lors de notre conférence privée. L'idée c'est de voir si tu corresponds au profil qu'on peut aider. T'es ok pour qu'on vérifie ensemble ?",
      },
    ],
  },
  {
    id: "mefiance",
    label: "Méfiance & Doute",
    icon: "🛡️",
    objections: [
      {
        id: "s-m1",
        situation: "« C'est quoi comme arnaque ça ? »",
        reponse: "Accuser réception de la méfiance puis rediriger vers la conférence gratuite.",
        verbatim:
          "Je comprends ta méfiance, c'est normal ! Il y a beaucoup de choses douteuses en ligne. AL BARAKA c'est un écosystème de formation avec des vrais coachs, une vraie communauté et de vrais résultats. On propose simplement une conférence gratuite et privée dimanche. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
      {
        id: "s-m2",
        situation: "« Ça ressemble à du MLM / C'est pas du marketing de réseau ? »",
        reponse: "Distinguer clairement AL BARAKA du MLM.",
        verbatim:
          "Non non AL BARAKA c'est une communauté d'entrepreneurs musulmans, pas du MLM. On t'apprend des vraies compétences digitales — création d'offres, vente, personal branding. Zéro système pyramidal. C'est justement pour ça qu'on fait une conférence — pour que tu puisses prendre de la valeur et juger par toi-même. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
      {
        id: "s-m3",
        situation: "« J'ai déjà essayé une formation, ça marche pas »",
        reponse: "Empathie + différenciation par le coaching et le suivi.",
        verbatim:
          "Je comprends, malheureusement il y a beaucoup de formations qui ne tiennent pas la route. Ce qui différencie AL BARAKA c'est qu'on ne te laisse pas seul devant des vidéos — t'as du coaching 4 fois par semaine, une communauté, et un vrai suivi. Est-ce que tu serais prêt à te donner une nouvelle chance pour voir si c'est différent de ce que tu as vécu ?",
      },
      {
        id: "s-m4",
        situation: "« J'ai déjà perdu de l'argent dans un truc comme ça »",
        reponse: "Prudence légitime. La conférence est gratuite, rien à perdre.",
        verbatim:
          "Je comprends et c'est normal d'être prudent après une mauvaise expérience. Justement, la conférence est 100% gratuite — t'as rien à perdre. Tu viens, tu écoutes, et tu juges par toi-même. Si ça te convient pas, aucun souci — personne ne t'obligera à rien. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
      {
        id: "s-m5",
        situation: "« Comment je sais que c'est pas une escroquerie ? »",
        reponse: "AL BARAKA existe depuis plus de 2 ans avec une vraie communauté.",
        verbatim:
          "C'est une bonne question et je respecte ta prudence. AL BARAKA existe depuis plus de 2 ans, on a une vraie communauté d'élèves qui obtiennent des résultats. Je t'invite à une conférence gratuite — tu pourras comprendre l'écosystème, poser toutes tes questions et juger par toi-même.",
      },
      {
        id: "s-m6",
        situation: "« T'es qui toi ? Pourquoi je devrais te faire confiance ? »",
        reponse: "Se présenter avec authenticité, partager son parcours.",
        verbatim:
          "Bonne question ! Je suis [Prénom], je fais partie de l'écosystème AL BARAKA. Moi j'étais [décris ta situation de départ], et je voulais autre chose. Aujourd'hui je suis accompagné par des coachs et je construis mon activité petit à petit al hamdoulilah. Je ne suis pas là pour te vendre quoi que ce soit — juste pour voir si on peut t'aider. La conférence est gratuite, tu juges par toi-même. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
      {
        id: "s-m7",
        situation: "« J'ai vu des avis négatifs sur ce genre de trucs »",
        reponse: "Normal que les gens soient méfiants. AL BARAKA se distingue par son écosystème complet.",
        verbatim:
          "Normal, il y a énormément de formations bidon sur Internet — c'est pour ça que les gens sont méfiants. AL BARAKA c'est pas une formation vidéo en soi : c'est un écosystème structuré avec du coaching, du suivi et une communauté, des outils d'intelligence artificielle. La meilleure façon de juger, c'est de venir voir par toi-même à la conférence gratuite. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
    ],
  },
  {
    id: "temps",
    label: "Temps & Disponibilité",
    icon: "⏰",
    objections: [
      {
        id: "s-t1",
        situation: "« J'ai pas le temps »",
        reponse: "La conférence est le dimanche. Nos membres sont aussi étudiants/salariés/parents.",
        verbatim:
          "Je comprends. C'est justement pour ça qu'on organise la conférence le dimanche. Nos membres chez AL BARAKA sont pour la plupart des étudiants ou des parents qui bossent à côté. Est-ce que tu penses pouvoir dégager 2H ce dimanche ? Ça te sera vraiment profitable inshaAllah",
      },
      {
        id: "s-t2",
        situation: "« Pas maintenant, peut-être dans quelques mois »",
        reponse: "Le problème sera toujours là dans 3 mois. La conférence est gratuite.",
        verbatim:
          "Je comprends. Mais le problème que tu vis aujourd'hui, il sera toujours là dans 3 mois si tu ne fais rien. La conférence est gratuite et ne t'engage à rien — au pire tu repars avec de la valeur et des idées. T'as vraiment rien à perdre à venir dimanche, non ?",
      },
      {
        id: "s-t3",
        situation: "« Je suis en plein Ramadan / en vacances / en examen »",
        reponse: "Pas d'urgence, la conférence a lieu chaque dimanche. Noter de relancer.",
        verbatim:
          "Aucun problème, qu'Allah te facilite ! La conférence a lieu chaque dimanche donc il n'y a pas d'urgence. Dis-moi quand tu seras disponible et je te recontacterai à ce moment-là inch'Allah. Ça te va ?",
      },
      {
        id: "s-t4",
        situation: "« La conférence c'est quand ? J'suis pas dispo dimanche »",
        reponse: "Proposer un appel avec un coach en alternative.",
        verbatim:
          "La conférence a lieu ce dimanche à XH heure française. Si t'es pas dispo ce dimanche je peux te proposer un appel avec un coach de chez nous si tu veux. T'es dispo demain ou après demain ? Plutôt le matin ou l'après-midi ?",
      },
      {
        id: "s-t5",
        situation: "« Ça prend combien de temps la conférence ? »",
        reponse: "Environ 2h, ça passe vite tellement c'est dense.",
        verbatim:
          "Environ 2h00 — et crois-moi ça passe très vite tellement c'est dense en valeur. C'est un investissement de temps minime par rapport à ce que tu vas apprendre. Tu souhaites y participer du coup ?",
      },
    ],
  },
  {
    id: "reseaux",
    label: "Réseaux Sociaux & Visibilité",
    icon: "📱",
    objections: [
      {
        id: "s-r1",
        situation: "« Je ne veux pas me montrer sur les réseaux »",
        reponse: "Pas obligé de se montrer. Travailler en coulisses est possible.",
        verbatim:
          "Bonne nouvelle ! Notre modèle ne nécessite pas forcément de te montrer. Tu peux travailler en coulisses. C'est justement ce qui plaît à beaucoup de nos membres.",
      },
      {
        id: "s-r2",
        situation: "« Je n'y connais rien en digital / en technologie »",
        reponse: "Beaucoup partent de zéro. Programme structuré + coaching.",
        verbatim:
          "T'inquiète pas, beaucoup de nos élèves partaient de zéro. C'est justement pour ça qu'on a un programme structuré étape par étape + du coaching 4 fois par semaine. Tu seras accompagné à chaque étape. Tout ce qu'il te faut c'est un téléphone et de la motivation. Est-ce que t'es vraiment motivé.e toi ?",
      },
      {
        id: "s-r3",
        situation: "« J'ai pas de communauté / pas d'abonnés »",
        reponse: "Tous commencent de zéro. On apprend à construire sa communauté.",
        verbatim:
          "Aucun problème ! Nos élèves commencent tous de zéro. On t'apprend exactement comment construire ta communauté et attirer tes premiers prospects. C'est tout l'objet de l'accompagnement.",
      },
      {
        id: "s-r4",
        situation: "« Je suis nul(le) en vente »",
        reponse: "La vente est une compétence qui s'apprend, pas un talent inné.",
        verbatim:
          "Justement, c'est une compétence qu'on t'enseigne pas à pas. La vente c'est pas un talent inné — c'est une méthode. On a des élèves qui n'avaient jamais vendu de leur vie et qui aujourd'hui génèrent des centaines d'euros par vente. C'est exactement ce qu'on verra en conférence.",
      },
    ],
  },
  {
    id: "religion",
    label: "Religion, Éthique & Valeurs",
    icon: "🕌",
    objections: [
      {
        id: "s-re1",
        situation: "« Est-ce que c'est vraiment halal ? »",
        reponse: "Tout est construit autour de cette exigence. Pas de produits haram, pas de manipulation.",
        verbatim:
          "C'est LA question la plus importante et merci de la poser. Chez AL BARAKA, tout est construit autour de cette exigence. On ne vend pas de produits haram, pas de publicité mensongère, pas de manipulation. Le modèle est basé sur l'acquisition de compétences digitales réelles — création d'offres, vente éthique, personal branding. Tout est expliqué en détail lors de la conférence.",
      },
      {
        id: "s-re2",
        situation: "« Gagner de l'argent sur Internet c'est pas haram ? »",
        reponse: "Le Prophète \uFDFA était commerçant. Internet est juste un outil.",
        verbatim:
          "Le Prophète \uFDFA était commerçant, et le commerce est l'un des métiers les plus nobles en Islam. Internet c'est juste un outil — comme un marché. Ce qui compte c'est ce que tu vends et comment tu le vends. Chez AL BARAKA tout est aligné avec nos valeurs. La conférence t'expliquera tout ça en détail.",
      },
      {
        id: "s-re3",
        situation: "« J'ai peur que ça me détourne de ma pratique religieuse »",
        reponse: "L'activité doit renforcer la pratique, pas la fragiliser.",
        verbatim:
          "Au contraire akhi/oukhti — chez AL BARAKA on considère que ton activité doit renforcer ta pratique, pas la fragiliser. On travaille avec des horaires flexibles, tu gères ton temps. L'objectif c'est justement de pouvoir mieux pratiquer notre religion. C'est pour ça qu'on a construit cet écosystème.",
      },
      {
        id: "s-re4",
        situation: "« Mon mari / ma femme ne serait pas d'accord »",
        reponse: "La conférence est gratuite et sans engagement. Regarder ensemble.",
        verbatim:
          "Je comprends. Justement, la conférence est gratuite et sans engagement — tu peux même la regarder ensemble. Comme ça vous jugez tous les deux si c'est sérieux ou pas. Qu'est-ce que tu en penses ?",
      },
      {
        id: "s-re5",
        situation: "« C'est pas un peu de la riba tout ça ? »",
        reponse: "Aucune riba. C'est de la vente de services et formation — commerce pur.",
        verbatim:
          "Non, il n'y a aucune riba dans notre modèle. C'est de la vente de services et de formation — c'est du commerce pur. Il n'y a ni prêt, ni intérêt, ni spéculation. Tout est transparent et expliqué lors de la conférence.",
      },
    ],
  },
  {
    id: "situation",
    label: "Situation Personnelle & Financière",
    icon: "💰",
    objections: [
      {
        id: "s-si1",
        situation: "« J'ai pas d'argent à investir »",
        reponse: "La conférence est gratuite. On trouve toujours des solutions adaptées.",
        verbatim:
          "Je comprends. Justement la conférence est 100% gratuite — c'est le premier pas. L'idée c'est de te montrer ce qui est possible et de voir si tu corresponds au profil. Après, si tu veux aller plus loin, on trouve toujours des solutions adaptées au budget de chacun. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
      {
        id: "s-si2",
        situation: "« Je suis encore étudiant(e) »",
        reponse: "Beaucoup d'étudiants dans l'écosystème. C'est un avantage.",
        verbatim:
          "On a beaucoup d'étudiants dans notre écosystème ! C'est même un avantage — tu as du temps et de l'énergie. Le meilleur moment pour construire quelque chose c'est maintenant, avant d'être enfermé dans un CDI. La conférence est gratuite, viens voir si ça te parle. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
      {
        id: "s-si3",
        situation: "« Je suis au chômage / au RSA »",
        reponse: "C'est le meilleur moment pour agir. Tu as du temps.",
        verbatim:
          "C'est justement le meilleur moment pour agir. Tu as du temps à consacrer à un projet. La conférence est gratuite et t'engage à rien — au pire tu repars avec de la valeur. Et si ça te correspond, on a des solutions adaptées à toutes les situations financières. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
      {
        id: "s-si4",
        situation: "« J'ai des dettes / situation financière compliquée »",
        reponse: "Ne pas pousser à investir. Mais la conférence est gratuite et apporte de la clarté.",
        verbatim:
          "Je comprends ta situation et je ne vais pas te dire d'investir ce que tu n'as pas. Mais la conférence est gratuite — elle te donnera de la clarté sur comment sortir de cette spirale. Apprendre des compétences qui génèrent des revenus, c'est justement la solution pour changer ta situation. T'as rien à perdre à venir écouter. T'es ok pour qu'on vérifie ensemble si on peut t'aider ?",
      },
      {
        id: "s-si5",
        situation: "« J'ai déjà un business / je suis déjà entrepreneur »",
        reponse: "Beaucoup d'élèves avaient déjà une activité. Scaler ou diversifier.",
        verbatim:
          "Top ! Alors tu vas comprendre encore mieux la valeur de ce qu'on propose. Beaucoup de nos élèves avaient déjà une activité mais voulaient scaler ou diversifier. La conférence te montrera comment nos compétences digitales peuvent booster ce que tu fais déjà. T'es dispo dimanche ?",
      },
    ],
  },
  {
    id: "fantomes",
    label: "Fantômes, Vu & Non-réponses",
    icon: "👻",
    objections: [
      {
        id: "s-f1",
        situation: "Le prospect ne répond plus (ghosting)",
        reponse: "3 relances maximum avec un ton décontracté.",
        verbatim:
          "ah bah mon message est passé aux oubliettes à ce que je vois mdr t'es toujours là ?",
        etapes: [
          "Relance 1 (J+2) : « ah bah mon message est passé aux oubliettes à ce que je vois mdr t'es toujours là ? »",
          "Relance 2 (J+5) : « [Prénom], je ne vais pas te relancer 10 fois — je respecte ton temps. Mais je voulais juste m'assurer que t'avais vu mon dernier message. Si c'est pas pour toi, dis-le-moi simplement — aucun souci ! »",
          "Relance 3 — DERNIÈRE (J+10) : « Salamou 'alaykoum [Prénom]. Je clos la conversation de mon côté. Si un jour tu veux en savoir plus, n'hésite pas à me recontacter. Qu'Allah te facilite dans tes projets ! »",
        ],
      },
      {
        id: "s-f2",
        situation: "Le prospect a dit oui à la conférence mais ne vient pas",
        reponse: "Rappels programmés puis proposer la rediffusion.",
        verbatim:
          "Salamou 'alaykoum [Prénom], t'as pu être présent hier ? Sinon je peux t'envoyer la rediffusion. Dis-moi si ça te va ? Par contre il faudra me faire un retour avant demain midi si tu souhaites bénéficier de l'offre.",
        etapes: [
          "Rappel J-1 (samedi) : « Salamou 'alaykoum [Prénom] ! Petit rappel : la conférence c'est demain dimanche à XH. Tu recevras le lien dans le groupe whatsapp inshaAllah. Sois présent(e) du début à la fin pour profiter de la valeur ! »",
          "Rappel J0 (dimanche matin) : « Salamou 'alaykoum [Prénom] ! C'est aujourd'hui — XH. Regarde bien les vidéos dans le groupe inshaAllah ! À tout à l'heure ! »",
          "Si absent : proposer la rediffusion avec deadline de retour",
        ],
      },
      {
        id: "s-f3",
        situation: "« Ok je vais voir » / « Je vais réfléchir »",
        reponse: "Comprendre ce qui le freine. Proposer un appel si possible.",
        verbatim:
          "Aucun problème ! Prends le temps qu'il te faut mais juste pour info, je sais pas si t'as vu mais il y a une offre pour la conférence. T'as pu voir ça ? T'en pense quoi ? Qu'est-ce qui te fait hésiter ?",
      },
      {
        id: "s-f4",
        situation: "Le prospect laisse en « vu » sans répondre",
        reponse: "Un seul message de relance après un vu. Jamais deux.",
        verbatim:
          "Salamou 'alaykoum [Prénom], je vois que t'as lu mon message — juste n'hésite pas à me dire si tu ne le sens pas, on est là simplement pour apporter des compétences utiles à la communauté. N'hésite pas à me faire un retour. BarakaLahu fik !",
      },
    ],
  },
];
