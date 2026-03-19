import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, XCircle, ChevronRight, AlertTriangle, User } from "lucide-react";

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

interface ContactInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_normalized: string | null;
}

interface Props {
  salesLate: SaleItem[];
  salesLost: SaleItem[];
  contactMap: Map<string, ContactInfo>;
  payments: Payment[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  pending: { label: "En attente", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  late: { label: "En retard", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  lost: { label: "Perdu", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function ImpayesListCard({ salesLate, salesLost, contactMap, payments }: Props) {
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(null);

  const impayesList = [...salesLate, ...salesLost];

  const salePayments = selectedSale
    ? payments.filter((p) => p.sale_id === selectedSale.id).sort((a, b) => a.payment_number - b.payment_number)
    : [];
  const selectedContact = selectedSale ? contactMap.get(selectedSale.contact_id) : null;

  if (impayesList.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Détail des impayés
            <Badge variant="secondary" className="text-[11px] ml-1">{impayesList.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_80px_24px] gap-2 px-2 pb-1.5 border-b border-border text-[11px] font-medium text-muted-foreground">
            <span>Client</span>
            <span className="text-right">Montant</span>
            <span className="text-center">Statut</span>
            <span />
          </div>

          <ScrollArea className="max-h-[320px]">
            <div className="divide-y divide-border/50">
              {impayesList.map((sale) => {
                const contact = contactMap.get(sale.contact_id);
                const isLost = sale.payment_status === "lost";
                return (
                  <button
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="grid grid-cols-[1fr_100px_80px_24px] gap-2 items-center w-full px-2 py-2 hover:bg-muted/40 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${isLost ? "bg-[hsl(var(--kpi-lost)/0.2)]" : "bg-[hsl(var(--kpi-late)/0.15)]"}`}>
                        <User className={`h-3.5 w-3.5 ${isLost ? "text-[hsl(var(--kpi-lost))]" : "text-[hsl(var(--kpi-late))]"}`} />
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">
                        {contact?.full_name || "Inconnu"}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(sale.amount_ht)}</span>
                    <div className="flex justify-center">
                      <Badge
                        className={`text-[10px] px-1.5 py-0 leading-4 border ${
                          isLost
                            ? "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]"
                            : "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]"
                        }`}
                      >
                        {isLost ? "Perdu" : "Retard"}
                      </Badge>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Compact payment detail modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-sm flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">{selectedContact?.full_name || "Inconnu"}</p>
                <p className="text-[11px] text-muted-foreground font-normal">{selectedSale?.product} · {selectedSale && fmt(selectedSale.amount_ht)}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[300px] -mx-1 px-1">
            <div className="space-y-1 py-1">
              {salePayments.map((p) => {
                const cfg = paymentStatusConfig[p.status] || paymentStatusConfig.pending;
                return (
                  <div key={p.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground tabular-nums w-8">
                        {p.payment_number}/{p.total_payments}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(p.due_date)}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums">{fmt(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {(selectedContact?.email || selectedContact?.phone_normalized) && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border">
              {selectedContact.email && <span>✉️ {selectedContact.email}</span>}
              {selectedContact.phone_normalized && <span>📞 {selectedContact.phone_normalized}</span>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
