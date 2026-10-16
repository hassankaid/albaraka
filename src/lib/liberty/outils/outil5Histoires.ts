/**
 * Outil 5 — Mes 4 histoires (étape 8, après « Raconter en vidéo »).
 * Objectif : rédiger les 4 histoires de vente avec la même structure. Reprend
 * l'avatar, la promesse, le délai et le mécanisme unique. Un écran par histoire,
 * toujours 6 champs (situation, déclencheur, épreuve, transformation, résultat,
 * invitation), plus la première phrase « au milieu de l'action » et le lien de la
 * vidéo une fois tournée. Aides et exemples : slides 150 à 157.
 */
import { liste, texte, type Champ, type DefinitionOutil, type Ecran, type Profil, type SectionDoc } from "./modele";
import { delai, grandeIdee, phraseMecanisme, promesseSpecifique } from "./partage";

export const HISTOIRES = [
  { k: "h1", titre: "Histoire fondatrice" },
  { k: "h2", titre: "Histoire d'un client" },
  { k: "h3", titre: "Votre découverte" },
  { k: "h4", titre: "La vie future de votre client" },
] as const;

const TEMPS: { c: string; libelle: string; aide: string }[] = [
  { c: "situation", libelle: "1. La situation", aide: "Où en était la personne au départ ? Sa vie ordinaire, son problème." },
  { c: "declencheur", libelle: "2. Le déclencheur", aide: "Qu'est-ce qui a tout fait basculer ? Le moment où ce n'était plus possible." },
  { c: "epreuve", libelle: "3. L'épreuve", aide: "Qu'est-ce qui a été difficile ? Les échecs, les doutes, ce qui n'a pas marché." },
  { c: "transformation", libelle: "4. La transformation", aide: "Quelle découverte ou quelle décision a tout changé ?" },
  { c: "resultat", libelle: "5. Le résultat", aide: "Où en est-elle aujourd'hui ? Concret, précis, vrai." },
  { c: "invitation", libelle: "6. L'invitation", aide: "Ce que votre spectateur peut en retenir, et ce qu'il peut faire maintenant." },
];

const EXEMPLES: Record<string, Partial<Record<string, string>>> = {
  h1: { situation: "J'étais un homme mince, complexé, qui s'entraînait sans résultat.", declencheur: "Le jour où une photo de vacances m'a fait honte.", premiere: "Le jour où j'ai failli tout arrêter…" },
  h2: { situation: "Karim, 28 ans, 62 kg, avait tout essayé.", resultat: "+8 kg de muscle en 90 jours.", premiere: "Karim m'a écrit la semaine dernière…" },
  h3: { transformation: "J'ai compris que le problème n'était pas l'entraînement mais ce que je mangeais.", premiere: "Pendant 2 ans, je me suis entraîné 5 fois par semaine sans prendre un gramme." },
  h4: { premiere: "Imaginez-vous dans 90 jours…" },
};

const sansClient = (p: Profil) => liste(p, "histoires.h2.aucunClient").length > 0;

