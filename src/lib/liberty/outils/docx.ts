/**
 * Document d'un outil Liberty en Word (.docx), à la charte du cahier des charges :
 * fond blanc (impression), titres or #B8963E, police Calibri, en-tête « Parcours
 * Liberty · Étape X », le nom de l'outil, le prénom et le nom de l'élève, la date,
 * et en bas de page : « Envoyez ce document sur le WhatsApp de Sidali. »
 * Une information vide apparaît « à compléter ». Assemblé à la main avec jszip,
 * comme les scripts d'appel (src/lib/scriptsAppel/docx.ts).
 */
import JSZip from "jszip";
import { A_COMPLETER, type BlocDoc, type DefinitionOutil, type DocumentOutil } from "./modele";

const OR = "B8963E";
const NOIR = "1F1F1F";
const GRIS = "6B6B6B";
const GRIS_CLAIR = "A0A0A0";
const FOND_PHRASE = "FBF7EC";
export const RAPPEL_VALIDATION = "Envoyez ce document sur le WhatsApp de Sidali.";

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface Style { b?: boolean; i?: boolean; couleur?: string; sz: number }

function run(t: string, s: Style): string {
  // les retours à la ligne d'un texte long deviennent des sauts de ligne Word
  const morceaux = t.split("\n").map((l) => `<w:t xml:space="preserve">${esc(l)}</w:t>`).join("<w:br/>");
  return `<w:r><w:rPr>${s.b ? "<w:b/>" : ""}${s.i ? "<w:i/>" : ""}<w:color w:val="${s.couleur ?? NOIR}"/><w:sz w:val="${s.sz}"/></w:rPr>${morceaux}</w:r>`;
}

function para(ppr: string, contenu: string): string {
  return `<w:p><w:pPr>${ppr}</w:pPr>${contenu}</w:p>`;
}

/** La valeur, ou « à compléter » en gris italique. */
function valeur(v: string, s: Style): string {
  return v.trim() ? run(v.trim(), s) : run(A_COMPLETER, { ...s, i: true, couleur: GRIS_CLAIR, b: false });
}

function cellule(contenu: string, largeur: number, entete = false): string {
  const fond = entete ? `<w:shd w:val="clear" w:color="auto" w:fill="${FOND_PHRASE}"/>` : "";
  return `<w:tc><w:tcPr><w:tcW w:w="${largeur}" w:type="dxa"/>${fond}</w:tcPr>${para(`<w:spacing w:after="40"/>`, contenu)}</w:tc>`;
}

function bloc(b: BlocDoc): string {
  switch (b.t) {
    case "champ":
      return para(`<w:spacing w:after="80"/>`, run(`${b.libelle} : `, { b: true, sz: 21 }) + valeur(b.valeur, { sz: 21 }));
    case "phrase":
      return (b.libelle ? para(`<w:keepNext/><w:spacing w:after="20"/>`, run(b.libelle, { b: true, couleur: OR, sz: 19 })) : "")
        + para(`<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${OR}"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="${FOND_PHRASE}"/><w:spacing w:after="120"/><w:ind w:left="170"/>`,
          valeur(b.valeur, { sz: 23 }));
    case "liste": {
      const titre = b.libelle ? para(`<w:keepNext/><w:spacing w:after="40"/>`, run(`${b.libelle} :`, { b: true, sz: 21 })) : "";
      const items = b.items.length ? b.items : [""];
      return titre + items.map((i) => para(`<w:spacing w:after="40"/><w:ind w:left="454" w:hanging="227"/>`,
        run("•  ", { b: true, couleur: OR, sz: 21 }) + valeur(i, { sz: 21 }))).join("");
    }
    case "tableau": {
      const largeur = Math.floor(9638 / Math.max(1, b.colonnes.length));
      const entete = `<w:tr>${b.colonnes.map((c) => cellule(run(c, { b: true, sz: 19 }), largeur, true)).join("")}</w:tr>`;
      const corps = (b.lignes.length ? b.lignes : [b.colonnes.map(() => "")])
        .map((l) => `<w:tr>${l.map((c) => cellule(valeur(c, { sz: 19 }), largeur)).join("")}</w:tr>`).join("");
      const bord = `<w:top w:val="single" w:sz="4" w:color="D9CDB0"/><w:left w:val="single" w:sz="4" w:color="D9CDB0"/><w:bottom w:val="single" w:sz="4" w:color="D9CDB0"/><w:right w:val="single" w:sz="4" w:color="D9CDB0"/><w:insideH w:val="single" w:sz="4" w:color="D9CDB0"/><w:insideV w:val="single" w:sz="4" w:color="D9CDB0"/>`;
      const grille = `<w:tblGrid>${b.colonnes.map(() => `<w:gridCol w:w="${largeur}"/>`).join("")}</w:tblGrid>`;
      return `<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${bord}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>${grille}${entete}${corps}</w:tbl>${para(`<w:spacing w:after="80"/>`, "")}`;
    }
    case "texte":
      return para(`<w:spacing w:after="80"/>`, run(b.texte, { sz: 21 }));
    case "saut":
      return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }
}

export interface Entete {
  def: DefinitionOutil;
  eleve: string;
  date: string;
}

function documentXml(d: DocumentOutil, e: Entete): string {
  const haut = para(`<w:spacing w:after="20"/>`, run(`PARCOURS LIBERTY · ${e.def.etape.toUpperCase()}`, { b: true, couleur: OR, sz: 18 }))
    + para(`<w:spacing w:after="20"/>`, run(d.titre, { b: true, sz: 40 }))
    + para(`<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="${OR}"/></w:pBdr><w:spacing w:after="200"/>`,
      run(`Outil ${e.def.numero} — ${e.def.nom}  ·  ${e.eleve || "Élève"}  ·  ${e.date}`, { couleur: GRIS, sz: 19 }));
  const corps = d.sections.map((s) =>
    para(`<w:keepNext/><w:spacing w:after="100" w:before="240"/>`, run(s.titre.toUpperCase(), { b: true, couleur: OR, sz: 24 }))
    + s.blocs.map(bloc).join("")).join("");
  const fin = para(`<w:pBdr><w:top w:val="single" w:sz="6" w:space="6" w:color="${OR}"/></w:pBdr><w:spacing w:before="320"/>`,
    run(RAPPEL_VALIDATION, { b: true, sz: 21 }));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${haut}${corps}${fin}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1134" w:bottom="1020" w:left="1134" w:header="720" w:footer="600" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

function footerXml(e: Entete): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${run(`Parcours Liberty · ${e.def.etape} · Outil ${e.def.numero} — ${e.def.nom} · ${RAPPEL_VALIDATION}`, { couleur: GRIS, sz: 15 })}</w:p></w:ftr>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;

function coreXml(d: DocumentOutil): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(d.titre)}</dc:title><dc:creator>AL BARAKA · Parcours Liberty</dc:creator></cp:coreProperties>`;
}

/** Le XML du corps, exposé pour les tests. */
export function corpsDocx(d: DocumentOutil, e: Entete): string {
  return documentXml(d, e);
}

export async function genererDocx(d: DocumentOutil, e: Entete): Promise<Blob> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("docProps/core.xml", coreXml(d));
  zip.file("word/document.xml", documentXml(d, e));
  zip.file("word/styles.xml", STYLES);
  zip.file("word/footer1.xml", footerXml(e));
  zip.file("word/_rels/document.xml.rels", DOC_RELS);
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
