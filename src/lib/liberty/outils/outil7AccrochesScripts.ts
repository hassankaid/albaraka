/**
 * Outil 7 — Accroches & scripts vidéo (étape 10, après les ressources PDF).
 * Objectif : écrire 30 accroches et 10 scripts complets à partir des sujets du
 * calendrier. Reprend les sujets TOFU / MOFU / BOFU (outil 6) et les mots de
 * l'avatar (outil 1). Les 12 types d'accroches et leurs modèles : slide 187 ; la
 * structure longue : slide 185 ; la check-list : slide 195.
 */
import { lignes, ligneRemplie, liste, multi, texte, type DefinitionOutil, type Ligne, type Profil, type SectionDoc } from "./modele";
import { NIVEAUX } from "./outil6Calendrier";

/** Les 12 types d'accroches du PowerPoint, avec leur modèle. */
export const TYPES_ACCROCHE: Record<string, string> = {
  "Révélation": "Ce que personne ne vous dit sur [sujet]…",
  "Erreur": "Arrêtez de [erreur courante]. Voilà pourquoi.",
  "Résultat": "De [avant] à [après] en [délai]. Voici comment.",
  "Erreur fréquente": "L'erreur n°1 que font les [cible] quand [situation].",
  "Regret": "J'aurais aimé savoir ça avant de [action].",
  "Histoire": "Il y a [durée], j'étais [situation difficile].",
  "Confession": "Je vais être honnête : j'ai tout raté avec [sujet].",
  "Point de vue": "POV : vous [situation que votre cible reconnaît].",
  "Rupture": "Tout le monde vous dit de [X]. Faites l'inverse.",
  "Interpellation": "[Profil précis], cette vidéo est pour vous.",
  "Et si…": "Et si vous pouviez [résultat] sans [contrainte redoutée] ?",
  "Identité": "Il y a deux types de [cible] : ceux qui [X] et ceux qui [Y].",
};

export const CHECKLIST_PUBLICATION = [
  "L'accroche arrête le scroll dans les 2 à 3 premières secondes, et parle du problème de mon spectateur.",
  "Elle s'adresse à une personne précise, avec des mots simples et concrets.",
  "Il y a une preuve réelle, et l'objection principale est anticipée.",
  "Le texte sonne naturel à voix haute.",
  "L'image est nette, le son clair, les sous-titres sans faute.",
  "Il n'y a qu'un seul appel à l'action, repris dans la première ligne de la description.",
  "Je passerais à l'action si j'étais à sa place.",
];

/** Les sujets du calendrier, préfixés par leur niveau : « TOFU · 3 erreurs… ». */
export function sujetsCalendrier(p: Profil): string[] {
  return NIVEAUX.flatMap((n) => liste(p, `contenu.${n.toLowerCase()}`).map((s) => `${n} · ${s}`));
}

const accroches = (p: Profil) => lignes(p, "accroches.liste").filter((l) => (l.texte ?? "").trim());
const scripts = (p: Profil) => lignes(p, "scripts.liste").filter(ligneRemplie);

/** Les modèles de départ : le type choisi donne la phrase-modèle. */
const modeleAccroche = (l: Ligne) => TYPES_ACCROCHE[l.type ?? ""] ?? "";

