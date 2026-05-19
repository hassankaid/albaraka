/**
 * Page client `/contract/:contractId` — affichage + signature.
 *
 * Workflow :
 *   1. Si status === "signed" : affiche état signé + bouton téléchargement.
 *   2. Si status === "pending_signature" : délègue au composant
 *      <ContractSignaturePanel /> (réutilisé aussi dans /onboarding).
 *      Après signature : redirige vers /training (apporteur) ou /dashboard.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Download, Loader2, CheckCircle2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { isEffectiveApporteur } from "@/lib/access-scope";
import { getSignedContractUrl, useContract } from "@/hooks/useMyContracts";
import {
  ContractSignaturePanel,
  formatDateTimeFR,
} from "@/pages/contract/ContractSignaturePanel";
import logoAlBaraka from "@/assets/al-baraka-logo-v2.png";

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function MyContract() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { profile, isLoading: authLoading } = useAuth();

  const { data: contract, isLoading, error, refetch } = useContract(contractId);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

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

  /* ── Render ───────────────────────────────────────────────────────────── */

  const isSigned = contract.status === "signed";

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
        <ContractSignaturePanel
          contract={contract}
          onSigned={async () => {
            await refetch();
            // Petit délai pour que l'utilisateur voie le toast avant la redirection.
            setTimeout(() => navigate(trainingTarget), 800);
          }}
        />
      )}
    </div>
  );
}
