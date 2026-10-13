/**
 * Le script d'appel en PDF, mise en page des templates de Sidali : logo AL
 * BARAKA, fond blanc, titres or, indications de voix, répliques encadrées.
 *
 * Police Times (intégrée au lecteur PDF, proche du Cambria des templates). Les
 * pictogrammes ⚠, 🎙 et → n'existent pas dans cette police : ils sont dessinés.
 */
import { Document, Page, Text, View, Image, Svg, Path, Circle, Rect, StyleSheet } from "@react-pdf/renderer";
// JPEG sur fond blanc : le PNG à transparence est mal lu par le moteur PDF.
import logo from "@/assets/scripts-appel/logo-al-baraka-or.jpg";
import {
  reponseListe, reponseTexte, segmenter,
  type Bloc, type DefinitionScript, type Reponses,
} from "@/lib/scriptsAppel";

const OR = "#9A740B";
const OR_BORDURE = "#C9A84C";
const CREME = "#FBF7EC";
const NOIR = "#1F1F1F";
const GRIS = "#5A5A5A";
const POINTILLE = "#BBBBBB";
const ROUGE = "#B02A2A";

const s = StyleSheet.create({
  page: { backgroundColor: "#FFFFFF", paddingTop: 51, paddingBottom: 60, paddingHorizontal: 57, fontFamily: "Times-Roman", fontSize: 10.5, color: NOIR, lineHeight: 1.35 },
  logo: { width: 90, height: 52, marginBottom: 8 },
  titre: { fontFamily: "Times-Bold", fontSize: 22, lineHeight: 1.2, marginBottom: 4 },
  sousTitre: { fontSize: 11, color: GRIS, paddingBottom: 5, borderBottomWidth: 0.8, borderBottomColor: OR_BORDURE, marginBottom: 12 },
  h2: { fontFamily: "Times-Bold", fontSize: 14, color: OR, marginTop: 14, marginBottom: 5, paddingBottom: 3, borderBottomWidth: 0.8, borderBottomColor: OR_BORDURE },
  texte: { marginBottom: 4 },
  citation: { fontFamily: "Times-Italic", fontSize: 11, color: OR, marginLeft: 14, marginBottom: 4 },
  ligneIcone: { flexDirection: "row", alignItems: "flex-start" },
  alerte: { fontFamily: "Times-Bold", fontSize: 10, marginTop: 4, marginBottom: 4 },
  voix: { flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 2 },
  voixNom: { fontFamily: "Times-Bold", fontSize: 9, color: OR },
  voixTon: { fontFamily: "Times-Italic", fontSize: 9, color: GRIS, marginLeft: 5 },
  replique: { backgroundColor: CREME, borderLeftWidth: 2.2, borderLeftColor: OR_BORDURE, paddingVertical: 3, paddingHorizontal: 8, marginLeft: 8, marginBottom: 5 },
  note: { fontFamily: "Times-Italic", fontSize: 9.5, color: GRIS, marginLeft: 8, marginBottom: 4 },
  puce: { flexDirection: "row", marginLeft: 12, marginBottom: 3 },
  puceRond: { fontFamily: "Times-Bold", color: OR, width: 11 },
  etiquette: { fontFamily: "Times-Bold", fontSize: 10, color: OR, marginTop: 8, marginBottom: 4 },
  pointilles: { borderBottomWidth: 0.6, borderBottomColor: POINTILLE, borderBottomStyle: "dotted", height: 14, marginBottom: 6 },
  vide: { color: POINTILLE },
  pied: { position: "absolute", bottom: 26, left: 57, right: 57, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: GRIS },
});

function Avertissement() {
  return (
    <Svg width={10} height={9} viewBox="0 0 20 18" style={{ marginRight: 4, marginTop: 1.5 }}>
      <Path d="M10 0 L20 18 L0 18 Z" fill={ROUGE} />
      <Rect x={9} y={6} width={2} height={6} fill="#FFFFFF" />
      <Rect x={9} y={13.5} width={2} height={2} fill="#FFFFFF" />
    </Svg>
  );
}

function Micro() {
  return (
    <Svg width={8} height={10} viewBox="0 0 16 20" style={{ marginRight: 4 }}>
      <Rect x={4} y={0} width={8} height={12} rx={4} fill={OR} />
      <Path d="M1 9 Q1 16 8 16 Q15 16 15 9" stroke={OR} strokeWidth={2} fill="none" />
      <Rect x={7} y={16} width={2} height={4} fill={OR} />
      <Circle cx={8} cy={20} r={0.1} fill={OR} />
    </Svg>
  );
}

