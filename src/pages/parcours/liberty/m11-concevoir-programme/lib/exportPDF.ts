/** Export PDF M11 — architecture du programme (impression navigateur). */
import { type M11State, BLOOM_LEVELS, EXERCICE_TYPES, TIERS } from "./types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportM11PDF(state: M11State): void {
  const d = state.data;
  const today = new Date();
  const dateStr = (state.signed_at ? new Date(state.signed_at) : today).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const tierLabel = TIERS[d.tier_bloom_target as keyof typeof TIERS] ? TIERS[d.tier_bloom_target as keyof typeof TIERS].label : "—";
  const dureeTotale = (d.modules || []).reduce((acc, m) => acc + (parseInt(m.duree_video, 10) || 0), 0);
  const totalLecons = (d.modules || []).reduce((acc, m) => acc + (m.lecons || []).length, 0);

  const modulesHtml = (d.modules || []).map((m, i) => {
    const bl = BLOOM_LEVELS[m.niveau_bloom as keyof typeof BLOOM_LEVELS]?.label || "—";
    const ex = EXERCICE_TYPES[m.type_exercice as keyof typeof EXERCICE_TYPES]?.label || "—";
    const lecons = (m.lecons || []).map((l, li) => `<li><strong>${i + 1}.${li + 1}</strong> ${esc(l.titre)} <span style="color:#888;">— ${esc(l.angle)}</span>${l.active_recall ? ' <em style="color:#8B7635;">↻ ' + esc(l.active_recall) + "</em>" : ""}</li>`).join("");
    return `<div class="mod">
      <div class="mod-head"><span class="mod-num">Module ${i + 1}</span> <strong>${esc(m.nom)}</strong> <span class="badge">${esc(bl)}</span> <span class="badge">${esc(ex)}</span> <span class="badge">${esc(m.duree_video)} min</span></div>
      <div class="mod-obj"><strong>Objectif :</strong> ${esc(m.objectif_mesurable)}</div>
      ${m.livrable_attendu ? `<div class="mod-f"><strong>Livrable :</strong> ${esc(m.livrable_attendu)}</div>` : ""}
      ${m.mise_situation ? `<div class="mod-f"><strong>Mise en situation :</strong> ${esc(m.mise_situation)}</div>` : ""}
      ${m.auto_evaluation ? `<div class="mod-f"><strong>Auto-évaluation :</strong> ${esc(m.auto_evaluation)}</div>` : ""}
      ${lecons ? `<div class="mod-f"><strong>Leçons :</strong><ul>${lecons}</ul></div>` : ""}
    </div>`;
  }).join("");

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="color-scheme" content="light"><style>:root{color-scheme:only light}</style>
<title>M11 — Programme — ${esc(state.signed_by || "Liberty")}</title>
<style>
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: white; margin: 0; }
.doc { max-width: 820px; margin: 0 auto; padding: 12px 0 32px; }
.doc-header { border-bottom: 1.5px solid #C9A84C; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
.doc-title { font-size: 19px; font-weight: 700; margin: 0; }
.doc-sub { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; font-weight: 600; }
.recap { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.recap-item { background: #FAF6E8; border-left: 3px solid #C9A84C; border-radius: 4px; padding: 6px 12px; font-size: 11.5px; }
.ab { font-size: 11.5px; line-height: 1.5; padding: 8px 12px; background: #F5F5F5; border-radius: 4px; margin-bottom: 16px; }
.mod { border: 0.5px solid #ddd; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px; page-break-inside: avoid; }
.mod-head { font-size: 13px; margin-bottom: 6px; }
.mod-num { color: #8B7635; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; }
.badge { display: inline-block; background: #FAF6E8; border: 0.5px solid #C9A84C; border-radius: 10px; padding: 1px 8px; font-size: 10px; color: #8B7635; margin-left: 4px; }
.mod-obj, .mod-f { font-size: 11px; line-height: 1.5; margin-top: 4px; }
.mod-f ul { margin: 4px 0 0; padding-left: 18px; }
.engagement { padding: 14px 16px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; margin-top: 20px; font-size: 12px; line-height: 1.6; }
.doc-footer { margin-top: 24px; padding-top: 10px; border-top: 0.5px solid #C9A84C; font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.14em; }
</style></head><body>
<div class="doc">
  <div class="doc-header">
    <div><h1 class="doc-title">Architecture du programme — Module 11 LIBERTY</h1>
      <div class="doc-sub">${esc(d.modules.length + " modules · " + totalLecons + " leçons · " + tierLabel)}</div></div>
    <div style="text-align:right;font-size:11px;color:#555;">${esc(dateStr)}</div>
  </div>
  <div class="recap">
    <div class="recap-item"><strong>Point B :</strong> ${esc((d.point_b || "").slice(0, 220))}</div>
    <div class="recap-item"><strong>Point A :</strong> ${esc((d.point_a || "").slice(0, 220))}</div>
    <div class="recap-item"><strong>Tier :</strong> ${esc(tierLabel)}</div>
    <div class="recap-item"><strong>Durée totale :</strong> ${dureeTotale} min · ${esc(d.duree_programme_mois)} mois</div>
  </div>
  ${modulesHtml}
  <div class="engagement">
    Je, <strong>${esc(state.signed_by || "[NOM]")}</strong>, valide l'architecture de ce programme et m'engage à scripter et filmer la première leçon dans les 14 jours.
    <div style="margin-top:10px;font-weight:700;font-style:italic;">${esc(state.signed_by || "[Signature]")} · ${esc(dateStr)}</div>
  </div>
  <div class="doc-footer">AL BARAKA · LIBERTY · Module 11 — Concevoir un programme · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
