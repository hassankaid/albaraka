/**
 * Contrat Liberty — tarif standard 5 000 €.
 * Wording exact : /CONTRAT_LIBERTY_5000.txt
 */

import { Text } from "@react-pdf/renderer";
import {
  BulletList,
  ConditionsBlock,
  ConfirmationBlock,
  ContractPage,
  EngagementsLiberty,
  GuaranteeLiberty,
  InvestmentBlock,
  ObjetContrat,
  PartiesBlock,
  Section,
  SignatureBlock,
  styles,
} from "./ContractBase";
import type { ContractData } from "./ContractTypes";

interface Props {
  data: ContractData;
}

export function ContractLibertyStandard({ data }: Props) {
  return (
    <ContractPage title={`Contrat ALB-LIB-${data.contractNumber}`}>
      <Section>
        <Text style={styles.welcomeTitle}>
          Bienvenue dans l'Écosystème AL BARAKA
        </Text>
        <Text style={styles.welcomeBody}>
          Félicitations pour ta décision. En rejoignant l'Écosystème AL BARAKA
          avec la formule LIBERTY, tu accèdes à l'accompagnement le plus complet
          de notre écosystème. Ce document formalise notre engagement mutuel et
          récapitule tout ce à quoi tu as désormais accès.
        </Text>
        <Text style={styles.separator}>• • •</Text>
      </Section>

      <Text style={styles.contractTitle}>
        Contrat de prestation — Formule Liberty
      </Text>
      <Text style={styles.contractNumber}>
        N° ALB-LIB-{data.contractNumber}
      </Text>

      <PartiesBlock
        clientFullName={data.clientFullName}
        clientAddress={data.clientAddress}
        clientPostalCode={data.clientPostalCode}
        clientCity={data.clientCity}
        clientCountry={data.clientCountry}
        clientEmail={data.clientEmail}
        clientPhone={data.clientPhone}
      />

      <ObjetContrat programme="Liberty" />

      <Section title="Ce que tu reçois avec la formule LIBERTY">
        <BulletList
          items={[
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Programme : </Text>
              un accès au programme LIBERTY, l'accompagnement le plus complet de
              l'écosystème
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Plateforme : </Text>
              un accès à vie à la plateforme AL BARAKA, incluant tous les outils
              d'intelligence artificielle
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Accompagnement et consulting premium :{" "}
              </Text>
              4 sessions d'accompagnement en groupe par semaine + review
              personnalisée de tes offres, scripts et pages de vente
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Communauté : </Text>
              un accès au groupe privé AL BARAKA Family
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Bonus exclusif LIBERTY :{" "}
              </Text>
              accès automatique et gratuit à tous les futurs modules
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Outils : </Text>
              Scripts, templates et ressources téléchargeables
            </Text>,
          ]}
        />
      </Section>

      <GuaranteeLiberty />

      <Section title="Ton investissement">
        <InvestmentBlock
          formulaLabel="Formule Liberty"
          amountTotal={data.amountTotal}
          paymentModality={data.paymentModality}
          firstPaymentDate={data.firstPaymentDate}
        />
      </Section>

      <EngagementsLiberty />

      <ConditionsBlock amountTotal={data.amountTotal} libertyDurationExtra />

      <ConfirmationBlock agreements={data.agreements} />

      <SignatureBlock
        clientFullName={data.clientFullName}
        contractDate={data.contractDate}
        signedAt={data.signedAt}
        signatureEthicaArenaUrl={data.signatureEthicaArenaUrl}
        signatureClientUrl={data.signatureClientUrl}
      />
    </ContractPage>
  );
}
