/**
 * Panneau réutilisable de signature d'un contrat client.
 *
 * Deux cas d'usage :
 *   1. Page standalone `/contract/:id` (MyContract) → prop `onSigned` non
 *      fourni, MyContract gère la redirection finale.
 *   2. Intégré dans le wizard /onboarding (étape 1/2) → prop `onSigned`
 *      déclenche le refetch des contrats du parent.
 *
 * Affichage :
 *   - Preview PDF du contrat via @react-pdf/renderer
 *   - Canvas de signature (react-signature-canvas)
 *   - Boutons "Effacer" / "Je signe et valide"
 *
 * Le composant ne gère QUE le cas `pending_signature`. Si le contrat est
 * déjà signé ou voided, c'est au caller de gérer (MyContract affiche
 * l'état signé avec bouton télécharger ; le wizard onboarding ne rend
 * jamais ce composant pour un contrat signé).
 */

import { useEffect, useRef, useState, type ComponentType } from "react";
import { createElement } from "react";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  getContractTemplate,
  type ContractData,
} from "@/pages/contract/templates";
import type { ContractRow } from "@/hooks/useMyContracts";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

export function formatDateFR(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function formatDateTimeFR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** Mappe la row BDD (snake_case) vers ContractData (camelCase) attendu par les templates. */
export function mapContractRowToData(
  row: ContractRow,
  options?: { signatureClientUrl?: string; signedAtIso?: string },
): ContractData {
  return {
    contractNumber: row.contract_number,
    contractDate: formatDateFR(row.created_at),
    clientFirstName: row.client_first_name,
    clientLastName: row.client_last_name,
    clientFullName:
      `${row.client_first_name} ${row.client_last_name}`.trim() || row.client_email,
    clientAddress: row.client_address,
    clientPostalCode: row.client_postal_code,
    clientCity: row.client_city,
    clientCountry: row.client_country,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    amountTotal: Number(row.amount_total),
    amountOriginal: Number(row.amount_original),
    discountAmount: Number(row.discount_amount),
    paymentModality: row.payment_modality,
    installmentsCount: row.installments_count,
    firstPaymentDate: formatDateFR(row.first_payment_date),
    agreements: (row.agreements_snapshot ?? [])
      .filter((agr) => agr.checked)
      .map((agr) => ({
        id: agr.id,
        text: agr.text,
        checked_at: agr.checked_at ? formatDateTimeFR(agr.checked_at) : "",
      })),
    signatureClientUrl: options?.signatureClientUrl,
    signedAt: options?.signedAtIso ? formatDateTimeFR(options.signedAtIso) : undefined,
  };
}

/** Détection mobile basique via media query (recalculé au resize). */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

/** Convertit un Blob en base64 (sans le préfixe data:...;base64,). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}

/** Convertit une data URL (data:image/png;base64,...) en base64 brut. */
function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

/** Best-effort pour extraire un message d'erreur du body retourné par invoke(). */
function tryParseError(body: unknown): string | null {
  try {
    if (typeof body === "string") {
      const parsed = JSON.parse(body);
      return parsed?.error ?? null;
    }
    if (body && typeof body === "object") {
      return (body as any).error ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Composant                                                                 */
/* -------------------------------------------------------------------------- */

export interface ContractSignaturePanelProps {
  contract: ContractRow;
  /**
   * Callback async appelé après la signature réussie (avant le toast de succès
   * côté UI globale). Utilisé par ApporteurOnboarding pour refetch les
   * contrats et passer automatiquement à l'étape 2.
   *
   * Si non fourni, le composant se contente d'afficher le toast et le caller
   * doit gérer la suite (ex: MyContract → redirection vers /training).
   */
  onSigned?: () => Promise<void> | void;
  /** Hauteur compacte du PDFViewer (utile pour l'embedding onboarding). */
  compact?: boolean;
}

export function ContractSignaturePanel({
  contract,
  onSigned,
  compact = false,
}: ContractSignaturePanelProps) {
  const isMobile = useIsMobile();
  const [submitting, setSubmitting] = useState(false);
  const [padEmpty, setPadEmpty] = useState(true);
  const sigRef = useRef<SignatureCanvas | null>(null);

  const Template = getContractTemplate(contract.template_key) as ComponentType<{
    data: ContractData;
  }>;

  const pdfData = mapContractRowToData(contract);

  async function handleSign() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Merci de signer avant de valider");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Capture signature PNG
      const signaturePngDataUrl = sigRef.current
        .getTrimmedCanvas()
        .toDataURL("image/png");
      const signaturePngBase64 = dataUrlToBase64(signaturePngDataUrl);

      // 2. Génère le PDF final avec la signature intégrée
      const nowIso = new Date().toISOString();
      const dataForPdf = mapContractRowToData(contract, {
        signatureClientUrl: signaturePngDataUrl,
        signedAtIso: nowIso,
      });

      const doc = createElement(Template, { data: dataForPdf });
      const blob = await pdf(doc as any).toBlob();
      const signedPdfBase64 = await blobToBase64(blob);

      // 3. Appel edge function (auth obligatoire via supabase.functions.invoke)
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "upload-signed-contract",
        {
          body: {
            contract_id: contract.id,
            signed_pdf_base64: signedPdfBase64,
            signature_png_base64: signaturePngBase64,
          },
        },
      );

      if (fnError) {
        const msg =
          (fnError as any)?.context?.body
            ? tryParseError((fnError as any).context.body)
            : null;
        throw new Error(msg ?? fnError.message ?? "Signature impossible");
      }
      if ((result as any)?.error) {
        throw new Error((result as any).error);
      }

      toast.success("Contrat signé. Bienvenue dans la formation !");
      if (onSigned) {
        await onSigned();
      }
    } catch (err: any) {
      console.error("[ContractSignaturePanel] signature error", err);
      toast.error(err?.message ?? "Une erreur est survenue, réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  const pdfHeight = compact ? (isMobile ? 380 : 460) : isMobile ? 480 : 600;

  return (
    <div className="space-y-6">
      {/* Aperçu du contrat */}
      <section className="space-y-2">
        <h2 className="text-lg font-heading font-semibold text-foreground">
          Aperçu du contrat
        </h2>
        <div className="border border-primary/30 rounded-lg overflow-hidden bg-muted/20">
          <PDFViewer
            width="100%"
            height={pdfHeight}
            showToolbar={false}
            style={{ border: "none" }}
          >
            <Template data={pdfData} />
          </PDFViewer>
        </div>
        <p className="text-xs text-muted-foreground italic">
          Le contrat sera daté et complété avec ta signature dès que tu valides ci-dessous.
        </p>
      </section>

      {/* Signature */}
      <section className="space-y-3">
        <h2 className="text-lg font-heading font-semibold text-foreground">
          Signe ici
        </h2>
        <div className="rounded-lg border border-primary/30 bg-[#F5F2EB] p-2">
          <SignatureCanvas
            ref={(ref) => {
              sigRef.current = ref;
            }}
            penColor="#C9A04E"
            onBegin={() => setPadEmpty(false)}
            onEnd={() => setPadEmpty(sigRef.current?.isEmpty() ?? true)}
            canvasProps={{
              className: "w-full h-[200px] rounded bg-[#F5F2EB] touch-none",
              style: { width: "100%", height: 200 },
            }}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => {
              sigRef.current?.clear();
              setPadEmpty(true);
            }}
          >
            Effacer
          </Button>
          <Button
            type="button"
            disabled={padEmpty || submitting}
            onClick={handleSign}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signature en cours…
              </>
            ) : (
              "Je signe et valide"
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground italic">
          En validant, tu reconnais avoir lu le contrat et tu acceptes ses
          conditions. Une copie signée te sera envoyée par email.
        </p>
      </section>
    </div>
  );
}
