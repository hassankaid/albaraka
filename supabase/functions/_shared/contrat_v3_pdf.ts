// ═══════════════════════════════════════════════════════════════════════════
// Contrats v3 (13/11/2026) : le PDF unique remis au client — contrat accepté,
// Annexe 1 (attestation de renonciation), Annexe 2 (CGV acceptées).
// Utilisé par contrat-v3-envoyer ; testable en local avec Deno.
// ═══════════════════════════════════════════════════════════════════════════
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1";
import * as fontkitModule from "https://esm.sh/@pdf-lib/fontkit@1.1.1";
// deno-lint-ignore no-explicit-any
const fontkit = ((fontkitModule as any).default ?? fontkitModule) as any;
import {
  construireAttestationV3,
  construireContratV3,
  PDF_CGV_V3,
  VERSION_CGV_V3,
  type DonneesContratV3,
} from "./contrat_v3.ts";

const SITE = "https://plateforme.albarakaecosysteme.com";

// ─── Mise en page PDF ───────────────────────────────────────────────────────
const A4: [number, number] = [595.28, 841.89];
const MARGE = 52;
const LARGEUR = A4[0] - 2 * MARGE;
const OR = rgb(0.6, 0.47, 0.13);
const ENCRE = rgb(0.1, 0.1, 0.1);
const GRIS = rgb(0.42, 0.42, 0.42);

