import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RefreshCw, Check, CreditCard, AlertTriangle, CircleDollarSign } from "lucide-react";
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

export default function Payments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isCeo = profile?.role === "ceo";
  const userTz = profile?.timezone || "Europe/Paris";

  const [allPayments, setAllPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("this_month");
  const [search, setSearch] = useState("");

  const fetchPayments = useCallback(async () => {
    // Batch fetch to bypass 1000 limit
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

  // Filter logic
  const filteredPayments = useMemo(() => {
    let result = allPayments;

    // Period filter
    if (periodFilter === "this_month" || periodFilter === "next_month") {
      const offset = periodFilter === "this_month" ? 0 : 1;
      const { start, end } = getMonthRange(offset);
      result = result.filter((p) => p.due_date >= start && p.due_date <= end);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => {
        const info = getPaymentStatusInfo(p.status, p.due_date);
        return info.key === statusFilter;
      });
    }

    // Search
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

  // KPIs based on current month
  const thisMonth = getMonthRange(0);
  const kpiPayments = allPayments.filter((p) => p.due_date >= thisMonth.start && p.due_date <= thisMonth.end);
  const totalPendingMonth = kpiPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalPaidMonth = kpiPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const today = new Date().toISOString().split("T")[0];
  const totalOverdue = allPayments
    .filter((p) => p.status === "pending" && p.due_date < today)
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Paiements</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Suivi des mensualités</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50">
              <CreditCard className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalPendingMonth.toLocaleString("fr-FR")} €</p>
              <p className="text-xs text-muted-foreground">En attente ce mois</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50">
              <AlertTriangle className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalOverdue.toLocaleString("fr-FR")} €</p>
              <p className="text-xs text-muted-foreground">En retard</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50">
              <CircleDollarSign className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalPaidMonth.toLocaleString("fr-FR")} €</p>
              <p className="text-xs text-muted-foreground">Encaissé ce mois</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
            <SelectItem value="paid">Payé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes périodes</SelectItem>
            <SelectItem value="this_month">Ce mois</SelectItem>
            <SelectItem value="next_month">Mois prochain</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Rechercher client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[220px]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucun paiement trouvé</p>
        </div>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>N°</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Payé le</TableHead>
                <TableHead>Statut</TableHead>
                {isCeo && <TableHead>Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((p) => {
                const statusInfo = getPaymentStatusInfo(p.status, p.due_date);
                return (
                  <TableRow key={p.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">{p.contact_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.contact_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {p.payment_number}/{p.total_payments}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {p.amount.toLocaleString("fr-FR")} €
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateOnly(p.due_date, userTz)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.paid_at ? formatDateOnly(p.paid_at, userTz) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    {isCeo && (
                      <TableCell>
                        {p.status === "pending" && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Check className="h-4 w-4 mr-1" /> Payé
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
        </Card>
      )}
    </div>
  );
}
