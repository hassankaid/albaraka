import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag, User, Check, CheckCheck } from "lucide-react";

interface Sale {
  id: string;
  amount_ht: number;
  mensualites: number | null;
  payment_status: string | null;
  contact_id: string;
  product: string;
  sold_at: string | null;
  closed_by: string | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  sale_id: string | null;
}

interface ContactInfo {
  id: string;
  full_name: string | null;
}

interface Props {
  sales: Sale[];
  payments: Payment[];
  contactMap: Map<string, ContactInfo>;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]" },
  pending: { label: "En cours", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  in_progress: { label: "En cours", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  late: { label: "Retard", className: "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]" },
  lost: { label: "Perdu", className: "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]" },
};

export default function PeriodSalesCard({ sales, payments, contactMap }: Props) {
  const enrichedSales = useMemo(() => {
    return sales
      .map((sale) => {
        const salePayments = payments.filter((p) => p.sale_id === sale.id);
        const caCollecte = salePayments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
        const paidCount = salePayments.filter((p) => p.status === "paid").length;
        const totalCount = sale.mensualites || 1;
        const contact = contactMap.get(sale.contact_id);
        const isComplete = paidCount >= totalCount;

        return {
          ...sale,
          caCollecte,
          paidCount,
          totalCount,
          contactName: contact?.full_name || "Inconnu",
          isComplete,
        };
      })
      .sort((a, b) => (b.sold_at || "").localeCompare(a.sold_at || ""));
  }, [sales, payments, contactMap]);

  const totalCA = enrichedSales.reduce((sum, s) => sum + s.amount_ht, 0);
  const totalCollecte = enrichedSales.reduce((sum, s) => sum + s.caCollecte, 0);

  if (enrichedSales.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Ventes de la période</CardTitle>
            <Badge variant="secondary" className="text-[11px]">{enrichedSales.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-muted/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">CA</span>
              <span className="text-xs font-bold text-foreground tabular-nums">{fmt(totalCA)}</span>
            </div>
            <div className="bg-[hsl(var(--kpi-paid)/0.08)] rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-[hsl(var(--kpi-paid))]">Collecté</span>
              <span className="text-xs font-bold text-[hsl(var(--kpi-paid))] tabular-nums">{fmt(totalCollecte)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="grid grid-cols-[1fr_68px_56px_56px_70px_90px_90px] gap-2 px-2 pb-1.5 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Client</span>
          <span>Date</span>
          <span className="text-center">Mens.</span>
          <span className="text-center">Éch.</span>
          <span className="text-center">Statut</span>
          <span className="text-right">CA</span>
          <span className="text-right">Collecté</span>
        </div>

        <ScrollArea className="max-h-[320px]">
          <div className="divide-y divide-border/50">
            {enrichedSales.map((sale) => {
              const cfg = statusConfig[sale.payment_status || "pending"] || statusConfig.pending;
              return (
                <div
                  key={sale.id}
                  className="grid grid-cols-[1fr_68px_56px_56px_70px_90px_90px] gap-2 items-center px-2 py-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-foreground truncate">{sale.contactName}</span>
                  </div>

                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {sale.sold_at ? formatDate(sale.sold_at) : "—"}
                  </span>

                  <div className="flex justify-center">
                    <span className="text-[11px] font-medium text-foreground tabular-nums">{sale.totalCount}×</span>
                  </div>

                  <div className="flex justify-center">
                    {sale.isComplete ? (
                      <CheckCheck className="h-4 w-4 text-[hsl(var(--kpi-paid))]" />
                    ) : sale.totalCount === 1 ? (
                      <span className="text-[11px] text-muted-foreground/50">—</span>
                    ) : (
                      <span className="text-[11px] font-medium tabular-nums text-foreground">
                        {sale.paidCount}<span className="text-muted-foreground">/{sale.totalCount}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>
                      {cfg.label}
                    </Badge>
                  </div>

                  <span className="text-xs font-bold text-foreground tabular-nums text-right">
                    {fmt(sale.amount_ht)}
                  </span>

                  <span className="text-xs font-bold text-[hsl(var(--kpi-paid))] tabular-nums text-right">
                    {fmt(sale.caCollecte)}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
