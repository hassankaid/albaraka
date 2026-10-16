/**
 * Outil 1 — Niche & avatar (étape 2, après « Remplir votre fiche »).
 * Objectif : choisir une sous-niche 2.0 viable et décrire l'avatar comme une vraie
 * personne. Premier outil : rien n'est repris. Pas de diagnostic de marché (la
 * faisabilité est vérifiée en appel de vente). Aides et exemples : slides 68 à 72
 * du PowerPoint du parcours.
 */
import { doc, lignes, ligneRemplie, type DefinitionOutil, type Profil } from "./modele";

export const outil1NicheAvatar: DefinitionOutil = {
  code: "liberty_niche_avatar",
  numero: 1,
  etape: "Étape 2",
  nom: "Niche & avatar",
  objectif: "Choisir une sous-niche 2.0 viable, puis décrire votre avatar comme une vraie personne.",
  fichier: "Liberty_Etape2_Niche_avatar",
  ecrans: [
    {
      titre: "Vos pistes",
      intro: "Votre sous-niche se trouve au croisement de ce que vous aimez, de vos compétences et des besoins du marché. Commencez large : 5 niches, 5 compétences.",
      champs: [
        {
          cle: "pistes.niches", type: "blocs", fixe: 5, nomBloc: "Niche",
          libelle: "5 niches possibles",
          aide: "Des niches que vous connaissez ou qui vous passionnent. Pour chacune : les problèmes, les peurs et les désirs des gens concernés.",
          colonnes: [
            { cle: "niche", libelle: "La niche", type: "court", exemple: "Perte de poids" },
            { cle: "problemes", libelle: "Leurs problèmes", type: "long", exemple: "Pas le temps de cuisiner, grignotage le soir" },
            { cle: "peurs", libelle: "Leurs peurs", type: "long", exemple: "Ne jamais retrouver leur corps d'avant" },
            { cle: "desirs", libelle: "Leurs désirs", type: "long", exemple: "Se sentir bien dans leurs vêtements" },
          ],
        },
        {
          cle: "pistes.competences", type: "liste", fixe: 5,
          libelle: "Vos 5 compétences",
          aide: "Ce que vous savez, ce que vous avez vécu et réussi : votre métier, votre expérience de vie, vos résultats personnels.",
          exemple: "J'ai perdu 15 kg après ma grossesse",
        },
      ],
    },
    {
      titre: "Votre sous-niche",
      intro: "Précisez qui vous aidez. Une sous-niche 2.0 tient en une phrase : qui, quelle situation, quel objectif.",
      champs: [
        { cle: "cible.sexe", type: "choix", options: ["Hommes", "Femmes", "Mixte"], libelle: "Sexe", aide: "Hommes, femmes, ou les deux." },
        { cle: "cible.age", type: "court", libelle: "Âge", aide: "Une tranche d'âge.", exemple: "28 à 40 ans" },
        { cle: "cible.situationPro", type: "court", libelle: "Situation professionnelle", aide: "Salarié, entrepreneur, étudiant, parent au foyer…", exemple: "Salariées à temps plein" },
        { cle: "cible.pouvoirAchat", type: "court", libelle: "Pouvoir d'achat", aide: "Peuvent-ils payer une offre high-ticket ?", exemple: "Revenus réguliers, prêtes à investir dans leur santé" },
        { cle: "cible.douleur", type: "long", libelle: "Douleur principale", aide: "Le problème qui les fait souffrir aujourd'hui, avec leurs mots.", exemple: "Elles ont pris du poids pendant la grossesse et ne se reconnaissent plus." },
        { cle: "cible.desirs", type: "long", libelle: "Désirs", aide: "Les désirs ne se créent pas, ils se canalisent : les gens ne veulent pas « mieux manger », ils veulent perdre du poids.", exemple: "Retrouver leur poids d'avant et se sentir belles." },
      ],
    },
    {
      titre: "Viabilité",
      intro: "Vérifiez que votre sous-niche tient la route. Répondez simplement, sans note : il n'y a pas de bonne ou de mauvaise réponse ici.",
      champs: [
        { cle: "viabilite.demande", type: "court", libelle: "Les gens la veulent-ils ?", aide: "Ils cherchent déjà des solutions en ligne, beaucoup de personnes sont concernées.", exemple: "Oui, beaucoup de recherches et de comptes sur le sujet" },
        { cle: "viabilite.concurrence", type: "court", libelle: "Y a-t-il de la place ?", aide: "De la concurrence, c'est bon signe. Comment pouvez-vous être différent ?", exemple: "Beaucoup de coachs, peu pour les mamans salariées" },
        { cle: "viabilite.duree", type: "court", libelle: "Est-ce que ça va durer ?", aide: "Le problème existera-t-il encore dans plusieurs années ? Qu'est-ce qui pourrait changer ?", exemple: "Oui, il y aura toujours des grossesses" },
        { cle: "viabilite.copie", type: "court", libelle: "Est-ce difficile à copier ?", aide: "Votre parcours et votre expérience vous donnent un avantage.", exemple: "Mon propre parcours de maman salariée" },
        { cle: "viabilite.alignement", type: "court", libelle: "Est-ce fait pour vous ?", aide: "Vous aimez ce domaine, il correspond à vos objectifs, vous y avez déjà de l'expérience.", exemple: "Oui, c'est ma passion et mon histoire" },
      ],
    },
    {
      titre: "Votre avatar",
      intro: "Votre avatar, c'est votre client idéal décrit comme quelqu'un que vous connaissez : un prénom, un âge, une ville, un métier, un revenu, une situation familiale.",
      champs: [
        { cle: "avatar.prenom", type: "court", libelle: "Prénom fictif", aide: "Donnez-lui un prénom : vous écrirez pour cette personne.", exemple: "Sarah" },
        { cle: "avatar.age", type: "court", libelle: "Âge", exemple: "32 ans" },
        { cle: "avatar.situation", type: "long", libelle: "Sa situation", aide: "Ville, métier, revenu, situation familiale.", exemple: "Lyon, infirmière, 2 400 € par mois, mariée, un bébé de 8 mois." },
        { cle: "avatar.croyances", type: "long", libelle: "Ses croyances", aide: "Ce qu'elle se dit, ce qui la bloque.", exemple: "« Avec un bébé et mon travail, je n'aurai jamais le temps de m'occuper de moi. »" },
        { cle: "avatar.problemes", type: "liste", fixe: 3, libelle: "Ses 3 problèmes principaux", aide: "Quel est le problème principal dans sa vie ? Puis les deux suivants.", exemple: "Elle grignote le soir par fatigue" },
        { cle: "avatar.objectif", type: "long", libelle: "Son objectif", exemple: "Perdre 10 kg avant l'été." },
        { cle: "avatar.consequences", type: "long", libelle: "Que se passe-t-il s'il ne règle pas ce problème ?", exemple: "Elle perd confiance en elle et évite les photos." },
        { cle: "avatar.essaye", type: "long", libelle: "Ce qu'il a déjà essayé, et pourquoi ça n'a pas marché", exemple: "Des régimes trouvés sur Internet : trop stricts, elle abandonne au bout de 2 semaines." },
        { cle: "avatar.ressenti", type: "long", libelle: "Comment il se sent aujourd'hui", exemple: "Fatiguée, frustrée, pas à la hauteur." },
        { cle: "avatar.reve", type: "long", libelle: "Sa situation de rêve", exemple: "Remettre sa robe préférée et se sentir fière d'elle." },
      ],
    },
    {
      titre: "Ce qu'il y a derrière",
      intro: "Allez plus loin que ce qu'il dit : ce dont il a vraiment besoin, ce qui lui fait peur, ce qui le retient.",
      champs: [
        { cle: "avatar.ditVouloir", type: "long", libelle: "Ce qu'il dit vouloir", exemple: "Un programme de sport." },
        { cle: "avatar.besoinReel", type: "long", libelle: "Ce dont il a vraiment besoin", exemple: "Une organisation simple qui tient avec un bébé et un travail." },
        { cle: "avatar.peur", type: "long", libelle: "Sa plus grande peur", exemple: "Rester comme ça toute sa vie." },
        { cle: "avatar.risquePerdre", type: "long", libelle: "Ce qu'il risque de perdre", exemple: "Sa confiance, et son envie de sortir avec son mari." },
        { cle: "avatar.objection", type: "long", libelle: "Son objection principale", aide: "Ce qu'il vous dira pour ne pas passer à l'action.", exemple: "« Je n'ai pas le temps avec le bébé. »" },
      ],
    },
    {
      titre: "Ses mots",
      intro: "La règle d'or : le meilleur message reprend exactement les mots de votre client, jamais les vôtres.",
      champs: [
        {
          cle: "avatar.mots", type: "liste", ajout: "Ajouter une phrase",
          libelle: "Les phrases qu'il utilise",
          aide: "Pour décrire son problème, en commentaire ou en message. Recopiez-les telles quelles.",
          exemple: "« Je ne rentre plus dans aucun jean »",
        },
      ],
    },
    {
      titre: "Synthèse",
      intro: "Résumez tout en deux phrases. Ce sont elles que Sidali lira en premier.",
      apercu: true,
      champs: [
        { cle: "sousNiche.phrase", type: "long", libelle: "Votre sous-niche 2.0 en une phrase", aide: "Qui, quelle situation, quel objectif.", exemple: "Femmes enceintes salariées qui veulent perdre du poids." },
        { cle: "avatar.phrase", type: "long", libelle: "Votre avatar en une phrase", exemple: "Sarah, 32 ans, infirmière à Lyon et jeune maman, qui veut perdre 10 kg sans y passer ses soirées." },
      ],
    },
  ],
  document: (p: Profil) => ({
    titre: "Fiche sous-niche & avatar",
    sections: [
      {
        titre: "En une phrase",
        blocs: [doc.phrase(p, "Votre sous-niche 2.0", "sousNiche.phrase"), doc.phrase(p, "Votre avatar", "avatar.phrase")],
      },
      {
        titre: "Vos pistes",
        blocs: [
          {
            t: "tableau",
            colonnes: ["Niche", "Problèmes", "Peurs", "Désirs"],
            lignes: lignes(p, "pistes.niches").filter(ligneRemplie)
              .map((l) => [l.niche ?? "", l.problemes ?? "", l.peurs ?? "", l.desirs ?? ""]),
          },
          doc.liste(p, "Vos compétences", "pistes.competences"),
        ],
      },
      {
        titre: "Votre sous-niche",
        blocs: [
          doc.champ(p, "Sexe", "cible.sexe"),
          doc.champ(p, "Âge", "cible.age"),
          doc.champ(p, "Situation professionnelle", "cible.situationPro"),
          doc.champ(p, "Pouvoir d'achat", "cible.pouvoirAchat"),
          doc.champ(p, "Douleur principale", "cible.douleur"),
          doc.champ(p, "Désirs", "cible.desirs"),
        ],
      },
      {
        titre: "Viabilité",
        blocs: [
          doc.champ(p, "Les gens la veulent-ils ?", "viabilite.demande"),
          doc.champ(p, "Y a-t-il de la place ?", "viabilite.concurrence"),
          doc.champ(p, "Est-ce que ça va durer ?", "viabilite.duree"),
          doc.champ(p, "Est-ce difficile à copier ?", "viabilite.copie"),
          doc.champ(p, "Est-ce fait pour vous ?", "viabilite.alignement"),
        ],
      },
      {
        titre: "Votre avatar",
        blocs: [
          doc.champ(p, "Prénom", "avatar.prenom"),
          doc.champ(p, "Âge", "avatar.age"),
          doc.champ(p, "Situation", "avatar.situation"),
          doc.champ(p, "Croyances", "avatar.croyances"),
          doc.liste(p, "Ses 3 problèmes principaux", "avatar.problemes"),
          doc.champ(p, "Objectif", "avatar.objectif"),
          doc.champ(p, "S'il ne fait rien", "avatar.consequences"),
          doc.champ(p, "Ce qu'il a déjà essayé", "avatar.essaye"),
          doc.champ(p, "Comment il se sent", "avatar.ressenti"),
          doc.champ(p, "Sa situation de rêve", "avatar.reve"),
        ],
      },
      {
        titre: "Ce qu'il y a derrière",
        blocs: [
          doc.champ(p, "Ce qu'il dit vouloir", "avatar.ditVouloir"),
          doc.champ(p, "Ce dont il a vraiment besoin", "avatar.besoinReel"),
          doc.champ(p, "Sa plus grande peur", "avatar.peur"),
          doc.champ(p, "Ce qu'il risque de perdre", "avatar.risquePerdre"),
          doc.champ(p, "Son objection principale", "avatar.objection"),
        ],
      },
      { titre: "Ses mots", blocs: [doc.liste(p, undefined, "avatar.mots")] },
    ],
  }),
};
