/**
 * Le retour validé en PDF, que le coach envoie à l'élève (en attendant l'espace élève).
 * Même mise en page que les scripts d'appel : logo, titres or, police Times (intégrée au
 * lecteur PDF). Times n'a ni « ▶ » ni le signe moins typographique : ils sont évités.
 */
import { createElement } from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import logo from "@/assets/scripts-appel/logo-al-baraka-or.jpg";
import { duree, entreGuillemets, pointsEnMoins, type Analyse, type RetourCoach } from "@/lib/appels/retour";

const OR = "#9A740B";
const OR_BORDURE = "#C9A84C";
const CREME = "#FBF7EC";
const NOIR = "#1F1F1F";
const GRIS = "#5A5A5A";

const s = StyleSheet.create({
  page: { backgroundColor: "#FFFFFF", paddingTop: 46, paddingBottom: 56, paddingHorizontal: 54, fontFamily: "Times-Roman", fontSize: 10.5, color: NOIR, lineHeight: 1.35 },
  logo: { width: 86, height: 50, marginBottom: 8 },
  titre: { fontFamily: "Times-Bold", fontSize: 20, marginBottom: 3 },
  sousTitre: { fontSize: 10.5, color: GRIS, paddingBottom: 6, borderBottomWidth: 0.8, borderBottomColor: OR_BORDURE, marginBottom: 12 },
  note: { flexDirection: "row", alignItems: "flex-end", marginBottom: 4 },
  noteChiffre: { fontFamily: "Times-Bold", fontSize: 34, color: NOIR },
  noteSur: { fontSize: 13, color: GRIS, marginLeft: 3, marginBottom: 5 },
  alerte: { fontSize: 9.5, color: GRIS, marginBottom: 8 },
  h2: { fontFamily: "Times-Bold", fontSize: 13, color: OR, marginTop: 12, marginBottom: 5, paddingBottom: 2, borderBottomWidth: 0.8, borderBottomColor: OR_BORDURE },
  texte: { marginBottom: 4 },
  bloc: { backgroundColor: CREME, borderLeftWidth: 2.2, borderLeftColor: OR_BORDURE, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 6 },
  gras: { fontFamily: "Times-Bold" },
  citation: { fontFamily: "Times-Italic", color: GRIS, marginTop: 2 },
  ideal: { fontFamily: "Times-Italic", color: OR, marginTop: 2 },
  ligne: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderBottomWidth: 0.4, borderBottomColor: "#E5DFCF" },
  pied: { position: "absolute", bottom: 24, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: GRIS },
});

const sansFleche = (t: string) => t.replace(/[−–]/g, "-").replace(/[▶→]/g, "");

/** Format de la coach (référentiel v0.6) : pas de note, verdict, réussites, points, priorités.
 * Times n'a pas les émojis du texte copié (✅ ⚠️ 👉 🎯) : ils sont remplacés par des titres. */
function CorpsCoach({ r }: { r: RetourCoach }) {
  const reussites = r.reussites.filter((x) => !x.retire && x.texte.trim());
  const points = r.points.filter((p) => !p.retire);
  const priorites = r.priorites.filter((x) => x.trim());
  const pp = r.point_principal && !r.point_principal.retire && r.point_principal.titre?.trim() ? r.point_principal : null;
  return (
    <>
      {r.verdict?.trim() ? <Text style={[s.texte, s.gras]}>{sansFleche(r.verdict.trim())}</Text> : null}
      {pp && (
        <View style={[s.bloc, { marginTop: 6 }]} wrap={false}>
          <Text style={s.gras}>Le point principal : {sansFleche(pp.titre.trim())}</Text>
          <Text>{sansFleche((pp.texte ?? "").trim())}</Text>
        </View>
      )}
      {reussites.length > 0 && <Text style={s.h2}>Ce qui a bien marché</Text>}
      {reussites.map((x, i) => (
        <Text key={i} style={s.texte}>
          •  {sansFleche(x.texte.trim())}
        </Text>
      ))}
      {points.length > 0 && <Text style={s.h2}>Points à travailler</Text>}
      {points.map((p, i) => (
        <View key={i} style={s.bloc} wrap={false}>
          <Text style={s.gras}>
            {i + 1}. {sansFleche(p.titre.trim())}
            {p.moins_grave && !/moins grave/i.test(p.titre) ? " (moins grave)" : ""}
          </Text>
          {p.constat?.trim() ? <Text>{sansFleche(p.constat.trim())}</Text> : null}
          {p.formulation?.trim() ? <Text style={s.ideal}>À dire : {sansFleche(entreGuillemets(p.formulation))}</Text> : null}
          {p.suite?.trim() ? <Text>{sansFleche(p.suite.trim())}</Text> : null}
        </View>
      ))}
      {priorites.length > 0 && <Text style={s.h2}>Pour ton prochain appel, en priorité</Text>}
      {priorites.map((x, i) => (
        <Text key={i} style={s.texte}>
          {i + 1}. {sansFleche(x.trim())}
        </Text>
      ))}
    </>
  );
}

