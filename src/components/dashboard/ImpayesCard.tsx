import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Clock, XCircle, ChevronRight } from "lucide-react";

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

interface SaleItem {
  id: string;
  amount_ht: number;
  payment_status: string | null;
  product: string;
  contact_id: string;
}

interface Props {
  tauxImpayes: number;
  salesLate: SaleItem[];
  salesLost: SaleItem[];
  salesPaid: SaleItem[];
  salesInProgress: SaleItem[];
  contactMap: Map<string, { id: string; full_name: string | null; email: string | null; phone_normalized: string | null }>;
  payments: Payment[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const statusConfig: Record<string, { label: string; variant: "destructive" | "outline" | "secondary" | "default"; icon: typeof AlertTriangle }> = {
  late: { label: "En retard", variant: "outline", icon: Clock },
  lost: { label: "Perdu", variant: "destructive", icon: XCircle },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  pending: { label: "En attente", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  late: { label: "En retard", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  lost: { label: "Perdu", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function ImpayesCard({ tauxImpayes, salesLate, salesLost, salesPaid, salesInProgress, contactMap, payments }: Props) {
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(null);

  const total = salesLate.length + salesLost.length + salesPaid.length + salesInProgress.length;
  const impayesList = [...salesLate, ...salesLost];
  const impayesCA = impayesList.reduce((sum, s) => sum + s.amount_ht, 0);

  const segments = [
    { label: "Payé", count: salesPaid.length, color: "bg-emerald-500", pct: total > 0 ? (salesPaid.length / total) * 100 : 0 },
    { label: "En cours", count: salesInProgress.length, color: "bg-blue-500", pct: total > 0 ? (salesInProgress.length / total) * 100 : 0 },
    { label: "En retard", count: salesLate.length, color: "bg-amber-500", pct: total > 0 ? (salesLate.length / total) * 100 : 0 },
    { label: "Perdu", count: salesLost.length, color: "bg-destructive", pct: total > 0 ? (salesLost.length / total) * 100 : 0 },
  ];

  const salePayments = selectedSale
    ? payments.filter((p) => p.sale_id === selectedSale.id).sort((a, b) => a.payment_number - b.payment_number)
    : [];

  const selectedContact = selectedSale ? contactMap.get(selectedSale.contact_id) : null;

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Impayés
            </span>
            <Badge variant={tauxImpayes > 15 ? "destructive" : "secondary"} className="text-xs font-bold">
              {tauxImpayes.toFixed(1)}%
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {impayesList.length} impayé{impayesList.length > 1 ? "s" : ""} · {fmt(impayesCA)} à risque
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 pt-0">
          {/* Stacked bar */}
          <div className="space-y-2">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              {segments.map((s) =>
                s.pct > 0 ? <div key={s.label} className={`${s.color} transition-all`} style={{ width: `${s.pct}%` }} /> : null
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
              {segments.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${s.color}`} />
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="text-foreground font-medium ml-auto">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Full unpaid list */}
          {impayesList.length > 0 && (
            <div className="border-t border-border pt-2 flex-1 min-h-0">
              <p className="text-[11px] text-muted-foreground font-medium mb-2">Liste des impayés</p>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {impayesList.map((sale) => {
                    const contact = contactMap.get(sale.contact_id);
                    const config = statusConfig[sale.payment_status || "late"];
                    const Icon = config?.icon || Clock;
                    return (
                      <button
                        key={sale.id}
                        onClick={() => setSelectedSale(sale)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left group"
                      >
                        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${sale.payment_status === "lost" ? "text-destructive" : "text-amber-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {contact?.full_name || "Contact inconnu"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{sale.product}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-bold text-foreground tabular-nums">{fmt(sale.amount_ht)}</span>
                          <Badge
                            variant={config?.variant || "outline"}
                            className="text-[10px] px-1.5 py-0 leading-4"
                          >
                            {config?.label || "Retard"}
                          </Badge>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {impayesList.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-4">
              <p className="text-xs text-muted-foreground">Aucun impayé 🎉</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment detail modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedContact?.full_name || "Contact inconnu"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedSale?.product} · {selectedSale && fmt(selectedSale.amount_ht)}
            </p>
          </DialogHeader>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Échéancier ({salePayments.length} paiement{salePayments.length > 1 ? "s" : ""})
            </p>
            <div className="space-y-1.5">
              {salePayments.map((p) => {
                const cfg = paymentStatusConfig[p.status] || paymentStatusConfig.pending;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          Paiement {p.payment_number}/{p.total_payments}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Échéance : {formatDate(p.due_date)}
                        {p.paid_at && <span className="ml-2">· Payé le {formatDate(p.paid_at)}</span>}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">{fmt(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedContact?.email && (
            <p className="text-[11px] text-muted-foreground mt-2">
              ✉️ {selectedContact.email}
              {selectedContact.phone_normalized && <span className="ml-2">· 📞 {selectedContact.phone_normalized}</span>}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
