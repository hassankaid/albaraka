/**
 * Outil 10 — Mon template webinaire (étape 19, après « L'après et les chiffres »).
 * Objectif : générer le PowerPoint du webinaire (103 slides) déjà personnalisé, à
 * partir de Template_Webinaire_Liberty.pptx (table liberty_modeles, code
 * « webinaire »). Un champ par élément « » du modèle, regroupés par partie avec
 * les numéros de slides (webinaireChamps.ts). Règles du cahier des charges :
 * - un champ répété (« NOM PROGRAMME » : 112 fois) se remplit une fois ;
 * - la mise en forme est gardée, les champs remplis passent du doré à la couleur
 *   du texte qui les entoure ; les exemples gris « Ex: ‹…› » sont retirés ;
 * - VALEUR TOTALE = somme des valeurs des étapes 1 à 6 ; PRIX FINAL = PRIX × (1 −
 *   RÉDUCTION) ; ÉCONOMIE = PRIX − PRIX FINAL + VALEUR BONUS (formule confirmée par
 *   Sidali, décision 3A). Montants modifiables ;
 * - les slides des étapes 7 à 9 restées vides sont retirées ;
 * - pré-remplis : prénom et nom, méthode, avatar, promesse, délai, étapes, prix, bonus.
 * Les photos ne sont pas gérées : l'élève les ajoute après la génération.
 */
import JSZip from "jszip";
import { lignes, texte, type AutreDocument, type Champ, type DefinitionOutil, type Ecran, type Profil, type SectionDoc } from "./modele";
import { remplirXml, retirerSlidesPptx, TYPE_PPTX, type Valeurs } from "./modeles";
import { devise, garantie, montant } from "./outil3FicheOffre";
import { cible, delai, etapesMethode, nomMethode, resultat } from "./partage";
import { CHAMPS_WEBINAIRE, PARTIES_WEBINAIRE, type ChampWebinaire } from "./webinaireChamps";

const cleDe = (nom: string) => CHAMPS_WEBINAIRE.find((c) => c[0] === nom)?.[1] ?? "";

/** Le texte d'un élément : saisi, sinon repris des outils précédents (même si l'écran n'a pas été ouvert). */
function saisi(p: Profil, nom: string): string {
  return texte(p, cleDe(nom)) || (prerempli(nom)?.(p) ?? "").trim();
}

/** Un nombre saisi (« 1 497 », « 1497,50 »), ou null. */
function nombre(p: Profil, nom: string): number | null {
  const v = saisi(p, nom).replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const MONTANTS = new Set(["PRIX", "VALEUR BONUS", ...[1, 2, 3, 4, 5, 6].map((k) => `VALEUR ÉTAPE ${k} €`)]);
const NOMBRES = new Set([...MONTANTS, "RÉDUCTION %", "X CLIENTS", "N"]);
const LONGS = /DESCRIPTION|CITATION|VÉRITÉ|PIVOT|CONSTAT|CONSÉQUENCE|PREUVE|QUESTION/;

/** Le nombre d'étapes renseignées (pour « LA MÉTHODE EN N ÉTAPES »). */
function nombreEtapes(p: Profil): number {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => saisi(p, `NOM ÉTAPE ${k}`)).length;
}

/** Les calculs du cahier des charges, à partir des montants saisis. */
export function calculsWebinaire(p: Profil) {
  const valeurs = [1, 2, 3, 4, 5, 6].map((k) => nombre(p, `VALEUR ÉTAPE ${k} €`));
  const total = valeurs.some((v) => v !== null) ? valeurs.reduce<number>((s, v) => s + (v ?? 0), 0) : null;
  const prixDeBase = nombre(p, "PRIX");
  const reduction = nombre(p, "RÉDUCTION %");
  const prixFinal = prixDeBase !== null ? prixDeBase * (1 - (reduction ?? 0) / 100) : null;
  const economie = prixDeBase !== null && prixFinal !== null ? prixDeBase - prixFinal + (nombre(p, "VALEUR BONUS") ?? 0) : null;
  return { total, prixFinal, economie };
}

