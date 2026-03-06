import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  RefreshCw, Search, Filter, Pencil, CalendarIcon, BadgeEuro,
  CheckCircle2, Clock, AlertCircle, XCircle, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDateOnly } from "@/lib/formatDate";

interface CommissionRow {
  id: string;
  role: string;
  percentage: number;
  amount: number | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
  beneficiary_user_id: string | null;
  beneficiary_external: string | null;
  beneficiary_name: string;
  sale_product: string;
  sale_amount_ht: number;
  sale_sold_at: string | null;
  contact_name: string;
  payment_number: number | null;
  total_payments: number | null;
  payment_status: string | null;
  payment_amount: number | null;
  payment_due_date: string | null;
  payment_paid_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "En attente", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  due: { label: "À payer", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: AlertCircle },
  invoiced: { label: "Facturée", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: FileText },
  paid: { label: "Payée", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  cancelled: { label: "Annulée", color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

const ROLE_COLORS: Record<string, string> = {
  apporteur: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  setter: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  closer: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  agence_marketing: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
};

export default function AdminCommissions() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isCeo = profile?.role === "ceo";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  // Edit modal
  const [editingCommission, setEditingCommission] = useState<CommissionRow | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPaidAt, setEditPaidAt] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const userTz = profile?.timezone || "Europe/Paris";

  const fetchData = useCallback(async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from("commissions")
      .select(`
        id, role, percentage, amount, status, paid_at, created_at,
        beneficiary_user_id, beneficiary_external,
        profiles!commissions_beneficiary_user_id_fkey(full_name),
        sales!commissions_sale_id_fkey(
          product, amount_ht, sold_at,
          contacts!sales_contact_id_fkey(full_name)
        ),
        payments!commissions_payment_id_fkey(
          payment_number, total_payments, status, amount, due_date, paid_at
        )
      `)
      .not("payment_id", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching commissions:", error);
      toast({ title: "Erreur de chargement", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data) {
      setCommissions(
        data.map((c: any) => ({
          id: c.id,
          role: c.role,
          percentage: c.percentage,
          amount: c.amount,
          status: c.status,
          paid_at: c.paid_at,
          created_at: c.created_at,
          beneficiary_user_id: c.beneficiary_user_id,
          beneficiary_external: c.beneficiary_external,
          beneficiary_name: c.profiles?.full_name || c.beneficiary_external || "—",
          sale_product: c.sales?.product || "—",
          sale_amount_ht: c.sales?.amount_ht || 0,
          sale_sold_at: c.sales?.sold_at,
          contact_name: c.sales?.contacts?.full_name || "—",
          payment_number: c.payments?.payment_number,
          total_payments: c.payments?.total_payments,
          payment_status: c.payments?.status,
          payment_amount: c.payments?.amount,
          payment_due_date: c.payments?.due_date,
          payment_paid_at: c.payments?.paid_at,
        }))
      );
    }
    setLoading(false);
  }, [profile, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({ title: "Données actualisées" });
  };

  const openEdit = (c: CommissionRow) => {
    setEditingCommission(c);
    setEditStatus(c.status || "pending");
    setEditPaidAt(c.paid_at ? new Date(c.paid_at) : undefined);
  };

  const handleSave = async () => {
    if (!editingCommission) return;
    setSaving(true);
    try {
      const updates: any = { status: editStatus };
      if (editStatus === "paid" && editPaidAt) {
        updates.paid_at = editPaidAt.toISOString();
      } else if (editStatus !== "paid") {
        updates.paid_at = null;
      }

      const { error } = await supabase
        .from("commissions")
        .update(updates)
        .eq("id", editingCommission.id);

      if (error) throw error;
      toast({ title: "Commission mise à jour" });
      setEditingCommission(null);
      fetchData();
    } catch {
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Filters
  const filtered = commissions.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterRole !== "all" && c.role !== filterRole) return false;
    if (filterPeriod === "billing_period") {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
      const start = d.toISOString().split("T")[0];
      d.setMonth(d.getMonth() + 1);
      d.setDate(0);
      const end = d.toISOString().split("T")[0];
      if (!c.payment_paid_at || c.payment_paid_at < start || c.payment_paid_at > end) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.beneficiary_name.toLowerCase().includes(q) &&
        !c.contact_name.toLowerCase().includes(q) &&
        !c.sale_product.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Stats
  const totalAmount = filtered.reduce((s, c) => s + (c.amount || 0), 0);
  const paidAmount = filtered.filter((c) => c.status === "paid").reduce((s, c) => s + (c.amount || 0), 0);
  const dueAmount = filtered.filter((c) => ["due", "invoiced"].includes(c.status || "")).reduce((s, c) => s + (c.amount || 0), 0);
  const pendingAmount = filtered.filter((c) => c.status === "pending").reduce((s, c) => s + (c.amount || 0), 0);

  const fmtDate = (d: string | null) => d ? formatDateOnly(d, userTz) : "—";

  if (!isCeo) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Accès réservé au CEO.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion des commissions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualisez et gérez toutes les commissions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BadgeEuro className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalAmount.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">Total ({filtered.length})</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{paidAmount.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">Payées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dueAmount.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">À payer / Facturées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingAmount.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="due">À payer</SelectItem>
            <SelectItem value="invoiced">Facturée</SelectItem>
            <SelectItem value="paid">Payée</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous rôles</SelectItem>
            <SelectItem value="apporteur">Apporteur</SelectItem>
            <SelectItem value="setter">Setter</SelectItem>
            <SelectItem value="closer">Closer</SelectItem>
            <SelectItem value="agence_marketing">Agence marketing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BadgeEuro className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucune commission trouvée</p>
          <p className="text-sm text-muted-foreground mt-1">Modifiez vos filtres pour voir plus de résultats.</p>
        </div>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Bénéficiaire</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Vente</TableHead>
                <TableHead>Mensualité</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Paiement client</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Commission payée le</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const statusConf = STATUS_CONFIG[c.status || "pending"] || STATUS_CONFIG.pending;
                const StatusIcon = statusConf.icon;
                return (
                  <TableRow key={c.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <p className="font-medium text-foreground">{c.beneficiary_name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ROLE_COLORS[c.role] || ""}`}>
                        {c.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-foreground">{c.sale_product}</p>
                        <p className="text-xs text-muted-foreground">{c.contact_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {c.payment_number != null ? `${c.payment_number}/${c.total_payments}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(c.payment_due_date)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(c.payment_paid_at)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.percentage}%</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs gap-1 ${statusConf.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConf.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(c.paid_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit modal */}
      <Dialog open={!!editingCommission} onOpenChange={(v) => !v && setEditingCommission(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la commission</DialogTitle>
            <DialogDescription>
              {editingCommission && (
                <>
                  {editingCommission.beneficiary_name} — {editingCommission.sale_product}
                  {editingCommission.payment_number != null && (
                    <> (Mensualité {editingCommission.payment_number}/{editingCommission.total_payments})</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {editingCommission && (
            <div className="space-y-4">
              {/* Amount info */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-semibold text-foreground">
                    {editingCommission.amount?.toLocaleString("fr-FR")} € ({editingCommission.percentage}%)
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="due">À payer</SelectItem>
                    <SelectItem value="invoiced">Facturée</SelectItem>
                    <SelectItem value="paid">Payée</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Paid at date */}
              {editStatus === "paid" && (
                <div className="space-y-2">
                  <Label>Date de paiement</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editPaidAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editPaidAt ? format(editPaidAt, "d MMM yyyy", { locale: fr }) : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editPaidAt}
                        onSelect={setEditPaidAt}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingCommission(null)}>
                  Annuler
                </Button>
                <Button className="flex-1 gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
