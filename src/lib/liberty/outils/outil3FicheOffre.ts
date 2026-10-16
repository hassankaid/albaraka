/**
 * Outil 3 — Fiche offre high-ticket (étape 4, après « Exemples d'offres validées »).
 * Objectif : réunir l'offre sur une page, rédiger la garantie et pré-remplir le contrat.
 * Reprend le nom de l'offre, la sous-niche, l'avatar, les promesses et la méthode
 * (outils 1 et 2). La garantie écrite ici est la garantie officielle : les autres
 * outils l'affichent en lecture seule. Aides et exemples : slides 92 à 102.
 *
 * Trois documents : la fiche offre (PDF / Word), l'annexe de garantie (Word) et le
 * contrat + CGV pré-rempli à partir du modèle de Sidali (Word modifiable).
 */
import {
  doc, lignes, ligneRemplie, liste, texte,
  type AutreDocument, type DefinitionOutil, type DocumentOutil, type Profil,
} from "./modele";
import { delai, etapesMethode, nomMethode, nomOffre, promesseSpecifique, resultat } from "./partage";
import { genererDocx } from "./docx";
import {
  remplirListeDocx, remplirXml, retirerIndicationsDocx, retirerParagrapheEtTableau, retirerParagrapheSiVide,
  transformerModele, TYPE_DOCX, type Valeurs,
} from "./modeles";

export const TYPES_GARANTIE = ["Remboursement", "Continuité", "Paiement au résultat"];
const FACILITES = ["Paiement en une fois", "Paiement en 3 fois", "Paiement en 6 fois", "Autre"];

export const devise = (p: Profil) => texte(p, "offre.devise") || "€";

/** « 3 200 € » à partir du prix saisi. */
export function montant(n: number, p: Profil): string {
  const arrondi = Math.round(n * 100) / 100;
  // espace simple : l'espace fine insécable de fr-FR n'existe pas dans la police du PDF
  const nombre = arrondi.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(arrondi) ? 0 : 2, maximumFractionDigits: 2 });
  return `${nombre.replace(/[\u202f\u00a0]/g, " ")} ${devise(p)}`;
}

