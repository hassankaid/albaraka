/**
 * Document PDF vectoriel du M4 (Value Ladder — vue d'ensemble) via
 * @react-pdf/renderer. Remplace l'ancien export HTML + window.print() →
 * vrai téléchargement direct, texte vectoriel net, même charte (crème/or).
 * Police Helvetica (intégrée à react-pdf → zéro chargement réseau).
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
  TIERS, TIER_LABELS, TIER_PRICE_RANGES, TIER_ROLES,
  ENTRY_STRATEGIES, BRIDGE_BY_ID,
} from "../lib/types";
import type { M4State } from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM2 = "#FFFBF0";
const CREAM_ENG = "#FFF8E1";
const CREAM_BRIDGE = "#F8F4E0";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";
const MUTED = "#999999";

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 18 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  date: { fontSize: 9, color: "#555555" },
  score: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 4 },
  scoreLabel: { fontSize: 7, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.8 },

  block: { marginBottom: 16 },
  tag: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 8 },
  tagRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 8 },
  tagInline: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK },

  field: { fontSize: 10, lineHeight: 1.6, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 4, marginBottom: 8 },
  fieldText: { fontSize: 10, lineHeight: 1.6, color: INK },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },

  // Table (récap des 4 marches) — flexbox, pas de CSS table
  table: { borderWidth: 0, marginTop: 2 },
  trHead: { flexDirection: "row", backgroundColor: CREAM, borderBottomWidth: 1, borderBottomColor: BORDER_SOFT },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER_SOFT },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: GOLD_DARK, paddingVertical: 7, paddingHorizontal: 8 },
  td: { fontSize: 9, lineHeight: 1.4, color: INK, paddingVertical: 7, paddingHorizontal: 8 },
  colNiveau: { width: "26%" },
  colPrix: { width: "18%" },
  colRole: { width: "32%" },
  colOffre: { width: "24%" },
  tdHigh: { color: GOLD_DARK, fontFamily: "Helvetica-Bold" },
  tdMuted: { color: MUTED, fontFamily: "Helvetica-Oblique" },

  // Stratégie
  strategyCard: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: CREAM_ENG, borderWidth: 1.5, borderColor: GOLD, borderRadius: 6, marginBottom: 10 },
  strategyLabel: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GOLD_DARK },
  strategyDesc: { fontSize: 10, lineHeight: 1.55, marginTop: 4, color: "#444444" },
  fieldFeedback: { backgroundColor: "#EEF7E8", borderLeftColor: "#7FB069" },

  // Badges
  badge: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8, marginLeft: 6 },
  badgeOk: { backgroundColor: "#D9EAD3", color: "#38761D" },
  badgeWarn: { backgroundColor: "#FFF2CC", color: GOLD_DARK },

  // Passerelles
  bridge: { paddingVertical: 9, paddingHorizontal: 12, backgroundColor: CREAM_BRIDGE, borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 4, marginBottom: 8 },
  bridgeHead: { fontSize: 9, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 },
  bridgeText: { fontSize: 10, lineHeight: 1.55, color: INK },
  emptyNote: { fontSize: 10, color: MUTED, fontFamily: "Helvetica-Oblique" },

  // Engagement
  eng: { marginTop: 6, paddingVertical: 16, paddingHorizontal: 18, backgroundColor: CREAM_ENG, borderWidth: 2, borderColor: GOLD, borderRadius: 6 },
  engTag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 8 },
  engText: { fontSize: 10, lineHeight: 1.7, color: INK, marginBottom: 14 },
  engSig: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 10 },
  engName: { fontSize: 12, fontFamily: "Helvetica-BoldOblique", color: INK },
  engDate: { fontSize: 10, color: INK },

  footer: { marginTop: 20, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: GOLD, fontSize: 7.5, color: GOLD_DARK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 },
});

const dash = (v?: string | null) => (v && String(v).trim() ? String(v) : "—");

function Block({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <View style={s.block}>
      <Text style={s.tag}>{tag}</Text>
      {children}
    </View>
  );
}

export default function M4PdfDocument({ state }: { state: M4State }) {
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const niche =
    state.m1_data?.sous_niche_2?.phrase_finale || state.m1_data?.sous_niche_2?.phrase || "—";

  const dateStr = state.signed_at
    ? new Date(state.signed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const strategyDef = state.entry.strategy ? ENTRY_STRATEGIES[state.entry.strategy] : null;
  const activeTiers = strategyDef?.active_tiers ?? TIERS;
  const bridgesNeeded = strategyDef?.bridges_needed ?? [];

  const high = state.ladder.high;

  return (
    <Document title={`M4 — Value Ladder — ${state.signed_name || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Value Ladder — Module 4 LIBERTY</Text>
            <Text style={s.sub}>Avatar : {avatar} · {niche}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.date}>{dateStr}</Text>
            <Text style={s.score}>{state.entry.score ?? "—"}/100</Text>
            <Text style={s.scoreLabel}>Score stratégie</Text>
          </View>
        </View>

        {/* Ton High-ticket */}
        <Block tag="Ton High-ticket">
          <View style={s.field}>
            <Text style={s.fieldText}>
              <Text style={s.bold}>{dash(high.name)}</Text> · {dash(high.price)} · {dash(high.format)}
              {high.rationale ? <Text>{"\n"}<Text style={s.italic}>{high.rationale}</Text></Text> : null}
            </Text>
          </View>
        </Block>

        {/* 📊 Récap des 4 marches */}
        <Block tag="Recap des 4 marches">
          <View style={s.table}>
            <View style={s.trHead}>
              <Text style={[s.th, s.colNiveau]}>Niveau</Text>
              <Text style={[s.th, s.colPrix]}>Prix</Text>
              <Text style={[s.th, s.colRole]}>Rôle</Text>
              <Text style={[s.th, s.colOffre]}>Ton offre</Text>
            </View>
            {TIERS.map((tid) => {
              const t = state.ladder[tid];
              const isActive = activeTiers.includes(tid);
              const isHigh = tid === "high";
              const rowOpacity = isActive ? 1 : 0.45;
              return (
                <View key={tid} style={[s.tr, { opacity: rowOpacity }]}>
                  <Text style={[s.td, s.colNiveau, isHigh ? s.tdHigh : {}]}>
                    {TIER_LABELS[tid]}{isHigh ? " *" : ""}
                  </Text>
                  <Text style={[s.td, s.colPrix]}>{t.price || TIER_PRICE_RANGES[tid]}</Text>
                  <Text style={[s.td, s.colRole]}>{TIER_ROLES[tid]}</Text>
                  {t.name ? (
                    <Text style={[s.td, s.colOffre]}>{t.name}</Text>
                  ) : isActive ? (
                    <Text style={[s.td, s.colOffre, s.italic]}>à définir</Text>
                  ) : (
                    <Text style={[s.td, s.colOffre, s.tdMuted]}>— inactive (stratégie)</Text>
                  )}
                </View>
              );
            })}
          </View>
        </Block>

        {/* 🎯 Stratégie d'entrée + badges */}
        <View style={s.block}>
          <View style={s.tagRow}>
            <Text style={s.tagInline}>Stratégie d'entrée</Text>
            {state.entry.ai_mode === "cloud" ? (
              <Text style={[s.badge, s.badgeOk]}>IA Claude</Text>
            ) : (
              <Text style={[s.badge, s.badgeWarn]}>Évaluation locale</Text>
            )}
            {state.entry.forced ? (
              <Text style={[s.badge, s.badgeWarn]}>Forcé après {state.entry.attempts} essai(s)</Text>
            ) : null}
          </View>

          <View style={s.strategyCard}>
            <Text style={s.strategyLabel}>{strategyDef?.label || state.entry.strategy || "—"}</Text>
            {strategyDef?.desc ? <Text style={s.strategyDesc}>{strategyDef.desc}</Text> : null}
          </View>

          <View style={s.field}>
            <Text style={s.fieldText}><Text style={s.bold}>Pourquoi ce choix :</Text>{"\n"}{dash(state.entry.rationale)}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.fieldText}><Text style={s.bold}>Cible HT/mois : </Text>{dash(state.entry.ht_monthly_target)}</Text>
          </View>
          {state.entry.lt_breakeven_check ? (
            <View style={s.field}>
              <Text style={s.fieldText}><Text style={s.bold}>Breakeven LT/MT : </Text>{state.entry.lt_breakeven_check}</Text>
            </View>
          ) : null}
          {state.entry.feedback ? (
            <View style={[s.field, s.fieldFeedback]}>
              <Text style={s.fieldText}><Text style={s.bold}>Évaluation IA : </Text>{state.entry.feedback}</Text>
            </View>
          ) : null}
        </View>

        {/* 🌉 Passerelles */}
        <Block tag={`Passerelles (${bridgesNeeded.length})`}>
          {bridgesNeeded.length > 0 ? (
            bridgesNeeded.map((bid) => {
              const b = BRIDGE_BY_ID[bid];
              if (!b) return null;
              const text = state.bridges[bid] || "";
              return (
                <View key={bid} style={s.bridge}>
                  <Text style={s.bridgeHead}>
                    <Text style={s.bold}>{b.from}</Text> -&gt; <Text style={s.bold}>{b.to}</Text>
                  </Text>
                  <Text style={s.bridgeText}>{dash(text)}</Text>
                </View>
              );
            })
          ) : (
            <Text style={s.emptyNote}>Aucune passerelle requise par cette stratégie.</Text>
          )}
        </Block>

        {/* ⚖ Engagement écrit */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement écrit</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{state.signed_name || "[NOM]"}</Text>, m'engage à construire ma value ladder selon cette stratégie — sans précipiter les marches basses avant que mon HT soit rodé, sans copier d'autres écosystèmes par mimétisme.
          </Text>
          <View style={s.engSig}>
            <Text style={s.engName}>{state.signed_name || "[Signature]"}</Text>
            <Text style={s.engDate}>{dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 4 — Value Ladder · Confidentiel</Text>
      </Page>
    </Document>
  );
}
