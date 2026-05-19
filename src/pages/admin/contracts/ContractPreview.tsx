/**
 * Aperçu PDF des 4 templates de contrat (CEO uniquement).
 * Route : /admin/contracts/preview/:templateKey
 *
 * Permet d'itérer rapidement sur la mise en page sans devoir générer
 * un PDF côté backend. Utilise <PDFViewer> qui rend en iframe.
 */

import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PDFViewer } from "@react-pdf/renderer";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  CONTRACT_TEMPLATE_LABELS,
  getContractTemplate,
  type ContractData,
  type ContractTemplateKey,
} from "@/pages/contract/templates";

/** Mock data réaliste pour itérer sur la mise en page. */
function buildMockData(key: ContractTemplateKey): ContractData {
  const isConference =
    key === "pass_conference" || key === "liberty_conference";
  const isLiberty =
    key === "liberty_standard" || key === "liberty_conference";

  const amounts: Record<ContractTemplateKey, number> = {
    pass_standard: 3000,
    pass_conference: 2000,
    liberty_standard: 5000,
    liberty_conference: 4000,
  };
  const originals: Record<ContractTemplateKey, number> = {
    pass_standard: 3000,
    pass_conference: 3000,
    liberty_standard: 5000,
    liberty_conference: 5000,
  };

  const amountTotal = amounts[key];
  const amountOriginal = originals[key];
  const discountAmount = isConference ? 1000 : 0;
  const formuleLabel = isLiberty ? "PASS LIBERTY" : "PASS AL BARAKA";

  const installments = 5;
  const installmentAmount = amountTotal / installments;
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(installmentAmount);

  return {
    contractNumber: "2026-05-0042",
    contractDate: "19/05/2026",
    clientFirstName: "Yacine",
    clientLastName: "BENMANSOUR",
    clientFullName: "Yacine BENMANSOUR",
    clientAddress: "12 rue des Lilas",
    clientPostalCode: "75019",
    clientCity: "Paris",
    clientCountry: "France",
    clientEmail: "yacine.benmansour@example.com",
    clientPhone: "+33 6 12 34 56 78",
    amountTotal,
    amountOriginal,
    discountAmount,
    paymentModality: `${installments} × ${formatted} €`,
    installmentsCount: installments,
    firstPaymentDate: "19/05/2026",
    agreements: [
      {
        id: "formule_understood",
        text: `J'ai bien pris connaissance de ma formule ${formuleLabel} et de tout ce qui est inclus.`,
        checked_at: "19/05/2026 14:30",
      },
      {
        id: "garantie_understood",
        text: "J'ai bien compris les conditions de la garantie de continuité d'accompagnement.",
        checked_at: "19/05/2026 14:30",
      },
      {
        id: "immediate_access",
        text: "Je souhaite accéder immédiatement à la plateforme et je comprends les conditions qui en découlent.",
        checked_at: "19/05/2026 14:31",
      },
      {
        id: "payment_commitment",
        text: "Je m'engage à honorer l'intégralité de mon paiement selon la modalité convenue.",
        checked_at: "19/05/2026 14:31",
      },
      {
        id: "confidentiality",
        text: "Je m'engage à respecter la confidentialité des contenus de l'écosystème.",
        checked_at: "19/05/2026 14:32",
      },
    ],
    signatureEthicaArenaUrl: undefined,
    signatureClientUrl: undefined,
    signedAt: undefined,
  };
}

const TEMPLATE_KEYS: ContractTemplateKey[] = [
  "pass_standard",
  "pass_conference",
  "liberty_standard",
  "liberty_conference",
];

export default function ContractPreview() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ templateKey?: string }>();

  // Détection du template depuis l'URL (avec fallback)
  const rawKey = (params.templateKey ?? "pass_standard") as ContractTemplateKey;
  const initialKey: ContractTemplateKey = TEMPLATE_KEYS.includes(rawKey)
    ? rawKey
    : "pass_standard";

  const [signed, setSigned] = useState(false);

  // Garde CEO
  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  const Template = useMemo(() => getContractTemplate(initialKey), [initialKey]);

  const data = useMemo<ContractData>(() => {
    const base = buildMockData(initialKey);
    if (signed) {
      return {
        ...base,
        signedAt: "19/05/2026 14:35",
        // Signature client simulée via data URI SVG transparente
        signatureClientUrl:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><path d="M5,40 Q40,5 70,30 T140,25 T190,40" fill="none" stroke="#0A0908" stroke-width="2"/></svg>`,
          ),
      };
    }
    return base;
  }, [initialKey, signed]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Aperçu Contrat PDF
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Visualisation des templates de contrat avec données mock.
          </p>
        </div>
        <Button
          variant={signed ? "default" : "outline"}
          onClick={() => setSigned((s) => !s)}
        >
          {signed ? "Mode signé" : "Mode non signé"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TEMPLATE_KEYS.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={key === initialKey ? "default" : "outline"}
            onClick={() => navigate(`/admin/contracts/preview/${key}`)}
          >
            {CONTRACT_TEMPLATE_LABELS[key]}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden bg-muted/30">
        <PDFViewer
          width="100%"
          height={900}
          showToolbar
          style={{ border: "none" }}
        >
          <Template data={data} />
        </PDFViewer>
      </div>
    </div>
  );
}
