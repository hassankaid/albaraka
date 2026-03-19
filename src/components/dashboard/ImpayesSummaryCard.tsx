import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Props {
  tauxImpayes: number;
  salesLateCount: number;
  salesLostCount: number;
  salesPaidCount: number;
  salesInProgressCount: number;
  impayesCA: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function ImpayesSummaryCard({ tauxImpayes, salesLateCount, salesLostCount, salesPaidCount, salesInProgressCount, impayesCA }: Props) {
  const total = salesLateCount + salesLostCount + salesPaidCount + salesInProgressCount;
  const impayesCount = salesLateCount + salesLostCount;

  const segments = [
    { label: "Payé", count: salesPaidCount, color: "bg-emerald-500", pct: total > 0 ? (salesPaidCount / total) * 100 : 0 },
    { label: "En cours", count: salesInProgressCount, color: "bg-blue-500", pct: total > 0 ? (salesInProgressCount / total) * 100 : 0 },
    { label: "En retard", count: salesLateCount, color: "bg-amber-500", pct: total > 0 ? (salesLateCount / total) * 100 : 0 },
    { label: "Perdu", count: salesLostCount, color: "bg-destructive", pct: total > 0 ? (salesLostCount / total) * 100 : 0 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Taux d'impayés
          </span>
          <Badge variant={tauxImpayes > 15 ? "destructive" : "secondary"} className="text-xs font-bold">
            {tauxImpayes.toFixed(1)}%
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {impayesCount} impayé{impayesCount > 1 ? "s" : ""} · {fmt(impayesCA)} à risque
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Stacked bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {segments.map((s) =>
            s.pct > 0 ? <div key={s.label} className={`${s.color} transition-all`} style={{ width: `${s.pct}%` }} /> : null
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${s.color}`} />
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
              <span className="text-xs text-foreground font-semibold ml-auto tabular-nums">{s.count}</span>
            </div>
          ))}
        </div>

        {/* Big center stat */}
        <div className="text-center pt-1">
          <p className="text-3xl font-bold text-foreground tabular-nums">{tauxImpayes.toFixed(1)}%</p>
          <p className="text-[11px] text-muted-foreground">d'impayés sur {total} vente{total > 1 ? "s" : ""}</p>
        </div>
      </CardContent>
    </Card>
  );
}
