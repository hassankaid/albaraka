/** Export PDF M8 — brief client + 3 messages générés + engagement. */

import { buildAllTemplates, SALUTATIONS, POSTURES, CONTEXTES, pickAvatarName, type M8State } from "./types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportM8PDF(state: M8State): void {
  const bc = state.data.brief_client;
  const tpl = buildAllTemplates(bc);
  const avatar = pickAvatarName(state);
  const today = new Date();
  const dateStr = state.signed_at
    ? new Date(state.signed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const templateBlock = (title: string, sub: string, body: string) => `
    <div class="section pdf-keep">
      <div class="section-title">${esc(title)}</div>
      <div class="tpl-sub">${esc(sub)}</div>
      <div class="tpl-body">${esc(body)}</div>
    </div>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="color-scheme" content="light"><style>:root{color-scheme:only light}</style>
<title>M8 — Preuve sociale — ${esc(state.signed_by || "Liberty")}</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.doc { max-width: 800px; margin: 0 auto; padding: 12px 0 32px; }
.doc-header { border-bottom: 1.5px solid #C9A84C; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
.doc-title { font-size: 20px; font-weight: 700; margin: 0; }
.doc-sub { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; font-weight: 600; }
.section { margin-bottom: 22px; page-break-inside: avoid; }
.section-title { font-size: 13px; font-weight: 700; color: #8B7635; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 4px; }
.tpl-sub { font-size: 11px; color: #777; margin-bottom: 8px; }
.tpl-body { font-size: 11px; line-height: 1.6; padding: 12px 14px; background: #FAF6E8; border-left: 3px solid #C9A84C; border-radius: 4px; white-space: pre-wrap; }
.brief { font-size: 11.5px; line-height: 1.55; padding: 8px 12px; background: #F5F5F5; border-radius: 4px; margin-bottom: 6px; }
.engagement-pdf { padding: 16px 18px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; margin-top: 24px; }
.engagement-pdf-text { font-size: 12px; line-height: 1.7; margin-bottom: 14px; }
.engagement-pdf-sig { border-top: 1px solid #C9A84C; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
.engagement-pdf-name { font-weight: 700; font-style: italic; font-size: 14px; }
.doc-footer { margin-top: 28px; padding-top: 12px; border-top: 0.5px solid #C9A84C; font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.16em; }
</style></head><body>
<div class="doc">
  <div class="doc-header">
    <div>
      <h1 class="doc-title">Preuve sociale — Module 8 LIBERTY</h1>
      <div class="doc-sub">Offre : ${esc(bc.nom_offre)} · Client cible : ${esc(avatar)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#555;">${esc(dateStr)}</div>
      <div style="font-size:9px;color:#8B7635;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">3 messages prêts à envoyer</div>
    </div>
  </div>

  <div class="section pdf-keep">
    <div class="section-title">Brief client</div>
    <div class="brief">Prénom du client : <strong>${esc(bc.prenom_client)}</strong> · Ton : <strong>${esc(SALUTATIONS[bc.ton_salutation]?.label || "")}</strong> · Posture : <strong>${esc(POSTURES[bc.posture]?.label || "")}</strong> · Contexte : <strong>${esc(CONTEXTES[bc.contexte]?.label || "")}</strong></div>
    ${bc.douleur_passe_hint ? `<div class="brief">Douleur passé (indice script) : ${esc(bc.douleur_passe_hint)}</div>` : ""}
  </div>

  ${templateBlock("Message A · DM témoignage vidéo", "À envoyer en message privé pour obtenir une vidéo témoignage", tpl.A)}
  ${templateBlock("Message B · Invitation \"coaching bilan\" Zoom", "Pour organiser une interview client de 20-40 min", tpl.B)}
  ${templateBlock("Message C · Script d'interview", "À garder sous les yeux pendant l'enregistrement", tpl.C)}

  <div class="engagement-pdf pdf-keep">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8B7635;margin-bottom:8px;">⚖ Engagement</div>
    <div class="engagement-pdf-text">
      Je, <strong>${esc(state.signed_by || "[NOM]")}</strong>, m'engage à mettre en place une routine de récolte de preuve sociale —
      envoyer ces messages à mes clients satisfaits, organiser les interviews "coaching bilan" et archiver chaque témoignage
      vidéo dans mon arsenal de preuve, prêt à être présenté à mes prochains prospects.
    </div>
    <div class="engagement-pdf-sig">
      <div class="engagement-pdf-name">${esc(state.signed_by || "[Signature]")}</div>
      <div>${esc(dateStr)}</div>
    </div>
  </div>

  <div class="doc-footer">AL BARAKA · LIBERTY · Module 8 — Preuve sociale · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
