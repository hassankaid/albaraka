/** Export PDF M7 — audit trail multi-pages avec scores 6 étapes. */

import type { M7State, PedaStepKey } from "./types";
import { PEDA_STEPS, GARANTIE_TYPES } from "./types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const STEP_LABELS: Record<PedaStepKey, string> = {
  type_garantie: "1 · Type de garantie",
  promesse_garantie: "2 · Promesse mesurable",
  conditions_client: "3 · Conditions client",
  math_garantie: "4 · Math rentabilité",
  expose_garantie: "5 · Pitch d'exposition",
  termes_conditions: "6 · Termes & Conditions",
};

export function exportM7PDF(state: M7State): void {
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const ht = state.m4_data?.ht?.name || state.m3_data?.hero_mecanisme_nom || "—";
  const today = new Date();
  const dateStr = state.signed_at
    ? new Date(state.signed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const validScores = PEDA_STEPS.map((k) => state.scores[k]).filter((s) => s !== null) as number[];
  const avg = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

  const stepSections = PEDA_STEPS.map((k) => {
    const score = state.scores[k];
    const fb = state.lastFb[k];
    const forced = state.forced[k];
    const cls = score === null ? "neutral" : score >= 80 ? "good" : score >= 60 ? "warn" : "bad";
    return `<div class="step-section ${cls} pdf-keep">
      <div class="step-head">
        <span class="step-label">${esc(STEP_LABELS[k])}</span>
        <span class="step-score">${score ?? "—"}/100${forced ? ' <em class="forced">(forcé)</em>' : ""}</span>
      </div>
      ${fb?.verdict ? `<div class="step-verdict">${esc(fb.verdict)}</div>` : ""}
      ${fb?.strengths && fb.strengths.length ? `<div class="block good"><div class="block-title">✓ Forces</div><ul>${fb.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
      ${fb?.weaknesses && fb.weaknesses.length ? `<div class="block warn"><div class="block-title">✗ Faiblesses</div><ul>${fb.weaknesses.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
      ${fb?.suggestions && fb.suggestions.length ? `<div class="block sugg"><div class="block-title">→ Suggestions</div><ul>${fb.suggestions.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
    </div>`;
  }).join("");

  const d = state.data;
  const typeMeta = d.type_garantie.type_choisi ? GARANTIE_TYPES[d.type_garantie.type_choisi] : null;

  const dataSections = `
    <div class="section pdf-keep">
      <div class="section-title">1 · Type de garantie · ${esc(typeMeta?.label || "—")}</div>
      <div class="field-content"><strong>Formule :</strong> ${esc(typeMeta?.formule || "—")}</div>
      <div class="field-content"><strong>Justification :</strong> ${esc(d.type_garantie.justification)}</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">2 · Promesse mesurable</div>
      <div class="field-content"><strong>Résultat :</strong> ${esc(d.promesse_garantie.resultat)}</div>
      <div class="field-content"><strong>Délai :</strong> ${d.promesse_garantie.duree_valeur} ${esc(d.promesse_garantie.duree_unite)}</div>
      <div class="field-content"><strong>Critère objectif :</strong> ${esc(d.promesse_garantie.critere_objectif)}</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">3 · Conditions client · bouclier anti-abus</div>
      <div class="field-content" style="white-space:pre-wrap;">${esc(d.conditions_client.conditions_text)}</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">4 · Math rentabilité · Net ${d.math_garantie.net_positif > 0 ? "+" : ""}${d.math_garantie.net_positif} clients</div>
      <div class="field-content">Clients initiaux : <strong>${d.math_garantie.clients_initiaux}</strong> · Delta : <strong>+${d.math_garantie.delta_estime}</strong> · Taux refund : <strong>${d.math_garantie.taux_refund_pct}%</strong></div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">5 · Pitch d'exposition</div>
      <div class="field-content"><strong>Pitch en call :</strong> ${esc(d.expose_garantie.pitch_text)}</div>
      <div class="field-content"><strong>Formule marketing :</strong> ${esc(d.expose_garantie.formule_marketing)}</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">6 · Termes & Conditions</div>
      <div class="field-content" style="white-space:pre-wrap;">${esc(d.termes_conditions.tnc_text)}</div>
      <div class="field-content"><strong>Statut vendeur :</strong> ${esc(d.termes_conditions.vendeur_statut)}</div>
    </div>
  `;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="color-scheme" content="light"><style>:root{color-scheme:only light}</style>
<title>M7 — Garantie — ${esc(state.signed_by || "Liberty")}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc { max-width: 800px; margin: 0 auto; padding: 12px 0 32px; }
.doc-header { border-bottom: 1.5px solid #C9A84C; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
.doc-title { font-size: 20px; font-weight: 700; margin: 0; }
.doc-sub { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; font-weight: 600; }
.section { margin-bottom: 22px; page-break-inside: avoid; }
.section-title { font-size: 13px; font-weight: 700; color: #8B7635; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px; }
.field-content { font-size: 11.5px; line-height: 1.55; padding: 8px 12px; background: #FAF6E8; border-left: 3px solid #C9A84C; border-radius: 4px; margin-bottom: 6px; }
.step-section { margin-bottom: 14px; padding: 12px 14px; border-radius: 6px; page-break-inside: avoid; }
.step-section.good { background: #EEF7E8; border: 1px solid #7FB069; }
.step-section.warn { background: #FFF8E1; border: 1px solid #E8C770; }
.step-section.bad { background: #FBE9E9; border: 1px solid #E86B6B; }
.step-section.neutral { background: #F5F5F5; border: 1px solid #CCC; }
.step-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 6px; }
.step-verdict { font-style: italic; font-size: 11.5px; color: #555; margin-bottom: 8px; }
.block { padding: 6px 10px; margin-top: 6px; border-radius: 4px; font-size: 11px; }
.block.good { background: rgba(127,176,105,0.15); }
.block.warn { background: rgba(232,180,80,0.15); }
.block.sugg { background: rgba(201,168,76,0.15); }
.block-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; color: #555; }
.block ul { margin: 0; padding-left: 18px; line-height: 1.5; }
.engagement-pdf { padding: 16px 18px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; margin-top: 24px; }
.engagement-pdf-text { font-size: 12px; line-height: 1.7; margin-bottom: 14px; }
.engagement-pdf-sig { border-top: 1px solid #C9A84C; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
.engagement-pdf-name { font-weight: 700; font-style: italic; font-size: 14px; }
.doc-footer { margin-top: 28px; padding-top: 12px; border-top: 0.5px solid #C9A84C; font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.16em; }
</style></head><body>
<div class="doc">
  <div class="doc-header">
    <div>
      <h1 class="doc-title">Construction Garantie — Module 7 LIBERTY</h1>
      <div class="doc-sub">Avatar : ${esc(avatar)} · HT : ${esc(ht)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#555;">${esc(dateStr)}</div>
      <div style="font-size:24px;font-weight:700;color:#C9A84C;margin-top:4px;">${avg}/100</div>
      <div style="font-size:9px;color:#8B7635;text-transform:uppercase;letter-spacing:0.08em;">Score moyen 6 étapes</div>
    </div>
  </div>

  <h2 style="font-size:14px;color:#8B7635;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.1em;">Audit IA détaillé</h2>
  ${stepSections}

  <h2 style="font-size:14px;color:#8B7635;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.1em;">Données saisies</h2>
  ${dataSections}

  <div class="engagement-pdf pdf-keep">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8B7635;margin-bottom:8px;">⚖ Engagement écrit</div>
    <div class="engagement-pdf-text">
      Je, <strong>${esc(state.signed_by || "[NOM]")}</strong>, m'engage à respecter LITTÉRALEMENT cette garantie telle qu'écrite —
      sans formuler verbalement de promesse différente, sans modifier les conditions a posteriori, et en exécutant le remboursement
      ou la continuité dans les délais convenus si un client la déclenche dans les conditions prévues.
    </div>
    <div class="engagement-pdf-sig">
      <div class="engagement-pdf-name">${esc(state.signed_by || "[Signature]")}</div>
      <div>${esc(dateStr)}</div>
    </div>
  </div>

  <div class="doc-footer">AL BARAKA · LIBERTY · Module 7 — Garantie · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
