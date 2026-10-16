/**
 * Outils du Parcours Liberty (cahier des charges de Sidali du 15/10/2026).
 *
 * Un outil = des écrans courts (un thème par écran), chacun avec ses champs, puis
 * un document généré (PDF / Word). Tout ce que l'élève remplit vit dans UN profil
 * partagé (table liberty_profil) : chaque information a une clé (« avatar.peur »)
 * et se lit et s'écrit à la même place depuis tous les outils. Les outils suivants
 * la retrouvent donc déjà remplie, et une correction à la source apparaît partout.
 *
 * Règles communes : vouvoiement, aide sous chaque champ, exemple grisé, aucun champ
 * obligatoire, pas de score, pas d'IA (l'outil assemble les phrases à partir des champs).
 */

/** Une valeur du profil : texte, liste de textes, ou lignes d'un tableau. */
export type Valeur = string | string[] | Ligne[] | undefined;
export type Ligne = Record<string, string>;
export type Profil = Record<string, Valeur>;

interface ChampBase {
  /** Clé dans le profil partagé, ex. « avatar.peur ». */
  cle: string;
  libelle: string;
  /** Une phrase d'aide sous le champ. */
  aide?: string;
  /** Exemple grisé tiré du PowerPoint de l'étape. */
  exemple?: string;
  /** Affiché mais non modifiable ici (la garantie, hors outil 3). */
  lectureSeule?: boolean;
  /** Information saisie dans un outil précédent (« l'outil 1 ») : reprise, et modifiable ici. */
  repris?: string;
  /** Le champ n'apparaît que si la condition est vraie (ex. « Pas encore de clients »). */
  visible?: (p: Profil) => boolean;
  /** Contenu de départ, écrit une seule fois dans le champ vide : l'élève le retouche ensuite. */
  prerempli?: (p: Profil) => Valeur;
  /** Texte proposé à partir des autres réponses : un bouton le recopie dans le champ (garantie). */
  proposition?: (p: Profil) => string;
}

/** Des options fixes, ou calculées à partir d'un autre écran (ex. les solutions de l'écran 2). */
export type Options = string[] | ((p: Profil) => string[]);

interface ColonneBase {
  cle: string;
  libelle: string;
  exemple?: string;
  /** Aide sous la colonne, fixe ou calculée (ex. les mots de l'avatar). */
  aide?: string | ((p: Profil) => string);
  /** Texte modèle de la ligne : un bouton « Partir d'un modèle » le recopie (ex. selon le type d'accroche). */
  modele?: (l: Ligne) => string;
}

export type Colonne =
  | (ColonneBase & { type: "court" | "long" | "nombre" | "date" })
  | (ColonneBase & { type: "choix"; options: Options })
  /** Plusieurs choix, enregistrés séparés par « ; » (au plus `max`). */
  | (ColonneBase & { type: "multi"; options: Options; max?: number });

/** Un filtre au-dessus des blocs : n'afficher que ceux dont la colonne vaut l'option (ou commence par elle). */
export interface FiltreBlocs {
  colonne: string;
  libelle: string;
  options: string[];
  /** Compare le début de la valeur (ex. « TOFU · … »). */
  prefixe?: boolean;
}

/** Ce qu'un encart calculé affiche : une phrase assemblée, un rappel, une alerte. */
export interface Encart {
  texte: string;
  ton?: "phrase" | "rappel" | "alerte";
  titre?: string;
}

export type Champ =
  | (ChampBase & { type: "court" | "long" | "nombre" | "date"; unite?: string })
  | (ChampBase & { type: "choix"; options: Options })
  /** Liste de textes courts. `fixe` : toujours ce nombre de lignes ; sinon extensible. */
  | (ChampBase & { type: "liste"; fixe?: number; ajout?: string })
  /** Blocs répétés (ou tableau) : une ligne = un bloc de colonnes. */
  | (ChampBase & {
      type: "blocs"; colonnes: Colonne[]; nomBloc: string; ajout?: string;
      /** Toujours ce nombre de blocs. */ fixe?: number;
      /** Nombre de blocs vides au départ (sinon 1). */ initial?: number;
      max?: number;
      /** Compteur affiché, sans blocage : « 12 problèmes, objectif 20 ». */
      compteur?: { objectif: number; mot: string };
      /** Blocs réordonnables (flèches monter / descendre). */
      tableau?: boolean;
      filtres?: FiltreBlocs[];
    })
  /** Cases à cocher pour soi, sans score. */
  | (ChampBase & { type: "cases"; options: Options })
  /** Un encart calculé (phrase assemblée en direct, rappel, alerte) : rien n'est saisi. */
  | (ChampBase & { type: "info"; rendu: (p: Profil) => Encart | null })
  /** Un bouton qui calcule et écrit des informations (ex. générer le calendrier). */
  | (ChampBase & {
      type: "action"; bouton: string;
      /** Message de confirmation avant d'écraser (null : pas de confirmation). */
      confirmer?: (p: Profil) => string | null;
      executer: (p: Profil) => Profil;
    });

export interface Ecran {
  titre: string;
  /** Quelques mots pour situer l'écran. */
  intro?: string;
  champs: Champ[];
  /** Le dernier écran montre l'aperçu du document. */
  apercu?: boolean;
}

