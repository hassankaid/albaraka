/**
 * M16 — Génération locale (Version B, heuristique, SANS IA).
 * Marqueurs : « » = à personnaliser par l'élève (jaune) · ‹ › = exemple (gris).
 */
import { type M16State, type Section, type FormatKey, type Ctx } from "./types";
import { ctx } from "./validations";

export function PH(t: string): string { return "« " + t + " »"; }
export function EX(t: string): string { return "‹ Ex: " + t + " ›"; }
export function lc(s: string): string { s = String(s || ""); return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

export function generateSections(state: M16State): Section[] {
  const c: Ctx = ctx(state);
  const fmt = state.data.format_choisi;
  const promesse = state.data.promesse_lt.trim();
  const meca = c.mecanisme || PH("le nom de ta méthode");
  const prog = c.programme_mt || PH("ton offre principale");
  const painLine = c.dominant_pain || PH("la douleur n°1 de ton client");
  const pa = c.point_a || PH("sa situation de départ");
  const pb = c.point_b || PH("le résultat visé");
  /* versions « première lettre en minuscule » pour insertion fluide en milieu de phrase */
  const painL = lc(painLine), paL = lc(pa), pbL = lc(pb);
  const promL = lc(promesse || PH("le résultat que tu promets"));

  let sections: Section[] = [];
  if (fmt === "mini_cours") {
    sections.push({ heading: "Plan du mini-cours", body:
      "Ton mini-cours, c'est 4 vidéos courtes (5 à 12 min chacune). Une seule idée + une seule action par vidéo. L'ensemble doit amener ton spectateur de sa situation de départ (« " + paL + " ») à un premier résultat concret, puis lui donner envie d'aller plus loin.\n\n" +
      "L1 — Le vrai problème : pourquoi ça n'a pas marché jusqu'ici\n" +
      "L2 — " + meca + " : la méthode en 3 étapes\n" +
      "L3 — Le quick win : la première action, faite ensemble\n" +
      "L4 — La suite : ce qui vient après\n\n" +
      "Dans les scripts ci-dessous : ce qui est écrit en clair, tu le dis tel quel ; les passages surlignés entre « » sont à remplacer par tes éléments." });

    sections.push({ heading: "Script L1 — Accroche + le vrai problème", body:
      "[Face caméra, énergie haute dès la 1re seconde]\n\n" +
      "À dire : Si tu regardes cette vidéo, c'est sans doute que tu vis ça : " + painL + ". Et tu as sans doute déjà essayé " + PH("1 ou 2 solutions classiques que ton avatar a tentées") + ", sans que ça tienne.\n\n" +
      "Enchaîne : Dans ce mini-cours, je vais te montrer comment " + promL + ". Moi c'est " + PH("ton prénom") + ", et " + PH("ta crédibilité en une ligne") + ".\n\n" +
      "Nomme le vrai problème, sans détour : Le vrai souci, ce n'est pas " + PH("le faux problème que tout le monde pointe") + " — c'est " + PH("la vraie cause profonde") + ". Et c'est exactement ce qu'on va corriger.\n\n" +
      "Annonce le résultat : À la fin, tu auras obtenu un premier résultat concret — " + pbL + ".\n\n" +
      EX("Ouverture sous 60 secondes : douleur → promesse → crédibilité → enjeu. Parle à UNE personne") +
      "\nÀ L'ÉCRAN : ton visage ; éventuellement le titre du mini-cours en incrustation." });

    sections.push({ heading: "Script L2 — La méthode (" + meca + ")", body:
      "[Tu peux passer en partage d'écran ici]\n\n" +
      "À dire : Voici la méthode que j'utilise — " + meca + ". Trois étapes, dans cet ordre précis ; ne les inverse pas.\n\n" +
      "ÉTAPE 1 — " + PH("nom de la 1re étape") + "\n" +
      "À dire : D'abord, " + PH("ce qu'on fait concrètement") + ". Ça marche parce que " + PH("le principe derrière") + ".\n\n" +
      "ÉTAPE 2 — " + PH("nom de la 2e étape") + "\n" +
      "À dire : Ensuite, " + PH("ce qu'on fait") + ".\n\n" +
      "ÉTAPE 3 — " + PH("nom de la 3e étape") + "\n" +
      "À dire : Enfin, " + PH("ce qu'on fait") + ".\n\n" +
      "Transition : Maintenant que tu as la carte complète, on passe à l'action.\n\n" +
      EX("Pour chaque étape : montre, ne te contente pas de dire — partage ton écran, dessine, ou raconte un cas réel de ta niche") });

    sections.push({ heading: "Script L3 — Le quick win (en direct)", body:
      "L'objectif de cette vidéo : que ton spectateur OBTIENNE un premier résultat en te suivant, pas qu'il prenne juste des notes.\n\n" +
      "À dire : On va le faire ensemble, là, maintenant. Mets la vidéo en pause si besoin.\n\n" +
      "Guide pas à pas : Étape 1 — " + PH("la 1re micro-action concrète") + ". Étape 2 — " + PH("la 2e micro-action") + ".\n\n" +
      "Fais constater le résultat : Si tu as fait ça, tu viens d'obtenir " + PH("le résultat visible et immédiat") + ". C'est ton premier pas vers " + pbL + ".\n\n" +
      EX("Un quick win réel crée la confiance qui pousse à acheter la suite. Choisis une action faisable en moins de 10 minutes") });

    sections.push({ heading: "Script L4 — Conclusion + pont vers la suite", body:
      "À dire : Bravo. Tu viens de passer de ta situation de départ (« " + paL + " ») à un premier résultat concret, en quelques minutes.\n\n" +
      "Récap express : On a vu le vrai problème, les 3 étapes de " + meca + ", et tu as fait ta première action.\n\n" +
      "Le pont, sans forcer : Ce mini-cours t'a donné le premier pas. Pour aller jusqu'au bout — " + pbL + " — sans avancer seul, c'est exactement ce qu'on construit ensemble dans " + prog + ".\n\n" +
      "Appel à l'action : " + PH("clique sur le lien sous la vidéo / réserve ton appel...") + "\n\n" +
      EX("Termine sur un encouragement, jamais sur de la pression. Le low-ticket vend la suite par la preuve, pas par la force") });

    sections.push({ heading: "Conseils de tournage & mise en ligne", body:
      "Avant de filmer : note tes points clés (des repères, pas un texte mot à mot — sinon ça sonne récité). Vérifie le son, c'est ce qui compte le plus.\n\n" +
      "Pendant : regarde l'objectif (pas ton image), parle à une seule personne, fais des pauses. Lumière face à toi, micro proche.\n\n" +
      "Après : découpe en 4 vidéos, donne un titre clair à chacune, et héberge-les dans Liberty.\n\n" +
      "Durée cible par vidéo : " + PH("ta durée cible") + " " + EX("6 à 8 minutes : assez pour livrer, assez court pour être regardé en entier") +
      "\n\nPas besoin d'un matériel de pro : un téléphone récent bien placé et un son propre suffisent. La clarté bat la perfection." });
  } else if (fmt === "ebook") {
    sections = [
      { heading: "Introduction — ce que tu vas obtenir", body:
        "Si tu as ouvert ce guide, c'est probablement que tu vis ça au quotidien : " + painL + ".\n\n" +
        "Tu as sans doute déjà essayé plusieurs choses. Pourtant, tu en es toujours au même point de départ : " + paL + ". Ce n'est pas un manque de volonté de ta part — c'est que personne ne t'a donné la bonne méthode, dans le bon ordre.\n\n" +
        "Dans les pages qui suivent, tu vas découvrir comment passer de cette situation à ton objectif : " + pbL + ". Pas en théorie : en appliquant " + meca + ", la méthode que j'utilise concrètement. À la fin de ce guide, tu sauras exactement quoi faire pour " + promL + ".\n\n" +
        "Comment lire ce guide : ne le survole pas. À la fin de chaque chapitre, il y a une action « À toi de jouer ». Fais-la avant de passer à la suite. C'est en agissant que tu obtiendras ton résultat, pas en lisant." },

      { heading: "Chapitre 1 — Pourquoi tu es resté bloqué jusqu'ici", body:
        "Avant de te montrer la solution, il faut comprendre pourquoi les approches habituelles ne marchent pas pour toi.\n\n" +
        "Le vrai problème, ce n'est pas " + PH("le faux problème que tout le monde pointe") + ". " + EX("le manque de temps, le manque de budget...") + " Le vrai problème, c'est " + PH("la cause profonde que toi seul as comprise") + ".\n\n" +
        "La plupart des gens dans ta situation tombent dans trois pièges :\n\n" +
        "1. " + PH("1re croyance ou erreur qui les bloque") + ". " + EX("Croire qu'il faut tout savoir avant de se lancer") + "\n" +
        "2. " + PH("2e croyance ou erreur") + "\n" +
        "3. " + PH("3e croyance ou erreur") + "\n\n" +
        "À retenir : tant que tu raisonnes comme avant, tu obtiendras les mêmes résultats qu'avant. Le changement commence par voir le problème autrement.\n\n" +
        "À toi de jouer : note la croyance qui t'a le plus bloqué jusqu'ici. On va la démonter dans le chapitre suivant." },

      { heading: "Chapitre 2 — " + meca + ", la méthode en 3 étapes", body:
        "Voici la méthode complète, en vue d'ensemble. Chaque étape s'appuie sur la précédente : ne les saute pas, ne change pas l'ordre.\n\n" +
        "ÉTAPE 1 — " + PH("nom de la 1re étape") + "\n" +
        "Ce que c'est : " + PH("explique en une phrase") + "\n" +
        "Pourquoi ça marche : " + PH("le principe derrière") + "\n" +
        "Ton action : " + PH("ce que ton lecteur fait concrètement") + "\n\n" +
        "ÉTAPE 2 — " + PH("nom de la 2e étape") + "\n" +
        "Ce que c'est : " + PH("explique") + "\nPourquoi ça marche : " + PH("le principe") + "\nTon action : " + PH("l'action") + "\n\n" +
        "ÉTAPE 3 — " + PH("nom de la 3e étape") + "\n" +
        "Ce que c'est : " + PH("explique") + "\nPourquoi ça marche : " + PH("le principe") + "\nTon action : " + PH("l'action") + "\n\n" +
        EX("Si une étape te semble évidente, c'est qu'elle manque de détail : ajoute le « comment » précis, pas seulement le « quoi »") + "\n\n" +
        "À toi de jouer : reprends ces 3 étapes et applique l'étape 1 dès maintenant, avant de continuer." },

      { heading: "Chapitre 3 — Ton plan d'action pour ton premier résultat", body:
        "C'est le cœur du guide. On passe de la théorie à ton premier résultat concret : " + pbL + ".\n\n" +
        "Suis ce plan dans l'ordre :\n\n" +
        "① " + PH("1re action concrète, datable") + " " + EX("Bloquer 1h ce week-end pour...") + "\n" +
        "② " + PH("2e action") + "\n" +
        "③ " + PH("3e action") + "\n" +
        "④ " + PH("4e action") + "\n\n" +
        "Combien de temps ça prend : " + PH("estimation réaliste") + ". Ne vise pas la perfection au premier essai — vise le premier résultat, tu amélioreras ensuite.\n\n" +
        "Comment savoir que tu as réussi : " + PH("le signe concret et mesurable de la réussite") + ".\n\n" +
        "À toi de jouer : fais l'action ① aujourd'hui. Pas demain. Aujourd'hui." },

      { heading: "Chapitre 4 — Les 3 erreurs qui vont te ralentir", body:
        "Maintenant que tu as ton plan, voici les erreurs qui font abandonner la plupart des gens. Les connaître à l'avance, c'est la moitié du chemin.\n\n" +
        "ERREUR 1 — " + PH("l'erreur la plus fréquente dans ta niche") + "\n" +
        "Pourquoi c'est tentant : " + PH("explique") + "\nCe qu'il faut faire à la place : " + PH("la correction") + "\n\n" +
        "ERREUR 2 — " + PH("2e erreur") + "\nLa correction : " + PH("comment l'éviter") + "\n\n" +
        "ERREUR 3 — " + PH("3e erreur") + "\nLa correction : " + PH("comment l'éviter") + "\n\n" +
        EX("Tire ces erreurs de ta propre expérience ou de ce que tu observes autour de toi : c'est ce qui rend le guide crédible et unique") + "." },

      { heading: "Chapitre 5 — Un cas concret + tes questions", body:
        "Rien ne vaut un exemple réel. Voici comment ça se passe en vrai.\n\n" +
        "Le cas de " + (c.avatar || PH("un prénom")) + " : au départ, " + PH("sa situation de départ, proche de celle de ton lecteur") + ". Après avoir appliqué la méthode, " + PH("le résultat obtenu, en chiffres ou en faits") + ".\n" + EX("Reste honnête : un résultat réaliste convainc plus qu'une promesse magique") + "\n\n" +
        "Tes questions les plus fréquentes :\n\n" +
        "« Ça marche aussi si " + PH("objection n°1 de ton avatar") + " ? » — " + PH("ta réponse rassurante et honnête") + "\n\n" +
        "« Combien de temps avant de voir des résultats ? » — " + PH("ta réponse") + "\n\n" +
        "« Et si ça ne marche pas pour moi ? » — " + PH("ta réponse") },

      { heading: "Conclusion — et maintenant ?", body:
        "Tu as maintenant tout ce qu'il faut pour obtenir ton premier résultat : tu as compris pourquoi tu étais bloqué, tu as la méthode " + meca + " en 3 étapes, ton plan d'action, et les erreurs à éviter.\n\n" +
        "Applique-le. C'est en faisant que tu passeras de ta situation de départ à ton objectif : " + pbL + ".\n\n" +
        "Et après ? Ce guide t'a donné le premier pas. Si tu veux aller jusqu'au bout — " + pbL + " — sans avancer seul, c'est exactement ce qu'on construit ensemble dans " + prog + ". " + PH("ajoute ici ton lien / ton appel à l'action vers ton offre principale") + ".\n\n" +
        "Tu as fait le plus dur : tu as commencé. La suite n'est qu'une question de régularité." },
    ];
  }
  return sections;
}

export function demoPromesse(ctxObj: { point_b?: string }): string {
  const pb = ctxObj.point_b || "un premier résultat";
  return "Obtenir " + pb.charAt(0).toLowerCase() + pb.slice(1) + ", étape par étape.";
}
