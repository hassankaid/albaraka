/**
 * Outil 11 — Mes offres mid et low-ticket (bonus, après « E-mails de bienvenue »).
 * Objectif : construire les deux petites offres, leur page de vente et la séquence
 * de bienvenue. Reprend la sous-niche, la promesse, le prix high-ticket, la
 * garantie, l'histoire fondatrice (outil 5) et les témoignages (outil 4).
 * Aides : slides 390 à 395 du PowerPoint du parcours.
 */
import { assembler, enMinuscule, lignes, ligneRemplie, liste, texte, type DefinitionOutil, type Ligne, type Profil, type SectionDoc } from "./modele";
import { garantie, montant, prix } from "./outil3FicheOffre";
import { cible, delai, etapesMethode, motsAvatar, nomOffre, problemesAvatar, resultat } from "./partage";

const montantDe = (p: Profil, cle: string) => {
  const n = Number(texte(p, cle).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? montant(n, p) : "";
};

/** Les modules que l'élève peut garder : les phases de son offre (outil 3), sinon les étapes de sa méthode (outil 2). */
function modulesDuProgramme(p: Profil): string[] {
  const phases = lignes(p, "offre.phases").map((l) => (l.nom ?? "").trim()).filter(Boolean);
  return phases.length ? phases : etapesMethode(p).map((e) => e.nom).filter(Boolean);
}

const chapitres = (p: Profil) => lignes(p, "low.chapitres").filter(ligneRemplie);
const temoignages = (p: Profil) => lignes(p, "preuves.temoignages").filter(ligneRemplie);

/** « Karim : 62 kg, aucun muscle → +8 kg de muscle en 90 jours » */
const temoignage = (l: Ligne) =>
  `${l.prenom || "[Prénom]"} : ${[l.depart, l.resultat].filter(Boolean).join(" → ")}${l.delai ? ` en ${l.delai}` : ""}`;

/** Formule du titre (slide 393) : « [Résultat] pour [cible] en [délai], même si [objection] ». */
export function titrePageDeVente(p: Profil): string {
  const r = resultat(p);
  return assembler([
    { valeur: r ? r.charAt(0).toUpperCase() + r.slice(1) : "", vide: "Résultat" },
    " pour ", { valeur: cible(p), vide: "cible" },
    " en ", { valeur: delai(p), vide: "délai" },
    ", même si ", { valeur: enMinuscule(texte(p, "avatar.objection").replace(/^[«"\s]+|[»".\s]+$/g, "")), vide: "objection" }, ".",
  ]);
}

/** Le contenu de l'offre choisie pour la page de vente, module par module. */
function contenuOffre(p: Profil): string {
  if (texte(p, "page.offreConcernee") === "Low-ticket") {
    return chapitres(p).map((c, i) => `Chapitre ${i + 1} — ${c.titre || "[titre]"} : ${c.contenu || "[ce qu'il apporte]"}`).join("\n");
  }
  return liste(p, "mid.modules").map((m) => `${m} : [ce que ce module apporte]`).join("\n");
}

/** L'offre de la page de vente : prix et conditions. */
function offreDeLaPage(p: Profil): string {
  const low = texte(p, "page.offreConcernee") === "Low-ticket";
  const nom = texte(p, low ? "low.titre" : "mid.nom");
  const px = montantDe(p, low ? "low.prix" : "mid.prix");
  const acces = !low && texte(p, "mid.acces") ? `, accès pendant ${texte(p, "mid.acces")}` : "";
  return `${nom || "[Nom de l'offre]"} : ${px || "[prix]"}${acces}.`;
}

const EMAILS = [
  { k: "j0", titre: "J+0 — Accueil", role: "Merci, l'accès à ce qu'il a téléchargé ou acheté, et une première action applicable en 5 minutes." },
  { k: "j2", titre: "J+2 — Votre histoire", role: "Votre transformation, vos valeurs, et « si vous êtes dans cette situation, vous n'êtes pas seul »." },
  { k: "j4", titre: "J+4 — Valeur pure", role: "Votre meilleur conseil, 3 à 5 points concrets. Aucune vente." },
  { k: "j6", titre: "J+6 — Étude de cas", role: "Un client réel : avant, ce qui a changé, le résultat précis." },
  { k: "j8", titre: "J+8 — L'offre", role: "Le problème, votre offre, une preuve, la garantie, un seul appel à l'action, et un P.-S. qui résume." },
];

function emailPrerempli(k: string, p: Profil): string {
  switch (k) {
    case "j0": return "Bonjour [Prénom],\n\nMerci et bienvenue ! Voici votre accès : [lien].\n\nPour commencer tout de suite, une seule action, 5 minutes : [première action].\n\nÀ très vite,\n[Votre prénom]";
    case "j2": {
      const h = (c: string) => texte(p, `histoires.h1.${c}`);
      return h("situation") || h("transformation")
        ? `Bonjour [Prénom],\n\n${[h("situation"), h("declencheur"), h("transformation"), h("resultat")].filter(Boolean).join("\n\n")}\n\nSi vous êtes dans cette situation, vous n'êtes pas seul.\n\n[Votre prénom]`
        : "";
    }
    case "j6": {
      const t = temoignages(p)[0];
      return t ? `Bonjour [Prénom],\n\nAujourd'hui, je veux vous parler de ${t.prenom || "[prénom]"}.\n\nAvant : ${t.depart || "[sa situation]"}.\nCe qui a changé : [ce qu'il a fait].\nLe résultat : ${t.resultat || "[résultat]"}${t.delai ? ` en ${t.delai}` : ""}.\n\n[Votre prénom]` : "";
    }
    case "j8": return `Bonjour [Prénom],\n\n[Le problème, avec ses mots.]\n\n[Votre offre, en 2 phrases.]\n\n[Une preuve.]\n\n${garantie(p) ? `${garantie(p)}\n\n` : ""}[Votre appel à l'action : un seul lien.]\n\n[Votre prénom]\n\nP.-S. [Le résumé en une phrase.]`;
    default: return "";
  }
}

const SECTIONS_PAGE: { k: string; titre: string; aide: string }[] = [
  { k: "titre", titre: "1. Titre", aide: "[Résultat] pour [cible] en [délai], même si [objection]." },
  { k: "sousTitre", titre: "2. Sous-titre", aide: "Pour qui, comment, pourquoi maintenant." },
  { k: "douleurs", titre: "3. Douleurs", aide: "Les problèmes du lecteur, avec ses mots, sans exagérer." },
  { k: "histoire", titre: "4. Histoire", aide: "Votre transformation, votre crédibilité." },
  { k: "promesse", titre: "5. Promesse", aide: "Les bénéfices, pas la liste du contenu." },
  { k: "preuves", titre: "6. Preuves", aide: "Témoignages réels, avec l'accord des clients." },
  { k: "contenu", titre: "7. Contenu", aide: "Module par module, avec ce que chacun apporte." },
  { k: "createur", titre: "8. Créateur", aide: "Votre parcours et votre légitimité." },
  { k: "offre", titre: "9. Offre", aide: "Prix, bonus, garantie comme dans vos conditions de vente." },
  { k: "faq", titre: "10. FAQ", aide: "Les objections, anticipées." },
  { k: "maintenant", titre: "11. Pourquoi maintenant", aide: "Une vraie raison d'agir : une date réelle, des places réelles." },
  { k: "cta", titre: "12. Appel à l'action", aide: "Un bouton clair, et le rappel de la garantie." },
];

const garantieSurLaPage = (p: Profil) => liste(p, "page.garantieApplicable").length > 0;

export const outil11MidLow: DefinitionOutil = {
  code: "liberty_mid_low",
  numero: 11,
  etape: "Bonus",
  nom: "Mes offres mid et low-ticket",
  objectif: "Construire vos deux petites offres, leur page de vente et votre séquence de 5 e-mails de bienvenue.",
  fichier: "Liberty_Bonus_Offres_mid_low",
  ecrans: [
    {
      titre: "Mid-ticket",
      intro: "Votre programme high-ticket, sans l'accompagnement, avec un accès limité dans le temps. Pour ceux qui veulent votre méthode mais n'ont pas le budget pour l'accompagnement.",
      champs: [
        {
          cle: "info.mid", type: "info", libelle: "",
          rendu: (p) => ({
            ton: "rappel", titre: "Pas de coaching, pas de messagerie",
            texte: `Les vidéos, les outils et les ressources, avec un accès limité. Un prix nettement sous votre offre high-ticket${prix(p) ? ` (${nomOffre(p) || "votre offre"} : ${montant(prix(p)!, p)})` : ""}.`,
          }),
        },
        { cle: "mid.nom", type: "court", libelle: "Le nom de l'offre", exemple: "T12S en autonomie" },
        {
          cle: "mid.modules", type: "cases", options: modulesDuProgramme, libelle: "Les modules gardés",
          aide: "Repris de votre programme (outils 2 et 3) : tout, ou les modules essentiels.",
        },
        {
          cle: "mid.outils", type: "long", libelle: "Les outils et ressources inclus",
          repris: "votre fiche offre (outil 3)", prerempli: (p) => texte(p, "offre.documents"),
          exemple: "Les plans d'entraînement, la liste de courses, le suivi des mensurations.",
        },
        { cle: "mid.acces", type: "court", libelle: "La durée d'accès", exemple: "6 mois" },
        { cle: "mid.prix", type: "nombre", libelle: "Le prix", exemple: "497" },
      ],
    },
    {
      titre: "Low-ticket",
      intro: "Un e-book ou une mini-formation qui règle un seul problème précis, avec un résultat rapide, puis invite à réserver un appel. Prenez un chapitre de votre programme qui donne un résultat rapide : c'est souvent votre meilleur low-ticket.",
      champs: [
        { cle: "low.format", type: "choix", options: ["E-book", "Mini-formation"], libelle: "Le format" },
        {
          cle: "low.probleme", type: "long", libelle: "Le problème réglé",
          aide: "Un seul problème précis, que vous réglez vite. Partez des problèmes de votre avatar (outil 1).",
          exemple: "Ne plus grignoter le soir.",
        },
        { cle: "low.titre", type: "court", libelle: "Le titre", aide: "Un titre qui promet un résultat précis.", exemple: "Stop au grignotage du soir en 7 jours" },
        {
          cle: "low.introduction", type: "long", libelle: "L'introduction",
          aide: "Votre histoire en quelques lignes, et ce que la personne va obtenir.",
          prerempli: (p) => texte(p, "histoires.h1.premiere"),
        },
        {
          cle: "low.chapitres", type: "blocs", nomBloc: "Chapitre", ajout: "Ajouter un chapitre", initial: 3, max: 7,
          compteur: { objectif: 3, mot: "chapitre" },
          libelle: "Les chapitres (3 à 7)",
          aide: "Le problème, la méthode, les étapes, un exemple. Une action concrète à la fin de chaque chapitre.",
          colonnes: [
            { cle: "titre", libelle: "Le titre", type: "court", exemple: "Pourquoi vous grignotez le soir" },
            { cle: "contenu", libelle: "Ce qu'il contient", type: "long" },
            { cle: "action", libelle: "L'action à la fin", type: "court", exemple: "Préparer votre collation de 17 h" },
          ],
        },
        {
          cle: "low.invitation", type: "long", libelle: "L'invitation à réserver un appel",
          prerempli: (p) => resultat(p) && `Vous voulez aller plus loin et ${resultat(p)}${delai(p) ? ` en ${delai(p)}` : ""} ? Réservez un appel avec moi : on regarde ensemble votre situation, et je vous dis si je peux vous aider. [lien de réservation]`,
        },
        { cle: "low.prix", type: "nombre", libelle: "Le prix", exemple: "27" },
      ],
    },
    {
      titre: "Page de vente",
      intro: "Choisissez l'offre, puis écrivez les 12 sections. Votre histoire et vos preuves sont reprises ; le titre, le contenu et l'offre sont proposés à partir de vos réponses.",
      champs: [
        { cle: "page.offreConcernee", type: "choix", options: ["Mid-ticket", "Low-ticket"], libelle: "L'offre concernée" },
        ...SECTIONS_PAGE.map(({ k, titre, aide }) => {
          const base = { cle: `page.${k}`, type: "long" as const, libelle: titre, aide };
          switch (k) {
            case "titre": return { ...base, proposition: titrePageDeVente };
            case "douleurs": return { ...base, prerempli: (p: Profil) => [...problemesAvatar(p), ...motsAvatar(p).map((m) => `« ${m} »`)].join("\n") };
            case "histoire": return { ...base, repris: "votre histoire fondatrice (outil 5)", prerempli: (p: Profil) => ["situation", "declencheur", "transformation", "resultat"].map((c) => texte(p, `histoires.h1.${c}`)).filter(Boolean).join("\n\n") };
            case "preuves": return { ...base, repris: "vos témoignages (outil 4)", prerempli: (p: Profil) => temoignages(p).map(temoignage).join("\n") };
            case "contenu": return { ...base, proposition: contenuOffre };
            case "offre": return { ...base, proposition: offreDeLaPage };
            default: return base;
          }
        }),
        { cle: "garantie.texte", type: "long", lectureSeule: true, repris: "l'outil 3", libelle: "Votre garantie", aide: "Citée exactement comme dans votre contrat, uniquement si elle s'applique aussi à cette offre." },
        { cle: "page.garantieApplicable", type: "cases", options: ["Ma garantie s'applique aussi à cette offre"], libelle: "Sur la page de vente" },
      ],
    },
    {
      titre: "E-mails de bienvenue",
      intro: "5 e-mails en 8 jours, envoyés après un téléchargement ou un achat : ils créent la confiance, puis présentent votre offre.",
      apercu: true,
      champs: EMAILS.flatMap(({ k, titre, role }) => [
        { cle: `emails.${k}.objet`, type: "court" as const, libelle: `${titre} : l'objet`, aide: role },
        { cle: `emails.${k}.texte`, type: "long" as const, libelle: `${titre} : le texte`, prerempli: (p: Profil) => emailPrerempli(k, p) },
      ]),
    },
  ],
  document: (p: Profil) => {
    const sections: SectionDoc[] = [
      {
        titre: "Votre offre mid-ticket",
        blocs: [
          { t: "champ", libelle: "Nom", valeur: texte(p, "mid.nom") },
          { t: "liste", libelle: "Modules gardés", items: liste(p, "mid.modules") },
          { t: "champ", libelle: "Outils et ressources", valeur: texte(p, "mid.outils") },
          { t: "champ", libelle: "Durée d'accès", valeur: texte(p, "mid.acces") },
          { t: "champ", libelle: "Prix", valeur: montantDe(p, "mid.prix") },
          { t: "texte", texte: "Pas de coaching, pas de messagerie." },
        ],
      },
      {
        titre: "Votre offre low-ticket",
        blocs: [
          { t: "champ", libelle: "Format", valeur: texte(p, "low.format") },
          { t: "champ", libelle: "Problème réglé", valeur: texte(p, "low.probleme") },
          { t: "phrase", libelle: "Titre", valeur: texte(p, "low.titre") },
          { t: "champ", libelle: "Introduction", valeur: texte(p, "low.introduction") },
          {
            t: "tableau", colonnes: ["Chapitre", "Contenu", "Action"],
            lignes: chapitres(p).map((c, i) => [`${i + 1}. ${c.titre ?? ""}`, c.contenu ?? "", c.action ?? ""]),
          },
          { t: "champ", libelle: "Invitation à réserver un appel", valeur: texte(p, "low.invitation") },
          { t: "champ", libelle: "Prix", valeur: montantDe(p, "low.prix") },
          { t: "saut" },
        ],
      },
      {
        titre: `Votre page de vente${texte(p, "page.offreConcernee") ? ` (${texte(p, "page.offreConcernee").toLowerCase()})` : ""}`,
        blocs: [
          ...SECTIONS_PAGE.map(({ k, titre }) => ({ t: "champ" as const, libelle: titre.replace(/^\d+\. /, ""), valeur: texte(p, `page.${k}`) })),
          ...(garantieSurLaPage(p) ? [{ t: "phrase" as const, libelle: "Garantie", valeur: garantie(p) }] : []),
          { t: "saut" },
        ],
      },
      ...EMAILS.map(({ k, titre }): SectionDoc => ({
        titre: `E-mail ${titre}`,
        blocs: [
          { t: "phrase", libelle: "Objet", valeur: texte(p, `emails.${k}.objet`) },
          { t: "champ", libelle: "Texte", valeur: texte(p, `emails.${k}.texte`) },
        ],
      })),
    ];
    return { titre: "Mes offres mid et low-ticket", sections };
  },
};
