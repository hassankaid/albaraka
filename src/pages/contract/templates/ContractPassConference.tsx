/**
 * Contrat Pass AL BARAKA — tarif conférence 2 000 € (réduction 1 000€).
 * Wording exact : /CONTRAT_PASS_AL_BARAKA_2000_CONFERENCE.txt
 *
 * Strictement identique au Pass standard sauf le bloc "Ton investissement"
 * (prix barré 3000 → 2000) et la mention du montant total dans l'article
 * "Paiement" des conditions importantes (2000 au lieu de 3000).
 */

import { Text, View } from "@react-pdf/renderer";
import {
  BulletList,
  ConditionsBlock,
  ConfirmationBlock,
  ContractPage,
  EngagementsPass,
  GuaranteePass,
  InvestmentBlock,
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

      <Section title="Ce que tu reçois avec le Pass AL BARAKA">
        <Text style={styles.sectionLead}>
          Six formations complètes pour acquérir les compétences essentielles :
        </Text>
        <BulletList
          items={[
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Personal Branding
              </Text>{" "}
              — Construire une image crédible et professionnelle
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Storytelling</Text>{" "}
              — Communiquer avec émotion et authenticité
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Marketing Digital
              </Text>{" "}
              — Attirer des prospects et développer ta visibilité
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Community Management
              </Text>{" "}
              — Animer et faire grandir ta communauté en ligne
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Setting</Text> —
              Prospecter, qualifier et engager la conversation
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Closing</Text> —
              Vendre des offres haut de gamme avec éthique
            </Text>,
          ]}
        />
        <View style={{ marginTop: 4 }}>
          <BulletList
            items={[
              <Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Bonus offert :{" "}
                </Text>
                ESTIMACTION — Programme estime de soi et confiance (15H de
                contenu)
              </Text>,
              <Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Formations complémentaires incluses :{" "}
                </Text>
                Muslim Mindset + Module Administratif
              </Text>,
              <Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Accompagnement :{" "}
                </Text>
                4 sessions de coaching de groupe par semaine
              </Text>,
              <Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Communauté :{" "}
                </Text>
                Accès au groupe privé AL BARAKA
              </Text>,
              <Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Plateforme :{" "}
                </Text>
                Accès à vie à la plateforme AL BARAKA
              </Text>,
              <Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Outils : </Text>
                Scripts, templates et ressources téléchargeables
              </Text>,
            ]}
          />
        </View>
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
