import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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

const SEGMENTS = [
  { key: "oneshot", label: "One-shot", color: "#3b82f6" },
  { key: "multi", label: "Plusieurs fois", color: "#f59e0b" },
];

export default function PaymentSplitCard({ oneShotPct, multiPct, oneShotCA, multiCA, oneShotCount, multiCount }: Props) {
  const total = oneShotCount + multiCount;
  const data = [
    { name: "One-shot", value: oneShotCount, ca: oneShotCA, pct: oneShotPct },
    { name: "Plusieurs fois", value: multiCount, ca: multiCA, pct: multiPct },
  ];

  const hasData = total > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Mode de paiement</CardTitle>
        {hasData && (
          <p className="text-xs text-muted-foreground">{total} vente{total > 1 ? "s" : ""} au total</p>
        )}
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune vente enregistrée</p>
        ) : (
          <div className="flex items-center gap-5">
            {/* Donut with center label */}
            <div className="relative w-[120px] h-[120px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                    cornerRadius={3}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={SEGMENTS[i].color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-foreground leading-none">{total}</span>
                <span className="text-[10px] text-muted-foreground">ventes</span>
              </div>
            </div>

            {/* Legend rows */}
            <div className="flex-1 space-y-3">
              {data.map((d, i) => (
                <div key={d.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: SEGMENTS[i].color }} />
                      <span className="text-xs font-medium text-foreground">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{d.pct.toFixed(0)}%</span>
                  </div>
                  <div className="ml-5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{d.value} vente{d.value > 1 ? "s" : ""}</span>
                    <span className="opacity-40">·</span>
                    <span>{fmt(d.ca)}</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="ml-5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${d.pct}%`, background: SEGMENTS[i].color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
