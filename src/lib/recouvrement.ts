// ─────────────────────────────────────────────────────────────────────────
// Recouvrement (09/10/2026) : factures REC et fichier du cabinet d'avocats.
//
// Une échéance impayée transmise au cabinet reçoit une facture REC0000001…,
// datée du jour de l'échéance (fonction `generer-facture-recouvrement`). Le
// cabinet reçoit ensuite les dossiers par un fichier Excel à SON format : un
// modèle de 96 colonnes, longueurs maximales imposées, tout en texte. Ce
// module reproduit ce modèle à l'identique (en-tête compris), à partir du
// fichier « AL BARAKA - IMPAYES A TRANSMETTRE AU CABINET » du 29/08/2026.
// ─────────────────────────────────────────────────────────────────────────
import JSZip from "jszip";

/** Ce qu'il faut d'une facture REC pour la ligne du cabinet. */
export interface FactureRecouvrement {
  numero: string;
  montant: number | string;
  date_facture: string; // AAAA-MM-JJ
  payment_number: number | null;
  total_payments: number | null;
  /** Produit tel qu'en base (`sales.product`), pas le libellé de la facture. */
  produit_vente: string | null;
  client_nom: string;
  client_email: string | null;
  client_telephone: string | null;
  client_adresse: string | null;
  client_code_postal: string | null;
  client_ville: string | null;
}

/** En-tête du modèle du cabinet, reproduit tel quel (96 colonnes). */
export const ENTETE_CABINET: string[] = [
  "NOM DU DEBITEUR (30 CARACTERES MAXIMUM)",
  "INUTILISE",
  "INUTILISE",
  "ADRESSE 1 DEBITEUR (30 CARACTERES MAXIMUM)",
  "ADRESSE 2 DEBITEUR (30 CARACTERES MAXIMUM)",
  "ADRESSE 3 DEBITEUR (30 CARACTERES MAXIMUM)",
  "CODE POSTAL DEBITEUR (5 CARACTERES MAXIMUM)",
  "VILLE DEBITEUR (30 CARACTERES MAXIMUM°",
  "TELEPHONE (16 CARACTERES MAXIMUM)",
  "TELECOPIE (16 CARACTERES MAXIMUM))",
  "SIREN DEBITEUR (50 CARACTERES MAXIMUM)",
  "INUTILISE",
  "INUTILISE",
  "INUTILISE",
  "TITULAIRE DU COMPTE BANCAIRE (35 CARACTERES MAXIMUM)",
  "NOM DE LA BANQUE (30 CARACTERES MAXIMUM)",
  "CODE BANQUE (30 CARACTERES MAXIMUM)",
  "GUICHET (5 CARACTERES MAXIMUM)",
  "NUMERO DE COMPTE (11 CARACTERES MAXIMUM)",
  "CLE RIB (2 CARACTERES MAXIMUM)",
  "INUTILISE",
  "TYPE DE CREANCE (COMMERCIALE OU CIVILE)",
  "MONTANT DE LA CREANCE (12 CARACTERES MAXIMUM)",
  "DATE DE DEPART DES INTERETS (8 CARACTERES MAXIMUM /FORMAT : JJMMAAAA)",
  "VOS REFERENCES (25 CARACTERES MAXIMUM)",
  "NUMERO DE FACTURE (10 CARACTERES MAXIMUM)",
  "DATE DE LA FACTURE (8 CARACTERES MAXIMUM / FORMAT : JJMMAAAA)",
  "INUTILISE",
  "INUTILISE",
  "INUTILISE",
  "INUTILISE",
  "INUTILISE",
  "INUTILISE",
  "INUTILISE",
  "INUTILISE",
  "COMMENTAIRES (40 CARACTERES MAXIMUM)",
  "COMMENTAIRES (40 CARACTERES MAXIMUM)",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "EMAIL ",
];

const COL = {
  nom: 0,
  adresse1: 3,
  codePostal: 6,
  ville: 7,
  telephone: 8,
  montant: 22,
  departInterets: 23,
  reference: 24,
  numeroFacture: 25,
  dateFacture: 26,
  email: 95,
} as const;

const coupe = (s: string | null | undefined, max: number): string => (s ?? "").trim().slice(0, max).trim();