/** Le document généré : des sections faites de blocs simples, rendus en PDF, Word et à l'écran. */
export type BlocDoc =
  /** Une information : libellé + valeur (« à compléter » si vide). */
  | { t: "champ"; libelle: string; valeur: string }
  /** Une phrase mise en avant (ex. la sous-niche en une phrase). */
  | { t: "phrase"; libelle?: string; valeur: string }
  | { t: "liste"; libelle?: string; items: string[] }
  | { t: "tableau"; colonnes: string[]; lignes: string[][] }
  | { t: "texte"; texte: string }
  /** Nouvelle page (ex. un script par page). */
  | { t: "saut" };

export interface SectionDoc {
  titre: string;
  blocs: BlocDoc[];
}

export interface DocumentOutil {
  /** Titre du document, ex. « Fiche sous-niche & avatar ». */
  titre: string;
  sections: SectionDoc[];
}

/** Un document de plus que le document principal (annexe, contrat, PowerPoint). */
export interface AutreDocument {
  libelle: string;
  format: "docx" | "pptx";
  /** Préfixe du nom de fichier. */
  fichier: string;
  /** Le document à télécharger en premier (bouton « Télécharger » du dernier écran). */
  principal?: boolean;
  /** `modele` charge un modèle de Sidali (table liberty_modeles) en base64. */
  generer: (p: Profil, eleve: string, modele: (code: string) => Promise<string>) => Promise<Blob>;
}

export interface DefinitionOutil {
  code: string;
  numero: number;
  /** « Étape 2 », ou « Bonus ». */
  etape: string;
  nom: string;
  objectif: string;
  ecrans: Ecran[];
  document: (p: Profil) => DocumentOutil;
  /** Préfixe du nom de fichier téléchargé. */
  fichier: string;
  /** Formats du document principal (par défaut PDF et Word). */
  formats?: ("pdf" | "docx")[];
  autresDocuments?: AutreDocument[];
}

/** Ce qu'on écrit à la place d'une information vide. */
export const A_COMPLETER = "à compléter";

export function texte(p: Profil, cle: string): string {
  const v = p[cle];
  if (Array.isArray(v)) return "";
  return (v ?? "").trim();
}

/** La valeur telle que tapée (sans retirer les espaces) : pour les champs de saisie. */
export function brut(p: Profil, cle: string): string {
  const v = p[cle];
  return typeof v === "string" ? v : "";
}

export function liste(p: Profil, cle: string): string[] {
  const v = p[cle];
  if (!Array.isArray(v)) return [];
  return (v as unknown[]).filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
}

export function lignes(p: Profil, cle: string): Ligne[] {
  const v = p[cle];
  if (!Array.isArray(v)) return [];
  return (v as unknown[]).filter((x): x is Ligne => !!x && typeof x === "object" && !Array.isArray(x));
}

/** Une ligne de bloc est-elle remplie (au moins une colonne) ? */
export function ligneRemplie(l: Ligne): boolean {
  return Object.values(l).some((v) => (v ?? "").trim());
}

export function options(o: Options, p: Profil): string[] {
  return (typeof o === "function" ? o(p) : o).map((x) => x.trim()).filter(Boolean);
}

/** Les champs affichés d'un écran (sans ceux masqués par leur condition). */
export function champsVisibles(champs: Champ[], p: Profil): Champ[] {
  return champs.filter((c) => !c.visible || c.visible(p));
}

/** Les champs qu'on remplit (sans les encarts calculés). */
export function estSaisie(c: Champ): boolean {
  return c.type !== "info" && c.type !== "action";
}

/** Un champ est-il rempli ? (pour la barre de progression, sans rien imposer) */
export function champRempli(p: Profil, c: Champ): boolean {
  switch (c.type) {
    case "info":
    case "action":
      return false;
    case "liste":
    case "cases":
      return liste(p, c.cle).length > 0;
    case "blocs":
      return lignes(p, c.cle).some(ligneRemplie);
    default:
      return !!texte(p, c.cle);
  }
}

/** Raccourcis pour écrire les documents. */
export const doc = {
  champ: (p: Profil, libelle: string, cle: string): BlocDoc => ({ t: "champ", libelle, valeur: texte(p, cle) }),
  phrase: (p: Profil, libelle: string, cle: string): BlocDoc => ({ t: "phrase", libelle, valeur: texte(p, cle) }),
  liste: (p: Profil, libelle: string | undefined, cle: string): BlocDoc => ({ t: "liste", libelle, items: liste(p, cle) }),
};

/** Nom de fichier sûr : « Liberty_Etape2_Niche_avatar_Prenom_Nom ». */
export function nomFichier(def: DefinitionOutil, eleve: string): string {
  const propre = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return [def.fichier, propre(eleve)].filter(Boolean).join("_");
}

/** Une case à cocher (valeur « oui ») est-elle cochée ? */
export function coche(p: Profil, cle: string): boolean {
  return texte(p, cle) === "oui";
}

/** Une phrase assemblée : les morceaux vides deviennent « [libellé] ». */
export function assembler(morceaux: (string | { valeur: string; vide: string })[]): string {
  return morceaux.map((m) => (typeof m === "string" ? m : m.valeur.trim() || `[${m.vide}]`)).join("");
}

/** « Mamans salariées qui veulent… » → « mamans salariées qui veulent… » (pour l'insérer dans une phrase). */
export function enMinuscule(t: string): string {
  const s = t.trim().replace(/[.!]+$/, "");
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : "";
}

/** Valeurs d'une colonne « multi » (séparées par « ; »). */
export function multi(v: string | undefined): string[] {
  return (v ?? "").split(";").map((x) => x.trim()).filter(Boolean);
}
