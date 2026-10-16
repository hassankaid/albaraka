/**
 * Remplissage des modèles de Sidali (Word et PowerPoint) : chaque champ entre « »
 * (« NOM DE L'OFFRE », « PRIX »…) est remplacé par l'information de l'élève, dans
 * le texte même du modèle, sans toucher à sa mise en page. Un champ sans information
 * reste tel quel (doré, entre « ») : l'élève le complète à la main, par exemple les
 * informations propres à chaque client dans le contrat.
 *
 * Les modèles sont dans la table liberty_modeles (migration 20261016170000).
 */
import JSZip from "jszip";

export type Valeurs = Record<string, string>;

const ENTITES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };

export function deXml(t: string): string {
  return t.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITES[m]);
}

export function versXml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Les champs « » d'un texte. */
export function champsDuTexte(t: string): string[] {
  return [...t.matchAll(/«([^«»]+)»/g)].map((m) => m[1]);
}

export interface OptionsRemplissage {
  /** Balise de texte : « w » (Word) ou « a » (PowerPoint). */
  espace: "w" | "a";
  valeurs: Valeurs;
  /** Couleur des champs à remplacer par la couleur du texte une fois remplis (ex. doré → noir). */
  couleur?: { doree: string; texte: string };
}

/**
 * Remplace les champs dans un fragment XML, morceau de texte par morceau de texte
 * (<w:r> ou <a:r>). Exposé pour les tests.
 */
export function remplirXml(xml: string, o: OptionsRemplissage): string {
  const run = new RegExp(`<${o.espace}:r(?: [^>]*)?>(?:(?!</${o.espace}:r>)[\\s\\S])*</${o.espace}:r>`, "g");
  const texte = new RegExp(`(<${o.espace}:t(?: [^>]*)?>)([^<]*)(</${o.espace}:t>)`, "g");
  return xml.replace(run, (r) => {
    let change = false;
    let reste = false;
    const nouveau = r.replace(texte, (_m, ouvre: string, contenu: string, ferme: string) => {
      const avant = deXml(contenu);
      const apres = avant.replace(/«([^«»]+)»/g, (champ, cle: string) => {
        const v = (o.valeurs[cle] ?? "").trim();
        if (!v) {
          reste = true;
          return champ;
        }
        change = true;
        return v;
      });
      return `${ouvre.includes("xml:space") || o.espace === "a" ? ouvre : ouvre.replace(">", ' xml:space="preserve">')}${versXml(apres)}${ferme}`;
    });
    if (change && !reste && o.couleur) {
      return nouveau.replace(new RegExp(`(val=")${o.couleur.doree}(")`, "gi"), `$1${o.couleur.texte}$2`);
    }
    return nouveau;
  });
}

/** Ouvre un modèle (contenu base64), applique une transformation à certaines pièces XML, et rend le fichier. */
export async function transformerModele(
  base64: string,
  pieces: RegExp,
  transformer: (xml: string, nom: string) => string,
  type: string,
): Promise<Blob> {
  const zip = await JSZip.loadAsync(base64, { base64: true });
  for (const nom of Object.keys(zip.files).filter((n) => pieces.test(n))) {
    const xml = await zip.file(nom)!.async("string");
    zip.file(nom, transformer(xml, nom));
  }
  return zip.generateAsync({ type: "blob", mimeType: type });
}

export const TYPE_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const TYPE_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// ── Word : listes et paragraphes ─────────────────────────────────────────

/** Les paragraphes <w:p> (hors tableaux imbriqués : ils ne s'imbriquent pas). */
const PARAGRAPHE = /<w:p[ >](?:(?!<\/w:p>)[\s\S])*<\/w:p>/g;

