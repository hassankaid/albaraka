/**
 * Composants et styles partagés pour les contrats PDF Albaraka.
 *
 * Stack : @react-pdf/renderer v4.
 * Polices : Helvetica (body) + Times-Roman (headings). À terme on pourra
 * embarquer Cormorant Garamond depuis Supabase Storage via Font.register().
 */

import { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Document as PdfDocument,
  Page as PdfPage,
} from "@react-pdf/renderer";

/* -------------------------------------------------------------------------- */
/*  Palette                                                                   */
/* -------------------------------------------------------------------------- */

export const COLORS = {
  gold: "#C9A04E",
  goldDark: "#A67F2E",
  dark: "#0A0908",
  body: "#1F1B16",
  muted: "#6B645B",
  cream: "#F5F2EB",
  border: "#D7CFC0",
  white: "#FFFFFF",
};

/* -------------------------------------------------------------------------- */
/*  StyleSheet                                                                */
/* -------------------------------------------------------------------------- */

export const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 56, // place pour le footer fixe
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: COLORS.body,
    lineHeight: 1.45,
    backgroundColor: COLORS.white,
  },

  // En-tête : bandeau gold avec "ETHICARENA — ÉCOSYSTÈME AL BARAKA"
  headerBar: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.gold,
    paddingBottom: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerBrand: {
    fontFamily: "Times-Roman",
    fontSize: 13,
    color: COLORS.dark,
    letterSpacing: 1.5,
  },
  headerSub: {
    fontFamily: "Times-Italic",
    fontSize: 9,
    color: COLORS.goldDark,
    letterSpacing: 1,
  },

  // Section "Bienvenue"
  welcomeTitle: {
    fontFamily: "Times-Roman",
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 4,
  },
  welcomeBody: {
    fontSize: 9.5,
    color: COLORS.body,
    textAlign: "justify",
    marginBottom: 6,
  },
  separator: {
    textAlign: "center",
    color: COLORS.gold,
    letterSpacing: 4,
    marginVertical: 6,
    fontSize: 9,
  },

  // Titre principal
  contractTitle: {
    fontFamily: "Times-Roman",
    fontSize: 13,
    color: COLORS.dark,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 4,
    marginBottom: 2,
  },
  contractNumber: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 9,
    color: COLORS.goldDark,
    textAlign: "center",
    marginBottom: 10,
  },

  // Parties
  partiesBlock: {
    backgroundColor: COLORS.cream,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.gold,
    padding: 8,
    marginBottom: 10,
    fontSize: 9,
  },
  partiesText: {
    textAlign: "justify",
    marginBottom: 4,
  },

  // Sections
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Times-Roman",
    fontSize: 11.5,
    color: COLORS.dark,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.gold,
    paddingBottom: 2,
  },
  sectionLead: {
    fontSize: 9.5,
    marginBottom: 3,
    color: COLORS.body,
  },

  // Listes
  bullet: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 4,
  },
  bulletDot: {
    color: COLORS.gold,
    marginRight: 4,
    fontSize: 9.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    textAlign: "justify",
  },

  // Investissement
  investBox: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 2,
    padding: 8,
    marginBottom: 8,
  },
  investFormula: {
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    color: COLORS.dark,
    marginBottom: 2,
  },
  investPrice: {
    fontFamily: "Times-Roman",
    fontSize: 14,
    color: COLORS.goldDark,
    marginBottom: 2,
  },
  investPriceStrike: {
    textDecoration: "line-through",
    color: COLORS.muted,
    fontSize: 11,
  },
  investDiscountNote: {
    fontSize: 8.5,
    fontStyle: "italic",
    color: COLORS.muted,
    marginBottom: 3,
  },
  investLine: {
    fontSize: 9,
    marginBottom: 2,
  },

  // Garantie
  guaranteeBox: {
    backgroundColor: "#FAF6EC",
    borderWidth: 0.5,
    borderColor: COLORS.gold,
    padding: 8,
    marginBottom: 8,
  },
  guaranteeLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLORS.goldDark,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  guaranteeBody: {
    fontSize: 8.5,
    textAlign: "justify",
    marginBottom: 3,
  },

  // Conditions importantes (chaque article)
  conditionBlock: {
    marginBottom: 4,
    fontSize: 8.5,
    textAlign: "justify",
  },
  conditionTerm: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.dark,
  },

  // Confirmation / cases cochées
  agreementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  agreementCheck: {
    color: COLORS.gold,
    fontSize: 11,
    marginRight: 5,
    marginTop: -1,
  },
  agreementText: {
    flex: 1,
    fontSize: 8.5,
    textAlign: "justify",
  },
  agreementTime: {
    fontSize: 7,
    color: COLORS.muted,
    marginLeft: 6,
    fontStyle: "italic",
  },

  // Signatures
  signatureGrid: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  signatureCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: 8,
    minHeight: 110,
  },
  signatureLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLORS.dark,
    marginBottom: 2,
  },
  signatureSubLabel: {
    fontSize: 8,
    fontStyle: "italic",
    color: COLORS.muted,
    marginBottom: 6,
  },
  signatureImg: {
    height: 50,
    width: "auto",
    maxWidth: 140,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureEthicaText: {
    fontFamily: "Times-Italic",
    fontSize: 14,
    color: COLORS.goldDark,
    marginBottom: 4,
  },
  signaturePlaceholder: {
    height: 50,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  signaturePlaceholderText: {
    fontSize: 8,
    color: COLORS.muted,
    fontStyle: "italic",
  },
  signatureMention: {
    fontSize: 7.5,
    color: COLORS.muted,
    fontStyle: "italic",
    marginBottom: 2,
  },
  signatureDate: {
    fontSize: 8,
    color: COLORS.body,
    marginTop: "auto",
  },

  // Footer fixe en bas de page
  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.gold,
    paddingTop: 6,
    textAlign: "center",
    fontSize: 7,
    color: COLORS.muted,
    lineHeight: 1.3,
  },
  footerTagline: {
    fontFamily: "Times-Italic",
    fontSize: 7.5,
    color: COLORS.goldDark,
    marginTop: 2,
  },
});

