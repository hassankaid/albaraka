/** Export mémo M14 — 5 sections (Synthèse, Justifications, Architecture, Lancement) via impression navigateur. */
import { type M14State, type FormatKey, FORMATS, MATRICE_CRITERES, PRIX_PLANCHER_MT, VERSION } from "./types";
import { evaluatePricing, countDecisions, getPrixHT, getProgrammeHTNom, formatPrix } from "./validations";

function esc(s: string | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function safe(s: any): string { const t = String(s ?? "").trim(); return t || "—"; }

export function exportM14PDF(state: M14State): void {
  const d = state.data || ({} as any);
  const fmt = d.format_choisi || "";
  const fmtCfg = fmt ? FORMATS[fmt as FormatKey] : null;
  const prixHT = getPrixHT(state);
  const evp = evaluatePricing(d.prix_mt, prixHT, d.prix_mt_unite, d.valeur_percue_eur);
  const stats = countDecisions(d.modules_decision);
  const m1 = state.m1_data || {};
  const m5 = state.m5_data || {};
  const programmeNom = getProgrammeHTNom(state);
  const eleveNom = state.signed_by || "—";
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dateMemo = dd + "/" + mm + "/" + now.getFullYear();

  const ratioPct = prixHT > 0 ? evp.ratio_pct + "%" : "—";
  const valeurMultiple = evp.prix_mt_effectif > 0 && d.valeur_percue_eur > 0 ? (d.valeur_percue_eur / evp.prix_mt_effectif).toFixed(1) + "×" : "—";

  const avatarVal = (m1.avatar_nom || "") + (m1.avatar_age ? " · " + m1.avatar_age : "");
  const pointB = m5.ht_point_b || (state.m11_data && state.m11_data.point_b) || "—";

  const row = (label: string, value: string) =>
    `<div class="lv"><div class="lv-l">${esc(label)}</div><div class="lv-v">${esc(value)}</div></div>`;

  // ── Garde-fous (couleurs) ──
  const gf1ok = evp.plancher_ok;
  const gf1 = `Plancher ${PRIX_PLANCHER_MT} € : ${gf1ok ? "OK" : "NON RESPECTÉ"}`;
  let gf2 = "", gf2cls = "";
  if (prixHT <= 0) { gf2 = "Ratio MT/HT entre 10% et 33% : non vérifiable (HT manquant)"; gf2cls = "dim"; }
  else if (evp.in_range) { gf2 = `Ratio MT/HT entre 10% et 33% : OK (${evp.ratio_pct}%)`; gf2cls = "ok"; }
  else { gf2 = `Ratio MT/HT entre 10% et 33% : HORS RANGE (${evp.ratio_pct}%)`; gf2cls = "bad"; }
  const gf3ok = evp.valeur_ok;
  const gf3 = `Valeur perçue ≥ 5× prix annualisé : ${gf3ok ? "OK (" + valeurMultiple + ")" : "à vérifier"}`;

  // ── Matrice remplie ──
  const matriceRows = MATRICE_CRITERES.map((crit) => {
    const opt = crit.options.find((o) => o.value === (d.matrice_reponses || {})[crit.id]);
    return `<div class="mx"><div class="mx-q">${esc(crit.question)}</div><div class="mx-a">${esc(opt ? opt.label : "—")}</div></div>`;
  }).join("");

  // ── Modules ──
  const md = d.modules_decision || [];
  const gardes = md.filter((m: any) => m.decision === "garder");
  const adaptes = md.filter((m: any) => m.decision === "adapter");
  const retires = md.filter((m: any) => m.decision === "retirer");
  let moduleBlocks = "";
  if (gardes.length) {
    moduleBlocks += `<div class="sub">Modules gardés tel quel (${gardes.length})</div>`;
    gardes.forEach((m: any) => {
      moduleBlocks += `<div class="mod kept">+ Module ${m.index || "?"} — ${esc(safe(m.nom_origine))}</div>`;
      if (m.objectif_origine) moduleBlocks += `<div class="mod-meta">Objectif : ${esc(safe(m.objectif_origine))}</div>`;
    });
  }
  if (adaptes.length) {
    moduleBlocks += `<div class="sub">Modules adaptés pour ${esc(fmtCfg ? fmtCfg.label : "—")} (${adaptes.length})</div>`;
    adaptes.forEach((m: any) => {
      moduleBlocks += `<div class="mod adapt">~ Module ${m.index || "?"} — ${esc(safe(m.nom_origine))}</div>`;
      if (m.objectif_origine) moduleBlocks += `<div class="mod-meta">Objectif HT : ${esc(safe(m.objectif_origine))}</div>`;
      if (m.adaptation) moduleBlocks += `<div class="mod-adapt">Adaptation : ${esc(safe(m.adaptation))}</div>`;
    });
  }
  if (retires.length) {
    moduleBlocks += `<div class="sub">Modules retirés du MT (${retires.length})</div>`;
    retires.forEach((m: any) => {
      moduleBlocks += `<div class="mod removed">- Module ${m.index || "?"} — ${esc(safe(m.nom_origine))}</div>`;
      moduleBlocks += `<div class="mod-meta">Inséparable du 1-to-1 — ne tient pas dans le format ${esc(fmtCfg ? fmtCfg.label : "MT")}.</div>`;
    });
  }
  if (!moduleBlocks) moduleBlocks = `<div class="mod-meta">Aucun module n'a encore été classé.</div>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="color-scheme" content="light"><style>:root{color-scheme:only light}</style>
<title>Mémo MT — ${esc(programmeNom)}</title>
<style>
@page { size: A4; margin: 14mm 13mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', system-ui, sans-serif; color: #222; background: #fff; margin: 0; font-size: 11px; line-height: 1.4; }
.doc { max-width: 800px; margin: 0 auto; padding: 8px 0 28px; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.brand { display: flex; justify-content: space-between; align-items: baseline; }
.brand-l { font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #C9A84C; text-transform: uppercase; }
.brand-r { font-size: 9px; color: #666; }
.doc-title { font-size: 24px; font-weight: 700; color: #080808; margin: 14px 0 4px; }
.doc-sub { font-size: 10px; color: #666; font-style: italic; margin-bottom: 22px; }
.sec-title { font-size: 16px; font-weight: 700; color: #C9A84C; margin: 16px 0 8px; }
.h3 { font-size: 13px; font-weight: 700; color: #080808; margin: 8px 0 4px; }
.sub { font-size: 11px; font-weight: 700; color: #C9A84C; margin: 10px 0 4px; }
.body { font-size: 10px; color: #222; line-height: 1.45; margin: 4px 0 8px; }
.lv { display: flex; gap: 10px; padding: 2px 0; }
.lv-l { width: 200px; flex-shrink: 0; font-size: 9px; color: #666; letter-spacing: 0.4px; }
.lv-v { flex: 1; font-size: 11px; font-weight: 700; color: #080808; }
.hr { border: none; border-top: 0.5px solid #ccc; margin: 8px 0; }
.mx { display: flex; gap: 12px; margin: 4px 0; }
.mx-q { flex: 1; font-size: 10px; color: #333; }
.mx-a { width: 220px; flex-shrink: 0; font-size: 10px; font-style: italic; color: #C9A84C; text-align: right; }
.quote { font-size: 10px; font-style: italic; color: #444; background: #f7f4ec; border-radius: 6px; padding: 10px 12px; margin: 2px 0 12px; }
.gf { list-style: none; padding: 0; margin: 4px 0 10px; }
.gf li { font-size: 10.5px; font-weight: 600; padding: 2px 0; }
.ok { color: #4cc987; } .bad { color: #c94c4c; } .dim { color: #666; }
.mod { font-size: 11px; font-weight: 700; margin: 4px 0 1px; }
.mod.kept { color: #4cc987; } .mod.adapt { color: #c98a4c; } .mod.removed { color: #c94c4c; }
.mod-meta { font-size: 9px; font-style: italic; color: #666; margin: 0 0 1px 12px; }
.mod-adapt { font-size: 10px; color: #222; margin: 2px 0 6px 12px; }
.phase-h { font-size: 11px; font-weight: 700; color: #C9A84C; margin: 8px 0 4px; }
ul, ol { margin: 4px 0 8px; padding-left: 18px; font-size: 10px; line-height: 1.45; }
.footer { margin-top: 16px; padding-top: 8px; border-top: 0.5px solid #ccc; font-size: 8px; color: #666; font-style: italic; text-align: center; }
</style></head><body>
<div class="doc">

  <!-- PAGE 1 — SYNTHÈSE -->
  <div class="page">
    <div class="brand"><span class="brand-l">AL BARAKA · LIBERTY</span><span class="brand-r">Module 14 · v2.0.0</span></div>
    <div class="doc-title">Mémo d'architecture Middle-Ticket</div>
    <div class="doc-sub">Dérivé de ${esc(programmeNom)} · pour ${esc(eleveNom)} · ${esc(dateMemo)}</div>
    <div class="sec-title">Synthèse</div>
    ${row("Programme HT de référence", programmeNom)}
    ${row("Avatar visé", safe(avatarVal))}
    ${row("Niche", m1.niche || "—")}
    ${row("Point B HT", pointB)}
    <hr class="hr">
    ${row("Format MT choisi", fmtCfg ? fmtCfg.label : "—")}
    ${row("Prix MT", formatPrix(d.prix_mt, d.prix_mt_unite))}
    ${row("Prix HT (référence M6)", prixHT > 0 ? prixHT.toLocaleString("fr-FR") + " €" : "non renseigné")}
    ${row("Ratio MT / HT", ratioPct + "   (cible : 10% à 33%)")}
    ${row("Valeur perçue annuelle", d.valeur_percue_eur > 0 ? d.valeur_percue_eur.toLocaleString("fr-FR") + " €" : "—")}
    ${row("Valeur / prix annualisé", valeurMultiple + "   (cible : ≥ 5×)")}
    <hr class="hr">
    ${row("Modules gardés tel quel", String(stats.garder))}
    ${row("Modules adaptés", String(stats.adapter))}
    ${row("Modules retirés", String(stats.retirer))}
    ${row("Total modules actifs MT", String(stats.garder + stats.adapter))}
  </div>

  <!-- PAGE 2 — JUSTIFICATIONS -->
  <div class="page">
    <div class="sec-title">Pourquoi ce format</div>
    <div class="h3">${esc((fmtCfg ? fmtCfg.label : "—") + " — " + (fmtCfg ? fmtCfg.range : ""))}</div>
    <div class="body">${esc(fmtCfg ? fmtCfg.quand : "")}</div>
    <div class="sub">Matrice de décision remplie</div>
    ${matriceRows}
    <div class="sub">Ta justification personnelle</div>
    <div class="quote">${esc(safe(d.format_justification))}</div>
    <div class="sec-title">Pourquoi ce prix</div>
    <div class="sub">Garde-fous respectés</div>
    <ul class="gf">
      <li class="${gf1ok ? "ok" : "bad"}">${esc(gf1)}</li>
      <li class="${gf2cls}">${esc(gf2)}</li>
      <li class="${gf3ok ? "ok" : "dim"}">${esc(gf3)}</li>
    </ul>
    <div class="sub">Ta justification du prix</div>
    <div class="quote">${esc(safe(d.justification_prix))}</div>
  </div>

  <!-- PAGES 3-4 — ARCHITECTURE -->
  <div class="page">
    <div class="sec-title">Architecture détaillée des modules MT</div>
    <div class="body">À partir des modules de ton programme HT (${esc(programmeNom)}), voici la composition finale de ton Middle-Ticket. Les modules adaptés indiquent précisément comment leur livraison change pour scaler sans accompagnement individuel.</div>
    ${moduleBlocks}
  </div>

  <!-- PAGE 5 — LANCEMENT -->
  <div class="page">
    <div class="sec-title">Consignes de lancement de ton MT</div>
    <div class="body">Un MT se vend par fenêtres courtes — pas en flux continu. Voici les 4 phases à respecter pour ton premier lancement.</div>
    <div class="phase-h">Phase 1 — Annonce (J−14 à J−10)</div>
    <div class="body">Tu réveilles ta liste avec un premier email + post, puis tu démarres une séquence de 3 vidéos de valeur pure. Personne n'achète encore — l'objectif est de réactiver l'attention et de poser ton autorité avec du contenu qui livre vraiment, sans pitch.</div>
    <div class="phase-h">Phase 2 — Webinaire (J−7 à J−3)</div>
    <div class="body">Tu ouvres les inscriptions à un webinaire live (J−7) et tu y vends ton MT en direct (J−3). Structure classique : problème > solution > offre > bonus. Une partie significative de tes ventes se fait dans les 24h qui suivent le live.</div>
    <div class="phase-h">Phase 3 — Cart open + relances (J0 à J+3)</div>
    <div class="body">La page de vente s'ouvre à J0. Tu envoies une séquence de 3 emails — un par angle : témoignage client HT, objection levée, urgence. Tu peux ajouter un rappel de bonus expirant à J−1 entre le webinaire et l'ouverture.</div>
    <div class="phase-h">Phase 4 — Fermeture + dernière chance (J+4 à J+5)</div>
    <div class="body">Tu fais monter l'urgence avec un dernier bonus qui expire. À J+5 minuit, la page se ferme — cette fermeture est non négociable, sinon ton urgence devient bidon et tu casses ta crédibilité pour les prochains lancements.</div>
    <div class="phase-h">Ratios de conversion typiques pour un MT</div>
    <ul>
      <li>Taux d'inscription au webinaire : 5 à 12 % de ta liste totale</li>
      <li>Taux de participation au webinaire live : 30 à 45 % des inscrits</li>
      <li>Taux de conversion participants > acheteurs : 8 à 15 % (MT entre 200 € et 1 000 €)</li>
      <li>Taux de conversion total liste > acheteurs : 0,5 à 3 % selon ratio prix/audience</li>
      <li>Répartition typique : 30 % des ventes au J0, 40 % sur J+1 à J+3, 30 % sur J+4 à J+5</li>
    </ul>
    <div class="phase-h">3 questions à te poser avant de lancer (à débattre avec ton coach)</div>
    <ol>
      <li>As-tu déjà signé au moins un client HT à plein tarif ? Si non, le MT n'a pas de fondation pour exister — il prolonge un HT qui marche, pas un HT théorique.</li>
      <li>Combien de prospects de ta liste actuelle peuvent payer ce prix sans difficulté ? Si tu n'as pas une réponse chiffrée, fais un sondage informel à 10 prospects froids avant.</li>
      <li>Y a-t-il un concurrent positionné dans la même niche qui vend dans cette fourchette de prix ? L'absence de concurrent n'est pas un signe d'opportunité — c'est souvent un signe d'absence de marché solvable.</li>
    </ol>
    <hr class="hr">
    <div class="footer">Mémo généré le ${esc(dateMemo)} depuis le Module 14 d'OFFRE-CREATION V2 · Plateforme AL BARAKA · ${esc(VERSION)}</div>
  </div>

</div>
<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`);
  w.document.close();
}
