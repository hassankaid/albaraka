import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SaleItem {
  id: string;
  amount_ht: number;
  payment_status: string | null;
  product: string;
}

interface Props {
  tauxImpayes: number;
  salesLate: SaleItem[];
  salesLost: SaleItem[];
  salesPaid: SaleItem[];
  salesInProgress: SaleItem[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function ImpayesCard({ tauxImpayes, salesLate, salesLost, salesPaid, salesInProgress }: Props) {
  const total = salesLate.length + salesLost.length + salesPaid.length + salesInProgress.length;

  const segments = [
    { label: "Payé", count: salesPaid.length, color: "bg-emerald-500", pct: total > 0 ? (salesPaid.length / total) * 100 : 0 },
    { label: "En cours", count: salesInProgress.length, color: "bg-blue-500", pct: total > 0 ? (salesInProgress.length / total) * 100 : 0 },
    { label: "En retard", count: salesLate.length, color: "bg-amber-500", pct: total > 0 ? (salesLate.length / total) * 100 : 0 },
    { label: "Perdu", count: salesLost.length, color: "bg-destructive", pct: total > 0 ? (salesLost.length / total) * 100 : 0 },
  ];

  const impayesList = [...salesLate, ...salesLost].slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          Taux d'impayés
          <Badge variant={tauxImpayes > 15 ? "destructive" : "secondary"} className="text-xs">
            {tauxImpayes.toFixed(1)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {segments.map((s) =>
            s.pct > 0 ? <div key={s.label} className={`${s.color} transition-all`} style={{ width: `${s.pct}%` }} /> : null
          )}
        </div>

        <div className="grid grid-cols-4 gap-1 text-xs">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${s.color}`} />
              <span className="text-muted-foreground">{s.label} ({s.count})</span>
            </div>
          ))}
        </div>

        {impayesList.length > 0 && (
          <div className="border-t border-border pt-2 space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Impayés récents</p>
            {impayesList.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate">{s.product}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fmt(s.amount_ht)}</span>
                  <Badge variant={s.payment_status === "lost" ? "destructive" : "outline"} className="text-[10px] px-1.5 py-0">
                    {s.payment_status === "lost" ? "Perdu" : "Retard"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
