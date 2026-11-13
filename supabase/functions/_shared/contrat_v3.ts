// ═══════════════════════════════════════════════════════════════════════════
// Contrats v3 (13/11/2026) : la source UNIQUE des textes du contrat, des cases
// à cocher et de l'attestation de renonciation.
//
// Utilisée à la fois par la page de paiement (aperçu du contrat pré-rempli et
// cases à cocher) et par le serveur (stripe-webhook, contrat-v3-envoyer) qui
// produit le PDF envoyé au client. Les deux lisent CE fichier : ce que le
// client accepte à l'écran et ce qu'il reçoit par e-mail ne peuvent pas diverger.
//
// Pourquoi une v3 (cahier des charges de Sidali du 12/11/2026) : l'ancien
// contrat vendait à la fois des contenus numériques et un service
// (l'accompagnement). La renonciation au délai de rétractation (art. L. 221-28,
// 13° du Code de la consommation) ne couvre que les contenus numériques : pour
// l'accompagnement, le client gardait 14 jours. Désormais :
//   • le contrat ne vend que l'accès au programme ; l'accompagnement et la
//     communauté sont offerts, hors prix ;
//   • la case de renonciation est obligatoire pour commander ;
//   • le paiement vaut signature (décision de Sidali du 12/11) : le contrat est
//     affiché pré-rempli sur la page de paiement, accepté par la case 1 et le
//     clic « Commander avec obligation de paiement » ; l'accès, la dette et la
//     renonciation démarrent au premier paiement ;
//   • plus de mot « formation », plus de garantie de chiffre d'affaires.
//
// Texte du Pass repris du modèle de Sidali, avec trois ajustements validés par
// Hassan le 13/11 pour coller au « paiement vaut signature » (art. 4 et 5,
// section de confirmation). Liberty et À la carte sont dérivés du Pass.
//
// Aucun import : ce fichier est lu tel quel par Deno (edge functions) et Vite.
// ═══════════════════════════════════════════════════════════════════════════

/** Version du modèle, enregistrée avec chaque contrat. */
export const VERSION_CONTRAT_V3 = "v3-2026-11-13";

/** Version des CGV acceptée avec ce modèle (date de mise en ligne des CGV v3). */
export const VERSION_CGV_V3 = "13/11/2026";

/** Le PDF daté des CGV v3, joint au contrat (annexe 2). */
export const PDF_CGV_V3 = "/cgv/cgv-2026-11-13.pdf";

export type OffreV3 = "pass" | "liberty" | "carte";

/** La formule des cases côté page de paiement → l'offre du contrat. */
export function offreDeFormule(formule: string | null | undefined): OffreV3 | null {
  const f = String(formule || "").toUpperCase();
  if (f === "PASS AL BARAKA") return "pass";
  if (f === "LIBERTY") return "liberty";
  if (f === "A LA CARTE") return "carte";
  return null;
}

const NOMS: Record<OffreV3, string> = {
  pass: "Pass AL BARAKA",
  liberty: "LIBERTY",
  carte: "", // remplacé par le nom du module
};

/** « Pass AL BARAKA », « LIBERTY », ou « module « CLOSING » ». */
export function nomProgramme(offre: OffreV3, module?: string | null): string {
  if (offre === "carte") return `module « ${nomModule(module)} »`;
  return NOMS[offre];
}

/** « Formation CLOSING » (ancien libellé du catalogue) → « CLOSING ». */
export function nomModule(module?: string | null): string {
  return String(module || "")
    .replace(/^\s*(formation|module)\s+/i, "")
    .trim() || "à la carte";
}

/** Préfixe du numéro de contrat : ALB-PASS-CTR-2026-11-0005. */
export function numeroContratV3(offre: OffreV3, numeroBase: string): string {
  const prefixe = offre === "pass" ? "ALB-PASS-" : offre === "liberty" ? "ALB-LIB-" : "ALB-ALC-";
  return numeroBase.startsWith("ALB-") ? numeroBase : prefixe + numeroBase;
}

