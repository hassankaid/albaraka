import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
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

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export default function TreasuryCard({ tresoIn, tresoOut, tresoRemaining, commissionsPaid, totalSalariesCumul, totalFixedChargesCumul }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const isPositive = tresoRemaining >= 0;
  const margin = tresoIn > 0 ? ((tresoRemaining / tresoIn) * 100).toFixed(1) : "0.0";

  const outbreakItems = [
    { label: "Commissions", amount: commissionsPaid, color: "bg-orange-400" },
    { label: "Salaires", amount: totalSalariesCumul, color: "bg-blue-400" },
    { label: "Charges fixes", amount: totalFixedChargesCumul, color: "bg-violet-400" },
  ];

  return (
    <Card className="h-full overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Hero section - Bénéfice net */}
        <div className={`px-5 pt-5 pb-4 ${isPositive ? "bg-[hsl(var(--kpi-paid)/0.06)]" : "bg-destructive/5"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bénéfice net</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isPositive ? "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))]" : "bg-destructive/15 text-destructive"}`}>
              {isPositive ? "+" : ""}{margin}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-[hsl(var(--kpi-paid))] flex-shrink-0 self-center" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0 self-center" />
            )}
            <span className={`text-2xl font-bold tabular-nums ${isPositive ? "text-[hsl(var(--kpi-paid))]" : "text-destructive"}`}>
              {fmt(tresoRemaining)}
            </span>
          </div>
        </div>

        <CardContent className="flex-1 p-5 flex flex-col justify-between gap-4">
          {/* Entrées / Sorties */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[hsl(var(--kpi-paid)/0.12)] flex items-center justify-center">
                  <ArrowDownLeft className="h-4 w-4 text-[hsl(var(--kpi-paid))]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Entrées</p>
                  <p className="text-[10px] text-muted-foreground">CA collecté</p>
                </div>
              </div>
              <span className="text-sm font-bold text-foreground tabular-nums">{fmt(tresoIn)}</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-between w-full group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">Sorties</p>
                    <p className="text-[10px] text-muted-foreground">
                      {showDetails ? "Masquer" : "Voir"} le détail
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">{fmt(tresoOut)}</span>
              </button>

              {showDetails && (
                <div className="space-y-2 pl-[42px]">
                  {outbreakItems.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          <span className="text-[11px] text-muted-foreground">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground tabular-nums">{pct(item.amount, tresoOut)}%</span>
                          <span className="text-xs font-medium text-foreground tabular-nums">{fmt(item.amount)}</span>
                        </div>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all`}
                          style={{ width: `${pct(item.amount, tresoOut)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Visual bar: in vs out */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Entrées vs Sorties</span>
              <span>{tresoIn > 0 ? pct(tresoOut, tresoIn) : 0}% dépensé</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-[hsl(var(--kpi-paid))] transition-all rounded-l-full"
                style={{ width: `${tresoIn > 0 ? Math.min(100, pct(tresoIn - tresoOut, tresoIn)) : 0}%` }}
              />
              <div
                className="h-full bg-destructive/70 transition-all rounded-r-full"
                style={{ width: `${tresoIn > 0 ? Math.min(100, pct(tresoOut, tresoIn)) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--kpi-paid))]" />
                <span className="text-muted-foreground">Net</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive/70" />
                <span className="text-muted-foreground">Dépensé</span>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
