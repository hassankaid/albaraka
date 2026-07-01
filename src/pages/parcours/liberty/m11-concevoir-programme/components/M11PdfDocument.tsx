/**
 * Document PDF vectoriel du M11 (Concevoir un programme) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or) que le M1. Police Helvetica
 * (intégrée à react-pdf → zéro chargement réseau).
 *
 * Reproduit fidèlement l'export HTML historique : entête, récap (Point B/A/Tier/
 * durée), fiches modules (badges Bloom + exercice + durée, objectif, livrable,
 * mise en situation, auto-évaluation, leçons numérotées avec angle + active
 * recall), bloc engagement écrit et footer confidentiel.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { type M11State, BLOOM_LEVELS, EXERCICE_TYPES, TIERS } from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM_ENG = "#FFF8E1";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4, fontFamily: "Helvetica-Bold" },
  date: { fontSize: 9, color: "#555555" },

  bold: { fontFamily: "Helvetica-Bold" },

  // Récap (Point B / Point A / Tier / Durée) — "grille" flex, pas de CSS grid
  recap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  recapItem: { backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8, width: "47%" },
  recapText: { fontSize: 9.5, lineHeight: 1.45, color: INK },

  // Fiche module
  mod: { borderWidth: 0.5, borderColor: BORDER_SOFT, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  modHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 5 },
  modNum: { color: GOLD_DARK, fontFamily: "Helvetica-Bold", textTransform: "uppercase", fontSize: 8, letterSpacing: 0.6, marginRight: 5 },
  modName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INK, marginRight: 5 },
  badge: { backgroundColor: CREAM, borderWidth: 0.5, borderColor: GOLD, borderRadius: 8, paddingVertical: 1, paddingHorizontal: 6, fontSize: 8, color: GOLD_DARK, marginRight: 4, marginBottom: 2 },
  modLine: { fontSize: 9.5, lineHeight: 1.45, color: INK, marginTop: 3 },
  leconWrap: { marginTop: 3 },
  leconLabel: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 2 },
  leconItem: { fontSize: 9, lineHeight: 1.45, color: INK, marginBottom: 2, paddingLeft: 8 },
  leconMuted: { color: "#888888" },
  leconRecall: { color: GOLD_DARK, fontFamily: "Helvetica-Oblique" },

  eng: { marginTop: 16, padding: 14, backgroundColor: CREAM_ENG, borderWidth: 2, borderColor: GOLD, borderRadius: 6 },
  engText: { fontSize: 10.5, lineHeight: 1.6, color: INK },
  engSig: { fontSize: 11, fontFamily: "Helvetica-BoldOblique", color: INK, marginTop: 10 },

  footer: { marginTop: 20, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: GOLD, fontSize: 7.5, color: GOLD_DARK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 },
});

const dash = (v?: string | null) => (v && String(v).trim() ? String(v) : "—");

function Mod({ children }: { children: ReactNode }) {
  return <View style={s.mod} wrap={false}>{children}</View>;
}

export default function M11PdfDocument({ state }: { state: M11State }) {
  const d = state.data;
  const today = new Date();
  const dateStr = (state.signed_at ? new Date(state.signed_at) : today).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const tierLabel = TIERS[d.tier_bloom_target as keyof typeof TIERS]
    ? TIERS[d.tier_bloom_target as keyof typeof TIERS].label
    : "—";
  const modules = d.modules || [];
  const dureeTotale = modules.reduce((acc, m) => acc + (parseInt(m.duree_video, 10) || 0), 0);
  const totalLecons = modules.reduce((acc, m) => acc + (m.lecons || []).length, 0);

  const signer = state.signed_by || "Liberty";

  return (
    <Document title={`M11 — Programme — ${signer}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Architecture du programme — Module 11 LIBERTY</Text>
            <Text style={s.sub}>{modules.length} modules · {totalLecons} leçons · {tierLabel}</Text>
          </View>
          <Text style={s.date}>{dateStr}</Text>
        </View>

        {/* Récap */}
        <View style={s.recap}>
          <View style={s.recapItem}>
            <Text style={s.recapText}><Text style={s.bold}>Point B : </Text>{dash((d.point_b || "").slice(0, 220))}</Text>
          </View>
          <View style={s.recapItem}>
            <Text style={s.recapText}><Text style={s.bold}>Point A : </Text>{dash((d.point_a || "").slice(0, 220))}</Text>
          </View>
          <View style={s.recapItem}>
            <Text style={s.recapText}><Text style={s.bold}>Tier : </Text>{tierLabel}</Text>
          </View>
          <View style={s.recapItem}>
            <Text style={s.recapText}><Text style={s.bold}>Durée totale : </Text>{dureeTotale} min · {dash(d.duree_programme_mois)} mois</Text>
          </View>
        </View>

        {/* Fiches modules */}
        {modules.map((m, i) => {
          const bl = BLOOM_LEVELS[m.niveau_bloom as keyof typeof BLOOM_LEVELS]?.label || "—";
          const ex = EXERCICE_TYPES[m.type_exercice as keyof typeof EXERCICE_TYPES]?.label || "—";
          const lecons = (m.lecons || []);
          return (
            <Mod key={i}>
              <View style={s.modHead}>
                <Text style={s.modNum}>Module {i + 1}</Text>
                <Text style={s.modName}>{dash(m.nom)}</Text>
                <Text style={s.badge}>{bl}</Text>
                <Text style={s.badge}>{ex}</Text>
                <Text style={s.badge}>{dash(m.duree_video)} min</Text>
              </View>
              <Text style={s.modLine}><Text style={s.bold}>Objectif : </Text>{dash(m.objectif_mesurable)}</Text>
              {m.livrable_attendu ? (
                <Text style={s.modLine}><Text style={s.bold}>Livrable : </Text>{m.livrable_attendu}</Text>
              ) : null}
              {m.mise_situation ? (
                <Text style={s.modLine}><Text style={s.bold}>Mise en situation : </Text>{m.mise_situation}</Text>
              ) : null}
              {m.auto_evaluation ? (
                <Text style={s.modLine}><Text style={s.bold}>Auto-évaluation : </Text>{m.auto_evaluation}</Text>
              ) : null}
              {lecons.length ? (
                <View style={s.leconWrap}>
                  <Text style={s.leconLabel}>Leçons :</Text>
                  {lecons.map((l, li) => (
                    <Text key={li} style={s.leconItem}>
                      <Text style={s.bold}>{i + 1}.{li + 1}</Text> {dash(l.titre)}
                      <Text style={s.leconMuted}> — {dash(l.angle)}</Text>
                      {l.active_recall ? <Text style={s.leconRecall}>  {l.active_recall}</Text> : null}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Mod>
          );
        })}

        {/* Engagement écrit */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{state.signed_by || "[NOM]"}</Text>, valide l'architecture de ce programme et m'engage à scripter et filmer la première leçon dans les 14 jours.
          </Text>
          <Text style={s.engSig}>{state.signed_by || "[Signature]"} · {dateStr}</Text>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 11 — Concevoir un programme · Confidentiel</Text>
      </Page>
    </Document>
  );
}
