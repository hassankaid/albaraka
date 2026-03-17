import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BadgeEuro, RefreshCw, Plus, Settings, Search, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { ROLE_CONFIG } from "@/lib/roleConfig";
import { formatDateOnly } from "@/lib/formatDate";
import NewSaleModal from "@/components/sales/NewSaleModal";
import ManageCommissionsModal from "@/components/sales/ManageCommissionsModal";
import SaleDetailModal from "@/components/sales/SaleDetailModal";

interface SaleRow {
  id: string;
  product: string;
  amount_ht: number;
  payment_status: string | null;
  sold_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  closed_by_name: string | null;
  apporteur_name: string | null;
  commission_count: number;
  // collaborator-specific
  my_commission_total: number;
  my_commission_paid: number;
  my_roles: string[];
}

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
  refunded: "bg-red-500/20 text-red-300 border-red-500/30",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  paid: "Payé",
  late: "En retard",
  lost: "Perdu",
  failed: "Échoué",
  refunded: "Remboursé",
};

const PAYMENT_COLORS: Record<string, string> = {
  ...{
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    late: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    lost: "bg-red-500/20 text-red-300 border-red-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
    refunded: "bg-red-500/20 text-red-300 border-red-500/30",
  }
};

const PAGE_SIZE = 50;

