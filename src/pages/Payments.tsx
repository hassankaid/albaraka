import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RefreshCw, Check, CreditCard, AlertTriangle, CircleDollarSign, Search, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateOnly } from "@/lib/formatDate";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentRow {
  id: string;
  payment_number: number;
  total_payments: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
}

const getPaymentStatusInfo = (status: string, dueDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (status === "paid") return { label: "Payé", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", key: "paid" };
  if (status === "cancelled") return { label: "Annulé", className: "bg-muted text-muted-foreground border-border", key: "cancelled" };
  if (status === "pending" && due < today) return { label: "En retard", className: "bg-red-500/20 text-red-300 border-red-500/30", key: "overdue" };
  return { label: "En attente", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", key: "pending" };
};

const getMonthRange = (offset: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  const end = new Date(d);
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
};

const getBillingPeriodLabel = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

const PAGE_SIZE = 50;

export default function Payments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isCeo = profile?.role === "ceo";
  const userTz = profile?.timezone || "Europe/Paris";

  const [allPayments, setAllPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("this_month");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const fetchPayments = useCallback(async () => {
    const batchSize = 1000;
    let from = 0;
    let all: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("payments")
        .select(`
          id, payment_number, total_payments, amount, due_date, paid_at, status,
          contacts!payments_contact_id_fkey(full_name, email)
        `)
        .order("due_date", { ascending: true })
        .range(from, from + batchSize - 1);

      if (data && data.length > 0) {
        all = [...all, ...data];
        if (data.length < batchSize) hasMore = false;
        else from += batchSize;
      } else {
        hasMore = false;
      }
    }

    setAllPayments(
      all.map((p: any) => ({
        id: p.id,
        payment_number: p.payment_number,
        total_payments: p.total_payments,
        amount: p.amount,
        due_date: p.due_date,
        paid_at: p.paid_at,
        status: p.status,
        contact_name: p.contacts?.full_name || null,
        contact_email: p.contacts?.email || null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
    toast({ title: "Données actualisées" });
  };

  const markAsPaid = async (paymentId: string, paidDate: Date) => {
    const dateStr = format(paidDate, "yyyy-MM-dd");
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: dateStr })
      .eq("id", paymentId);
    if (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } else {
      toast({ title: "Paiement marqué comme payé" });
      fetchPayments();
    }
  };

  const filteredPayments = useMemo(() => {
    let result = allPayments;

    if (periodFilter === "this_month" || periodFilter === "next_month") {
      const offset = periodFilter === "this_month" ? 0 : 1;
      const { start, end } = getMonthRange(offset);
      result = result.filter((p) => p.due_date >= start && p.due_date <= end);
    } else if (periodFilter === "billing_period") {
      const { start, end } = getMonthRange(-1);
      result = result.filter((p) => p.due_date >= start && p.due_date <= end);
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => {
        const info = getPaymentStatusInfo(p.status, p.due_date);
        return info.key === statusFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.contact_name && p.contact_name.toLowerCase().includes(q)) ||
          (p.contact_email && p.contact_email.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allPayments, statusFilter, periodFilter, search]);

  useEffect(() => { setPage(0); }, [statusFilter, periodFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const paginatedPayments = useMemo(
    () => filteredPayments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredPayments, page]
  );

  const thisMonth = getMonthRange(0);
  const kpiPayments = allPayments.filter((p) => p.due_date >= thisMonth.start && p.due_date <= thisMonth.end);
  const totalPendingMonth = kpiPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalPaidMonth = kpiPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const today = new Date().toISOString().split("T")[0];
  const totalOverdue = allPayments
    .filter((p) => p.status === "pending" && p.due_date < today)
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Top bar: KPIs + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <CreditCard className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-sm font-bold text-foreground">{totalPendingMonth.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">en attente</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-red-500/30">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-sm font-bold text-foreground">{totalOverdue.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">en retard</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <CircleDollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm font-bold text-foreground">{totalPaidMonth.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">encaissé</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={refreshing} title="Actualiser">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes périodes</SelectItem>
            <SelectItem value="this_month">Ce mois</SelectItem>
            <SelectItem value="next_month">Mois prochain</SelectItem>
            <SelectItem value="billing_period">Facturation ({getBillingPeriodLabel()})</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
            <SelectItem value="paid">Payé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucun paiement trouvé</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[200px]">Client</TableHead>
                  <TableHead>N°</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Payé le</TableHead>
                  <TableHead>Statut</TableHead>
                  {isCeo && <TableHead className="w-[80px]">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((p) => {
                  const statusInfo = getPaymentStatusInfo(p.status, p.due_date);
                  return (
                    <TableRow key={p.id} className="border-border hover:bg-secondary/50 transition-colors">
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{p.contact_name || "—"}</p>
                          {p.contact_email && <p className="text-xs text-muted-foreground truncate">{p.contact_email}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {p.payment_number}/{p.total_payments}
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-foreground">
                        {p.amount.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateOnly(p.due_date, userTz)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {isCeo && (p.paid_at || p.status === "paid") ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-auto p-0 font-normal text-xs text-muted-foreground hover:text-foreground">
                                {p.paid_at ? formatDateOnly(p.paid_at, userTz) : "—"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={p.paid_at ? new Date(p.paid_at) : new Date()}
                                onSelect={(date) => { if (date) markAsPaid(p.id, date); }}
                                locale={fr}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          p.paid_at ? formatDateOnly(p.paid_at, userTz) : "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] leading-tight ${statusInfo.className}`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      {isCeo && (
                        <TableCell>
                          {p.status === "pending" && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                  <Check className="h-3.5 w-3.5" /> Payé
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                  mode="single"
                                  selected={new Date()}
                                  onSelect={(date) => { if (date) markAsPaid(p.id, date); }}
                                  locale={fr}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredPayments.length)} sur {filteredPayments.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />Préc.
                </Button>
                <span className="text-xs text-muted-foreground">{page + 1}/{totalPages}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Suiv.<ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
