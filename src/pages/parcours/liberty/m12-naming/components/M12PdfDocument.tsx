/**
 * Document PDF vectoriel du M12 (Naming & Positionnement) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or) que le M1. Police Helvetica
 * (intégrée à react-pdf → zéro chargement réseau).
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
  type M12State,
  type TechKey,
  TECHNIQUES,
  freshTests,
} from "../lib/types";
import {
  compileCategorieNouvelle,
  activeTestsBag,
  hasMinTrace,
} from "../lib/validations";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM2 = "#FFFBF0";
const CREAM_ENG = "#FFF8E1";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";
const GREEN = "#2E7D32";
const RED = "#B3261E";

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  date: { fontSize: 9, color: "#555555" },

  hero: { alignItems: "center", paddingVertical: 16, paddingHorizontal: 18, backgroundColor: CREAM, borderWidth: 1, borderColor: GOLD, borderRadius: 8, marginBottom: 18 },
  heroNom: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD_DARK, textAlign: "center" },
  heroBase: { fontSize: 11, color: "#555555", marginTop: 6, textAlign: "center" },

  block: { marginBottom: 11 },
  tag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 4 },
  box: { paddingVertical: 8, paddingHorizontal: 11, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, marginBottom: 6 },
  boxText: { fontSize: 10, lineHeight: 1.5, color: INK },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },

  testRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 11, backgroundColor: CREAM2, borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 3, marginBottom: 5 },
  testMark: { width: 14, fontSize: 10, fontFamily: "Helvetica-Bold" },
  testMarkOk: { color: GREEN },
  testMarkKo: { color: RED },
  testLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: INK },
  testBody: { flex: 1, fontSize: 10, lineHeight: 1.45, color: INK },

  eng: { marginTop: 16, padding: 14, backgroundColor: CREAM_ENG, borderWidth: 2, borderColor: GOLD, borderRadius: 5 },
  engTag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 6 },
  engText: { fontSize: 10, lineHeight: 1.6, color: INK, marginBottom: 12 },
  engSig: { flexDirection: "row", justifyContent: "flex-start", borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 8 },
  engName: { fontSize: 11, fontFamily: "Helvetica-BoldOblique", color: INK },

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

function TestRow({ label, ok, trace }: { label: string; ok: boolean; trace: string }) {
  const passed = ok && hasMinTrace(trace);
  return (
    <View style={s.testRow}>
      <Text style={[s.testMark, passed ? s.testMarkOk : s.testMarkKo]}>{passed ? "OK" : "X"}</Text>
      <Text style={s.testBody}>
        <Text style={s.testLabel}>{label} : </Text>
        {passed ? trace : "manquant"}
      </Text>
    </View>
  );
}

export default function M12PdfDocument({ state }: { state: M12State }) {
  const d = state.data;
  const f = d.final || ({} as any);
  const p = d.positionnement || ({} as any);
  const me = d.methode || ({} as any);
  const ren = d.modules_renommes || [];
  const t = activeTestsBag(d, freshTests);
  const dateStr = (state.signed_at ? new Date(state.signed_at) : new Date()).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const techLabel = f.technique ? TECHNIQUES[f.technique as TechKey]?.label || "—" : "—";
  const compiled = compileCategorieNouvelle(p);

  return (
    <Document title={`M12 — Naming — ${f.nom || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Naming & Positionnement — Module 12 LIBERTY</Text>
            <Text style={s.sub}>Technique : {techLabel}</Text>
          </View>
          <Text style={s.date}>{dateStr}</Text>
        </View>

        {/* Hero — nom final + baseline */}
        <View style={s.hero}>
          <Text style={s.heroNom}>{dash(f.nom)}</Text>
          <Text style={s.heroBase}>« {dash(f.baseline)} »</Text>
        </View>

        {/* Positionnement */}
        <Block tag="Positionnement">
          <View style={s.box}>
            <Text style={s.boxText}><Text style={s.bold}>Catégorie nouvelle : </Text>{dash(compiled)}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.boxText}><Text style={s.bold}>Combat déclaré — contre : </Text>{dash(p.ennemi_declare)}</Text>
          </View>
        </Block>

        {/* Les 4 tests humains */}
        <Block tag="Les 4 tests humains">
          <TestRow label="Téléphone" ok={t.telephone} trace={t.telephone_trace} />
          <TestRow label="Google" ok={t.google} trace={t.google_trace} />
          <TestRow label="Promesse" ok={t.promesse} trace={t.promesse_trace} />
          <TestRow label="Résonance" ok={t.resonance} trace={t.resonance_trace} />
        </Block>

        {/* Méthode propriétaire (optionnel) */}
        {me.nom ? (
          <Block tag="Méthode propriétaire">
            <View style={s.box}>
              <Text style={[s.boxText, s.bold, { color: GOLD_DARK }]}>{me.nom}</Text>
              {me.baseline ? <Text style={[s.boxText, s.italic]}>« {me.baseline} »</Text> : null}
              {me.est_acronyme && me.acronyme_developpe ? (
                <Text style={s.boxText}>Acronyme : {me.acronyme_developpe}</Text>
              ) : null}
            </View>
          </Block>
        ) : null}

        {/* Modules renommés (optionnel) */}
        {ren.length > 0 ? (
          <Block tag="Modules renommés">
            {ren.map((r, i) => (
              <View key={i} style={s.box}>
                <Text style={s.boxText}>
                  <Text style={s.bold}>Module {r.index}</Text>
                  {" "}(origine : {dash(r.nom_origine)}) -&gt;{" "}
                  <Text style={[s.bold, { color: GOLD_DARK }]}>{dash(r.nom_final)}</Text>
                </Text>
                {r.baseline ? <Text style={[s.boxText, s.italic]}>« {r.baseline} »</Text> : null}
              </View>
            ))}
          </Block>
        ) : null}

        {/* Engagement écrit */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement écrit</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{state.signed_by || "[NOM]"}</Text>, m'engage à dire mon nom de programme à voix haute à <Text style={s.bold}>3 prospects dans les 7 jours</Text>, sans hésitation.
          </Text>
          <View style={s.engSig}>
            <Text style={s.engName}>{state.signed_by || "[Signature]"} · {dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 12 — Naming & Positionnement · Confidentiel</Text>
      </Page>
    </Document>
  );
}