/** La valeur de chaque champ « » du modèle, telle qu'elle s'écrit dans le PowerPoint. */
export function valeursWebinaire(p: Profil, eleve: string): Valeurs {
  const v: Valeurs = {};
  for (const [nom] of CHAMPS_WEBINAIRE) {
    const brut = saisi(p, nom);
    if (MONTANTS.has(nom)) {
      const n = nombre(p, nom);
      v[nom] = n !== null ? montant(n, p) : "";
    } else if (nom === "RÉDUCTION %") {
      const n = nombre(p, nom);
      v[nom] = n !== null ? `${n.toLocaleString("fr-FR")} %` : "";
    } else v[nom] = brut;
  }
  const { total, prixFinal, economie } = calculsWebinaire(p);
  v["VALEUR TOTALE €"] ||= total !== null ? montant(total, p) : "";
  v["PRIX FINAL"] ||= prixFinal !== null ? montant(prixFinal, p) : "";
  v["ÉCONOMIE €"] ||= economie !== null ? montant(economie, p) : "";
  v["N"] ||= nombreEtapes(p) ? String(nombreEtapes(p)) : "";
  v["VOTRE PRÉNOM NOM"] ||= eleve;
  v["CONTENU PASS L4"] = garantie(p);
  return v;
}

/** Les slides des étapes 7 à 9 (slides 70 à 72), retirées si l'étape reste vide. */
export function slidesARetirer(p: Profil): number[] {
  return [7, 8, 9].filter((k) => !saisi(p, `NOM ÉTAPE ${k}`) && !saisi(p, `DESCRIPTION ÉTAPE ${k}`)).map((k) => 63 + k);
}

/** Une slide : retire les exemples gris, puis remplit chaque paragraphe en gardant la couleur du texte voisin. */
export function remplirSlideWebinaire(xml: string, valeurs: Valeurs): string {
  const sansExemples = xml.replace(/<a:r>(?:(?!<\/a:r>)[\s\S])*?<a:t(?: [^>]*)?>\s*Ex: ‹[^<]*›\s*<\/a:t><\/a:r>/g, "");
  return sansExemples.replace(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*<\/p:sp>/g, (forme) => {
    const couleurForme = couleurVoisine(forme);
    return forme.replace(/<a:p>(?:(?!<\/a:p>)[\s\S])*<\/a:p>/g, (para) =>
      remplirXml(para, { espace: "a", valeurs, couleur: { doree: "FFD700", texte: couleurVoisine(para) ?? couleurForme ?? "FFFFFF" } }));
  });
}

/** La couleur du premier morceau de texte qui n'est pas un champ. */
function couleurVoisine(xml: string): string | null {
  for (const r of xml.match(/<a:r>(?:(?!<\/a:r>)[\s\S])*<\/a:r>/g) ?? []) {
    const t = (r.match(/<a:t(?: [^>]*)?>([^<]*)<\/a:t>/) ?? [])[1] ?? "";
    if (!t.trim() || /«[^«»]+»/.test(t)) continue;
    const c = r.match(/srgbClr val="([0-9A-Fa-f]{6})"/)?.[1];
    if (c && c.toUpperCase() !== "FFD700") return c;
  }
  return null;
}

// ── Les écrans ────────────────────────────────────────────────────────────

function lisible(nom: string): string {
  const t = nom.charAt(0) + nom.slice(1).toLowerCase();
  return t.replace(" a ou b ?", " A ou B ?");
}

function prerempli(nom: string): ((p: Profil) => string) | undefined {
  const etape = nom.match(/^(NOM|DESCRIPTION) ÉTAPE (\d)$/);
  if (etape) {
    const k = Number(etape[2]) - 1;
    return (p) => (etape[1] === "NOM" ? etapesMethode(p)[k]?.nom : etapesMethode(p)[k]?.micro) ?? "";
  }
  const bonus = (p: Profil) => lignes(p, "offre.bonus")[0] ?? {};
  switch (nom) {
    case "NOM DE VOTRE MÉTHODE": return (p) => (nomMethode(p) ? `la méthode ${nomMethode(p)}` : "");
    case "AVATAR CIBLE": return cible;
    case "PROMESSE PRINCIPALE": return (p) => (resultat(p) ? resultat(p).charAt(0).toUpperCase() + resultat(p).slice(1) : "");
    case "DÉLAI + GARANTIE": return (p) => (delai(p) ? `En ${delai(p)}${garantie(p) ? ", avec garantie" : ""}` : "");
    case "PRIX": return (p) => texte(p, "offre.prix");
    case "NOM BONUS": return (p) => (bonus(p).nom ?? "").trim();
    case "DESCRIPTION BONUS": return (p) => (bonus(p).description ?? "").trim();
    default: return undefined;
  }
}

