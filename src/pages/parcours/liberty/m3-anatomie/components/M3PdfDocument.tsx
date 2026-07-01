/**
 * Document PDF vectoriel du M3 (Anatomie d'une offre) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or) que le M1. Police Helvetica
 * (intégrée à react-pdf → zéro chargement réseau).
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { M3State } from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM2 = "#FFFBF0";
const CREAM_ENG = "#FFF8E1";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";

const GARANTIE_LABELS: Record<string, string> = {
  remboursement: "Remboursement conditionné",
  continuite: "Continuité gratuite",
  performance: "Garantie résultats / performance",
};

const URGENCE_LABELS: Record<string, string> = {
  cohorte_limitee: "Cohorte limitée",
  bonus_expirant: "Bonus expirant",
  prix_qui_monte: "Prix qui monte (early bird)",
  fenetre_temporelle: "Fenêtre temporelle",
};

const VEHICULE_LABELS: Record<string, string> = {
  programme_video: "Programme vidéo + communauté",
  cohorte_groupe: "Cohorte + lives groupe",
  coaching_groupe_1to1: "Programme + groupe + 1to1",
  consulting_done_with_you: "Consulting / done-with-you",
  mastermind: "Mastermind (cohorte fermée)",
  hybride_custom: "Format hybride (custom)",
};

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  date: { fontSize: 9, color: "#555555" },
  scoreBig: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 4 },
  scoreLabel: { fontSize: 7.5, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.8 },

  block: { marginBottom: 11 },
  tag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 4 },
  box: { paddingVertical: 8, paddingHorizontal: 11, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  boxText: { fontSize: 10, lineHeight: 1.5, color: INK },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },

  field: { marginBottom: 8 },
  fieldLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, color: GOLD_DARK, marginBottom: 3 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 2 },
  cell: { width: "48.5%", backgroundColor: CREAM_ENG, borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 3, padding: 8, marginBottom: 7 },
  cellLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, color: GOLD_DARK },
  cellScore: { fontSize: 15, fontFamily: "Helvetica-Bold", color: GOLD, marginTop: 2 },
  cellJustif: { fontSize: 8.5, lineHeight: 1.4, color: "#555555", marginTop: 3 },
  faible: { marginTop: 6, fontSize: 9, color: GOLD_DARK },

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

export default function M3PdfDocument({ state }: { state: M3State }) {
  const eng = state.engagement;
  const avatar = state.m1_data?.avatar?.socio?.nom || "Avatar";
  const niche =
    state.m1_data?.sous_niche_2?.phrase_finale || state.m1_data?.sous_niche_2?.phrase || "—";
  const today = new Date();
  const dateStr = (eng.date_signature ? new Date(eng.date_signature) : today).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const etapes = (state.mecanisme.etapes || []).filter(Boolean);
  const bonusItems = state.bonus.items || [];
  const leviers: Array<"resultat" | "probabilite" | "delai" | "effort"> = ["resultat", "probabilite", "delai", "effort"];

  return (
    <Document title={`M3 — Anatomie d'offre — ${eng.nom_complet || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Anatomie d'offre — Module 3 LIBERTY</Text>
            <Text style={s.sub}>Avatar : {dash(avatar)} · {dash(niche)}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.date}>{dateStr}</Text>
            <Text style={s.scoreBig}>{state.prix.score}/100</Text>
            <Text style={s.scoreLabel}>Score prix</Text>
          </View>
        </View>

        {/* Promesse */}
        <Block tag="Promesse de transformation">
          <View style={s.box}><Text style={s.boxText}>{dash(state.promesse.text)}</Text></View>
        </Block>

        {/* Mécanisme */}
        <Block tag="Mécanisme unique">
          <View style={s.field}>
            <Text style={s.fieldLabel}>Nom</Text>
            <View style={s.box}><Text style={[s.boxText, s.bold]}>{dash(state.mecanisme.nom)}</Text></View>
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Étapes</Text>
            <View style={s.box}>
              {etapes.length > 0 ? (
                etapes.map((e, i) => (
                  <Text key={i} style={s.boxText}>{i + 1}. {e}</Text>
                ))
              ) : (
                <Text style={s.boxText}>—</Text>
              )}
            </View>
          </View>
        </Block>

        {/* Véhicule */}
        <Block tag="Véhicule">
          <View style={s.field}>
            <Text style={s.fieldLabel}>Format</Text>
            <View style={s.box}><Text style={s.boxText}>{dash(VEHICULE_LABELS[state.vehicule.format] || state.vehicule.format)}</Text></View>
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Justification</Text>
            <View style={s.box}><Text style={s.boxText}>{dash(state.vehicule.justification)}</Text></View>
          </View>
        </Block>

        {/* Bonus */}
        <Block tag={`Bonus stratégiques (${bonusItems.length})`}>
          {bonusItems.map((b, i) => (
            <View key={i} style={s.field}>
              <Text style={s.fieldLabel}>Bonus {i + 1}</Text>
              <View style={s.box}>
                <Text style={s.boxText}>
                  <Text style={s.bold}>{dash(b.nom)}</Text> ({dash(b.valeur)})
                </Text>
                <Text style={[s.boxText, s.italic]}>{dash(b.raison)}</Text>
              </View>
            </View>
          ))}
        </Block>

        {/* Garantie */}
        <Block tag={`Garantie · ${dash(GARANTIE_LABELS[state.garantie.type] || state.garantie.type)}`}>
          <View style={s.box}><Text style={s.boxText}>{dash(state.garantie.formulation)}</Text></View>
        </Block>

        {/* Urgence */}
        <Block tag={`Urgence · ${dash(URGENCE_LABELS[state.urgence.type] || state.urgence.type)}`}>
          <View style={s.box}><Text style={s.boxText}>{dash(state.urgence.justification)}</Text></View>
        </Block>

        {/* Prix + leviers Hormozi */}
        <Block tag={`Prix · ${dash(state.prix.montant)} €`}>
          <View style={s.grid}>
            {leviers.map((k) => {
              const l = state.prix.leviers[k];
              return (
                <View key={k} style={s.cell}>
                  <Text style={s.cellLabel}>{k}</Text>
                  <Text style={s.cellScore}>{l.score}/100</Text>
                  <Text style={s.cellJustif}>{dash(l.justification)}</Text>
                </View>
              );
            })}
          </View>
          {state.prix.levier_faible ? (
            <Text style={s.faible}><Text style={s.bold}>Levier le plus faible : </Text>{state.prix.levier_faible}</Text>
          ) : null}
        </Block>

        {/* Engagement */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement écrit</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{eng.nom_complet || "[NOM]"}</Text>, m'engage à mettre cette offre en marché telle que je l'ai construite — sans urgences fake, garanties magiques ou promesses surréalistes.
          </Text>
          <View style={s.engSig}>
            <Text style={s.engName}>{eng.nom_complet || "[Signature]"}</Text>
            <Text style={s.engDate}>{dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 3 — Anatomie d'une offre · Confidentiel</Text>
      </Page>
    </Document>
  );
}