/** Remplace ce que la police ne sait pas écrire (jeu WinAnsi pour les polices standard). */
function propre(t: string, police: PDFFont): string {
  const s = String(t ?? "").replace(/[  ]/g, " ").replace(/‑/g, "-");
  let out = "";
  for (const ch of s) {
    try {
      police.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

interface Segment {
  texte: string;
  gras?: boolean;
}

class Mise {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  reg: PDFFont;
  gras: PDFFont;
  pages: PDFPage[] = [];
  constructor(doc: PDFDocument, reg: PDFFont, gras: PDFFont) {
    this.doc = doc;
    this.reg = reg;
    this.gras = gras;
    this.nouvellePage();
  }
  nouvellePage() {
    this.page = this.doc.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - MARGE;
  }
  place(h: number) {
    if (this.y - h < MARGE + 24) this.nouvellePage();
  }
  /** Paragraphe à segments (gras / normal), retour à la ligne au mot. */
  para(segments: Segment[], opts: { taille?: number; retrait?: number; couleur?: ReturnType<typeof rgb>; apres?: number; puce?: boolean } = {}) {
    const taille = opts.taille ?? 9.4;
    const interligne = taille * 1.42;
    const x0 = MARGE + (opts.retrait ?? 0);
    const largeur = LARGEUR - (opts.retrait ?? 0);
    const mots: { mot: string; police: PDFFont }[] = [];
    for (const sg of segments) {
      const police = sg.gras ? this.gras : this.reg;
      for (const m of propre(sg.texte, police).split(/\s+/).filter(Boolean)) mots.push({ mot: m, police });
    }
    const lignes: { mot: string; police: PDFFont }[][] = [];
    let cour: { mot: string; police: PDFFont }[] = [];
    let l = 0;
    for (const m of mots) {
      const w = m.police.widthOfTextAtSize(m.mot + " ", taille);
      if (l + w > largeur && cour.length) {
        lignes.push(cour);
        cour = [];
        l = 0;
      }
      cour.push(m);
      l += w;
    }
    if (cour.length) lignes.push(cour);
    lignes.forEach((ligne, i) => {
      this.place(interligne);
      if (opts.puce && i === 0) this.page.drawText("•", { x: x0 - 9, y: this.y - taille, size: taille, font: this.reg, color: opts.couleur ?? ENCRE });
      let x = x0;
      for (const m of ligne) {
        this.page.drawText(m.mot, { x, y: this.y - taille, size: taille, font: m.police, color: opts.couleur ?? ENCRE });
        x += m.police.widthOfTextAtSize(m.mot + " ", taille);
      }
      this.y -= interligne;
    });
    this.y -= opts.apres ?? 4;
  }
  titre(t: string, taille = 11, couleur = OR, avant = 8) {
    this.place(taille * 3);
    this.y -= avant;
    this.para([{ texte: t, gras: true }], { taille, couleur, apres: 3 });
  }
  /** Case cochée dessinée (les polices standard n'ont pas de « ☑ »). */
  caseCochee(texte: string, coche: string) {
    const taille = 9;
    this.place(taille * 4);
    const y = this.y;
    this.page.drawRectangle({ x: MARGE, y: y - 10, width: 9, height: 9, borderColor: OR, borderWidth: 1 });
    this.page.drawLine({ start: { x: MARGE + 1.8, y: y - 5.6 }, end: { x: MARGE + 3.9, y: y - 8.2 }, thickness: 1.3, color: OR });
    this.page.drawLine({ start: { x: MARGE + 3.9, y: y - 8.2 }, end: { x: MARGE + 7.6, y: y - 2.6 }, thickness: 1.3, color: OR });
    this.para([{ texte }], { taille, retrait: 16, apres: 0 });
    this.para([{ texte: coche ? `Cochée le ${coche}` : "Cochée" }], { taille: 8.2, retrait: 16, couleur: GRIS, apres: 5 });
  }
  pied(texte: string) {
    const total = this.pages.length;
    this.pages.forEach((pg, i) => {
      const t = propre(`${texte} — page ${i + 1} / ${total}`, this.reg);
      pg.drawText(t, { x: MARGE, y: 28, size: 7.5, font: this.reg, color: GRIS });
    });
  }
}

export async function construirePdfContratV3(
  d: DonneesContratV3,
  extra: { navigateur: string | null; accesActiveLe: string | null; envoyeLe: string },
  cgvPdf: Uint8Array,
  /** Police intégrée (Lato, licence libre OFL) : rendu identique dans tous les lecteurs. */
  polices?: { normale: Uint8Array; grasse: Uint8Array } | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Contrat ${d.numero}`);
  doc.setAuthor("Ethicarena L.L.C-FZ");
  doc.setSubject("Contrat accepté, attestation de renonciation et Conditions générales de vente");
  let reg: PDFFont;
  let gras: PDFFont;
  if (polices) {
    doc.registerFontkit(fontkit);
    reg = await doc.embedFont(polices.normale, { subset: true });
    gras = await doc.embedFont(polices.grasse, { subset: true });
  } else {
    reg = await doc.embedFont(StandardFonts.Helvetica);
    gras = await doc.embedFont(StandardFonts.HelveticaBold);
  }
  const m = new Mise(doc, reg, gras);
  const contrat = construireContratV3(d);

  // En-tête
  m.para([{ texte: "AL BARAKA", gras: true }], { taille: 15, couleur: OR, apres: 0 });
  m.para([{ texte: "Ethicarena L.L.C-FZ · contact@ethicarena.com" }], { taille: 8, couleur: GRIS, apres: 10 });
  m.para([{ texte: contrat.titre, gras: true }], { taille: 12.5, apres: 2 });
  m.para([{ texte: contrat.numeroLigne }], { taille: 9.5, couleur: GRIS, apres: 8 });

  for (const a of contrat.articles) {
    m.titre(a.titre);
    for (const b of a.blocs) {
      if (b.type === "li") m.para([{ texte: b.texte }], { retrait: 14, puce: true, apres: 2 });
      else m.para(b.etiquette ? [{ texte: b.etiquette, gras: true }, { texte: b.texte }] : [{ texte: b.texte }]);
    }
  }

  m.titre("Confirmation et acceptation");
  m.para([{ texte: "Cases cochées par le Client avant le paiement, toutes obligatoires (horodatées) :" }], { apres: 6 });
  for (const c of contrat.confirmation.cases) m.caseCochee(c.texte, c.coche_le);
  m.y -= 4;
  for (const l of contrat.confirmation.lignes) m.para([{ texte: l }]);

  // Annexe 1
  const att = construireAttestationV3({
    offre: d.offre,
    module: d.module,
    numero: d.numero || "",
    client: { nom: d.client.nom, email: d.client.email },
    caseCocheeLe: d.acceptation?.cases.find((x) => x.id === "acces_immediat")?.coche_le ?? null,
    ip: d.acceptation?.ip ?? null,
    navigateur: extra.navigateur,
    accesActiveLe: extra.accesActiveLe,
    envoyeLe: extra.envoyeLe,
  });
  m.nouvellePage();
  m.para([{ texte: att.titre, gras: true }], { taille: 12, couleur: OR, apres: 10 });
  for (const l of att.lignes) {
    if (l.etiquette) m.para([{ texte: `${l.etiquette} : `, gras: true }, { texte: l.texte }], { apres: 5 });
    else {
      m.y -= 4;
      m.para([{ texte: l.texte }], { apres: 5 });
    }
  }

  // Annexe 2 : page de titre, puis les pages du PDF daté des CGV acceptées
  m.nouvellePage();
  m.para([{ texte: `Annexe 2 – Conditions générales de vente (version du ${VERSION_CGV_V3})`, gras: true }], { taille: 12, couleur: OR, apres: 8 });
  m.para([{ texte: `Les Conditions générales de vente acceptées par le Client en cochant la case « J'ai lu et j'accepte le contrat et les Conditions générales de vente » figurent aux pages suivantes. Elles restent consultables sur ${SITE}${PDF_CGV_V3}.` }]);
  m.pied(`Contrat N° ${d.numero} · ${d.client.nom}`);

  const cgv = await PDFDocument.load(cgvPdf);
  const copies = await doc.copyPages(cgv, cgv.getPageIndices());
  for (const pg of copies) doc.addPage(pg);
  return await doc.save();
}


/** Les fichiers de la police intégrée, servis par le site. */
export const POLICES_CONTRAT = {
  normale: `${SITE}/contrats/polices/Lato-Regular.ttf`,
  grasse: `${SITE}/contrats/polices/Lato-Bold.ttf`,
};
