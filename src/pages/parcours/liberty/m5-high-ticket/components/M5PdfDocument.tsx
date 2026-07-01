/**
 * Document PDF vectoriel du M5 (Audit High-Ticket) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or) que le M1. Police Helvetica
 * (intégrée à react-pdf → zéro chargement réseau).
 *
 * Reproduit fidèlement l'export HTML : entête + score moyen, bannière "M4 forcé",
 * audit IA détaillé par étape (verdict / forces / faiblesses / suggestions),
 * données saisies (pont, 4 conditions, eat-complexity, structure, conviction),
 * bloc engagement écrit et footer.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { M5State, PedaStepKey } from "../lib/types";
import { CONDITION_AXES, PEDA_STEPS } from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM_ENG = "#FFF8E1";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";

// Palettes verdict (calque HTML .step-section good/warn/bad/neutral)
const GOOD_BG = "#EEF7E8";
const GOOD_BORDER = "#7FB069";
const WARN_BG = "#FFF8E1";
const WARN_BORDER = "#E8C770";
const BAD_BG = "#FBE9E9";
const BAD_BORDER = "#E86B6B";
const NEUTRAL_BG = "#F5F5F5";
const NEUTRAL_BORDER = "#CCCCCC";

const RED = "#C0392B";

const STEP_LABELS: Record<PedaStepKey, string> = {
  pont: "Le pont (A -> B)",
  conditions: "4 conditions Hormozi",
  eatcomplex: "Eat the Complexity",
  structure: "Structure 12 sem / 90 j",
  conviction: "Conviction intérieure",
};

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  headerLeft: { flex: 1, paddingRight: 12 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  htLine: { fontSize: 9, color: "#555555", marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  date: { fontSize: 9, color: "#555555" },
  avgScore: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 4 },
  avgLabel: { fontSize: 7, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.8 },

  forcedBanner: { backgroundColor: "#FFF2CC", borderWidth: 1.5, borderColor: GOLD, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14 },
  forcedBannerText: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: GOLD_DARK, lineHeight: 1.4 },

  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  h2b: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 12 },

  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },

  // Audit IA par étape
  stepSection: { marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1 },
  stepHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 5 },
  stepLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  stepScore: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD_DARK },
  forcedTag: { fontSize: 8, fontFamily: "Helvetica-Oblique", color: RED },
  stepVerdict: { fontSize: 9.5, fontFamily: "Helvetica-Oblique", color: "#555555", lineHeight: 1.45, marginBottom: 6 },
  auditBlock: { paddingVertical: 5, paddingHorizontal: 8, marginTop: 5, borderRadius: 4 },
  auditGood: { backgroundColor: "rgba(127,176,105,0.15)" },
  auditWarn: { backgroundColor: "rgba(232,180,80,0.15)" },
  auditSugg: { backgroundColor: "rgba(201,168,76,0.15)" },
  auditTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: "#555555", marginBottom: 3 },
  liRow: { flexDirection: "row", marginBottom: 2 },
  liBullet: { fontSize: 9.5, color: "#333333", width: 12 },
  liText: { fontSize: 9.5, color: "#333333", lineHeight: 1.4, flex: 1 },

  // Données saisies — sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  field: { marginBottom: 8 },
  fieldLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: GOLD_DARK, marginBottom: 3 },
  fieldContent: { fontSize: 10, lineHeight: 1.5, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 3, color: INK },

  // Grille conditions
  condGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 8 },
  condCard: { width: "48.5%", padding: 8, backgroundColor: CREAM, borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 4, marginBottom: 8 },
  condCardWeak: { backgroundColor: BAD_BG, borderColor: BAD_BORDER },
  condHead: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 },
  condJustif: { fontSize: 9, lineHeight: 1.45, color: "#444444" },
  weakestTag: { fontSize: 8, fontFamily: "Helvetica-Oblique", color: RED },

  // Table eat-complexity
  table: { borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 3, marginTop: 2 },
  tRow: { flexDirection: "row" },
  tHeadRow: { flexDirection: "row", backgroundColor: CREAM },
  tHeadCell: { flex: 1, padding: 6, fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, color: GOLD_DARK, borderRightWidth: 1, borderRightColor: BORDER_SOFT },
  tCell: { flex: 1, padding: 6, fontSize: 9, lineHeight: 1.4, color: INK, borderRightWidth: 1, borderRightColor: BORDER_SOFT, borderTopWidth: 1, borderTopColor: BORDER_SOFT },
  tCellLast: { borderRightWidth: 0 },
  tHeadCellLast: { borderRightWidth: 0 },

  // Phases structure
  phaseBox: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#F8F4E0", borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 3, marginBottom: 8 },
  phaseNum: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.6, marginBottom: 3 },
  phaseName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 2 },
  phaseLiv: { fontSize: 9, lineHeight: 1.45, color: INK },

  // Conviction checklist
  checkList: { marginBottom: 4 },
  checkItem: { fontSize: 10, paddingVertical: 3 },
  checkOk: { color: "#38761D", fontFamily: "Helvetica-Bold" },
  checkKo: { color: RED },

  // Engagement
  eng: { marginTop: 12, padding: 14, backgroundColor: CREAM_ENG, borderWidth: 2, borderColor: GOLD, borderRadius: 5 },
  engTag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 6 },
  engText: { fontSize: 10, lineHeight: 1.6, color: INK, marginBottom: 12 },
  engSig: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 8 },
  engName: { fontSize: 12, fontFamily: "Helvetica-BoldOblique", color: INK },
  engDate: { fontSize: 10, color: INK },

  footer: { marginTop: 18, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: GOLD, fontSize: 7.5, color: GOLD_DARK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 },
});

const dash = (v?: string | null) => (v && String(v).trim() ? String(v) : "—");

function Bullets({ items, blockStyle, title }: { items: string[]; blockStyle: object; title: string }) {
  return (
    <View style={[s.auditBlock, blockStyle]}>
      <Text style={s.auditTitle}>{title}</Text>
      {items.map((it, i) => (
        <View key={i} style={s.liRow}>
          <Text style={s.liBullet}>-</Text>
          <Text style={s.liText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

export default function M5PdfDocument({ state }: { state: M5State }): ReactNode {
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const niche = state.m1_data?.sous_niche_2?.phrase_finale || state.m1_data?.sous_niche_2?.phrase || "—";
  const ht = state.m4_data?.ht?.name || state.m3_data?.hero_mecanisme_nom || "—";
  const htPrice = state.m4_data?.ht?.price || state.m3_data?.prix_display || "—";

  const today = new Date();
  const dateStr = (state.signed_at ? new Date(state.signed_at) : today).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const validScores = PEDA_STEPS.map((k) => state.scores[k]).filter((sc) => sc !== null) as number[];
  const avg = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

  const pont = state.data.pont;
  const conds = state.data.conditions;
  const struct = state.data.structure;
  const conv = state.data.conviction;

  const convItems: Array<{ key: keyof typeof conv.checklist; lbl: string }> = [
    { key: "sur_delivre", lbl: "Sur-délivre" },
    { key: "ten_clients", lbl: "10 clients heureux" },
    { key: "believe_price", lbl: "Crois au prix" },
    { key: "recommend_to_brother", lbl: "Recommanderais à son frère" },
    { key: "prepared_objections", lbl: "Prêt aux 7 objections" },
  ];

  const eatRows = state.data.eatcomplex.rows.filter((r) => r.client_step || r.what_you_eat);

  return (
    <Document title={`M5 — High-Ticket — ${state.signed_by || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.title}>Audit High-Ticket — Module 5 LIBERTY</Text>
            <Text style={s.sub}>Avatar : {dash(avatar)} · {dash(niche)}</Text>
            <Text style={s.htLine}>HT : <Text style={s.bold}>{dash(ht)}</Text> · {dash(htPrice)}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.date}>{dateStr}</Text>
            <Text style={s.avgScore}>{avg}/100</Text>
            <Text style={s.avgLabel}>Score moyen audit</Text>
          </View>
        </View>

        {/* Bannière M4 forcé */}
        {state.upstream_forced ? (
          <View style={s.forcedBanner} wrap={false}>
            <Text style={s.forcedBannerText}>
              Attention : Stratégie M4 forcée — seuil M5 monté à 85/100 sur toutes les étapes pédagogiques.
            </Text>
          </View>
        ) : null}

        {/* Audit IA détaillé */}
        <Text style={s.h2}>Audit IA détaillé</Text>
        {PEDA_STEPS.map((k) => {
          const score = state.scores[k];
          const fb = state.lastFb[k];
          const forced = state.forced[k];
          const bg =
            score === null ? NEUTRAL_BG : score >= 80 ? GOOD_BG : score >= 60 ? WARN_BG : BAD_BG;
          const border =
            score === null ? NEUTRAL_BORDER : score >= 80 ? GOOD_BORDER : score >= 60 ? WARN_BORDER : BAD_BORDER;
          return (
            <View key={k} style={[s.stepSection, { backgroundColor: bg, borderColor: border }]} wrap={false}>
              <View style={s.stepHead}>
                <Text style={s.stepLabel}>{STEP_LABELS[k]}</Text>
                <Text style={s.stepScore}>
                  {score ?? "—"}/100{forced ? <Text style={s.forcedTag}> (forcé)</Text> : null}
                </Text>
              </View>
              {fb?.verdict ? <Text style={s.stepVerdict}>{fb.verdict}</Text> : null}
              {fb?.strengths && fb.strengths.length ? (
                <Bullets items={fb.strengths} blockStyle={s.auditGood} title="Forces" />
              ) : null}
              {fb?.weaknesses && fb.weaknesses.length ? (
                <Bullets items={fb.weaknesses} blockStyle={s.auditWarn} title="Faiblesses" />
              ) : null}
              {fb?.suggestions && fb.suggestions.length ? (
                <Bullets items={fb.suggestions} blockStyle={s.auditSugg} title="Suggestions" />
              ) : null}
            </View>
          );
        })}

        {/* Données saisies */}
        <Text style={s.h2b}>Données saisies</Text>

        {/* Le pont */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Le pont</Text>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Point A</Text>
            <Text style={s.fieldContent}>{dash(pont.pointA.formulated)}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Point B ({pont.pointB.timeframe_days} jours)</Text>
            <Text style={s.fieldContent}>
              {dash(pont.pointB.formulated)}
              {"\n"}
              <Text style={s.italic}>Mesurable : {dash(pont.pointB.measurable_outcome)}</Text>
            </Text>
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Résumé du pont</Text>
            <Text style={s.fieldContent}>{dash(pont.bridge_summary)}</Text>
          </View>
        </View>

        {/* 4 conditions Hormozi */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>4 conditions Hormozi</Text>
          <View style={s.condGrid}>
            {CONDITION_AXES.map((cfg) => {
              const a = conds[cfg.key];
              const isWeak = conds.weakest_axis === cfg.key;
              return (
                <View key={cfg.key} style={[s.condCard, isWeak ? s.condCardWeak : {}]}>
                  <Text style={s.condHead}>
                    {cfg.label} · {a.score}/10
                    {isWeak ? <Text style={s.weakestTag}> (faible)</Text> : null}
                  </Text>
                  <Text style={s.condJustif}>{dash(a.justification)}</Text>
                </View>
              );
            })}
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Plan d'action</Text>
            <Text style={s.fieldContent}>{dash(conds.action_plan)}</Text>
          </View>
        </View>

        {/* Eat the Complexity */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Eat the Complexity</Text>
          <View style={s.table}>
            <View style={s.tHeadRow} wrap={false}>
              <Text style={s.tHeadCell}>Étape client</Text>
              <Text style={s.tHeadCell}>Ce que tu manges</Text>
              <Text style={[s.tHeadCell, s.tHeadCellLast]}>Ce qui reste au client</Text>
            </View>
            {eatRows.map((r, i) => (
              <View key={i} style={s.tRow} wrap={false}>
                <Text style={s.tCell}>{dash(r.client_step)}</Text>
                <Text style={s.tCell}>{dash(r.what_you_eat)}</Text>
                <Text style={[s.tCell, s.tCellLast]}>{dash(r.what_remains)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Structure */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Structure {struct.total_weeks} sem · {struct.promise_days} jours</Text>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Ancrage mécanisme</Text>
            <Text style={s.fieldContent}>{dash(struct.mecanisme_anchor)}</Text>
          </View>
          {struct.phases.map((p) => (
            <View key={p.num} style={s.phaseBox} wrap={false}>
              <Text style={s.phaseNum}>PHASE {p.num} (sem. {dash(p.weeks)})</Text>
              <Text style={s.phaseName}>{dash(p.name)}</Text>
              <Text style={s.phaseLiv}>
                <Text style={s.italic}>Livrables : </Text>{dash(p.livrables)}
              </Text>
            </View>
          ))}
        </View>

        {/* Conviction */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Conviction</Text>
          <View style={s.checkList}>
            {convItems.map((c) => {
              const ok = conv.checklist[c.key];
              return (
                <Text key={c.key} style={[s.checkItem, ok ? s.checkOk : s.checkKo]}>
                  {ok ? "Oui" : "Non"} {c.lbl}
                </Text>
              );
            })}
          </View>
          {conv.missing ? (
            <View style={s.field}>
              <Text style={s.fieldLabel}>Ce qui manque</Text>
              <Text style={s.fieldContent}>{conv.missing}</Text>
            </View>
          ) : null}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Prochaine action</Text>
            <Text style={s.fieldContent}>{dash(conv.next_action)}</Text>
          </View>
        </View>

        {/* Engagement écrit */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement écrit</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{state.signed_by || "[NOM]"}</Text>, m'engage à porter ce High-Ticket avec conviction jusqu'au prochain palier {state.m4_data?.ht_monthly_target ? `de ${state.m4_data.ht_monthly_target} ventes HT/mois` : "défini en M4"} — sans dilution, sans copie d'écosystème, sans urgence fake.
          </Text>
          <View style={s.engSig}>
            <Text style={s.engName}>{state.signed_by || "[Signature]"}</Text>
            <Text style={s.engDate}>{dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 5 — High-Ticket · Confidentiel</Text>
      </Page>
    </Document>
  );
}
