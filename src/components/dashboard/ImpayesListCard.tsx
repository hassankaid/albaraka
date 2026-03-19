import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, AlertTriangle, User, Mail, Phone } from "lucide-react";

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
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]" },
  pending: { label: "En attente", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  late: { label: "En retard", className: "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]" },
  lost: { label: "Perdu", className: "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]" },
};

function getTriggerDate(sale: SaleItem, salePayments: Payment[]): string | undefined {
  const isLost = sale.payment_status === "lost";
  const triggerPayment = isLost
    ? salePayments.filter((p) => p.status === "lost").sort((a, b) => a.payment_number - b.payment_number)[0]
    : salePayments.filter((p) => p.status === "late").sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  return triggerPayment?.due_date;
}

export default function ImpayesListCard({ salesLate, salesLost, contactMap, payments }: Props) {
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(null);

  // Sort each group: most recent trigger date first
  const sortedList = useMemo(() => {
    const withTrigger = (list: SaleItem[]) =>
      list
        .map((sale) => ({
          sale,
          triggerDate: getTriggerDate(sale, payments.filter((p) => p.sale_id === sale.id)),
        }))
        .sort((a, b) => (b.triggerDate || "").localeCompare(a.triggerDate || ""));

    return [...withTrigger(salesLate), ...withTrigger(salesLost)];
  }, [salesLate, salesLost, payments]);

  const modalPayments = selectedSale
    ? payments.filter((p) => p.sale_id === selectedSale.id).sort((a, b) => a.payment_number - b.payment_number)
    : [];
  const selectedContact = selectedSale ? contactMap.get(selectedSale.contact_id) : null;

  if (sortedList.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--kpi-late))]" />
            Détail des impayés
            <Badge variant="secondary" className="text-[11px] ml-1">{sortedList.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-[1fr_90px_100px_80px_24px] gap-2 px-2 pb-1.5 border-b border-border text-[11px] font-medium text-muted-foreground">
            <span>Client</span>
            <span>Depuis</span>
            <span className="text-right">Montant</span>
            <span className="text-center">Statut</span>
            <span />
          </div>

          <ScrollArea className="max-h-[320px]">
            <div className="divide-y divide-border/50">
              {sortedList.map(({ sale, triggerDate }) => {
                const contact = contactMap.get(sale.contact_id);
                const isLost = sale.payment_status === "lost";
                return (
                  <button
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="grid grid-cols-[1fr_90px_100px_80px_24px] gap-2 items-center w-full px-2 py-2 hover:bg-muted/40 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${isLost ? "bg-[hsl(var(--kpi-lost)/0.2)]" : "bg-[hsl(var(--kpi-late)/0.15)]"}`}>
                        <User className={`h-3.5 w-3.5 ${isLost ? "text-[hsl(var(--kpi-lost))]" : "text-[hsl(var(--kpi-late))]"}`} />
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">
                        {contact?.full_name || "Inconnu"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {triggerDate ? formatDate(triggerDate) : "—"}
                    </span>
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

      {/* Wide horizontal modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-sm flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-base font-semibold">{selectedContact?.full_name || "Inconnu"}</p>
                <p className="text-xs text-muted-foreground font-normal">{selectedSale?.product} · {selectedSale && fmt(selectedSale.amount_ht)}</p>
              </div>
            </DialogTitle>

            {(selectedContact?.email || selectedContact?.phone_normalized) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground ml-12 pt-0.5">
                {selectedContact?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {selectedContact.email}
                  </span>
                )}
                {selectedContact?.phone_normalized && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedContact.phone_normalized}
                  </span>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Horizontal payment grid */}
          <div className="mt-2">
            <div className="grid grid-cols-[50px_110px_1fr_80px] gap-3 px-2 pb-1.5 border-b border-border text-[11px] font-medium text-muted-foreground">
              <span>N°</span>
              <span>Échéance</span>
              <span>Statut</span>
              <span className="text-right">Montant</span>
            </div>
            <div className="divide-y divide-border/50">
              {modalPayments.map((p) => {
                const cfg = paymentStatusConfig[p.status] || paymentStatusConfig.pending;
                return (
                  <div key={p.id} className="grid grid-cols-[50px_110px_1fr_80px] gap-3 items-center px-2 py-1.5">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {p.payment_number}/{p.total_payments}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(p.due_date)}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                      {p.paid_at && <span className="text-[10px] text-muted-foreground">payé le {formatDate(p.paid_at)}</span>}
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