function texteParagraphe(p: string): string {
  return deXml([...p.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(""));
}

/**
 * Une liste du modèle (« PHASE 1 : … », « PHASE 2 : … », « PHASE 3 : … ») remplie avec
 * n éléments : les paragraphes du modèle sont repris dans l'ordre, le dernier est
 * dupliqué s'il en faut plus, ceux en trop sont retirés. Sans aucun élément, la liste
 * du modèle reste telle quelle.
 */
export function remplirListeDocx(xml: string, cles: string[], elements: string[]): string {
  const items = elements.map((e) => e.trim()).filter(Boolean);
  if (!items.length) return xml;
  const paragraphes = [...xml.matchAll(PARAGRAPHE)];
  const lies = cles
    .map((cle) => ({ cle, m: paragraphes.find((p) => texteParagraphe(p[0]).includes(`«${cle}»`)) }))
    .filter((x): x is { cle: string; m: RegExpExecArray } => !!x.m);
  if (!lies.length) return xml;
  const remplacement = items.map((v, i) => {
    const { cle, m } = lies[Math.min(i, lies.length - 1)];
    return remplirXml(m[0], { espace: "w", valeurs: { [cle]: v } });
  }).join("");
  const debut = lies[0].m.index!;
  const dernier = lies[lies.length - 1].m;
  // les paragraphes de la liste se suivent dans le modèle : on remplace tout le bloc
  return xml.slice(0, debut) + remplacement + xml.slice(dernier.index! + dernier[0].length);
}

/** Retire le paragraphe qui contient ce texte, et le tableau qui le suit s'il y en a un. */
export function retirerParagrapheEtTableau(xml: string, contient: string): string {
  const m = [...xml.matchAll(PARAGRAPHE)].find((p) => texteParagraphe(p[0]).includes(contient));
  if (!m) return xml;
  let fin = m.index! + m[0].length;
  const suite = xml.slice(fin);
  const tableau = suite.match(/^\s*<w:tbl>[\s\S]*?<\/w:tbl>/);
  if (tableau) fin += tableau[0].length;
  return xml.slice(0, m.index!) + xml.slice(fin);
}

/** Retire un paragraphe dont le seul champ est resté vide (élément facultatif du modèle). */
export function retirerParagrapheSiVide(xml: string, champ: string): string {
  const m = [...xml.matchAll(PARAGRAPHE)].find((p) => texteParagraphe(p[0]).includes(`«${champ}»`));
  return m ? xml.slice(0, m.index!) + xml.slice(m.index! + m[0].length) : xml;
}

/**
 * Retire les indications du modèle qui suivent un champ rempli : « (ex. micro-entreprise,
 * SAS, LLC) », « (si existant) », « (facultatif) », « (par défaut : droit français) ».
 * Elles restent après un champ encore vide (« … »), pour guider l'élève.
 */
export function retirerIndicationsDocx(xml: string): string {
  return xml.replace(PARAGRAPHE, (p) => {
    const noeuds = [...p.matchAll(/(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g)];
    if (!noeuds.length) return p;
    const textes = noeuds.map((n) => deXml(n[2]));
    const tout = textes.join("");
    const aRetirer: [number, number][] = [];
    for (const m of tout.matchAll(/\s*\((?:ex\.|si existant|facultatif|par défaut)/g)) {
      const avant = tout.slice(0, m.index!).trimEnd();
      if (!avant || avant.endsWith("»")) continue;
      // la parenthèse fermante correspondante
      let niveau = 0;
      let fin = -1;
      for (let k = m.index! + m[0].indexOf("("); k < tout.length; k++) {
        if (tout[k] === "(") niveau++;
        else if (tout[k] === ")" && --niveau === 0) { fin = k + 1; break; }
      }
      if (fin > 0) aRetirer.push([m.index!, fin]);
    }
    if (!aRetirer.length) return p;
    let pos = 0;
    let i = 0;
    return p.replace(/(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g, (_m, ouvre: string, _c: string, ferme: string) => {
      const t = textes[i++];
      const debut = pos;
      pos += t.length;
      const garde = t.split("").filter((_ch, k) => !aRetirer.some(([a, b]) => debut + k >= a && debut + k < b)).join("");
      return `${ouvre}${versXml(garde)}${ferme}`;
    });
  });
}
