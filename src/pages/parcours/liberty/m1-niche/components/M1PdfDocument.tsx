/**
 * Document PDF vectoriel du M1 (Sous-Niche 2.0) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or). Police Helvetica (intégrée à
 * react-pdf → zéro chargement réseau).
 */
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { M1State } from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM2 = "#FFFBF0";
const CREAM_ENG = "#FFF8E1";
const BORDER_SOFT = "#E8DCB0";
const INK = "#1A1A1A";

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  date: { fontSize: 9, color: "#555555" },

  block: { marginBottom: 11 },
  tag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 4 },
  box: { paddingVertical: 8, paddingHorizontal: 11, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  boxText: { fontSize: 10, lineHeight: 1.5, color: INK },
  phrase: { fontSize: 13, fontFamily: "Helvetica-Bold", lineHeight: 1.35, color: INK },
  bold: { fontFamily: "Helvetica-Bold" },

  avatarRow: { flexDirection: "row", backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, padding: 10, borderRadius: 3 },
  avatarPhoto: { width: 78, height: 78, borderRadius: 6, borderWidth: 1, borderColor: GOLD, marginRight: 12, objectFit: "cover" },
  avatarPlaceholder: { width: 78, height: 78, borderRadius: 6, borderWidth: 1, borderColor: GOLD, marginRight: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD_DARK },
  avatarInfo: { flex: 1 },
  infoLine: { fontSize: 9.5, marginBottom: 2, color: INK, lineHeight: 1.4 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 },
  cell: { width: "48.5%", backgroundColor: CREAM2, borderWidth: 1, borderColor: BORDER_SOFT, borderRadius: 3, padding: 7, marginBottom: 7 },
  cellLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, color: GOLD_DARK, marginBottom: 3 },
  cellContent: { fontSize: 9, lineHeight: 1.45, color: INK },

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

export default function M1PdfDocument({ state, includePhoto = true }: { state: M1State; includePhoto?: boolean }) {
  const sn = state.sous_niche_2;
  const a = state.avatar;
  const eng = state.engagement;
  const dateStr = (eng.date_signature ? new Date(eng.date_signature) : new Date()).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const initials =
    (a.socio.nom || "").trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "—";
  const photo = includePhoto && a.photo_url ? a.photo_url : null;

  const psycho: [string, string][] = [
    ["Problème principal", a.psycho.probleme],
    ["Objectifs", a.psycho.objectifs],
    ["Conséquences", a.psycho.consequences],
    ["Ce qu'elle/il a essayé", a.psycho.passe],
    ["Sentiment actuel", a.psycho.sentiment],
    ["Paradis (situation rêvée)", a.psycho.paradis],
  ];

  return (
    <Document title={`M1 — Sous-Niche 2.0 — ${eng.nom_complet || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Sous-Niche 2.0 — Module 1 LIBERTY</Text>
            <Text style={s.sub}>AL BARAKA · EthicArena</Text>
          </View>
          <Text style={s.date}>{dateStr}</Text>
        </View>

        <Block tag="Phrase finale">
          <View style={s.box}><Text style={s.phrase}>{dash(sn.phrase)}</Text></View>
        </Block>
        <Block tag="Cible précise">
          <View style={s.box}><Text style={s.boxText}>{dash(sn.cible)}</Text></View>
        </Block>
        <Block tag="Douleur concrète">
          <View style={s.box}><Text style={s.boxText}>{dash(sn.douleur)}</Text></View>
        </Block>
        <Block tag="Pouvoir d'achat — preuves">
          <View style={s.box}><Text style={s.boxText}>{dash(sn.pouvoir_achat)}</Text></View>
        </Block>
        <Block tag="Facile à contacter">
          <View style={s.box}><Text style={s.boxText}>{dash(sn.contact)}</Text></View>
        </Block>
        <Block tag="Croissance du marché">
          <View style={s.box}><Text style={s.boxText}>{dash(sn.croissance)}</Text></View>
        </Block>
        <Block tag="Méthode propriétaire">
          <View style={s.box}><Text style={[s.boxText, s.bold]}>{dash(sn.methode)}</Text></View>
        </Block>

        {/* Avatar */}
        <Block tag="Avatar client">
          <View style={s.avatarRow}>
            {photo ? (
              <Image style={s.avatarPhoto} src={photo} />
            ) : (
              <View style={s.avatarPlaceholder}><Text style={s.avatarInitials}>{initials}</Text></View>
            )}
            <View style={s.avatarInfo}>
              <Text style={s.infoLine}><Text style={s.bold}>{dash(a.socio.nom)}</Text>, {dash(a.socio.age)} · {dash(a.socio.sexe)}</Text>
              <Text style={s.infoLine}><Text style={s.bold}>Lieu : </Text>{dash(a.socio.lieu)}</Text>
              <Text style={s.infoLine}><Text style={s.bold}>Revenu : </Text>{dash(a.socio.revenu)}</Text>
              <Text style={s.infoLine}><Text style={s.bold}>Couple : </Text>{dash(a.socio.compagnon)}</Text>
              <Text style={s.infoLine}><Text style={s.bold}>Famille : </Text>{dash(a.socio.situation)}</Text>
              <Text style={s.infoLine}><Text style={s.bold}>Relations : </Text>{dash(a.socio.relations)}</Text>
            </View>
          </View>
          <View style={s.grid}>
            {psycho.map(([label, val], i) => (
              <View key={i} style={s.cell}>
                <Text style={s.cellLabel}>{label}</Text>
                <Text style={s.cellContent}>{dash(val)}</Text>
              </View>
            ))}
          </View>
        </Block>

        <Block tag="Phrase pivot">
          <View style={s.box}><Text style={[s.boxText, s.bold]}>{dash(a.psycho.phrase_avatar)}</Text></View>
        </Block>

        {/* Engagement */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement écrit</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{eng.nom_complet || "[NOM]"}</Text>, m'engage à construire mon offre exclusivement sur cette niche pour les <Text style={s.bold}>90 prochains jours</Text>. Je ne shopperai pas d'autres niches en parallèle. Je ne reviendrai pas sur cette décision tant que je n'aurai pas testé sérieusement cette niche avec les modules M2 à M11.
          </Text>
          <View style={s.engSig}>
            <Text style={s.engName}>{eng.nom_complet || "[Signature]"}</Text>
            <Text style={s.engDate}>{dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 1 — Sous-niche 2.0 · Confidentiel</Text>
      </Page>
    </Document>
  );
}
