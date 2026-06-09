/** Rendu de l'aperçu PDF (HTML string) + feuille de style pdf/print — verbatim source Script Forge. */
import type { FormData, ScriptStep } from "./types";
import { SEGMENTS, PROFILES } from "./types";
import { SEG_PHRASES } from "./seg-phrases";
import { esc, getVoiceClass } from "./build-script";

export function renderPreview(f: FormData, steps: ScriptStep[]): string {
  const segLabel = SEGMENTS[f.segment].label;
  const prof = PROFILES[f.profile];
  const isDiscovery = f.type === "discovery";
  const totalDur = isDiscovery ? prof.discoveryDur : prof.closingDur;
  const phrases = SEG_PHRASES[f.segment];
  const total = steps.length;
  let pageNum = 1;

  let html = `
    <div class="pdf-page pdf-cover">
      ${f.offerName ? `<div class="pdf-cover-brand">${esc(f.offerName.toUpperCase())}</div>` : `<div class="pdf-cover-brand">SCRIPT D'APPEL</div>`}
      <div class="pdf-cover-eyebrow">SCRIPT PERSONNALISÉ</div>
      <div class="pdf-cover-title">${isDiscovery ? "Appel de Découverte" : "Appel de Closing"}</div>
      <div class="pdf-cover-subtitle">${esc(segLabel)} · Profil ${f.profile}</div>
      <div class="pdf-divider"></div>
      <div class="pdf-cover-meta">${esc(prof.label)}  ·  ${esc(prof.price)}</div>
      <div class="pdf-cover-meta">Durée totale : ${esc(totalDur)}</div>
      <div class="pdf-cover-meta">${total} étapes</div>
      ${f.founder ? `<div class="pdf-cover-offer">par ${esc(f.founder)}</div>` : ""}
      <div class="pdf-footer">Page ${pageNum++}</div>
    </div>
  `;

  html += `
    <div class="pdf-page">
      <div class="pdf-h1">Comment lire ce script</div>
      <div class="pdf-h1-line"></div>

      <div class="pdf-h2">Code couleur des intonations</div>
      <div class="pdf-paragraph" style="margin-bottom: 4px;">Chaque réplique a une intonation précise. La couleur sur la gauche de chaque section indique le ton à adopter.</div>

      <div class="pdf-legend-grid">
        <div class="pdf-legend-item">
          <div class="pdf-legend-swatch empathie"></div>
          <div class="pdf-legend-content">
            <div class="pdf-legend-name empathie">Empathie</div>
            <div class="pdf-legend-desc">Voix douce, écoute, curiosité, chaleur — pour faire parler le prospect.</div>
          </div>
        </div>
        <div class="pdf-legend-item">
          <div class="pdf-legend-swatch conviction"></div>
          <div class="pdf-legend-content">
            <div class="pdf-legend-name conviction">Conviction</div>
            <div class="pdf-legend-desc">Voix ferme, certitude, sincérité — pour engager, garantir, rassurer.</div>
          </div>
        </div>
        <div class="pdf-legend-item">
          <div class="pdf-legend-swatch energie"></div>
          <div class="pdf-legend-content">
            <div class="pdf-legend-name energie">Énergie</div>
            <div class="pdf-legend-desc">Voix enthousiaste, dynamique — pour ouvrir et pour pitcher l'offre.</div>
          </div>
        </div>
        <div class="pdf-legend-item">
          <div class="pdf-legend-swatch mystere"></div>
          <div class="pdf-legend-content">
            <div class="pdf-legend-name mystere">Mystère</div>
            <div class="pdf-legend-desc">Voix posée, intrigante, presque confidentielle — pour préparer le pitch.</div>
          </div>
        </div>
        <div class="pdf-legend-item">
          <div class="pdf-legend-swatch cadre"></div>
          <div class="pdf-legend-content">
            <div class="pdf-legend-name cadre">Cadre / Raison</div>
            <div class="pdf-legend-desc">Voix directe, évidence, pédagogique — pour cadrer et expliquer.</div>
          </div>
        </div>
        <div class="pdf-legend-item">
          <div class="pdf-legend-swatch silence"></div>
          <div class="pdf-legend-content">
            <div class="pdf-legend-name silence">Silence</div>
            <div class="pdf-legend-desc">Pause volontaire, ne rien dire — souvent ton arme la plus puissante.</div>
          </div>
        </div>
      </div>

      <div class="pdf-h2">Les 3 piliers fondamentaux</div>
      <div class="pdf-pillar"><div class="pdf-pillar-label">ÉCOUTE</div><div class="pdf-pillar-text">80% d'écoute, 20% de parole. Ses mots sont tes meilleurs arguments.</div></div>
      <div class="pdf-pillar"><div class="pdf-pillar-label">EMPATHIE</div><div class="pdf-pillar-text">Comprends sa situation, ses peurs, ses contraintes. Un parent de 40 ans n'a pas les mêmes freins qu'un jeune de 25 ans.</div></div>
      <div class="pdf-pillar"><div class="pdf-pillar-label">HONNÊTETÉ</div><div class="pdf-pillar-text">Promets ce que tu peux tenir. La promesse honnête signe plus que la promesse magique.</div></div>

      <div class="pdf-box">
        <div class="pdf-box-title">Profil sélectionné — ${esc(prof.label)} (${esc(prof.price)})</div>
        <div class="pdf-box-text">Durée d'appel cible : ${esc(totalDur)}. La profondeur de qualification s'adapte au ticket : plus le prix monte, plus on creuse la douleur, la vision et le fossé avant de pitcher.</div>
      </div>

      <div class="pdf-footer">${f.offerName ? `<span class="pdf-footer-brand">${esc(f.offerName)}</span>  ·  ` : ""}Page ${pageNum++}</div>
    </div>
  `;

  steps.forEach((step) => {
    html += `
      <div class="pdf-page">
        <div class="pdf-step-header">
          <div class="pdf-step-num">ÉTAPE ${step.num} / ${total}</div>
          <div class="pdf-step-title">${esc(step.title)}</div>
          <div class="pdf-step-meta">
            <div class="pdf-step-meta-item"><span class="pdf-step-meta-label">Durée</span><span class="pdf-step-meta-value">${esc(step.duration)}</span></div>
            <div class="pdf-step-meta-item"><span class="pdf-step-meta-label">Objectif</span><span class="pdf-step-meta-value">${esc(step.objective)}</span></div>
          </div>
        </div>
        ${step.sections.map((s) => `
          <div class="pdf-section ${getVoiceClass(s.voice)}">
            <div class="pdf-marker">— ${esc(s.marker)}</div>
            <div class="pdf-voice">${esc(s.voice)}</div>
            <div class="pdf-replique">${esc(s.text)}</div>
            ${s.tactic ? `<div class="pdf-tactic">${esc(s.tactic)}</div>` : ""}
          </div>
        `).join("")}
        <div class="pdf-footer">${f.offerName ? `<span class="pdf-footer-brand">${esc(f.offerName)}</span>  ·  ` : ""}Page ${pageNum++}</div>
      </div>
    `;
  });

  // ==================== PAGE "MODE APPEL" — Récap A4 condensé ====================
  html += `
    <div class="pdf-page pdf-mode-appel">
      <div class="pdf-h1">Mode Appel — Récap visuel</div>
      <div class="pdf-h1-line"></div>
      <div class="pdf-paragraph" style="margin-bottom: 16px;">À imprimer et poser devant toi pendant l'appel. Tu retrouves les ${steps.length} étapes en un coup d'œil.</div>
      <div class="pdf-mode-grid">
        ${steps.map((step) => {
          // Trouver la voix dominante = voix de la 1ère section
          const firstVoice = step.sections[0]?.voice || "";
          const voiceCls = getVoiceClass(firstVoice);
          // Phrase-clé = première réplique (tronquée)
          const firstText = step.sections[0]?.text || "";
          const keyPhrase = firstText.length > 90 ? firstText.substring(0, 87) + "..." : firstText;
          return `
            <div class="pdf-mode-step ${voiceCls}">
              <div class="pdf-mode-step-num">${step.num}</div>
              <div class="pdf-mode-step-body">
                <div class="pdf-mode-step-title">${esc(step.title)}</div>
                <div class="pdf-mode-step-duration">${esc(step.duration)}</div>
                <div class="pdf-mode-step-phrase">« ${esc(keyPhrase)} »</div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="pdf-footer">${f.offerName ? `<span class="pdf-footer-brand">${esc(f.offerName)}</span>  ·  ` : ""}Mode Appel</div>
    </div>
  `;

  html += `
    <div class="pdf-page">
      <div class="pdf-h1">Objections fréquentes</div>
      <div class="pdf-h1-line"></div>
      <div class="pdf-paragraph">Adapté au segment ${esc(segLabel)}.</div>
      ${phrases.objections.map(([q, a]) => `
        <div class="pdf-box">
          <div class="pdf-box-title">« ${esc(q)} »</div>
          <div class="pdf-box-text">${esc(a)}</div>
        </div>
      `).join("")}
      <div class="pdf-footer">${f.offerName ? `<span class="pdf-footer-brand">${esc(f.offerName)}</span>  ·  ` : ""}Annexe</div>
    </div>
  `;

  return html;
}

/** CSS de l'aperçu (tokens AL BARAKA + classes pdf- et voice- + isolation impression). */
export const PREVIEW_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@300;400;500;600;700&display=swap');
.sf-preview {
  --gold: #C9A961; --gold-bright: #E0C88E; --gold-deep: #8A7333; --gold-soft: rgba(201,169,97,0.12);
  --cream: #F4E9CC; --white-warm: #FAF6EC; --smoke: #888; --smoke-light: #B8B8B8;
  --line: #262626; --bg-deep: #0A0A0A;
  --voice-empathie: #7AB5D9; --voice-empathie-bg: rgba(122,181,217,0.07);
  --voice-conviction: #E07A7A; --voice-conviction-bg: rgba(224,122,122,0.07);
  --voice-energie: #F2C865; --voice-energie-bg: rgba(242,200,101,0.08);
  --voice-mystere: #B89AD4; --voice-mystere-bg: rgba(184,154,212,0.07);
  --voice-cadre: #88C49E; --voice-cadre-bg: rgba(136,196,158,0.07);
  --voice-silence: #707070; --voice-silence-bg: rgba(112,112,112,0.06);
  background: var(--bg-deep); padding: 32px 24px 60px;
}
.sf-preview .pdf-page { background: #0A0A0A; width: 210mm; min-height: 297mm; margin: 0 auto 28px; padding: 22mm 18mm; box-shadow: 0 4px 28px rgba(201,169,97,0.08); color: var(--cream); font-family: 'Manrope', sans-serif; font-size: 10pt; line-height: 1.5; position: relative; page-break-after: always; border: 1px solid var(--line); }
.sf-preview .pdf-page:last-child { page-break-after: auto; }
.sf-preview .pdf-cover { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 50mm 18mm; }
.sf-preview .pdf-cover-brand { font-family: 'Fraunces', Georgia, serif; font-size: 14pt; color: var(--gold); letter-spacing: 10pt; margin-bottom: 50mm; font-weight: 500; padding-left: 10pt; }
.sf-preview .pdf-cover-eyebrow { font-size: 9pt; letter-spacing: 4pt; color: var(--gold); font-weight: 600; margin-bottom: 18px; }
.sf-preview .pdf-cover-title { font-family: 'Fraunces', Georgia, serif; font-size: 36pt; color: var(--white-warm); font-weight: 500; line-height: 1.1; margin-bottom: 12px; letter-spacing: -0.5pt; }
.sf-preview .pdf-cover-subtitle { font-family: 'Fraunces', Georgia, serif; font-size: 18pt; color: var(--gold); font-weight: 500; margin-bottom: 32px; font-style: italic; }
.sf-preview .pdf-divider { width: 50px; height: 1px; background: var(--gold); margin: 28px auto; }
.sf-preview .pdf-cover-meta { font-size: 10pt; color: var(--smoke-light); margin-bottom: 6px; letter-spacing: 1px; }
.sf-preview .pdf-cover-offer { font-family: 'Fraunces', Georgia, serif; font-size: 16pt; color: var(--gold); font-weight: 500; margin-top: 32px; letter-spacing: 1pt; }
.sf-preview .pdf-h1 { font-family: 'Fraunces', Georgia, serif; font-size: 24pt; color: var(--white-warm); font-weight: 500; margin-bottom: 6px; letter-spacing: -0.3pt; }
.sf-preview .pdf-h1-line { width: 50px; height: 1px; background: var(--gold); margin: 6px 0 24px; }
.sf-preview .pdf-h2 { font-family: 'Fraunces', Georgia, serif; font-size: 14pt; color: var(--gold); font-weight: 500; margin-top: 20px; margin-bottom: 10px; font-style: italic; }
.sf-preview .pdf-paragraph { font-size: 10pt; line-height: 1.7; margin-bottom: 12px; color: var(--cream); }
.sf-preview .pdf-box { border: 1px solid var(--gold); padding: 16px 18px; margin: 16px 0; background: var(--gold-soft); }
.sf-preview .pdf-box-title { font-size: 10pt; color: var(--gold); font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5pt; }
.sf-preview .pdf-box-text { font-size: 9.5pt; line-height: 1.6; color: var(--cream); }
.sf-preview .pdf-pillar { display: flex; margin-bottom: 12px; }
.sf-preview .pdf-pillar-label { width: 100px; font-size: 9pt; font-weight: 700; color: var(--gold); flex-shrink: 0; letter-spacing: 1.5pt; }
.sf-preview .pdf-pillar-text { flex: 1; font-size: 10pt; line-height: 1.7; color: var(--cream); }
.sf-preview .pdf-step-header { border-bottom: 1px solid var(--gold); padding-bottom: 14px; margin-bottom: 22px; }
.sf-preview .pdf-step-num { font-size: 10pt; color: var(--gold); font-weight: 600; letter-spacing: 3pt; }
.sf-preview .pdf-step-title { font-family: 'Fraunces', Georgia, serif; font-size: 22pt; color: var(--white-warm); font-weight: 500; margin-top: 6px; line-height: 1.15; letter-spacing: -0.3pt; }
.sf-preview .pdf-step-meta { font-size: 9pt; color: var(--smoke-light); margin-top: 12px; line-height: 1.5; display: flex; gap: 18px; flex-wrap: wrap; }
.sf-preview .pdf-step-meta-item { display: flex; gap: 6px; }
.sf-preview .pdf-step-meta-label { color: var(--gold); font-weight: 700; letter-spacing: 1.2pt; text-transform: uppercase; font-size: 8pt; }
.sf-preview .pdf-step-meta-value { color: var(--cream); }
.sf-preview .pdf-section { margin-bottom: 22px; padding: 14px 16px 14px 18px; border-left: 3px solid var(--gold-deep); background: rgba(255,255,255,0.015); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sf-preview .pdf-section.voice-empathie { border-left-color: var(--voice-empathie); background: var(--voice-empathie-bg); }
.sf-preview .pdf-section.voice-conviction { border-left-color: var(--voice-conviction); background: var(--voice-conviction-bg); }
.sf-preview .pdf-section.voice-energie { border-left-color: var(--voice-energie); background: var(--voice-energie-bg); }
.sf-preview .pdf-section.voice-mystere { border-left-color: var(--voice-mystere); background: var(--voice-mystere-bg); }
.sf-preview .pdf-section.voice-cadre { border-left-color: var(--voice-cadre); background: var(--voice-cadre-bg); }
.sf-preview .pdf-section.voice-silence { border-left-color: var(--voice-silence); background: var(--voice-silence-bg); }
.sf-preview .pdf-marker { font-size: 9pt; color: var(--gold); font-weight: 700; letter-spacing: 1.5pt; margin-bottom: 8px; text-transform: uppercase; }
.sf-preview .pdf-voice { display: inline-block; font-size: 8pt; font-weight: 700; letter-spacing: 1.8pt; text-transform: uppercase; padding: 3px 9px; border-radius: 2px; margin-bottom: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sf-preview .voice-empathie .pdf-voice { color: var(--voice-empathie); background: rgba(122,181,217,0.13); }
.sf-preview .voice-conviction .pdf-voice { color: var(--voice-conviction); background: rgba(224,122,122,0.13); }
.sf-preview .voice-energie .pdf-voice { color: var(--voice-energie); background: rgba(242,200,101,0.15); }
.sf-preview .voice-mystere .pdf-voice { color: var(--voice-mystere); background: rgba(184,154,212,0.13); }
.sf-preview .voice-cadre .pdf-voice { color: var(--voice-cadre); background: rgba(136,196,158,0.13); }
.sf-preview .voice-silence .pdf-voice { color: var(--voice-silence); background: rgba(112,112,112,0.12); }
.sf-preview .pdf-replique { font-size: 11pt; line-height: 1.7; color: var(--white-warm); font-family: 'Fraunces', Georgia, serif; font-weight: 400; margin: 6px 0 8px 0; font-style: normal; }
.sf-preview .pdf-replique::before { content: '« '; color: var(--gold); font-weight: 600; }
.sf-preview .pdf-replique::after { content: ' »'; color: var(--gold); font-weight: 600; }
.sf-preview .pdf-tactic { font-size: 8.5pt; line-height: 1.55; color: var(--smoke-light); margin-top: 10px; padding: 8px 12px; background: rgba(0,0,0,0.25); border-radius: 2px; font-style: italic; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sf-preview .pdf-tactic::before { content: '↳ '; color: var(--gold); font-style: normal; font-weight: 700; }
.sf-preview .pdf-legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; margin: 14px 0 20px; }
.sf-preview .pdf-legend-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; }
.sf-preview .pdf-legend-swatch { width: 4px; flex-shrink: 0; border-radius: 1px; margin-top: 3px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sf-preview .pdf-legend-swatch.empathie { background: var(--voice-empathie); min-height: 28px; }
.sf-preview .pdf-legend-swatch.conviction { background: var(--voice-conviction); min-height: 28px; }
.sf-preview .pdf-legend-swatch.energie { background: var(--voice-energie); min-height: 28px; }
.sf-preview .pdf-legend-swatch.mystere { background: var(--voice-mystere); min-height: 28px; }
.sf-preview .pdf-legend-swatch.cadre { background: var(--voice-cadre); min-height: 28px; }
.sf-preview .pdf-legend-swatch.silence { background: var(--voice-silence); min-height: 28px; }
.sf-preview .pdf-legend-content { flex: 1; }
.sf-preview .pdf-legend-name { font-size: 9pt; font-weight: 700; letter-spacing: 1.5pt; margin-bottom: 2px; text-transform: uppercase; }
.sf-preview .pdf-legend-name.empathie { color: var(--voice-empathie); }
.sf-preview .pdf-legend-name.conviction { color: var(--voice-conviction); }
.sf-preview .pdf-legend-name.energie { color: var(--voice-energie); }
.sf-preview .pdf-legend-name.mystere { color: var(--voice-mystere); }
.sf-preview .pdf-legend-name.cadre { color: var(--voice-cadre); }
.sf-preview .pdf-legend-name.silence { color: var(--voice-silence); }
.sf-preview .pdf-legend-desc { font-size: 8.5pt; color: var(--smoke-light); line-height: 1.5; }
.sf-preview .pdf-mode-appel { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sf-preview .pdf-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.sf-preview .pdf-mode-step { display: flex; gap: 10px; padding: 9px 10px; border-left: 3px solid var(--gold-deep); background: rgba(255,255,255,0.018); border-radius: 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact; align-items: flex-start; }
.sf-preview .pdf-mode-step.voice-empathie { border-left-color: var(--voice-empathie); background: var(--voice-empathie-bg); }
.sf-preview .pdf-mode-step.voice-conviction { border-left-color: var(--voice-conviction); background: var(--voice-conviction-bg); }
.sf-preview .pdf-mode-step.voice-energie { border-left-color: var(--voice-energie); background: var(--voice-energie-bg); }
.sf-preview .pdf-mode-step.voice-mystere { border-left-color: var(--voice-mystere); background: var(--voice-mystere-bg); }
.sf-preview .pdf-mode-step.voice-cadre { border-left-color: var(--voice-cadre); background: var(--voice-cadre-bg); }
.sf-preview .pdf-mode-step.voice-silence { border-left-color: var(--voice-silence); background: var(--voice-silence-bg); }
.sf-preview .pdf-mode-step-num { font-family: 'Fraunces', Georgia, serif; font-size: 18pt; color: var(--gold); font-weight: 500; line-height: 1; min-width: 26px; text-align: center; flex-shrink: 0; }
.sf-preview .pdf-mode-step-body { flex: 1; min-width: 0; }
.sf-preview .pdf-mode-step-title { font-size: 9pt; color: var(--white-warm); font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; line-height: 1.2; margin-bottom: 2px; }
.sf-preview .pdf-mode-step-duration { font-size: 7.5pt; color: var(--gold); letter-spacing: 1pt; margin-bottom: 5px; }
.sf-preview .pdf-mode-step-phrase { font-size: 8.5pt; color: var(--cream); line-height: 1.4; font-family: 'Fraunces', Georgia, serif; font-style: italic; }
.sf-preview .pdf-footer { position: absolute; bottom: 12mm; left: 18mm; right: 18mm; font-size: 8pt; color: var(--smoke); text-align: center; border-top: 1px solid var(--line); padding-top: 10px; letter-spacing: 1.5pt; }
.sf-preview .pdf-footer-brand { color: var(--gold); letter-spacing: 3pt; }
@media print {
  @page { size: A4; margin: 0; }
  body { background: #0A0A0A !important; }
  body * { visibility: hidden !important; }
  .sf-print-root, .sf-print-root * { visibility: visible !important; }
  .sf-print-root { position: absolute; left: 0; top: 0; width: 100%; }
  .sf-print-root .sf-preview { padding: 0 !important; }
  .sf-print-root .pdf-page { margin: 0 !important; box-shadow: none !important; border: none !important; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sf-print-root .pdf-page:last-child { page-break-after: auto; }
}
`;
