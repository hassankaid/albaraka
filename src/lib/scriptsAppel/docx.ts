/**
 * Génère le script en Word (.docx), avec la mise en page des templates de
 * Sidali : logo AL BARAKA, fond blanc, titres or, indications de voix,
 * répliques encadrées. Les propriétés de paragraphe et de texte reprennent
 * celles du template (couleurs, tailles, bordure or et fond crème des répliques).
 *
 * Un champ vide garde la ligne pointillée du template.
 */
import JSZip from "jszip";
import {
  POINTILLES, reponseListe, reponseTexte, segmenter,
  type Bloc, type DefinitionScript, type Reponses,
} from "./modele";

const OR = "9A740B";
const OR_BORDURE = "C9A84C";
const CREME = "FBF7EC";
const NOIR = "1F1F1F";
const GRIS = "5A5A5A";
const POINTILLE = "BBBBBB";
const ROUGE = "B02A2A";
const LIGNE_POINTILLEE = ".".repeat(232);

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface Style { b?: boolean; i?: boolean; couleur?: string; sz: number }

function run(texte: string, s: Style): string {
  return `<w:r><w:rPr>${s.b ? "<w:b/>" : '<w:b w:val="0"/>'}${s.i ? "<w:i/>" : '<w:i w:val="0"/>'}<w:color w:val="${s.couleur ?? NOIR}"/><w:sz w:val="${s.sz}"/></w:rPr><w:t xml:space="preserve">${esc(texte)}</w:t></w:r>`;
}

/** Texte du template avec les réponses : une réponse vide reste en pointillés gris. */
function runs(texte: string, s: Style, def: DefinitionScript, rep: Reponses): string {
  return segmenter(texte, rep, def.champs)
    .map((seg) => run(seg.texte, seg.vide ? { ...s, couleur: POINTILLE, b: false } : s))
    .join("");
}

function para(ppr: string, contenu: string): string {
  return `<w:p><w:pPr>${ppr}</w:pPr>${contenu}</w:p>`;
}

const P_REPLIQUE = `<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${OR_BORDURE}"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="${CREME}"/><w:spacing w:after="100"/><w:ind w:left="170"/>`;
const P_PUCE = `<w:spacing w:after="60"/><w:ind w:left="454" w:hanging="227"/>`;
const P_LIGNE = `<w:spacing w:after="160"/>`;

function lignesPointillees(n: number): string {
  return Array.from({ length: n }, () => para(P_LIGNE, run(LIGNE_POINTILLEE, { couleur: POINTILLE, sz: 16 }))).join("");
}

function bloc(b: Bloc, def: DefinitionScript, rep: Reponses): string {
  switch (b.t) {
    case "titre":
      return para(`<w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="${OR_BORDURE}"/></w:pBdr><w:spacing w:after="80" w:before="280"/>`,
        run(b.texte, { b: true, couleur: OR, sz: 28 }));
    case "texte":
      return para(`<w:spacing w:after="80"/>`, runs(b.texte, { sz: 21 }, def, rep));
    case "citation":
      return para(`<w:spacing w:after="80"/><w:ind w:left="283"/>`, run(b.texte, { i: true, couleur: OR, sz: 22 }));
    case "alerte":
      return para(`<w:spacing w:after="80" w:before="80"/>`, run("⚠ ", { b: true, couleur: ROUGE, sz: 20 }) + runs(b.texte, { b: true, sz: 20 }, def, rep));
    case "voix":
      return para(`<w:keepNext/><w:spacing w:after="40" w:before="120"/>`,
        run(`🎙 ${b.nom}`, { b: true, couleur: OR, sz: 18 }) + run(`  ${b.ton}`, { i: true, couleur: GRIS, sz: 18 }));
    case "replique":
      return para(P_REPLIQUE, runs(b.texte, { sz: 21 }, def, rep));
    case "note":
      return para(`<w:spacing w:after="80"/><w:ind w:left="170"/>`, runs(b.texte, { i: true, couleur: GRIS, sz: 19 }, def, rep));
    case "puce":
      return para(P_PUCE, run("•  ", { b: true, couleur: OR, sz: 20 }) + runs(b.texte, { sz: 21 }, def, rep));
    case "etiquette":
      return para(`<w:keepNext/><w:spacing w:after="80" w:before="160"/>`, runs(b.texte, { b: true, couleur: OR, sz: 20 }, def, rep));
    case "lignes":
      return lignesPointillees(b.n);
    case "champ": {
      const champ = def.champs.find((c) => c.id === b.id);
      if (champ?.type === "liste") {
        const items = reponseListe(rep, b.id);
        if (!items.length) return lignesPointillees(b.lignes);
        return items.map((l) => para(P_PUCE, run("•  ", { b: true, couleur: OR, sz: 20 }) + run(l, { sz: 21 }))).join("");
      }
      const v = reponseTexte(rep, b.id);
      if (!v) return champ?.facultatif ? "" : lignesPointillees(b.lignes);
      return v.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => para(P_REPLIQUE, run(l, { sz: 21 }))).join("");
    }
  }
}

function documentXml(def: DefinitionScript, rep: Reponses, projet: string): string {
  const logo = `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:drawing><wp:inline><wp:extent cx="1152000" cy="665784"/><wp:docPr id="1" name="Logo AL BARAKA"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="logo_albaraka.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1152000" cy="665784"/></a:xfrm><a:prstGeom prst="rect"/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  const titre = para(`<w:spacing w:after="40"/>`, run(`Script — ${def.titre}`, { b: true, sz: 44 }));
  const sous = para(`<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="${OR_BORDURE}"/></w:pBdr><w:spacing w:after="200"/>`,
    run(projet ? `${projet} · ${def.sousTitre}` : def.sousTitre, { couleur: GRIS, sz: 22 }));
  const corps = def.blocs.map((b) => bloc(b, def, rep)).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${logo}${titre}${sous}${corps}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1134" w:bottom="1020" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:eastAsia="Cambria" w:cs="Cambria"/><w:sz w:val="21"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

function footerXml(def: DefinitionScript): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${run(`AL BARAKA · Script — ${def.titre}`, { couleur: GRIS, sz: 16 })}</w:p></w:ftr>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo_albaraka.png"/></Relationships>`;

function coreXml(def: DefinitionScript): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Script — ${esc(def.titre)}</dc:title><dc:creator>AL BARAKA</dc:creator></cp:coreProperties>`;
}

/** Le XML du corps, exposé pour les tests. */
export function corpsDocx(def: DefinitionScript, rep: Reponses, projet: string): string {
  return documentXml(def, rep, projet);
}

export async function genererDocx(def: DefinitionScript, rep: Reponses, projet: string, logoPng: ArrayBuffer | Uint8Array): Promise<Blob> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("docProps/core.xml", coreXml(def));
  zip.file("word/document.xml", documentXml(def, rep, projet));
  zip.file("word/styles.xml", STYLES);
  zip.file("word/footer1.xml", footerXml(def));
  zip.file("word/_rels/document.xml.rels", DOC_RELS);
  zip.file("word/media/logo_albaraka.png", logoPng);
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export { POINTILLES };
