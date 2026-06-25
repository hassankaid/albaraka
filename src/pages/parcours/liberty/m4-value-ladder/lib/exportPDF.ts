/** Export PDF de la value ladder M4 — audit trail (forced / signed / IA mode). */

import type { M4State } from "./types";
import {
  TIERS, TIER_LABELS, TIER_PRICE_RANGES, TIER_ROLES,
  ENTRY_STRATEGIES, BRIDGE_BY_ID,
} from "./types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportM4PDF(state: M4State): void {
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const niche = state.m1_data?.sous_niche_2?.phrase_finale || state.m1_data?.sous_niche_2?.phrase || "—";
  const today = new Date();
  const dateStr = state.signed_at
    ? new Date(state.signed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const strategyDef = state.entry.strategy ? ENTRY_STRATEGIES[state.entry.strategy] : null;
  const activeTiers = strategyDef?.active_tiers ?? TIERS;
  const bridgesNeeded = strategyDef?.bridges_needed ?? [];

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;

  const ladderRows = TIERS.map((tid) => {
    const t = state.ladder[tid];
    const isActive = activeTiers.includes(tid);
    const isHigh = tid === "high";
    return `<tr style="opacity:${isActive ? 1 : 0.45};">
      <td style="${isHigh ? "color:#8B7635;font-weight:700;" : ""}">${esc(TIER_LABELS[tid])}${isHigh ? " ★" : ""}</td>
      <td>${esc(t.price || TIER_PRICE_RANGES[tid])}</td>
      <td>${esc(TIER_ROLES[tid])}</td>
      <td>${t.name ? esc(t.name) : (isActive ? "<em>à définir</em>" : "<span style='color:#999;'>— inactive (stratégie)</span>")}</td>
    </tr>`;
  }).join("");

  const bridgesHtml = bridgesNeeded.map((bid) => {
    const b = BRIDGE_BY_ID[bid];
    const text = state.bridges[bid] || "";
    if (!b) return "";
    return `<div class="bridge">
      <div class="bridge-head"><strong>${esc(b.from)}</strong> → <strong>${esc(b.to)}</strong></div>
      <p>${esc(text)}</p>
    </div>`;
  }).join("");

  const aiBadge = state.entry.ai_mode === "cloud"
    ? '<span class="badge ok">IA Claude</span>'
    : '<span class="badge warn">⚙ Évaluation locale</span>';
  const forcedBadge = state.entry.forced
    ? `<span class="badge warn">⚠ Forcé après ${state.entry.attempts} essai(s)</span>`
    : "";

  w.document.write(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="color-scheme" content="light"><style>:root{color-scheme:only light}</style>
<title>M4 — Value Ladder — ${esc(state.signed_name || "Liberty")}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc { max-width: 800px; margin: 0 auto; padding: 12px 0 32px; }
.doc-header { border-bottom: 1.5px solid #C9A84C; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
.doc-title { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
.doc-sub { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; font-weight: 600; }
.section { margin-bottom: 22px; page-break-inside: avoid; }
.section-title { font-size: 13px; font-weight: 700; color: #8B7635; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px; }
.recap-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.recap-table th, .recap-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E8DCB0; }
.recap-table th { background: #FAF6E8; color: #8B7635; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em; }
.field-content { font-size: 12px; line-height: 1.65; padding: 10px 12px; background: #FAF6E8; border-left: 3px solid #C9A84C; border-radius: 4px; margin-bottom: 8px; }
.strategy-card { padding: 12px 14px; background: #FFF8E1; border: 1.5px solid #C9A84C; border-radius: 6px; margin-bottom: 10px; }
.strategy-card .label { font-size: 14px; font-weight: 700; color: #8B7635; }
.strategy-card .desc { font-size: 12px; line-height: 1.55; margin-top: 4px; color: #444; }
.bridge { padding: 10px 12px; background: #F8F4E0; border-left: 3px solid #C9A84C; border-radius: 4px; margin-bottom: 8px; }
.bridge-head { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
.bridge p { font-size: 12px; line-height: 1.55; margin: 0; color: #1A1A1A; }
.engagement-pdf { padding: 16px 18px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; }
.engagement-pdf-text { font-size: 12px; line-height: 1.7; margin-bottom: 14px; }
.engagement-pdf-sig { border-top: 1px solid #C9A84C; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
.engagement-pdf-name { font-weight: 700; font-style: italic; font-size: 14px; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-left: 6px; }
.badge.ok { background: #D9EAD3; color: #38761D; }
.badge.warn { background: #FFF2CC; color: #8B7635; }
.doc-footer { margin-top: 28px; padding-top: 12px; border-top: 0.5px solid #C9A84C; font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.16em; }
</style></head><body>
<div class="doc">
  <div class="doc-header">
    <div>
      <h1 class="doc-title">Value Ladder — Module 4 LIBERTY</h1>
      <div class="doc-sub">Avatar : ${esc(avatar)} · ${esc(niche)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#555;">${esc(dateStr)}</div>
      <div style="font-size:18px;font-weight:700;color:#C9A84C;margin-top:4px;">${state.entry.score ?? "—"}/100</div>
      <div style="font-size:9px;color:#8B7635;text-transform:uppercase;letter-spacing:0.08em;">Score stratégie</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">★ Ton High-ticket</div>
    <div class="field-content">
      <strong>${esc(state.ladder.high.name || "—")}</strong> · ${esc(state.ladder.high.price || "—")} · ${esc(state.ladder.high.format || "—")}
      ${state.ladder.high.rationale ? `<br/><em>${esc(state.ladder.high.rationale)}</em>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">📊 Récap des 4 marches</div>
    <table class="recap-table">
      <thead><tr><th>Niveau</th><th>Prix</th><th>Rôle</th><th>Ton offre</th></tr></thead>
      <tbody>${ladderRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">🎯 Stratégie d'entrée ${aiBadge} ${forcedBadge}</div>
    <div class="strategy-card">
      <div class="label">${esc(strategyDef?.label || state.entry.strategy || "—")}</div>
      <div class="desc">${esc(strategyDef?.desc || "")}</div>
    </div>
    <div class="field-content"><strong>Pourquoi ce choix :</strong><br/>${esc(state.entry.rationale)}</div>
    <div class="field-content"><strong>Cible HT/mois :</strong> ${esc(state.entry.ht_monthly_target)}</div>
    ${state.entry.lt_breakeven_check ? `<div class="field-content"><strong>Breakeven LT/MT :</strong> ${esc(state.entry.lt_breakeven_check)}</div>` : ""}
    ${state.entry.feedback ? `<div class="field-content" style="background:#EEF7E8;border-left-color:#7FB069;"><strong>Évaluation IA :</strong> ${esc(state.entry.feedback)}</div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">🌉 Passerelles (${bridgesNeeded.length})</div>
    ${bridgesHtml || '<p style="font-size:12px;color:#999;font-style:italic;">Aucune passerelle requise par cette stratégie.</p>'}
  </div>

  <div class="engagement-pdf">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8B7635;margin-bottom:8px;">⚖ Engagement écrit</div>
    <div class="engagement-pdf-text">
      Je, <strong>${esc(state.signed_name || "[NOM]")}</strong>, m'engage à construire ma value ladder selon cette stratégie — sans précipiter les marches basses avant que mon HT soit rodé, sans copier d'autres écosystèmes par mimétisme.
    </div>
    <div class="engagement-pdf-sig">
      <div class="engagement-pdf-name">${esc(state.signed_name || "[Signature]")}</div>
      <div>${esc(dateStr)}</div>
    </div>
  </div>

  <div class="doc-footer">AL BARAKA · LIBERTY · Module 4 — Value Ladder · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
