/**
 * Contrat Pass AL BARAKA — tarif conférence 2 000 € (réduction 1 000€).
 * Wording exact : /CONTRAT_PASS_AL_BARAKA_2000_CONFERENCE.txt
 *
 * Strictement identique au Pass standard sauf le bloc "Ton investissement"
 * (prix barré 3000 → 2000) et la mention du montant total dans l'article
 * "Paiement" des conditions importantes (2000 au lieu de 3000).
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

export function ContractPassConference({ data }: Props) {
  return (
    <ContractPage title={`Contrat ALB-PASS-${data.contractNumber}`}>
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

      <Text style={styles.contractTitle}>
        Contrat de prestation — Formule Pass AL BARAKA
      </Text>
      <Text style={styles.contractNumber}>
        N° ALB-PASS-{data.contractNumber}
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

      <GuaranteePass />

      <Section title="Ton investissement">
        <InvestmentBlock
          formulaLabel="Pass AL BARAKA"
          amountTotal={data.amountTotal}
          amountOriginal={data.amountOriginal || 3000}
          discountAmount={data.discountAmount || 1000}
          conferenceDiscount
          paymentModality={data.paymentModality}
          firstPaymentDate={data.firstPaymentDate}
        />
      </Section>

      <EngagementsPass />

      <ConditionsBlock amountTotal={data.amountTotal} />

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
