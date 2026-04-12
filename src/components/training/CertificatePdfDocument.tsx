import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import alBarakaLogo from "@/assets/al-baraka-logo.png";
import cormorantRegular from "@/assets/fonts/CormorantGaramond-Regular.ttf?url";
import cormorantItalic from "@/assets/fonts/CormorantGaramond-Italic.ttf?url";
import cormorantBold from "@/assets/fonts/CormorantGaramond-Bold.ttf?url";

Font.register({
  family: "Cormorant Garamond",
  fonts: [
    { src: cormorantRegular, fontWeight: 400 },
    { src: cormorantItalic, fontWeight: 400, fontStyle: "italic" },
    { src: cormorantBold, fontWeight: 700 },
  ],
});

const BG = "#0A0A0A";
const GOLD = "#C5A55A";
const GOLD_BRIGHT = "#D4AF37";
const GOLD_SOFT = "#A68B3E";
const CREAM = "#F5F1E8";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  page: {
    backgroundColor: BG,
    padding: 0,
    fontFamily: "Helvetica",
    color: CREAM,
  },
  outerFrame: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderWidth: 1.5,
    borderColor: GOLD,
    borderStyle: "solid",
  },
  innerFrame: {
    position: "absolute",
    top: 26,
    left: 26,
    right: 26,
    bottom: 26,
    borderWidth: 0.5,
    borderColor: GOLD_SOFT,
    borderStyle: "solid",
  },
  content: {
    paddingHorizontal: 60,
    paddingTop: 50,
    paddingBottom: 50,
    height: "100%",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    width: 180,
    height: 90,
    objectFit: "contain",
    marginBottom: 8,
  },
  brandLine: {
    fontFamily: "Cormorant Garamond",
    fontSize: 9,
    letterSpacing: 4,
    color: GOLD_SOFT,
    textTransform: "uppercase",
    marginBottom: 22,
  },
  title: {
    fontFamily: "Cormorant Garamond",
    fontSize: 34,
    letterSpacing: 6,
    color: GOLD,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  divider: {
    width: 90,
    height: 1,
    backgroundColor: GOLD,
    marginBottom: 32,
  },
  preLabel: {
    fontSize: 10,
    color: GOLD_SOFT,
    fontStyle: "italic",
    marginBottom: 14,
    letterSpacing: 1,
  },
  recipientName: {
    fontFamily: "Cormorant Garamond",
    fontSize: 46,
    color: WHITE,
    marginBottom: 18,
    textAlign: "center",
  },
  midLabel: {
    fontSize: 10,
    color: GOLD_SOFT,
    fontStyle: "italic",
    marginBottom: 14,
    letterSpacing: 1,
  },
  formationTitle: {
    fontFamily: "Cormorant Garamond",
    fontStyle: "italic",
    fontSize: 26,
    color: GOLD_BRIGHT,
    textAlign: "center",
    marginBottom: 30,
  },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: {
    flexDirection: "column",
    maxWidth: 280,
  },
  footerCenter: {
    alignItems: "center",
    flex: 1,
  },
  footerRight: {
    alignItems: "flex-end",
  },
  certNumber: {
    fontSize: 9,
    color: GOLD,
    letterSpacing: 1.5,
    fontWeight: 700,
    marginBottom: 3,
  },
  certMeta: {
    fontSize: 8,
    color: GOLD_SOFT,
  },
  brandFooter: {
    fontFamily: "Cormorant Garamond",
    fontSize: 9,
    color: GOLD_SOFT,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  qrWrap: {
    backgroundColor: WHITE,
    padding: 4,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: GOLD,
  },
  qr: {
    width: 58,
    height: 58,
  },
  verifyUrl: {
    fontSize: 6.5,
    color: GOLD_SOFT,
    marginTop: 4,
    textAlign: "right",
  },
});

export interface CertificatePdfData {
  certificateNumber: string;
  recipientName: string;
  formationTitle: string;
  issuedAt: Date;
  verifyUrl: string;
  qrDataUrl: string;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const CertificatePdfDocument = ({ data }: { data: CertificatePdfData }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.outerFrame} />
      <View style={s.innerFrame} />

      <View style={s.content}>
        <Image src={alBarakaLogo} style={s.logo} />
        <Text style={s.brandLine}>Al Baraka Training</Text>

        <Text style={s.title}>Certificat de Réussite</Text>
        <View style={s.divider} />

        <Text style={s.preLabel}>Ce certificat est décerné à</Text>
        <Text style={s.recipientName}>{data.recipientName}</Text>

        <Text style={s.midLabel}>pour avoir validé avec succès la formation</Text>
        <Text style={s.formationTitle}>« {data.formationTitle} »</Text>
      </View>

      <View style={s.footer} fixed>
        <View style={s.footerLeft}>
          <Text style={s.certNumber}>N° {data.certificateNumber}</Text>
          <Text style={s.certMeta}>Émis le {fmtDate(data.issuedAt)}</Text>
        </View>
        <View style={s.footerCenter}>
          <Text style={s.brandFooter}>Ethicarena • Al Baraka Training</Text>
        </View>
        <View style={s.footerRight}>
          <View style={s.qrWrap}>
            <Image src={data.qrDataUrl} style={s.qr} />
          </View>
          <Text style={s.verifyUrl}>{data.verifyUrl}</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default CertificatePdfDocument;