function RetourAppelPdf({ a, eleve, typeAppel, dureeS, date }: { a: Analyse; eleve: string; typeAppel: string; dureeS: number | null; date: string }) {
  const forts = a.points_forts.filter((p) => !p.retire);
  const axes = a.axes.filter((x) => !x.retire);
  return (
    <Document title={`Retour d'appel - ${eleve}`} author="AL BARAKA">
      <Page size="A4" style={s.page}>
        <Image src={logo} style={s.logo} />
        <Text style={s.titre}>Le retour sur ton appel</Text>
        <Text style={s.sousTitre}>
          {eleve} · {typeAppel} · {duree(dureeS)} · {date}
        </Text>
        {a.retour ? (
          <CorpsCoach r={a.retour} />
        ) : (
          <>
        <View style={s.note}>
          <Text style={s.noteChiffre}>{Math.round(a.note_globale)}</Text>
          <Text style={s.noteSur}>/100</Text>
        </View>
        {(a.penalite > 0 || a.alerte_duree) && (
          <Text style={s.alerte}>
            {a.penalite > 0 && `${Math.round(a.note_etapes)} sur les étapes, ${pointsEnMoins(a.penalite)} en moins car le prospect n'a pas été prévenu de l'enregistrement. `}
            {a.alerte_duree && `${sansFleche(a.alerte_duree)}.`}
          </Text>
        )}
        {a.analyse_globale ? <Text style={s.texte}>{sansFleche(a.analyse_globale)}</Text> : null}

        {forts.length > 0 && <Text style={s.h2}>Ce que tu as bien fait</Text>}
        {forts.map((p, i) => (
          <View key={i} style={s.bloc} wrap={false}>
            <Text style={s.gras}>{sansFleche(p.titre)}</Text>
            {p.pourquoi ? <Text>{sansFleche(p.pourquoi)}</Text> : null}
            {p.citation ? <Text style={s.citation}>« {sansFleche(p.citation)} »</Text> : null}
          </View>
        ))}

        {axes.length > 0 && <Text style={s.h2}>À améliorer</Text>}
        {axes.map((x, i) => (
          <View key={i} style={s.bloc} wrap={false}>
            <Text style={s.gras}>
              {i + 1}. {sansFleche(x.titre)}
            </Text>
            {x.probleme ? <Text>{sansFleche(x.probleme)}</Text> : null}
            {x.formulation_ideale ? (
              <Text style={s.ideal}>À dire la prochaine fois : « {sansFleche(x.formulation_ideale).replace(/^«\s*|\s*»$/g, "")} »</Text>
            ) : null}
          </View>
        ))}

        {a.conseil_prioritaire?.texte ? (
          <>
            <Text style={s.h2}>Ton conseil prioritaire</Text>
            <Text style={s.texte}>{sansFleche(a.conseil_prioritaire.texte)}</Text>
          </>
        ) : null}

        <Text style={s.h2}>Le détail par étape</Text>
        {a.etapes.map((e) => (
          <View key={e.code} style={s.ligne} wrap={false}>
            <Text>
              {e.code} {e.nom}
            </Text>
            <Text style={s.gras}>{e.note.toLocaleString("fr-FR")}/10</Text>
          </View>
        ))}
        {a.etapes
          .filter((e) => e.liste?.length && e.justification?.trim())
          .map((e) => (
            <Text key={`detail-${e.code}`} style={[s.texte, { marginTop: 4 }]}>
              {e.code} {e.nom} : {sansFleche(e.justification.trim())}
            </Text>
          ))}

        {a.encouragement ? <Text style={[s.texte, { marginTop: 12, fontFamily: "Times-Italic" }]}>{sansFleche(a.encouragement)}</Text> : null}

          </>
        )}

        <View style={s.pied} fixed>
          <Text>AL BARAKA · retour validé par ton coach</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function telechargerRetour(p: { a: Analyse; eleve: string; typeAppel: string; dureeS: number | null; date: string }) {
  const { pdf } = await import("@react-pdf/renderer");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(RetourAppelPdf, p) as any).toBlob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `Retour appel - ${p.eleve} - ${p.date.replace(/\//g, "-")}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
