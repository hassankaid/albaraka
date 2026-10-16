/**
 * Outil 4 — Scripts de la VSL et du tunnel (étape 5, après « Écrire vos scripts »).
 * Objectif : écrire la VSL partie par partie et tous les textes du tunnel. Reprend
 * l'avatar, ses 3 problèmes, la promesse, le délai, la méthode, le mécanisme unique
 * et la garantie (lecture seule). Phrases-modèles : slides 112 à 120.
 *
 * Deux documents : tous les scripts (PDF / Word) et le PowerPoint de slides VSL du
 * modèle de Sidali, avec les textes déjà placés.
 */
import { assembler, enMinuscule, lignes, ligneRemplie, liste, texte, type AutreDocument, type DefinitionOutil, type Profil } from "./modele";
import { cible, delai, etapesMethode, grandeIdee, nomMethode, phraseMecanisme, problemesAvatar, promesseSpecifique, resultat } from "./partage";
import { remplirXml, transformerModele, TYPE_PPTX, type Valeurs } from "./modeles";

const sansClients = (p: Profil) => liste(p, "preuves.aucunClient").length > 0;
const avecClients = (p: Profil) => !sansClients(p);
const garantieTexte = (p: Profil) => texte(p, "garantie.texte");
const methode = (p: Profil) => (nomMethode(p) ? `la méthode ${nomMethode(p)}` : "");
const temoignages = (p: Profil) => lignes(p, "preuves.temoignages").filter(ligneRemplie);

export const FORMULES_TITRE = [
  "Comment [résultat] en [délai], même si [objection]",
  "De [situation actuelle] à [situation idéale] en [délai] grâce à [méthode]",
];

export function titreAssemble(p: Profil): string {
  const formule = texte(p, "titre.formule");
  if (formule === FORMULES_TITRE[1]) {
    return assembler([
      "De ", { valeur: texte(p, "titre.situationActuelle"), vide: "situation actuelle" },
      " à ", { valeur: texte(p, "titre.situationIdeale"), vide: "situation idéale" },
      " en ", { valeur: delai(p), vide: "délai" },
      " grâce à ", { valeur: methode(p), vide: "votre méthode" },
    ]);
  }
  if (formule === FORMULES_TITRE[0]) {
    return assembler([
      "Comment ", { valeur: resultat(p), vide: "résultat" },
      " en ", { valeur: delai(p), vide: "délai" },
      ", même si ", { valeur: texte(p, "titre.objection"), vide: "objection principale" },
    ]);
  }
  return "";
}

const pre = {
  p1: (p: Profil) => (cible(p) || problemesAvatar(p)[0]
    ? `Si vous êtes ${cible(p) || "[avatar précis]"} et que ${enMinuscule(problemesAvatar(p)[0] ?? "") || "[problème ou désir]"}…`
    : ""),
  p2: (p: Profil) => (resultat(p) ? `Je vous aide personnellement à ${resultat(p)} en ${delai(p) || "[délai]"} grâce à ${methode(p) || "[méthode]"}.` : ""),
  p7: (p: Profil) => (resultat(p)
    ? `En résumé : ${promesseSpecifique(p)} En ${delai(p) || "[délai]"}, on règle ensemble ${problemesAvatar(p).map(enMinuscule).join(", ") || "[vos 3 problèmes]"}. Et vous êtes protégé par ma garantie : ${garantieTexte(p) || "[garantie]"} Cliquez sur le bouton sous la vidéo pour réserver votre appel.`
    : ""),
  p11: (p: Profil) => (resultat(p)
    ? `Vous avez deux options. Option 1 : continuer comme aujourd'hui${texte(p, "avatar.ressenti") ? `, ${enMinuscule(texte(p, "avatar.ressenti"))}` : ""}. Option 2 : réserver votre appel gratuit, et repartir au minimum avec un plan clair pour ${resultat(p)}. Cliquez sur le bouton sous la vidéo.`
    : ""),
};