export default function Sales() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isCeo = profile?.role === "ceo";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [commissionsModalSale, setCommissionsModalSale] = useState<SaleRow | null>(null);
  const [detailSale, setDetailSale] = useState<SaleRow | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile) return;

    if (isCeo) {
      const { data } = await supabase
        .from("sales")
        .select(`
          id, product, amount_ht, payment_status, sold_at,
          contacts!sales_contact_id_fkey(full_name, email),
          profiles!sales_closed_by_fkey(full_name),
          leads!sales_lead_id_fkey(profiles!leads_apporteur_id_fkey(full_name)),
          commissions(id)
        `)
        .order("sold_at", { ascending: false });

      if (data) {
        setSales(
          data.map((s: any) => ({
            id: s.id,
            product: s.product,
            amount_ht: s.amount_ht,
            payment_status: s.payment_status,
            sold_at: s.sold_at,
            contact_name: s.contacts?.full_name,
            contact_email: s.contacts?.email,
            closed_by_name: s.profiles?.full_name,
            apporteur_name: s.leads?.profiles?.full_name || null,
            commission_count: s.commissions?.length || 0,
            my_commission_total: 0,
            my_commission_paid: 0,
            my_roles: [],
          }))
        );
      }
    } else {
      // Fetch commissions for the current user, grouped by sale
      const { data } = await supabase
        .from("commissions")
        .select(`
          id, role, percentage, amount, status,
          sales!commissions_sale_id_fkey(
            id, product, amount_ht, sold_at, payment_status,
            contacts!sales_contact_id_fkey(full_name, email),
            profiles!sales_closed_by_fkey(full_name)
          )
        `)
        .eq("beneficiary_user_id", profile.id)
        .order("created_at", { ascending: false });

      if (data) {
        // Group commissions by sale_id
        const salesMap = new Map<string, SaleRow>();
        for (const c of data as any[]) {
          if (!c.sales) continue;
          const saleId = c.sales.id;
          if (!salesMap.has(saleId)) {
            salesMap.set(saleId, {
              id: saleId,
              product: c.sales.product,
              amount_ht: c.sales.amount_ht,
              payment_status: c.sales.payment_status,
              sold_at: c.sales.sold_at,
              contact_name: c.sales.contacts?.full_name || null,
              contact_email: c.sales.contacts?.email || null,
              closed_by_name: c.sales.profiles?.full_name || null,
              apporteur_name: null,
              commission_count: 0,
              my_commission_total: 0,
              my_commission_paid: 0,
              my_roles: [],
            });
          }
          const row = salesMap.get(saleId)!;
          row.commission_count += 1;
          row.my_commission_total += c.amount || 0;
          if (c.status === "paid") {
            row.my_commission_paid += c.amount || 0;
          }
          if (c.role && !row.my_roles.includes(c.role)) {
            row.my_roles.push(c.role);
          }
        }
        // Sort by sold_at desc
        const sorted = Array.from(salesMap.values()).sort((a, b) => {
          if (!a.sold_at && !b.sold_at) return 0;
          if (!a.sold_at) return 1;
          if (!b.sold_at) return -1;
          return new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime();
        });
        setSales(sorted);
      }
    }
    setLoading(false);
  }, [profile, isCeo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({ title: "Données actualisées" });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter((s) =>
      s.contact_name?.toLowerCase().includes(q) ||
      s.contact_email?.toLowerCase().includes(q) ||
      s.closed_by_name?.toLowerCase().includes(q) ||
      s.apporteur_name?.toLowerCase().includes(q) ||
      s.product.toLowerCase().includes(q)
    );
  }, [sales, search]);

  useEffect(() => { setPage(0); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  const totalCA = isCeo
    ? filtered.reduce((s, v) => s + v.amount_ht, 0)
    : filtered.reduce((s, v) => s + v.my_commission_total, 0);
  const totalPaid = isCeo
    ? filtered.filter((v) => v.payment_status === "paid").reduce((s, v) => s + v.amount_ht, 0)
    : filtered.reduce((s, v) => s + v.my_commission_paid, 0);
  const count = filtered.length;

  const userTz = profile?.timezone || "Europe/Paris";
  const formatDate = (d: string | null) => d ? formatDateOnly(d, userTz) : "—";

  return (
    <div className="space-y-4">
      {/* Top bar: KPIs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <BadgeEuro className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-sm font-bold text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">ventes</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-sm font-bold text-foreground">{totalCA.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">{isCeo ? "CA HT" : "mes commissions"}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-sm font-bold text-emerald-400">{totalPaid.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">payé</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCeo && (
            <Button size="sm" className="gradient-primary text-primary-foreground text-xs gap-1.5" onClick={() => setNewSaleOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nouvelle vente
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={refreshing} title="Actualiser">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
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
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucune vente pour le moment</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[200px]">Contact</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Montant HT</TableHead>
                  <TableHead>Paiement</TableHead>
                  {isCeo ? (
                    <>
                      <TableHead>Commissions</TableHead>
                      <TableHead>Closer</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Mes rôles</TableHead>
                      <TableHead>Ma commission</TableHead>
                    </>
                  )}
                  <TableHead>Date</TableHead>
                  {isCeo && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => setDetailSale(sale)}
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{sale.contact_name || "—"}</p>
                        {sale.contact_email && <p className="text-xs text-muted-foreground truncate">{sale.contact_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{sale.product}</TableCell>
                    <TableCell className="font-semibold text-sm text-foreground">{sale.amount_ht.toLocaleString("fr-FR")} €</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] leading-tight ${PAYMENT_COLORS[sale.payment_status || "pending"] || ""}`}>
                        {PAYMENT_LABELS[sale.payment_status || "pending"] || sale.payment_status}
                      </Badge>
                    </TableCell>
                    {isCeo ? (
                      <>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{sale.commission_count}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{sale.closed_by_name || "—"}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {sale.my_roles.map((role) => {
                              const cfg = ROLE_CONFIG[role];
                              if (!cfg) return <Badge key={role} variant="outline" className="text-[10px]">{role}</Badge>;
                              const Icon = cfg.icon;
                              return (
                                <Badge key={role} variant="outline" className={`text-[10px] leading-tight ${cfg.class}`}>
                                  <Icon className="h-3 w-3 mr-1" />{cfg.label}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground">{sale.my_commission_total.toLocaleString("fr-FR")} €</p>
                            {sale.my_commission_paid > 0 && (
                              <p className="text-[10px] text-emerald-400">{sale.my_commission_paid.toLocaleString("fr-FR")} € payé</p>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-xs text-muted-foreground">{formatDate(sale.sold_at)}</TableCell>
                    {isCeo && (
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setCommissionsModalSale(sale); }}>
                          <Settings className="h-3.5 w-3.5" />
                          Com.
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
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

      {/* Modals */}
      <NewSaleModal open={newSaleOpen} onOpenChange={setNewSaleOpen} onCreated={fetchData} />
      <ManageCommissionsModal
        open={!!commissionsModalSale}
        onOpenChange={(v) => !v && setCommissionsModalSale(null)}
        saleId={commissionsModalSale?.id || null}
        saleAmountHt={commissionsModalSale?.amount_ht || 0}
        saleProduct={commissionsModalSale?.product || ""}
        onUpdated={fetchData}
      />
      <SaleDetailModal
        open={!!detailSale}
        onOpenChange={(v) => !v && setDetailSale(null)}
        saleId={detailSale?.id || null}
        saleProduct={detailSale?.product || ""}
        saleAmountHt={detailSale?.amount_ht || 0}
        contactName={detailSale?.contact_name || ""}
        onUpdated={fetchData}
      />
    </div>
  );
}
