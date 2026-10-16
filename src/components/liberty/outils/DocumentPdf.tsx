/**
 * Document d'un outil Liberty en PDF, même charte que le Word : fond blanc, titres
 * or #B8963E, police Helvetica (l'équivalent d'Arial intégré au lecteur PDF), en-tête
 * « Parcours Liberty · Étape X », outil, élève, date, et le rappel de validation.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { A_COMPLETER, type BlocDoc, type DocumentOutil } from "@/lib/liberty/outils/modele";
import { RAPPEL_VALIDATION, type Entete } from "@/lib/liberty/outils/docx";

const OR = "#B8963E";
const NOIR = "#1F1F1F";
const GRIS = "#6B6B6B";
const GRIS_CLAIR = "#A0A0A0";
const CREME = "#FBF7EC";
const BORD = "#D9CDB0";

const s = StyleSheet.create({
  page: { backgroundColor: "#FFFFFF", paddingTop: 48, paddingBottom: 56, paddingHorizontal: 54, fontFamily: "Helvetica", fontSize: 10.5, color: NOIR, lineHeight: 1.4 },
  sur: { fontFamily: "Helvetica-Bold", fontSize: 9, color: OR, letterSpacing: 1 },
  titre: { fontFamily: "Helvetica-Bold", fontSize: 20, lineHeight: 1.25, marginTop: 2, marginBottom: 6 },
  sousTitre: { fontSize: 9.5, color: GRIS, paddingBottom: 6, borderBottomWidth: 0.8, borderBottomColor: OR, marginBottom: 10 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 12, color: OR, marginTop: 12, marginBottom: 5, letterSpacing: 0.6 },
  champ: { marginBottom: 4 },
  libelle: { fontFamily: "Helvetica-Bold" },
  vide: { fontFamily: "Helvetica-Oblique", color: GRIS_CLAIR },
  phraseLibelle: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: OR, marginBottom: 1 },
  phrase: { backgroundColor: CREME, borderLeftWidth: 2.2, borderLeftColor: OR, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 7, fontSize: 11.5 },
  puce: { flexDirection: "row", marginLeft: 10, marginBottom: 2 },
  puceRond: { fontFamily: "Helvetica-Bold", color: OR, width: 10 },
  tableau: { borderWidth: 0.6, borderColor: BORD, marginBottom: 7 },
  ligne: { flexDirection: "row", borderTopWidth: 0.6, borderTopColor: BORD },
  cellule: { flex: 1, padding: 4, fontSize: 9.5, borderLeftWidth: 0.6, borderLeftColor: BORD },
  entete: { backgroundColor: CREME, fontFamily: "Helvetica-Bold" },
  rappel: { marginTop: 14, paddingTop: 6, borderTopWidth: 0.8, borderTopColor: OR, fontFamily: "Helvetica-Bold" },
  pied: { position: "absolute", bottom: 24, left: 54, right: 54, textAlign: "center", fontSize: 7.5, color: GRIS },
});

function Valeur({ v }: { v: string }) {
  return v.trim() ? <Text>{v.trim()}</Text> : <Text style={s.vide}>{A_COMPLETER}</Text>;
}

function Bloc({ b }: { b: BlocDoc }) {
  switch (b.t) {
    case "champ":
      return (
        <Text style={s.champ}>
          <Text style={s.libelle}>{b.libelle} : </Text>
          {b.valeur.trim() ? b.valeur.trim() : <Text style={s.vide}>{A_COMPLETER}</Text>}
        </Text>
      );
    case "phrase":
      return (
        <View wrap={false}>
          {b.libelle ? <Text style={s.phraseLibelle}>{b.libelle}</Text> : null}
          <View style={s.phrase}><Valeur v={b.valeur} /></View>
        </View>
      );
    case "liste": {
      const items = b.items.length ? b.items : [""];
      return (
        <View style={{ marginBottom: 5 }}>
          {b.libelle ? <Text style={s.libelle}>{b.libelle} :</Text> : null}
          {items.map((i, k) => (
            <View key={k} style={s.puce}><Text style={s.puceRond}>•</Text><View style={{ flex: 1 }}><Valeur v={i} /></View></View>
          ))}
        </View>
      );
    }
    case "tableau": {
      const lignes = b.lignes.length ? b.lignes : [b.colonnes.map(() => "")];
      return (
        <View style={s.tableau}>
          <View style={[s.ligne, { borderTopWidth: 0 }]}>
            {b.colonnes.map((c, k) => <Text key={k} style={[s.cellule, s.entete, k === 0 ? { borderLeftWidth: 0 } : {}]}>{c}</Text>)}
          </View>
          {lignes.map((l, i) => (
            <View key={i} style={s.ligne} wrap={false}>
              {l.map((c, k) => (
                <View key={k} style={[s.cellule, k === 0 ? { borderLeftWidth: 0 } : {}]}><Valeur v={c} /></View>
              ))}
            </View>
          ))}
        </View>
      );
    }
    case "texte":
      return <Text style={s.champ}>{b.texte}</Text>;
    case "saut":
      return <View break />;
  }
}

export function DocumentPdf({ document: d, entete: e }: { document: DocumentOutil; entete: Entete }) {
  return (
    <Document title={d.titre} author="AL BARAKA · Parcours Liberty">
      <Page size="A4" style={s.page}>
        <Text style={s.sur}>PARCOURS LIBERTY · {e.def.etape.toUpperCase()}</Text>
        <Text style={s.titre}>{d.titre}</Text>
        <Text style={s.sousTitre}>Outil {e.def.numero} — {e.def.nom}  ·  {e.eleve || "Élève"}  ·  {e.date}</Text>
        {d.sections.map((sec, i) => (
          <View key={i}>
            <Text style={s.h2} minPresenceAhead={40}>{sec.titre.toUpperCase()}</Text>
            {sec.blocs.map((b, k) => <Bloc key={k} b={b} />)}
          </View>
        ))}
        <Text style={s.rappel}>{RAPPEL_VALIDATION}</Text>
        <Text style={s.pied} fixed render={({ pageNumber, totalPages }) =>
          `Parcours Liberty · ${e.def.etape} · Outil ${e.def.numero} — ${e.def.nom}  ·  ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
