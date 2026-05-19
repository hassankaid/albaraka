/**
 * Contrat Liberty — tarif standard 5 000 €.
 * Wording exact : /CONTRAT_LIBERTY_5000.txt
 */

import { Text, View } from "@react-pdf/renderer";
import {
  BulletList,
  ConditionsBlock,
  ConfirmationBlock,
  ContractPage,
  EngagementsLiberty,
  GuaranteeLiberty,
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

      <Section title="Ce que tu reçois avec la formule LIBERTY">
        <Text style={styles.sectionLead}>
          Neuf formations complètes — l'accès le plus complet de l'écosystème :
        </Text>
        <Text
          style={{
            fontSize: 9,
            fontStyle: "italic",
            marginTop: 2,
            marginBottom: 2,
          }}
        >
          Les six formations du parcours terrain :
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
        <Text
          style={{
            fontSize: 9,
            fontStyle: "italic",
            marginTop: 4,
            marginBottom: 2,
          }}
        >
          Les trois formations exclusives LIBERTY :
        </Text>
        <BulletList
          items={[
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Offer Creation
              </Text>{" "}
              — Création d'offre, proposition de valeur, pricing stratégique
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Copywriting</Text>{" "}
              — Rédaction persuasive, pages de vente, séquences emails
            </Text>,
            <Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Media Buying</Text>{" "}
              — Publicité Meta Ads, ciblage, scaling des campagnes
            </Text>,
          ]}
        />
        <View style={{ marginTop: 4 }}>
          <BulletList
            items={[
              <Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Bonus inclus :{" "}
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
                  Accompagnement premium :{" "}
                </Text>
                4 sessions de coaching de groupe par semaine + review
                personnalisée de tes offres, scripts et pages de vente
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
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Bonus exclusif LIBERTY :{" "}
                </Text>
                Accès automatique et gratuit à toutes les futures formations
              </Text>,
              <Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Outils : </Text>
                Scripts, templates et ressources téléchargeables liés à
                l'ensemble des formations
              </Text>,
            ]}
          />
        </View>
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
