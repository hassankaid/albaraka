// ClientInvoicePdfDocument — PDF généré côté front avec @react-pdf/renderer.
//
// Émis par ETHICARENA LLC pour facturer les clients finaux du PASS AL BARAKA.
// Pas de TVA (UAE). 1 facture = 1 paiement encaissé.
//
// Style AL BARAKA : header gold + cream, branding doré (cohérent avec la
// facture apporteur InvoicePdfDocument mais simplifié pour les clients).

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const GOLD = "#C5A55A";
const GOLD_LIGHT = "#FDF8ED";
const GOLD_DARK = "#8a6d2c";
const DARK = "#1a1a2e";
const GRAY_BORDER = "#f0e6d0";
const GRAY_TEXT = "#666";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: DARK },

  /* Header */
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottom: `2 solid ${GOLD}` },
  brandName: { fontSize: 24, fontWeight: "bold", color: DARK, letterSpacing: 2 },
  brandSub: { fontSize: 8, color: GOLD, letterSpacing: 2.5, marginTop: 4, textTransform: "uppercase" },
  headerRight: { alignItems: "flex-end" },
  invoiceTitle: { fontSize: 22, fontWeight: "bold", color: GOLD, letterSpacing: 1 },
  invoiceNum: { fontSize: 11, color: GRAY_TEXT, marginTop: 6, fontFamily: "Courier" },
  invoiceDate: { fontSize: 9, color: "#888", marginTop: 4 },

  /* Parties */
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  partyBlock: { width: "47%" },
  sectionLabel: { fontSize: 8, textTransform: "uppercase", color: GOLD, letterSpacing: 1.5, fontWeight: "bold", marginBottom: 6 },
  partyName: { fontSize: 11, fontWeight: "bold", color: DARK, marginBottom: 3 },
  partyLine: { fontSize: 9, color: "#555", marginBottom: 1 },

  /* Table */
  tableHeader: { flexDirection: "row", backgroundColor: GOLD_LIGHT, paddingVertical: 10, paddingHorizontal: 12, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  thText: { color: GOLD_DARK, fontSize: 8, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.8 },
  tableRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 12, borderBottom: `1 solid ${GRAY_BORDER}` },
  cellDesc: { width: "70%" },
  cellAmount: { width: "30%", textAlign: "right" },
  descMain: { fontSize: 10, fontWeight: "bold", color: DARK, marginBottom: 2 },
  descSub: { fontSize: 8, color: "#888" },
  amountText: { fontSize: 10, color: DARK },

  /* Total */
  totalRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 12, backgroundColor: GOLD_LIGHT, fontWeight: "bold" },
  totalLabel: { width: "70%", fontSize: 11, fontWeight: "bold", color: DARK },
  totalValue: { width: "30%", textAlign: "right", fontSize: 12, fontWeight: "bold", color: GOLD },

  /* Footer */
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTop: `1 solid ${GRAY_BORDER}`, paddingTop: 12, textAlign: "center" },
  footerEcosys: { fontSize: 8, color: GOLD, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  footerText: { fontSize: 8, color: "#999", marginBottom: 2 },
});

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("fr-FR"); } catch { return iso; }
};

export interface ClientInvoicePdfData {
  invoiceNumber: string;
  paidAt: string;          // YYYY-MM-DD
  amount: number;
  paymentNumber: number | null;
  totalPayments: number | null;
  product: string;
  client: {
    name: string;
    email: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
  };
}

const ClientInvoicePdfDocument = ({ data }: { data: ClientInvoicePdfData }) => {
  const today = new Date().toISOString();
  const mensLabel =
    data.paymentNumber && data.totalPayments
      ? `Mensualité ${data.paymentNumber}/${data.totalPayments}`
      : "Paiement";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.brandName}>AL BARAKA</Text>
            <Text style={s.brandSub}>Écosystème by Ethicarena</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.invoiceTitle}>FACTURE</Text>
            <Text style={s.invoiceNum}>{data.invoiceNumber}</Text>
            <Text style={s.invoiceDate}>Date d'émission : {fmtDate(today)}</Text>
            <Text style={s.invoiceDate}>Date de paiement : {fmtDate(data.paidAt)}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={s.partiesRow}>
          <View style={s.partyBlock}>
            <Text style={s.sectionLabel}>Émetteur</Text>
            <Text style={s.partyName}>ETHICARENA LLC</Text>
            <Text style={s.partyLine}>Sidali GHALMI</Text>
            <Text style={s.partyLine}>Meydan Grandstand, 6th floor</Text>
            <Text style={s.partyLine}>Meydan Road, Nad Al Sheba</Text>
            <Text style={s.partyLine}>Dubai, United Arab Emirates</Text>
          </View>
          <View style={s.partyBlock}>
            <Text style={s.sectionLabel}>Destinataire</Text>
            <Text style={s.partyName}>{data.client.name}</Text>
            {data.client.address ? <Text style={s.partyLine}>{data.client.address}</Text> : null}
            {(data.client.postal_code || data.client.city) ? (
              <Text style={s.partyLine}>
                {data.client.postal_code || ""} {data.client.city || ""}
              </Text>
            ) : null}
            {data.client.country ? <Text style={s.partyLine}>{data.client.country}</Text> : null}
            {data.client.email ? <Text style={s.partyLine}>{data.client.email}</Text> : null}
          </View>
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.cellDesc]}>Description</Text>
          <Text style={[s.thText, s.cellAmount]}>Montant</Text>
        </View>
        <View style={s.tableRow}>
          <View style={s.cellDesc}>
            <Text style={s.descMain}>{data.product || "PASS AL BARAKA"}</Text>
            <Text style={s.descSub}>{mensLabel} — Paiement reçu le {fmtDate(data.paidAt)}</Text>
          </View>
          <View style={s.cellAmount}>
            <Text style={s.amountText}>{fmtEur(data.amount)}</Text>
          </View>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total payé</Text>
          <Text style={s.totalValue}>{fmtEur(data.amount)}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerEcosys}>AL BARAKA — Écosystème by Ethicarena</Text>
          <Text style={s.footerText}>Facture émise par ETHICARENA LLC (Dubai, United Arab Emirates)</Text>
          <Text style={s.footerText}>Document généré automatiquement — Merci pour votre confiance.</Text>
        </View>
      </Page>
    </Document>
  );
};

/**
 * Génère le Blob PDF d'une facture client (à appeler côté front uniquement).
 */
export async function generateClientInvoicePdfBlob(data: ClientInvoicePdfData): Promise<Blob> {
  const doc = <ClientInvoicePdfDocument data={data} />;
  return await pdf(doc).toBlob();
}

export default ClientInvoicePdfDocument;
