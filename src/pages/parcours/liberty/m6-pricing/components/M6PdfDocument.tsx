/**
 * Document PDF vectoriel du M6 (Pricing) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or) que le M1. Police Helvetica
 * (intégrée à react-pdf → zéro chargement réseau).
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { M6State, PedaStepKey } from "../lib/types";
import { PEDA_STEPS } from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM_ENG = "#FFF8E1";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";

// Couleurs d'état des étapes (calque de l'export HTML)
const GOOD_BG = "#EEF7E8";
const GOOD_BORDER = "#7FB069";
const WARN_BG = "#FFF8E1";
const WARN_BORDER = "#E8C770";
const BAD_BG = "#FBE9E9";
const BAD_BORDER = "#E86B6B";
const NEUTRAL_BG = "#F5F5F5";
const NEUTRAL_BORDER = "#CCCCCC";

const STEP_LABELS: Record<PedaStepKey, string> = {
  valeur_prix: "1 · Valeur PAR le prix",
  prix_valeur: "2 · Prix PAR la valeur (ROI)",
  prix_marche: "3 · Prix PAR le marché",
  prix_confiance: "4 · Prix PAR la confiance",
  paiements: "5 · Paiements halal",
  bao: "6 · Bronze / Argent / Or",
  script_annonce: "7 · Script d'annonce",
};

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  date: { fontSize: 9, color: "#555555" },
  avgScore: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 4 },
  avgLabel: { fontSize: 7, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 1 },

  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4 },

  // Étape d'audit IA
  stepSection: { marginBottom: 12, padding: 11, borderRadius: 5, borderWidth: 1 },
  stepHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  stepLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  stepScore: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  forced: { fontSize: 9, fontFamily: "Helvetica-Oblique", color: "#555555" },
  stepVerdict: { fontSize: 10, fontFamily: "Helvetica-Oblique", color: "#555555", marginBottom: 6, lineHeight: 1.45 },
  fbBlock: { paddingVertical: 5, paddingHorizontal: 8, marginTop: 5, borderRadius: 4 },
  fbGood: { backgroundColor: "rgba(127,176,105,0.15)" },
  fbWarn: { backgroundColor: "rgba(232,180,80,0.15)" },
  fbSugg: { backgroundColor: "rgba(201,168,76,0.15)" },
  fbTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.7, color: "#555555", marginBottom: 3 },
  fbItem: { fontSize: 9.5, lineHeight: 1.4, color: INK, marginBottom: 2 },

  // Données saisies
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 },
  field: { fontSize: 10, lineHeight: 1.5, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 3, marginBottom: 5, color: INK },
  bold: { fontFamily: "Helvetica-Bold" },

  // B/A/O
  baoGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  baoCard: { width: "32%", padding: 9, backgroundColor: CREAM, borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 4 },
  baoCardHi: { width: "32%", padding: 9, backgroundColor: CREAM_ENG, borderWidth: 1, borderColor: GOLD, borderRadius: 4 },
  baoTier: { fontSize: 10, fontFamily: "Helvetica-Bold", color: INK, textAlign: "center", marginBottom: 3 },
  baoContent: { fontSize: 9, fontFamily: "Helvetica-Oblique", color: INK, textAlign: "center", lineHeight: 1.4 },

  // Script
  script: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: CREAM_ENG, borderWidth: 2, borderColor: GOLD, borderRadius: 5, fontSize: 10, fontFamily: "Helvetica-Oblique", lineHeight: 1.55, color: INK },

  // Engagement
  eng: { marginTop: 16, padding: 14, backgroundColor: CREAM_ENG, borderWidth: 2, borderColor: GOLD, borderRadius: 5 },
  engTag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 6 },
  engText: { fontSize: 10, lineHeight: 1.6, color: INK, marginBottom: 10 },
  engLeviers: { padding: 8, backgroundColor: CREAM, borderRadius: 4, marginBottom: 12 },
  engLevier: { fontSize: 9.5, lineHeight: 1.45, color: INK, marginBottom: 3 },
  engSig: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 8 },
  engName: { fontSize: 12, fontFamily: "Helvetica-BoldOblique", color: INK },
  engDate: { fontSize: 10, color: INK },

  footer: { marginTop: 18, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: GOLD, fontSize: 7.5, color: GOLD_DARK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 },
});

const dash = (v?: string | null) => (v && String(v).trim() ? String(v) : "—");

function Block({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{tag}</Text>
      {children}
    </View>
  );
}

function stepStyle(score: number | null) {
  if (score === null) return { backgroundColor: NEUTRAL_BG, borderColor: NEUTRAL_BORDER };
  if (score >= 80) return { backgroundColor: GOOD_BG, borderColor: GOOD_BORDER };
  if (score >= 60) return { backgroundColor: WARN_BG, borderColor: WARN_BORDER };
  return { backgroundColor: BAD_BG, borderColor: BAD_BORDER };
}

export default function M6PdfDocument({ state }: { state: M6State }) {
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const ht = state.m4_data?.ht?.name || state.m3_data?.hero_mecanisme_nom || "—";
  const today = new Date();
  const dateStr = (state.signed_at ? new Date(state.signed_at) : today).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const validScores = PEDA_STEPS.map((k) => state.scores[k]).filter((v) => v !== null) as number[];
  const avg = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

  const d = state.data;

  const paiementOptions = (Object.entries(d.paiements.options) as Array<[string, boolean]>)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");

  const leviers = d.commitment_no_price_drop.leviers_valeur.filter((l) => l.trim());

  return (
    <Document title={`M6 — Pricing — ${state.signed_by || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Audit Pricing — Module 6 LIBERTY</Text>
            <Text style={s.sub}>Avatar : {dash(avatar)} · HT : {dash(ht)}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.date}>{dateStr}</Text>
            <Text style={s.avgScore}>{avg}/100</Text>
            <Text style={s.avgLabel}>Score moyen 7 étapes</Text>
          </View>
        </View>

        {/* Audit IA détaillé */}
        <Text style={s.h2}>Audit IA détaillé</Text>
        {PEDA_STEPS.map((k) => {
          const score = state.scores[k];
          const fb = state.lastFb[k];
          const forced = state.forced[k];
          return (
            <View key={k} style={[s.stepSection, stepStyle(score)]} wrap={false}>
              <View style={s.stepHead}>
                <Text style={s.stepLabel}>{STEP_LABELS[k]}</Text>
                <Text style={s.stepScore}>
                  {score ?? "—"}/100
                  {forced ? <Text style={s.forced}> (forcé)</Text> : null}
                </Text>
              </View>
              {fb?.verdict ? <Text style={s.stepVerdict}>{fb.verdict}</Text> : null}
              {fb?.strengths && fb.strengths.length ? (
                <View style={[s.fbBlock, s.fbGood]}>
                  <Text style={s.fbTitle}>Forces</Text>
                  {fb.strengths.map((t, i) => (
                    <Text key={i} style={s.fbItem}>- {t}</Text>
                  ))}
                </View>
              ) : null}
              {fb?.weaknesses && fb.weaknesses.length ? (
                <View style={[s.fbBlock, s.fbWarn]}>
                  <Text style={s.fbTitle}>Faiblesses</Text>
                  {fb.weaknesses.map((t, i) => (
                    <Text key={i} style={s.fbItem}>- {t}</Text>
                  ))}
                </View>
              ) : null}
              {fb?.suggestions && fb.suggestions.length ? (
                <View style={[s.fbBlock, s.fbSugg]}>
                  <Text style={s.fbTitle}>Suggestions</Text>
                  {fb.suggestions.map((t, i) => (
                    <Text key={i} style={s.fbItem}>- {t}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Données saisies */}
        <Text style={s.h2}>Données saisies</Text>

        <Block tag="1 · Valeur PAR le prix">
          <Text style={s.field}><Text style={s.bold}>Ma Bugatti : </Text>{dash(d.valeur_prix.ma_bugatti)}</Text>
          <Text style={s.field}><Text style={s.bold}>Signal : </Text>{dash(d.valeur_prix.signal_phrase)}</Text>
          <Text style={s.field}><Text style={s.bold}>Ancrage : </Text>{dash(d.valeur_prix.ancrage_phrase)}</Text>
          <Text style={s.field}><Text style={s.bold}>Contraste : </Text>{dash(d.valeur_prix.contraste_phrase)}</Text>
          <Text style={s.field}><Text style={s.bold}>Non-excuse : </Text>{dash(d.valeur_prix.non_excuse_phrase)}</Text>
        </Block>

        <Block tag={`2 · Prix PAR la valeur · ROI ${d.prix_valeur.roi_calcule}x`}>
          <Text style={s.field}>
            Résultat 12m : <Text style={s.bold}>{dash(d.prix_valeur.resultat_client_12m)}€</Text> · Prix HT : <Text style={s.bold}>{dash(d.prix_valeur.prix_ht)}€</Text>
          </Text>
          <Text style={s.field}>{dash(d.prix_valeur.justification_chiffrage)}</Text>
        </Block>

        <Block tag={`3 · Prix PAR le marché · moyenne ${d.prix_marche.prix_marche_moyen}€`}>
          {d.prix_marche.concurrents.map((c, i) => (
            <Text key={i} style={s.field}>
              {i + 1}. <Text style={s.bold}>{dash(c.nom)}</Text> · {dash(c.prix)}€ · {dash(c.url)}
            </Text>
          ))}
          <Text style={s.field}><Text style={s.bold}>Positionnement : </Text>{dash(d.prix_marche.positionnement)}</Text>
        </Block>

        <Block tag={`4 · Prix PAR la confiance · ${d.prix_confiance.confiance_sur_deliver}/100`}>
          <Text style={s.field}><Text style={s.bold}>Doutes : </Text>{dash(d.prix_confiance.doutes_principaux)}</Text>
          <Text style={s.field}><Text style={s.bold}>Action renforcement : </Text>{dash(d.prix_confiance.action_renforcement)}</Text>
          <Text style={s.field}>
            <Text style={s.bold}>Plan d'augmentation : </Text>Palier {d.prix_confiance.plan_augmentation.prochain_palier_prix}€ déclenché après {d.prix_confiance.plan_augmentation.declencheur_clients_satisfaits} clients satisfaits (cible {dash(d.prix_confiance.plan_augmentation.date_cible)})
          </Text>
        </Block>

        <Block tag="5 · Paiements halal">
          <Text style={s.field}>
            <Text style={s.bold}>Options : </Text>{paiementOptions} · {d.paiements.note_halal_acknowledged ? "Halal acknowledged : Oui" : "Halal non confirmé : Non"}
          </Text>
          <Text style={s.field}><Text style={s.bold}>Pitch : </Text>{dash(d.paiements.pitch_fractionnement)}</Text>
        </Block>

        <Block tag="6 · B/A/O">
          <View style={s.baoGrid}>
            <View style={s.baoCard}>
              <Text style={s.baoTier}>Bronze {dash(d.bao.bronze.prix)}€</Text>
              <Text style={s.baoContent}>{dash(d.bao.bronze.contenu_court)}</Text>
            </View>
            <View style={s.baoCardHi}>
              <Text style={s.baoTier}>Argent {dash(d.bao.argent.prix)}€</Text>
              <Text style={s.baoContent}>{dash(d.bao.argent.contenu_court)}</Text>
            </View>
            <View style={s.baoCard}>
              <Text style={s.baoTier}>Or {dash(d.bao.or.prix)}€</Text>
              <Text style={s.baoContent}>{dash(d.bao.or.contenu_court)}</Text>
            </View>
          </View>
        </Block>

        <Block tag="7 · Script d'annonce">
          <Text style={s.script}>{dash(d.script_annonce.script_text)}</Text>
        </Block>

        {/* Engagement no_price_drop */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement no_price_drop</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{state.signed_by || "[NOM]"}</Text>, m'engage à NE PAS baisser mon prix sous la pression des prospects. Au lieu de baisser le prix, je renforce la valeur perçue via ces 3 leviers concrets :
          </Text>
          <View style={s.engLeviers}>
            {leviers.map((l, i) => (
              <Text key={i} style={s.engLevier}><Text style={s.bold}>Levier {i + 1} : </Text>{l}</Text>
            ))}
          </View>
          <View style={s.engSig}>
            <Text style={s.engName}>{state.signed_by || "[Signature]"}</Text>
            <Text style={s.engDate}>{dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 6 — Pricing · Confidentiel</Text>
      </Page>
    </Document>
  );
}