export const outil7AccrochesScripts: DefinitionOutil = {
  code: "liberty_accroches_scripts",
  numero: 7,
  etape: "Étape 10",
  nom: "Accroches & scripts vidéo",
  objectif: "Écrire 30 accroches et 10 scripts complets à partir des sujets de votre calendrier.",
  fichier: "Liberty_Etape10_Accroches_scripts",
  ecrans: [
    {
      titre: "30 accroches",
      intro: "Accroche = tension + curiosité + pertinence. Pour chaque accroche : un sujet de votre calendrier, un type, puis le texte. « Partir d'un modèle » recopie la phrase-modèle du type choisi.",
      champs: [
        {
          cle: "accroches.liste", type: "blocs", fixe: 30, nomBloc: "Accroche",
          libelle: "Vos accroches",
          aide: "Le test : lisez votre première phrase à voix haute. Crée-t-elle une question dans votre tête ? Si non, recommencez.",
          filtres: [
            { colonne: "type", libelle: "Type", options: Object.keys(TYPES_ACCROCHE) },
            { colonne: "sujet", libelle: "Niveau", options: NIVEAUX, prefixe: true },
          ],
          colonnes: [
            { cle: "sujet", libelle: "Le sujet (outil 6)", type: "choix", options: sujetsCalendrier },
            { cle: "type", libelle: "Le type", type: "choix", options: Object.keys(TYPES_ACCROCHE) },
            { cle: "texte", libelle: "L'accroche", type: "long", modele: modeleAccroche, exemple: "Ce que personne ne vous dit sur la prise de muscle…" },
          ],
        },
      ],
    },
    {
      titre: "10 scripts",
      intro: "La version longue, pour convertir : accroche (0-3 s), problème (3-8 s), histoire ou solution (8-20 s), preuve (20-25 s), appel à l'action (25-30 s). Une seule idée par vidéo.",
      champs: [
        {
          cle: "scripts.liste", type: "blocs", fixe: 10, nomBloc: "Script",
          libelle: "Vos scripts",
          prerempli: () => Array.from({ length: 10 }, () => ({ cta: "Écrivez-moi [MOT] en message privé" })),
          colonnes: [
            { cle: "niveau", libelle: "Niveau de l'entonnoir", type: "choix", options: NIVEAUX },
            { cle: "typeVideo", libelle: "Type de vidéo", type: "choix", options: ["Face caméra", "Plans de coupe", "Voix off"] },
            { cle: "accroche", libelle: "Accroche (0-3 s)", type: "long", exemple: "Arrêtez de manger comme les autres si vous êtes mince." },
            {
              cle: "probleme", libelle: "Problème (3-8 s)", type: "long",
              aide: (p) => (liste(p, "avatar.mots").length ? `Ses mots (outil 1) : ${liste(p, "avatar.mots").join(" · ")}` : ""),
              exemple: "Vous mangez « beaucoup » et pourtant la balance ne bouge pas.",
            },
            { cle: "histoire", libelle: "Histoire ou solution (8-20 s)", type: "long" },
            { cle: "preuve", libelle: "Preuve (20-25 s)", type: "long", exemple: "Karim a pris 8 kg en 90 jours avec cette méthode." },
            { cle: "cta", libelle: "Appel à l'action (25-30 s)", type: "court" },
            { cle: "accrochesTest", libelle: "3 accroches à tester (parmi vos 30)", type: "multi", max: 3, options: (p) => accroches(p).map((l) => (l.texte ?? "").trim()) },
          ],
        },
      ],
    },
    {
      titre: "Avant de publier",
      intro: "La check-list, pour vous : cochez ce qui est vrai pour chaque vidéo.",
      apercu: true,
      champs: [{ cle: "scripts.checklist", type: "cases", options: CHECKLIST_PUBLICATION, libelle: "Avant de publier" }],
    },
  ],
  document: (p: Profil) => {
    const parType = Object.keys(TYPES_ACCROCHE)
      .map((type) => ({ type, items: accroches(p).filter((l) => l.type === type) }))
      .filter((g) => g.items.length);
    const sansType = accroches(p).filter((l) => !l.type || !TYPES_ACCROCHE[l.type]);
    const sectionsAccroches: SectionDoc[] = [
      {
        titre: `Vos accroches (${accroches(p).length})`,
        blocs: parType.length || sansType.length
          ? [
              ...parType.map((g) => ({ t: "liste" as const, libelle: g.type, items: g.items.map((l) => `${(l.texte ?? "").trim()}${l.sujet ? ` (${l.sujet})` : ""}`) })),
              ...(sansType.length ? [{ t: "liste" as const, libelle: "Sans type", items: sansType.map((l) => (l.texte ?? "").trim()) }] : []),
            ]
          : [{ t: "liste", items: [] }],
      },
    ];
    // un script par page : chaque section se termine par un saut de page, sauf la dernière
    sectionsAccroches[0].blocs.push({ t: "saut" });
    const liste10 = scripts(p).length ? scripts(p) : [{} as Ligne];
    const sectionsScripts: SectionDoc[] = liste10.map((s, i) => ({
      titre: `Script ${i + 1}${s.niveau ? ` · ${s.niveau}` : ""}${s.typeVideo ? ` · ${s.typeVideo}` : ""}`,
      blocs: [
        { t: "phrase", libelle: "Accroche (0-3 s)", valeur: s.accroche ?? "" },
        { t: "champ", libelle: "Problème (3-8 s)", valeur: s.probleme ?? "" },
        { t: "champ", libelle: "Histoire ou solution (8-20 s)", valeur: s.histoire ?? "" },
        { t: "champ", libelle: "Preuve (20-25 s)", valeur: s.preuve ?? "" },
        { t: "champ", libelle: "Appel à l'action (25-30 s)", valeur: s.cta ?? "" },
        { t: "liste", libelle: "3 accroches à tester", items: multi(s.accrochesTest) },
        ...(i < liste10.length - 1 ? [{ t: "saut" as const }] : []),
      ],
    }));
    return { titre: "Accroches & scripts vidéo", sections: [...sectionsAccroches, ...sectionsScripts] };
  },
};
