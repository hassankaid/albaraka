/**
 * Contrat Pass AL BARAKA — tarif standard 3 000 €.
 * Wording exact : /CONTRAT_PASS_AL_BARAKA_3000.txt
 */

import { Text } from "@react-pdf/renderer";
import {
  BulletList,
  ConditionsBlock,
  ConfirmationBlock,
  ContractPage,
  EngagementsPass,
  GuaranteePass,
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

export function ContractPassStandard({ data }: Props) {
  return (
    <ContractPage title={`Contrat ALB-PASS-${data.contractNumber}`}>
      {/* Bienvenue */}
      <Section>
        <Text style={styles.welcomeTitle}>
          Bienvenue dans l'Écosystème AL BARAKA
        </Text>
        <Text style={styles.welcomeBody}>
          Félicitations pour ta décision. En rejoignant l'Écosystème AL BARAKA,
          tu intègres une communauté de musulmans ambitieux qui ont décidé de
          prendre leur avenir en main. Ce document formalise notre engagement
          mutuel et récapitule tout ce à quoi tu as désormais accès.
        </Text>
        <Text style={styles.separator}>• • •</Text>
      </Section>

      {/* Titre */}
      <Text style={styles.contractTitle}>
        Contrat de prestation — Formule Pass AL BARAKA
      </Text>
      <Text style={styles.contractNumber}>
        N° ALB-PASS-{data.contractNumber}
      </Text>

      {/* Parties */}
      <PartiesBlock
        clientFullName={data.clientFullName}
        clientAddress={data.clientAddress}
        clientPostalCode={data.clientPostalCode}
        clientCity={data.clientCity}
        clientCountry={data.clientCountry}
        clientEmail={data.clientEmail}
        clientPhone={data.clientPhone}
      />

      {/* Inclusions */}
      <ObjetContrat programme="AL BARAKA" />

      <Section title="Ce que tu reçois avec le Pass AL BARAKA">
        <BulletList
          items={[
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Programme : </Text>
              un accès au programme Pass AL BARAKA
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Plateforme : </Text>
              un accès à vie à la plateforme AL BARAKA, incluant tous les outils
              d'intelligence artificielle
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Accompagnement et consulting :{" "}
              </Text>
              4 sessions d'accompagnement en groupe par semaine
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Communauté : </Text>
              un accès au groupe privé AL BARAKA Family
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Outils : </Text>
              Scripts, templates et ressources téléchargeables
            </Text>,
          ]}
        />
      </Section>

      {/* Garantie */}
      <GuaranteePass />

      {/* Investissement */}
      <Section title="Ton investissement">
        <InvestmentBlock
          formulaLabel="Pass AL BARAKA"
          amountTotal={data.amountTotal}
          paymentModality={data.paymentModality}
          firstPaymentDate={data.firstPaymentDate}
        />
      </Section>

      {/* Engagements mutuels */}
      <EngagementsPass />

      {/* Conditions importantes */}
      <ConditionsBlock amountTotal={data.amountTotal} />

      {/* Confirmation */}
      <ConfirmationBlock agreements={data.agreements} />

      {/* Signatures */}
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
