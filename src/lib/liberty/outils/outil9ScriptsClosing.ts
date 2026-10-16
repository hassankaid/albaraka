/**
 * Outil 9 — Scripts de closing et d'appel découverte (étape 13, après « Script et
 * pitch en 3 piliers »). Deux scripts, avec les informations de l'élève :
 * - l'appel découverte (20 minutes, 15 si la personne a écrit en premier) : cadre,
 *   questions construites sur les douleurs de l'avatar, résumé avec ses mots,
 *   transition vers l'appel de vente. Pas de prix ;
 * - le closing en 6 phases DECODE (slide 235) : Décrochage, Exploration,
 *   Confirmation, Offre (permission, pitch en 3 piliers pré-rempli avec la méthode,
 *   garantie verrouillée, prix et facilités), Décision (objections avec C.A.R.E.,
 *   la première étant celle de l'avatar), Engagement.
 * Rien sur les leads AL BARAKA ni les commissions. Aides : slides 235 à 246.
 */
import { genererDocx } from "./docx";
import { lignes, ligneRemplie, liste, texte, type AutreDocument, type DefinitionOutil, type DocumentOutil, type Ligne, type Profil, type SectionDoc } from "./modele";
import { echeances, garantie, montant, prix } from "./outil3FicheOffre";
import { delai, etapesMethode, nomOffre, rappelAvatar, resultat } from "./partage";

/** Les 6 phases DECODE et leur durée (slide 235). */
export const DECODE = [
  { lettre: "D", nom: "Décrochage", duree: "2-3 min" },
  { lettre: "E", nom: "Exploration", duree: "15-30 min" },
  { lettre: "C", nom: "Confirmation", duree: "2-3 min" },
  { lettre: "O", nom: "Offre", duree: "5-10 min" },
  { lettre: "D", nom: "Décision", duree: "10-20 min" },
  { lettre: "E", nom: "Engagement", duree: "2-3 min" },
];

const phase = (i: number) => `${DECODE[i].lettre} — ${DECODE[i].nom} (${DECODE[i].duree})`;

/** Le nom de l'offre, ou à défaut « mon accompagnement ». */
const offre = (p: Profil) => nomOffre(p) || "mon accompagnement";

/** Le prix et les facilités (outil 3), en une phrase. */
function phrasePrix(p: Profil): string {
  const total = prix(p);
  const facilites = echeances(p).filter((e) => !e.startsWith("En une fois"));
  return `L'investissement pour ${offre(p)}, c'est ${total ? montant(total, p) : "[votre prix]"}.${facilites.length ? ` Vous pouvez aussi le régler ${facilites.map((f) => (f.startsWith("Autre : ") ? f.slice(8) : `${f.replace(/^En /, "en ").replace(" : ", " (")})`)).join(" ou ")}.` : ""}`;
}

/** Les 3 piliers de départ : les deux premières étapes de la méthode, puis l'accompagnement (le plus fort, à la fin). */
function piliersDeDepart(p: Profil): Ligne[] {
  const etapes = etapesMethode(p);
  const suivi = [
    texte(p, "offre.appelsFrequence") && `${texte(p, "offre.appelsFrequence")}${texte(p, "offre.appelsDuree") ? ` de ${texte(p, "offre.appelsDuree")}` : ""}`,
    texte(p, "offre.messagerieCanal") && `${texte(p, "offre.messagerieCanal")} entre les appels${texte(p, "offre.messagerieDelai") ? `, réponse sous ${texte(p, "offre.messagerieDelai")}` : ""}`,
  ].filter(Boolean).join(", ");
  return [
    { nom: etapes[0]?.nom ?? "", concret: etapes[0]?.micro ?? "" },
    { nom: etapes[1]?.nom ?? "", concret: etapes[1]?.micro ?? "" },
    { nom: "L'accompagnement personnalisé", concret: suivi, benefice: "C'est grâce à lui que vous obtiendrez le plus de résultats, dans le délai le plus court." },
  ];
}

