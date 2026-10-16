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
}

export interface Colonne {
  cle: string;
  libelle: string;
  type: "court" | "long";
  exemple?: string;
}

export type Champ =
  | (ChampBase & { type: "court" | "long" })
  | (ChampBase & { type: "choix"; options: string[] })
  /** Liste de textes courts. `fixe` : toujours ce nombre de lignes ; sinon extensible. */
  | (ChampBase & { type: "liste"; fixe?: number; ajout?: string })
  /** Blocs répétés (ou tableau) : une ligne = un bloc de colonnes. */
  | (ChampBase & { type: "blocs"; colonnes: Colonne[]; fixe?: number; max?: number; ajout?: string; nomBloc: string })
  /** Cases à cocher pour soi, sans score. */
  | (ChampBase & { type: "cases"; options: string[] });

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
  | { t: "texte"; texte: string };

export interface SectionDoc {
  titre: string;
  blocs: BlocDoc[];
}

export interface DocumentOutil {
  /** Titre du document, ex. « Fiche sous-niche & avatar ». */
  titre: string;
  sections: SectionDoc[];
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

/** Un champ est-il rempli ? (pour la barre de progression, sans rien imposer) */
export function champRempli(p: Profil, c: Champ): boolean {
  switch (c.type) {
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