// ─── Cases à cocher ─────────────────────────────────────────────────────────

export type IdCaseV3 =
  | "contrat_cgv"
  | "acces_immediat"
  | "contenu_duree"
  | "accompagnement_offert"
  | "paiement_integral"
  | "confidentialite";

export interface CaseV3 {
  id: IdCaseV3;
  /** Le texte, avec `{CGV}` à la place du lien « Conditions générales de vente ». */
  texte: string;
}

/**
 * Les cases, dans l'ordre du cahier des charges (6 pour le Pass et Liberty, 5
 * pour un module à la carte, qui n'a pas d'accompagnement offert). Toutes sont
 * obligatoires. La case 1 porte aussi l'acceptation du contrat : c'est elle, avec
 * le clic sur le bouton de commande, qui vaut signature.
 */
export function casesV3(offre: OffreV3, module?: string | null): CaseV3[] {
  const quoi = offre === "carte" ? "du module" : "du programme";
  const cases: CaseV3[] = [
    { id: "contrat_cgv", texte: "J'ai lu et j'accepte le contrat et les {CGV}." },
    {
      id: "acces_immediat",
      texte:
        `Je demande l'accès immédiat aux contenus numériques ${offre === "carte" ? "du " + nomProgramme(offre, module) : "du programme " + nomProgramme(offre)} ` +
        "et je reconnais perdre mon droit de rétractation dès l'activation de cet accès, conformément à l'article L. 221-28, 13° du Code de la consommation.",
    },
    { id: "contenu_duree", texte: `J'ai pris connaissance du contenu ${quoi} et de sa durée d'accès garantie de douze (12) mois.` },
    {
      id: "accompagnement_offert",
      texte: "J'ai compris que l'accompagnement et la communauté me sont offerts à titre gracieux et ne sont pas inclus dans le prix.",
    },
    { id: "paiement_integral", texte: "Je m'engage à régler l'intégralité du prix selon la modalité convenue." },
    { id: "confidentialite", texte: `Je m'engage à respecter la confidentialité des contenus ${quoi}.` },
  ];
  return offre === "carte" ? cases.filter((c) => c.id !== "accompagnement_offert") : cases;
}

/** Le texte d'une case tel qu'il figure dans le contrat et l'attestation. */
export function texteCase(c: CaseV3): string {
  return c.texte.replace("{CGV}", "Conditions générales de vente");
}

/** Vrai si le snapshot compact (`id:ISO|id:ISO`) est celui d'une commande v3. */
export function estCompactV3(compact: string | null | undefined): boolean {
  return /(^|\|)contrat_cgv:/.test(String(compact || ""));
}

/** `id:ISO|id:ISO` → { id: ISO }. Coupe au PREMIER « : » (l'heure ISO en contient). */
export function lireCompact(compact: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of String(compact || "").split("|")) {
    const sep = part.indexOf(":");
    if (sep > 0) out[part.slice(0, sep)] = part.slice(sep + 1);
  }
  return out;
}

// ─── Mise en forme ──────────────────────────────────────────────────────────

