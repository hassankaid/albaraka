/**
 * Page client `/contract/:contractId` — affichage + signature.
 *
 * Workflow :
 *   1. Si status === "signed" : affiche état signé + bouton téléchargement.
 *   2. Si status === "pending_signature" : preview PDF + canvas signature.
 *      Sur submit : génère le PDF final avec la signature, upload via la
 *      edge function `upload-signed-contract`, redirige vers /training.
 */

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";
import { Download, Loader2, CheckCircle2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isEffectiveApporteur } from "@/lib/access-scope";
import {
  getContractTemplate,
  type ContractData,
  type ContractTemplateKey,
} from "@/pages/contract/templates";
import {
  getSignedContractUrl,
  useContract,
  type ContractRow,
} from "@/hooks/useMyContracts";
import logoAlBaraka from "@/assets/al-baraka-logo-v2.png";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatDateFR(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

function formatDateTimeFR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** Mappe la row BDD (snake_case) vers ContractData (camelCase) attendu par les templates. */
function mapContractRowToData(
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

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function MyContract() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { profile, isLoading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  const { data: contract, isLoading, error, refetch } = useContract(contractId);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [padEmpty, setPadEmpty] = useState(true);
  const sigRef = useRef<SignatureCanvas | null>(null);

  // Redirection post-signature (CEO/collab vs apporteur)
  const trainingTarget = useMemo(() => {
    if (!profile) return "/training";
    return isEffectiveApporteur(profile) ? "/training" : "/dashboard";
  }, [profile]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="mx-auto w-full max-w-[700px] px-4 py-10 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h1 className="text-xl font-semibold text-foreground mb-1">
          Contrat introuvable
        </h1>
        <p className="text-muted-foreground text-sm mb-4">
          Ce contrat n'existe pas ou tu n'es pas autorisé à y accéder.
        </p>
        <Button asChild variant="outline">
          <Link to="/contracts">Voir mes contrats</Link>
        </Button>
      </div>
    );
  }

  // Statut "voided" : on bloque l'accès
  if (contract.status === "voided") {
    return (
      <div className="mx-auto w-full max-w-[700px] px-4 py-10 text-center">
        <h1 className="text-xl font-semibold text-foreground mb-1">
          Contrat annulé
        </h1>
        <p className="text-muted-foreground text-sm">
          Ce contrat a été annulé. Contacte le support si besoin.
        </p>
      </div>
    );
  }

  const Template = getContractTemplate(contract.template_key) as ComponentType<{
    data: ContractData;
  }>;

  /* ── Bouton télécharger PDF signé ─────────────────────────────────────── */
  async function handleDownload() {
    if (!contract?.signed_pdf_path) return;
    try {
      const url = await getSignedContractUrl(contract.signed_pdf_path);
      setDownloadingUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.message ?? "Téléchargement impossible");
    }
  }

  /* ── Submission de la signature ───────────────────────────────────────── */
  async function handleSign() {
    if (!contract) return;
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
      // pdf() accepte un Document; les templates renvoient un PdfDocument.
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
        // L'erreur Supabase wrap parfois un body JSON {error: ...}
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
      await refetch();
      // Petit délai pour que l'utilisateur voie le toast avant la redirection.
      setTimeout(() => navigate(trainingTarget), 800);
    } catch (err: any) {
      console.error("[MyContract] signature error", err);
      toast.error(err?.message ?? "Une erreur est survenue, réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  const isSigned = contract.status === "signed";
  const pdfData = mapContractRowToData(contract);

  return (
    <div className="mx-auto w-full max-w-[700px] px-4 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <header className="text-center space-y-3">
        <img
          src={logoAlBaraka}
          alt="Al Baraka"
          className="h-16 w-auto mx-auto"
        />
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">
            Ton contrat
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSigned
              ? "Ton contrat a bien été signé."
              : "Lis attentivement, puis signe pour activer ta formation."}
          </p>
        </div>
      </header>

      {/* État signé */}
      {isSigned ? (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Contrat signé le {formatDateTimeFR(contract.signed_at)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              N° de contrat&nbsp;: <span className="font-mono">{contract.contract_number}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleDownload}
                disabled={!contract.signed_pdf_path || !!downloadingUrl}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger mon contrat
              </Button>
              <Button asChild>
                <Link to={trainingTarget}>Aller sur ma formation</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Aperçu du contrat */}
          <section className="space-y-2">
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Aperçu du contrat
            </h2>
            <div className="border border-primary/30 rounded-lg overflow-hidden bg-muted/20">
              <PDFViewer
                width="100%"
                height={isMobile ? 480 : 600}
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
        </>
      )}
    </div>
  );
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
