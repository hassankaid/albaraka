// ─────────────────────────────────────────────────────────────────────────
// Engendre le PDF du questionnaire clients : synthèse chiffrée, puis une
// page par répondant.
//
//   node scripts/generer-questionnaire-pdf.mjs <reponses.json> [sortie.pdf]
//
// Le JSON attendu est le contenu de la vue `questionnaire_resultats`, filtré
// des invitations de test et exclues. Il contient des données personnelles :
// il ne doit JAMAIS être déposé dans ce dépôt, qui est public. Ce script, lui,
// ne contient ni données ni clé — seulement la mise en page.
//
// Les libellés des questions sont LUS depuis la source de l'application
// (src/pages/public/questionnaire/questions.ts) plutôt que recopiés : un
// questionnaire dont le PDF n'affiche pas les mêmes intitulés que l'écran
// vaut moins que pas de PDF du tout.
//
// Dépend de Chrome headless, comme les autres PDF du projet.
// ─────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";

const CHROME =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const [, , fichierJson, sortieArg] = process.argv;
if (!fichierJson) {
  console.error("usage : node scripts/generer-questionnaire-pdf.mjs <reponses.json> [sortie.pdf]");
  process.exit(1);
}
const sortie = resolve(sortieArg ?? "questionnaire-clients.pdf");
const reponses = JSON.parse(readFileSync(resolve(fichierJson), "utf-8"));
if (!Array.isArray(reponses) || reponses.length === 0) throw new Error("aucune réponse dans le JSON");

// ── Les questions, lues depuis la source de l'app ─────────────────────────
const src = readFileSync("src/pages/public/questionnaire/questions.ts", "utf-8");
const blocSections = src.slice(src.indexOf("export const SECTIONS"), src.indexOf("\n];", src.indexOf("export const SECTIONS")));

const SECTIONS = [];
for (const bloc of blocSections.split(/\n  \{\n    titre: /).slice(1)) {
  const titre = bloc.match(/^"((?:[^"\\]|\\.)*)"/)?.[1];
  if (!titre) continue;
  const questions = [];
  for (const m of bloc.matchAll(/\{ id: "(q\d+)", numero: (\d+), obligatoire: (true|false), type: "(\w+)"(?:, min: (\d+), max: (\d+))?,\s*\n\s*titre: "((?:[^"\\]|\\.)*)"(?:,\s*\n?\s*options: \[([^\]]*)\])?/g)) {
    questions.push({
      id: m[1],
      numero: Number(m[2]),
      type: m[4],
      min: m[5] ? Number(m[5]) : undefined,
      max: m[6] ? Number(m[6]) : undefined,
      titre: JSON.parse(`"${m[7]}"`),
      options: m[8]
        ? [...m[8].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((o) => JSON.parse(`"${o[1]}"`))
        : undefined,
    });
  }
  SECTIONS.push({ titre: JSON.parse(`"${titre}"`), questions });
}
const QUESTIONS = SECTIONS.flatMap((s) => s.questions).sort((a, b) => a.numero - b.numero);
if (QUESTIONS.length !== 29) throw new Error(`${QUESTIONS.length} questions lues au lieu de 29 : le format de questions.ts a changé`);

// ── Statistiques ──────────────────────────────────────────────────────────
const valeurs = (q) =>
  reponses
    .map((r) => r[q.id])
    .filter((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0));

/** Répartition d'une question à choix, dans l'ordre des options déclarées. */
function repartition(q) {
  const brut = new Map();
  let total = 0;
  for (const v of valeurs(q)) {
    for (const item of Array.isArray(v) ? v : [v]) {
      brut.set(String(item), (brut.get(String(item)) ?? 0) + 1);
    }
    total++;
  }
  const ordre = q.options ?? [...brut.keys()].sort((a, b) => brut.get(b) - brut.get(a));
  const lignes = ordre
    .filter((o) => brut.has(o))
    .map((o) => ({ label: o, n: brut.get(o), pct: Math.round((brut.get(o) / total) * 100) }));
  for (const [k, n] of brut) {
    if (!ordre.includes(k)) lignes.push({ label: k, n, pct: Math.round((n / total) * 100) });
  }
  return { lignes, total };
}

/** Moyenne d'une échelle, à une décimale. */
function moyenne(q) {
  const n = valeurs(q).map(Number).filter((v) => Number.isFinite(v));
  return n.length ? { val: (n.reduce((a, b) => a + b, 0) / n.length).toFixed(1), n: n.length } : null;
}

