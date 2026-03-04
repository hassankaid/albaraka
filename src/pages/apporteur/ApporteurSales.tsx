import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, RefreshCw, Calendar, CreditCard, TrendingUp, CheckCircle2, Clock, AlertTriangle, XCircle, Coins } from "lucide-react";
import { formatDateOnly } from "@/lib/formatDate";

interface SaleRow {
  id: string;
  product: string;
  amount_ht: number;
  sold_at: string | null;
  mensualites: number | null;
  contact_name: string | null;
  lead_id: string | null;
  payments_paid: number;
  payments_total: number;
  commission_percentage: number | null;
  commission_total: number | null;
}

interface PaymentRow {
  id: string;
  payment_number: number;
  total_payments: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
}

interface CommissionRow {
  payment_id: string | null;
  amount: number | null;
  status: string | null;
  percentage: number;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e",
  due: "#f59e0b",
  invoiced: "#f59e0b",
  pending: "#6b7280",
  cancelled: "#ef4444",
};

export default function ApporteurSales() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchSales = useCallback(async () => {
    if (!profile) return;
    const userId = profile.id;

    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .eq("apporteur_id", userId);

    if (!leads || leads.length === 0) {
      setSales([]);
      setLoading(false);
      return;
    }

    const leadIds = leads.map(l => l.id);

    const { data: salesData } = await supabase
      .from("sales")
      .select("id, product, amount_ht, sold_at, mensualites, lead_id, contact_id, contacts!sales_contact_id_fkey(full_name), leads!sales_lead_id_fkey(contact_id, contacts!leads_contact_id_fkey(full_name))")
      .in("lead_id", leadIds)
      .order("sold_at", { ascending: false });

    if (!salesData || salesData.length === 0) {
      setSales([]);
      setLoading(false);
      return;
    }

    const saleIds = salesData.map(s => s.id);

    const [paymentsRes, commissionsRes] = await Promise.all([
      supabase.from("payments").select("sale_id, status").in("sale_id", saleIds),
      supabase.from("commissions").select("sale_id, percentage, amount").eq("beneficiary_user_id", userId).in("sale_id", saleIds),
    ]);

    const paymentsBySale: Record<string, { paid: number; total: number }> = {};
    (paymentsRes.data || []).forEach((p) => {
      if (!paymentsBySale[p.sale_id!]) paymentsBySale[p.sale_id!] = { paid: 0, total: 0 };
      paymentsBySale[p.sale_id!].total++;
      if (p.status === "paid") paymentsBySale[p.sale_id!].paid++;
    });

    const commBySale: Record<string, { pct: number; amount: number }> = {};
    (commissionsRes.data || []).forEach((c) => {
      if (!commBySale[c.sale_id]) {
        commBySale[c.sale_id] = { pct: c.percentage, amount: c.amount || 0 };
      } else {
        commBySale[c.sale_id].amount += c.amount || 0;
      }
    });

    const rows: SaleRow[] = salesData.map((s: any) => ({
      id: s.id,
      product: s.product,
      amount_ht: s.amount_ht,
      sold_at: s.sold_at,
      mensualites: s.mensualites,
      contact_name: s.contacts?.full_name || null,
      lead_id: s.lead_id,
      payments_paid: paymentsBySale[s.id]?.paid || 0,
      payments_total: paymentsBySale[s.id]?.total || 0,
      commission_percentage: commBySale[s.id]?.pct || null,
      commission_total: commBySale[s.id]?.amount || null,
    }));

    setSales(rows);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const openDetail = async (sale: SaleRow) => {
    setSelectedSale(sale);
    setLoadingPayments(true);

    const [paymentsRes, commissionsRes] = await Promise.all([
      supabase
        .from("payments")
        .select("id, payment_number, total_payments, amount, due_date, paid_at, status")
        .eq("sale_id", sale.id)
        .order("payment_number", { ascending: true }),
      supabase
        .from("commissions")
        .select("payment_id, amount, status, percentage")
        .eq("sale_id", sale.id)
        .eq("beneficiary_user_id", profile!.id),
    ]);

    setPayments(paymentsRes.data || []);
    setCommissions(commissionsRes.data || []);
    setLoadingPayments(false);
  };

  const getPaymentIcon = (status: string, dueDate: string) => {
    if (status === "paid") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (status === "cancelled") return <XCircle className="h-4 w-4 text-muted-foreground" />;
    if (new Date(dueDate) < new Date()) return <AlertTriangle className="h-4 w-4 text-red-400" />;
    return <Clock className="h-4 w-4 text-orange-400" />;
  };

  const getPaymentLabel = (status: string, dueDate: string) => {
    if (status === "paid") return "Payé";
    if (status === "cancelled") return "Annulé";
    if (new Date(dueDate) < new Date()) return "En retard";
    return "En attente";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Commission aggregation for the detail panel
  const commByPaymentId = Object.fromEntries(
    commissions.map(c => [c.payment_id, c])
  );

  const commPaid = commissions
    .filter(c => c.status === "paid")
    .reduce((s, c) => s + (c.amount || 0), 0);
  const commDue = commissions
    .filter(c => ["due", "invoiced"].includes(c.status || ""))
    .reduce((s, c) => s + (c.amount || 0), 0);
  const commPending = commissions
    .filter(c => c.status === "pending")
    .reduce((s, c) => s + (c.amount || 0), 0);
  const commCancelled = commissions
    .filter(c => c.status === "cancelled")
    .reduce((s, c) => s + (c.amount || 0), 0);
  const commTotal = commPaid + commDue + commPending + commCancelled;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mes Ventes</h2>
        <p className="text-sm text-muted-foreground">{sales.length} vente{sales.length > 1 ? "s" : ""}</p>
      </div>

      {sales.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Aucune vente pour le moment</p>
            <p className="text-sm text-muted-foreground mt-1">Vos ventes apparaîtront ici lorsque vos leads seront convertis.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="border-border/50 overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mensualités</TableHead>
                  <TableHead>Paiements</TableHead>
                  <TableHead>Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => openDetail(sale)}
                  >
                    <TableCell className="font-semibold text-foreground">{sale.contact_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sale.sold_at ? formatDateOnly(sale.sold_at) : "—"}
                    </TableCell>
                    <TableCell className="text-foreground">{sale.amount_ht.toLocaleString("fr-FR")} €</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sale.mensualites || 1}x</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        sale.payments_paid === sale.payments_total && sale.payments_total > 0
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-orange-500/20 text-orange-300 border-orange-500/30"
                      }`}>
                        {sale.payments_paid}/{sale.payments_total}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.commission_percentage != null ? (
                        <span className="text-sm text-foreground">
                          {sale.commission_percentage}% ({sale.commission_total?.toLocaleString("fr-FR")} €)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {sales.map((sale) => (
              <Card key={sale.id} className="border-border/50 cursor-pointer" onClick={() => openDetail(sale)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{sale.contact_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{sale.product} · {sale.sold_at ? formatDateOnly(sale.sold_at) : ""}</p>
                    </div>
                    <p className="font-bold text-foreground">{sale.amount_ht.toLocaleString("fr-FR")} €</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                      {sale.payments_paid}/{sale.payments_total} payés
                    </Badge>
                    {sale.commission_percentage != null && (
                      <span className="text-xs text-muted-foreground">{sale.commission_percentage}% commission</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Sale Detail Sheet */}
      <Sheet open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <SheetContent className="bg-card border-border sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-foreground text-lg">Détail de la vente</SheetTitle>
          </SheetHeader>

          {selectedSale && (
            <div className="space-y-6 mt-4">
              {/* Header card */}
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">{selectedSale.contact_name || "—"}</h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                    {selectedSale.product}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Montant</p>
                      <p className="text-sm font-semibold text-foreground">{selectedSale.amount_ht.toLocaleString("fr-FR")} €</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date de vente</p>
                      <p className="text-sm font-semibold text-foreground">{selectedSale.sold_at ? formatDateOnly(selectedSale.sold_at) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Mensualités</p>
                      <p className="text-sm font-semibold text-foreground">{selectedSale.mensualites || 1}x</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission section */}
              {!loadingPayments && commTotal > 0 && (
                <>
                  <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">
                        Ma Commission ({selectedSale.commission_percentage}%)
                      </h4>
                    </div>

                    <p className="text-lg font-bold text-foreground">
                      Total : {commTotal.toLocaleString("fr-FR")} €
                    </p>

                    {/* Multi-color progress bar */}
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                      {commPaid > 0 && (
                        <div className="h-full" style={{ width: `${(commPaid / commTotal) * 100}%`, backgroundColor: "#22c55e" }} />
                      )}
                      {commDue > 0 && (
                        <div className="h-full" style={{ width: `${(commDue / commTotal) * 100}%`, backgroundColor: "#f59e0b" }} />
                      )}
                      {commPending > 0 && (
                        <div className="h-full" style={{ width: `${(commPending / commTotal) * 100}%`, backgroundColor: "#6b7280" }} />
                      )}
                      {commCancelled > 0 && (
                        <div className="h-full" style={{ width: `${(commCancelled / commTotal) * 100}%`, backgroundColor: "#ef4444" }} />
                      )}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                        {commPaid.toLocaleString("fr-FR")} € reçu
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                        {commDue.toLocaleString("fr-FR")} € à recevoir
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#6b7280" }} />
                        {commPending.toLocaleString("fr-FR")} € en attente
                      </span>
                      {commCancelled > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                          {commCancelled.toLocaleString("fr-FR")} € annulé
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-border" />
                </>
              )}

              {/* Payments section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">Échéancier des paiements</h4>
                </div>

                {loadingPayments ? (
                  <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : payments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => {
                      const label = getPaymentLabel(p.status, p.due_date);
                      const isPaid = p.status === "paid";
                      const comm = commByPaymentId[p.id];
                      const commColor = comm ? (STATUS_COLORS[comm.status || "pending"] || "#6b7280") : null;

                      return (
                        <div
                          key={p.id}
                          className={`py-3 px-4 rounded-lg border transition-colors ${
                            isPaid
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-secondary/20 border-border/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getPaymentIcon(p.status, p.due_date)}
                              <p className="text-sm font-medium text-foreground">
                                Mensualité {p.payment_number}/{p.total_payments}
                              </p>
                            </div>
                            <p className={`text-sm font-semibold ${isPaid ? "text-emerald-400" : "text-foreground"}`}>
                              {p.amount.toLocaleString("fr-FR")} €
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-1 ml-7">
                            <p className="text-xs text-muted-foreground">
                              Échéance : {formatDateOnly(p.due_date)}
                              {p.paid_at && ` · Payé le ${formatDateOnly(p.paid_at)}`}
                            </p>
                            {comm && (
                              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                → {(comm.amount || 0).toLocaleString("fr-FR")} €
                                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: commColor! }} />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
