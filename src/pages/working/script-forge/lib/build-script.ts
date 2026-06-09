/**
 * Moteur de génération de script — portage verbatim de la source Script Forge.
 * Déterministe : assemble les étapes par interpolation des champs f.* + phrases par segment.
 */
import type { FormData, ScriptStep, CallType } from "./types";
import { SEG_PHRASES } from "./seg-phrases";

export function buildDiscoverySteps(f: FormData): ScriptStep[] {
  const p = SEG_PHRASES[f.segment];
  return [
    { num: 1, title: "Connexion & Cadrage", duration: "1-2 min", objective: "Poser le cadre, contrôler les 4 premières secondes",
      sections: [
        { marker: "OUVERTURE", voice: "CALME + ENTHOUSIASTE", text: `Salam aleykoum, c'est ${f.callerName || "[CALLER]"} de ${f.offerName || "[NOM_OFFRE]"}. Comment vas-tu ?` },
        { marker: "CADRER L'APPEL", voice: "POSÉ", text: `Le but de cet appel est simple : on va faire connaissance, je vais comprendre ta situation. Si c'est cohérent, je t'inviterai à notre ${f.finalEvent || "[ÉVÉNEMENT_FINAL]"} où on présente notre méthode en détail. Ça te va comme fonctionnement ?`, tactic: "Attendre un OUI clair. C'est le premier engagement." },
      ] },
    { num: 2, title: "Qualification & Douleur", duration: "3-5 min", objective: "Comprendre sa situation actuelle et faire verbaliser sa douleur",
      sections: [
        { marker: "SITUATION", voice: "CURIOSITÉ", text: `Pour bien comprendre : actuellement, tu es dans quelle situation par rapport à ${f.mainPain ? "[" + f.mainPain + "]" : "[ton objectif]"} ?` },
        { marker: "DOULEUR", voice: "EMPATHIE", text: p.painProbe, tactic: `Aller chercher du concret. ${f.mainPain ? "Si la douleur évoquée correspond à « " + f.mainPain + " », tu es dans la cible." : "Plus il parle, mieux c'est."}` },
        { marker: "DURÉE", voice: "POSÉ", text: "Depuis combien de temps tu vis avec ça ?", tactic: "Ancrer la durée = ancrer l'urgence." },
        { marker: "TENTATIVES", voice: "CURIOSITÉ SINCÈRE", text: "T'as déjà essayé quelque chose pour sortir de là ? Et ça a donné quoi ?" },
      ] },
    { num: 3, title: "Vision & Objectif", duration: "2-4 min", objective: "Faire rêver, ancrer l'objectif chiffré",
      sections: [
        { marker: "OBJECTIF", voice: "CURIOSITÉ", text: `${p.visionProbe} ${f.delay || "[DÉLAI]"} ?` },
        { marker: "IMPACT", voice: "DOUX", text: "Et concrètement, ça changerait quoi dans ta vie ?", tactic: "Laisser développer son rêve. Chaque détail = un levier." },
        { marker: "IMPORTANCE", voice: "SÉRIEUX + DOUX", text: "C'est important pour toi d'atteindre ça ?", tactic: "Le OUI verbal est crucial." },
      ] },
    { num: 4, title: "Scoring & Fit", duration: "2-3 min", objective: "Vérifier que c'est un bon fit pour le programme",
      sections: [
        { marker: "CAPACITÉ", voice: "NEUTRE", text: "Pour avoir des résultats, il faut être capable d'investir [X heures/semaine]. C'est faisable pour toi ?" },
        { marker: "BUDGET (sans annoncer le prix)", voice: "NEUTRE", text: "Si tu trouves la bonne solution, t'es prêt à investir sur toi ?", tactic: `NE PAS annoncer le prix ici. Juste valider l'ouverture à investir.${f.avatar ? " Vérifie aussi mentalement qu'il colle bien à ton avatar : « " + f.avatar + " »." : ""}` },
      ] },
    { num: 5, title: "Invitation à l'événement final", duration: "1-2 min", objective: `Inviter à ${f.finalEvent || "[ÉVÉNEMENT_FINAL]"}`,
      sections: [
        { marker: "TRANSITION", voice: "CERTITUDE", text: `D'après ce que tu me dis, je pense sincèrement qu'on peut t'aider. Mais avant que je te présente quoi que ce soit, j'aimerais que tu participes à notre ${f.finalEvent || "[ÉVÉNEMENT_FINAL]"} — c'est là qu'on présente la méthode complète. T'es dispo [DATE] ?`, tactic: "Vérifier le créneau, valider la présence." },
      ] },
    { num: 6, title: "Verrouillage & Logistique", duration: "1 min", objective: "Verrouiller la présence à l'événement",
      sections: [
        { marker: "CONFIRMER", voice: "CALME", text: `Parfait, je te bloque le créneau. Tu vas recevoir le lien sur ${f.channel || "[CANAL]"}. C'est important que tu sois là — c'est sur cette session qu'on construit la suite.` },
        { marker: "ENGAGEMENT", voice: "DIRECT + AMICAL", text: "Je peux compter sur toi pour être là ?", tactic: "Un OUI ferme. Sinon, re-qualifier." },
        { marker: "CLÔTURE", voice: "CHALEUREUX", text: "À très vite alors, qu'Allah te facilite. BarakAllahu fik !" },
      ] },
  ];
}

