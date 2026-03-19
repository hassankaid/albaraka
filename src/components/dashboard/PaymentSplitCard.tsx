import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))"];

export default function PaymentSplitCard({ oneShotPct, multiPct, oneShotCA, multiCA, oneShotCount, multiCount }: Props) {
  const total = oneShotCount + multiCount;
  const data = [
    { name: "One-shot", value: oneShotCount, ca: oneShotCA, pct: oneShotPct },
    { name: "Plusieurs fois", value: multiCount, ca: multiCA, pct: multiPct },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Mode de paiement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="w-28 h-28 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={48}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} ventes`, name]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            {data.map((d, i) => (
              <div key={d.name} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-sm text-muted-foreground">{d.name}</span>
                </div>
                <div className="pl-[18px]">
                  <span className="text-sm font-bold text-foreground">{d.pct.toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground ml-1.5">({d.value} ventes · {fmt(d.ca)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {total > 0 && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">{total} ventes au total</p>
        )}
      </CardContent>
    </Card>
  );
}