/* -------------------------------------------------------------------------- */
/*  Helpers de formatage                                                      */
/* -------------------------------------------------------------------------- */

/** Format un nombre en euros français : 3000 → "3 000,00 € TTC"
 *
 * Note importante : `Intl.NumberFormat("fr-FR")` retourne des caractères
 * espace exotiques (NBSP ` ` ou NNBSP ` ` selon la version ICU)
 * comme séparateurs de milliers et avant le €. Or les fonts natifs de
 * @react-pdf/renderer (Helvetica / Times-Roman) ne couvrent pas ces
 * caractères Unicode — résultat : un `/` ou un glyphe bizarre apparaît
 * dans le PDF rendu (cf. test E2E Hassan 19/05/2026).
 *
 * Fix : on remplace tout whitespace non-ASCII par un espace standard
 * (U+0020) après formatage. Visuellement identique, et 100% supporté
 * par toutes les fonts.
 */
export function formatEUR(amount: number, withTtc = true): string {
  const raw = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  // Remplace NBSP ( ) et NNBSP ( ) par espace ASCII standard.
  const formatted = raw.replace(/[  ]/g, " ");
  return withTtc ? `${formatted} € TTC` : `${formatted} €`;
}

/* -------------------------------------------------------------------------- */
/*  Composants utilitaires                                                    */
/* -------------------------------------------------------------------------- */