export function buildClosingSteps(f: FormData): ScriptStep[] {
  const p = SEG_PHRASES[f.segment];
  const components = f.components ? f.components.split("\n").filter((c) => c.trim()) : ["[COMPOSANTE 1]", "[COMPOSANTE 2]", "[COMPOSANTE 3]"];
  const half = Math.ceil(components.length / 2);

  return [
    { num: 1, title: "Connexion & Cadrage", duration: "1-3 min", objective: "Contrôler le cadre dès les 4 premières secondes",
      sections: [
        { marker: "OUVERTURE", voice: "CALME + ENTHOUSIASTE",
          text: (() => {
            switch (f.prospectOrigin) {
              case "webinar":
                return `Salam aleykoum [Prénom], comment vas-tu ? J'espère que ${f.finalEvent || "la masterclass"} t'a plu — c'est ça qui m'a donné envie de te rappeler.`;
              case "referral":
                return `Salam aleykoum [Prénom], comment vas-tu ? On m'a beaucoup parlé de toi, je suis content(e) qu'on puisse échanger.`;
              case "inbound":
                return `Salam aleykoum [Prénom], comment vas-tu ? Tu as rempli le formulaire sur ${f.offerName || "[NOM_OFFRE]"} — j'ai bien noté ta demande, prêt(e) pour qu'on en discute ?`;
              case "cold":
              default:
                return `Salam aleykoum [Prénom], comment vas-tu ? Prêt(e) pour notre appel ?`;
            }
          })(),
          tactic: `Origine du prospect : ${f.prospectOrigin === "webinar" ? "POST-WEBINAIRE (déjà chaud, sait qui tu es)" : f.prospectOrigin === "referral" ? "REFERRAL (confiance préinstallée par le recommandant)" : f.prospectOrigin === "inbound" ? "INBOUND (a manifesté son intérêt, modèle de qualification)" : "COLD (premier contact direct, plus de cadrage nécessaire)"}.` },
        { marker: "CADRER", voice: "MYSTÉRIEUSE + SEREINE",
          text: f.prospectOrigin === "webinar"
            ? `Vu que tu as déjà suivi ${f.finalEvent || "la masterclass"}, on va aller à l'essentiel. On va revoir ta situation, ce qui t'a parlé dans la méthode, et on regardera ensemble si ${f.offerName || "[NOM_OFFRE]"} est fait pour toi. À la fin, tu décides.`
            : `Le but de cet appel est simple : on va comprendre ta situation et ce qui t'a bloqué jusqu'ici. Ensuite je t'expliquerai notre ${f.offerName || "[NOM_OFFRE]"} et comment on peut t'aider à ${f.promise || "[PROMESSE]"}. Et à la fin, tu pourras décider si c'est bien pour toi ou pas.` },
        { marker: "VALIDATION", voice: "RAISON",
          text: "Ça te va comme fonctionnement ?",
          tactic: "OUI clair, net et précis obligatoire." },
      ] },
    { num: 2, title: "Explorer la douleur", duration: "5-10 min", objective: "Faire REVIVRE la douleur (pas juste la rappeler) pour débloquer la vraie décision",
      sections: [
        { marker: "RAPPEL CO-CONSTRUIT", voice: "EMPATHIE",
          text: f.prospectOrigin === "webinar"
            ? `Pendant ${f.finalEvent || "la masterclass"}, qu'est-ce qui t'a le plus parlé ? Et qu'est-ce qui résonne avec TA situation aujourd'hui ?`
            : `[Prénom], on s'est dit que ${f.mainPain ? "[" + f.mainPain + "]" : "[PROBLÈME]"}. Je voudrais qu'on revienne dessus, parce que c'est de là qu'on part aujourd'hui.`,
          tactic: f.prospectOrigin === "webinar"
            ? "Post-webinaire : laisse-le verbaliser sa propre interprétation. Ce qu'il retient = ce qui l'a touché émotionnellement."
            : "Pas \"tu m'as dit\". On \"se l'est dit ensemble\" — co-construction = engagement." },
        { marker: "DERNIER ÉPISODE PRÉCIS", voice: "CURIOSITÉ + EMPATHIE",
          text: `Raconte-moi le DERNIER moment où tu as vraiment ressenti ça. C'était quand ? Tu faisais quoi à ce moment-là ?`,
          tactic: "NE PAS te contenter de \"récemment\". Pousse jusqu'à l'épisode précis : date, lieu, contexte, personnes présentes. Cette précision = re-incarnation émotionnelle." },
        { marker: "DIALOGUE INTÉRIEUR", voice: "CURIOSITÉ",
          text: `Et à ce moment-là, qu'est-ce que tu te disais dans ta tête ? Mot à mot si tu peux.`,
          tactic: "On fait remonter le DIALOGUE INTÉRIEUR. C'est ÇA la vraie douleur, pas la situation objective. Note ces mots — tu les réutilises dans le pitch." },
        { marker: "JOURNÉE TYPE", voice: "CURIOSITÉ", text: p.painProbe,
          tactic: "À utiliser si l'épisode précis n'a pas suffi. Sinon, sauter — on a déjà la douleur incarnée." },
        { marker: "DURÉE EXACTE", voice: "POSÉ",
          text: `Et tu vis avec ça depuis combien de temps exactement ?`,
          tactic: "Insister sur \"exactement\". Pas \"depuis un moment\". Une durée chiffrée ancre l'urgence et fait honte à l'inaction." },
        { marker: "TENTATIVES ET ÉCHECS", voice: "CURIOSITÉ SINCÈRE",
          text: `Tu as déjà essayé quelque chose pour sortir de là ? Ça a donné quoi concrètement ?`,
          tactic: "Si aucun résultat, reformule en miroir : \"Donc zéro bénéfice malgré le temps investi ?\" — il constate lui-même l'échec." },
        { marker: "TROIS MOTS", voice: "CURIOSITÉ",
          text: `Si tu devais me résumer ce que tu ressens en 3 mots, ce serait quoi ?`,
          tactic: "TRÈS PUISSANT. 3 mots = ses propres mots = ton arsenal verbal pour le pitch (étape 7), la garantie et la clôture. NOTE-LES MOT POUR MOT." },
      ] },
    { num: 3, title: "Amplifier & Constater", duration: "2-4 min", objective: "Que le prospect verbalise TOUTE sa frustration",
      sections: [
        { marker: "CONSTAT", voice: "PRÉCISION", text: `Donc actuellement t'as aucune méthode en place pour ${f.promise || "[OBJECTIF]"}, c'est ça ?` },
        { marker: "SATISFACTION", voice: "CALME", text: "Tu dirais que t'es plutôt comblé(e) ou plutôt INSATISFAIT(E) ?" },
        { marker: "ACCEPTATION", voice: "SÉRIEUX + DOUX", text: "Est-ce que tu acceptes de rester bloqué(e) là ?" },
        { marker: "AUTRES POINTS", voice: "CURIOSITÉ", text: "Quels sont les autres points qui font que tu n'aimes pas où tu en es ?", tactic: "Plus il en dit, plus tu as d'arguments pour la suite." },
      ] },
    { num: 4, title: "Vision & Projection", duration: "4-7 min", objective: "Faire VIVRE la vision (pas juste l'énoncer) pour aimanter la décision",
      sections: [
        { marker: "OBJECTIF CLAIR", voice: "CURIOSITÉ",
          text: `[Prénom], quel objectif précis tu souhaiterais atteindre d'ici ${f.delay || "[DÉLAI]"} ?`,
          tactic: "Si la réponse est vague (« être mieux »), creuser jusqu'à du chiffré et du concret." },
        { marker: "JOURNÉE IDÉALE", voice: "CURIOSITÉ + DOUX",
          text: `Ferme les yeux une seconde si tu veux. Tu es dans 6 mois, tu as atteint ${f.promise || "[ton objectif]"}. Décris-moi ta journée. Tu te réveilles, il est quelle heure ? Tu fais quoi en premier ?`,
          tactic: "C'est ICI que la vente se joue émotionnellement. Le prospect doit VOIR cette journée, pas l'énoncer abstraitement. Laisser respirer." },
        { marker: "SENSATION CORPORELLE", voice: "DOUX",
          text: `Et dans cette journée, comment tu te sens ? Pas mentalement, physiquement ? Qu'est-ce qui a changé dans ton corps ?`,
          tactic: "On passe du mental à l'incarné. Sensation physique = mémoire émotionnelle = engagement réel." },
        { marker: "L'ENTOURAGE", voice: "CURIOSITÉ",
          text: `Qui est avec toi dans cette journée ? Et eux, comment ils sont par rapport à toi ?`,
          tactic: "L'identité sociale du prospect change avec la transformation. Faire émerger le regard des proches = ancrer la fierté future." },
        { marker: "CE QUI A CHANGÉ", voice: "CURIOSITÉ",
          text: `Et toi, qu'est-ce qui a fondamentalement changé en toi entre aujourd'hui et ce moment-là ?`,
          tactic: "La vraie transformation est interne, pas circonstancielle. Cette phrase fait sortir la motivation profonde." },
        { marker: "TROIS MOTS DE LA VISION", voice: "CURIOSITÉ",
          text: `Si tu devais résumer ce que tu ressentirais dans cette journée, en 3 mots, ce serait quoi ?`,
          tactic: "Pendant du « 3 mots de la douleur » de l'étape 2. Tu as maintenant TON arsenal des 3 mots positifs ET négatifs — utilise-les dans le pitch et la garantie." },
        { marker: "IMPORTANCE", voice: "SÉRIEUX + DOUX",
          text: `[Prénom], c'est vraiment important pour toi d'atteindre ça ?`,
          tactic: "OUI verbal CRUCIAL après l'incarnation. Il ne peut plus reculer sans se contredire émotionnellement." },
      ] },
    { num: 5, title: "Le Fossé", duration: "2-4 min", objective: "Faire constater l'écart entre situation actuelle et objectif",
      sections: [
        { marker: "RÉSUMÉ", voice: "POSÉ + EMPATHIE", text: `Si je résume : actuellement [SITUATION], le problème [PROBLÈME], et ce que tu aimerais c'est ${f.promise || "[OBJECTIF]"} d'ici ${f.delay || "[DÉLAI]"}. C'est bien ça ?`, tactic: "Reformuler avec SES mots. OUI ferme." },
        { marker: "LE FOSSÉ", voice: "POSÉ", text: "Entre ces deux situations, il y a un grand fossé, t'es d'accord ?" },
        { marker: "SANS AIDE", voice: "POSÉ", text: "Si tu ne te fais pas aider, tu penses que tu pourrais y arriver seul(e) ?" },
        { marker: "RISQUE LONG TERME", voice: "EMPATHIE + GRAVE", text: p.gap },
        { marker: "BESOIN D'AIDE", voice: "CURIOSITÉ", text: "Sur quoi t'as le plus besoin d'aide aujourd'hui ?", tactic: "Le prospect décrit lui-même le programme idéal — qui sera le tien." },
      ] },
    { num: 6, title: "Pré-engagement", duration: "1-3 min", objective: "Cadrer la décision : OUI ou NON clair, pas d'excuses",
      sections: [
        { marker: "CONVICTION", voice: "CERTITUDE + SINCÉRITÉ", text: `[Prénom], chez ${f.offerName || "[NOM_OFFRE]"} ${f.founder ? "avec " + f.founder : ""} on a aidé beaucoup de ${f.avatar ? f.avatar : "personnes comme toi"}. Je pense sincèrement qu'on peut t'aider. T'es d'accord qu'il faut agir pour que ça change ?`, tactic: "Attendre le OUI." },
        { marker: "POSITIONNEMENT", voice: "CADRE CLAIR", text: `Soit tu me dis "OUI je veux rejoindre ${f.offerName || "[NOM_OFFRE]"}" et on procède pendant cet appel. Soit tu me dis clairement non.` },
        { marker: "PAS D'EXCUSES", voice: "SOURIRE + DIRECT", text: "Par contre ce que je veux pas c'est qu'on se cache derrière des excuses comme \"il faut que je réfléchisse\". On est d'accord ?", tactic: "Sourire indispensable." },
      ] },
    { num: 7, title: `Présentation — Pilier 1`, duration: "5-9 min", objective: "Poser la big idea et dévoiler le premier pilier",
      sections: [
        { marker: "TRANSITION MYSTÉRIEUSE", voice: "MYSTÉRIEUSE + SEREINE",
          text: `Super [Prénom]. Sans perdre de temps, je vais te montrer comment notre programme va te permettre d'atteindre ${f.promise || "[OBJECTIF]"}. Notre programme se décompose en 3 GRANDS piliers, chacun pensé pour que tu obtiennes des résultats. Et le but, c'est que tu puisses ${f.promise || "[PROMESSE]"} en ${f.delay || "[DÉLAI]"}. Voilà comment ça va se passer.`,
          tactic: "Voix posée, presque confidentielle. Le prospect doit sentir qu'il accède à quelque chose de structuré." },
        ...(f.bigIdea ? [{ marker: "BIG IDEA", voice: "CERTITUDE",
          text: `Ce qui fait toute la différence chez ${f.offerName || "[NOM_OFFRE]"} — et ce que tu ne trouveras nulle part ailleurs — c'est ${f.bigIdea}. C'est ÇA qui te permet d'obtenir ce que les autres méthodes ne te donnent pas.`,
          tactic: "La Big Idea = le POURQUOI ça marche. Sans elle, ton offre est une liste de modules." }] : []),
        { marker: "PILIER 1", voice: "ÉNERGIQUE + ENTHOUSIASTE",
          text: `Le 1er pilier [Prénom], on l'appelle ${f.pillar1Name ? "« " + f.pillar1Name + " »" : "[NOM_PILIER_1]"}. C'est ce qui te permet de poser les fondations solides. Voilà concrètement ce qu'il contient :`,
          tactic: "Le nom du pilier doit CLAQUER comme une marque. Énergie palpable." },
        ...components.slice(0, half).map((c, i) => ({
          marker: `COMPOSANTE ${i + 1}`, voice: "PÉDAGOGIQUE",
          text: c,
        })),
        { marker: "CE QUE ÇA TE PERMET", voice: "CONVICTION",
          text: `Donc rien que ce premier pilier [Prénom], il te donne TOUT ce qu'il te faut pour commencer à ${f.promise ? "avancer concrètement vers " + f.promise : "atteindre ton objectif"} dès la première semaine. Sans hésiter, sans deviner, sans tâtonner.`,
          tactic: "Faire vivre le bénéfice CONCRET, pas juste lister les composantes." },
        { marker: "QUESTIONS PILIER 1", voice: "CURIOSITÉ",
          text: `Voilà pour le premier pilier. Avant qu'on passe au suivant, quelles sont tes questions sur celui-là ?`,
          tactic: "PAUSE. C'est ici qu'il révèle ses premiers doutes — chaque question traitée = un obstacle levé pour le closing." },
      ] },
    { num: 8, title: "Présentation — Pilier 2 & Pilier 3", duration: "5-9 min", objective: "Dévoiler le pilier 2 + le pilier 3 = ACCOMPAGNEMENT (le plus puissant)",
      sections: [
        { marker: "PILIER 2", voice: "ÉNERGIQUE + ENTHOUSIASTE",
          text: `Génial [Prénom], le 2ᵉ pilier on l'appelle ${f.pillar2Name ? "« " + f.pillar2Name + " »" : "[NOM_PILIER_2]"}. Il est dédié à pousser tes résultats plus loin. Voilà ce qu'il contient :` },
        ...components.slice(half).map((c, i) => ({ marker: `COMPOSANTE ${half + i + 1}`, voice: "PÉDAGOGIQUE", text: c })),
        ...(f.mainBonus ? [{ marker: "CERISE SUR LE GÂTEAU", voice: "ÉVIDENCE + CHALEUR",
          text: `Et en plus de ça [Prénom], surprise du chef — quand tu nous rejoins aujourd'hui, on t'offre ${f.mainBonus}. Ce qui veut dire que tu démarres avec un avantage que les autres n'ont pas.`,
          tactic: "Le bonus = la cerise sur le gâteau, présenté comme une surprise dévoilée. Pas comme une argumentation lourde." }] : []),
        { marker: "QUESTIONS PILIER 2", voice: "CURIOSITÉ",
          text: `Voilà pour le second pilier [Prénom]. Avant qu'on passe au dernier, quelles sont tes questions ?`,
          tactic: "PAUSE encore. Ne pas enchaîner." },
        { marker: "PILIER 3 — ACCOMPAGNEMENT", voice: "POSÉ + CONVICTION",
          text: `Ok top [Prénom], maintenant laisse-moi t'expliquer le 3ᵉ et dernier pilier. C'est selon moi le PLUS IMPORTANT, parce que c'est grâce à lui que tu obtiendras le plus de résultats. C'est tout simplement l'accompagnement personnalisé.`,
          tactic: "Posément. Ne pas le balancer comme une simple composante — c'est LE pilier qui fait basculer la décision." },
        { marker: "POURQUOI L'ACCOMPAGNEMENT", voice: "CONVICTION",
          text: `Le but, c'est qu'on s'adapte à TA situation. Parce que comme tu le sais, chacun est unique, et si on veut te GARANTIR des résultats, c'est à nous de nous adapter à toi. On te donne des retours 100% PERSONNALISÉS qui font que tu pourras avancer de la meilleure des manières sur ce que tu as fait de bien ou pas.`,
          tactic: "Insister sur le mot PERSONNALISÉ. C'est ce qui distingue ton offre d'un cours en ligne anonyme." },
        { marker: "CONVICTION FINALE", voice: "CERTITUDE",
          text: `Notre système, C'EST UN FAIT, il FONCTIONNE. Et le SEUL facteur X — le fait que tes résultats dépendent aussi de toi — on le comble en t'apportant un soutien quotidien${f.channel ? " (réponse rapide sur " + f.channel + ")" : ""}. On te tient par la main et on sera TOUJOURS là pour toi, quoi qu'il arrive. C'est aussi pour ça qu'autant de personnes décident de nous rejoindre — on ne te lâche pas jusqu'à ce que tu obtiennes tes résultats.`,
          tactic: "C'est LA phrase qui anticipe l'objection \"je suis pas sûr que ça marche pour moi\". À dire avec une conviction absolue, presque solennelle." },
        { marker: "QUESTIONS PILIER 3", voice: "CURIOSITÉ",
          text: `Voilà [Prénom]. Quelles sont tes questions sur ce dernier pilier ?`,
          tactic: "Dernière pause avant la phase de témoignages + objections. Si questions, traiter avec la séquence : GRATIFIER → CLARIFIER → RÉPONDRE → JUSTIFIER." },
      ] },
    { num: 9, title: "Témoignages & Question magique", duration: "3-7 min", objective: "Lever les derniers doutes par la preuve sociale + faire sortir la VRAIE objection",
      sections: [
        { marker: "TÉMOIGNAGES", voice: "CONVICTION TRANQUILLE",
          text: `Avant de finir, je te montre les retours concrets de gens qu'on a accompagnés et qui étaient dans une situation proche de la tienne.`,
          tactic: "Partager l'écran, montrer 3-4 témoignages choisis sur des profils PROCHES (âge, situation, point de départ). Raconter brièvement l'histoire de chaque client." },
        { marker: "CADRE DE RÉPONSE", voice: "POSÉ",
          text: ``,
          tactic: "Pour chaque question du prospect : GRATIFIER (« super question ») → CLARIFIER (« si je comprends bien tu veux savoir si… ») → RÉPONDRE (concis) → JUSTIFIER (« et c'est parce que X fonctionne comme ça que tu pourras atteindre [objectif] »)." },
        { marker: "QUESTION MAGIQUE", voice: "CURIOSITÉ",
          text: `Maintenant [Prénom], sachant que tu as vu les retours des gens qu'on a accompagnés, selon TOI, qu'est-ce qui pourrait te bloquer dans l'atteinte de ${f.promise || "[ton objectif]"} ?`,
          tactic: "LA QUESTION QUI FAIT TOUT SORTIR. Si le prospect dit « rien », tu peux annoncer le prix. S'il évoque un doute, c'est ta vraie objection à traiter avant d'annoncer le prix." },
      ] },
    { num: 10, title: "Échelle de conviction", duration: "2-5 min", objective: "Mesurer la conviction AVANT le prix + traiter selon la tranche",
      sections: [
        { marker: "LA QUESTION", voice: "CURIOSITÉ",
          text: `[Prénom], dernière chose avant qu'on parle du prix. Sur une échelle de 1 à 10 — à 1 tu penses que ça ne va pas marcher pour toi, à 10 tu es sûr(e) à 100% qu'avec nous tu vas ${p.scale} ${f.promise || "[OBJECTIF]"} en ${f.delay || "[DÉLAI]"}. Tu te situes à combien ?`,
          tactic: "Écouter la TONALITÉ autant que le chiffre. Un \"7\" hésitant ≠ un \"7\" assumé." },
        { marker: "SI 1-3 — PROBLÈME DE MÉTHODE", voice: "CURIOSITÉ BIENVEILLANTE",
          text: `OK [Prénom], dis-moi ce qui te fait dire ça. Qu'est-ce qui dans la méthode ne te semble pas adapté à ta situation ?`,
          tactic: "⚠️ À 1-3 = il n'est PAS CONVAINCU de la méthode. RETOUR ÉTAPE 4 (Le Fossé) + RE-PITCHER les piliers. Ne JAMAIS annoncer le prix avec cette note." },
        { marker: "SI 4-6 — PROBLÈME DE PEUR", voice: "EMPATHIE",
          text: `OK [Prénom], et qu'est-ce qui te ferait monter à 9 ou 10 ?`,
          tactic: "⚠️ À 4-6 = PEUR. Souvent : peur d'échouer, peur du regard des proches, peur de ne pas y arriver. Creuser la peur (\"c'est quoi qui te fait peur le plus ?\") puis rappeler le Pilier 3 (Accompagnement personnalisé) + un témoignage de quelqu'un qui partait du même point." },
        { marker: "SI 7-8 — ÉLÉMENT MANQUANT", voice: "CURIOSITÉ",
          text: `Super [Prénom]. Qu'est-ce qui manquerait pour que tu sois à 10 ?`,
          tactic: "✅ À 7-8 = c'est CHAUD. Il manque juste UN élément précis. Note la réponse mot pour mot. Apporter cet élément spécifique (témoignage ciblé, détail du programme, garantie) puis demander : \"Donc maintenant, tu serais à combien ?\"" },
        { marker: "SI 9-10 — PASSER AU PRIX", voice: "ÉVIDENCE",
          text: `Parfait [Prénom]. Alors on peut parler concrètement maintenant ?`,
          tactic: "✅ À 9-10 = TU PEUX ANNONCER LE PRIX. Ne pas perdre de temps en blabla — passer à l'étape 11 immédiatement." },
      ] },
    { num: 11, title: "Annonce du prix + Garantie en réserve", duration: "4-8 min", objective: "Annoncer le prix avec un ancrage VRAI + utiliser la garantie comme carte tactique",
      sections: [
        { marker: "AUTORISATION", voice: "ÉVIDENCE",
          text: `Super [Prénom], si tu n'as plus d'autre question, est-ce que tu es prêt(e) pour que je t'annonce le prix de notre programme ?`,
          tactic: "Attendre le OUI franc. Ce OUI = autorisation explicite d'annoncer." },
        { marker: "RAPPEL OBJECTIF", voice: "POSÉ",
          text: `L'objectif, c'est que tu puisses ${f.promise || "[PROMESSE]"} en ${f.delay || "[DÉLAI]"}.`,
          tactic: "PAUSE après cette phrase. Réancrer le rêve juste avant d'annoncer." },
        ...(f.marketPrice || f.inactionCost ? [{
          marker: "ANCRAGE LÉGITIME", voice: "POSÉ",
          text: [
            f.marketPrice ? `Tu sais [Prénom], sur le marché ce type de programme se vend ${f.marketPrice}.` : "",
            f.inactionCost ? `Et si tu fais rien, l'inaction te coûte ${f.inactionCost}.` : "",
          ].filter(Boolean).join(" "),
          tactic: "Ancrage VRAI basé sur les données réelles de ton business — pas de mensonge sur un \"prix cible futur\"." }] : [{
          marker: "ANCRAGE — À PERSONNALISER", voice: "POSÉ",
          text: `[Ajoute ton ancrage légitime : prix de marché OU coût de l'inaction. Renseigne ces champs dans le formulaire pour un script propre.]`,
          tactic: "Pour avoir un ancrage personnalisé, retourne dans le formulaire section 06 et remplis \"Prix de marché\" ou \"Coût de l'inaction\"." }]),
        { marker: "ANNONCE DU VRAI PRIX", voice: "ÉVIDENCE + CALME",
          text: `Aujourd'hui, pour nous rejoindre, c'est ${f.price || "[PRIX]"}${f.mainBonus ? " — et tu repars avec " + f.mainBonus + " inclus" : ""}.`,
          tactic: "Posé. Calme. Pas de justification immédiate. Pas de \"seulement\" ou \"uniquement\"." },
        { marker: "SILENCE 10 SEC", voice: "—",
          text: `+ SILENCE 10 SECONDES MINIMUM`,
          tactic: "Le premier qui parle est en position basse. Bouche-toi les oreilles si nécessaire. Laisse-LE parler." },
        { marker: "ISOLER L'ENVIE", voice: "CALME",
          text: `En dehors de la question du budget, est-ce que tu as vraiment envie de nous rejoindre ?`,
          tactic: "Isolation classique : on sépare le \"je veux\" du \"je peux\". Si la réponse est non sur l'envie, retour étape 10 (échelle)." },
        { marker: "PRIX vs BUDGET", voice: "DIRECT",
          text: `Est-ce que pour toi c'est une question de prix (tu estimes que ça ne vaut pas le coup) ou une question de budget (tu n'as simplement pas la somme aujourd'hui) ?`,
          tactic: "Distinction CRITIQUE. Prix = problème de valeur perçue → retour à la valeur. Budget = cash → facilités." },
        { marker: "FACILITÉS DE PAIEMENT", voice: "SOLUTIONNANT",
          text: `Un paiement en 2 ou 3 fois pourrait être une solution ? Sinon on peut aller jusqu'à 6, 8 ou 10x.`,
          tactic: "S'adapter au budget réel. Ne raccrocher qu'après avoir épuisé les options de financement." },
        ...(f.guaranteeResult ? [{
          marker: "GARANTIE — CARTE TACTIQUE", voice: "CONVICTION TRANQUILLE",
          text: `[Prénom], écoute. Si on est encore là dans cet appel, c'est parce que je suis convaincu(e) à 100% qu'on peut t'apporter les résultats. Et justement, je n'ai pas voulu en parler tout à l'heure parce que je ne voulais pas que ta décision soit basée dessus — mais nous avons une garantie : si BIZARREMENT, tu n'as pas atteint ${f.guaranteeResult} après avoir appliqué nos process, on te rembourse INTÉGRALEMENT.`,
          tactic: "⚠️ NE PAS sortir la garantie en début de présentation. C'est ta CARTE FINALE qui fait basculer quand le prospect hésite sur le prix." },
        { marker: "CADRE DE LA GARANTIE", voice: "PÉDAGOGIQUE",
          text: `Évidemment, la garantie vaut dans la mesure où tu APPLIQUES nos process — c'est juste LOGIQUE. En contrepartie, on te demandera un témoignage quand tu auras atteint ton objectif.`,
          tactic: "Toujours cadrer la garantie : conditions claires + contrepartie symbolique." }] : [{
          marker: "GARANTIE — SI TU EN OFFRES UNE", voice: "CONVICTION TRANQUILLE",
          text: `[Si tu offres une garantie de résultat, c'est ICI qu'il faut la jouer comme carte tactique. Renseigne le champ "Résultat minimum garanti" dans le formulaire section 06 pour un script propre.]`,
          tactic: "La garantie est la carte de réserve. Si ton offre n'a pas de garantie de résultat structurée, retire cette section ou propose juste une garantie satisfait/remboursé 14 jours." }]),
      ] },
    { num: 12, title: "Inscription & Onboarding", duration: "3-8 min", objective: "Transformer le OUI verbal en paiement RÉEL — moment où 30% des ventes se perdent",
      sections: [
        { marker: "APPEL À L'ACHAT", voice: "SINCÉRITÉ",
          text: `[Prénom], je suis sincèrement persuadé(e) que c'est la MEILLEURE décision que tu prendras aujourd'hui. Qu'est-ce qu'on fait ? On avance ensemble ? Je t'envoie le lien pour ton inscription, comme ça je t'expliquerai la suite.`,
          tactic: "Voix de la sincérité, pas de l'enthousiasme prématuré. Le prospect ne doit pas sentir que tu vends, mais que tu confirmes son bon choix." },
        { marker: "GO + GARDER EN LIGNE", voice: "CADRE CLAIR",
          text: `OK, je te garde au téléphone jusqu'à la fin de l'inscription. On fait ça ensemble, prends ton temps.`,
          tactic: "⚠️ NE JAMAIS raccrocher avant confirmation paiement. C'est ICI que 30% des \"OUI verbaux\" se perdent. Le prospect a dit OUI, son cœur bat à 180, il a besoin d'une présence rassurante." },
        { marker: "ENVOI DU LIEN EN DIRECT", voice: "POSÉ + RASSURANT",
          text: `Je t'envoie le lien d'inscription maintenant sur ${f.channel || "[CANAL]"}. Tu vas voir le formulaire de paiement apparaître.`,
          tactic: "Envoie le lien EN DIRECT pendant que tu parles, pas après l'appel. Le moindre délai = porte ouverte au doute." },
        { marker: "GUIDER LE REMPLISSAGE", voice: "POSÉ + CHALEUREUX",
          text: `Tu remplis tranquillement. Attention à l'adresse email — c'est avec elle que tu recevras tes accès. Je reste au bout du fil, prends ton temps.`,
          tactic: "Le silence du remplissage = moment critique. NE PAS combler avec du bla-bla. Laisser le prospect se concentrer. Respirer." },
        { marker: "VALIDATION VISUELLE", voice: "POSÉ",
          text: `Tu es prêt(e) ? Tu cliques sur "Payer". Tu vois le bouton ?`,
          tactic: "Garder la voix neutre. Pas de cri de joie prématuré. On valide visuellement chaque étape pour éviter le bug technique qui tue la vente." },
        { marker: "PAGE DE CONFIRMATION", voice: "POSÉ",
          text: `Tu dois voir une page de confirmation, un message du genre "Paiement validé". Tu la vois ?`,
          tactic: "Si le prospect ne voit pas la page = problème technique = résoudre IMMÉDIATEMENT, pas le lendemain. Sinon il appellera sa banque pour annuler." },
        { marker: "VÉRIFICATION EMAIL", voice: "POSÉ",
          text: `Tu as reçu un email avec tes accès ? Si non, vérifie aussi tes spams. Tu peux me confirmer ?`,
          tactic: "Toujours attendre la confirmation de l'email d'accès reçu. NE JAMAIS raccrocher avant." },
        { marker: "FÉLICITER (avec énergie)", voice: "SINCÈRE + CHALEUREUX",
          text: `MachaAllah [Prénom] ! Vraiment, FÉ-LI-CI-TA-TIONS. Meilleure décision de ta journée. Qu'Allah te facilite chaque étape de la suite.`,
          tactic: "C'est SEULEMENT MAINTENANT, après confirmation du paiement, qu'on peut féliciter avec énergie. Pas avant — sinon le prospect sent qu'on a marqué un point sur lui." },
        { marker: "ANCRER LA RAISON DU OUI", voice: "CURIOSITÉ",
          text: `Dis-moi [Prénom], qu'est-ce qui t'a vraiment poussé(e) à dire OUI aujourd'hui ?`,
          tactic: "IL se convainc LUI-MÊME. Réduit massivement les remords post-achat. Note la réponse mot pour mot — c'est ta meilleure preuve sociale future et ton meilleur ancrage anti-remboursement." },
        { marker: "PROCHAIN PAS CONCRET", voice: "PÉDAGOGIQUE",
          text: `Maintenant tu peux enregistrer mon numéro — je reste là pendant tout ton parcours. Dès que tu termines le module 1, tu me tiens au courant pour qu'on fasse le point.`,
          tactic: "Engager sur la PREMIÈRE ACTION CONCRÈTE. Crée le pont entre la vente et l'utilisation. Sans cet engagement, 40% des clients ne lancent jamais le programme et demandent un remboursement." },
        { marker: "CLÔTURE", voice: "CHALEUREUX",
          text: `C'EST PARTI. Je te laisse commencer à visionner dès maintenant si tu le souhaites. À très vite [Prénom], qu'Allah te facilite. BarakAllahu fik !`,
          tactic: "Clôture qui referme la boucle commerciale. L'élève sait quoi faire et quand revenir vers toi." },
      ] },
  ];
}

