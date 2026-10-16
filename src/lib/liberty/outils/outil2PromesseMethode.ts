/**
 * Outil 2 — Promesse & méthode (étape 3, après « Le nom de l'offre »).
 * Objectif : une promesse spécifique et crédible, la méthode qui y mène et le nom de
 * l'offre. Reprend la sous-niche et l'avatar (outil 1). Aides et exemples : slides 79
 * à 86 du PowerPoint du parcours.
 */
import { doc, lignes, ligneRemplie, multi, texte, type DefinitionOutil, type Profil } from "./modele";
import { cible, delaiEnJours, etapesMethode, phraseMecanisme, promesseAssemblee, promesseSpecifique, solutions } from "./partage";

const TECHNIQUES = ["Acronyme", "Métaphore", "Résultat + méthode", "Chiffre + promesse", "Identité / univers"];
export const VERIFICATIONS_NOM = [
  "Il évoque le résultat, pas le contenu.",
  "Il est facile à retenir et à prononcer.",
  "Il est unique dans mon marché.",
  "Le téléphone : je l'ai dit à 5 personnes, personne ne m'a demandé de l'épeler.",
  "Google et Instagram : il n'est pas déjà pris dans ma niche.",
  "La promesse : des personnes de ma cible m'ont dit ce que le nom leur promet.",
  "La résonance : il suscite de la curiosité ou de l'envie.",
];

