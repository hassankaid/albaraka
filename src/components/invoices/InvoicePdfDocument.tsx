import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

/* ------------------------------------------------------------------ */
/*  Colour tokens                                                      */
/* ------------------------------------------------------------------ */
const PURPLE = "#6d28d9";
const GRAY_BG = "#f5f5f5";
const GRAY_BORDER = "#e0e0e0";
const GRAY_TEXT = "#666";
const DARK = "#1a1a2e";

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: DARK },

  /* Header */
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  facture: { fontSize: 32, fontWeight: "bold", color: PURPLE },
  headerRight: { alignItems: "flex-end" },
  headerMeta: { fontSize: 9, color: GRAY_TEXT, marginBottom: 2 },
  invoiceNum: { fontSize: 10, fontWeight: "bold", textDecoration: "underline", marginBottom: 4 },
  purpleLine: { height: 3, backgroundColor: PURPLE, marginBottom: 20 },

  /* Parties */
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  partyBlock: { width: "48%" },
  sectionLabel: { fontSize: 8, textTransform: "uppercase", color: PURPLE, fontWeight: "bold", letterSpacing: 1, marginBottom: 6 },
  partyName: { fontSize: 11, fontWeight: "bold", marginBottom: 2 },
  partyLine: { fontSize: 9, color: "#333", marginBottom: 1 },

  /* Conditions box */
  conditionsBox: { borderLeft: `3 solid ${PURPLE}`, backgroundColor: "#fafafa", padding: 12, marginBottom: 20 },
  condBold: { fontWeight: "bold", fontSize: 8 },
  condText: { fontSize: 8, color: "#444", marginBottom: 3 },

  /* Table */
  tableHeader: { flexDirection: "row", backgroundColor: PURPLE, paddingVertical: 8, paddingHorizontal: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  thText: { color: "#fff", fontSize: 7, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottom: `1 solid ${GRAY_BORDER}` },
  tableRowAlt: { backgroundColor: GRAY_BG },
  cellDesc: { width: "28%" },
  cellMens: { width: "10%", textAlign: "center" },
  cellMontant: { width: "17%", textAlign: "center" },
  cellDate: { width: "17%", textAlign: "center" },
  cellComm: { width: "12%", textAlign: "center" },
  cellTotal: { width: "16%", textAlign: "right" },
  cellText: { fontSize: 8 },
  clientName: { fontSize: 8, fontWeight: "bold", marginTop: 1 },

  /* Fixed salary */
  salaryRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottom: `1 solid ${GRAY_BORDER}`, backgroundColor: GRAY_BG },
  salaryLabel: { fontSize: 8, fontWeight: "bold", fontStyle: "italic" },

  /* Totals */
  totalsBlock: { alignItems: "flex-end", marginTop: 12, marginBottom: 20 },
  totalLine: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10 },
  totalHtLabel: { fontSize: 10, color: DARK },
  totalHtValue: { fontSize: 10, color: DARK },
  netRow: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 10, backgroundColor: PURPLE, borderRadius: 3 },
  netLabel: { fontSize: 11, fontWeight: "bold", color: "#fff" },
  netValue: { fontSize: 11, fontWeight: "bold", color: "#fff" },

  /* Bank */
  bankBox: { borderLeft: `3 solid ${GRAY_BORDER}`, padding: 12, marginTop: 10 },
  bankTitle: { fontSize: 8, textTransform: "uppercase", fontWeight: "bold", color: GRAY_TEXT, letterSpacing: 0.8, marginBottom: 6 },
  bankLine: { fontSize: 9, marginBottom: 2 },
  bankLabel: { fontWeight: "bold" },

  /* Footer */
  footer: { position: "absolute", bottom: 25, left: 40, right: 40, borderTop: `1 solid ${GRAY_BORDER}`, paddingTop: 8, textAlign: "center", fontSize: 7, color: "#999" },
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
};

