import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Scale, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  tresoIn: number;
  tresoOut: number;
  tresoRemaining: number;
  commissionsPaid: number;
  totalSalariesCumul: number;
  totalFixedChargesCumul: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function TreasuryCard({ tresoIn, tresoOut, tresoRemaining, commissionsPaid, totalSalariesCumul, totalFixedChargesCumul }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Trésorerie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Entrées */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ArrowDownLeft className="h-4 w-4 text-[hsl(var(--kpi-paid))]" />
            <span className="text-muted-foreground">Entrées</span>
            <span className="text-[10px] text-muted-foreground/60">(CA collecté)</span>
          </div>
          <span className="font-bold text-[hsl(var(--kpi-paid))]">{fmt(tresoIn)}</span>
        </div>

        {/* Sorties */}
        <div className="space-y-1.5">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">Sorties</span>
              {showDetails ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground/60" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
              )}
            </div>
            <span className="font-bold text-destructive">{fmt(tresoOut)}</span>
          </button>

          {showDetails && (
            <div className="ml-6 space-y-1 border-l-2 border-border pl-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Commissions payées</span>
                <span className="font-medium text-foreground tabular-nums">{fmt(commissionsPaid)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Salaires fixes</span>
                <span className="font-medium text-foreground tabular-nums">{fmt(totalSalariesMensuel)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Charges fixes</span>
                <span className="font-medium text-foreground tabular-nums">{fmt(totalFixedChargesMensuel)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Solde net */}
        <div className="border-t border-border pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Bénéfice net</span>
          </div>
          <span className={`font-bold text-lg ${tresoRemaining >= 0 ? "text-[hsl(var(--kpi-paid))]" : "text-destructive"}`}>
            {fmt(tresoRemaining)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
