/** Export PDF de l'anatomie d'offre M3. */

import type { M3State } from "./types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportM3PDF(state: M3State): void {
  const eng = state.engagement;
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const niche = state.m1_data?.sous_niche_2?.phrase_finale || state.m1_data?.sous_niche_2?.phrase || "—";
  const today = new Date();
  const dateStr = eng.date_signature
    ? new Date(eng.date_signature).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;

  w.document.write(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<title>M3 — Anatomie d'offre — ${esc(eng.nom_complet || "Liberty")}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc { max-width: 800px; margin: 0 auto; padding: 12px 0 32px; }
.doc-header { border-bottom: 1.5px solid #C9A84C; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
.doc-title { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
.doc-sub { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; font-weight: 600; }
.section { margin-bottom: 20px; page-break-inside: avoid; }
.section-title { font-size: 13px; font-weight: 700; color: #8B7635; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px; }
.field { margin-bottom: 10px; }
.field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8B7635; margin-bottom: 3px; }
.field-content { font-size: 12px; line-height: 1.65; padding: 8px 12px; background: #FAF6E8; border-left: 3px solid #C9A84C; border-radius: 4px; }
.leviers-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.levier { padding: 10px; background: #FFF8E1; border: 1px solid #E8DCB0; border-radius: 4px; }
.levier-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8B7635; }
.levier-score { font-size: 18px; font-weight: 700; color: #C9A84C; }
.levier-justif { font-size: 10px; line-height: 1.4; color: #555; margin-top: 4px; }
.engagement-pdf { padding: 16px 18px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; }
.engagement-pdf-text { font-size: 12px; line-height: 1.7; margin-bottom: 14px; }
.engagement-pdf-sig { border-top: 1px solid #C9A84C; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
.engagement-pdf-name { font-weight: 700; font-style: italic; font-size: 14px; }
.doc-footer { margin-top: 28px; padding-top: 12px; border-top: 0.5px solid #C9A84C; font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.16em; }
</style></head><body>
<div class="doc">
  <div class="doc-header">
    <div>
      <h1 class="doc-title">Anatomie d'offre — Module 3 LIBERTY</h1>
      <div class="doc-sub">Avatar : ${esc(avatar)} · ${esc(niche)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#555;">${esc(dateStr)}</div>
      <div style="font-size:24px;font-weight:700;color:#C9A84C;margin-top:4px;">${state.prix.score}/100</div>
      <div style="font-size:9px;color:#8B7635;text-transform:uppercase;letter-spacing:0.08em;">Score prix</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🎯 Promesse de transformation</div>
    <div class="field-content">${esc(state.promesse.text)}</div>
  </div>

  <div class="section">
    <div class="section-title">🔧 Mécanisme unique</div>
    <div class="field"><div class="field-label">Nom</div><div class="field-content"><strong>${esc(state.mecanisme.nom)}</strong></div></div>
    <div class="field"><div class="field-label">Étapes</div><div class="field-content">${state.mecanisme.etapes.filter(Boolean).map((e, i) => `${i + 1}. ${esc(e)}`).join("<br/>")}</div></div>
  </div>

  <div class="section">
    <div class="section-title">📦 Véhicule</div>
    <div class="field"><div class="field-label">Format</div><div class="field-content">${esc(state.vehicule.format)}</div></div>
    <div class="field"><div class="field-label">Justification</div><div class="field-content">${esc(state.vehicule.justification)}</div></div>
  </div>

  <div class="section">
    <div class="section-title">🎁 Bonus stratégiques (${state.bonus.items.length})</div>
    ${state.bonus.items.map((b, i) => `
      <div class="field">
        <div class="field-label">Bonus ${i + 1}</div>
        <div class="field-content"><strong>${esc(b.nom)}</strong> (${esc(b.valeur)})<br/><em>${esc(b.raison)}</em></div>
      </div>
    `).join("")}
  </div>

  <div class="section">
    <div class="section-title">🛡 Garantie · ${esc(state.garantie.type)}</div>
    <div class="field-content">${esc(state.garantie.formulation)}</div>
  </div>

  <div class="section">
    <div class="section-title">⏳ Urgence · ${esc(state.urgence.type)}</div>
    <div class="field-content">${esc(state.urgence.justification)}</div>
  </div>

  <div class="section">
    <div class="section-title">💰 Prix · ${esc(state.prix.montant)} €</div>
    <div class="leviers-grid">
      ${(["resultat", "probabilite", "delai", "effort"] as const).map((k) => {
        const l = state.prix.leviers[k];
        return `<div class="levier"><div class="levier-label">${k}</div><div class="levier-score">${l.score}/100</div><div class="levier-justif">${esc(l.justification)}</div></div>`;
      }).join("")}
    </div>
    ${state.prix.levier_faible ? `<p style="margin-top:8px;font-size:11px;color:#8B7635;"><strong>Levier le plus faible :</strong> ${esc(state.prix.levier_faible)}</p>` : ""}
  </div>

  <div class="engagement-pdf">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8B7635;margin-bottom:8px;">⚖ Engagement écrit</div>
    <div class="engagement-pdf-text">
      Je, <strong>${esc(eng.nom_complet || "[NOM]")}</strong>, m'engage à mettre cette offre en marché telle que je l'ai construite — sans urgences fake, garanties magiques ou promesses surréalistes.
    </div>
    <div class="engagement-pdf-sig">
      <div class="engagement-pdf-name">${esc(eng.nom_complet || "[Signature]")}</div>
      <div>${esc(dateStr)}</div>
    </div>
  </div>

  <div class="doc-footer">AL BARAKA · LIBERTY · Module 3 — Anatomie d'une offre · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
