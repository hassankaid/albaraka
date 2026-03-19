import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const SEGMENTS = [
  { key: "paid", label: "Payé", color: "#10b981" },
  { key: "in_progress", label: "En cours", color: "#3b82f6" },
  { key: "late", label: "En retard", color: "#f59e0b" },
  { key: "lost", label: "Perdu", color: "#ef4444" },
];

export default function ImpayesSummaryCard({ tauxImpayes, salesLateCount, salesLostCount, salesPaidCount, salesInProgressCount, lateCA, lostCA }: Props) {
  const total = salesLateCount + salesLostCount + salesPaidCount + salesInProgressCount;
  const counts = [salesPaidCount, salesInProgressCount, salesLateCount, salesLostCount];
  const data = SEGMENTS.map((s, i) => ({ name: s.label, value: counts[i] })).filter((d) => d.value > 0);

  return (
    <Card className="flex flex-col">
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
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative w-[110px] h-[110px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  cornerRadius={3}
                >
                  {data.map((entry) => {
                    const seg = SEGMENTS.find((s) => s.label === entry.name);
                    return <Cell key={entry.name} fill={seg?.color || "#888"} />;
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-foreground leading-none">{total}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">ventes</span>
            </div>
          </div>

          {/* Legend compact */}
          <div className="flex-1 space-y-1.5">
            {SEGMENTS.map((s, i) => {
              const count = counts[i];
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={s.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[11px] text-muted-foreground">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground tabular-nums">{count}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: à risque vs en perte */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg px-3 py-2 bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">À risque</p>
            <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{fmt(lateCA)}</p>
            <p className="text-[10px] text-muted-foreground">{salesLateCount} vente{salesLateCount > 1 ? "s" : ""} en retard</p>
          </div>
          <div className="rounded-lg px-3 py-2 bg-red-500/15 border border-red-500/30">
            <p className="text-[10px] font-medium text-red-400 uppercase tracking-wide">En perte</p>
            <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{fmt(lostCA)}</p>
            <p className="text-[10px] text-muted-foreground">{salesLostCount} vente{salesLostCount > 1 ? "s" : ""} perdue{salesLostCount > 1 ? "s" : ""}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
