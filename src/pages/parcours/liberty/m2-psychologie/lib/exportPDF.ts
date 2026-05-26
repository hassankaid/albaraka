/**
 * Export PDF du brief stratégique M2.
 * Réplique du pattern M1 : nouvelle fenêtre + window.print().
 */

import type { M2State } from "./types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportM2PDF(state: M2State): void {
  const sig = state.signed;
  const avatar = state.m1?.avatar?.name || "Avatar";
  const niche = state.m1?.niche?.sub_niche || "—";
  const market = state.m1?.market || "—";
  const today = new Date();
  const dateStr = sig.date
    ? new Date(sig.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const d = state.data;
  const sc = state.scores;
  const avg = (() => {
    const v = Object.values(sc).filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  })();

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;

  w.document.write(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<title>M2 — Brief stratégique — ${esc(sig.name || "Liberty")}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: white; margin: 0; padding: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc { max-width: 800px; margin: 0 auto; padding: 12px 0 32px; }
.doc-header { border-bottom: 1.5px solid #C9A84C; padding-bottom: 12px; margin-bottom: 24px;
  display: flex; justify-content: space-between; align-items: flex-end; }
.doc-title { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
.doc-sub { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; font-weight: 600; }
.section { margin-bottom: 20px; page-break-inside: avoid; }
.section-title { font-size: 13px; font-weight: 700; color: #8B7635; text-transform: uppercase;
  letter-spacing: 0.1em; margin: 0 0 8px; }
.field { margin-bottom: 10px; }
.field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: #8B7635; margin-bottom: 3px; }
.field-content { font-size: 12px; line-height: 1.65; padding: 8px 12px; background: #FAF6E8;
  border-left: 3px solid #C9A84C; border-radius: 4px; }
.scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.score-cell { padding: 8px; background: #FFF8E1; border: 1px solid #E8DCB0; border-radius: 4px;
  text-align: center; }
.score-cell-label { font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #8B7635; }
.score-cell-value { font-size: 16px; font-weight: 700; margin-top: 2px; }
.score-cell.good { background: #E8F5E8; border-color: #50C878; }
.score-cell.good .score-cell-value { color: #2E7D32; }
.score-cell.ok { background: #FFF8E1; border-color: #FFB450; }
.score-cell.ok .score-cell-value { color: #E65100; }
.score-cell.bad { background: #FFEBEE; border-color: #E86B6B; }
.score-cell.bad .score-cell-value { color: #C62828; }
.engagement-pdf { padding: 16px 18px; background: #FFF8E1; border: 2px solid #C9A84C;
  border-radius: 6px; page-break-inside: avoid; }
.engagement-pdf-text { font-size: 12px; line-height: 1.7; margin-bottom: 14px; }
.engagement-pdf-sig { border-top: 1px solid #C9A84C; padding-top: 10px;
  display: flex; justify-content: space-between; font-size: 12px; }
.engagement-pdf-name { font-weight: 700; font-style: italic; font-size: 14px; }
.doc-footer { margin-top: 28px; padding-top: 12px; border-top: 0.5px solid #C9A84C;
  font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.16em; }
</style>
</head><body>
<div class="doc">
  <div class="doc-header">
    <div>
      <h1 class="doc-title">Brief stratégique — Module 2 LIBERTY</h1>
      <div class="doc-sub">Psychologie de l'acheteur · ${esc(avatar)} · ${esc(niche)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#555;">${esc(dateStr)}</div>
      <div style="font-size:24px;font-weight:700;color:#C9A84C;margin-top:4px;">${avg}/100</div>
      <div style="font-size:9px;color:#8B7635;text-transform:uppercase;letter-spacing:0.08em;">Score moyen</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📊 Scores par étape</div>
    <div class="scores">
      ${Object.entries(sc)
        .map(([k, s]) => {
          const intent = s === null ? "" : s >= 80 ? "good" : s >= 60 ? "ok" : "bad";
          return `<div class="score-cell ${intent}"><div class="score-cell-label">${esc(k)}</div><div class="score-cell-value">${s ?? "—"}</div></div>`;
        })
        .join("")}
    </div>
  </div>

  <div class="section">
    <div class="section-title">🎯 Brief stratégique (Étape 8 — synthèse finale)</div>
    <div class="field">
      <div class="field-label">Positionnement</div>
      <div class="field-content">${esc(d.step8.positionnement)}</div>
    </div>
    <div class="field">
      <div class="field-label">Hook principal</div>
      <div class="field-content">${esc(d.step8.hook_principal)}</div>
    </div>
    <div class="field">
      <div class="field-label">Levier émotionnel secondaire</div>
      <div class="field-content">${esc(d.step8.levier_secondaire)}</div>
    </div>
    <div class="field">
      <div class="field-label">Biais-killer</div>
      <div class="field-content">${esc(d.step8.biais_killer)}</div>
    </div>
    <div class="field">
      <div class="field-label">Stratégie pour la phase</div>
      <div class="field-content">${esc(d.step8.phase_strategy)}</div>
    </div>
    <div class="field">
      <div class="field-label">Directives copywriting</div>
      <div class="field-content">${esc(d.step8.directives_copywriting)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">⚡ Top 3 douleurs présentes (Étape 1)</div>
    ${d.step1.pains
      .filter((p) => p.text.trim())
      .slice(0, 3)
      .map(
        (p, i) => `
      <div class="field">
        <div class="field-label">Douleur ${i + 1}</div>
        <div class="field-content"><strong>${esc(p.text)}</strong><br/><em>${esc(p.scene)}</em></div>
      </div>
    `,
      )
      .join("")}
  </div>

  <div class="section">
    <div class="section-title">✨ Top 3 désirs futurs + identité aspirationnelle (Étape 2)</div>
    ${d.step2.desires
      .filter((p) => p.text.trim())
      .slice(0, 3)
      .map(
        (p, i) => `
      <div class="field">
        <div class="field-label">Désir ${i + 1}</div>
        <div class="field-content"><strong>${esc(p.text)}</strong><br/><em>${esc(p.scene)}</em></div>
      </div>
    `,
      )
      .join("")}
    <div class="field">
      <div class="field-label">Identité aspirationnelle</div>
      <div class="field-content">${esc(d.step2.identity)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🧠 Biais cognitifs activés (Étape 5)</div>
    ${d.step5.top3
      .filter((b) => b.bias.trim())
      .map(
        (b, i) => `
      <div class="field">
        <div class="field-label">Biais ${i + 1} — ${esc(b.bias)}</div>
        <div class="field-content"><strong>Pourquoi dominant :</strong> ${esc(b.why_dominant)}<br/><strong>Comment activer :</strong> ${esc(b.how_activate)}</div>
      </div>
    `,
      )
      .join("")}
  </div>

  <div class="section">
    <div class="section-title">🗺️ Phase d'achat (Étape 6)</div>
    <div class="field">
      <div class="field-label">Phase identifiée</div>
      <div class="field-content"><strong>${esc(d.step6.phase || "—")}</strong> — ${esc(d.step6.justif)}</div>
    </div>
    <div class="field">
      <div class="field-label">Actions concrètes</div>
      <div class="field-content">${esc(d.step6.actions)}</div>
    </div>
  </div>

  <div class="engagement-pdf">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8B7635;margin-bottom:8px;">⚖ Engagement écrit</div>
    <div class="engagement-pdf-text">
      Je, <strong>${esc(sig.name || "[NOM]")}</strong>, m'engage à utiliser ce brief stratégique pour produire le copywriting du Module 3 — sans dériver vers des angles manipulatoires, des promesses surréalistes ou des biais cognitifs non éthiques.
    </div>
    <div class="engagement-pdf-sig">
      <div class="engagement-pdf-name">${esc(sig.name || "[Signature]")}</div>
      <div>${esc(dateStr)}</div>
    </div>
  </div>

  <div class="doc-footer">AL BARAKA · LIBERTY · Module 2 — Psychologie · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