/** « 2026-05-06 » → « 06052026 » (format JJMMAAAA du cabinet). */
export function dateCabinet(iso: string): string {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}${m}${a}`;
}

/**
 * « VOS RÉFÉRENCES » (25 caractères maximum) : produit + échéance, comme dans
 * le fichier déjà transmis — « BUSINESS DEVELOP E6/12 », « PASS AL BARAKA E4/8 ».
 * Le produit est coupé à 16 caractères, ce qui laisse la place à « E12/16 ».
 */
export function referenceCabinet(produit: string | null, n: number | null, total: number | null): string {
  const base = coupe((produit || "").toUpperCase(), 16);
  const ech = n && total ? `E${n}/${total}` : "";
  return coupe([base, ech].filter(Boolean).join(" "), 25);
}

/** Montant en texte, point décimal, deux décimales : « 166.42 ». */
export function montantCabinet(m: number | string): string {
  return Number(m).toFixed(2);
}

/** La ligne du cabinet pour une facture REC (96 cellules, toutes en texte). */
export function ligneCabinet(f: FactureRecouvrement): string[] {
  const l = new Array<string>(ENTETE_CABINET.length).fill("");
  l[COL.nom] = coupe(f.client_nom.toUpperCase(), 30);
  l[COL.adresse1] = coupe(f.client_adresse?.toUpperCase(), 30);
  l[COL.codePostal] = coupe(f.client_code_postal, 5);
  l[COL.ville] = coupe(f.client_ville?.toUpperCase(), 30);
  l[COL.telephone] = coupe(f.client_telephone, 16);
  l[COL.montant] = montantCabinet(f.montant);
  l[COL.departInterets] = dateCabinet(f.date_facture);
  l[COL.reference] = referenceCabinet(f.produit_vente, f.payment_number, f.total_payments);
  l[COL.numeroFacture] = f.numero;
  l[COL.dateFacture] = dateCabinet(f.date_facture);
  l[COL.email] = (f.client_email ?? "").trim();
  return l;
}

function colonne(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Feuille au format du cabinet : l'en-tête puis une ligne par facture, triée par numéro. */
export function feuilleCabinet(factures: FactureRecouvrement[]): string[][] {
  const tri = [...factures].sort((a, b) => a.numero.localeCompare(b.numero));
  return [ENTETE_CABINET, ...tri.map(ligneCabinet)];
}

/**
 * Classeur .xlsx minimal (une feuille « Feuil1 », cellules texte en ligne).
 * Un .xlsx est une archive de quelques fichiers XML : pas besoin d'une
 * bibliothèque de plus, JSZip suffit.
 */
export async function classeurCabinet(factures: FactureRecouvrement[]): Promise<Blob> {
  return (await zipCabinet(factures)).generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Le même classeur, avant compression (sert aussi aux tests). */
export async function zipCabinet(factures: FactureRecouvrement[]): Promise<JSZip> {
  const lignes = feuilleCabinet(factures);
  const rows = lignes
    .map((cells, r) => {
      const c = cells
        .map((v, i) => (v === "" ? "" : `<c r="${colonne(i)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`))
        .join("");
      return `<row r="${r + 1}">${c}</row>`;
    })
    .join("");

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Feuil1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
  );
  return zip;
}

/** Nom du PDF dans un téléchargement : « REC0000022-NOM PRENOM.pdf ». */
export function nomFichierFacture(f: { numero: string; client_nom: string }): string {
  const nom = f.client_nom.toUpperCase().replace(/[^A-Z0-9 -]/g, "").replace(/\s+/g, " ").trim();
  return `${f.numero}-${nom || "CLIENT"}.pdf`;
}

/**
 * Une échéance peut partir en recouvrement si elle est impayée et échue :
 * en retard, perdue, ou en attente avec une date passée.
 */
export function peutPartirEnRecouvrement(p: { status: string; due_date: string }, aujourdhui = new Date()): boolean {
  if (p.status === "late" || p.status === "lost") return true;
  if (p.status !== "pending") return false;
  const jour = aujourdhui.toISOString().slice(0, 10);
  return p.due_date.slice(0, 10) <= jour;
}
