/**
 * Export PDF du M1 NICHE — réplique du `exportPDF()` du HTML standalone Sidali.
 * Ouvre une nouvelle fenêtre formatée pour impression / Save as PDF du navigateur.
 */

import type { M1State } from "./types";

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function exportM1PDF(state: M1State): Promise<void> {
  const sn = state.sous_niche_2;
  const a = state.avatar;
  const eng = state.engagement;
  const dateStr = eng.date_signature
    ? new Date(eng.date_signature).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const photoBlock = a.photo_url
    ? `<div class="avatar-photo"><img src="${escapeHtml(a.photo_url)}" alt="" /></div>`
    : `<div class="avatar-photo">👤</div>`;

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="color-scheme" content="light"><style>:root{color-scheme:only light}</style>
<title>M1 — Sous-Niche 2.0 — ${escapeHtml(eng.nom_complet || "Liberty")}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1A1A1A; background: white; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .doc { max-width: 800px; margin: 0 auto; padding: 12px 0 32px; }
  .doc-header {
    border-bottom: 1.5px solid #C9A84C;
    padding-bottom: 12px; margin-bottom: 24px;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .doc-title {
    font-size: 20px; font-weight: 700; color: #1A1A1A; margin: 0;
    letter-spacing: -0.01em;
  }
  .doc-sub {
    font-size: 11px; color: #8B7635; text-transform: uppercase;
    letter-spacing: 0.12em; margin-top: 4px; font-weight: 600;
  }
  .doc-date {
    font-size: 11px; color: #555; text-align: right;
  }
  .pdf-block { margin-bottom: 18px; page-break-inside: avoid; }
  .pdf-tag {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #8B7635; margin-bottom: 6px;
  }
  .pdf-content {
    font-size: 13px; line-height: 1.65; color: #1A1A1A;
    padding: 10px 14px; background: #FAF6E8;
    border-left: 3px solid #C9A84C; border-radius: 4px;
  }
  .pdf-content strong { color: #1A1A1A; }
  .pdf-phrase {
    font-size: 17px; font-weight: 700; line-height: 1.35; padding: 14px 16px;
  }
  .avatar-row {
    display: flex; gap: 16px; align-items: flex-start;
    background: #FAF6E8; border-left: 3px solid #C9A84C;
    padding: 12px; border-radius: 4px;
  }
  .avatar-photo {
    width: 100px; height: 100px; flex-shrink: 0;
    border-radius: 8px; background: #FFF;
    border: 1px solid #C9A84C; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    font-size: 36px;
  }
  .avatar-photo img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-info { flex: 1; font-size: 12px; line-height: 1.7; }
  .avatar-info-line { margin-bottom: 2px; }
  .psycho-grid { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .psycho-q {
    background: #FFFBF0; border: 1px solid #E8DCB0; border-radius: 4px; padding: 8px 10px;
  }
  .psycho-q-label {
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #8B7635; margin-bottom: 4px;
  }
  .psycho-q-content { font-size: 11px; line-height: 1.55; color: #1A1A1A; }
  .engagement-pdf {
    margin-top: 22px; padding: 16px 18px;
    background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px;
    page-break-inside: avoid;
  }
  .engagement-pdf-tag {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #8B7635; margin-bottom: 8px;
  }
  .engagement-pdf-text { font-size: 12px; line-height: 1.7; color: #1A1A1A; margin-bottom: 14px; }
  .engagement-pdf-sig {
    border-top: 1px solid #C9A84C; padding-top: 10px;
    display: flex; justify-content: space-between; font-size: 12px;
  }
  .engagement-pdf-name { font-weight: 700; font-style: italic; color: #1A1A1A; font-size: 14px; }
  .doc-footer {
    margin-top: 28px; padding-top: 12px;
    border-top: 0.5px solid #C9A84C;
    font-size: 10px; color: #8B7635;
    text-align: center; text-transform: uppercase; letter-spacing: 0.16em;
  }
</style>
</head><body>
<div class="doc">
  <div class="doc-header">
    <div>
      <h1 class="doc-title">Sous-Niche 2.0 — Module 1 LIBERTY</h1>
      <div class="doc-sub">AL BARAKA · EthicArena</div>
    </div>
    <div class="doc-date">${escapeHtml(dateStr)}</div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">Phrase finale</div>
    <div class="pdf-content pdf-phrase">${escapeHtml(sn.phrase || "—")}</div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">Cible précise</div>
    <div class="pdf-content">${escapeHtml(sn.cible || "—")}</div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">Douleur concrète</div>
    <div class="pdf-content">${escapeHtml(sn.douleur || "—")}</div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">Pouvoir d'achat — preuves</div>
    <div class="pdf-content">${escapeHtml(sn.pouvoir_achat || "—")}</div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">📡 Facile à contacter</div>
    <div class="pdf-content">${escapeHtml(sn.contact || "—")}</div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">📈 Croissance du marché</div>
    <div class="pdf-content">${escapeHtml(sn.croissance || "—")}</div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">Méthode propriétaire</div>
    <div class="pdf-content"><strong>${escapeHtml(sn.methode || "—")}</strong></div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">Avatar client</div>
    <div class="avatar-row">
      ${photoBlock}
      <div class="avatar-info">
        <div class="avatar-info-line"><strong>${escapeHtml(a.socio.nom || "—")}</strong>, ${escapeHtml(a.socio.age || "—")} · ${escapeHtml(a.socio.sexe || "—")}</div>
        <div class="avatar-info-line"><strong>Lieu :</strong> ${escapeHtml(a.socio.lieu || "—")}</div>
        <div class="avatar-info-line"><strong>Revenu :</strong> ${escapeHtml(a.socio.revenu || "—")}</div>
        <div class="avatar-info-line"><strong>Couple :</strong> ${escapeHtml(a.socio.compagnon || "—")}</div>
        <div class="avatar-info-line"><strong>Famille :</strong> ${escapeHtml(a.socio.situation || "—")}</div>
        <div class="avatar-info-line"><strong>Relations :</strong> ${escapeHtml(a.socio.relations || "—")}</div>
      </div>
    </div>
    <div class="psycho-grid">
      <div class="psycho-q"><div class="psycho-q-label">Problème principal</div><div class="psycho-q-content">${escapeHtml(a.psycho.probleme || "—")}</div></div>
      <div class="psycho-q"><div class="psycho-q-label">Objectifs</div><div class="psycho-q-content">${escapeHtml(a.psycho.objectifs || "—")}</div></div>
      <div class="psycho-q"><div class="psycho-q-label">Conséquences</div><div class="psycho-q-content">${escapeHtml(a.psycho.consequences || "—")}</div></div>
      <div class="psycho-q"><div class="psycho-q-label">Ce qu'elle/il a essayé</div><div class="psycho-q-content">${escapeHtml(a.psycho.passe || "—")}</div></div>
      <div class="psycho-q"><div class="psycho-q-label">Sentiment actuel</div><div class="psycho-q-content">${escapeHtml(a.psycho.sentiment || "—")}</div></div>
      <div class="psycho-q"><div class="psycho-q-label">Paradis (situation rêvée)</div><div class="psycho-q-content">${escapeHtml(a.psycho.paradis || "—")}</div></div>
    </div>
  </div>

  <div class="pdf-block">
    <div class="pdf-tag">Phrase pivot</div>
    <div class="pdf-content"><strong>${escapeHtml(a.psycho.phrase_avatar || "—")}</strong></div>
  </div>

  <div class="engagement-pdf">
    <div class="engagement-pdf-tag">⚖ Engagement écrit</div>
    <div class="engagement-pdf-text">
      Je, <strong>${escapeHtml(eng.nom_complet || "[NOM]")}</strong>, m'engage à construire mon offre exclusivement sur cette niche pour les <strong>90 prochains jours</strong>. Je ne shopperai pas d'autres niches en parallèle. Je ne reviendrai pas sur cette décision tant que je n'aurai pas testé sérieusement cette niche avec les modules M2 à M11.
    </div>
    <div class="engagement-pdf-sig">
      <div class="engagement-pdf-name">${escapeHtml(eng.nom_complet || "[Signature]")}</div>
      <div>${escapeHtml(dateStr)}</div>
    </div>
  </div>

  <div class="doc-footer">
    AL BARAKA · LIBERTY · Module 1 — Sous-niche 2.0 · Confidentiel
  </div>
</div>
</body></html>`;

  const filename = `M1 — Sous-Niche 2.0 — ${escapeHtml(eng.nom_complet || "Liberty")}.pdf`;
  await downloadHtmlAsPdf(html, filename);
}

/**
 * Télécharge directement un HTML autonome en PDF (sans boîte d'impression).
 * Rendu dans un iframe offscreen ISOLÉ → n'hérite pas du thème (sombre) de l'app.
 * Fallback : ouverture + impression navigateur si html2pdf échoue.
 */
async function downloadHtmlAsPdf(html: string, filename: string): Promise<void> {
  try {
    // @ts-ignore — html2pdf.js n'expose pas de types
    const html2pdf = (await import("html2pdf.js")).default;
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed; left:-10000px; top:0; width:820px; height:1200px; border:0; background:#fff;";
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow!.document;
    idoc.open();
    idoc.write(html);
    idoc.close();
    // Laisser les polices/images se charger avant la capture
    try { await (idoc as any).fonts?.ready; } catch { /* noop */ }
    await new Promise((r) => setTimeout(r, 450));
    iframe.style.height = Math.max(1200, idoc.body.scrollHeight + 40) + "px";
    const target = (idoc.querySelector(".doc") as HTMLElement) || idoc.body;
    await html2pdf()
      .set({
        margin: [10, 12, 14, 12],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 820 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(target)
      .save();
    iframe.remove();
  } catch {
    // Fallback : impression navigateur (ancien comportement) si la génération échoue
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(html + "<script>setTimeout(function(){window.print();}, 400);<\/script>");
    w.document.close();
  }
}