/** Les objections les plus fréquentes (slide 242) : ce qu'elles cachent, et la piste C.A.R.E. */
function objectionsDeDepart(p: Profil): Ligne[] {
  const avatar = texte(p, "avatar.objection");
  return [
    ...(avatar ? [{ objection: avatar }] : []),
    { objection: "« C'est trop cher. »", cache: "Il ne voit pas encore la valeur, ou il a un vrai problème de budget.", reponse: "Trop cher par rapport à quoi ? Revenir au coût de sa situation actuelle, puis aux facilités de paiement." },
    { objection: "« Je dois réfléchir. »", cache: "Une question restée sans réponse.", reponse: "« À quoi exactement souhaitez-vous réfléchir ? » Puis traiter le vrai point." },
    { objection: "« Je dois en parler à mon conjoint. »", cache: "Une décision partagée, ou une peur de se tromper.", reponse: "Proposer un second appel avec le conjoint. Vérifier que lui, de son côté, est convaincu." },
    { objection: "« Je n'ai pas le temps. »", cache: "Il ne voit pas comment l'intégrer à sa vie.", reponse: "Montrer le temps réel demandé chaque semaine, et ce que lui coûte le statu quo." },
    { objection: "« Ça ne marchera pas pour moi. »", cache: "Un manque de confiance en lui ou en l'offre.", reponse: "Témoignages de personnes qui lui ressemblent, votre méthode, votre garantie." },
  ];
}

const piliers = (p: Profil) => lignes(p, "closing.piliers").filter(ligneRemplie);
const objections = (p: Profil) => lignes(p, "closing.objections").filter(ligneRemplie);

// ── Les deux scripts ──────────────────────────────────────────────────────

export function scriptDecouverte(p: Profil): DocumentOutil {
  return {
    titre: "Script d'appel découverte",
    sections: [
      {
        titre: "Avant l'appel",
        blocs: [
          { t: "texte", texte: "20 minutes (15 si la personne vous a écrit en premier). Pas de prix pendant cet appel : son seul but est de comprendre la situation de la personne et, si vous pouvez l'aider, de fixer l'appel de vente." },
          { t: "liste", libelle: "Les problèmes de votre avatar", items: liste(p, "avatar.problemes") },
        ],
      },
      { titre: "1. L'accueil et le cadre", blocs: [{ t: "phrase", valeur: texte(p, "decouverte.accueil") }] },
      { titre: "2. Les questions de qualification", blocs: [{ t: "liste", items: liste(p, "decouverte.questions") }] },
      { titre: "3. Le résumé, avec ses mots", blocs: [{ t: "phrase", valeur: texte(p, "decouverte.resume") }] },
      {
        titre: "4. La suite",
        blocs: [
          { t: "champ", libelle: "Si vous pouvez l'aider", valeur: texte(p, "decouverte.transition") },
          { t: "champ", libelle: "Si vous ne pouvez pas l'aider", valeur: texte(p, "decouverte.nonQualifie") },
        ],
      },
    ],
  };
}

export function scriptClosing(p: Profil): DocumentOutil {
  const sections: SectionDoc[] = [
    {
      titre: "Avant l'appel",
      blocs: [{ t: "liste", items: liste(p, "closing.avant") }],
    },
    { titre: phase(0), blocs: [{ t: "phrase", libelle: "Le cadre et l'enregistrement", valeur: texte(p, "closing.decrochage") }] },
    { titre: phase(1), blocs: [{ t: "liste", libelle: "Vos questions", items: liste(p, "closing.exploration") }] },
    { titre: phase(2), blocs: [{ t: "phrase", libelle: "Votre résumé", valeur: texte(p, "closing.confirmation") }] },
    {
      titre: phase(3),
      blocs: [
        { t: "champ", libelle: "La permission", valeur: texte(p, "closing.permission") },
        { t: "phrase", libelle: "L'annonce du pitch", valeur: texte(p, "closing.pitchIntro") },
        ...(piliers(p).length ? piliers(p) : [{} as Ligne]).map((l, i) => ({
          t: "tableau" as const,
          colonnes: [`Pilier ${i + 1}${l.nom ? ` — ${l.nom}` : ""}`, ""],
          lignes: [
            ["Le problème qu'il règle", l.probleme ?? ""],
            ["Ce que vous faites", l.concret ?? ""],
            ["Le bénéfice pour lui", l.benefice ?? ""],
          ],
        })),
        { t: "texte", texte: "Après chaque pilier : « Avez-vous des questions sur ce pilier ? »" },
        { t: "phrase", libelle: "Votre garantie, citée comme dans votre contrat", valeur: garantie(p) },
        { t: "phrase", libelle: "Le prix", valeur: texte(p, "closing.prix") },
        { t: "texte", texte: "Puis le silence : laissez-le réfléchir." },
      ],
    },
    {
      titre: phase(4),
      blocs: objections(p).length
        ? objections(p).map((o) => ({
            t: "tableau" as const,
            colonnes: [o.objection || "Objection", ""],
            lignes: [["Ce qu'elle cache souvent", o.cache ?? ""], ["Votre réponse (C.A.R.E.)", o.reponse ?? ""]],
          }))
        : [{ t: "tableau", colonnes: ["Objection", ""], lignes: [["Ce qu'elle cache souvent", ""], ["Votre réponse (C.A.R.E.)", ""]] }],
    },
    {
      titre: phase(5),
      blocs: [
        { t: "champ", libelle: "Pendant l'appel", valeur: texte(p, "closing.engagement") },
        { t: "champ", libelle: "Message de bienvenue (sous 24 heures)", valeur: texte(p, "closing.bienvenue") },
      ],
    },
  ];
  return { titre: "Script de closing", sections };
}