/** NPS : promoteurs (9-10) moins détracteurs (0-6), en points. */
function nps() {
  const n = reponses.map((r) => Number(r.q26)).filter((v) => Number.isFinite(v));
  if (!n.length) return null;
  const p = n.filter((v) => v >= 9).length;
  const d = n.filter((v) => v <= 6).length;
  return { val: Math.round(((p - d) / n.length) * 100), promoteurs: p, detracteurs: d, n: n.length };
}

const ech = (txt) =>
  String(txt ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Un texte libre, sauts de ligne préservés. Vide si la personne n'a rien dit. */
const libre = (v) => {
  const t = String(v ?? "").trim();
  return t ? ech(t).replace(/\n/g, "<br>") : '<span class="vide">— pas de réponse</span>';
};

const afficher = (q, r) => {
  const v = r[q.id];
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0))
    return '<span class="vide">— pas de réponse</span>';
  if (Array.isArray(v)) return ech(v.join(" · "));
  if (q.type === "echelle") return `<strong>${ech(v)}</strong> / ${q.max}`;
  return ech(v);
};

// ── Mise en page ──────────────────────────────────────────────────────────
const dateJour = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const periode = (() => {
  const d = reponses.map((r) => r.soumis_le).filter(Boolean).sort();
  const fmt = (s) => new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return d.length ? `${fmt(d[0])} – ${fmt(d[d.length - 1])}` : "";
})();

const barre = (pct) => `<span class="barre"><span style="width:${pct}%"></span></span>`;

// Synthèse : une carte par question, les échelles mises en avant.
const echelles = QUESTIONS.filter((q) => q.type === "echelle");
const choix = QUESTIONS.filter((q) => q.type === "unique" || q.type === "multiple");
const textes = QUESTIONS.filter((q) => q.type === "texte" || q.type === "texte_long");

const n = nps();
const cartesEchelles = echelles
  .map((q) => {
    const m = moyenne(q);
    return `<div class="kpi"><div class="kpi-val">${m ? m.val : "—"}<span class="kpi-max">/${q.max}</span></div>
      <div class="kpi-lib">Q${q.numero} · ${ech(q.titre)}</div>
      <div class="kpi-n">${m ? m.n : 0} réponses</div></div>`;
  })
  .join("");

const blocsChoix = choix
  .map((q) => {
    const { lignes, total } = repartition(q);
    if (!lignes.length) return "";
    return `<div class="qbloc">
      <div class="qtitre"><span class="qnum">Q${q.numero}</span>${ech(q.titre)}
        ${q.type === "multiple" ? '<span class="multi">plusieurs réponses possibles</span>' : ""}</div>
      <table class="rep">${lignes
        .map(
          (l) =>
            `<tr><td class="lab">${ech(l.label)}</td><td class="bar">${barre(l.pct)}</td>
             <td class="pct">${l.pct}&nbsp;%</td><td class="eff">${l.n}</td></tr>`,
        )
        .join("")}</table>
      <div class="qpied">${total} répondant${total > 1 ? "s" : ""}</div>
    </div>`;
  })
  .join("");

const tauxTexte = textes
  .map((q) => {
    const rempli = valeurs(q).length;
    return `<tr><td class="lab">Q${q.numero} · ${ech(q.titre)}</td>
      <td class="pct">${Math.round((rempli / reponses.length) * 100)}&nbsp;%</td>
      <td class="eff">${rempli}</td></tr>`;
  })
  .join("");

// Une fiche par répondant.
/** Les champs à texte libre, pour jauger le volume d'une fiche. */
const LIBRES_IDS = QUESTIONS.filter((q) => q.type === "texte_long").map((q) => q.id);

