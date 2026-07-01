/**
 * Document PDF vectoriel du M18 (Value Ladder revisitée — carte d'écosystème)
 * via @react-pdf/renderer. Remplace l'ancien export HTML + window.print() →
 * vrai téléchargement direct, texte vectoriel net, même charte (crème/or) que M1.
 * Police Helvetica (intégrée à react-pdf → zéro chargement réseau).
 *
 * Reproduit fidèlement les 4 sections de l'ancien export HTML :
 *   1 · L'échelle de valeur (tableau HAUT → BAS)
 *   2 · Les passages d'ascension (LT→MT si présent, MT→HT)
 *   3 · La valeur vie client (LTV)
 *   4 · Les séquences email d'ascension
 * + entête, note de bas de page « règle d'or » et ligne « Verrouillé par … ».
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { type M18State, LEVELS, LTV_MULTIPLE_TARGET, toIntPrice, fmtEur } from "../lib/types";
import { computeLTV, getNiv, hasLT, getProgrammeNom } from "../lib/validations";
import { effectiveEmails } from "../lib/emails";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM2 = "#FFFBF0";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  date: { fontSize: 9, color: "#555555" },
  docSub: { fontSize: 10, color: "#666666", marginTop: 3 },

  block: { marginBottom: 12 },
  tag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 6 },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },

  // ── Tableau échelle ─────────────────────────────
  table: { borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 3 },
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER_SOFT },
  tRowLast: { flexDirection: "row" },
  tHead: { backgroundColor: CREAM },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD_DARK, paddingVertical: 5, paddingHorizontal: 7 },
  td: { fontSize: 9.5, color: INK, paddingVertical: 5, paddingHorizontal: 7, lineHeight: 1.35 },
  cLvl: { width: "16%" },
  cOffre: { width: "44%" },
  cRole: { width: "22%" },
  cPrix: { width: "18%", textAlign: "right" },
  tdLvl: { fontFamily: "Helvetica-Bold", color: GOLD_DARK },
  tdDim: { fontSize: 8.5, color: "#666666" },
  tdPrix: { fontFamily: "Helvetica-Bold" },
  fmt: { fontSize: 8, color: "#666666" },

  // ── Transitions ─────────────────────────────────
  transTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: GOLD_DARK, marginTop: 6, marginBottom: 2 },
  transBody: { fontSize: 10, color: "#333333", lineHeight: 1.4, marginBottom: 5 },
  transMeta: { fontSize: 9, fontFamily: "Helvetica-Oblique", color: "#666666", marginBottom: 7 },

  // ── LTV ─────────────────────────────────────────
  ltvTable: { borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 3, backgroundColor: CREAM2 },
  ltvRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER_SOFT },
  ltvRowLast: { flexDirection: "row" },
  ltvLabel: { width: "70%", fontSize: 10, color: INK, paddingVertical: 5, paddingHorizontal: 8, lineHeight: 1.35 },
  ltvVal: { width: "30%", fontSize: 10, fontFamily: "Helvetica-Bold", color: INK, textAlign: "right", paddingVertical: 5, paddingHorizontal: 8 },
  ltvLabelBold: { fontFamily: "Helvetica-Bold" },
  ltvBig: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GOLD_DARK },

  // ── Emails ──────────────────────────────────────
  emailSeqTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: GOLD_DARK, marginTop: 10, marginBottom: 2 },
  emailBox: { backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 3, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 6 },
  emailJour: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  emailObjet: { fontSize: 10, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 },
  emailCorps: { fontSize: 9, color: "#333333", lineHeight: 1.35 },

  footnote: { fontSize: 8.5, fontFamily: "Helvetica-Oblique", color: "#666666", marginTop: 12 },
  footer: { marginTop: 16, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: GOLD, fontSize: 7.5, color: GOLD_DARK, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 },
});

const dash = (v?: any) => (v != null && String(v).trim() ? String(v) : "—");

function Block({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <View style={s.block}>
      <Text style={s.tag}>{tag}</Text>
      {children}
    </View>
  );
}

export default function M18PdfDocument({ state }: { state: M18State }) {
  const d = state.data;
  const ltvR = computeLTV(state);
  const eleve = state.signed_by || "—";
  const programmeNom = getProgrammeNom(state) || "Mon écosystème";
  const niche = (state.m1_data && state.m1_data.niche) || "";
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  // ── Section 1 — échelle (HAUT → BAS) ──────────────────────────────
  const ladderRows = [...LEVELS].reverse().map((lv) => {
    const n = getNiv(state, lv.key);
    const prix = lv.paid ? (toIntPrice(n.prix) > 0 ? fmtEur(toIntPrice(n.prix)) : "—") : "gratuit";
    const showFormat = lv.key === "mt" && !!(n.format || "").trim();
    return {
      lvl: lv.label.replace("Niveau ", "N"),
      nom: dash(n.nom),
      format: showFormat ? (n.format || "").trim() : null,
      role: lv.roleLabel,
      prix,
    };
  });

  // ── Section 4 — emails ────────────────────────────────────────────
  const seqs: { title: string; emails: ReturnType<typeof effectiveEmails> }[] = [];
  if (hasLT(state)) seqs.push({ title: "Passage Low-Ticket -> Middle-Ticket", emails: effectiveEmails(state, "lt_mt") });
  seqs.push({ title: "Passage Middle-Ticket -> High-Ticket", emails: effectiveEmails(state, "mt_ht") });

  return (
    <Document title={`Carte d'écosystème — ${programmeNom}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Carte d'écosystème — Value Ladder</Text>
            <Text style={s.sub}>AL BARAKA · LIBERTY</Text>
            <Text style={s.docSub}>{programmeNom}{niche ? "  ·  " + niche : ""}</Text>
          </View>
          <Text style={s.date}>{dateStr}</Text>
        </View>

        {/* Section 1 — Échelle de valeur */}
        <Block tag="1 · L'échelle de valeur">
          <View style={s.table}>
            <View style={[s.tRow, s.tHead]}>
              <Text style={[s.th, s.cLvl]}>Niveau</Text>
              <Text style={[s.th, s.cOffre]}>Offre</Text>
              <Text style={[s.th, s.cRole]}>Rôle</Text>
              <Text style={[s.th, s.cPrix]}>Prix</Text>
            </View>
            {ladderRows.map((r, i) => (
              <View key={i} style={i === ladderRows.length - 1 ? s.tRowLast : s.tRow}>
                <Text style={[s.td, s.cLvl, s.tdLvl]}>{r.lvl}</Text>
                <View style={[s.cOffre, { paddingVertical: 5, paddingHorizontal: 7 }]}>
                  <Text style={{ fontSize: 9.5, color: INK, lineHeight: 1.35 }}>{r.nom}</Text>
                  {r.format ? <Text style={s.fmt}>({r.format})</Text> : null}
                </View>
                <Text style={[s.td, s.cRole, s.tdDim]}>{r.role}</Text>
                <Text style={[s.td, s.cPrix, s.tdPrix]}>{r.prix}</Text>
              </View>
            ))}
          </View>
        </Block>

        {/* Section 2 — Passages d'ascension */}
        <Block tag="2 · Les passages d'ascension">
          {hasLT(state) ? (
            <>
              <Text style={s.transTitle}>Low-Ticket -&gt; Middle-Ticket</Text>
              <Text style={s.transBody}>{dash(d.transitions.lt_mt)}</Text>
              <Text style={s.transMeta}>Lien thématique : {dash(d.connexion_lt_mt)}</Text>
            </>
          ) : null}
          <Text style={s.transTitle}>Middle-Ticket -&gt; High-Ticket</Text>
          <Text style={s.transBody}>{dash(d.transitions.mt_ht)}</Text>
        </Block>

        {/* Section 3 — LTV */}
        <Block tag="3 · La valeur vie client (LTV)">
          <View style={s.ltvTable}>
            {ltvR.breakdown.map((b, i) => (
              <View key={i} style={s.ltvRow}>
                <Text style={s.ltvLabel}>{b.label + " (" + b.note + ")"}</Text>
                <Text style={s.ltvVal}>{fmtEur(Math.round(b.val))}</Text>
              </View>
            ))}
            <View style={s.ltvRow}>
              <Text style={s.ltvLabel}>Prix d'entrée</Text>
              <Text style={s.ltvVal}>{fmtEur(ltvR.entryPrice)}</Text>
            </View>
            <View style={s.ltvRow}>
              <Text style={[s.ltvLabel, s.ltvLabelBold]}>LTV par client entrant</Text>
              <Text style={[s.ltvVal, s.ltvBig]}>{fmtEur(ltvR.ltv)}</Text>
            </View>
            <View style={s.ltvRowLast}>
              <Text style={s.ltvLabel}>Multiple LTV / prix d'entrée (cible &gt;= {LTV_MULTIPLE_TARGET}×)</Text>
              <Text style={s.ltvVal}>{ltvR.multiple ? ltvR.multiple.toFixed(1) + "×" : "—"}</Text>
            </View>
          </View>
        </Block>

        {/* Section 4 — Séquences email d'ascension */}
        <View break>
          <Text style={s.tag}>4 · Tes séquences email d'ascension</Text>
          <Text style={s.transMeta}>
            Rédigées d'après ta niche et tes offres. Remplace [prénom] et [lien] par tes champs de fusion dans ton outil d'emailing.
          </Text>
          {seqs.map((seq, si) => (
            <View key={si}>
              <Text style={s.emailSeqTitle}>{seq.title}</Text>
              {seq.emails.map((e, i) => (
                <View key={i} style={s.emailBox} wrap={false}>
                  <Text style={s.emailJour}>Email {i + 1} · {e.jour}</Text>
                  <Text style={s.emailObjet}>Objet : {dash(e.objet)}</Text>
                  <Text style={s.emailCorps}>{dash(e.corps)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Notes de bas de page */}
        <Text style={s.footnote}>
          Règle d'or : pilote ton acquisition sur ta LTV, pas sur le prix d'une offre isolée. Chaque marche prépare la suivante.
        </Text>
        <Text style={s.footnote}>Verrouillé par {eleve} le {dateStr}.</Text>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 18 — Value Ladder · Confidentiel</Text>
      </Page>
    </Document>
  );
}
