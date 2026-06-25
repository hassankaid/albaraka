/** Export PDF M12 — récap naming + positionnement (impression navigateur). */
import { type M12State, type TechKey, TECHNIQUES, freshTests } from "./types";
import { compileCategorieNouvelle, activeTestsBag, hasMinTrace } from "./validations";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportM12PDF(state: M12State): void {
  const d = state.data;
  const f = d.final || ({} as any);
  const p = d.positionnement || ({} as any);
  const me = d.methode || ({} as any);
  const ren = d.modules_renommes || [];
  const t = activeTestsBag(d, freshTests);
  const today = new Date();
  const dateStr = (state.signed_at ? new Date(state.signed_at) : today).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const techLabel = f.technique ? TECHNIQUES[f.technique as TechKey]?.label || "—" : "—";
  const compiled = compileCategorieNouvelle(p);

  const testLine = (label: string, ok: boolean, trace: string) =>
    `<li><strong>${esc(label)} :</strong> ${ok && hasMinTrace(trace) ? "✓ " + esc(trace) : "✗ manquant"}</li>`;

  const renHtml = ren.length > 0 ? `<div class="section"><div class="section-title">Modules renommés</div>${ren.map((r) => `<div class="block"><strong>Module ${r.index}</strong> (origine : ${esc(r.nom_origine || "—")}) → <strong style="color:#8B7635;">${esc(r.nom_final || "—")}</strong>${r.baseline ? `<br><em>« ${esc(r.baseline)} »</em>` : ""}</div>`).join("")}</div>` : "";
  const meHtml = me.nom ? `<div class="section"><div class="section-title">Méthode propriétaire</div><div class="block"><strong style="color:#8B7635;">${esc(me.nom)}</strong>${me.baseline ? `<br><em>« ${esc(me.baseline)} »</em>` : ""}${me.est_acronyme && me.acronyme_developpe ? `<br>Acronyme : ${esc(me.acronyme_developpe)}` : ""}</div></div>` : "";

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="color-scheme" content="light"><style>:root{color-scheme:only light}</style>
<title>M12 — Naming — ${esc(f.nom || "Liberty")}</title>
<style>
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1A1A1A; background: white; margin: 0; }
.doc { max-width: 800px; margin: 0 auto; padding: 12px 0 32px; }
.doc-header { border-bottom: 1.5px solid #C9A84C; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
.doc-title { font-size: 19px; font-weight: 700; margin: 0; }
.doc-sub { font-size: 11px; color: #8B7635; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; font-weight: 600; }
.hero { text-align: center; padding: 18px; background: #FAF6E8; border: 1px solid #C9A84C; border-radius: 8px; margin-bottom: 20px; }
.hero-nom { font-size: 26px; font-weight: 700; color: #8B7635; }
.hero-base { font-size: 13px; font-style: italic; color: #555; margin-top: 6px; }
.section { margin-bottom: 18px; page-break-inside: avoid; }
.section-title { font-size: 12px; font-weight: 700; color: #8B7635; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px; }
.block { font-size: 11.5px; line-height: 1.55; padding: 8px 12px; background: #F7F7F7; border-left: 3px solid #C9A84C; border-radius: 4px; margin-bottom: 6px; }
ul { margin: 4px 0; padding-left: 18px; font-size: 11.5px; line-height: 1.6; }
.engagement { padding: 14px 16px; background: #FFF8E1; border: 2px solid #C9A84C; border-radius: 6px; margin-top: 20px; font-size: 12px; line-height: 1.6; }
.doc-footer { margin-top: 24px; padding-top: 10px; border-top: 0.5px solid #C9A84C; font-size: 10px; color: #8B7635; text-align: center; text-transform: uppercase; letter-spacing: 0.14em; }
</style></head><body>
<div class="doc">
  <div class="doc-header">
    <div><h1 class="doc-title">Naming & Positionnement — Module 12 LIBERTY</h1><div class="doc-sub">Technique : ${esc(techLabel)}</div></div>
    <div style="text-align:right;font-size:11px;color:#555;">${esc(dateStr)}</div>
  </div>
  <div class="hero"><div class="hero-nom">${esc(f.nom || "—")}</div><div class="hero-base">« ${esc(f.baseline || "—")} »</div></div>
  <div class="section"><div class="section-title">Positionnement</div>
    <div class="block"><strong>Catégorie nouvelle :</strong> ${esc(compiled || "—")}</div>
    <div class="block"><strong>Combat déclaré — contre :</strong> ${esc(p.ennemi_declare || "—")}</div>
  </div>
  <div class="section"><div class="section-title">Les 4 tests humains</div><ul>
    ${testLine("Téléphone", t.telephone, t.telephone_trace)}
    ${testLine("Google", t.google, t.google_trace)}
    ${testLine("Promesse", t.promesse, t.promesse_trace)}
    ${testLine("Résonance", t.resonance, t.resonance_trace)}
  </ul></div>
  ${meHtml}
  ${renHtml}
  <div class="engagement">
    Je, <strong>${esc(state.signed_by || "[NOM]")}</strong>, m'engage à dire mon nom de programme à voix haute à 3 prospects dans les 7 jours, sans hésitation.
    <div style="margin-top:10px;font-weight:700;font-style:italic;">${esc(state.signed_by || "[Signature]")} · ${esc(dateStr)}</div>
  </div>
  <div class="doc-footer">AL BARAKA · LIBERTY · Module 12 — Naming & Positionnement · Confidentiel</div>
</div>
<script>setTimeout(function(){window.print();}, 400);</script>
</body></html>`);
  w.document.close();
}
