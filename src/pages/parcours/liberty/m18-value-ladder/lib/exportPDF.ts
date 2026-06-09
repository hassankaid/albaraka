/** Export « Carte d'écosystème » M18 — 4 sections via fenêtre d'impression HTML (remplace pdfmake). */
import { type M18State, LEVELS, LTV_MULTIPLE_TARGET, toIntPrice, fmtEur } from "./types";
import { computeLTV, getNiv, hasLT, getProgrammeNom } from "./validations";
import { effectiveEmails } from "./emails";

function esc(s: any): string { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function pdfSafe(s: any): string { return String(s || "").trim() || "—"; }
function dateStr(): string { const d = new Date(); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }

export function exportEcosystemePDF(state: M18State): void {
  const d = state.data;
  const ltvR = computeLTV(state);
  const eleve = state.signed_by || "—";
  const programmeNom = getProgrammeNom(state) || "Mon écosystème";
  const niche = (state.m1_data && state.m1_data.niche) || "";

  // Section 1 — échelle (HAUT → BAS)
  const ladderRows = [...LEVELS].reverse().map((lv) => {
    const n = getNiv(state, lv.key);
    const prix = lv.paid ? (toIntPrice(n.prix) > 0 ? fmtEur(toIntPrice(n.prix)) : "—") : "gratuit";
    const nomCell = pdfSafe(n.nom) + (lv.key === "mt" && n.format ? "<br><span class='fmt'>(" + esc(pdfSafe(n.format)) + ")</span>" : "");
    return `<tr><td class="tdLvl">${esc(lv.label.replace("Niveau ", "N"))}</td><td class="td">${nomCell}</td><td class="tdDim">${esc(lv.roleLabel)}</td><td class="tdPrix">${esc(prix)}</td></tr>`;
  }).join("");

  // Section 2 — transitions
  let trans = "";
  if (hasLT(state)) {
    trans += `<div class="transTitle">Low-Ticket → Middle-Ticket</div><div class="transBody">${esc(pdfSafe(d.transitions.lt_mt))}</div><div class="transMeta">Lien thématique : ${esc(pdfSafe(d.connexion_lt_mt))}</div>`;
  }
  trans += `<div class="transTitle">Middle-Ticket → High-Ticket</div><div class="transBody">${esc(pdfSafe(d.transitions.mt_ht))}</div>`;

  // Section 3 — LTV
  let ltvRows = ltvR.breakdown.map((b) => `<tr><td class="td">${esc(b.label + " (" + b.note + ")")}</td><td class="tdPrix">${esc(fmtEur(Math.round(b.val)))}</td></tr>`).join("");
  ltvRows += `<tr><td class="td">Prix d’entrée</td><td class="tdPrix">${esc(fmtEur(ltvR.entryPrice))}</td></tr>`;
  ltvRows += `<tr><td class="tdBold">LTV par client entrant</td><td class="tdBig">${esc(fmtEur(ltvR.ltv))}</td></tr>`;
  ltvRows += `<tr><td class="td">Multiple LTV / prix d’entrée (cible ≥ ${LTV_MULTIPLE_TARGET}×)</td><td class="tdPrix">${ltvR.multiple ? ltvR.multiple.toFixed(1) + "×" : "—"}</td></tr>`;

  // Section 4 — emails
  const seqs: [string, ReturnType<typeof effectiveEmails>][] = [];
  if (hasLT(state)) seqs.push(["Passage Low-Ticket → Middle-Ticket", effectiveEmails(state, "lt_mt")]);
  seqs.push(["Passage Middle-Ticket → High-Ticket", effectiveEmails(state, "mt_ht")]);
  const emailsHtml = seqs.map((s) => {
    const items = s[1].map((e, i) => `<div class="emailJour">Email ${i + 1} · ${esc(e.jour)}</div><div class="emailObjet">Objet : ${esc(pdfSafe(e.objet))}</div><div class="emailCorps">${esc(pdfSafe(e.corps))}</div>`).join("");
    return `<div class="transTitle" style="margin-top:10px">${esc(s[0])}</div>${items}`;
  }).join("");

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Carte d'écosystème — ${esc(programmeNom)}</title>
<style>
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', system-ui, sans-serif; color: #222; background: #fff; margin: 0; font-size: 10pt; }
.doc { max-width: 800px; margin: 0 auto; padding: 8px 0 28px; }
.brand { font-size: 9pt; color: #C9A84C; letter-spacing: 1px; font-weight: bold; }
.docTitle { font-size: 20pt; color: #080808; font-weight: bold; margin: 2pt 0 0; }
.docSub { font-size: 11pt; color: #666; margin: 2pt 0 12pt; }
.sectionTitle { font-size: 14pt; color: #8B6F2D; font-weight: bold; margin: 16pt 0 6pt; }
table { width: 100%; border-collapse: collapse; }
.ladder td, .ladder th { border: 1px solid #cccccc; padding: 3pt 6pt; vertical-align: top; }
th { font-size: 9pt; font-weight: bold; color: #8B6F2D; text-align: left; }
th.r, .tdPrix { text-align: right; }
.td { font-size: 10pt; }
.tdLvl { font-size: 10pt; font-weight: bold; color: #8B6F2D; }
.tdDim { font-size: 9pt; color: #666; }
.tdPrix { font-size: 10pt; font-weight: bold; }
.tdBold { font-size: 11pt; font-weight: bold; }
.tdBig { font-size: 16pt; font-weight: bold; color: #8B6F2D; text-align: right; }
.fmt { font-size: 8.5pt; color: #666; }
.ltv td { padding: 4pt 6pt; }
.transTitle { font-size: 11pt; font-weight: bold; color: #8B6F2D; margin: 4pt 0 2pt; }
.transBody { font-size: 10pt; color: #333; margin: 0 0 6pt; white-space: pre-line; }
.transMeta { font-size: 9pt; font-style: italic; color: #666; margin: 0 0 8pt; }
.sec4 { page-break-before: always; }
.emailJour { font-size: 8.5pt; font-weight: bold; color: #C9A84C; letter-spacing: 0.5px; margin: 7pt 0 1pt; }
.emailObjet { font-size: 10pt; font-weight: bold; color: #222; margin: 0 0 2pt; }
.emailCorps { font-size: 9.5pt; color: #333; line-height: 1.25; margin: 0 0 4pt; white-space: pre-line; }
.footnote { font-size: 8.5pt; font-style: italic; color: #666; margin-top: 16pt; }
</style></head><body>
<div class="doc">
  <div class="brand">AL BARAKA · LIBERTY</div>
  <div class="docTitle">Carte d’écosystème — Value Ladder</div>
  <div class="docSub">${esc(programmeNom)}${niche ? "  ·  " + esc(niche) : ""}</div>

  <div class="sectionTitle">1 · L’échelle de valeur</div>
  <table class="ladder"><thead><tr><th>Niveau</th><th>Offre</th><th>Rôle</th><th class="r">Prix</th></tr></thead><tbody>${ladderRows}</tbody></table>

  <div class="sectionTitle">2 · Les passages d’ascension</div>
  ${trans}

  <div class="sectionTitle">3 · La valeur vie client (LTV)</div>
  <table class="ltv"><tbody>${ltvRows}</tbody></table>

  <div class="sec4">
    <div class="sectionTitle">4 · Tes séquences email d’ascension</div>
    <div class="transMeta">Rédigées d’après ta niche et tes offres. Remplace [prénom] et [lien] par tes champs de fusion dans ton outil d’emailing.</div>
    ${emailsHtml}
  </div>

  <div class="footnote">Règle d’or : pilote ton acquisition sur ta LTV, pas sur le prix d’une offre isolée. Chaque marche prépare la suivante.</div>
  <div class="footnote">Verrouillé par ${esc(eleve)} le ${esc(dateStr())}.</div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`);
  w.document.close();
}
