/**
 * Outil « Construire mon script d'appel » (cahier des charges de Sidali du
 * 12/10/2026). Un script = le texte fixe d'un template de Sidali, découpé en
 * blocs, où chaque blanc est un champ que l'élève remplit.
 *
 * Dans un texte, `{D01}` désigne la réponse au champ D01. Les repères qui
 * changent à chaque appel ([Prénom], [heure]) ne sont pas des champs : ils
 * restent tels quels.
 */

export type TypeChamp = "court" | "long" | "liste" | "nombre" | "montant";

export interface Champ {
  id: string;
  /** Libellé, repris du template. */
  libelle: string;
  type: TypeChamp;
  /** Courte aide affichée sous le champ. */
  aide: string;
  /** Exemple affiché en gris dans le champ vide. */
  exemple: string;
  /** Rappel éthique du template, affiché près du champ. */
  ethique?: string;
  /** Champ facultatif : rien n'apparaît dans le script s'il est vide. */
  facultatif?: boolean;
}

export type Bloc =
  | { t: "titre"; texte: string }
  | { t: "texte"; texte: string }
  | { t: "citation"; texte: string }
  | { t: "alerte"; texte: string }
  | { t: "voix"; nom: string; ton: string }
  | { t: "replique"; texte: string }
  | { t: "note"; texte: string }
  | { t: "puce"; texte: string }
  | { t: "etiquette"; texte: string }
  /** Lignes pointillées pour prendre des notes pendant l'appel (jamais un champ). */
  | { t: "lignes"; n: number }
  /** Zone d'un champ long ou liste : la réponse, ou `lignes` pointillés si vide. */
  | { t: "champ"; id: string; lignes: number };

export interface Etape {
  titre: string;
  champs: string[];
}

export type CleScript = "decouverte" | "transformation";

export interface DefinitionScript {
  cle: CleScript;
  titre: string;
  sousTitre: string;
  /** Préfixe du nom de fichier : SCRIPT_APPEL_DECOUVERTE_[projet]. */
  fichier: string;
  champs: Champ[];
  etapes: Etape[];
  blocs: Bloc[];
}

/** Réponses d'un projet : texte pour les champs simples, liste de lignes pour les listes. */
export type Reponses = Record<string, string | string[] | undefined>;

/** Ce qu'on écrit à la place d'un blanc non rempli (comme dans le template). */
export const POINTILLES = "……………………";

export interface Segment {
  texte: string;
  /** Réponse de l'élève insérée (null : texte fixe du template). */
  champ: string | null;
  /** Champ non rempli : pointillés, signalé à l'élève. */
  vide: boolean;
}

export function reponseTexte(reponses: Reponses, id: string): string {
  const v = reponses[id];
  if (Array.isArray(v)) return v.map((l) => l.trim()).filter(Boolean).join(", ");
  return (v ?? "").trim();
}

export function reponseListe(reponses: Reponses, id: string): string[] {
  const v = reponses[id];
  if (Array.isArray(v)) return v.map((l) => l.trim()).filter(Boolean);
  const t = (v ?? "").trim();
  return t ? t.split(/\n+/).map((l) => l.trim()).filter(Boolean) : [];
}

/** Un montant est repris tel quel ; « € » n'est ajouté que s'il n'y est pas déjà. */
function formaterMontant(v: string): string {
  return /€|eur/i.test(v) ? v : `${v} €`;
}

/** Découpe un texte du template en morceaux fixes et réponses de l'élève. */
export function segmenter(texte: string, reponses: Reponses, champs: Champ[]): Segment[] {
  const parId = new Map(champs.map((c) => [c.id, c]));
  const out: Segment[] = [];
  const re = /\{([A-Z]\d{2}[a-z_]*)\}/g;
  let dernier = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texte))) {
    if (m.index > dernier) out.push({ texte: texte.slice(dernier, m.index), champ: null, vide: false });
    const id = m[1];
    let v = reponseTexte(reponses, id);
    if (v && parId.get(id)?.type === "montant") v = formaterMontant(v);
    out.push(v ? { texte: v, champ: id, vide: false } : { texte: POINTILLES, champ: id, vide: true });
    dernier = m.index + m[0].length;
  }
  if (dernier < texte.length) out.push({ texte: texte.slice(dernier), champ: null, vide: false });
  return out;
}

/** Champs d'un script encore vides (hors facultatifs), pour le signaler à l'élève. */
export function champsManquants(def: DefinitionScript, reponses: Reponses): Champ[] {
  return def.champs.filter((c) =>
    !c.facultatif && (c.type === "liste" ? reponseListe(reponses, c.id).length === 0 : !reponseTexte(reponses, c.id)),
  );
}

/** Nom de fichier : SCRIPT_APPEL_DECOUVERTE_Coaching_nutrition_Sarah. */
export function nomFichier(def: DefinitionScript, projet: string): string {
  const propre = projet
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return propre ? `${def.fichier}_${propre}` : def.fichier;
}