const PARTIES_VSL: { n: number; nom: string; duree: string; modele: string }[] = [
  { n: 1, nom: "Appel de l'avatar", duree: "0-5 s", modele: "« Si vous êtes [avatar précis] et que [problème / désir]… »" },
  { n: 2, nom: "Votre offre", duree: "5-15 s", modele: "« Je vous aide personnellement à atteindre [résultat] en [délai] grâce à [méthode]. »" },
  { n: 4, nom: "Développer la garantie", duree: "20-30 s", modele: "Expliquer simplement ce qu'elle veut dire, et montrer le contrat à l'écran." },
  { n: 5, nom: "Reconnaître le scepticisme", duree: "5 s", modele: "« Je sais que ça peut sembler difficile à croire… »" },
  { n: 6, nom: "Les preuves", duree: "30-50 s", modele: "Vos résultats clients : prénom, situation de départ, résultat, délai (écran suivant)." },
  { n: 7, nom: "Premier appel à l'action", duree: "60 s max", modele: "Résumé (promesse, délai, 3 problèmes, garantie) + « Cliquez sur le bouton sous la vidéo pour réserver votre appel. »" },
  { n: 8, nom: "Transition", duree: "30 s", modele: "Vous vous présentez. « Si vous n'y êtes pas encore arrivé, ce n'est pas votre faute. » La grande vérité : ce qui l'empêche d'avancer." },
  { n: 9, nom: "Mécanisme unique", duree: "2-4 min", modele: "Votre grande idée : pourquoi ce qu'il a essayé a échoué, et pourquoi votre méthode marche. Simple, logique, comme pour un enfant de 8 ans." },
  { n: 10, nom: "Nouveaux résultats", duree: "30-60 s", modele: "D'autres témoignages, différents de ceux du début." },
  { n: 11, nom: "Dernier appel à l'action", duree: "60 s", modele: "Résumé + deux options : rester dans sa situation, ou réserver un appel gratuit et repartir au minimum avec un plan clair." },
];

const libellePartie = (n: number, nom: string, duree: string) => `Partie ${n} — ${nom} (${duree})`;

/** Les valeurs des champs « » d'une slide du modèle VSL de Sidali. */
export function valeursSlide(p: Profil, slide: number, eleve: string): Valeurs {
  const t = temoignages(p);
  const client = (k: number, i: number): Valeurs => ({
    [`PRÉNOM CLIENT ${k}`]: t[i]?.prenom ?? "", [`AVANT ${k}`]: t[i]?.depart ?? "",
    [`APRÈS ${k}`]: t[i]?.resultat ?? "", [`DÉLAI ${k}`]: t[i]?.delai ?? "",
  });
  const etapes = etapesMethode(p);
  const probs = problemesAvatar(p);
  const explications = liste(p, "vsl.explications");
  const commun: Valeurs = {
    "AVATAR PRÉCIS": cible(p),
    "PROBLÈME OU DÉSIR": enMinuscule(probs[0] ?? ""),
    "RÉSULTAT CHIFFRÉ": resultat(p),
    RÉSULTAT: resultat(p),
    DÉLAI: delai(p),
    "NOM DE LA MÉTHODE": nomMethode(p),
    "TEXTE EXACT DE LA GARANTIE": garantieTexte(p),
    "GARANTIE EN UNE LIGNE (citée du contrat)": garantieTexte(p),
    "EXPLICATION 1": explications[0] ?? "", "EXPLICATION 2": explications[1] ?? "", "EXPLICATION 3": explications[2] ?? "",
    "PROBLÈME 1": probs[0] ?? "", "PROBLÈME 2": probs[1] ?? "", "PROBLÈME 3": probs[2] ?? "",
    "VOTRE PRÉNOM": eleve.trim().split(/\s+/)[0] ?? "",
    "LA GRANDE VÉRITÉ": texte(p, "vsl.grandeVerite"),
    "GRANDE IDÉE": grandeIdee(p),
    "SITUATION ACTUELLE": texte(p, "avatar.ressenti") || texte(p, "cible.douleur"),
    ...Object.fromEntries([1, 2, 3, 4].flatMap((k) => [
      [`ÉTAPE ${k}`, etapes[k - 1]?.nom ?? ""], [`CE QUE L'ON FAIT À L'ÉTAPE ${k}`, etapes[k - 1]?.micro ?? ""],
    ])),
  };
  // slide 7 « Ils l'ont fait » : clients 1 à 3 ; slide 13 « D'autres résultats » : clients 4 et 5
  const tentatives = lignes(p, "vsl.tentatives");
  const essais: Valeurs = Object.fromEntries([1, 2, 3].flatMap((k) => [
    [`TENTATIVE ${k}`, tentatives[k - 1]?.tentative ?? ""], [`RAISON ${k}`, tentatives[k - 1]?.raison ?? ""],
  ]));
  // slide 3 « … grâce à [méthode] » : « la méthode T12S » ; ailleurs, le nom seul
  if (slide === 3) return { ...commun, "NOM DE LA MÉTHODE": methode(p) };
  if (slide === 10) return { ...commun, ...essais };
  if (slide === 7) return { ...commun, ...client(1, 0), ...client(2, 1), ...client(3, 2) };
  if (slide === 13) return { ...commun, ...client(1, 3), ...client(2, 4) };
  return commun;
}

