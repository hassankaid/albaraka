/**
 * Document PDF vectoriel du M8 (Preuve sociale & études de cas) via @react-pdf/renderer.
 * Remplace l'ancien export HTML + window.print() → vrai téléchargement direct,
 * texte vectoriel net, même charte (crème/or) que le M1. Police Helvetica
 * (intégrée à react-pdf → zéro chargement réseau).
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
  buildAllTemplates,
  SALUTATIONS,
  POSTURES,
  CONTEXTES,
  pickAvatarName,
  type M8State,
} from "../lib/types";

const GOLD = "#C9A84C";
const GOLD_DARK = "#8B7635";
const CREAM = "#FAF6E8";
const CREAM_ENG = "#FFF8E1";
const GREY_BRIEF = "#F5F5F5";
const INK = "#1A1A1A";

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK, backgroundColor: "#FFFFFF" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 10, marginBottom: 16 },
  headerLeft: { flex: 1, paddingRight: 12 },
  headerRight: { alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  sub: { fontSize: 8, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },
  date: { fontSize: 9, color: "#555555" },
  dateSub: { fontSize: 7.5, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 },

  block: { marginBottom: 14 },
  tag: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: GOLD_DARK, marginBottom: 4 },
  tplSub: { fontSize: 8.5, color: "#777777", marginBottom: 6 },

  box: { paddingVertical: 8, paddingHorizontal: 11, backgroundColor: CREAM, borderLeftWidth: 3, borderLeftColor: GOLD, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  boxText: { fontSize: 9.5, lineHeight: 1.55, color: INK },

  brief: { fontSize: 9.5, lineHeight: 1.5, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: GREY_BRIEF, borderRadius: 3, marginBottom: 6 },
  bold: { fontFamily: "Helvetica-Bold" },

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

function TemplateBlock({ title, sub, body }: { title: string; sub: string; body: string }) {
  return (
    <View style={s.block} wrap={false}>
      <Text style={s.tag}>{title}</Text>
      <Text style={s.tplSub}>{sub}</Text>
      <View style={s.box}>
        <Text style={s.boxText}>{body}</Text>
      </View>
    </View>
  );
}

export default function M8PdfDocument({ state }: { state: M8State }) {
  const bc = state.data.brief_client;
  const tpl = buildAllTemplates(bc);
  const avatar = pickAvatarName(state);
  const dateStr = (state.signed_at ? new Date(state.signed_at) : new Date()).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Document title={`M8 — Preuve sociale — ${state.signed_by || "Liberty"}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.title}>Preuve sociale — Module 8 LIBERTY</Text>
            <Text style={s.sub}>Offre : {dash(bc.nom_offre)} · Client cible : {dash(avatar)}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.date}>{dateStr}</Text>
            <Text style={s.dateSub}>3 messages prêts à envoyer</Text>
          </View>
        </View>

        {/* Brief client */}
        <Block tag="Brief client">
          <View style={s.brief}>
            <Text style={s.boxText}>
              Prénom du client : <Text style={s.bold}>{dash(bc.prenom_client)}</Text> · Ton :{" "}
              <Text style={s.bold}>{dash(SALUTATIONS[bc.ton_salutation]?.label)}</Text> · Posture :{" "}
              <Text style={s.bold}>{dash(POSTURES[bc.posture]?.label)}</Text> · Contexte :{" "}
              <Text style={s.bold}>{dash(CONTEXTES[bc.contexte]?.label)}</Text>
            </Text>
          </View>
          {bc.douleur_passe_hint ? (
            <View style={s.brief}>
              <Text style={s.boxText}>Douleur passé (indice script) : {bc.douleur_passe_hint}</Text>
            </View>
          ) : null}
        </Block>

        {/* 3 messages générés */}
        <TemplateBlock
          title="Message A · DM témoignage vidéo"
          sub="À envoyer en message privé pour obtenir une vidéo témoignage"
          body={tpl.A}
        />
        <TemplateBlock
          title={'Message B · Invitation "coaching bilan" Zoom'}
          sub="Pour organiser une interview client de 20-40 min"
          body={tpl.B}
        />
        <TemplateBlock
          title="Message C · Script d'interview"
          sub="À garder sous les yeux pendant l'enregistrement"
          body={tpl.C}
        />

        {/* Engagement */}
        <View style={s.eng} wrap={false}>
          <Text style={s.engTag}>Engagement</Text>
          <Text style={s.engText}>
            Je, <Text style={s.bold}>{state.signed_by || "[NOM]"}</Text>, m'engage à mettre en place une routine de récolte de preuve sociale — envoyer ces messages à mes clients satisfaits, organiser les interviews "coaching bilan" et archiver chaque témoignage vidéo dans mon arsenal de preuve, prêt à être présenté à mes prochains prospects.
          </Text>
          <View style={s.engSig}>
            <Text style={s.engName}>{state.signed_by || "[Signature]"}</Text>
            <Text style={s.engDate}>{dateStr}</Text>
          </View>
        </View>

        <Text style={s.footer}>AL BARAKA · LIBERTY · Module 8 — Preuve sociale · Confidentiel</Text>
      </Page>
    </Document>
  );
}
