/**
 * Document PDF vectoriel du M2 (Psychologie de l'acheteur) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or). Police Helvetica (intégrée à
 * react-pdf → zéro chargement réseau). Calqué fidèlement sur M1PdfDocument.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { M2State } from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM_ENG = "#FFF8E1";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";

// Palette scores (miroir des classes .good/.ok/.bad du HTML)
const GOOD_BG = "#E8F5E8", GOOD_BORDER = "#50C878", GOOD_TEXT = "#2E7D32";
const OK_BG = "#FFF8E1", OK_BORDER = "#FFB450", OK_TEXT = "#E65100";
const BAD_BG = "#FFEBEE", BAD_BORDER = "#E86B6B", BAD_TEXT = "#C62828";

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  date: { fontSize: 9, color: "#555555" },
  avg: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 3 },
  avgLabel: { fontSize: 7.5, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 1 },

  block: { marginBottom: 13 },
  tag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 6 },

  field: { marginBottom: 8 },
  fieldLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, color: GOLD_DARK, marginBottom: 3 },
  box: { paddingVertical: 8, paddingHorizontal: 11, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  boxText: { fontSize: 10, lineHeight: 1.5, color: INK },
  boxLine: { fontSize: 10, lineHeight: 1.5, color: INK, marginBottom: 2 },
  italic: { fontFamily: "Helvetica-Oblique" },
  bold: { fontFamily: "Helvetica-Bold" },

  // Grille des scores : 4 colonnes en flexWrap (pas de CSS grid en react-pdf)
  scores: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  scoreCell: { width: "23.5%", marginRight: "2%", marginBottom: 8, paddingVertical: 7, paddingHorizontal: 4, backgroundColor: CREAM_ENG, borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 3, alignItems: "center" },
  scoreCellLast: { marginRight: 0 },
  scoreLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4, color: GOLD_DARK },
  scoreValue: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 2, color: INK },

  eng: { marginTop: 16, padding: 14, backgroundColor: CREAM_ENG, borderWidth: 2, borderColor: GOLD, borderRadius: 5 },
  engTag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 6 },
  engText: { fontSize: 10, lineHeight: 1.6, color: INK, marginBottom: 12 },
  engSig: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 8 },
  engName: { fontSize: 12, fontFamily: "Helvetica-BoldOblique", color: INK },
  engDate: { fontSize: 10, color: INK },

  footer: { marginTop: 18, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: GOLD, fontSize: 7.5, color: GOLD_DARK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 },
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.box}>{children}</View>
    </View>
  );
}

// Couleurs de la cellule de score selon l'intent (null / >=80 / >=60 / <60)
function scoreColors(v: number | null): { bg: string; border: string; text: string } {
  if (v === null) return { bg: CREAM_ENG, border: BORDER_SOFT, text: INK };
  if (v >= 80) return { bg: GOOD_BG, border: GOOD_BORDER, text: GOOD_TEXT };
  if (v >= 60) return { bg: OK_BG, border: OK_BORDER, text: OK_TEXT };
  return { bg: BAD_BG, border: BAD_BORDER, text: BAD_TEXT };
}

export default function M2PdfDocument({ state }: { state: M2State }) {
  const sig = state.signed;
  const avatar = state.m1?.avatar?.name || "Avatar";
  const niche = state.m1?.niche?.sub_niche || "—";

  const today = new Date();
  const dateStr = (sig.date ? new Date(sig.date) : today).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const d = state.data;
  const sc = state.scores;

  const avg = (() => {
    const v = Object.values(sc).filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  })();

  const scoreEntries = Object.entries(sc) as [string, number | null][];

  const pains = d.step1.pains.filter((p) => p.text.trim()).slice(0, 3);
  const desires = d.step2.desires.filter((p) => p.text.trim()).slice(0, 3);
  const biases = d.step5.top3.filter((b) => b.bias.trim());

  return (
    <Document title={`M2 — Brief stratégique — ${sig.name || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Brief stratégique — Module 2 LIBERTY</Text>
            <Text style={s.sub}>Psychologie de l'acheteur · {avatar} · {niche}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.date}>{dateStr}</Text>
            <Text style={s.avg}>{avg}/100</Text>
            <Text style={s.avgLabel}>Score moyen</Text>
          </View>
        </View>

        {/* Scores par étape */}
        <Block tag="Scores par étape">
          <View style={s.scores}>
            {scoreEntries.map(([k, v], i) => {
              const c = scoreColors(v);
              const isLast = (i + 1) % 4 === 0;
              return (
                <View
                  key={k}
                  style={[s.scoreCell, isLast ? s.scoreCellLast : {}, { backgroundColor: c.bg, borderColor: c.border }]}
                >
                  <Text style={s.scoreLabel}>{k}</Text>
                  <Text style={[s.scoreValue, { color: c.text }]}>{v ?? "—"}</Text>
                </View>
              );
            })}
          </View>
        </Block>

        {/* Brief stratégique (Étape 8) */}
        <Block tag="Brief stratégique (Étape 8 — synthèse finale)">
          <Field label="Positionnement"><Text style={s.boxText}>{dash(d.step8.positionnement)}</Text></Field>
          <Field label="Hook principal"><Text style={s.boxText}>{dash(d.step8.hook_principal)}</Text></Field>
          <Field label="Levier émotionnel secondaire"><Text style={s.boxText}>{dash(d.step8.levier_secondaire)}</Text></Field>
          <Field label="Biais-killer"><Text style={s.boxText}>{dash(d.step8.biais_killer)}</Text></Field>
          <Field label="Stratégie pour la phase"><Text style={s.boxText}>{dash(d.step8.phase_strategy)}</Text></Field>
          <Field label="Directives copywriting"><Text style={s.boxText}>{dash(d.step8.directives_copywriting)}</Text></Field>
        </Block>

        {/* Top 3 douleurs (Étape 1) */}
        <Block tag="Top 3 douleurs présentes (Étape 1)">
          {pains.map((p, i) => (
            <Field key={i} label={`Douleur ${i + 1}`}>
              <Text style={[s.boxLine, s.bold]}>{dash(p.text)}</Text>
              <Text style={[s.boxText, s.italic]}>{dash(p.scene)}</Text>
            </Field>
          ))}
        </Block>

        {/* Top 3 désirs + identité (Étape 2) */}
        <Block tag="Top 3 désirs futurs + identité aspirationnelle (Étape 2)">
          {desires.map((p, i) => (
            <Field key={i} label={`Désir ${i + 1}`}>
              <Text style={[s.boxLine, s.bold]}>{dash(p.text)}</Text>
              <Text style={[s.boxText, s.italic]}>{dash(p.scene)}</Text>
            </Field>
          ))}
          <Field label="Identité aspirationnelle"><Text style={s.boxText}>{dash(d.step2.identity)}</Text></Field>
        </Block>

        {/* Biais cognitifs (Étape 5) */}
        <Block tag="Biais cognitifs activés (Étape 5)">
          {biases.map((b, i) => (
            <Field key={i} label={`Biais ${i + 1} — ${dash(b.bias)}`}>
              <Text style={s.boxLine}>
                <Text style={s.bold}>Pourquoi dominant : </Text>{dash(b.why_dominant)}
              </Text>
              <Text style={s.boxText}>
                <Text style={s.bold}>Comment activer : </Text>{dash(b.how_activate)}
              </Text>
            </Field>
          ))}
        </Block>

        {/* Phase d'achat (Étape 6) */}
        <Block tag="Phase d'achat (Étape 6)">
          <Field label="Phase identifiée">
            <Text style={s.boxText}>
              <Text style={s.bold}>{dash(d.step6.phase)}</Text> — {dash(d.step6.justif)}
            </Text>
          </Field>
          <Field label="Actions concrètes"><Text style={s.boxText}>{dash(d.step6.actions)}</Text></Field>
        </Block>

        {/* Engagement écrit */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement écrit</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{sig.name || "[NOM]"}</Text>, m'engage à utiliser ce brief stratégique pour produire le copywriting du Module 3 — sans dériver vers des angles manipulatoires, des promesses surréalistes ou des biais cognitifs non éthiques.
          </Text>
          <View style={s.engSig}>
            <Text style={s.engName}>{sig.name || "[Signature]"}</Text>
            <Text style={s.engDate}>{dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 2 — Psychologie · Confidentiel</Text>
      </Page>
    </Document>
  );
}