export function euros(n: number): string {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const [ent, dec] = v.toFixed(2).split(".");
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec} €`;
}

/** « 13/11/2026 » à partir d'une date ISO (jour civil, sans fuseau). */
export function dateFr(iso: string | null | undefined): string {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** « 13/11/2026 à 14:05:32 (heure de Paris, UTC+1) » — format 24 h, fuseau indiqué. */
export function dateHeureParis(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).formatToParts(d);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const decalage = p("timeZoneName").replace("GMT", "UTC") || "UTC";
  return `${p("day")}/${p("month")}/${p("year")} à ${p("hour")}:${p("minute")}:${p("second")} (heure de Paris, ${decalage})`;
}

/**
 * Les échéances telles que Stripe les prélève (même règle que le serveur de
 * paiement : la dernière absorbe les centimes d'arrondi).
 */
export function echeancesDe(totalEur: number, n: number): { base: number; derniere: number } {
  const total = Math.round(Number(totalEur || 0) * 100);
  const nb = Math.max(1, Math.floor(n || 1));
  const base = Math.floor(total / nb);
  return { base: base / 100, derniere: (total - base * (nb - 1)) / 100 };
}

/** La date du jour (AAAA-MM-JJ) à Paris. */
export function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// ─── Le contrat ─────────────────────────────────────────────────────────────

export interface CaseAcceptee {
  id: string;
  texte: string;
  coche_le: string | null;
}

export interface DonneesContratV3 {
  offre: OffreV3;
  /** Null dans l'aperçu de la page de paiement : le numéro est attribué au paiement. */
  numero: string | null;
  client: { nom: string; adresse: string; email: string; telephone: string };
  /** Prix total dû, en euros (après réduction). */
  prixTotal: number;
  /** Nom du tarif (« Tarif conférence »…), facultatif. */
  tarif?: string | null;
  /** Montant de la réduction en euros, facultatif. */
  reduction?: number | null;
  nbEcheances: number;
  montantEcheance: number;
  /** Montant de la dernière échéance quand il diffère (centimes d'arrondi). */
  montantDerniere?: number | null;
  /** Montant de la première échéance quand c'est elle qui absorbe les centimes (liens de paiement). */
  montantPremiere?: number | null;
  /** Date ISO (AAAA-MM-JJ) du premier paiement. */
  datePremierPaiement: string;
  module?: string | null;
  /** Rempli une fois la commande validée ; absent dans l'aperçu. */
  acceptation?: {
    cases: CaseAcceptee[];
    accepteLe: string | null;
    ip: string | null;
  } | null;
}

export type BlocV3 =
  | { type: "p"; texte: string; etiquette?: string }
  | { type: "li"; texte: string };

export interface ArticleV3 {
  titre: string;
  blocs: BlocV3[];
}

export interface ContratV3 {
  titre: string;
  numeroLigne: string;
  articles: ArticleV3[];
  /** Section finale : cases horodatées et acceptation électronique. */
  confirmation: { cases: { texte: string; coche_le: string }[]; lignes: string[] };
}

const VENDEUR =
  "Ethicarena L.L.C-FZ, société à responsabilité limitée immatriculée auprès de la Meydan Free Zone (Dubaï, Émirats Arabes Unis), licence n° 2422583.01, dont le siège social est situé au Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubai, U.A.E. (« le Vendeur »)";

const p = (texte: string, etiquette?: string): BlocV3 => (etiquette ? { type: "p", texte, etiquette } : { type: "p", texte });
const li = (texte: string): BlocV3 => ({ type: "li", texte });

function lignePrix(d: DonneesContratV3, quoi: string): string {
  const tarif = (d.tarif || "").trim();
  const reduction = Number(d.reduction || 0);
  let detail = "";
  if (tarif && reduction > 0) detail = ` (${tarif}, après réduction de ${euros(reduction)})`;
  else if (tarif) detail = ` (${tarif})`;
  else if (reduction > 0) detail = ` (après réduction de ${euros(reduction)})`;
  return `${quoi} est vendu au prix de ${euros(d.prixTotal)} TTC${detail}. Ce prix est identique quel que soit le mode de paiement choisi. La TVA n'est pas applicable (société établie en zone franche aux Émirats Arabes Unis).`;
}

function ligneModalite(d: DonneesContratV3): string {
  const date = dateFr(d.datePremierPaiement);
  if (d.nbEcheances <= 1) return `Paiement comptant de ${euros(d.prixTotal)}, le ${date}.`;
  const differe = (x: number | null | undefined) => x != null && Math.abs(Number(x) - Number(d.montantEcheance)) >= 0.005;
  const ecart = differe(d.montantPremiere)
    ? ` (première échéance : ${euros(Number(d.montantPremiere))})`
    : differe(d.montantDerniere)
      ? ` (dernière échéance : ${euros(Number(d.montantDerniere))})`
      : "";
  return `${d.nbEcheances} × ${euros(d.montantEcheance)}${ecart}. Premier paiement le ${date}, puis le même jour de chaque mois suivant.`;
}

