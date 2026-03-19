import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, User, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const PAGE_SIZE = 10;

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]" },
  pending: { label: "En cours", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  in_progress: { label: "En cours", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  late: { label: "Retard", className: "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]" },
  lost: { label: "Perdu", className: "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]" },
};

export default function PeriodSalesCard({ sales, payments, contactMap }: Props) {
  const [page, setPage] = useState(0);

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

  const totalPages = Math.ceil(enrichedSales.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginatedSales = enrichedSales.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  if (enrichedSales.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Ventes de la période</CardTitle>
            <Badge variant="secondary" className="text-[11px] tabular-nums">{enrichedSales.length}</Badge>
          </div>
        </div>

        {/* Summary row — clean separated pills */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 rounded-lg border border-border bg-muted/30 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">CA Généré</span>
            <span className="text-sm font-bold text-foreground tabular-nums">{fmt(totalCA)}</span>
          </div>
          <div className="flex-1 rounded-lg border border-[hsl(var(--kpi-paid)/0.25)] bg-[hsl(var(--kpi-paid)/0.06)] px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-[hsl(var(--kpi-paid))] uppercase tracking-wide">Collecté</span>
            <span className="text-sm font-bold text-[hsl(var(--kpi-paid))] tabular-nums">{fmt(totalCollecte)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_72px_48px_56px_68px_88px_88px] gap-2 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Client</span>
          <span>Date</span>
          <span className="text-center">Mens.</span>
          <span className="text-center">Éch.</span>
          <span className="text-center">Statut</span>
          <span className="text-right">CA</span>
          <span className="text-right">Collecté</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {paginatedSales.map((sale) => {
            const cfg = statusConfig[sale.payment_status || "pending"] || statusConfig.pending;
            return (
              <div
                key={sale.id}
                className="grid grid-cols-[1fr_72px_48px_56px_68px_88px_88px] gap-2 items-center px-3 py-2.5 hover:bg-muted/30 transition-colors"
              >
                {/* Client */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate">{sale.contactName}</span>
                </div>

                {/* Date */}
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {sale.sold_at ? formatDate(sale.sold_at) : "—"}
                </span>

                {/* Mensualités */}
                <div className="flex justify-center">
                  <span className="text-[11px] font-medium text-foreground tabular-nums">{sale.totalCount}×</span>
                </div>

                {/* Échéance */}
                <div className="flex justify-center">
                  {sale.isComplete ? (
                    <CheckCheck className="h-4 w-4 text-[hsl(var(--kpi-paid))]" />
                  ) : sale.totalCount === 1 && sale.paidCount === 0 ? (
                    <span className="text-[11px] text-muted-foreground">0/1</span>
                  ) : (
                    <span className="text-[11px] font-medium tabular-nums text-foreground">
                      {sale.paidCount}<span className="text-muted-foreground/70">/{sale.totalCount}</span>
                    </span>
                  )}
                </div>

                {/* Statut */}
                <div className="flex justify-center">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>
                    {cfg.label}
                  </Badge>
                </div>

                {/* CA */}
                <span className="text-xs font-bold text-foreground tabular-nums text-right">
                  {fmt(sale.amount_ht)}
                </span>

                {/* Collecté */}
                <span className="text-xs font-bold text-[hsl(var(--kpi-paid))] tabular-nums text-right">
                  {fmt(sale.caCollecte)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, enrichedSales.length)} sur {enrichedSales.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={i === currentPage ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7 text-[11px]"
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