export const outil2PromesseMethode: DefinitionOutil = {
  code: "liberty_promesse_methode",
  numero: 2,
  etape: "Étape 3",
  nom: "Promesse & méthode",
  objectif: "Écrire une promesse spécifique et crédible, la méthode qui y mène, et le nom de votre offre.",
  fichier: "Liberty_Etape3_Promesse_methode",
  ecrans: [
    {
      titre: "Votre promesse",
      intro: "Le résultat que votre client obtient en vous rejoignant. Une seule phrase : spécifique, mesurable, désirable et crédible.",
      champs: [
        { cle: "promesse.generale", type: "long", libelle: "Votre promesse générale", aide: "Ce que vous faites, en une phrase simple.", exemple: "J'aide les hommes à se transformer physiquement." },
        {
          cle: "promesse.cible", type: "court", libelle: "Votre sous-niche, telle qu'elle apparaît dans la promesse", repris: "l'outil 1",
          aide: "En quelques mots : qui vous aidez.", exemple: "les hommes minces de plus de 25 ans",
          prerempli: (p) => cible(p),
        },
        { cle: "promesse.resultat", type: "court", libelle: "Le résultat concret et chiffré", aide: "Ce que votre client obtient, avec un chiffre.", exemple: "prendre 7 kg de muscle" },
        { cle: "promesse.delaiNombre", type: "nombre", libelle: "Le délai", aide: "Plus le délai est court, plus votre offre a de la valeur. Mais ne promettez jamais un résultat en moins de 90 jours.", exemple: "90" },
        { cle: "promesse.delaiUnite", type: "choix", options: ["jours", "semaines", "mois"], libelle: "Unité du délai" },
        {
          cle: "info.regle90", type: "info", libelle: "",
          rendu: (p) => {
            const j = delaiEnJours(p);
            return j !== null && j < 90
              ? { ton: "alerte", titre: "La règle des 90 jours", texte: "Ne promettez jamais un résultat en moins de 90 jours. Pour la vitesse, prévoyez plutôt une première victoire rapide dès les premières semaines." }
              : null;
          },
        },
        { cle: "info.promesse", type: "info", libelle: "Votre promesse spécifique", rendu: (p) => ({ texte: promesseAssemblee(p) }) },
        {
          cle: "promesse.specifiqueTexte", type: "long", libelle: "Votre promesse spécifique retouchée (facultatif)",
          aide: "Si la phrase assemblée ci-dessus ne sonne pas juste, réécrivez-la ici : c'est cette version qui sera reprise ensuite. Le nom de la méthode se choisit au dernier écran.",
          exemple: "J'aide les hommes minces de plus de 25 ans à prendre 7 kg de muscle en 90 jours grâce à la méthode T12S.",
        },
      ],
    },
    {
      titre: "Problèmes → solutions",
      intro: "Entre le point A et le point B, votre client va rencontrer des obstacles. Listez-en au moins 20 : le mental, l'organisation, le temps, l'argent, les connaissances, les outils, l'entourage, la motivation. Pour chacun, une solution concrète, simple et facile à appliquer.",
      champs: [
        {
          cle: "solutions.liste", type: "blocs", nomBloc: "Problème", ajout: "Ajouter un problème", initial: 3,
          compteur: { objectif: 20, mot: "problème" },
          libelle: "Vos problèmes et vos solutions",
          aide: "« Pour atteindre ma promesse, il faut faire face à [problème]. J'ai déjà créé [solution] pour que vous n'ayez pas à le faire. »",
          colonnes: [
            { cle: "probleme", libelle: "Le problème", type: "long", exemple: "Il ne sait pas quel programme suivre." },
            { cle: "solution", libelle: "Votre solution", type: "long", exemple: "Un programme d'entraînement adapté à sa morphologie." },
            { cle: "type", libelle: "Type de solution", type: "choix", options: ["Document", "Modèle", "Appel", "Outil", "Routine"] },
          ],
        },
      ],
    },
    {
      titre: "Votre méthode",
      intro: "Regroupez vos solutions dans l'ordre où votre client en a besoin : 3 à 5 grandes étapes, chacune découpée en micro-étapes.",
      champs: [
        {
          cle: "methode.etapes", type: "blocs", nomBloc: "Étape", ajout: "Ajouter une étape", initial: 3, max: 5,
          libelle: "Vos grandes étapes",
          aide: "La vérification : si votre client franchit toutes les étapes, il atteint le point B. Sinon, il manque une étape.",
          colonnes: [
            { cle: "nom", libelle: "Nom de l'étape", type: "court", exemple: "Phase 1 : identité et mental" },
            { cle: "micro", libelle: "Ses micro-étapes", type: "long", exemple: "Définir son objectif, comprendre ses blocages, poser ses routines." },
            { cle: "solutions", libelle: "Les solutions rattachées", type: "multi", options: (p) => solutions(p) },
          ],
        },
      ],
    },
    {
      titre: "Votre mécanisme unique",
      intro: "Votre méthode a un nom et une grande idée : c'est ce qui vous rend impossible à comparer. Votre prospect doit se dire : « Ah, c'est logique. Je comprends pourquoi ça ne marchait pas avant. »",
      champs: [
        { cle: "mecanisme.pourquoiEchec", type: "long", libelle: "Pourquoi tout ce qu'il a essayé avant n'a pas marché ?", exemple: "Les programmes classiques sont faits pour des personnes qui prennent du poids facilement." },
        { cle: "mecanisme.pourquoiMarche", type: "long", libelle: "Pourquoi votre méthode, elle, va marcher ?", exemple: "Elle part de sa morphologie et de son appétit réel, pas d'un programme standard." },
        { cle: "mecanisme.grandeIdee", type: "court", libelle: "Votre grande idée", aide: "Une seule chose, qui explique tout.", exemple: "manger plus, mais au bon moment" },
        { cle: "info.mecanisme", type: "info", libelle: "Le cœur de votre VSL", rendu: (p) => ({ texte: phraseMecanisme(p) }) },
      ],
    },
    {
      titre: "Le nom de votre offre",
      intro: "Un bon nom évoque le résultat, se retient facilement et n'existe pas déjà dans votre niche.",
      apercu: true,
      champs: [
        { cle: "nom.benefice", type: "court", libelle: "Le bénéfice en 2 mots", exemple: "Corps transformé" },
        { cle: "nom.emotion", type: "court", libelle: "L'émotion que vous voulez provoquer", exemple: "La fierté" },
        { cle: "nom.distinction", type: "court", libelle: "Ce qui vous distingue", exemple: "Une méthode pensée pour les morphologies fines" },
        {
          cle: "nom.propositions", type: "blocs", fixe: 5, nomBloc: "Proposition",
          libelle: "5 propositions de nom",
          aide: "Acronyme (SCALE), métaphore (Le Tremplin), résultat + méthode (Closing Mastery), chiffre + promesse (T12S), identité / univers (Liberty).",
          colonnes: [
            { cle: "nom", libelle: "Le nom", type: "court", exemple: "T12S : Transformation 12 semaines" },
            { cle: "technique", libelle: "Sa technique", type: "choix", options: TECHNIQUES },
          ],
        },
        { cle: "nom.offre", type: "court", libelle: "Le nom choisi pour votre offre", exemple: "RAYONNE — 90 jours pour devenir LA référence" },
        { cle: "methode.nom", type: "court", libelle: "Le nom de votre méthode", aide: "Il complète votre promesse : « … grâce à [nom de votre méthode]. »", exemple: "la méthode T12S" },
        { cle: "nom.verifications", type: "cases", options: VERIFICATIONS_NOM, libelle: "Les 3 règles et les 4 tests", aide: "Pour vous, sans note : cochez ce qui est vrai." },
      ],
    },
  ],
  document: (p: Profil) => ({
    titre: "Fiche promesse, méthode & nom",
    sections: [
      {
        titre: "Votre promesse",
        blocs: [
          { t: "phrase", libelle: "Promesse spécifique", valeur: promesseSpecifique(p) },
          doc.champ(p, "Promesse générale", "promesse.generale"),
          { t: "champ", libelle: "Délai", valeur: texte(p, "promesse.delaiNombre") ? `${texte(p, "promesse.delaiNombre")} ${texte(p, "promesse.delaiUnite") || "jours"}` : "" },
        ],
      },
      {
        titre: `Problèmes → solutions (${lignes(p, "solutions.liste").filter(ligneRemplie).length})`,
        blocs: [{
          t: "tableau", colonnes: ["Problème", "Solution", "Type"],
          lignes: lignes(p, "solutions.liste").filter(ligneRemplie).map((l) => [l.probleme ?? "", l.solution ?? "", l.type ?? ""]),
        }],
      },
      {
        titre: "Votre méthode",
        blocs: [
          doc.champ(p, "Nom de la méthode", "methode.nom"),
          ...(etapesMethode(p).length
            ? etapesMethode(p).flatMap((e, k) => [
                { t: "phrase" as const, libelle: `Étape ${k + 1}`, valeur: e.nom },
                { t: "champ" as const, libelle: "Micro-étapes", valeur: e.micro },
                { t: "liste" as const, libelle: "Solutions", items: multi(e.solutions) },
              ])
            : [{ t: "phrase" as const, libelle: "Étape 1", valeur: "" }]),
        ],
      },
      {
        titre: "Votre mécanisme unique",
        blocs: [
          doc.champ(p, "Pourquoi ça n'a pas marché avant", "mecanisme.pourquoiEchec"),
          doc.champ(p, "Pourquoi votre méthode va marcher", "mecanisme.pourquoiMarche"),
          { t: "phrase", libelle: "La grande idée", valeur: texte(p, "mecanisme.grandeIdee") ? phraseMecanisme(p) : "" },
        ],
      },
      {
        titre: "Le nom de votre offre",
        blocs: [
          doc.phrase(p, "Le nom choisi", "nom.offre"),
          doc.champ(p, "Bénéfice en 2 mots", "nom.benefice"),
          doc.champ(p, "Émotion", "nom.emotion"),
          doc.champ(p, "Ce qui vous distingue", "nom.distinction"),
          {
            t: "tableau", colonnes: ["Proposition", "Technique"],
            lignes: lignes(p, "nom.propositions").filter(ligneRemplie).map((l) => [l.nom ?? "", l.technique ?? ""]),
          },
        ],
      },
    ],
  }),
};
