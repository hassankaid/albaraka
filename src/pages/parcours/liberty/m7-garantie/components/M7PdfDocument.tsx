/**
 * Document PDF vectoriel du M7 (Garantie) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or) que le M1. Police Helvetica
 * (intégrée à react-pdf → zéro chargement réseau).
 *
 * Reproduit fidèlement l'ancien export HTML : entête (avatar · HT + score moyen),
 * audit IA détaillé (6 étapes avec verdict / forces / faiblesses / suggestions
 * et cellule de score colorée good/warn/bad/neutral), données saisies (6 sections),
 * bloc « Engagement écrit » et footer.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { M7State, PedaStepKey } from "../lib/types";
import { PEDA_STEPS, GARANTIE_TYPES } from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM_ENG = "#FFF8E1";
const INK = "#1A1A1A";

// Couleurs des cellules de score (good/warn/bad/neutral) — miroir du HTML.
const GOOD_BG = "#EEF7E8";
const GOOD_BORDER = "#7FB069";
const WARN_BG = "#FFF8E1";
const WARN_BORDER = "#E8C770";
const BAD_BG = "#FBE9E9";
const BAD_BORDER = "#E86B6B";
const NEUTRAL_BG = "#F5F5F5";
const NEUTRAL_BORDER = "#CCCCCC";

// Fonds translucides des blocs forces/faiblesses/suggestions (aplatis).
const BLOCK_GOOD = "#F2F7EC";
const BLOCK_WARN = "#FBF3DF";
const BLOCK_SUGG = "#F7F1DF";

const STEP_LABELS: Record<PedaStepKey, string> = {
  type_garantie: "1 · Type de garantie",
  promesse_garantie: "2 · Promesse mesurable",
  conditions_client: "3 · Conditions client",
  math_garantie: "4 · Math rentabilité",
  expose_garantie: "5 · Pitch d'exposition",
  termes_conditions: "6 · Termes & Conditions",
};

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  date: { fontSize: 9, color: "#555555" },
  scoreBig: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 3 },
  scoreCap: { fontSize: 7, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 1 },

  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginTop: 4, marginBottom: 10 },

  // Audit IA — cellule de score par étape.
  stepSection: { marginBottom: 12, paddingVertical: 9, paddingHorizontal: 11, borderWidth: 1, borderRadius: 5 },
  stepHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 },
  stepLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  stepScore: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  forced: { fontSize: 8, fontFamily: "Helvetica-Oblique", color: "#888888" },
  stepVerdict: { fontSize: 9.5, fontFamily: "Helvetica-Oblique", color: "#555555", marginBottom: 6, lineHeight: 1.45 },

  block: { paddingVertical: 5, paddingHorizontal: 9, marginTop: 5, borderRadius: 4 },
  blockTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: "#555555", marginBottom: 3 },
  li: { flexDirection: "row", marginBottom: 2 },
  liBullet: { fontSize: 9, color: "#555555", width: 10 },
  liText: { fontSize: 9, lineHeight: 1.4, color: INK, flex: 1 },

  // Données saisies.
  block2: { marginBottom: 14 },
  dataTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, color: GOLD_DARK, marginBottom: 6 },
  field: { fontSize: 9.5, lineHeight: 1.5, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4, marginBottom: 5, color: INK },
  bold: { fontFamily: "Helvetica-Bold" },

  // Engagement.
  eng: { marginTop: 16, padding: 14, backgroundColor: CREAM_ENG, borderWidth: 2, borderColor: GOLD, borderRadius: 5 },
  engTag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 6 },
  engText: { fontSize: 10, lineHeight: 1.6, color: INK, marginBottom: 12 },
  engSig: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 8 },
  engName: { fontSize: 12, fontFamily: "Helvetica-BoldOblique", color: INK },
  engDate: { fontSize: 10, color: INK },

  footer: { marginTop: 18, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: GOLD, fontSize: 7.5, color: GOLD_DARK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 },
});

const dash = (v?: string | number | null) => {
  if (v === null || v === undefined) return "—";
  const str = String(v);
  return str.trim() ? str : "—";
};

function stepColors(score: number | null): { bg: string; border: string } {
  if (score === null) return { bg: NEUTRAL_BG, border: NEUTRAL_BORDER };
  if (score >= 80) return { bg: GOOD_BG, border: GOOD_BORDER };
  if (score >= 60) return { bg: WARN_BG, border: WARN_BORDER };
  return { bg: BAD_BG, border: BAD_BORDER };
}

function FbBlock({ title, items, bg }: { title: string; items: string[]; bg: string }) {
  return (
    <View style={[s.block, { backgroundColor: bg }]}>
      <Text style={s.blockTitle}>{title}</Text>
      {items.map((it, i) => (
        <View key={i} style={s.li}>
          <Text style={s.liBullet}>·</Text>
          <Text style={s.liText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

function DataSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.block2} wrap={false}>
      <Text style={s.dataTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function M7PdfDocument({ state }: { state: M7State }) {
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const ht = state.m4_data?.ht?.name || state.m3_data?.hero_mecanisme_nom || "—";
  const dateStr = (state.signed_at ? new Date(state.signed_at) : new Date()).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const validScores = PEDA_STEPS.map((k) => state.scores[k]).filter((sc) => sc !== null) as number[];
  const avg = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

  const d = state.data;
  const typeMeta = d.type_garantie.type_choisi ? GARANTIE_TYPES[d.type_garantie.type_choisi] : null;
  const netPositif = d.math_garantie.net_positif;

  return (
    <Document title={`M7 — Garantie — ${state.signed_by || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Construction Garantie — Module 7 LIBERTY</Text>
            <Text style={s.sub}>Avatar : {dash(avatar)} · HT : {dash(ht)}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.date}>{dateStr}</Text>
            <Text style={s.scoreBig}>{avg}/100</Text>
            <Text style={s.scoreCap}>Score moyen 6 étapes</Text>
          </View>
        </View>

        {/* Audit IA détaillé */}
        <Text style={s.sectionTitle}>Audit IA détaillé</Text>
        {PEDA_STEPS.map((k) => {
          const score = state.scores[k];
          const fb = state.lastFb[k];
          const forced = state.forced[k];
          const c = stepColors(score);
          return (
            <View key={k} style={[s.stepSection, { backgroundColor: c.bg, borderColor: c.border }]} wrap={false}>
              <View style={s.stepHead}>
                <Text style={s.stepLabel}>{STEP_LABELS[k]}</Text>
                <Text style={s.stepScore}>
                  {score ?? "—"}/100
                  {forced ? <Text style={s.forced}> (forcé)</Text> : null}
                </Text>
              </View>
              {fb?.verdict ? <Text style={s.stepVerdict}>{fb.verdict}</Text> : null}
              {fb?.strengths && fb.strengths.length ? (
                <FbBlock title="Forces" items={fb.strengths} bg={BLOCK_GOOD} />
              ) : null}
              {fb?.weaknesses && fb.weaknesses.length ? (
                <FbBlock title="Faiblesses" items={fb.weaknesses} bg={BLOCK_WARN} />
              ) : null}
              {fb?.suggestions && fb.suggestions.length ? (
                <FbBlock title="Suggestions" items={fb.suggestions} bg={BLOCK_SUGG} />
              ) : null}
            </View>
          );
        })}

        {/* Données saisies */}
        <Text style={[s.sectionTitle, { marginTop: 10 }]}>Données saisies</Text>

        <DataSection title={`1 · Type de garantie · ${dash(typeMeta?.label)}`}>
          <Text style={s.field}><Text style={s.bold}>Formule : </Text>{dash(typeMeta?.formule)}</Text>
          <Text style={s.field}><Text style={s.bold}>Justification : </Text>{dash(d.type_garantie.justification)}</Text>
        </DataSection>

        <DataSection title="2 · Promesse mesurable">
          <Text style={s.field}><Text style={s.bold}>Résultat : </Text>{dash(d.promesse_garantie.resultat)}</Text>
          <Text style={s.field}><Text style={s.bold}>Délai : </Text>{d.promesse_garantie.duree_valeur} {dash(d.promesse_garantie.duree_unite)}</Text>
          <Text style={s.field}><Text style={s.bold}>Critère objectif : </Text>{dash(d.promesse_garantie.critere_objectif)}</Text>
        </DataSection>

        <DataSection title="3 · Conditions client · bouclier anti-abus">
          <Text style={s.field}>{dash(d.conditions_client.conditions_text)}</Text>
        </DataSection>

        <DataSection title={`4 · Math rentabilité · Net ${netPositif > 0 ? "+" : ""}${netPositif} clients`}>
          <Text style={s.field}>
            Clients initiaux : <Text style={s.bold}>{d.math_garantie.clients_initiaux}</Text> · Delta : <Text style={s.bold}>+{d.math_garantie.delta_estime}</Text> · Taux refund : <Text style={s.bold}>{d.math_garantie.taux_refund_pct}%</Text>
          </Text>
        </DataSection>

        <DataSection title="5 · Pitch d'exposition">
          <Text style={s.field}><Text style={s.bold}>Pitch en call : </Text>{dash(d.expose_garantie.pitch_text)}</Text>
          <Text style={s.field}><Text style={s.bold}>Formule marketing : </Text>{dash(d.expose_garantie.formule_marketing)}</Text>
        </DataSection>

        <DataSection title="6 · Termes & Conditions">
          <Text style={s.field}>{dash(d.termes_conditions.tnc_text)}</Text>
          <Text style={s.field}><Text style={s.bold}>Statut vendeur : </Text>{dash(d.termes_conditions.vendeur_statut)}</Text>
        </DataSection>

        {/* Engagement écrit */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement écrit</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{state.signed_by || "[NOM]"}</Text>, m'engage à respecter LITTÉRALEMENT cette garantie telle qu'écrite — sans formuler verbalement de promesse différente, sans modifier les conditions a posteriori, et en exécutant le remboursement ou la continuité dans les délais convenus si un client la déclenche dans les conditions prévues.
          </Text>
          <View style={s.engSig}>
            <Text style={s.engName}>{state.signed_by || "[Signature]"}</Text>
            <Text style={s.engDate}>{dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 7 — Garantie · Confidentiel</Text>
      </Page>
    </Document>
  );
}