const AUTRES: AutreDocument[] = [{
  libelle: "Slides VSL (PowerPoint)",
  format: "pptx",
  fichier: "Liberty_Etape5_Slides_VSL",
  generer: async (p, eleve, modele) =>
    transformerModele(await modele("slides_vsl"), /^ppt\/slides\/slide\d+\.xml$/, (xml, nom) =>
      remplirXml(xml, { espace: "a", valeurs: valeursSlide(p, Number(nom.match(/slide(\d+)\.xml$/)![1]), eleve) }), TYPE_PPTX),
}];

export const outil4VslTunnel: DefinitionOutil = {
  code: "liberty_vsl_tunnel",
  numero: 4,
  etape: "Étape 5",
  nom: "Scripts de la VSL et du tunnel",
  objectif: "Écrire votre VSL partie par partie, et tous les textes de votre tunnel.",
  fichier: "Liberty_Etape5_Scripts_VSL_tunnel",
  autresDocuments: AUTRES,
  ecrans: [
    {
      titre: "La VSL",
      intro: "Les 11 parties de votre VSL, avec leur durée et la phrase-modèle. Les parties 1, 2, 7 et 11 sont pré-remplies avec vos réponses des étapes 2, 3 et 4 : retouchez-les. Des phrases simples, du vocabulaire de tous les jours.",
      champs: [
        { cle: "vsl.p1", type: "long", libelle: libellePartie(1, "Appel de l'avatar", "0-5 s"), aide: PARTIES_VSL[0].modele, prerempli: pre.p1, exemple: "Si vous êtes un homme mince de plus de 25 ans et que vous n'arrivez pas à prendre du muscle…" },
        { cle: "vsl.p2", type: "long", libelle: libellePartie(2, "Votre offre", "5-15 s"), aide: PARTIES_VSL[1].modele, prerempli: pre.p2 },
        { cle: "garantie.texte", type: "long", lectureSeule: true, repris: "l'outil 3", libelle: libellePartie(3, "Votre garantie", "15-20 s"), aide: "Citée exactement comme dans votre contrat. Pas de formule plus forte que ce qui est écrit." },
        { cle: "vsl.explications", type: "liste", fixe: 3, libelle: libellePartie(4, "Développer la garantie", "20-30 s"), aide: "Ce qu'elle veut dire pour lui, en 3 phrases simples. Montrez le contrat à l'écran.", exemple: "Vous suivez la méthode, et si le résultat n'est pas là, vous êtes remboursé." },
        { cle: "vsl.p5", type: "long", libelle: libellePartie(5, "Reconnaître le scepticisme", "5 s"), aide: PARTIES_VSL[3].modele, exemple: "Je sais que ça peut sembler difficile à croire…" },
        { cle: "info.p6", type: "info", libelle: "", rendu: () => ({ ton: "rappel", titre: libellePartie(6, "Les preuves", "30-50 s"), texte: "Vos résultats clients se remplissent à l'écran suivant « Vos preuves »." }) },
        { cle: "vsl.p7", type: "long", libelle: libellePartie(7, "Premier appel à l'action", "60 s max"), aide: PARTIES_VSL[5].modele, prerempli: pre.p7 },
        { cle: "vsl.p8", type: "long", libelle: libellePartie(8, "Transition", "30 s"), aide: PARTIES_VSL[6].modele, exemple: "Je m'appelle Yasmine. Si vous n'y êtes pas encore arrivé, ce n'est pas votre faute." },
        { cle: "vsl.grandeVerite", type: "court", libelle: "La grande vérité (partie 8)", aide: "Ce qui l'empêche vraiment d'avancer, en une phrase.", exemple: "Personne ne vous a appris à manger pour votre morphologie." },
        { cle: "vsl.p9", type: "long", libelle: libellePartie(9, "Mécanisme unique", "2-4 min"), aide: PARTIES_VSL[7].modele, exemple: "Les programmes classiques sont faits pour des personnes qui prennent du poids facilement…" },
        {
          cle: "vsl.tentatives", type: "blocs", fixe: 3, nomBloc: "Tentative", libelle: "Ce qu'il a déjà essayé (partie 9)",
          aide: "Pour chaque tentative, pourquoi elle n'a pas marché.", repris: "l'outil 1",
          prerempli: (p) => (texte(p, "avatar.essaye") ? [{ tentative: texte(p, "avatar.essaye"), raison: texte(p, "mecanisme.pourquoiEchec") }] : []),
          colonnes: [
            { cle: "tentative", libelle: "La tentative", type: "court", exemple: "Des programmes trouvés sur Internet" },
            { cle: "raison", libelle: "Pourquoi ça n'a pas marché", type: "court", exemple: "Pensés pour ceux qui prennent du poids facilement" },
          ],
        },
        { cle: "info.mecanisme4", type: "info", libelle: "Votre grande idée (outil 2)", rendu: (p) => (grandeIdee(p) ? { ton: "rappel", texte: phraseMecanisme(p) } : null) },
        { cle: "vsl.p10", type: "long", libelle: libellePartie(10, "Nouveaux résultats", "30-60 s"), aide: PARTIES_VSL[8].modele },
        { cle: "vsl.p11", type: "long", libelle: libellePartie(11, "Dernier appel à l'action", "60 s"), aide: PARTIES_VSL[9].modele, prerempli: pre.p11 },
      ],
    },
    {
      titre: "Vos preuves",
      intro: "Uniquement des résultats réels, avec l'accord de vos clients.",
      champs: [
        { cle: "preuves.aucunClient", type: "cases", options: ["Je n'ai pas encore de clients"], libelle: "Pas encore de clients ?", aide: "Cochez si vous démarrez : vous remplacez la partie « preuves » par vos propres résultats, votre parcours et la démonstration de votre méthode. Vous tournerez une nouvelle version dès vos premiers témoignages." },
        {
          cle: "preuves.temoignages", type: "blocs", nomBloc: "Témoignage", ajout: "Ajouter un témoignage", initial: 3, visible: avecClients,
          libelle: "Vos témoignages", aide: "Les 3 premiers vont dans la partie 6, les suivants dans la partie 10.",
          colonnes: [
            { cle: "prenom", libelle: "Prénom", type: "court", exemple: "Karim" },
            { cle: "depart", libelle: "Situation de départ", type: "court", exemple: "62 kg, aucun muscle" },
            { cle: "resultat", libelle: "Résultat", type: "court", exemple: "+8 kg de muscle" },
            { cle: "delai", libelle: "Délai", type: "court", exemple: "90 jours" },
          ],
        },
        { cle: "preuves.mesResultats", type: "long", visible: sansClients, libelle: "Vos propres résultats", exemple: "J'ai pris 10 kg de muscle en 6 mois en appliquant cette méthode." },
        { cle: "preuves.monParcours", type: "long", visible: sansClients, libelle: "Votre parcours", exemple: "J'étais moi-même un homme mince qui n'arrivait pas à grossir." },
        { cle: "preuves.demonstration", type: "long", visible: sansClients, libelle: "La démonstration de votre méthode", exemple: "Je vous montre en vidéo une journée type de la méthode." },
      ],
    },
    {
      titre: "Le titre de la page",
      intro: "Au-dessus de votre vidéo, un titre et un sous-titre donnent envie de cliquer sur lecture. Sous la vidéo : un seul bouton de réservation, et le rappel de votre garantie.",
      champs: [
        { cle: "titre.formule", type: "choix", options: FORMULES_TITRE, libelle: "La formule du titre" },
        { cle: "titre.objection", type: "court", libelle: "L'objection principale", visible: (p) => texte(p, "titre.formule") === FORMULES_TITRE[0], repris: "l'outil 1", prerempli: (p) => texte(p, "avatar.objection"), exemple: "vous mangez déjà beaucoup" },
        { cle: "titre.situationActuelle", type: "court", libelle: "Sa situation actuelle", visible: (p) => texte(p, "titre.formule") === FORMULES_TITRE[1], exemple: "homme mince et complexé" },
        { cle: "titre.situationIdeale", type: "court", libelle: "Sa situation idéale", visible: (p) => texte(p, "titre.formule") === FORMULES_TITRE[1], exemple: "silhouette athlétique" },
        { cle: "vsl.titre", type: "long", libelle: "Le titre de votre page", proposition: titreAssemble, aide: "Partez de la formule, puis ajustez." },
        {
          cle: "vsl.sousTitre", type: "long", libelle: "Le sous-titre",
          prerempli: (p) => (resultat(p) ? `Regardez cette vidéo jusqu'au bout pour découvrir comment ${cible(p) || "[avatar]"} obtiennent ${resultat(p)} avec ${methode(p) || "[méthode]"}.` : ""),
          aide: "Pour qui c'est, et ce que la vidéo va montrer.",
        },
      ],
    },
    {
      titre: "La vidéo de remerciement",
      intro: "Elle s'affiche juste après la réservation : confirmer le rendez-vous et préparer un prospect sérieux. Les 5 temps sont pré-remplis : retouchez-les.",
      champs: [
        { cle: "merci.t1", type: "long", libelle: "1. Félicitations", prerempli: () => "Bonjour, c'est [votre prénom]. Félicitations !" },
        { cle: "merci.t2", type: "long", libelle: "2. Le but de l'appel", prerempli: (p) => `Le but de notre appel : vous expliquer comment atteindre ${resultat(p) || "[résultat]"} grâce à ${methode(p) || "[méthode]"}.` },
        { cle: "merci.t3", type: "long", libelle: "3. Les règles", prerempli: () => "Pour que cet appel vous soit utile : soyez à l'heure, dans un endroit calme, devant un ordinateur." },
        { cle: "merci.t4", type: "long", libelle: "4. La confirmation", prerempli: () => "Confirmez votre rendez-vous par message WhatsApp, au numéro indiqué dans le formulaire." },
        { cle: "merci.t5", type: "long", libelle: "5. Le mot de la fin", prerempli: () => "Vous venez de faire le premier pas. Bravo." },
      ],
    },
    {
      titre: "Vidéo avant l'appel et best-of",
      intro: "Envoyées après la confirmation : la vidéo de démonstration le prépare, le best-of lui montre vos résultats. Sans clients, vous ajouterez le best-of plus tard.",
      champs: [
        {
          cle: "avantAppel.script", type: "long", libelle: "Le script de la vidéo de démonstration",
          aide: "Puis : la question fondamentale de votre niche, pour qui est fait votre accompagnement, pourquoi ce n'est pas « une formation », les prérequis, le fait que vous donnez tous les raccourcis, et vos résultats.",
          prerempli: (p) => (resultat(p) ? `Est-ce que je peux vous aider à ${resultat(p)} dans les ${delai(p) || "[délai]"} prochains ?` : ""),
        },
        {
          cle: "bestof.intro", type: "long", libelle: "L'introduction du best-of",
          prerempli: (p) => (resultat(p) ? `Si vous regardez cette vidéo, c'est que vous avez confirmé votre appel. Regardez-la attentivement : vous allez découvrir les retours de ${cible(p) || "[avatar]"} qui étaient comme vous et qui ont atteint ${resultat(p)} grâce à ${methode(p) || "[méthode]"}.` : ""),
        },
        { cle: "liens.videoAvantAppel", type: "court", libelle: "Le lien de votre vidéo avant l'appel, une fois tournée", aide: "Il sera repris dans vos messages de setting (outil 8).", exemple: "https://…" },
      ],
    },
    {
      titre: "Réservation et rappels",
      intro: "Contre les absences : une confirmation immédiate par deux canaux, un rappel la veille, un rappel une heure avant. Des consignes fermes mais respectueuses.",
      apercu: true,
      champs: [
        {
          cle: "reservation.questions", type: "liste", fixe: 4, libelle: "Les 4 questions de votre formulaire",
          prerempli: () => ["Quelle est votre plus grosse difficulté ?", "Quel est votre objectif ?", "Qu'est-ce qui vous empêche de l'atteindre aujourd'hui ?", "Vous engagez-vous à être à l'heure ?"],
        },
        { cle: "rappels.confirmation", type: "long", libelle: "Message de confirmation (immédiat)", prerempli: () => "Votre appel est bien réservé. Pour bien le préparer, regardez la vidéo que je vous envoie ci-dessous. En cas d'imprévu, prévenez-moi au moins 24 h à l'avance." },
        { cle: "rappels.veille", type: "long", libelle: "Rappel la veille", prerempli: () => "Petit rappel : nous avons rendez-vous demain. Soyez à l'heure, dans un endroit calme, devant un ordinateur. À demain !" },
        { cle: "rappels.uneHeure", type: "long", libelle: "Rappel une heure avant", prerempli: () => "On se retrouve dans une heure pour notre appel. Je vous envoie le lien juste avant." },
      ],
    },
  ],
  document: (p: Profil) => ({
    titre: "Scripts de la VSL et du tunnel",
    sections: [
      {
        titre: "Votre page VSL",
        blocs: [
          { t: "phrase", libelle: "Titre", valeur: texte(p, "vsl.titre") },
          { t: "champ", libelle: "Sous-titre", valeur: texte(p, "vsl.sousTitre") },
          { t: "champ", libelle: "Sous la vidéo", valeur: garantieTexte(p) ? `Un seul bouton de réservation, et votre garantie : ${garantieTexte(p)}` : "" },
        ],
      },
      {
        titre: "Votre VSL",
        blocs: [
          { t: "champ", libelle: libellePartie(1, "Appel de l'avatar", "0-5 s"), valeur: texte(p, "vsl.p1") },
          { t: "champ", libelle: libellePartie(2, "Votre offre", "5-15 s"), valeur: texte(p, "vsl.p2") },
          { t: "champ", libelle: libellePartie(3, "Votre garantie", "15-20 s"), valeur: garantieTexte(p) },
          { t: "liste", libelle: libellePartie(4, "Développer la garantie", "20-30 s"), items: liste(p, "vsl.explications") },
          { t: "champ", libelle: libellePartie(5, "Reconnaître le scepticisme", "5 s"), valeur: texte(p, "vsl.p5") },
          sansClients(p)
            ? { t: "texte", texte: `${libellePartie(6, "Les preuves", "30-50 s")} : ${[texte(p, "preuves.mesResultats"), texte(p, "preuves.monParcours"), texte(p, "preuves.demonstration")].filter(Boolean).join(" ") || "à compléter"}` }
            : { t: "tableau", colonnes: ["Prénom", "Départ", "Résultat", "Délai"], lignes: temoignages(p).slice(0, 3).map((l) => [l.prenom ?? "", l.depart ?? "", l.resultat ?? "", l.delai ?? ""]) },
          { t: "champ", libelle: libellePartie(7, "Premier appel à l'action", "60 s max"), valeur: texte(p, "vsl.p7") },
          { t: "champ", libelle: libellePartie(8, "Transition", "30 s"), valeur: [texte(p, "vsl.p8"), texte(p, "vsl.grandeVerite") && `La vraie raison : ${texte(p, "vsl.grandeVerite")}`].filter(Boolean).join(" ") },
          { t: "champ", libelle: libellePartie(9, "Mécanisme unique", "2-4 min"), valeur: texte(p, "vsl.p9") },
          { t: "tableau", colonnes: ["Ce qu'il a essayé", "Pourquoi ça n'a pas marché"], lignes: lignes(p, "vsl.tentatives").filter(ligneRemplie).map((l) => [l.tentative ?? "", l.raison ?? ""]) },
          { t: "champ", libelle: libellePartie(10, "Nouveaux résultats", "30-60 s"), valeur: texte(p, "vsl.p10") },
          ...(avecClients(p) && temoignages(p).length > 3
            ? [{ t: "tableau" as const, colonnes: ["Prénom", "Départ", "Résultat", "Délai"], lignes: temoignages(p).slice(3).map((l) => [l.prenom ?? "", l.depart ?? "", l.resultat ?? "", l.delai ?? ""]) }]
            : []),
          { t: "champ", libelle: libellePartie(11, "Dernier appel à l'action", "60 s"), valeur: texte(p, "vsl.p11") },
        ],
      },
      {
        titre: "La vidéo de remerciement",
        blocs: [1, 2, 3, 4, 5].map((k) => ({ t: "champ" as const, libelle: `Temps ${k}`, valeur: texte(p, `merci.t${k}`) })),
      },
      {
        titre: "Vidéo avant l'appel et best-of",
        blocs: [
          { t: "champ", libelle: "Vidéo de démonstration", valeur: texte(p, "avantAppel.script") },
          { t: "champ", libelle: "Introduction du best-of", valeur: texte(p, "bestof.intro") },
          { t: "champ", libelle: "Lien de la vidéo avant l'appel", valeur: texte(p, "liens.videoAvantAppel") },
        ],
      },
      {
        titre: "Réservation et rappels",
        blocs: [
          { t: "liste", libelle: "Questions du formulaire", items: liste(p, "reservation.questions") },
          { t: "champ", libelle: "Confirmation", valeur: texte(p, "rappels.confirmation") },
          { t: "champ", libelle: "La veille", valeur: texte(p, "rappels.veille") },
          { t: "champ", libelle: "Une heure avant", valeur: texte(p, "rappels.uneHeure") },
        ],
      },
    ],
  }),
};
