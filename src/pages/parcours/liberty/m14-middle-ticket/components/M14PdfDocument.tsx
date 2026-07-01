/**
 * Document PDF vectoriel du M14 (Architecturer ton Middle-Ticket) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or) que le M1. Police Helvetica
 * (intégrée à react-pdf → zéro chargement réseau).
 *
 * Reproduit fidèlement les 5 sections de l'ancien mémo HTML :
 *   1. Synthèse
 *   2. Justifications (format + prix, garde-fous, matrice)
 *   3. Architecture détaillée des modules MT
 *   4. Consignes de lancement (4 phases, ratios, 3 questions)
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
  type M14State, type FormatKey, FORMATS, MATRICE_CRITERES, PRIX_PLANCHER_MT, VERSION,
} from "../lib/types";
import {
  evaluatePricing, countDecisions, getPrixHT, getProgrammeHTNom, formatPrix,
} from "../lib/validations";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM2 = "#FFFBF0";
const CREAM_ENG = "#FFF8E1";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";
const GOOD = "#2E7D4F";
const BAD = "#B23A3A";
const DIM = "#6B6B6B";
const ADAPT = "#A9722F";

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  docSub: { fontSize: 8.5, color: DIM, fontFamily: "Helvetica-Oblique", marginTop: 3 },
  date: { fontSize: 9, color: "#555555" },

  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginTop: 14, marginBottom: 8 },
  sectionTitleFirst: { fontSize: 13, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 8 },

  block: { marginBottom: 11 },
  tag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 4 },

  body: { fontSize: 10, lineHeight: 1.5, color: INK, marginBottom: 8 },
  bold: { fontFamily: "Helvetica-Bold" },
  h3: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: INK, marginTop: 6, marginBottom: 4 },

  // ── Lignes label/valeur (synthèse) ──
  lv: { flexDirection: "row", paddingVertical: 2 },
  lvL: { width: 200, fontSize: 8.5, color: DIM, letterSpacing: 0.3 },
  lvV: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: INK },
  hr: { borderTopWidth: 0.5, borderTopColor: BORDER_SOFT, marginVertical: 8 },

  // ── Matrice ──
  mx: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  mxQ: { flex: 1, fontSize: 9.5, color: INK, paddingRight: 12, lineHeight: 1.4 },
  mxA: { width: 200, fontSize: 9.5, fontFamily: "Helvetica-Oblique", color: GOLD_DARK, textAlign: "right" },

  // ── Citations (justifications) ──
  quote: { fontSize: 9.5, fontFamily: "Helvetica-Oblique", color: "#3A3A3A", backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, paddingVertical: 10, paddingHorizontal: 12, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, marginTop: 2, marginBottom: 12 },

  // ── Garde-fous ──
  gf: { fontSize: 10, fontFamily: "Helvetica-Bold", paddingVertical: 2 },
  gfOk: { color: GOOD },
  gfBad: { color: BAD },
  gfDim: { color: DIM },

  // ── Modules ──
  sub2: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: GOLD_DARK, marginTop: 10, marginBottom: 4 },
  mod: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 1 },
  modKept: { color: GOOD },
  modAdapt: { color: ADAPT },
  modRemoved: { color: BAD },
  modMeta: { fontSize: 8.5, fontFamily: "Helvetica-Oblique", color: DIM, marginLeft: 12, marginBottom: 1 },
  modAdaptTxt: { fontSize: 9.5, color: INK, marginLeft: 12, marginTop: 2, marginBottom: 6, lineHeight: 1.4 },

  // ── Phases de lancement ──
  phaseH: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: GOLD_DARK, marginTop: 8, marginBottom: 4 },

  // ── Listes ──
  li: { flexDirection: "row", marginBottom: 3 },
  liBullet: { width: 14, fontSize: 9.5, color: GOLD_DARK },
  liText: { flex: 1, fontSize: 9.5, color: INK, lineHeight: 1.45 },

  footer: { marginTop: 18, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: GOLD, fontSize: 7.5, color: GOLD_DARK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 },
});

const dash = (v?: string | null) => (v && String(v).trim() ? String(v) : "—");
const safe = (v: any) => { const t = String(v ?? "").trim(); return t || "—"; };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.lv}>
      <Text style={s.lvL}>{label}</Text>
      <Text style={s.lvV}>{value}</Text>
    </View>
  );
}

function Bullet({ children, ordinal }: { children: ReactNode; ordinal?: string }) {
  return (
    <View style={s.li}>
      <Text style={s.liBullet}>{ordinal || "·"}</Text>
      <Text style={s.liText}>{children}</Text>
    </View>
  );
}

export default function M14PdfDocument({ state }: { state: M14State }) {
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
  const valeurMultiple =
    evp.prix_mt_effectif > 0 && d.valeur_percue_eur > 0
      ? (d.valeur_percue_eur / evp.prix_mt_effectif).toFixed(1) + "×"
      : "—";

  const avatarVal = (m1.avatar_nom || "") + (m1.avatar_age ? " · " + m1.avatar_age : "");
  const pointB = m5.ht_point_b || (state.m11_data && state.m11_data.point_b) || "—";

  // ── Garde-fous (couleurs) ──
  const gf1ok = evp.plancher_ok;
  const gf1 = `Plancher ${PRIX_PLANCHER_MT} € : ${gf1ok ? "OK" : "NON RESPECTÉ"}`;
  let gf2 = "", gf2cls: "ok" | "bad" | "dim" = "dim";
  if (prixHT <= 0) { gf2 = "Ratio MT/HT entre 10% et 33% : non vérifiable (HT manquant)"; gf2cls = "dim"; }
  else if (evp.in_range) { gf2 = `Ratio MT/HT entre 10% et 33% : OK (${evp.ratio_pct}%)`; gf2cls = "ok"; }
  else { gf2 = `Ratio MT/HT entre 10% et 33% : HORS RANGE (${evp.ratio_pct}%)`; gf2cls = "bad"; }
  const gf3ok = evp.valeur_ok;
  const gf3 = `Valeur perçue ≥ 5× prix annualisé : ${gf3ok ? "OK (" + valeurMultiple + ")" : "à vérifier"}`;
  const gfStyle = (cls: "ok" | "bad" | "dim") => (cls === "ok" ? s.gfOk : cls === "bad" ? s.gfBad : s.gfDim);

  // ── Matrice remplie ──
  const matriceRows = MATRICE_CRITERES.map((crit) => {
    const opt = crit.options.find((o) => o.value === (d.matrice_reponses || {})[crit.id]);
    return { id: crit.id, q: crit.question, a: opt ? opt.label : "—" };
  });

  // ── Modules ──
  const md: any[] = d.modules_decision || [];
  const gardes = md.filter((m) => m.decision === "garder");
  const adaptes = md.filter((m) => m.decision === "adapter");
  const retires = md.filter((m) => m.decision === "retirer");
  const aucunModule = gardes.length === 0 && adaptes.length === 0 && retires.length === 0;
  const formatLabelForAdapt = fmtCfg ? fmtCfg.label : "—";
  const formatLabelForRemoved = fmtCfg ? fmtCfg.label : "MT";

  return (
    <Document title={`Mémo MT — ${programmeNom}`}>
      {/* ── PAGE 1 — SYNTHÈSE ── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Mémo d'architecture Middle-Ticket</Text>
            <Text style={s.sub}>AL BARAKA · LIBERTY · Module 14 · {VERSION}</Text>
            <Text style={s.docSub}>Dérivé de {safe(programmeNom)} · pour {safe(eleveNom)}</Text>
          </View>
          <Text style={s.date}>{dateMemo}</Text>
        </View>

        <Text style={s.sectionTitleFirst}>Synthèse</Text>
        <Row label="Programme HT de référence" value={safe(programmeNom)} />
        <Row label="Avatar visé" value={safe(avatarVal)} />
        <Row label="Niche" value={dash(m1.niche)} />
        <Row label="Point B HT" value={safe(pointB)} />
        <View style={s.hr} />
        <Row label="Format MT choisi" value={fmtCfg ? fmtCfg.label : "—"} />
        <Row label="Prix MT" value={formatPrix(d.prix_mt, d.prix_mt_unite)} />
        <Row label="Prix HT (référence M6)" value={prixHT > 0 ? prixHT.toLocaleString("fr-FR") + " €" : "non renseigné"} />
        <Row label="Ratio MT / HT" value={ratioPct + "   (cible : 10% à 33%)"} />
        <Row label="Valeur perçue annuelle" value={d.valeur_percue_eur > 0 ? d.valeur_percue_eur.toLocaleString("fr-FR") + " €" : "—"} />
        <Row label="Valeur / prix annualisé" value={valeurMultiple + "   (cible : ≥ 5×)"} />
        <View style={s.hr} />
        <Row label="Modules gardés tel quel" value={String(stats.garder)} />
        <Row label="Modules adaptés" value={String(stats.adapter)} />
        <Row label="Modules retirés" value={String(stats.retirer)} />
        <Row label="Total modules actifs MT" value={String(stats.garder + stats.adapter)} />

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 14 — Architecturer ton Middle-Ticket · Confidentiel</Text>
      </Page>

      {/* ── PAGE 2 — JUSTIFICATIONS ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitleFirst}>Pourquoi ce format</Text>
        <Text style={s.h3}>{(fmtCfg ? fmtCfg.label : "—") + " — " + (fmtCfg ? fmtCfg.range : "")}</Text>
        <Text style={s.body}>{fmtCfg ? fmtCfg.quand : ""}</Text>

        <Text style={s.sub2}>Matrice de décision remplie</Text>
        {matriceRows.map((r) => (
          <View key={r.id} style={s.mx}>
            <Text style={s.mxQ}>{r.q}</Text>
            <Text style={s.mxA}>{r.a}</Text>
          </View>
        ))}

        <Text style={s.sub2}>Ta justification personnelle</Text>
        <Text style={s.quote}>{safe(d.format_justification)}</Text>

        <Text style={s.sectionTitle}>Pourquoi ce prix</Text>
        <Text style={s.sub2}>Garde-fous respectés</Text>
        <Text style={[s.gf, gf1ok ? s.gfOk : s.gfBad]}>{gf1}</Text>
        <Text style={[s.gf, gfStyle(gf2cls)]}>{gf2}</Text>
        <Text style={[s.gf, gf3ok ? s.gfOk : s.gfDim]}>{gf3}</Text>

        <Text style={s.sub2}>Ta justification du prix</Text>
        <Text style={s.quote}>{safe(d.justification_prix)}</Text>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 14 — Architecturer ton Middle-Ticket · Confidentiel</Text>
      </Page>

      {/* ── PAGE 3 — ARCHITECTURE ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitleFirst}>Architecture détaillée des modules MT</Text>
        <Text style={s.body}>
          À partir des modules de ton programme HT ({safe(programmeNom)}), voici la composition finale de ton Middle-Ticket. Les modules adaptés indiquent précisément comment leur livraison change pour scaler sans accompagnement individuel.
        </Text>

        {aucunModule && (
          <Text style={s.modMeta}>Aucun module n'a encore été classé.</Text>
        )}

        {gardes.length > 0 && (
          <View>
            <Text style={s.sub2}>Modules gardés tel quel ({gardes.length})</Text>
            {gardes.map((m, i) => (
              <View key={"g" + i} wrap={false}>
                <Text style={[s.mod, s.modKept]}>+ Module {m.index || "?"} — {safe(m.nom_origine)}</Text>
                {m.objectif_origine ? <Text style={s.modMeta}>Objectif : {safe(m.objectif_origine)}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {adaptes.length > 0 && (
          <View>
            <Text style={s.sub2}>Modules adaptés pour {formatLabelForAdapt} ({adaptes.length})</Text>
            {adaptes.map((m, i) => (
              <View key={"a" + i} wrap={false}>
                <Text style={[s.mod, s.modAdapt]}>~ Module {m.index || "?"} — {safe(m.nom_origine)}</Text>
                {m.objectif_origine ? <Text style={s.modMeta}>Objectif HT : {safe(m.objectif_origine)}</Text> : null}
                {m.adaptation ? <Text style={s.modAdaptTxt}>Adaptation : {safe(m.adaptation)}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {retires.length > 0 && (
          <View>
            <Text style={s.sub2}>Modules retirés du MT ({retires.length})</Text>
            {retires.map((m, i) => (
              <View key={"r" + i} wrap={false}>
                <Text style={[s.mod, s.modRemoved]}>- Module {m.index || "?"} — {safe(m.nom_origine)}</Text>
                <Text style={s.modMeta}>Inséparable du 1-to-1 — ne tient pas dans le format {formatLabelForRemoved}.</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 14 — Architecturer ton Middle-Ticket · Confidentiel</Text>
      </Page>

      {/* ── PAGE 4 — LANCEMENT ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitleFirst}>Consignes de lancement de ton MT</Text>
        <Text style={s.body}>Un MT se vend par fenêtres courtes — pas en flux continu. Voici les 4 phases à respecter pour ton premier lancement.</Text>

        <Text style={s.phaseH}>Phase 1 — Annonce (J−14 à J−10)</Text>
        <Text style={s.body}>Tu réveilles ta liste avec un premier email + post, puis tu démarres une séquence de 3 vidéos de valeur pure. Personne n'achète encore — l'objectif est de réactiver l'attention et de poser ton autorité avec du contenu qui livre vraiment, sans pitch.</Text>

        <Text style={s.phaseH}>Phase 2 — Webinaire (J−7 à J−3)</Text>
        <Text style={s.body}>Tu ouvres les inscriptions à un webinaire live (J−7) et tu y vends ton MT en direct (J−3). Structure classique : problème {'>'} solution {'>'} offre {'>'} bonus. Une partie significative de tes ventes se fait dans les 24h qui suivent le live.</Text>

        <Text style={s.phaseH}>Phase 3 — Cart open + relances (J0 à J+3)</Text>
        <Text style={s.body}>La page de vente s'ouvre à J0. Tu envoies une séquence de 3 emails — un par angle : témoignage client HT, objection levée, urgence. Tu peux ajouter un rappel de bonus expirant à J−1 entre le webinaire et l'ouverture.</Text>

        <Text style={s.phaseH}>Phase 4 — Fermeture + dernière chance (J+4 à J+5)</Text>
        <Text style={s.body}>Tu fais monter l'urgence avec un dernier bonus qui expire. À J+5 minuit, la page se ferme — cette fermeture est non négociable, sinon ton urgence devient bidon et tu casses ta crédibilité pour les prochains lancements.</Text>

        <Text style={s.phaseH}>Ratios de conversion typiques pour un MT</Text>
        <Bullet>Taux d'inscription au webinaire : 5 à 12 % de ta liste totale</Bullet>
        <Bullet>Taux de participation au webinaire live : 30 à 45 % des inscrits</Bullet>
        <Bullet>Taux de conversion participants {'>'} acheteurs : 8 à 15 % (MT entre 200 € et 1 000 €)</Bullet>
        <Bullet>Taux de conversion total liste {'>'} acheteurs : 0,5 à 3 % selon ratio prix/audience</Bullet>
        <Bullet>Répartition typique : 30 % des ventes au J0, 40 % sur J+1 à J+3, 30 % sur J+4 à J+5</Bullet>

        <Text style={s.phaseH}>3 questions à te poser avant de lancer (à débattre avec ton coach)</Text>
        <Bullet ordinal="1.">As-tu déjà signé au moins un client HT à plein tarif ? Si non, le MT n'a pas de fondation pour exister — il prolonge un HT qui marche, pas un HT théorique.</Bullet>
        <Bullet ordinal="2.">Combien de prospects de ta liste actuelle peuvent payer ce prix sans difficulté ? Si tu n'as pas une réponse chiffrée, fais un sondage informel à 10 prospects froids avant.</Bullet>
        <Bullet ordinal="3.">Y a-t-il un concurrent positionné dans la même niche qui vend dans cette fourchette de prix ? L'absence de concurrent n'est pas un signe d'opportunité — c'est souvent un signe d'absence de marché solvable.</Bullet>

        <Text style={s.footer}>Mémo généré le {dateMemo} depuis le Module 14 d'OFFRE-CREATION V2 · Plateforme AL BARAKA · {VERSION}</Text>
      </Page>
    </Document>
  );
}
