/**
 * Page `/contract` ou `/contracts` — landing pour les contrats du client.
 *
 * Comportements :
 *   - Aucun contrat visible : message "Tu n'as pas de contrat".
 *   - 1 seul contrat : redirige automatiquement vers /contract/:id.
 *   - 2+ contrats : liste avec lien vers chacun + status + date.
 */

import { Link, Navigate } from "react-router-dom";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMyContracts, type ContractRow } from "@/hooks/useMyContracts";

const STATUS_LABEL: Record<ContractRow["status"], string> = {
  pending_signature: "À signer",
  signed: "Signé",
  voided: "Annulé",
};

function formatDateFR(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function ContractLandingPage() {
  const { data, isLoading, error } = useMyContracts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[700px] px-4 py-10 text-center">
        <p className="text-sm text-destructive">
          Erreur lors du chargement de tes contrats. Réessaie.
        </p>
      </div>
    );
  }

  const contracts = data ?? [];

  if (contracts.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[700px] px-4 py-10 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h1 className="text-xl font-semibold text-foreground mb-1">
          Tu n'as pas de contrat
        </h1>
        <p className="text-muted-foreground text-sm">
          Aucun contrat n'est associé à ton compte pour le moment.
        </p>
      </div>
    );
  }

  // 1 seul contrat → redirect directement vers la page de ce contrat
  if (contracts.length === 1) {
    return <Navigate to={`/contract/${contracts[0].id}`} replace />;
  }

  return (
    <div className="mx-auto w-full max-w-[700px] px-4 py-6 sm:py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">
          Mes contrats
        </h1>
        <p className="text-muted-foreground text-sm">
          Retrouve tous tes contrats Ethicarena.
        </p>
      </header>

      <div className="space-y-3">
        {contracts.map((contract) => {
          const isSigned = contract.status === "signed";
          return (
            <Card key={contract.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="flex items-start justify-between gap-3 pt-5">
                <div className="space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {contract.contract_number}
                  </p>
                  <p className="font-semibold text-foreground">
                    {contract.client_first_name} {contract.client_last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Créé le {formatDateFR(contract.created_at)}
                    {isSigned
                      ? ` • signé le ${formatDateFR(contract.signed_at)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border " +
                      (isSigned
                        ? "border-primary/40 text-primary"
                        : "border-amber-500/40 text-amber-600 dark:text-amber-400")
                    }
                  >
                    {isSigned ? <CheckCircle2 className="h-3 w-3" /> : null}
                    {STATUS_LABEL[contract.status]}
                  </span>
                  <Button asChild size="sm" variant={isSigned ? "outline" : "default"}>
                    <Link to={`/contract/${contract.id}`}>
                      {isSigned ? "Consulter" : "Signer"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
