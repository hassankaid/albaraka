// ─────────────────────────────────────────────────────────────────────────
// Engendre le PDF des CGV depuis src/pages/legal/textes.ts.
//
//   node scripts/generer-cgv-pdf.mjs
//
// Pourquoi un script plutôt qu'un PDF déposé à la main : la page et le PDF
// doivent dire EXACTEMENT la même chose. Un client qui lit la page et en
// télécharge une autre version, c'est précisément le litige qu'on cherche à
// éviter. Ici, les deux sortent de la même source.
//
// Publier une version 2 des CGV :
//   1. modifier les textes dans src/pages/legal/textes.ts ;
//   2. changer DATE_MISE_A_JOUR et PDF_CGV (nouveau nom de fichier daté) ;
//   3. relancer ce script ;
//   4. LAISSER l'ancien PDF en place — c'est l'archive, et elle sert à
//      prouver ce qu'un client a accepté avant la mise à jour.
//
// Dépend de Chrome en mode headless, déjà utilisé pour les autres PDF.
// ─────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const CHROME =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const source = readFileSync("src/pages/legal/textes.ts", "utf-8");

/** Lit une constante exportée sous forme de chaîne. */
function constante(nom) {
  const m = source.match(new RegExp(`export const ${nom} = "([^"]+)"`));
  if (!m) throw new Error(`${nom} introuvable dans textes.ts`);
  return m[1];
}

const dateVersion = constante("DATE_MISE_A_JOUR");
const chemin = constante("PDF_CGV");

/** Les lignes des CGV, dans l'ordre, telles qu'elles sont publiées. */
const bloc = source.split("export const CGV: PageLegale = {")[1].split("];")[0];
const lignes = [...bloc.matchAll(/^\s*("(?:[^"\\]|\\.)*"),\s*$/gm)].map((m) => JSON.parse(m[1]));
if (lignes.length < 50) throw new Error(`seulement ${lignes.length} lignes lues : format inattendu`);

const echapper = (t) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const estTitre = (l) => /^Article\s\d+\s[–-]\s/.test(l);

const corps = lignes
  .map((l) => (estTitre(l) ? `<h2>${echapper(l)}</h2>` : `<p>${echapper(l)}</p>`))
  .join("\n");

const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Conditions générales de vente — ETHICARENA L.L.C-FZ</title>
<style>
  @page { size: A4; margin: 20mm 18mm 18mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Georgia, "Times New Roman", serif; color:#1a1a1a;
         font-size: 10.5pt; line-height: 1.55; }
  .entete { border-bottom: 1.5px solid #A8813A; padding-bottom: 8mm; margin-bottom: 8mm; }
  .marque { font-size: 9pt; letter-spacing:.2em; color:#A8813A; text-transform:uppercase; }
  h1 { font-size: 19pt; margin: 3mm 0 2mm; font-weight: normal; }
  .maj { font-size: 9pt; color:#666; }
  h2 { font-size: 11.5pt; margin: 6mm 0 2mm; color:#8a6a2f; font-weight: bold;
       page-break-after: avoid; }
  p { margin: 0 0 2.5mm; text-align: justify; }
  .pied { margin-top: 10mm; padding-top: 5mm; border-top: 1px solid #ddd;
          font-size: 8.5pt; color:#666; }
</style></head><body>
<div class="entete">
  <div class="marque">AL BARAKA — Écosystème de l'entrepreneuriat halal</div>
  <h1>Conditions générales de vente</h1>
  <div class="maj">Version du ${dateVersion} — ETHICARENA L.L.C-FZ</div>
</div>
${corps}
<div class="pied">
  ETHICARENA L.L.C-FZ — Licence n° 2422583.01<br>
  Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubaï, Émirats arabes unis<br>
  contact@ethicarena.com
</div>
</body></html>`;

const fichierHtml = join(tmpdir(), "cgv-albaraka.html");
writeFileSync(fichierHtml, html);

const sortie = join("public", chemin.replace(/^\//, ""));
mkdirSync(dirname(sortie), { recursive: true });

execFileSync(CHROME, [
  "--headless",
  "--disable-gpu",
  "--no-pdf-header-footer",
  `--print-to-pdf=${sortie}`,
  "--virtual-time-budget=4000",
  `file://${fichierHtml}`,
]);

console.log(`${lignes.length} lignes → ${sortie} (version du ${dateVersion})`);
