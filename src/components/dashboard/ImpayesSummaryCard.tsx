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
  impayesCA: number;
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

export default function ImpayesSummaryCard({ tauxImpayes, salesLateCount, salesLostCount, salesPaidCount, salesInProgressCount, impayesCA }: Props) {
  const total = salesLateCount + salesLostCount + salesPaidCount + salesInProgressCount;
  const impayesCount = salesLateCount + salesLostCount;

  const counts = [salesPaidCount, salesInProgressCount, salesLateCount, salesLostCount];
  const data = SEGMENTS.map((s, i) => ({ name: s.label, value: counts[i] })).filter((d) => d.value > 0);

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
      <CardContent className="pt-0">
        <div className="flex items-center gap-5">
          {/* Donut */}
          <div className="relative w-[120px] h-[120px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={54}
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
              <span className="text-xl font-bold text-foreground leading-none">{total}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">ventes</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {SEGMENTS.map((s, i) => {
              const count = counts[i];
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-xs text-foreground font-medium">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground tabular-nums">{count}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="ml-[18px] h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