const date = () => new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const AUTRES: AutreDocument[] = [
  {
    libelle: "Script d'appel découverte (Word)",
    format: "docx",
    fichier: "Liberty_Etape13_Script_appel_decouverte",
    generer: async (p, eleve) => genererDocx(scriptDecouverte(p), { def: outil9ScriptsClosing, eleve, date: date() }),
  },
  {
    libelle: "Script de closing (Word)",
    format: "docx",
    fichier: "Liberty_Etape13_Script_closing",
    generer: async (p, eleve) => genererDocx(scriptClosing(p), { def: outil9ScriptsClosing, eleve, date: date() }),
  },
];

export const outil9ScriptsClosing: DefinitionOutil = {
  code: "liberty_scripts_closing",
  numero: 9,
  etape: "Étape 13",
  nom: "Scripts de closing et d'appel découverte",
  objectif: "Préparer vos deux appels avec votre offre : l'appel découverte, puis l'appel de vente en 6 phases DECODE.",
  fichier: "Liberty_Etape13_Scripts_closing_decouverte",
  formats: ["docx", "pdf"],
  autresDocuments: AUTRES,
  ecrans: [
    {
      titre: "L'appel découverte",
      intro: "20 minutes, 15 si la personne vous a écrit en premier. Vous comprenez sa situation, vous résumez avec ses mots, et si vous pouvez l'aider, vous fixez l'appel de vente. Pas de prix.",
      champs: [
        {
          cle: "decouverte.accueil", type: "long", libelle: "L'accueil et le cadre",
          prerempli: () => "Bonjour [Prénom], c'est [votre prénom], merci d'avoir pris ce temps ! L'appel va durer une vingtaine de minutes : je vais vous poser quelques questions pour bien comprendre votre situation, et à la fin, je vous dirai honnêtement si je peux vous aider. Ça vous va ?",
        },
        { cle: "info.avatarDecouverte", type: "info", libelle: "", rendu: rappelAvatar },
        {
          cle: "decouverte.questions", type: "liste", ajout: "Ajouter une question",
          libelle: "Vos questions de qualification",
          aide: "Construites sur les douleurs de votre avatar et sur vos 5 conversations (étape 12). Notez ses réponses mot pour mot.",
          prerempli: () => [
            "Qu'est-ce qui vous a donné envie de prendre cet appel ?",
            "Où en êtes-vous aujourd'hui ?",
            "Quel est votre plus gros problème ? Depuis quand ?",
            "Qu'avez-vous déjà essayé ? Pourquoi ça n'a pas marché ?",
            "Que se passerait-il si rien ne changeait dans 6 mois ?",
            "À quoi ressemblerait votre situation idéale ?",
            "Vous aimeriez commencer quand ?",
            "Êtes-vous en mesure d'investir dans une solution qui vous permettrait enfin d'y arriver ?",
          ],
        },
        {
          cle: "decouverte.resume", type: "long", libelle: "Le résumé, avec ses mots",
          prerempli: () => "Si je résume : aujourd'hui, [sa situation, avec ses mots]. Vous avez déjà essayé [ce qu'il a essayé], sans résultat durable. Et ce que vous voulez, c'est [son objectif]. C'est bien ça ?",
        },
        {
          cle: "decouverte.transition", type: "long", libelle: "Si vous pouvez l'aider : la transition vers l'appel de vente",
          prerempli: (p) => `Bonne nouvelle : vous correspondez exactement au type de personnes que j'aide à ${resultat(p) || "[résultat]"}${delai(p) ? ` en ${delai(p)}` : ""}. Je vous propose qu'on se fixe un appel en visio, où je vous présente en détail comment on peut vous y amener. J'ai des disponibilités [jour] à [heure] ou [jour] à [heure] : qu'est-ce qui vous arrange le mieux ?`,
        },
        {
          cle: "decouverte.nonQualifie", type: "long", libelle: "Si vous ne pouvez pas l'aider",
          prerempli: () => "Honnêtement, je ne pense pas pouvoir vous aider aujourd'hui, et je préfère vous le dire. Si votre situation évolue, n'hésitez pas à revenir vers moi.",
        },
      ],
    },
    {
      titre: "Avant l'appel de vente",
      intro: "L'appel de vente suit les 6 phases DECODE. Préparez-le : relisez vos notes, ouvrez votre contrat, préparez vos liens.",
      champs: [
        {
          cle: "closing.avant", type: "liste", ajout: "Ajouter un point",
          libelle: "Votre check-list avant chaque appel",
          prerempli: () => [
            "Relire les réponses de son formulaire et mes notes de setting.",
            "Vérifier s'il a regardé la vidéo avant l'appel et le best-of des témoignages.",
            "Ouvrir mon contrat en PDF, prêt à être partagé à l'écran.",
            "Préparer mon dossier de preuves, lisibles avec le son.",
            "Préparer mon lien de paiement et le lien de réservation du premier appel de coaching.",
            "M'installer au calme, devant un ordinateur, avec mon script ouvert.",
          ],
        },
        {
          cle: "closing.decrochage", type: "long", libelle: phase(0),
          aide: "Créer le lien, poser le cadre, demander l'accord pour enregistrer l'appel.",
          prerempli: () => "Bonjour [Prénom], comment allez-vous ? … Merci d'être là. Voilà comment je vous propose qu'on fasse : je vais d'abord vous poser des questions pour bien comprendre où vous en êtes, et si je pense pouvoir vous aider, je vous présenterai comment. Ça vous va ? Et êtes-vous d'accord pour que j'enregistre l'appel, pour bien suivre votre dossier ?",
        },
      ],
    },
    {
      titre: "Exploration et confirmation",
      intro: "Diagnostiquer avant de prescrire : sa situation, son problème, ce qu'il a essayé, son objectif, ce que ça lui coûte de ne rien changer. Puis résumez avec ses mots.",
      champs: [
        { cle: "info.avatarClosing", type: "info", libelle: "", rendu: rappelAvatar },
        {
          cle: "closing.exploration", type: "liste", ajout: "Ajouter une question",
          libelle: phase(1),
          aide: "Vos questions, à partir des douleurs et des mots de votre avatar et de vos 5 conversations.",
          prerempli: () => [
            "Racontez-moi : où en êtes-vous aujourd'hui ?",
            "Depuis combien de temps vivez-vous ça ?",
            "Qu'avez-vous déjà essayé ? Qu'est-ce qui n'a pas marché, selon vous ?",
            "Comment ça impacte votre quotidien ?",
            "Quel est votre objectif précis ? Pour quand ?",
            "Pourquoi maintenant ? Qu'est-ce qui fait que c'est important aujourd'hui ?",
            "Que se passera-t-il si rien ne change dans un an ?",
          ],
        },
        {
          cle: "closing.confirmation", type: "long", libelle: phase(2),
          aide: "Résumez avec ses mots, et vérifiez que vous avez bien compris.",
          prerempli: () => "Si je vous ai bien compris : aujourd'hui, [sa situation]. Ce qui vous bloque, c'est [son problème], et vous avez déjà essayé [ce qu'il a essayé]. Votre objectif, c'est [son objectif], et c'est important maintenant parce que [sa raison]. C'est bien ça ? Il y a autre chose que je devrais savoir ?",
        },
      ],
    },
    {
      titre: "L'offre en 3 piliers",
      intro: "Demandez la permission, puis présentez votre offre en 3 piliers, chacun relié à ce qu'il vous a dit. Le pilier le plus fort à la fin, souvent l'accompagnement. Puis la garantie, le prix, et le silence.",
      champs: [
        {
          cle: "closing.permission", type: "long", libelle: "La permission",
          prerempli: () => "Merci pour tout ce que vous m'avez partagé. Voulez-vous que je vous montre comment on peut vous aider ?",
        },
        {
          cle: "closing.pitchIntro", type: "long", libelle: "L'annonce du pitch",
          prerempli: (p) => `${nomOffre(p) || "[Nom de votre offre]"} a pour but de vous aider à ${resultat(p) || "[résultat]"}${delai(p) ? ` en ${delai(p)}` : ""}. Il se compose de 3 piliers, chacun pensé pour que vous obteniez ce résultat. Je vous les présente ?`,
        },
        {
          cle: "closing.piliers", type: "blocs", fixe: 3, nomBloc: "Pilier",
          libelle: "Vos 3 piliers",
          aide: "Proposés à partir de votre méthode (outil 2) et de votre accompagnement (outil 3) : retouchez-les.",
          repris: "votre méthode (outil 2)",
          prerempli: piliersDeDepart,
          colonnes: [
            { cle: "nom", libelle: "Le pilier", type: "court", exemple: "La nutrition" },
            { cle: "probleme", libelle: "Le problème qu'il règle", type: "long", exemple: "Si aujourd'hui vous n'avez pas les résultats que vous méritez, c'est que vous mangez sans plan adapté à vos goûts et à votre temps." },
            { cle: "concret", libelle: "Ce que vous faites concrètement", type: "long", exemple: "Un plan adapté à vos goûts, à votre budget et à votre temps, facile à cuisiner." },
            { cle: "benefice", libelle: "Le bénéfice pour lui, avec ses mots", type: "long", exemple: "Vous ne vous demandez plus quoi manger le soir." },
          ],
        },
        { cle: "garantie.texte", type: "long", lectureSeule: true, repris: "l'outil 3", libelle: "Votre garantie", aide: "Citée exactement comme dans votre contrat. Montrez le contrat à l'écran si besoin." },
        {
          cle: "closing.prix", type: "long", libelle: "Le prix et les facilités",
          repris: "votre fiche offre (outil 3)",
          prerempli: phrasePrix,
          aide: "Puis le silence : laissez-le réfléchir.",
        },
      ],
    },
    {
      titre: "La décision et l'engagement",
      intro: "Répondez aux questions et aux objections avec C.A.R.E. : Clarifier, Accuser réception, Recadrer, Engager. Puis le paiement pendant l'appel, et la suite.",
      apercu: true,
      champs: [
        {
          cle: "closing.objections", type: "blocs", nomBloc: "Objection", ajout: "Ajouter une objection", max: 12,
          libelle: phase(4),
          aide: "La première reprend l'objection de votre avatar (outil 1), puis les plus fréquentes : adaptez les réponses à votre niche.",
          prerempli: objectionsDeDepart,
          colonnes: [
            { cle: "objection", libelle: "L'objection", type: "court" },
            { cle: "cache", libelle: "Ce qu'elle cache souvent", type: "long" },
            { cle: "reponse", libelle: "Votre réponse (C.A.R.E.)", type: "long" },
          ],
        },
        {
          cle: "closing.engagement", type: "long", libelle: phase(5),
          aide: "Un « oui » ferme, le paiement pendant l'appel, le contrat, le premier rendez-vous.",
          prerempli: () => "Félicitations pour votre décision ! Je vous envoie le lien de paiement, je reste avec vous pendant que vous réglez. … C'est validé ! Je vous envoie maintenant le contrat à signer en ligne, et le lien pour réserver votre premier appel de coaching.",
        },
        {
          cle: "closing.bienvenue", type: "long", libelle: "Message de bienvenue (sous 24 heures, idéalement en vocal)",
          prerempli: () => `Bienvenue [Prénom] ! C'est une joie de vous accompagner. Voici la suite : [prochaines étapes]. On se retrouve [date] pour votre premier appel. D'ici là, n'hésitez pas à m'écrire sur [canal].`,
        },
      ],
    },
  ],
  document: (p: Profil) => {
    const d = scriptDecouverte(p);
    const c = scriptClosing(p);
    const derniere = d.sections[d.sections.length - 1];
    return {
      titre: "Scripts de closing et d'appel découverte",
      sections: [
        { titre: `${d.titre.toUpperCase()} — ${d.sections[0].titre}`, blocs: d.sections[0].blocs },
        ...d.sections.slice(1, -1),
        { ...derniere, blocs: [...derniere.blocs, { t: "saut" }] },
        { titre: `${c.titre.toUpperCase()} — ${c.sections[0].titre}`, blocs: c.sections[0].blocs },
        ...c.sections.slice(1),
      ],
    };
  },
};