function Fleche() {
  return (
    <Svg width={9} height={8} viewBox="0 0 18 16" style={{ marginRight: 4, marginTop: 2 }}>
      <Path d="M0 8 L14 8 M9 3 L15 8 L9 13" stroke={GRIS} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function Morceaux({ texte, def, rep }: { texte: string; def: DefinitionScript; rep: Reponses }) {
  return (
    <>
      {segmenter(texte, rep, def.champs).map((seg, i) => (
        <Text key={i} style={seg.vide ? s.vide : undefined}>{seg.texte}</Text>
      ))}
    </>
  );
}

function Pointilles({ n }: { n: number }) {
  return <>{Array.from({ length: n }, (_, i) => <View key={i} style={s.pointilles} />)}</>;
}

function BlocPdf({ b, def, rep }: { b: Bloc; def: DefinitionScript; rep: Reponses }) {
  switch (b.t) {
    case "titre":
      return <Text style={s.h2} minPresenceAhead={40}>{b.texte}</Text>;
    case "texte":
      return <Text style={s.texte}><Morceaux texte={b.texte} def={def} rep={rep} /></Text>;
    case "citation":
      return <Text style={s.citation}>{b.texte}</Text>;
    case "alerte":
      return (
        <View style={s.ligneIcone} wrap={false}>
          <Avertissement />
          <Text style={[s.alerte, { flex: 1, marginTop: 0 }]}><Morceaux texte={b.texte} def={def} rep={rep} /></Text>
        </View>
      );
    case "voix":
      return (
        <View style={s.voix} minPresenceAhead={30}>
          <Micro />
          <Text style={s.voixNom}>{b.nom}</Text>
          <Text style={s.voixTon}>{b.ton}</Text>
        </View>
      );
    case "replique":
      return <View style={s.replique}><Text><Morceaux texte={b.texte} def={def} rep={rep} /></Text></View>;
    case "note":
      return (
        <View style={[s.ligneIcone, { marginLeft: 8, marginBottom: 4 }]}>
          <Fleche />
          <Text style={[s.note, { marginLeft: 0, marginBottom: 0, flex: 1 }]}>
            <Morceaux texte={b.texte.replace(/^→\s*/, "")} def={def} rep={rep} />
          </Text>
        </View>
      );
    case "puce":
      return (
        <View style={s.puce}>
          <Text style={s.puceRond}>•</Text>
          <Text style={{ flex: 1 }}><Morceaux texte={b.texte} def={def} rep={rep} /></Text>
        </View>
      );
    case "etiquette":
      return <Text style={s.etiquette} minPresenceAhead={30}><Morceaux texte={b.texte} def={def} rep={rep} /></Text>;
    case "lignes":
      return <Pointilles n={b.n} />;
    case "champ": {
      const champ = def.champs.find((c) => c.id === b.id);
      if (champ?.type === "liste") {
        const items = reponseListe(rep, b.id);
        if (!items.length) return <Pointilles n={b.lignes} />;
        return (
          <>
            {items.map((l, i) => (
              <View key={i} style={s.puce}>
                <Text style={s.puceRond}>•</Text>
                <Text style={{ flex: 1 }}>{l}</Text>
              </View>
            ))}
          </>
        );
      }
      const v = reponseTexte(rep, b.id);
      if (!v) return champ?.facultatif ? null : <Pointilles n={b.lignes} />;
      return (
        <>
          {v.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l, i) => (
            <View key={i} style={s.replique}><Text>{l}</Text></View>
          ))}
        </>
      );
    }
  }
}

export function ScriptAppelPdf({ def, reponses, projet }: { def: DefinitionScript; reponses: Reponses; projet: string }) {
  return (
    <Document title={`Script — ${def.titre}`} author="AL BARAKA">
      <Page size="A4" style={s.page}>
        <Image src={logo} style={s.logo} />
        <Text style={s.titre}>Script — {def.titre}</Text>
        <Text style={s.sousTitre}>{projet ? `${projet} · ${def.sousTitre}` : def.sousTitre}</Text>
        {def.blocs.map((b, i) => <BlocPdf key={i} b={b} def={def} rep={reponses} />)}
        <View style={s.pied} fixed>
          <Text>AL BARAKA · Script — {def.titre}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