const fiches = reponses
  .map((r, i) => {
    const nom = r.nom_complet || r.prenom || "Sans nom";
    const date = r.soumis_le
      ? new Date(r.soumis_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const corps = SECTIONS.map((s) => {
      const qs = s.questions.filter((q) => {
        if (q.id === "q22" && r.q21 !== "Oui") return false;
        return true;
      });
      // Les réponses courtes vont en grille deux colonnes, les textes libres
      // occupent toute la largeur : c'est ce qui fait tenir une fiche sur une
      // seule page, et une fiche par page était la demande.
      const morceaux = [];
      let tampon = [];
      const vider = () => {
        if (tampon.length) morceaux.push(`<div class="fgrille">${tampon.join("")}</div>`);
        tampon = [];
      };
      for (const q of qs) {
        if (q.type === "texte_long") {
          vider();
          morceaux.push(`<div class="flong">
            <div class="fqt"><span class="qnum">Q${q.numero}</span>${ech(q.titre)}</div>
            <div class="fqr">${libre(r[q.id])}</div>
          </div>`);
        } else {
          tampon.push(`<div class="fq">
            <div class="fqt"><span class="qnum">Q${q.numero}</span>${ech(q.titre)}</div>
            <div class="fqr">${afficher(q, r)}</div>
          </div>`);
        }
      }
      vider();
      return `<div class="fsec">${ech(s.titre)}</div>` + morceaux.join("");
    }).join("");
    // Une fiche par page est la règle. Les rares répondants très prolixes
    // resserrent d'un cran plutôt que de déborder — mais on ne coupe JAMAIS
    // un verbatim pour gagner de la place : au-delà d'un certain volume, la
    // fiche prend deux pages, et c'est le bon compromis.
    const volume = LIBRES_IDS.reduce((t, id) => t + String(r[id] ?? "").length, 0);
    const densite = volume > 1200 ? " dense" : "";
    return `<section class="fiche${densite}">
      <div class="fentete">
        <div><div class="fnom">${ech(nom)}</div>
          <div class="fmeta">${ech(r.formation_fichier ?? "")}${date ? ` · répondu le ${date}` : ""}</div></div>
        <div class="fnum">${i + 1} / ${reponses.length}</div>
      </div>
      ${corps}
    </section>`;
  })
  .join("");

const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Questionnaire clients — AL BARAKA</title>
<style>
  @page { size: A4; margin: 14mm 15mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  /* La police emoji est indispensable : plusieurs verbatims en contiennent,
     et sans elle Georgia laisse un blanc à la place. Le texte, lui, reste
     intact dans tous les cas. */
  body { font-family: Georgia, "Times New Roman", "Apple Color Emoji",
         "Segoe UI Emoji", "Noto Color Emoji", serif;
         color: #1a1a1a; font-size: 9.5pt; line-height: 1.45; }

  .marque { font-size: 8pt; letter-spacing: .22em; color: #A8813A; text-transform: uppercase; }
  h1 { font-size: 21pt; font-weight: normal; margin: 3mm 0 2mm; }
  h2 { font-size: 11pt; color: #8a6a2f; text-transform: uppercase; letter-spacing: .05em;
       margin: 7mm 0 3mm; page-break-after: avoid; }
  .sous { font-size: 9pt; color: #777; }
  .regle { height: 1.5px; background: #A8813A; margin: 5mm 0 6mm; }

  .garde { page-break-after: always; }
  .chiffres { display: flex; gap: 4mm; margin: 6mm 0; }
  .gros { flex: 1; padding: 5mm 4mm; background: #faf8f3; border: 1px solid #e5e1d7; text-align: center; }
  .gros b { display: block; font-size: 22pt; color: #8a6a2f; font-weight: normal; }
  .gros span { font-size: 8.5pt; color: #777; }

  .kpis { display: flex; flex-wrap: wrap; gap: 3mm; margin-bottom: 4mm; }
  .kpi { flex: 1 1 40%; padding: 3.5mm 4mm; background: #faf8f3; border-left: 2.5px solid #A8813A; }
  .kpi-val { font-size: 16pt; color: #8a6a2f; }
  .kpi-max { font-size: 9pt; color: #999; }
  .kpi-lib { font-size: 8.5pt; line-height: 1.35; margin-top: 1mm; }
  .kpi-n { font-size: 7.5pt; color: #999; margin-top: .8mm; }

  .qbloc { margin-bottom: 5mm; page-break-inside: avoid; }
  .qtitre { font-size: 9.5pt; font-weight: bold; margin-bottom: 1.5mm; }
  .qnum { color: #A8813A; margin-right: 1.8mm; font-weight: bold; }
  .multi { font-size: 7.5pt; color: #999; font-weight: normal; font-style: italic; margin-left: 2mm; }
  table.rep { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table.rep td { padding: .8mm 0; vertical-align: middle; }
  td.lab { width: 46%; padding-right: 3mm; }
  td.bar { width: 34%; }
  td.pct { width: 11%; text-align: right; padding-right: 2mm; white-space: nowrap; }
  td.eff { width: 9%; text-align: right; color: #999; font-size: 8pt; }
  .barre { display: block; height: 3.2mm; background: #eee9dd; position: relative; }
  .barre > span { position: absolute; left: 0; top: 0; bottom: 0; background: #C9A04E; }
  .qpied { font-size: 7.5pt; color: #aaa; margin-top: 1mm; }

  /* Une fiche par répondant : saut de page avant chacune. */
  /* Une fiche = une page. Tout ici est réglé pour ça : la grille deux
     colonnes, les corps réduits, les marges serrées. Si on desserre, on
     repasse à deux pages par client — le test de fin de script le dira. */
  .fiche { page-break-before: always; page-break-inside: avoid; }
  .fentete { display: flex; justify-content: space-between; align-items: flex-end;
             border-bottom: 1.2px solid #A8813A; padding-bottom: 1.8mm; margin-bottom: 2.5mm; }
  .fnom { font-size: 13pt; }
  .fmeta { font-size: 7.5pt; color: #777; margin-top: .6mm; }
  .fnum { font-size: 7.5pt; color: #A8813A; }
  .fsec { font-size: 7pt; text-transform: uppercase; letter-spacing: .08em; color: #A8813A;
          margin: 2.2mm 0 1mm; border-bottom: .5px solid #eee9dd; padding-bottom: .5mm;
          page-break-after: avoid; }
  .fgrille { display: grid; grid-template-columns: 1fr 1fr; gap: .4mm 5mm; }
  .fq { font-size: 7.6pt; line-height: 1.3; padding: .35mm 0; page-break-inside: avoid; }
  .fq .fqt { color: #666; display: inline; }
  .fq .fqr { display: inline; }
  .fq .fqt::after { content: " "; }
  .flong { font-size: 7.6pt; page-break-inside: avoid; margin: .8mm 0; }
  .flong .fqt { color: #666; line-height: 1.3; }
  .flong .fqr { margin-top: .5mm; padding: 1.2mm 2mm; background: #faf8f3;
                border-left: 1.5px solid #e5e1d7; text-align: justify; line-height: 1.35; }
  .dense .fq, .dense .flong { font-size: 6.9pt; line-height: 1.25; }
  .dense .flong .fqr { padding: 1mm 1.6mm; line-height: 1.28; }
  .dense .fsec { margin: 1.6mm 0 .7mm; }
  .vide { color: #bbb; font-style: italic; }

  .pied { position: running(pied); }
</style></head><body>

<div class="garde">
  <div class="marque">AL BARAKA — Questionnaire clients</div>
  <h1>Synthèse et réponses individuelles</h1>
  <div class="sous">Campagne close — réponses du ${periode}<br>Document établi le ${dateJour}</div>
  <div class="regle"></div>

  <div class="chiffres">
    <div class="gros"><b>${reponses.length}</b><span>questionnaires complétés</span></div>
    ${n ? `<div class="gros"><b>${n.val > 0 ? "+" : ""}${n.val}</b><span>NPS — ${n.promoteurs} promoteurs, ${n.detracteurs} détracteurs</span></div>` : ""}
    <div class="gros"><b>${QUESTIONS.length}</b><span>questions posées</span></div>
  </div>

  <h2>Les notes</h2>
  <div class="kpis">${cartesEchelles}</div>

  <h2>Taux de réponse aux questions ouvertes</h2>
  <table class="rep">${tauxTexte}</table>

  <p style="margin-top:8mm;font-size:8.5pt;color:#777;">
    Les pages suivantes présentent d'abord la répartition question par question,
    puis une page par répondant, dans l'ordre de soumission. Les verbatims sont
    reproduits tels qu'ils ont été écrits, sans correction.
  </p>
</div>

<h2>Répartition, question par question</h2>
${blocsChoix}

${fiches}
</body></html>`;

const fichierHtml = join(tmpdir(), "questionnaire-albaraka.html");
writeFileSync(fichierHtml, html);
mkdirSync(dirname(sortie), { recursive: true });

execFileSync(CHROME, [
  "--headless",
  "--disable-gpu",
  "--no-pdf-header-footer",
  `--print-to-pdf=${sortie}`,
  "--virtual-time-budget=8000",
  `file://${fichierHtml}`,
]);

console.log(`${reponses.length} répondants · ${QUESTIONS.length} questions → ${sortie}`);
console.log(`HTML intermédiaire : ${fichierHtml}`);
