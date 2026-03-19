import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { User } from "lucide-react";

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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]" },
  pending: { label: "En attente", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  late: { label: "En retard", className: "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]" },
  lost: { label: "Perdu", className: "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]" },
};

export default function MRRChart({ data, payments = [], contactMap = new Map(), sales = [] }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const chartData = data.map((d) => ({
    ...d,
    label: format(parse(d.month, "yyyy-MM", new Date()), "MMM yy", { locale: fr }),
  }));

  const saleMap = new Map(sales.map((s) => [s.id, s]));

  // Payments for the selected month, sorted by due_date
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

  const handleBarClick = (barData: any) => {
    if (barData?.month) {
      setSelectedMonth(barData.month);
    }
  };

  return (
    <>
      <Card className="col-span-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">MRR – Revenus récurrents mensuels</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée de paiement récurrent</p>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted)/0.15)" }}
                  formatter={(value: number) => [fmt(value), "MRR"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar
                  dataKey="amount"
                  fill="hsl(var(--primary))"
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