/** Construit le contrat (titres, articles, confirmation) à partir des données. */
export function construireContratV3(d: DonneesContratV3): ContratV3 {
  const carte = d.offre === "carte";
  const nom = nomProgramme(d.offre, d.module);
  const nomMaj = carte ? `MODULE « ${nomModule(d.module).toUpperCase()} »` : `PROGRAMME ${nom.toUpperCase()}`;
  const leProgramme = carte ? `le ${nom}` : `le programme ${nom}`;
  const auProgramme = carte ? `au ${nom}` : `au programme ${nom}`;
  const accesAu = `L'accès ${auProgramme}`;
  const titre = `CONTRAT DE VENTE — ACCÈS AU ${nomMaj}`;
  const numeroLigne = d.numero ? `N° ${d.numero}` : "N° attribué à la validation de la commande";
  const c = d.client;
  const parties = `Entre ${VENDEUR} et ${c.nom || "[Prénom Nom]"}, résidant au ${c.adresse || "[adresse complète]"}, email : ${c.email || "[email]"}, téléphone : ${c.telephone || "[téléphone]"} (« le Client »).`;

  const articles: ArticleV3[] = [];
  let n = 0;
  const article = (t: string, blocs: BlocV3[]) => articles.push({ titre: `Article ${++n} – ${t}`, blocs });

  // Article 1 – Parties et objet
  article("Parties et objet", [
    p(parties),
    carte
      ? p(`Le présent contrat a pour seul objet la vente d'un accès au ${nom} de la plateforme en ligne AL BARAKA. Ce module est composé exclusivement de contenus numériques fournis sans support matériel. Son contenu est décrit à l'article 2.`)
      : p(`Le présent contrat a pour seul objet la vente d'un accès ${auProgramme}. Ce programme est composé exclusivement de contenus numériques fournis sans support matériel, sur la plateforme en ligne AL BARAKA. Son contenu est décrit à l'article 2.`),
    ...(carte ? [] : [p("L'accompagnement et la communauté mentionnés à l'article 3 sont offerts à titre gracieux. Ils ne font pas partie de l'objet de la vente.")]),
  ]);

  // Article 2 – Contenu et durée d'accès
  article(carte ? "Contenu du module et durée d'accès" : "Contenu du programme et durée d'accès", [
    p(`${accesAu} comprend :`),
    ...(carte
      ? [
          li(`les vidéos et contenus du ${nom} disponibles sur la plateforme ;`),
          li("les ressources téléchargeables : scripts, templates et documents mis à disposition dans le module ;"),
          li("les mises à jour et nouveautés du module publiées pendant la durée d'accès."),
        ]
      : [
          li(`les modules du programme ${nom} disponibles sur la plateforme ;`),
          li("les outils de la plateforme AL BARAKA, y compris les outils d'intelligence artificielle ;"),
          li("les ressources téléchargeables : scripts, templates et documents mis à disposition dans les modules ;"),
          li("les mises à jour et nouveautés des modules et outils publiées pendant la durée d'accès."),
        ]),
    p("L'accès est garanti pendant douze (12) mois à compter de son activation. Au-delà, le Vendeur maintient l'accès tant que la plateforme AL BARAKA est exploitée, sans que ce maintien constitue une obligation du présent contrat.", "Durée d'accès garantie."),
    p(`Si, pendant la durée garantie, ${carte ? "le module" : "le programme"} devient inaccessible plus de sept (7) jours consécutifs du fait du Vendeur, la durée d'accès garantie est prolongée d'une durée égale à la période d'interruption.`, "Garantie d'accès."),
    p(`${carte ? "Les contenus du module évoluent" : "Les modules et outils évoluent"} avec le temps : le Vendeur peut les mettre à jour, les enrichir ou les réorganiser, sans réduire la substance ${carte ? "du module" : "du programme"}.`),
  ]);

  // Article 3 – Accompagnement offert (Pass et Liberty seulement)
  if (!carte) {
    article("Accompagnement offert", [
      p("En plus de l'accès au programme, le Vendeur offre au Client, à titre gracieux, pendant douze (12) mois à compter de l'activation de l'accès :"),
      li(
        d.offre === "liberty"
          ? "la participation aux sessions d'accompagnement en groupe et aux sessions d'accompagnement premium organisées par le Vendeur ;"
          : "la participation aux sessions d'accompagnement en groupe organisées par le Vendeur ;",
      ),
      li("l'accès au groupe privé AL BARAKA Family ;"),
      li("la disponibilité des accompagnants sur sollicitation du Client."),
      p("Ces éléments sont un don du Vendeur. Ils ne sont pas inclus dans le prix et ne constituent pas une prestation due au titre du présent contrat. Leur format, leur fréquence et leur organisation peuvent évoluer."),
      p("Le Vendeur s'engage de bonne foi à les maintenir pendant toute cette période. Le fait que le Client ne les utilise pas, ou cesse de les utiliser, est sans effet sur le prix et sur ses obligations de paiement."),
    ]);
  }

  // Prix et paiement
  article("Prix et paiement", [
    p(lignePrix(d, accesAu), "Prix."),
    p(ligneModalite(d), "Modalité de paiement."),
    p("Le paiement en plusieurs fois n'est pas un abonnement. C'est une facilité accordée par le Vendeur, sans frais, sans intérêt et sans majoration. Le Client est redevable de la totalité du prix dès la validation de sa commande, qu'il se connecte ou non à la plateforme : la mise à disposition de l'accès suffit.", "Facilité de paiement."),
    p("Le Client qui prévoit une difficulté peut demander, avant la date d'une échéance, un ajustement de son échéancier. Le Vendeur étudie la demande de bonne foi. Un ajustement modifie les dates ou les montants des échéances, jamais le prix total.", "Difficulté de paiement."),
    p("En cas d'échéance impayée, une mise en demeure est adressée au Client par email. Si l'échéance n'est pas régularisée dans les quinze (15) jours suivant cette mise en demeure, le Vendeur peut :", "Échéance impayée."),
    li(carte ? "suspendre l'accès au module jusqu'à régularisation ;" : "suspendre l'accès au programme et aux éléments offerts à l'article 3 jusqu'à régularisation ;"),
    li("exiger le paiement immédiat du solde restant dû ;"),
    li("engager toute procédure amiable ou judiciaire de recouvrement."),
    p("Aucune pénalité, aucun intérêt de retard et aucun frais de recouvrement ne sont mis à la charge du Client."),
  ]);

  // Accès immédiat et droit de rétractation
  const quoiRetract = carte ? "au module" : "au programme";
  article("Accès immédiat et droit de rétractation", [
    p(`Le présent contrat est conclu à distance. Le droit de rétractation de quatorze (14) jours prévu pour ce type de contrat ne s'applique pas ${quoiRetract}, pour la raison exposée ci-dessous.`, "Principe."),
    p("Conformément à l'article L. 221-28, 13° du Code de la consommation, ce droit ne peut pas être exercé pour la fourniture de contenus numériques sans support matériel dont l'exécution a commencé après :", "Exception pour les contenus numériques."),
    li("l'accord préalable et exprès du Client ;"),
    li("sa renonciation expresse à son droit de rétractation."),
    p(`En cochant la case prévue à cet effet avant le paiement, le Client demande l'accès immédiat ${quoiRetract} et reconnaît perdre son droit de rétractation dès l'activation de cet accès. Cette case est obligatoire : aucune commande ne peut être validée sans elle. L'accès est activé dès la validation du premier paiement.`, "Demande d'accès immédiat."),
    p("Le présent contrat, transmis au Client par email dès la validation de sa commande, constitue la confirmation sur support durable de son accord et de sa renonciation.", "Confirmation."),
    p(
      carte
        ? "En conséquence, aucune rétractation ni aucun remboursement ne peut être demandé après l'activation de l'accès."
        : "En conséquence, aucune rétractation ni aucun remboursement ne peut être demandé après l'activation de l'accès. Les éléments offerts à l'article 3 n'étant pas inclus dans le prix, leur utilisation ou leur abandon est sans effet sur ce point.",
    ),
  ]);

  // Engagements et conditions générales
  article("Engagements et conditions générales", [
    p("Engagements du Vendeur :"),
    li(`fournir un accès fonctionnel et sécurisé ${auProgramme}, dans son intégralité, pendant la durée garantie ;`),
    li("respecter la garantie d'accès prévue à l'article 2 ;"),
    li("protéger les données personnelles du Client conformément au RGPD."),
    p("Engagements du Client :"),
    li("régler l'intégralité du prix selon la modalité convenue ;"),
    li(`garder confidentiels les contenus, stratégies et ressources ${carte ? "du module" : "du programme"} ;`),
    li(carte ? "ne pas reproduire, diffuser, partager ses identifiants ni revendre les contenus." : "ne pas reproduire, diffuser, partager ses identifiants ni revendre les contenus ;"),
    ...(carte ? [] : [li("respecter le règlement de la communauté AL BARAKA Family.")]),
    p(`Tous les contenus ${carte ? "du module" : "du programme"} (vidéos, scripts, documents, outils) sont la propriété exclusive d'Ethicarena L.L.C-FZ. Le Client bénéficie d'un droit d'utilisation personnel et non cessible.`, "Propriété intellectuelle."),
    p(
      carte
        ? "En cas de diffusion non autorisée des contenus, l'accès peut être suspendu ou supprimé. Le prix reste dû."
        : "En cas de diffusion non autorisée des contenus ou de comportement contraire au règlement de la communauté, l'accès peut être suspendu ou supprimé. Le prix reste dû.",
      "Règles de vie.",
    ),
    p(`Les données du Client sont traitées conformément au RGPD et utilisées uniquement pour la gestion de son accès et la communication liée ${carte ? "au module" : "au programme"}. Le Client exerce ses droits en écrivant à contact@ethicarena.com.`, "Données personnelles."),
    p("Le Vendeur n'est pas responsable d'une impossibilité temporaire d'accès résultant d'un événement échappant à son contrôle, au sens de l'article 1218 du Code civil (panne technique majeure, cyberattaque, catastrophe naturelle). Il rétablit l'accès dans les meilleurs délais.", "Force majeure."),
    p("Conformément au Règlement (CE) n° 593/2008 (Rome I), le présent contrat est soumis au droit français. En cas de litige, les parties recherchent une résolution amiable pendant trente (30) jours. À défaut d'accord, le litige est soumis aux tribunaux français compétents.", "Droit applicable et litiges."),
  ]);

  // Conformité de la vente
  article("Conformité de la vente", [
    p("Les parties entendent conclure une vente conforme aux règles islamiques des transactions. À cette fin :"),
    li("la vente est conclue par l'offre et l'acceptation des deux parties, matérialisées par l'acceptation du présent contrat par le Client et la validation de sa commande ;"),
    li(`l'objet vendu est déterminé : l'accès ${auProgramme} décrit à l'article 2, pour une durée garantie définie ;`),
    li("le prix est déterminé et connu dès la conclusion, et identique quel que soit le mode de paiement ;"),
    li("aucun intérêt, aucune majoration et aucune pénalité ne s'ajoutent au prix, y compris en cas de retard ;"),
    ...(carte ? [] : [li("les éléments de l'article 3 sont un don du Vendeur et non une contrepartie du prix ;")]),
    li("les sommes restant à payer constituent une dette du Client envers le Vendeur."),
    p("Chacune des parties s'engage devant Allah à respecter loyalement les termes du présent contrat."),
  ]);

  // Confirmation et acceptation électronique
  const acc = d.acceptation;
  const cases = casesV3(d.offre, d.module).map((cs) => {
    const coche = acc?.cases.find((x) => x.id === cs.id)?.coche_le ?? null;
    return { texte: texteCase(cs), coche_le: coche ? dateHeureParis(coche) : "" };
  });
  const lignes = acc
    ? [
        `Contrat accepté électroniquement par le Client, ${c.nom}, le ${dateHeureParis(acc.accepteLe)}, en cochant la case « J'ai lu et j'accepte le contrat et les Conditions générales de vente » puis en validant sa commande (bouton « Commander avec obligation de paiement »)${acc.ip ? `, depuis l'adresse IP ${acc.ip}` : ""}.`,
        `Pour Ethicarena L.L.C-FZ : contrat accepté électroniquement à la même date.`,
        `Conditions générales de vente acceptées : version du ${VERSION_CGV_V3}.`,
      ]
    : [
        "Le Client accepte le présent contrat en cochant la case « J'ai lu et j'accepte le contrat et les Conditions générales de vente », puis en validant sa commande : cette acceptation vaut signature électronique.",
        "Le contrat accepté, avec la date et l'heure de chaque case cochée, est envoyé au Client par email dès la validation de sa commande.",
      ];
  return { titre, numeroLigne, articles, confirmation: { cases, lignes } };
}

