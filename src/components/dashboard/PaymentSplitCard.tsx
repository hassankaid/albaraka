import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  oneShotPct: number;
  multiPct: number;
  oneShotCA: number;
  multiCA: number;
  oneShotCount: number;
  multiCount: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function PaymentSplitCard({ oneShotPct, multiPct, oneShotCA, multiCA, oneShotCount, multiCount }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Mode de paiement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {oneShotPct > 0 && (
            <div className="bg-primary transition-all" style={{ width: `${oneShotPct}%` }} />
          )}
          {multiPct > 0 && (
            <div className="bg-accent transition-all" style={{ width: `${multiPct}%` }} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="text-muted-foreground">One-shot</span>
            </div>
            <p className="font-bold text-foreground">{oneShotPct.toFixed(0)}% <span className="text-xs text-muted-foreground font-normal">({oneShotCount})</span></p>
            <p className="text-xs text-muted-foreground">{fmt(oneShotCA)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-muted-foreground">Plusieurs fois</span>
            </div>
            <p className="font-bold text-foreground">{multiPct.toFixed(0)}% <span className="text-xs text-muted-foreground font-normal">({multiCount})</span></p>
            <p className="text-xs text-muted-foreground">{fmt(multiCA)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
