import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  tauxImpayes: number;
  salesLateCount: number;
  salesLostCount: number;
  salesPaidCount: number;
  salesInProgressCount: number;
  lateCA: number;
  lostCA: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ImpayesSummaryCard({
  tauxImpayes,
  salesLateCount,
  salesLostCount,
  salesPaidCount,
  salesInProgressCount,
  lateCA,
  lostCA,
}: Props) {
  const total = salesLateCount + salesLostCount + salesPaidCount + salesInProgressCount;

  const segments = [
    { key: "paid", label: "Payé", count: salesPaidCount, color: "hsl(var(--kpi-paid))" },
    { key: "in_progress", label: "En cours", count: salesInProgressCount, color: "hsl(var(--kpi-in-progress))" },
    { key: "late", label: "En retard", count: salesLateCount, color: "hsl(var(--kpi-late))" },
    { key: "lost", label: "Perdu", count: salesLostCount, color: "hsl(var(--kpi-lost))" },
  ].map((segment) => ({
    ...segment,
    pct: total > 0 ? (segment.count / total) * 100 : 0,
  }));

  const chartData = segments.filter((segment) => segment.count > 0).map((segment) => ({
    name: segment.label,
    value: segment.count,
    color: segment.color,
  }));

  const impayesCount = salesLateCount + salesLostCount;

  return (
    <Card className="h-full overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="px-5 pt-4 pb-3 border-b border-border/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--kpi-late))]" />
              <span className="text-sm font-semibold text-foreground">Taux d'impayés</span>
            </div>
            <Badge variant={tauxImpayes > 15 ? "destructive" : "secondary"} className="text-xs font-bold">
              {tauxImpayes.toFixed(1)}%
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {impayesCount} impayé{impayesCount > 1 ? "s" : ""} (retard + perdu) sur {total} vente{total > 1 ? "s" : ""}
          </p>
        </div>

        <CardContent className="flex-1 p-5 grid grid-rows-[1fr_auto] gap-4">
          <div className="grid grid-cols-[156px_1fr] items-center gap-4 min-h-0">
            <div className="relative h-[142px] w-[142px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={66}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground leading-none tabular-nums">{total}</span>
                <span className="text-[11px] text-muted-foreground">ventes</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 content-center">
              {segments.map((segment) => (
                <div key={segment.key} className="rounded-lg border border-border/70 bg-muted/35 px-2.5 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: segment.color }} />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{segment.label}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold text-foreground tabular-nums block leading-none">{segment.count}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{segment.pct.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border px-3 py-2.5 bg-[hsl(var(--kpi-late)/0.14)] border-[hsl(var(--kpi-late)/0.38)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--kpi-late))]">À risque</p>
              <p className="mt-1 text-base font-bold text-foreground tabular-nums">{fmt(lateCA)}</p>
              <p className="text-[11px] text-muted-foreground">{salesLateCount} vente{salesLateCount > 1 ? "s" : ""} en retard</p>
            </div>

            <div className="rounded-lg border px-3 py-2.5 bg-[hsl(var(--kpi-lost)/0.2)] border-[hsl(var(--kpi-lost)/0.5)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--kpi-lost))]">En perte</p>
              <p className="mt-1 text-base font-bold text-foreground tabular-nums">{fmt(lostCA)}</p>
              <p className="text-[11px] text-muted-foreground">{salesLostCount} vente{salesLostCount > 1 ? "s" : ""} perdue{salesLostCount > 1 ? "s" : ""}</p>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
