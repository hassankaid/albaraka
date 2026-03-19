import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { User, TrendingUp, BarChart3 } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  sale_id: string | null;
  payment_number: number;
  total_payments: number;
}

interface ContactInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_normalized: string | null;
}

interface SaleInfo {
  id: string;
  product: string;
  contact_id: string;
  amount_ht: number;
}

interface Props {
  data: { month: string; amount: number }[];
  payments?: Payment[];
  contactMap?: Map<string, ContactInfo>;
  sales?: SaleInfo[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtShort(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]" },
  pending: { label: "En attente", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  late: { label: "En retard", className: "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]" },
  lost: { label: "Perdu", className: "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]" },
};

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[11px] text-muted-foreground capitalize">{label}</p>
      <p className="text-sm font-bold text-foreground">{fmtShort(payload[0].value)}</p>
    </div>
  );
}

export default function MRRChart({ data, payments = [], contactMap = new Map(), sales = [] }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const chartData = data.map((d) => ({
    ...d,
    label: format(parse(d.month, "yyyy-MM", new Date()), "MMM yy", { locale: fr }),
  }));

  const saleMap = new Map(sales.map((s) => [s.id, s]));

  // KPI stats for header
  const stats = useMemo(() => {
    if (chartData.length === 0) return { current: 0, previous: 0, trend: 0, avg: 0 };
    const current = chartData[chartData.length - 1]?.amount || 0;
    const previous = chartData.length > 1 ? chartData[chartData.length - 2]?.amount || 0 : 0;
    const trend = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const avg = chartData.reduce((s, d) => s + d.amount, 0) / chartData.length;
    return { current, previous, trend, avg };
  }, [chartData]);

  // Payments for the selected month
  const allMonthPayments = selectedMonth
    ? payments
        .filter((p) => p.status !== "lost" && p.total_payments > 1 && p.due_date.startsWith(selectedMonth))
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
    : [];

  const monthPayments = statusFilter
    ? allMonthPayments.filter((p) => p.status === statusFilter)
    : allMonthPayments;

  const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);
  const monthLabel = selectedMonth
    ? format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy", { locale: fr })
    : "";

  return (
    <>
      <Card className="col-span-full overflow-hidden">
        {/* Header with KPI stats */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[hsl(var(--gradient-from))] to-[hsl(var(--gradient-to))] flex items-center justify-center">
              <BarChart3 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">MRR – Revenus récurrents</h3>
              <p className="text-[11px] text-muted-foreground">Projection des paiements multi-mensualités</p>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dernier mois</p>
                <p className="text-lg font-bold text-foreground">{fmtShort(stats.current)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Moyenne</p>
                <p className="text-lg font-bold text-muted-foreground">{fmtShort(stats.avg)}</p>
              </div>
              {stats.trend !== 0 && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${
                  stats.trend > 0
                    ? "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))]"
                    : "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))]"
                }`}>
                  <TrendingUp className={`h-3 w-3 ${stats.trend < 0 ? "rotate-180" : ""}`} />
                  {stats.trend > 0 ? "+" : ""}{stats.trend.toFixed(0)}%
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart */}
        <CardContent className="px-3 pb-4 pt-0">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune donnée de paiement récurrent</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} barCategoryGap="18%">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--gradient-from))" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(var(--gradient-to))" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} strokeOpacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                  dx={-4}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.15)", radius: 6 }} />
                <Bar
                  dataKey="amount"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  className="cursor-pointer"
                  onClick={(_data: any, index: number) => {
                    const entry = chartData[index];
                    if (entry?.month) setSelectedMonth(entry.month);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={!!selectedMonth} onOpenChange={() => { setSelectedMonth(null); setStatusFilter(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-0 flex-shrink-0">
            <DialogTitle className="text-base font-semibold capitalize">
              {monthLabel} — {fmt(monthTotal)}
              <Badge variant="secondary" className="text-[11px] ml-2">{monthPayments.length} paiements</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
            {[
              { key: null, label: "Tous" },
              { key: "paid", label: "Payé" },
              { key: "pending", label: "En attente" },
              { key: "late", label: "En retard" },
            ].map((f) => (
              <button
                key={f.key ?? "all"}
                onClick={() => setStatusFilter(f.key)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  statusFilter === f.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-col min-h-0 flex-1">
            <div className="grid grid-cols-[1fr_120px_60px_80px_80px] gap-3 px-2 pb-1.5 border-b border-border text-[11px] font-medium text-muted-foreground flex-shrink-0">
              <span>Client</span>
              <span>Échéance</span>
              <span className="text-center">N°</span>
              <span className="text-center">Statut</span>
              <span className="text-right">Montant</span>
            </div>
            <div className="divide-y divide-border/50 overflow-y-auto">
              {monthPayments.map((p) => {
                const sale = p.sale_id ? saleMap.get(p.sale_id) : null;
                const contact = sale ? contactMap.get(sale.contact_id) : null;
                const cfg = statusConfig[p.status] || statusConfig.pending;
                return (
                  <div key={p.id} className="grid grid-cols-[1fr_120px_60px_80px_80px] gap-3 items-center px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">{contact?.full_name || "Inconnu"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(p.due_date)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums text-center">{p.payment_number}/{p.total_payments}</span>
                    <div className="flex justify-center">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(p.amount)}</span>
                  </div>
                );
              })}
              {monthPayments.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun paiement pour ce mois</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
