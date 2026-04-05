import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const purple = "#6d28d9";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a2e",
  },
  /* Header */
  header: {
    marginBottom: 30,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: purple,
  },
  invoiceNumber: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  dateLine: {
    fontSize: 10,
    color: "#666",
    marginTop: 6,
  },
  /* Parties */
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
    marginBottom: 24,
  },
  partyBlock: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#999",
    marginBottom: 6,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 10,
    color: "#444",
    marginBottom: 1,
  },
  /* Table */
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f0ff",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    textTransform: "uppercase",
    color: purple,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: "1 solid #eee",
  },
  tableCell: {
    fontSize: 10,
    color: "#1a1a2e",
  },
  /* Column widths */
  colClient: { width: "25%" },
  colMontant: { width: "20%" },
  colDate: { width: "20%" },
  colPourcent: { width: "15%" },
  colCommission: { width: "20%", textAlign: "right" },
  /* Fixed salary */
  fixedSalaryRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#f0fdf4",
    borderBottom: "1 solid #eee",
  },
  fixedSalaryLabel: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#1a1a2e",
  },
  /* Total */
  totalRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#f9fafb",
    marginTop: 2,
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a2e",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a2e",
    textAlign: "right",
  },
  /* Bank info */
  bankBox: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 6,
    marginTop: 20,
  },
  bankLine: {
    fontSize: 9,
    color: "#444",
    marginBottom: 3,
  },
  bankLabel: {
    fontWeight: "bold",
  },
  /* Footer */
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("fr-FR");
  } catch {
    return d;
  }
};

export interface InvoicePdfLine {
  client_name: string;
  payment_amount: number;
  payment_date: string;
  commission_percentage: number;
  commission_amount: number;
  sale_id: string | null;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  month: number;
  year: number;
  totalAmount: number;
  apporteur: {
    full_name?: string;
    address?: string;
    postal_code?: string;
    city?: string;
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

const InvoicePdfDocument = ({ data }: { data: InvoicePdfData }) => {
  const { invoiceNumber, month, year, totalAmount, apporteur, bankDetails, lines } = data;
  const commissionLines = lines.filter((l) => l.sale_id !== null);
  const fixedSalaryLine = lines.find((l) => l.sale_id === null);
  const hasCommissions = commissionLines.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.invoiceTitle}>FACTURE</Text>
          <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
          <Text style={styles.dateLine}>
            Date : {new Date().toLocaleDateString("fr-FR")}
          </Text>
          <Text style={styles.dateLine}>
            Periode : {monthNames[month - 1]} {year}
          </Text>
        </View>

        {/* Emetteur / Destinataire */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.sectionLabel}>Emetteur</Text>
            <Text style={styles.partyName}>{apporteur.full_name || ""}</Text>
            {apporteur.address ? <Text style={styles.partyDetail}>{apporteur.address}</Text> : null}
            {(apporteur.postal_code || apporteur.city) ? (
              <Text style={styles.partyDetail}>
                {apporteur.postal_code || ""} {apporteur.city || ""}
              </Text>
            ) : null}
            {apporteur.siret ? (
              <Text style={styles.partyDetail}>SIRET : {apporteur.siret}</Text>
            ) : null}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.sectionLabel}>Destinataire</Text>
            <Text style={styles.partyName}>ETHICARENA</Text>
          </View>
        </View>

        {/* Commission table */}
        {hasCommissions && (
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colClient]}>Client</Text>
              <Text style={[styles.tableHeaderCell, styles.colMontant]}>Montant encaisse</Text>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>Date paiement</Text>
              <Text style={[styles.tableHeaderCell, styles.colPourcent]}>% Commission</Text>
              <Text style={[styles.tableHeaderCell, styles.colCommission]}>Montant commission</Text>
            </View>
            {commissionLines.map((l, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colClient]}>{l.client_name}</Text>
                <Text style={[styles.tableCell, styles.colMontant]}>{fmt(l.payment_amount)} EUR</Text>
                <Text style={[styles.tableCell, styles.colDate]}>{fmtDate(l.payment_date)}</Text>
                <Text style={[styles.tableCell, styles.colPourcent]}>{l.commission_percentage}%</Text>
                <Text style={[styles.tableCell, styles.colCommission]}>{fmt(l.commission_amount)} EUR</Text>
              </View>
            ))}
          </View>
        )}

        {/* Fixed salary */}
        {fixedSalaryLine && (
          <View style={styles.fixedSalaryRow}>
            <Text style={[styles.fixedSalaryLabel, { width: hasCommissions ? "80%" : "50%" }]}>
              Salaire fixe mensuel
            </Text>
            <Text style={[styles.tableCell, { width: hasCommissions ? "20%" : "50%", textAlign: "right" }]}>
              {fmt(fixedSalaryLine.commission_amount)} EUR
            </Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { width: hasCommissions ? "80%" : "50%" }]}>TOTAL</Text>
          <Text style={[styles.totalValue, { width: hasCommissions ? "20%" : "50%" }]}>
            {fmt(totalAmount)} EUR
          </Text>
        </View>

        {/* Bank details */}
        {bankDetails && (bankDetails.iban || bankDetails.account_holder) && (
          <View style={styles.bankBox}>
            <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Coordonnees bancaires</Text>
            {bankDetails.account_holder && (
              <Text style={styles.bankLine}>
                <Text style={styles.bankLabel}>Titulaire : </Text>
                {bankDetails.account_holder}
              </Text>
            )}
            {bankDetails.iban && (
              <Text style={styles.bankLine}>
                <Text style={styles.bankLabel}>IBAN : </Text>
                {bankDetails.iban.replace(/(.{4})/g, "$1 ").trim()}
              </Text>
            )}
            {bankDetails.bic && (
              <Text style={styles.bankLine}>
                <Text style={styles.bankLabel}>BIC : </Text>
                {bankDetails.bic}
              </Text>
            )}
            {bankDetails.bank_name && (
              <Text style={styles.bankLine}>
                <Text style={styles.bankLabel}>Banque : </Text>
                {bankDetails.bank_name}
              </Text>
            )}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          TVA non applicable, article 293 B du CGI. — Facture generee automatiquement par Ethicarena.
        </Text>
      </Page>
    </Document>
  );
};

export default InvoicePdfDocument;