function ecranHistoire(k: string, titre: string, n: number): Ecran {
  const particularites: Record<string, { intro: string; champs: Champ[] }> = {
    h1: {
      intro: "Pourquoi vous faites ce que vous faites. C'est votre différence la plus forte : personne n'a vécu exactement votre parcours.",
      champs: [{ cle: "info.h1", type: "info", libelle: "", rendu: () => ({ ton: "rappel", titre: "Le bon angle", texte: "« J'ai vécu ce problème, et personne ne devrait le vivre seul », pas « je veux gagner de l'argent »." }) }],
    },
    h2: {
      intro: "La transformation d'une personne qui ressemble à votre prospect. C'est la plus puissante : ce n'est pas vous qui parlez de vous.",
      champs: [{ cle: "histoires.h2.aucunClient", type: "cases", options: ["Je n'ai pas encore de client"], libelle: "Pas encore de client ?", aide: "Racontez votre propre transformation, ou celle d'un proche que vous avez aidé, avec son accord. Vous la remplacerez par un vrai client dès l'étape 15." }],
    },
    h3: {
      intro: "Comment vous avez trouvé votre méthode : le moment où vous avez compris quelque chose que les autres ne voient pas encore. Elle rend votre mécanisme unique logique et crédible.",
      champs: [{ cle: "info.h3", type: "info", libelle: "Votre mécanisme unique (outil 2)", rendu: (p) => (grandeIdee(p) ? { ton: "rappel", texte: phraseMecanisme(p) } : null) }],
    },
    h4: {
      intro: "La vie de votre prospect après la transformation, avec des détails concrets qu'il peut voir, ressentir, vivre.",
      champs: [{ cle: "info.h4", type: "info", libelle: "", rendu: (p) => ({ ton: "alerte", titre: "Restez dans votre promesse", texte: `Décrivez exactement ce que votre accompagnement permet d'atteindre, rien de plus.${promesseSpecifique(p) ? `\nVotre promesse : ${promesseSpecifique(p)}` : ""}` }) }],
    },
  };
  const ex = EXEMPLES[k] ?? {};
  return {
    titre: `${n}. ${titre}`,
    intro: particularites[k].intro,
    apercu: k === "h4",
    champs: [
      ...particularites[k].champs,
      ...TEMPS.map((t): Champ => ({
        cle: `histoires.${k}.${t.c}`, type: "long", libelle: t.libelle, aide: t.aide, exemple: ex[t.c],
        ...(k === "h4" && t.c === "situation"
          ? { prerempli: (p: Profil) => `Imaginez-vous dans ${delai(p) || "[délai]"}. Vous vous réveillez, vous… Vous n'avez plus besoin de… Votre entourage remarque que…` }
          : {}),
        ...(k === "h2" && t.c === "situation" ? { aide: "Qui était-il au départ ? Sa situation, son problème. (Sans client : votre propre point de départ.)" } : {}),
      })),
      { cle: `histoires.${k}.premiere`, type: "court", libelle: "La première phrase, au milieu de l'action", aide: "Ne commencez jamais par « Bonjour, je m'appelle… » : commencez au moment le plus fort.", exemple: ex.premiere },
      { cle: `histoires.${k}.lien`, type: "court", libelle: "Le lien de la vidéo, une fois tournée", exemple: "https://www.instagram.com/reel/…" },
    ],
  };
}

/** Les 4 histoires, pour les jours « histoire » du calendrier (outil 6) : leur première phrase, ou leur titre. */
export function histoiresPourCalendrier(p: Profil): string[] {
  return HISTOIRES.map(({ k, titre }) => texte(p, `histoires.${k}.premiere`) || `${titre}`);
}

export const outil5Histoires: DefinitionOutil = {
  code: "liberty_histoires",
  numero: 5,
  etape: "Étape 8",
  nom: "Mes 4 histoires",
  objectif: "Rédiger vos 4 histoires de vente, avec la même structure.",
  fichier: "Liberty_Etape8_Mes_4_histoires",
  ecrans: HISTOIRES.map((h, i) => ecranHistoire(h.k, h.titre, i + 1)),
  document: (p: Profil) => ({
    titre: "Mes 4 histoires",
    sections: HISTOIRES.map(({ k, titre }, i): SectionDoc => ({
      titre: `${i + 1}. ${titre}${k === "h2" && sansClient(p) ? " (en attendant un client)" : ""}`,
      blocs: [
        { t: "phrase", libelle: "Première phrase", valeur: texte(p, `histoires.${k}.premiere`) },
        ...TEMPS.map((t) => ({ t: "champ" as const, libelle: t.libelle.replace(/^\d\. /, ""), valeur: texte(p, `histoires.${k}.${t.c}`) })),
        { t: "champ", libelle: "Lien de la vidéo", valeur: texte(p, `histoires.${k}.lien`) },
      ],
    })),
  }),
};
