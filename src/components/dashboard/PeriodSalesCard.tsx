import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, User, CheckCheck, ChevronLeft, ChevronRight, TrendingUp, Wallet } from "lucide-react";
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

function fmtFull(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
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

        return { ...sale, caCollecte, paidCount, totalCount, contactName: contact?.full_name || "Inconnu", isComplete };
      })
      .sort((a, b) => (b.sold_at || "").localeCompare(a.sold_at || ""));
  }, [sales, payments, contactMap]);

  // Reset page when data changes
  useEffect(() => { setPage(0); }, [sales]);

  const totalCA = enrichedSales.reduce((sum, s) => sum + s.amount_ht, 0);
  const totalCollecte = enrichedSales.reduce((sum, s) => sum + s.caCollecte, 0);
  const totalPages = Math.ceil(enrichedSales.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginatedSales = enrichedSales.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Smart pagination: show max 5 page numbers with ellipsis
  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    const pages: (number | "ellipsis")[] = [];
    if (safePage <= 2) {
      pages.push(0, 1, 2, "ellipsis", totalPages - 1);
    } else if (safePage >= totalPages - 3) {
      pages.push(0, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1);
    } else {
      pages.push(0, "ellipsis", safePage, "ellipsis", totalPages - 1);
    }
    return pages;
  };

  if (enrichedSales.length === 0) return null;

  // Fixed min-height for table area so the card doesn't jump
  const ROW_HEIGHT = 44; // approx px per row
  const minTableHeight = PAGE_SIZE * ROW_HEIGHT;

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Ventes de la période</CardTitle>
          <Badge variant="secondary" className="text-[11px] tabular-nums ml-0.5">{enrichedSales.length}</Badge>
        </div>

        {/* ── Summary KPI strip ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">CA Généré</span>
            </div>
            <span className="text-lg font-bold text-foreground tabular-nums">{fmt(totalCA)}</span>
          </div>
          <div className="rounded-xl border border-[hsl(var(--kpi-paid)/0.2)] bg-[hsl(var(--kpi-paid)/0.04)] p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="h-3.5 w-3.5 text-[hsl(var(--kpi-paid))]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--kpi-paid))]">Collecté</span>
            </div>
            <span className="text-lg font-bold text-[hsl(var(--kpi-paid))] tabular-nums">{fmt(totalCollecte)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-3">
        {/* ── Column headers ── */}
        <div className="grid grid-cols-[1fr_110px_48px_56px_68px_80px_80px] gap-2 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Client</span>
          <span>Date</span>
          <span className="text-center">Mens.</span>
          <span className="text-center">Éch.</span>
          <span className="text-center">Statut</span>
          <span className="text-right">CA</span>
          <span className="text-right">Collecté</span>
        </div>

        {/* ── Table rows with fixed min-height ── */}
        <div className="border-t border-border" style={{ minHeight: `${minTableHeight}px` }}>
          <div className="divide-y divide-border/40">
            {paginatedSales.map((sale, idx) => {
              const cfg = statusConfig[sale.payment_status || "pending"] || statusConfig.pending;
              return (
                <div
                  key={sale.id}
                  className={`grid grid-cols-[1fr_110px_48px_56px_68px_80px_80px] gap-2 items-center px-3 py-2.5 transition-colors hover:bg-muted/30 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}
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
                    ) : (
                      <span className="text-[11px] font-semibold tabular-nums text-foreground">
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
                    {fmtFull(sale.amount_ht)}
                  </span>

                  <span className="text-xs font-bold text-[hsl(var(--kpi-paid))] tabular-nums text-right">
                    {fmtFull(sale.caCollecte)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, enrichedSales.length)} sur {enrichedSales.length}
            </span>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {getVisiblePages().map((p, i) =>
                p === "ellipsis" ? (
                  <span key={`e${i}`} className="w-7 text-center text-xs text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === safePage ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7 text-[11px]"
                    onClick={() => setPage(p)}
                  >
                    {p + 1}
                  </Button>
                )
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