// ─── Du paiement au contrat (utilisé par stripe-webhook) ────────────────────

export interface CommandeV3 {
  offre: OffreV3;
  module?: string | null;
  numero: string;
  couponCode: string | null;
  amountTotal: number;
  discountAmount: number;
  /** Montants des échéances, en euros, dans l'ordre. */
  echeances: number[];
  firstPaymentDate: string;
  customer: { first_name: string; last_name: string; email: string; phone: string; address: string; postal_code: string; city: string; country: string };
  agreementsCompact: string;
  ip: string | null;
  /** Heure de repli si la case 1 n'a pas d'horodatage (ne devrait pas arriver). */
  maintenant: string;
}

/**
 * Les cases horodatées et les données du contrat accepté, à partir de la commande
 * (metadata Stripe) et de la preuve enregistrée au moment du paiement.
 */
export function contratDepuisCommande(c: CommandeV3): {
  cases: { id: IdCaseV3; text: string; checked: boolean; checked_at: string | null }[];
  accepteLe: string;
  donnees: DonneesContratV3;
} {
  const coches = lireCompact(c.agreementsCompact);
  const cases = casesV3(c.offre, c.module).map((x) => ({ id: x.id, text: texteCase(x), checked: !!coches[x.id], checked_at: coches[x.id] || null }));
  const accepteLe = coches.contrat_cgv || c.maintenant;
  const nom = `${c.customer.first_name} ${c.customer.last_name}`.trim();
  const ville = [c.customer.postal_code, c.customer.city].filter(Boolean).join(" ");
  const adresse = [c.customer.address, ville, c.customer.country].filter(Boolean).join(", ");
  const n = Math.max(1, c.echeances.length);
  const premiere = c.echeances[0] ?? c.amountTotal;
  const derniere = c.echeances[n - 1] ?? c.amountTotal;
  const courante = n > 2 ? c.echeances[1] : n === 2 ? Math.min(premiere, derniere) : premiere;
  const ecart = (x: number) => Math.abs(x - courante) >= 0.005;
  return {
    cases,
    accepteLe,
    donnees: {
      offre: c.offre,
      module: c.module ?? null,
      numero: c.numero,
      client: { nom, adresse, email: c.customer.email, telephone: c.customer.phone },
      prixTotal: c.amountTotal,
      tarif: c.couponCode ? `code ${c.couponCode}` : null,
      reduction: c.discountAmount > 0 ? c.discountAmount : null,
      nbEcheances: n,
      montantEcheance: n > 1 ? courante : c.amountTotal,
      montantPremiere: n > 1 && ecart(premiere) ? premiere : null,
      montantDerniere: n > 1 && ecart(derniere) ? derniere : null,
      datePremierPaiement: c.firstPaymentDate,
      acceptation: { cases: cases.map((x) => ({ id: x.id, texte: x.text, coche_le: x.checked_at })), accepteLe, ip: c.ip },
    },
  };
}