export function Section({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section} wrap={false}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function Condition({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <Text style={styles.conditionBlock}>
      <Text style={styles.conditionTerm}>{term} </Text>
      {children}
    </Text>
  );
}

/* -------------------------------------------------------------------------- */
/*  En-tête                                                                   */
/* -------------------------------------------------------------------------- */

export function ContractHeader() {
  return (
    <View style={styles.headerBar} fixed>
      <Text style={styles.headerBrand}>ETHICARENA</Text>
      <Text style={styles.headerSub}>ÉCOSYSTÈME AL BARAKA</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bloc parties                                                              */
/* -------------------------------------------------------------------------- */

interface PartiesBlockProps {
  clientFullName: string;
  clientAddress: string;
  clientPostalCode: string;
  clientCity: string;
  clientCountry: string;
  clientEmail: string;
  clientPhone: string;
}

export function PartiesBlock({
  clientFullName,
  clientAddress,
  clientPostalCode,
  clientCity,
  clientCountry,
  clientEmail,
  clientPhone,
}: PartiesBlockProps) {
  const adresseComplete = [
    clientAddress,
    [clientPostalCode, clientCity].filter(Boolean).join(" "),
    clientCountry,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.partiesBlock}>
      <Text style={styles.partiesText}>
        Entre{" "}
        <Text style={{ fontFamily: "Helvetica-Bold" }}>Ethicarena L.L.C-FZ</Text>
        , société à responsabilité limitée immatriculée auprès de la Meydan Free
        Zone (Dubaï, Émirats Arabes Unis), licence n° 2422583.01, dont le siège
        social est situé au Meydan Grandstand, 6th floor, Meydan Road, Nad Al
        Sheba, Dubai, U.A.E. («&nbsp;le Prestataire&nbsp;»)
      </Text>
      <Text style={styles.partiesText}>
        et{" "}
        <Text style={{ fontFamily: "Helvetica-Bold" }}>{clientFullName}</Text>{" "}
        («&nbsp;le Client&nbsp;»), résidant à {adresseComplete}
      </Text>
      <Text style={styles.partiesText}>
        Email&nbsp;: {clientEmail} • Téléphone&nbsp;: {clientPhone}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bloc investissement                                                       */
/* -------------------------------------------------------------------------- */

interface InvestmentBlockProps {
  formulaLabel: string;
  amountTotal: number;
  amountOriginal?: number; // si défini → mode conférence (prix barré)
  discountAmount?: number;
  conferenceDiscount?: boolean;
  paymentModality: string;
  firstPaymentDate: string;
}

export function InvestmentBlock({
  formulaLabel,
  amountTotal,
  amountOriginal,
  discountAmount,
  conferenceDiscount,
  paymentModality,
  firstPaymentDate,
}: InvestmentBlockProps) {
  return (
    <View style={styles.investBox} wrap={false}>
      <Text style={styles.investFormula}>
        {formulaLabel}
        {conferenceDiscount ? " — TARIF CONFÉRENCE" : ""}
      </Text>

      {conferenceDiscount && amountOriginal ? (
        <Text style={styles.investPrice}>
          <Text style={styles.investPriceStrike}>
            {formatEUR(amountOriginal, false)}
          </Text>
          {"   →   "}
          {formatEUR(amountTotal)}
        </Text>
      ) : (
        <Text style={styles.investPrice}>{formatEUR(amountTotal)}</Text>
      )}

      {conferenceDiscount && discountAmount ? (
        <Text style={styles.investDiscountNote}>
          Réduction de {discountAmount}€ appliquée (inscription en conférence)
        </Text>
      ) : null}

      <Text style={styles.investLine}>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>
          Modalité de paiement :{" "}
        </Text>
        {paymentModality}
      </Text>
      <Text style={styles.investLine}>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>
          Date du premier paiement :{" "}
        </Text>
        {firstPaymentDate}
      </Text>
      <Text
        style={{
          fontSize: 8,
          fontStyle: "italic",
          color: COLORS.muted,
          marginTop: 3,
        }}
      >
        La TVA n'est pas applicable (société établie en zone franche aux
        Émirats Arabes Unis).
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bloc confirmation (cases cochées)                                         */
/* -------------------------------------------------------------------------- */

interface ConfirmationBlockProps {
  agreements: { id: string; text: string; checked_at: string }[];
}

export function ConfirmationBlock({ agreements }: ConfirmationBlockProps) {
  return (
    <Section title="Confirmation">
      <Text style={{ fontSize: 8.5, marginBottom: 4, color: COLORS.muted }}>
        Cases validées par le Client avant paiement :
      </Text>
      {agreements.map((agr) => (
        <View key={agr.id} style={styles.agreementRow}>
          <Text style={styles.agreementCheck}>☑</Text>
          <Text style={styles.agreementText}>{agr.text}</Text>
          <Text style={styles.agreementTime}>{agr.checked_at}</Text>
        </View>
      ))}
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bloc signatures                                                           */
/* -------------------------------------------------------------------------- */

interface SignatureBlockProps {
  clientFullName: string;
  contractDate: string;
  signedAt?: string;
  signatureEthicaArenaUrl?: string;
  signatureClientUrl?: string;
}

export function SignatureBlock({
  clientFullName,
  contractDate,
  signedAt,
  signatureEthicaArenaUrl,
  signatureClientUrl,
}: SignatureBlockProps) {
  const ethicaDate = signedAt ?? contractDate;
  const clientDate = signedAt ?? "—";

  return (
    <View style={styles.signatureGrid} wrap={false}>
      {/* Gauche : Ethicarena */}
      <View style={styles.signatureCell}>
        <Text style={styles.signatureLabel}>Pour Ethicarena L.L.C-FZ</Text>
        <Text style={styles.signatureSubLabel}>Signé électroniquement</Text>
        {signatureEthicaArenaUrl ? (
          <Image src={signatureEthicaArenaUrl} style={styles.signatureImg} />
        ) : (
          <Text style={styles.signatureEthicaText}>Ethicarena L.L.C-FZ</Text>
        )}
        <Text style={styles.signatureDate}>Date : {ethicaDate}</Text>
      </View>

      {/* Droite : Client */}
      <View style={styles.signatureCell}>
        <Text style={styles.signatureLabel}>Le Client</Text>
        <Text style={styles.signatureSubLabel}>{clientFullName}</Text>
        {signatureClientUrl ? (
          <Image src={signatureClientUrl} style={styles.signatureImg} />
        ) : (
          <View style={styles.signaturePlaceholder}>
            <Text style={styles.signaturePlaceholderText}>
              Signature à apposer
            </Text>
          </View>
        )}
        <Text style={styles.signatureMention}>
          Mention «&nbsp;Lu et approuvé&nbsp;»
        </Text>
        <Text style={styles.signatureDate}>Date : {clientDate}</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer (fixe)                                                             */
/* -------------------------------------------------------------------------- */

export function ContractFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Ethicarena L.L.C-FZ — Écosystème AL BARAKA • Meydan Grandstand, 6th
        floor, Meydan Road, Nad Al Sheba, Dubai, U.A.E.
      </Text>
      <Text>
        Licence n° 2422583.01 • Meydan Free Zone • contact@ethicarena.com
      </Text>
      <Text style={styles.footerTagline}>
        Gagne ta liberté. Garde ta foi. C'est ça la vraie baraka.
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page wrapper                                                              */
/* -------------------------------------------------------------------------- */

export function ContractPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <PdfDocument title={title} author="Ethicarena L.L.C-FZ">
      <PdfPage size="A4" style={styles.page}>
        <ContractHeader />
        {children}
        <ContractFooter />
      </PdfPage>
    </PdfDocument>
  );
}

/* -------------------------------------------------------------------------- */
/*  Conditions importantes (commun aux 4 templates)                           */
/* -------------------------------------------------------------------------- */

/**
 * Bloc "Conditions importantes" — quasi identique entre Pass et Liberty,
 * seule la mention du montant total dans l'article "Paiement" diffère.
 * Liberty ajoute une phrase sur l'accès à vie aux futures formations dans
 * l'article "Durée".
 */
export function ConditionsBlock({
  amountTotal,
  libertyDurationExtra,
}: {
  amountTotal: number;
  libertyDurationExtra?: boolean;
}) {
  return (
    <Section title="Conditions importantes">
      <Condition term="Accès immédiat.">
        Ton accès à la plateforme et aux formations est activé dès la signature
        de ce contrat. Conformément à l'article L.221-28 du Code de la
        consommation, cet accès immédiat à des contenus numériques entraîne la
        renonciation au délai de rétractation de 14 jours. Aucun remboursement
        ne pourra donc être demandé après activation de l'accès.
      </Condition>
      <Condition term="Paiement.">
        Si tu as choisi un paiement en plusieurs fois, tu restes engagé sur la
        totalité du montant ({formatEUR(amountTotal, false)}). Il ne s'agit pas
        d'un abonnement mais d'une facilité de paiement. En cas d'échéance
        impayée, une mise en demeure te sera adressée par email. Si l'échéance
        n'est pas régularisée dans un délai de quinze (15) jours suivant cette
        mise en demeure, l'accès à la plateforme et aux services
        d'accompagnement pourra être suspendu, et une indemnité forfaitaire de
        50€ par échéance impayée pourra s'appliquer au titre des frais de
        gestion. Le Prestataire se réserve également le droit d'exiger le
        paiement immédiat du solde restant dû et d'engager toute procédure de
        recouvrement, les frais afférents étant à la charge du Client.
      </Condition>
      <Condition term="Propriété intellectuelle.">
        Tous les contenus de l'écosystème (vidéos, scripts, documents, outils)
        sont la propriété exclusive d'Ethicarena L.L.C-FZ. Tu bénéficies d'un
        droit d'utilisation personnel et non cessible.
      </Condition>
      <Condition term="Règles de vie.">
        En cas de non-respect du règlement de la communauté, de comportement
        contraire à nos valeurs, ou de diffusion non autorisée des contenus,
        l'accès pourra être suspendu ou supprimé, l'obligation de paiement
        restant due.
      </Condition>
      <Condition term="Durée.">
        L'accès aux contenus de formation sur la plateforme AL BARAKA est
        accordé à vie.{" "}
        {libertyDurationExtra
          ? "L'accès aux sessions de coaching de groupe, aux reviews personnalisées et à la communauté privée est accordé pour une durée illimitée, sous réserve du règlement complet du prix et du respect des conditions du présent contrat. L'accès aux futures formations ajoutées à l'écosystème est également garanti à vie."
          : "L'accès aux sessions de coaching de groupe et à la communauté privée est également accordé pour une durée illimitée, sous réserve du règlement complet du prix et du respect des conditions du présent contrat."}
      </Condition>
      <Condition term="Données personnelles.">
        Tes données sont traitées conformément au RGPD et utilisées uniquement
        pour la gestion de ton accès et la communication liée à l'écosystème.
        Tu peux exercer tes droits en écrivant à contact@ethicarena.com.
      </Condition>
      <Condition term="Force majeure.">
        Le Prestataire ne pourra être tenu responsable en cas d'impossibilité
        temporaire d'accès à la plateforme ou aux services résultant d'un
        événement échappant à son contrôle (panne technique majeure,
        cyberattaque, catastrophe naturelle ou tout autre cas de force majeure
        au sens de l'article 1218 du Code civil). Le Prestataire s'engage à
        rétablir l'accès dans les meilleurs délais.
      </Condition>
      <Condition term="Droit applicable.">
        Conformément au Règlement (CE) n° 593/2008 (Rome I), les Parties
        conviennent expressément de soumettre le présent contrat au droit
        français, et notamment aux dispositions du Code de la consommation
        applicables aux contrats conclus à distance. En cas de litige, les
        Parties s'engagent à rechercher une résolution amiable dans un délai de
        trente (30) jours. À défaut d'accord amiable, tout différend sera
        soumis aux tribunaux compétents français. Le Client peut également
        recourir à la médiation de la consommation.
      </Condition>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Engagements mutuels (Pass)                                                */
/* -------------------------------------------------------------------------- */

export function EngagementsPass() {
  return (
    <Section title="Nos engagements mutuels">
      <Text style={styles.sectionLead}>
        Ce que nous nous engageons à te fournir :
      </Text>
      <BulletList
        items={[
          "Un accès fonctionnel et sécurisé à la plateforme AL BARAKA",
          "Les six formations et le programme ESTIMACTION dans leur intégralité",
          "Quatre sessions de coaching de groupe par semaine",
          "Un espace communautaire actif et bienveillant",
          "La garantie de continuité d'accompagnement (voir conditions ci-dessus)",
          "La protection de tes données personnelles conformément au RGPD",
        ]}
      />
      <Text
        style={{
          fontSize: 8.5,
          fontStyle: "italic",
          color: COLORS.muted,
          marginTop: 3,
          marginBottom: 4,
          textAlign: "justify",
        }}
      >
        Notre accompagnement est une obligation de moyens, à l'exception de la
        garantie de continuité d'accompagnement dont les conditions sont
        précisées ci-dessus.
      </Text>
      <Text style={styles.sectionLead}>Ce que nous attendons de toi :</Text>
      <BulletList
        items={[
          "T'investir sérieusement dans ton parcours et participer aux coachings",
          "Respecter la communauté et adopter un comportement bienveillant",
          "Honorer l'intégralité de tes échéances de paiement",
          "Garder confidentiels les contenus, stratégies et ressources de l'écosystème",
          "Ne pas reproduire, diffuser ou revendre les contenus de la plateforme",
        ]}
      />
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Engagements mutuels (Liberty)                                             */
/* -------------------------------------------------------------------------- */

export function EngagementsLiberty() {
  return (
    <Section title="Nos engagements mutuels">
      <Text style={styles.sectionLead}>
        Ce que nous nous engageons à te fournir :
      </Text>
      <BulletList
        items={[
          "Un accès fonctionnel et sécurisé à la plateforme AL BARAKA",
          "L'ensemble des neuf formations, le programme ESTIMACTION et les formations complémentaires",
          "Quatre sessions de coaching de groupe par semaine",
          "Les reviews personnalisées de tes travaux dans un délai raisonnable",
          "L'accès aux futures formations ajoutées à l'écosystème, sans surcoût",
          "Un espace communautaire actif et bienveillant",
          "La garantie de continuité d'accompagnement (voir conditions ci-dessus)",
          "La protection de tes données personnelles conformément au RGPD",
        ]}
      />
      <Text
        style={{
          fontSize: 8.5,
          fontStyle: "italic",
          color: COLORS.muted,
          marginTop: 3,
          marginBottom: 4,
          textAlign: "justify",
        }}
      >
        Notre accompagnement est une obligation de moyens, à l'exception de la
        garantie de continuité d'accompagnement dont les conditions sont
        précisées ci-dessus.
      </Text>
      <Text style={styles.sectionLead}>Ce que nous attendons de toi :</Text>
      <BulletList
        items={[
          "T'investir sérieusement dans ton parcours et participer aux coachings",
          "Soumettre tes travaux pour review dans un format exploitable",
          "Respecter la communauté et adopter un comportement bienveillant",
          "Honorer l'intégralité de tes échéances de paiement",
          "Garder confidentiels les contenus, stratégies et ressources de l'écosystème",
          "Ne pas reproduire, diffuser ou revendre les contenus de la plateforme",
        ]}
      />
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Garantie Pass (90j / 3000€)                                              */
/* -------------------------------------------------------------------------- */

export function GuaranteePass() {
  return (
    <Section title="Notre garantie">
      <View style={styles.guaranteeBox}>
        <Text style={styles.guaranteeLabel}>
          GARANTIE DE CONTINUITÉ D'ACCOMPAGNEMENT
        </Text>
        <Text style={styles.guaranteeBody}>
          Si, à l'issue d'une période de quatre-vingt-dix (90) jours suivant la
          fin de ton parcours de formation, tu n'as pas généré au moins
          3&nbsp;000€ de chiffre d'affaires grâce aux compétences acquises, le
          Prestataire s'engage à poursuivre ton accompagnement (coaching de
          groupe et accès à la communauté) jusqu'à l'obtention de ce résultat,
          sans frais supplémentaires.
        </Text>
        <Text style={styles.guaranteeBody}>
          Cette garantie est conditionnée à la participation active du Client
          aux sessions de coaching, à la mise en application des stratégies
          enseignées et au règlement complet du prix de la formule. Le Client
          devra être en mesure de justifier de ses efforts et actions réalisées
          au cours des 90 jours (participation aux coachings, contenus créés,
          actions de prospection effectuées).
        </Text>
      </View>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Garantie Liberty (6 mois / 25 000€)                                       */
/* -------------------------------------------------------------------------- */

export function GuaranteeLiberty() {
  return (
    <Section title="Notre garantie">
      <View style={styles.guaranteeBox}>
        <Text style={styles.guaranteeLabel}>
          GARANTIE DE CONTINUITÉ D'ACCOMPAGNEMENT
        </Text>
        <Text style={styles.guaranteeBody}>
          Si, à l'issue d'une période de six (6) mois d'application stricte des
          process et stratégies enseignés, tu n'as pas généré au moins
          25&nbsp;000€ de chiffre d'affaires, le Prestataire s'engage à
          poursuivre ton accompagnement (coaching de groupe, reviews
          personnalisées et accès à la communauté) jusqu'à l'obtention de ce
          résultat, sans frais supplémentaires.
        </Text>
        <Text style={styles.guaranteeBody}>
          Cette garantie est conditionnée à l'application stricte et rigoureuse
          des process, stratégies et méthodologies enseignés pendant les six
          (6) mois, à la participation active aux sessions de coaching et au
          règlement complet du prix de la formule. Le Client devra être en
          mesure de justifier de la mise en œuvre concrète des process
          (participation aux coachings, contenus créés, offres lancées, actions
          de prospection, campagnes publicitaires menées).
        </Text>
      </View>
    </Section>
  );
}