function champ([nom, cle, , ou, fois, aide, exemple]: ChampWebinaire): Champ {
  const libelle = `${lisible(nom)} · ${ou}${fois > 1 ? `, ${fois} fois` : ""}`;
  if (nom === "CONTENU PASS L4") return { cle: "garantie.texte", type: "long", lectureSeule: true, repris: "l'outil 3", libelle, aide };
  const base = { cle, libelle, aide, exemple: exemple || undefined, prerempli: prerempli(nom) };
  if (nom === "VALEUR TOTALE €" || nom === "PRIX FINAL" || nom === "ÉCONOMIE €") {
    const calcul = { "VALEUR TOTALE €": "total", "PRIX FINAL": "prixFinal", "ÉCONOMIE €": "economie" }[nom] as "total" | "prixFinal" | "economie";
    return {
      ...base, type: "court",
      aide: `${aide} Laissez vide pour garder le calcul, ou écrivez votre montant.`,
      proposition: (p) => {
        const n = calculsWebinaire(p)[calcul];
        return n !== null ? montant(n, p) : "";
      },
    };
  }
  if (NOMBRES.has(nom)) return { ...base, type: "nombre", unite: nom === "RÉDUCTION %" ? "%" : undefined };
  return { ...base, type: LONGS.test(nom) ? "long" : "court" };
}

const ecrans: Ecran[] = PARTIES_WEBINAIRE.map((titre, k) => ({
  titre,
  champs: [
    ...(k === 0
      ? [{
          cle: "info.webinaire", type: "info" as const, libelle: "",
          rendu: () => ({
            ton: "rappel" as const, titre: "Comment ça marche",
            texte: "Chaque champ correspond à un élément « » du template. Remplissez-le une fois : il est remplacé sur toutes les slides où il apparaît. Vos réponses des étapes 2, 3 et 4 sont déjà reprises. Le guide du template, sous la vidéo, donne des exemples dans 4 marchés et un prompt pour préparer vos textes avec Claude. Uniquement de vrais chiffres et de vrais témoignages.",
          }),
        }]
      : []),
    ...(k === 7
      ? [{
          cle: "info.webinairePrix", type: "info" as const, libelle: "",
          rendu: (p: Profil) => {
            const { total, prixFinal, economie } = calculsWebinaire(p);
            const l = [
              total !== null ? `Valeur totale : ${montant(total, p)}` : "",
              prixFinal !== null ? `Prix final : ${montant(prixFinal, p)}` : "",
              economie !== null ? `Économie : ${montant(economie, p)}` : "",
            ].filter(Boolean);
            return {
              ton: "alerte" as const, titre: "Réduction et montants",
              texte: `La réduction doit être réellement réservée aux participants du direct : le lendemain, le prix normal s'applique. Montants en ${devise(p)}.${l.length ? `\n${l.join(" · ")}` : ""}`,
            };
          },
        }]
      : []),
    ...CHAMPS_WEBINAIRE.filter((c) => c[2] === k).map(champ),
  ],
  apercu: k === PARTIES_WEBINAIRE.length - 1,
}));

// ── Les documents ─────────────────────────────────────────────────────────

const AUTRES: AutreDocument[] = [{
  libelle: "PowerPoint du webinaire",
  format: "pptx",
  fichier: "Liberty_Etape19_Webinaire",
  principal: true,
  generer: async (p, eleve, modele) => {
    const zip = await JSZip.loadAsync(await modele("webinaire"), { base64: true });
    const valeurs = valeursWebinaire(p, eleve);
    for (const nom of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
      zip.file(nom, remplirSlideWebinaire(await zip.file(nom)!.async("string"), valeurs));
    }
    await retirerSlidesPptx(zip, slidesARetirer(p));
    return zip.generateAsync({ type: "blob", mimeType: TYPE_PPTX, compression: "DEFLATE" });
  },
}];

export const outil10Webinaire: DefinitionOutil = {
  code: "liberty_webinaire",
  numero: 10,
  etape: "Étape 19",
  nom: "Mon template webinaire",
  objectif: "Générer le PowerPoint de votre webinaire (103 slides), déjà personnalisé avec vos textes.",
  fichier: "Liberty_Etape19_Webinaire_textes",
  formats: ["docx"],
  autresDocuments: AUTRES,
  ecrans,
  // le récapitulatif en Word, pour relire ses textes : partie par partie
  document: (p: Profil) => {
    const v = valeursWebinaire(p, "");
    const sections: SectionDoc[] = PARTIES_WEBINAIRE.map((titre, k) => ({
      titre,
      blocs: [{
        t: "tableau",
        colonnes: ["Élément", "Votre texte", "Slides"],
        lignes: CHAMPS_WEBINAIRE.filter((c) => c[2] === k).map(([nom, , , ou]) => [lisible(nom), v[nom] ?? "", ou.replace(/^slides? /, "")]),
      }],
    }));
    return { titre: "Mon template webinaire : vos textes", sections };
  },
};
