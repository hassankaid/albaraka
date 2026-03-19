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
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const SEGMENTS = [
  { label: "One-shot", color: "#3b82f6" },
  { label: "Plusieurs fois", color: "#f59e0b" },
];

export default function PaymentSplitCard({ oneShotPct, multiPct, oneShotCA, multiCA, oneShotCount, multiCount }: Props) {
  const total = oneShotCount + multiCount;
  const data = [
    { name: "One-shot", value: oneShotCount, ca: oneShotCA, pct: oneShotPct },
    { name: "Plusieurs fois", value: multiCount, ca: multiCA, pct: multiPct },
  ];

  const hasData = total > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Mode de paiement</CardTitle>
        {hasData && (
          <p className="text-xs text-muted-foreground">{total} vente{total > 1 ? "s" : ""} au total</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {!hasData ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune vente enregistrée</p>
        ) : (
          <div className="flex flex-col items-center gap-5">
            {/* Donut with center label */}
            <div className="relative w-[140px] h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={62}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-foreground leading-none">{total}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">ventes</span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full space-y-4">
              {data.map((d, i) => (
                <div key={d.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: SEGMENTS[i].color }} />
                      <span className="text-xs font-medium text-foreground">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">{d.pct.toFixed(0)}%</span>
                  </div>
                  <div className="pl-[18px] pr-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${d.pct}%`, background: SEGMENTS[i].color }}
                      />
                    </div>
                  </div>
                  <p className="pl-[18px] text-[11px] text-muted-foreground">
                    {d.value} vente{d.value > 1 ? "s" : ""} · {fmt(d.ca)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
