/** Export PDF M6 — audit trail multi-pages avec scores 7 étapes. */

import type { M6State, PedaStepKey } from "./types";
import { PEDA_STEPS, STEPS_META } from "./types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const STEP_LABELS: Record<PedaStepKey, string> = {
  valeur_prix: "1 · Valeur PAR le prix",
  prix_valeur: "2 · Prix PAR la valeur (ROI)",
  prix_marche: "3 · Prix PAR le marché",
  prix_confiance: "4 · Prix PAR la confiance",
  paiements: "5 · Paiements halal",
  bao: "6 · Bronze / Argent / Or",
  script_annonce: "7 · Script d'annonce",
};

export function exportM6PDF(state: M6State): void {
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
  const dataSections = `
    <div class="section pdf-keep">
      <div class="section-title">1 · Valeur PAR le prix</div>
      <div class="field-content"><strong>Ma Bugatti :</strong> ${esc(d.valeur_prix.ma_bugatti)}</div>
      <div class="field-content"><strong>Signal :</strong> ${esc(d.valeur_prix.signal_phrase)}</div>
      <div class="field-content"><strong>Ancrage :</strong> ${esc(d.valeur_prix.ancrage_phrase)}</div>
      <div class="field-content"><strong>Contraste :</strong> ${esc(d.valeur_prix.contraste_phrase)}</div>
      <div class="field-content"><strong>Non-excuse :</strong> ${esc(d.valeur_prix.non_excuse_phrase)}</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">2 · Prix PAR la valeur · ROI ${d.prix_valeur.roi_calcule}x</div>
      <div class="field-content">Résultat 12m : <strong>${esc(d.prix_valeur.resultat_client_12m)}€</strong> · Prix HT : <strong>${esc(d.prix_valeur.prix_ht)}€</strong></div>
      <div class="field-content">${esc(d.prix_valeur.justification_chiffrage)}</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">3 · Prix PAR le marché · moyenne ${d.prix_marche.prix_marche_moyen}€</div>
      ${d.prix_marche.concurrents.map((c, i) => `<div class="field-content">${i + 1}. <strong>${esc(c.nom)}</strong> · ${esc(c.prix)}€ · ${esc(c.url)}</div>`).join("")}
      <div class="field-content"><strong>Positionnement :</strong> ${esc(d.prix_marche.positionnement)}</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">4 · Prix PAR la confiance · ${d.prix_confiance.confiance_sur_deliver}/100</div>
      <div class="field-content"><strong>Doutes :</strong> ${esc(d.prix_confiance.doutes_principaux)}</div>
      <div class="field-content"><strong>Action renforcement :</strong> ${esc(d.prix_confiance.action_renforcement)}</div>
      <div class="field-content"><strong>Plan d'augmentation :</strong> Palier ${d.prix_confiance.plan_augmentation.prochain_palier_prix}€ déclenché après ${d.prix_confiance.plan_augmentation.declencheur_clients_satisfaits} clients satisfaits (cible ${esc(d.prix_confiance.plan_augmentation.date_cible)})</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">5 · Paiements halal</div>
      <div class="field-content"><strong>Options :</strong> ${(Object.entries(d.paiements.options) as Array<[string, boolean]>).filter(([, v]) => v).map(([k]) => k).join(", ")} · ${d.paiements.note_halal_acknowledged ? "✓ halal acknowledged" : "✗ halal non confirmé"}</div>
      <div class="field-content"><strong>Pitch :</strong> ${esc(d.paiements.pitch_fractionnement)}</div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">6 · B/A/O</div>
      <div class="bao-grid">
        <div class="bao-card">🥉 <strong>Bronze ${esc(d.bao.bronze.prix)}€</strong><br/><em>${esc(d.bao.bronze.contenu_court)}</em></div>
        <div class="bao-card highlight">🥈 <strong>Argent ${esc(d.bao.argent.prix)}€</strong><br/><em>${esc(d.bao.argent.contenu_court)}</em></div>
        <div class="bao-card">🥇 <strong>Or ${esc(d.bao.or.prix)}€</strong><br/><em>${esc(d.bao.or.contenu_court)}</em></div>
      </div>
    </div>
    <div class="section pdf-keep">
      <div class="section-title">7 · Script d'annonce</div>
      <div class="script-block">${esc(d.script_annonce.script_text)}</div>
    </div>
  `;

  const leviers = state.data.commitment_no_price_drop.leviers_valeur.filter((l) => l.trim());

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<title>M6 — Pricing — ${esc(state.signed_by || "Liberty")}</title>
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
.bao-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 11px; }
.bao-card { padding: 10px; background: #FAF6E8; border: 1px solid #E8DCB0; border-radius: 4px; text-align: center; }
.bao-card.highlight { border-color: #C9A84C; background: #FFF8E1; }
.script-block { padding: 12px 14px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; font-size: 11.5px; line-height: 1.6; font-style: italic; }
.engagement-pdf { padding: 16px 18px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; margin-top: 24px; }
.engagement-pdf-text { font-size: 12px; line-height: 1.7; margin-bottom: 14px; }
.engagement-pdf-leviers { margin-bottom: 14px; padding: 8px 12px; background: #FAF6E8; border-radius: 4px; }
.engagement-pdf-leviers li { font-size: 11px; margin-bottom: 4px; }
.engagement-pdf-sig { border-top: 1px solid #C9A84C; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
.engagement-pdf-name { font-weight: 700; font-style: italic; font-size: 14px; }
.doc-footer { margin-top: 28px; padding-top: 12px; border-top: 0.5px solid #C9A84C; font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.16em; }
</style></head><body>
<div class="doc">
  <div class="doc-header">
    <div>
      <h1 class="doc-title">Audit Pricing — Module 6 LIBERTY</h1>
      <div class="doc-sub">Avatar : ${esc(avatar)} · HT : ${esc(ht)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#555;">${esc(dateStr)}</div>
      <div style="font-size:24px;font-weight:700;color:#C9A84C;margin-top:4px;">${avg}/100</div>
      <div style="font-size:9px;color:#8B7635;text-transform:uppercase;letter-spacing:0.08em;">Score moyen 7 étapes</div>
    </div>
  </div>

  <h2 style="font-size:14px;color:#8B7635;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.1em;">Audit IA détaillé</h2>
  ${stepSections}

  <h2 style="font-size:14px;color:#8B7635;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.1em;">Données saisies</h2>
  ${dataSections}

  <div class="engagement-pdf pdf-keep">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8B7635;margin-bottom:8px;">⚖ Engagement no_price_drop</div>
    <div class="engagement-pdf-text">
      Je, <strong>${esc(state.signed_by || "[NOM]")}</strong>, m'engage à NE PAS baisser mon prix sous la pression des prospects.
      Au lieu de baisser le prix, je renforce la valeur perçue via ces 3 leviers concrets :
    </div>
    <div class="engagement-pdf-leviers">
      <ul>
        ${leviers.map((l, i) => `<li><strong>Levier ${i + 1} :</strong> ${esc(l)}</li>`).join("")}
      </ul>
    </div>
    <div class="engagement-pdf-sig">
      <div class="engagement-pdf-name">${esc(state.signed_by || "[Signature]")}</div>
      <div>${esc(dateStr)}</div>
    </div>
  </div>

  <div class="doc-footer">AL BARAKA · LIBERTY · Module 6 — Pricing · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