export function prix(p: Profil): number | null {
  const n = Number(texte(p, "offre.prix").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Les échéances des facilités cochées : « En 3 fois : 3 × 1 066,67 € ». */
export function echeances(p: Profil): string[] {
  const total = prix(p);
  const choix = liste(p, "offre.facilites");
  if (!total) return [];
  return choix.map((f) =>
    f === "Paiement en une fois" ? `En une fois : ${montant(total, p)}`
      : f === "Paiement en 3 fois" ? `En 3 fois : 3 × ${montant(total / 3, p)}`
      : f === "Paiement en 6 fois" ? `En 6 fois : 6 × ${montant(total / 6, p)}`
      : `Autre : ${texte(p, "offre.facilitesAutre") || "à préciser"}`);
}

/** Le texte de départ de la garantie, selon le type choisi (modèle de Sidali). */
export function texteDepartGarantie(p: Profil): string {
  const r = texte(p, "garantie.resultat") || "[résultat garanti]";
  const d = texte(p, "garantie.delai") || "[délai garanti]";
  switch (texte(p, "garantie.type")) {
    case "Remboursement":
      return `Si vous appliquez la méthode et n'atteignez pas ${r} en ${d}, je vous rembourse ${texte(p, "garantie.montant") || "[montant ou part remboursée]"}.`;
    case "Continuité":
      return `Si vous n'atteignez pas ${r} en ${d}, je continue de vous accompagner gratuitement jusqu'à ce qu'il soit atteint.`;
    case "Paiement au résultat":
      return `Vous payez ${texte(p, "garantie.partMaintenant") || "[part payée maintenant]"} maintenant, et le reste (${texte(p, "garantie.partResultat") || "[part payée au résultat]"}) quand ${r} est atteint.`;
    default:
      return "";
  }
}

/** La garantie officielle, telle qu'écrite dans l'outil 3. */
export const garantie = (p: Profil) => texte(p, "garantie.texte");

const phases = (p: Profil) => lignes(p, "offre.phases").filter(ligneRemplie);
const bonus = (p: Profil) => lignes(p, "offre.bonus").filter(ligneRemplie);
const avecGroupe = (p: Profil) => texte(p, "offre.groupe") === "Oui";

function ficheOffre(p: Profil): DocumentOutil {
  return {
    titre: "Fiche offre high-ticket",
    sections: [
      {
        titre: "L'offre",
        blocs: [
          { t: "phrase", libelle: "Nom de l'offre", valeur: nomOffre(p) },
          doc.champ(p, "Sous-niche", "sousNiche.phrase"),
          doc.champ(p, "Avatar", "avatar.phrase"),
          doc.champ(p, "Promesse générale", "promesse.generale"),
          { t: "champ", libelle: "Promesse spécifique", valeur: promesseSpecifique(p) },
        ],
      },
      {
        titre: "Le format",
        blocs: [
          { t: "champ", libelle: "Durée", valeur: texte(p, "offre.dureeSemaines") ? `${texte(p, "offre.dureeSemaines")} semaines` : "" },
          { t: "champ", libelle: "Méthode", valeur: nomMethode(p) },
          { t: "tableau", colonnes: ["Phase", "Contenu", "Quand"], lignes: phases(p).map((l) => [l.nom ?? "", l.contenu ?? "", l.quand ?? ""]) },
          { t: "champ", libelle: "Appels", valeur: [texte(p, "offre.appelsFrequence"), texte(p, "offre.appelsDuree")].filter(Boolean).join(", ") },
          { t: "champ", libelle: "Messagerie", valeur: [texte(p, "offre.messagerieCanal"), texte(p, "offre.messagerieDelai") && `réponse sous ${texte(p, "offre.messagerieDelai")}`].filter(Boolean).join(", ") },
          doc.champ(p, "Documents fournis", "offre.documents"),
          { t: "champ", libelle: "Groupe", valeur: texte(p, "offre.groupe") ? (avecGroupe(p) ? `Oui${texte(p, "offre.groupeDescription") ? ` : ${texte(p, "offre.groupeDescription")}` : ""}` : "Non") : "" },
        ],
      },
      {
        titre: "Les bonus",
        blocs: [{ t: "tableau", colonnes: ["Bonus", "Objection réglée", "Description"], lignes: bonus(p).map((l) => [l.nom ?? "", l.objection ?? "", l.description ?? ""]) }],
      },
      {
        titre: "Le prix",
        blocs: [
          { t: "champ", libelle: "Prix", valeur: prix(p) ? montant(prix(p)!, p) : "" },
          { t: "liste", libelle: "Facilités de paiement", items: echeances(p) },
        ],
      },
      {
        titre: "La garantie",
        blocs: [
          { t: "phrase", libelle: `Garantie (${texte(p, "garantie.type") || "type à choisir"})`, valeur: garantie(p) },
          { t: "texte", texte: "À citer partout exactement comme écrite ici et dans votre contrat. Jamais reformulée, jamais embellie." },
        ],
      },
      { titre: "Raison d'agir maintenant", blocs: [doc.champ(p, "Ce qui est réel", "offre.urgence")] },
    ],
  };
}

function annexeGarantie(p: Profil): DocumentOutil {
  const email = texte(p, "prestataire.email") || "[e-mail professionnel]";
  return {
    titre: "Annexe — Conditions de la garantie",
    sections: [
      {
        titre: "1. La garantie",
        blocs: [
          { t: "phrase", valeur: garantie(p) },
          { t: "texte", texte: "Ce texte est celui que le Prestataire cite dans sa VSL, ses appels et ses publicités, mot pour mot." },
        ],
      },
      {
        titre: "2. Les variables",
        blocs: [{
          t: "tableau", colonnes: ["Variable", "Valeur"],
          lignes: [
            ["Public concerné", texte(p, "sousNiche.phrase")],
            ["Résultat garanti", texte(p, "garantie.resultat")],
            ["Preuve mesurable du résultat", texte(p, "garantie.preuve")],
            ["Délai", texte(p, "garantie.delai") ? `${texte(p, "garantie.delai")}, à compter de la date de début` : ""],
            ["Type de garantie", texte(p, "garantie.type")],
            ["Prix concerné", prix(p) ? montant(prix(p)!, p) : ""],
          ],
        }],
      },
      { titre: "3. Les actions exigées du Client", blocs: [{ t: "liste", libelle: "Pour pouvoir demander la garantie, le Client doit avoir", items: liste(p, "garantie.actions") }] },
      { titre: "4. Les preuves à fournir", blocs: [{ t: "liste", items: liste(p, "garantie.preuves") }] },
      {
        titre: "5. Comment demander la garantie",
        blocs: [{
          t: "texte",
          texte: `Le Client écrit à ${email} au plus tard ${texte(p, "contrat.delaiDemande") || "[délai]"} jours après la fin du délai garanti, avec les preuves listées au point 4. Le Prestataire répond sous 15 jours. Si les conditions sont remplies, la garantie s'applique dans les ${texte(p, "contrat.delaiApplication") || "[délai]"} jours.`,
        }],
      },
    ],
  };
}

const sansPoint = (t: string) => t.trim().replace(/[.]+$/, "");

/** Les valeurs des champs « » du modèle de contrat de Sidali. */
export function valeursContrat(p: Profil): Valeurs {
  const total = prix(p);
  const groupe = texte(p, "offre.groupe");
  return {
    "NOM DE L'OFFRE": nomOffre(p),
    // le modèle met déjà le point final après ces deux phrases
    "PROMESSE SPÉCIFIQUE": sansPoint(promesseSpecifique(p)),
    "SOUS-NICHE EN UNE PHRASE": sansPoint(texte(p, "sousNiche.phrase")),
    "NOM OU RAISON SOCIALE DU PRESTATAIRE": texte(p, "prestataire.nom"),
    "STATUT JURIDIQUE": texte(p, "prestataire.statut"),
    "ADRESSE DU PRESTATAIRE": texte(p, "prestataire.adresse"),
    PAYS: texte(p, "prestataire.pays"),
    "NUMÉRO D'ENTREPRISE": texte(p, "prestataire.numero"),
    "E-MAIL PROFESSIONNEL": texte(p, "prestataire.email"),
    "DURÉE EN SEMAINES": texte(p, "offre.dureeSemaines"),
    "NOM DE LA MÉTHODE": nomMethode(p),
    "NOMBRE DE PHASES": phases(p).length ? String(phases(p).length) : "",
    "FRÉQUENCE DES APPELS": texte(p, "offre.appelsFrequence"),
    "DURÉE DES APPELS": texte(p, "offre.appelsDuree"),
    "CANAL DE MESSAGERIE": texte(p, "offre.messagerieCanal"),
    "DÉLAI DE RÉPONSE": texte(p, "offre.messagerieDelai"),
    "DOCUMENTS FOURNIS": texte(p, "offre.documents"),
    "ACCÈS AU GROUPE : OUI / NON — DESCRIPTION": groupe
      ? avecGroupe(p) ? `un accès au groupe des clients${texte(p, "offre.groupeDescription") ? ` : ${texte(p, "offre.groupeDescription")}` : ""}` : "pas d'accès à un groupe"
      : "",
    PRIX: total ? montant(total, p).replace(` ${devise(p)}`, "") : "",
    DEVISE: total ? devise(p) : texte(p, "offre.devise"),
    "MENTION TVA": texte(p, "contrat.mentionTva"),
    "ÉCHÉANCE 3 FOIS": total ? montant(total / 3, p) : "",
    "ÉCHÉANCE 6 FOIS": total ? montant(total / 6, p) : "",
    "MOYEN DE PAIEMENT": texte(p, "contrat.moyenPaiement"),
    "DÉLAI DE MISE EN DEMEURE": texte(p, "contrat.delaiDemeure"),
    "DROIT APPLICABLE": texte(p, "contrat.droit"),
    "TEXTE EXACT DE LA GARANTIE": garantie(p),
    "RÉSULTAT GARANTI": texte(p, "garantie.resultat"),
    "PREUVE MESURABLE": texte(p, "garantie.preuve"),
    "DÉLAI GARANTI": texte(p, "garantie.delai"),
    "TYPE DE GARANTIE": texte(p, "garantie.type"),
    "DÉLAI DE DEMANDE": texte(p, "contrat.delaiDemande"),
    "DÉLAI D'APPLICATION": texte(p, "contrat.delaiApplication"),
  };
}

/** Le contrat + CGV + annexe du modèle de Sidali, rempli (XML du corps, exposé pour les tests). */
export function remplirContratXml(xml: string, p: Profil): string {
  let x = retirerParagrapheEtTableau(xml, "L'outil propose un texte de départ");
  x = remplirListeDocx(x, [1, 2, 3].map((i) => `PHASE ${i} : NOM ET CONTENU`),
    phases(p).map((l) => [l.nom, l.contenu].map((v) => (v ?? "").trim()).filter(Boolean).join(" : ")));
  x = remplirListeDocx(x, [1, 2, 3].map((i) => `BONUS ${i} : NOM ET DESCRIPTION`),
    bonus(p).map((l) => [l.nom, l.description].map((v) => (v ?? "").trim()).filter(Boolean).join(" : ")));
  if (bonus(p).length) x = retirerParagrapheSiVide(x, "BONUS 3 : NOM ET DESCRIPTION");
  x = remplirListeDocx(x, [1, 2, 3, 4].map((i) => `ACTION EXIGÉE ${i}`), liste(p, "garantie.actions"));
  x = remplirListeDocx(x, [1, 2, 3].map((i) => `PREUVE À FOURNIR ${i}`), liste(p, "garantie.preuves"));
  x = remplirXml(x, { espace: "w", valeurs: valeursContrat(p), couleur: { doree: "B8963E", texte: "1F1F1F" } });
  return retirerIndicationsDocx(x);
}

const AUTRES: AutreDocument[] = [
  {
    libelle: "Annexe de garantie",
    format: "docx",
    fichier: "Liberty_Etape4_Annexe_garantie",
    generer: (p, eleve) => genererDocx(annexeGarantie(p), { def: outil3FicheOffre, eleve, date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) }),
  },
  {
    libelle: "Contrat + CGV",
    format: "docx",
    fichier: "Liberty_Etape4_Contrat_CGV",
    generer: async (p, _eleve, modele) =>
      transformerModele(await modele("contrat"), /^word\/document\.xml$/, (xml) => remplirContratXml(xml, p), TYPE_DOCX),
  },
];

export const outil3FicheOffre: DefinitionOutil = {
  code: "liberty_fiche_offre",
  numero: 3,
  etape: "Étape 4",
  nom: "Fiche offre high-ticket",
  objectif: "Réunir votre offre sur une page, rédiger votre garantie et pré-remplir votre contrat.",
  fichier: "Liberty_Etape4_Fiche_offre",
  autresDocuments: AUTRES,
  ecrans: [
    {
      titre: "Le format",
      intro: "Votre offre high-ticket est un accompagnement personnalisé. Décrivez-le phase par phase, en suivant votre méthode.",
      champs: [
        { cle: "info.rappelOffre", type: "info", libelle: "Votre offre", rendu: (p) => ({ ton: "rappel", texte: [nomOffre(p) || "Nom de l'offre : à compléter (outil 2)", promesseSpecifique(p)].filter(Boolean).join("\n") }) },
        { cle: "offre.dureeSemaines", type: "nombre", unite: "semaines", libelle: "Durée de l'accompagnement", exemple: "12" },
        {
          cle: "offre.phases", type: "blocs", nomBloc: "Phase", ajout: "Ajouter une phase", initial: 3, max: 6, repris: "votre méthode (outil 2)",
          libelle: "Le déroulé, phase par phase",
          aide: "Proposé à partir des étapes de votre méthode : retouchez-le librement.",
          prerempli: (p) => etapesMethode(p).map((e) => ({ nom: e.nom, contenu: e.micro })),
          colonnes: [
            { cle: "nom", libelle: "La phase", type: "court", exemple: "Phase 1 : mental et identité" },
            { cle: "quand", libelle: "Quand", type: "court", exemple: "Semaines 1 à 4" },
            { cle: "contenu", libelle: "Ce que l'on fait", type: "long", exemple: "Définir l'objectif, poser les routines, lever les blocages." },
          ],
        },
        { cle: "offre.appelsFrequence", type: "court", libelle: "Fréquence des appels individuels", exemple: "1 appel par semaine" },
        { cle: "offre.appelsDuree", type: "court", libelle: "Durée d'un appel", exemple: "45 minutes" },
        { cle: "offre.messagerieCanal", type: "court", libelle: "Messagerie entre les appels", exemple: "WhatsApp" },
        { cle: "offre.messagerieDelai", type: "court", libelle: "Délai de réponse annoncé", exemple: "24 heures" },
        { cle: "offre.documents", type: "long", libelle: "Documents, modèles et outils fournis", aide: "Ceux qui règlent les problèmes de votre liste (outil 2).", exemple: "Programme d'entraînement, plan nutrition, recettes en 15 minutes." },
        { cle: "offre.groupe", type: "choix", options: ["Oui", "Non"], libelle: "Un groupe avec les autres clients ?" },
        { cle: "offre.groupeDescription", type: "court", libelle: "Le groupe", visible: avecGroupe, exemple: "Un groupe WhatsApp d'entraide entre clients" },
      ],
    },
    {
      titre: "Les bonus",
      intro: "2 ou 3 bonus maximum. Chacun a un nom, et répond à une objection précise ou fait gagner du temps. L'erreur à éviter : empiler des bonus sans lien avec le résultat.",
      champs: [
        {
          cle: "offre.bonus", type: "blocs", nomBloc: "Bonus", ajout: "Ajouter un bonus", initial: 2, max: 3,
          libelle: "Vos bonus",
          colonnes: [
            { cle: "nom", libelle: "Nom du bonus", type: "court", exemple: "Menus express" },
            { cle: "objection", libelle: "L'objection qu'il règle", type: "court", exemple: "« Je n'ai pas le temps »" },
            { cle: "description", libelle: "Ce qu'il contient", type: "long", exemple: "Des menus prêts en 15 minutes pour toute la semaine." },
          ],
        },
      ],
    },
    {
      titre: "Le prix",
      intro: "Fixé selon la valeur du résultat, pas selon le nombre d'heures. Ne baissez jamais votre prix face à une résistance : ajoutez de la valeur.",
      champs: [
        { cle: "offre.prix", type: "nombre", libelle: "Votre prix", exemple: "3200" },
        { cle: "offre.devise", type: "choix", options: ["€", "$", "CHF", "£"], libelle: "Devise" },
        { cle: "offre.facilites", type: "cases", options: FACILITES, libelle: "Facilités de paiement proposées", aide: "Même prix, plus accessible." },
        { cle: "offre.facilitesAutre", type: "court", libelle: "Autre facilité", visible: (p) => liste(p, "offre.facilites").includes("Autre"), exemple: "En 4 fois" },
        { cle: "info.echeances", type: "info", libelle: "Vos échéances", rendu: (p) => (echeances(p).length ? { ton: "rappel", texte: echeances(p).join("\n") } : null) },
      ],
    },
    {
      titre: "La garantie",
      intro: "La garantie enlève le risque de la tête de votre prospect. Elle porte sur un résultat précis, mesurable, dans un délai donné, avec des conditions claires.",
      champs: [
        { cle: "garantie.type", type: "choix", options: TYPES_GARANTIE, libelle: "Type de garantie" },
        { cle: "garantie.resultat", type: "court", libelle: "Le résultat garanti", repris: "votre promesse (outil 2)", prerempli: resultat, exemple: "prendre 7 kg de muscle" },
        { cle: "garantie.preuve", type: "court", libelle: "La preuve mesurable du résultat", exemple: "pesée et mensurations au début et à la fin" },
        { cle: "garantie.delai", type: "court", libelle: "Le délai", repris: "votre promesse (outil 2)", prerempli: delai, exemple: "90 jours" },
        { cle: "garantie.montant", type: "court", libelle: "Ce que vous remboursez", visible: (p) => texte(p, "garantie.type") === "Remboursement", exemple: "l'intégralité du prix payé" },
        { cle: "garantie.partMaintenant", type: "court", libelle: "Part payée maintenant", visible: (p) => texte(p, "garantie.type") === "Paiement au résultat", exemple: "1 500 €" },
        { cle: "garantie.partResultat", type: "court", libelle: "Part payée au résultat", visible: (p) => texte(p, "garantie.type") === "Paiement au résultat", exemple: "1 700 €" },
        { cle: "garantie.actions", type: "liste", ajout: "Ajouter une action", libelle: "Les actions exigées du client", aide: "Le résultat est l'effet d'une cause : ce que votre client doit faire pour avoir droit à la garantie.", exemple: "Assister à au moins 90 % des appels" },
        { cle: "garantie.preuves", type: "liste", ajout: "Ajouter une preuve", libelle: "Les preuves à fournir", aide: "Ce que le client devra montrer pour demander la garantie.", exemple: "Les captures de ses séances" },
        {
          cle: "garantie.texte", type: "long", libelle: "Votre garantie officielle",
          aide: "C'est elle qui sera reprise partout (VSL, appels, contrat), mot pour mot. Partez du texte proposé, puis ajustez-le.",
          proposition: texteDepartGarantie,
        },
      ],
    },
    {
      titre: "Raison d'agir maintenant",
      intro: "Facultatif : places limitées par votre temps, bonus qui expire vraiment.",
      champs: [
        { cle: "info.urgence", type: "info", libelle: "", rendu: () => ({ ton: "alerte", titre: "Uniquement si c'est réel", texte: "Pas de réduction « si vous décidez pendant l'appel » : c'est une fausse urgence." }) },
        { cle: "offre.urgence", type: "long", libelle: "Votre raison d'agir maintenant", exemple: "Je n'accompagne que 5 clients à la fois." },
      ],
    },
    {
      titre: "Le contrat",
      intro: "L'outil remplit le modèle de contrat, les conditions générales de vente et l'annexe de garantie à partir de votre fiche. Les informations propres à chaque client (nom, adresse, dates) restent à compléter dans le Word, client par client.",
      apercu: true,
      champs: [
        { cle: "prestataire.nom", type: "court", libelle: "Nom ou raison sociale", exemple: "Yasmine Benali" },
        { cle: "prestataire.statut", type: "court", libelle: "Statut juridique", exemple: "Micro-entreprise" },
        { cle: "prestataire.adresse", type: "court", libelle: "Adresse", exemple: "12 rue des Lilas, 69003 Lyon" },
        { cle: "prestataire.pays", type: "court", libelle: "Pays", exemple: "France" },
        { cle: "prestataire.email", type: "court", libelle: "E-mail professionnel", exemple: "contact@monoffre.com" },
        { cle: "prestataire.numero", type: "court", libelle: "Numéro d'entreprise", aide: "Si vous en avez un (SIRET en France).", exemple: "123 456 789 00012" },
        { cle: "contrat.mentionTva", type: "court", libelle: "Mention TVA", aide: "Par exemple « TTC », ou « TVA non applicable, article 293 B du CGI » pour une micro-entreprise en France.", exemple: "TVA non applicable, article 293 B du CGI" },
        { cle: "contrat.moyenPaiement", type: "court", libelle: "Moyen de paiement", exemple: "carte bancaire ou virement" },
        { cle: "contrat.droit", type: "court", libelle: "Droit applicable", prerempli: () => "français", exemple: "français" },
        { cle: "contrat.delaiDemeure", type: "nombre", unite: "jours", libelle: "Délai après une relance de paiement restée sans effet", exemple: "15" },
        { cle: "contrat.delaiDemande", type: "nombre", unite: "jours", libelle: "Délai pour demander la garantie, après la fin du délai garanti", exemple: "30" },
        { cle: "contrat.delaiApplication", type: "nombre", unite: "jours", libelle: "Délai pour appliquer la garantie", exemple: "30" },
        {
          cle: "info.droit", type: "info", libelle: "",
          rendu: () => ({ ton: "alerte", titre: "Important", texte: "Ce modèle est basé sur le droit français. Faites-le relire par Claude pour l'adapter à votre pays et à celui de vos clients. Vous pouvez aussi le faire valider par un juriste, mais ce n'est pas une obligation." }),
        },
      ],
    },
  ],
  document: ficheOffre,
};