const addDays = (d: Date, days: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface InvoicePdfLine {
  client_name: string;
  payment_amount: number;
  payment_date: string;
  commission_percentage: number;
  commission_amount: number;
  sale_id: string | null;
  payment_number?: number | null;
  total_payments?: number | null;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  month: number;
  year: number;
  totalAmount: number;
  apporteur: {
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    country?: string;
    siret?: string;
  };
  bankDetails?: {
    account_holder?: string;
    iban?: string;
    bic?: string;
    bank_name?: string;
  };
  lines: InvoicePdfLine[];
}

/* ------------------------------------------------------------------ */
/*  Document                                                           */
/* ------------------------------------------------------------------ */
const InvoicePdfDocument = ({ data }: { data: InvoicePdfData }) => {
  const { invoiceNumber, month, year, totalAmount, apporteur, bankDetails, lines } = data;
  const commissionLines = lines.filter((l) => l.sale_id !== null);
  const fixedSalaryLine = lines.find((l) => l.sale_id === null);
  const today = new Date();
  const echeance = addDays(today, 30);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ---- Header ---- */}
        <View style={s.headerRow}>
          <Text style={s.facture}>FACTURE</Text>
          <View style={s.headerRight}>
            <Text style={s.invoiceNum}>{invoiceNumber}</Text>
            <Text style={s.headerMeta}>Date : {fmtDate(today.toISOString())}</Text>
            <Text style={s.headerMeta}>Échéance : {fmtDate(echeance.toISOString())}</Text>
            <Text style={s.headerMeta}>Période : {monthNames[month - 1]} {year}</Text>
            <Text style={s.headerMeta}>Type d'opération : Prestation de services</Text>
          </View>
        </View>
        <View style={s.purpleLine} />

        {/* ---- Émetteur / Destinataire ---- */}
        <View style={s.partiesRow}>
          <View style={s.partyBlock}>
            <Text style={s.sectionLabel}>Émetteur</Text>
            <Text style={s.partyName}>{apporteur.full_name || ""}</Text>
            {apporteur.address ? <Text style={s.partyLine}>{apporteur.address}</Text> : null}
            {(apporteur.postal_code || apporteur.city) && (
              <Text style={s.partyLine}>{apporteur.postal_code} {apporteur.city}</Text>
            )}
            {apporteur.country ? <Text style={s.partyLine}>{apporteur.country}</Text> : null}
            {apporteur.phone ? <Text style={s.partyLine}>Tél : {apporteur.phone}</Text> : null}
            {apporteur.email ? <Text style={s.partyLine}>{apporteur.email}</Text> : null}
          </View>
          <View style={s.partyBlock}>
            <Text style={s.sectionLabel}>Destinataire</Text>
            <Text style={s.partyName}>ETHICARENA LLC</Text>
            <Text style={s.partyLine}>Sidali GHALMI</Text>
            <Text style={s.partyLine}>Meydan Grandstand, 6th floor</Text>
            <Text style={s.partyLine}>Meydan Road, Nad Al Sheba</Text>
            <Text style={s.partyLine}>Dubai, United Arab Emirates</Text>
          </View>
        </View>

        {/* ---- Conditions ---- */}
        <View style={s.conditionsBox}>
          <Text style={s.condText}>
            <Text style={s.condBold}>Validité de la facture : </Text>30 jours
          </Text>
          <Text style={s.condText}>
            <Text style={s.condBold}>Conditions de règlement : </Text>
            100% soit {fmt(totalAmount)} euros TTC sous 30 jours à la réception de la facture.
          </Text>
          <Text style={s.condText}>Pas d'escompte en cas de paiement anticipé.</Text>
          <Text style={s.condText}>
            <Text style={s.condBold}>Pénalité en cas de retard de paiement : </Text>
            Taux REFI appliqué par la BCE majoré de 10 points.
          </Text>
          <Text style={s.condText}>
            <Text style={s.condBold}>Indemnités forfaitaires pour frais de recouvrement : </Text>40 euros.
          </Text>
        </View>

        {/* ---- Table ---- */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.cellDesc]}>Description</Text>
          <Text style={[s.thText, s.cellMens]}>Mens.</Text>
          <Text style={[s.thText, s.cellMontant]}>Montant{"\n"}encaissé</Text>
          <Text style={[s.thText, s.cellDate]}>Date paiement</Text>
          <Text style={[s.thText, s.cellComm]}>Commiss.</Text>
          <Text style={[s.thText, s.cellTotal]}>Montant</Text>
        </View>

        {commissionLines.map((l, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <View style={s.cellDesc}>
              <Text style={s.cellText}>Commission de la vente de</Text>
              <Text style={s.clientName}>{l.client_name}</Text>
            </View>
            <Text style={[s.cellText, s.cellMens]}>
              {l.payment_number && l.total_payments
                ? `${l.payment_number}/${l.total_payments}`
                : "-"}
            </Text>
            <Text style={[s.cellText, s.cellMontant]}>{fmt(l.payment_amount)} €</Text>
            <Text style={[s.cellText, s.cellDate]}>{fmtDate(l.payment_date)}</Text>
            <Text style={[s.cellText, s.cellComm]}>{l.commission_percentage}%</Text>
            <Text style={[s.cellText, s.cellTotal]}>{fmt(l.commission_amount)} €</Text>
          </View>
        ))}

        {/* Fixed salary */}
        {fixedSalaryLine && (
          <View style={s.salaryRow} wrap={false}>
            <View style={s.cellDesc}>
              <Text style={s.salaryLabel}>Salaire fixe mensuel</Text>
            </View>
            <Text style={[s.cellText, s.cellMens]}>-</Text>
            <Text style={[s.cellText, s.cellMontant]}>-</Text>
            <Text style={[s.cellText, s.cellDate]}>-</Text>
            <Text style={[s.cellText, s.cellComm]}>-</Text>
            <Text style={[s.cellText, s.cellTotal]}>{fmt(fixedSalaryLine.commission_amount)} €</Text>
          </View>
        )}

        {/* ---- Totals ---- */}
        <View style={s.totalsBlock}>
          <View style={s.totalLine}>
            <Text style={s.totalHtLabel}>Total HT</Text>
            <Text style={s.totalHtValue}>{fmt(totalAmount)} €</Text>
          </View>
          <View style={s.netRow}>
            <Text style={s.netLabel}>Net à payer</Text>
            <Text style={s.netValue}>{fmt(totalAmount)} €</Text>
          </View>
        </View>

        {/* ---- Coordonnées bancaires ---- */}
        {bankDetails && (bankDetails.iban || bankDetails.account_holder) && (
          <View style={s.bankBox} wrap={false}>
            <Text style={s.bankTitle}>Coordonnées bancaires</Text>
            {bankDetails.bank_name && (
              <Text style={s.bankLine}><Text style={s.bankLabel}>Banque : </Text>{bankDetails.bank_name}</Text>
            )}
            {bankDetails.iban && (
              <Text style={s.bankLine}><Text style={s.bankLabel}>IBAN : </Text>{bankDetails.iban.replace(/(.{4})/g, "$1 ").trim()}</Text>
            )}
            {bankDetails.bic && (
              <Text style={s.bankLine}><Text style={s.bankLabel}>BIC : </Text>{bankDetails.bic}</Text>
            )}
          </View>
        )}

        {/* ---- Footer ---- */}
        <Text style={s.footer}>
          {apporteur.full_name}{apporteur.address ? ` • ${apporteur.address}` : ""}{apporteur.postal_code ? ` ${apporteur.postal_code}` : ""}{apporteur.city ? ` ${apporteur.city}` : ""}{"\n"}
          Facture générée automatiquement par Ethicarena
        </Text>
      </Page>
    </Document>
  );
};

export default InvoicePdfDocument;