export function buildScript(f: FormData): ScriptStep[] {
  const fullSteps = f.type === "discovery" ? buildDiscoverySteps(f) : buildClosingSteps(f);
  // Profil A (low-ticket 1-97€) : version condensée 30 min max
  if (f.profile === "A") {
    return compactForLowTicket(fullSteps, f.type);
  }
  return fullSteps;
}

// Pour low-ticket : condenser le script en gardant l'ossature
// mais en retirant les étapes/sections trop longues qui font décrocher
export function compactForLowTicket(steps: ScriptStep[], type: CallType): ScriptStep[] {
  if (type === "discovery") {
    // Découverte low-ticket : 4 étapes max (au lieu de 6), 15-20 min
    // On garde : Connexion, Douleur (allégée), Vision (allégée), Invitation
    return steps
      .filter((s) => ![3, 4].includes(s.num)) // retire Vision détaillée et Scoring (on fait court)
      .map((s, i) => ({ ...s, num: i + 1, sections: s.sections.slice(0, Math.max(2, Math.floor(s.sections.length / 2))) }));
  } else {
    // Closing low-ticket : 7 étapes au lieu de 12, 30 min max
    // On garde : Connexion, Douleur (allégée), Vision (allégée), Pré-engagement, Pitch consolidé, Prix, Inscription
    const keepNums = [1, 2, 4, 6, 7, 11, 12];
    return steps
      .filter((s) => keepNums.includes(s.num))
      .map((s, i) => ({
        ...s,
        num: i + 1,
        duration: s.duration ? s.duration.replace(/\d+-\d+/, (m) => {
          const [a, b] = m.split("-").map(Number);
          return `${Math.max(1, Math.floor(a / 2))}-${Math.max(2, Math.floor(b / 2))}`;
        }) : s.duration,
        // Garder uniquement les 4 premières sections pour aller à l'essentiel
        sections: s.sections.slice(0, 4),
      }));
  }
}

export function esc(s: unknown): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Mapping intonation → famille de couleur (5 familles + silence)
export function getVoiceClass(voice: string): string {
  if (!voice || voice === "—" || voice === "-" || voice.trim() === "") return "voice-silence";
  const v = voice.toUpperCase();
  // Ordre de priorité décroissant : la voix dominante l'emporte
  if (v.includes("CERTITUDE") || v.includes("CONVICTION") || v.includes("SINCÉRIT") || v.includes("SINCÈRE")) return "voice-conviction";
  if (v.includes("ÉNERGI") || v.includes("ENTHOUSIAST")) return "voice-energie";
  if (v.includes("MYSTÉR") || v.includes("MYSTER")) return "voice-mystere";
  if (v.includes("EMPATH") || v.includes("CURIOSI") || v.includes("CHALEUREUX") || v === "OUVERT") return "voice-empathie";
  if (v.includes("DIRECT") || v.includes("CADRE") || v.includes("RAISON") || v.includes("ÉVIDENC") || v.includes("EVIDENC") || v.includes("SOLUTIONN") || v.includes("PÉDAGOGI") || v.includes("PEDAGOGI") || v.includes("POSÉ") || v.includes("POSE")) return "voice-cadre";
  return "voice-empathie"; // défaut
}
