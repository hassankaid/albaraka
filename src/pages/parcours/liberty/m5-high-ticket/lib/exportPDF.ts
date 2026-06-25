/** Export PDF M5 — audit trail IA multi-pages avec forces/faiblesses/suggestions par étape. */

import type { M5State, PedaStepKey } from "./types";
import { CONDITION_AXES, PEDA_STEPS, STEPS_META } from "./types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const STEP_LABELS: Record<PedaStepKey, string> = {
  pont: "Le pont (A → B)",
  conditions: "4 conditions Hormozi",
  eatcomplex: "Eat the Complexity",
  structure: "Structure 12 sem / 90 j",
  conviction: "Conviction intérieure",
};

export function exportM5PDF(state: M5State): void {
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const niche = state.m1_data?.sous_niche_2?.phrase_finale || state.m1_data?.sous_niche_2?.phrase || "—";
  const ht = state.m4_data?.ht?.name || state.m3_data?.hero_mecanisme_nom || "—";
  const htPrice = state.m4_data?.ht?.price || state.m3_data?.prix_display || "—";
  const today = new Date();
  const dateStr = state.signed_at
    ? new Date(state.signed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const validScores = PEDA_STEPS.map((k) => state.scores[k]).filter((s) => s !== null) as number[];
  const avg = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

  // Sections par étape avec audit IA détaillé
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

  // Données saisies par étape (résumé)
  const pont = state.data.pont;
  const conds = state.data.conditions;
  const struct = state.data.structure;
  const conv = state.data.conviction;

  const dataSections = `
    <div class="section pdf-keep">
      <div class="section-title">🌉 Le pont</div>
      <div class="field"><div class="field-label">Point A</div><div class="field-content">${esc(pont.pointA.formulated)}</div></div>
      <div class="field"><div class="field-label">Point B (${pont.pointB.timeframe_days} jours)</div><div class="field-content">${esc(pont.pointB.formulated)}<br/><em>Mesurable : ${esc(pont.pointB.measurable_outcome)}</em></div></div>
      <div class="field"><div class="field-label">Résumé du pont</div><div class="field-content">${esc(pont.bridge_summary)}</div></div>
    </div>

    <div class="section pdf-keep">
      <div class="section-title">🎯 4 conditions Hormozi</div>
      <div class="cond-grid">
        ${CONDITION_AXES.map((cfg) => {
          const a = conds[cfg.key];
          const isWeak = conds.weakest_axis === cfg.key;
          return `<div class="cond-card${isWeak ? " weakest" : ""}">
            <div class="cond-head"><strong>${cfg.emoji} ${cfg.label}</strong> · ${a.score}/10${isWeak ? ' <em class="weakest-tag">⚠ faible</em>' : ""}</div>
            <p class="cond-justif">${esc(a.justification)}</p>
          </div>`;
        }).join("")}
      </div>
      <div class="field"><div class="field-label">Plan d'action</div><div class="field-content">${esc(conds.action_plan)}</div></div>
    </div>

    <div class="section pdf-keep">
      <div class="section-title">🍽 Eat the Complexity</div>
      <table class="eat-table">
        <thead><tr><th>Étape client</th><th>Ce que tu manges</th><th>Ce qui reste au client</th></tr></thead>
        <tbody>
          ${state.data.eatcomplex.rows.filter((r) => r.client_step || r.what_you_eat).map((r) => `
            <tr><td>${esc(r.client_step)}</td><td>${esc(r.what_you_eat)}</td><td>${esc(r.what_remains)}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="section pdf-keep">
      <div class="section-title">📅 Structure ${struct.total_weeks} sem · ${struct.promise_days} jours</div>
      <div class="field"><div class="field-label">Ancrage mécanisme</div><div class="field-content">${esc(struct.mecanisme_anchor)}</div></div>
      ${struct.phases.map((p) => `
        <div class="phase-box">
          <div class="phase-num">PHASE ${p.num} (sem. ${esc(p.weeks)})</div>
          <strong>${esc(p.name)}</strong><br/>
          <em>Livrables :</em> ${esc(p.livrables)}
        </div>
      `).join("")}
    </div>

    <div class="section pdf-keep">
      <div class="section-title">💎 Conviction</div>
      <ul class="check-list">
        ${[
          { key: "sur_delivre", lbl: "Sur-délivre" },
          { key: "ten_clients", lbl: "10 clients heureux" },
          { key: "believe_price", lbl: "Crois au prix" },
          { key: "recommend_to_brother", lbl: "Recommanderais à son frère" },
          { key: "prepared_objections", lbl: "Prêt aux 7 objections" },
        ].map((c) => `<li class="${conv.checklist[c.key as keyof typeof conv.checklist] ? "ok" : "ko"}">${conv.checklist[c.key as keyof typeof conv.checklist] ? "✓" : "✗"} ${esc(c.lbl)}</li>`).join("")}
      </ul>
      ${conv.missing ? `<div class="field"><div class="field-label">Ce qui manque</div><div class="field-content">${esc(conv.missing)}</div></div>` : ""}
      <div class="field"><div class="field-label">Prochaine action</div><div class="field-content">${esc(conv.next_action)}</div></div>
    </div>
  `;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;

  w.document.write(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="color-scheme" content="light"><style>:root{color-scheme:only light}</style>
<title>M5 — High-Ticket — ${esc(state.signed_by || "Liberty")}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc { max-width: 800px; margin: 0 auto; padding: 12px 0 32px; }
.doc-header { border-bottom: 1.5px solid #C9A84C; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
.doc-title { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
.doc-sub { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; font-weight: 600; }
.forced-banner { background: #FFF2CC; border: 1.5px solid #C9A84C; color: #8B7635; padding: 8px 14px; border-radius: 6px; font-size: 11px; margin-bottom: 16px; font-weight: 600; }
.section { margin-bottom: 22px; page-break-inside: avoid; }
.section-title { font-size: 13px; font-weight: 700; color: #8B7635; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px; }
.field { margin-bottom: 10px; }
.field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8B7635; margin-bottom: 3px; }
.field-content { font-size: 12px; line-height: 1.65; padding: 8px 12px; background: #FAF6E8; border-left: 3px solid #C9A84C; border-radius: 4px; }
.step-section { margin-bottom: 18px; padding: 12px 14px; border-radius: 6px; page-break-inside: avoid; }
.step-section.good { background: #EEF7E8; border: 1px solid #7FB069; }
.step-section.warn { background: #FFF8E1; border: 1px solid #E8C770; }
.step-section.bad { background: #FBE9E9; border: 1px solid #E86B6B; }
.step-section.neutral { background: #F5F5F5; border: 1px solid #CCC; }
.step-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 6px; }
.step-score { font-size: 14px; color: #8B7635; }
.forced { color: #C0392B; font-style: italic; font-size: 10px; }
.step-verdict { font-style: italic; font-size: 11.5px; color: #555; margin-bottom: 8px; }
.block { padding: 6px 10px; margin-top: 6px; border-radius: 4px; }
.block.good { background: rgba(127,176,105,0.15); }
.block.warn { background: rgba(232,180,80,0.15); }
.block.sugg { background: rgba(201,168,76,0.15); }
.block-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; color: #555; }
.block ul { margin: 0; padding-left: 18px; font-size: 11.5px; line-height: 1.5; color: #333; }
.cond-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.cond-card { padding: 10px; background: #FAF6E8; border: 1px solid #E8DCB0; border-radius: 4px; }
.cond-card.weakest { background: #FBE9E9; border-color: #E86B6B; }
.cond-head { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
.cond-justif { font-size: 11px; line-height: 1.5; color: #444; margin: 0; }
.weakest-tag { color: #C0392B; font-style: italic; font-size: 10px; }
.eat-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.eat-table th, .eat-table td { padding: 6px 8px; border: 1px solid #E8DCB0; vertical-align: top; }
.eat-table th { background: #FAF6E8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; color: #8B7635; }
.phase-box { padding: 10px 12px; background: #F8F4E0; border-left: 3px solid #C9A84C; margin-bottom: 8px; border-radius: 4px; font-size: 11.5px; line-height: 1.5; }
.phase-num { font-size: 10px; font-weight: 700; color: #C9A84C; letter-spacing: 0.08em; margin-bottom: 3px; }
.check-list { list-style: none; padding: 0; margin: 0; font-size: 12px; }
.check-list li { padding: 4px 0; }
.check-list li.ok { color: #38761D; font-weight: 600; }
.check-list li.ko { color: #C0392B; }
.engagement-pdf { padding: 16px 18px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; margin-top: 20px; }
.engagement-pdf-text { font-size: 12px; line-height: 1.7; margin-bottom: 14px; }
.engagement-pdf-sig { border-top: 1px solid #C9A84C; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
.engagement-pdf-name { font-weight: 700; font-style: italic; font-size: 14px; }
.doc-footer { margin-top: 28px; padding-top: 12px; border-top: 0.5px solid #C9A84C; font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.16em; }
</style></head><body>
<div class="doc">
  <div class="doc-header">
    <div>
      <h1 class="doc-title">Audit High-Ticket — Module 5 LIBERTY</h1>
      <div class="doc-sub">Avatar : ${esc(avatar)} · ${esc(niche)}</div>
      <div style="font-size:11px;color:#555;margin-top:4px;">HT : <strong>${esc(ht)}</strong> · ${esc(htPrice)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#555;">${esc(dateStr)}</div>
      <div style="font-size:24px;font-weight:700;color:#C9A84C;margin-top:4px;">${avg}/100</div>
      <div style="font-size:9px;color:#8B7635;text-transform:uppercase;letter-spacing:0.08em;">Score moyen audit</div>
    </div>
  </div>

  ${state.upstream_forced ? `<div class="forced-banner pdf-keep">⚠ Stratégie M4 forcée — seuil M5 monté à 85/100 sur toutes les étapes pédagogiques.</div>` : ""}

  <h2 style="font-size:14px;color:#8B7635;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.1em;">Audit IA détaillé</h2>
  ${stepSections}

  <h2 style="font-size:14px;color:#8B7635;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.1em;">Données saisies</h2>
  ${dataSections}

  <div class="engagement-pdf pdf-keep">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8B7635;margin-bottom:8px;">⚖ Engagement écrit</div>
    <div class="engagement-pdf-text">
      Je, <strong>${esc(state.signed_by || "[NOM]")}</strong>, m'engage à porter ce High-Ticket avec conviction
      jusqu'au prochain palier ${esc(state.m4_data?.ht_monthly_target ? `de ${state.m4_data.ht_monthly_target} ventes HT/mois` : "défini en M4")} —
      sans dilution, sans copie d'écosystème, sans urgence fake.
    </div>
    <div class="engagement-pdf-sig">
      <div class="engagement-pdf-name">${esc(state.signed_by || "[Signature]")}</div>
      <div>${esc(dateStr)}</div>
    </div>
  </div>

  <div class="doc-footer">AL BARAKA · LIBERTY · Module 5 — High-Ticket · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