// ─── Annexe 1 : l'attestation de renonciation ───────────────────────────────

export interface DonneesAttestationV3 {
  offre: OffreV3;
  module?: string | null;
  numero: string;
  client: { nom: string; email: string };
  caseCocheeLe: string | null;
  ip: string | null;
  navigateur?: string | null;
  accesActiveLe: string | null;
  envoyeLe: string | null;
}

export function construireAttestationV3(a: DonneesAttestationV3): { titre: string; lignes: { etiquette?: string; texte: string }[] } {
  const caseAcces = casesV3(a.offre, a.module).find((x) => x.id === "acces_immediat")!;
  return {
    titre: "Annexe 1 – Attestation de demande d'accès immédiat et de renonciation au droit de rétractation",
    lignes: [
      { etiquette: "Client", texte: a.client.nom },
      { etiquette: "Email", texte: a.client.email },
      { etiquette: "Contrat", texte: `N° ${a.numero}` },
      { etiquette: "Offre", texte: a.offre === "carte" ? `Accès au ${nomProgramme(a.offre, a.module)}` : `Accès au programme ${nomProgramme(a.offre)}` },
      { etiquette: "Texte de la case cochée par le Client avant le paiement", texte: `« ${texteCase(caseAcces)} »` },
      { etiquette: "Case cochée le", texte: dateHeureParis(a.caseCocheeLe) || "—" },
      { etiquette: "Adresse IP", texte: a.ip || "—" },
      ...(a.navigateur ? [{ etiquette: "Navigateur", texte: a.navigateur }] : []),
      { etiquette: "Accès activé le", texte: dateHeureParis(a.accesActiveLe) || "—" },
      { etiquette: "Conditions générales de vente acceptées", texte: `version du ${VERSION_CGV_V3}` },
      {
        texte:
          "En cochant cette case, obligatoire pour commander, le Client a demandé l'accès immédiat aux contenus numériques achetés et reconnu perdre son droit de rétractation dès l'activation de cet accès, conformément à l'article L. 221-28, 13° du Code de la consommation. L'accès a été activé à la validation du premier paiement.",
      },
      {
        texte: `La présente attestation, jointe au contrat et aux Conditions générales de vente, a été transmise au Client par email${a.envoyeLe ? ` le ${dateHeureParis(a.envoyeLe)}` : ""}. Elle constitue la confirmation sur support durable de son accord et de sa renonciation.`,
      },
    ],
  };
}

// ─── L'e-mail ───────────────────────────────────────────────────────────────

export function objetEmailV3(offre: OffreV3, numero: string, module?: string | null): string {
  const quoi = offre === "pass" ? "Pass AL BARAKA" : offre === "liberty" ? "LIBERTY" : `module ${nomModule(module)}`;
  return `Ton contrat ${quoi} – N° ${numero}`;
}

/** La phrase de l'e-mail qui reprend l'accord (article 6.2 des CGV). */
export const PHRASE_ACCORD_EMAIL =
  "Tu as demandé l'accès immédiat aux contenus numériques que tu as achetés et reconnu perdre ton droit de rétractation dès l'activation de cet accès (article L. 221-28, 13° du Code de la consommation) : ton contrat accepté, l'attestation correspondante et nos Conditions générales de vente sont joints à ce message.";
