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
  // collaborator-specific aggregated commission info
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
  paid: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
};

// ROLE_CONFIG imported from @/lib/roleConfig

const PAGE_SIZE = 50;

export default function Sales() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isCeo = profile?.role === "ceo";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [ceoSales, setCeoSales] = useState<CeoSale[]>([]);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [commissionsModalSale, setCommissionsModalSale] = useState<CeoSale | null>(null);
  const [detailSale, setDetailSale] = useState<CeoSale | null>(null);

  const [userCommissions, setUserCommissions] = useState<UserCommission[]>([]);

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
        setCeoSales(
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
          }))
        );
      }
    } else {
      const { data } = await supabase
        .from("commissions")
        .select(`
          id, role, percentage, amount, status,
          sales!commissions_sale_id_fkey(
            product, amount_ht, sold_at,
            contacts!sales_contact_id_fkey(full_name)
          )
        `)
        .eq("beneficiary_user_id", profile.id)
        .order("created_at", { ascending: false });

      if (data) {
        setUserCommissions(
          data
            .filter((c: any) => c.sales)
            .map((c: any) => ({
              id: c.id,
              role: c.role,
              percentage: c.percentage,
              amount: c.amount,
              status: c.status,
              product: c.sales.product,
              amount_ht: c.sales.amount_ht,
              sold_at: c.sales.sold_at,
              contact_name: c.sales.contacts?.full_name,
            }))
        );
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

  const filteredCeoSales = useMemo(() => {
    if (!search.trim()) return ceoSales;
    const q = search.toLowerCase();
    return ceoSales.filter((s) =>
      s.contact_name?.toLowerCase().includes(q) ||
      s.contact_email?.toLowerCase().includes(q) ||
      s.closed_by_name?.toLowerCase().includes(q) ||
      s.apporteur_name?.toLowerCase().includes(q) ||
      s.product.toLowerCase().includes(q)
    );
  }, [ceoSales, search]);

  const filteredCommissions = useMemo(() => {
    if (!search.trim()) return userCommissions;
    const q = search.toLowerCase();
    return userCommissions.filter((c) =>
      c.contact_name?.toLowerCase().includes(q) ||
      c.product.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
    );
  }, [userCommissions, search]);

  useEffect(() => { setPage(0); }, [search]);

  const items = isCeo ? filteredCeoSales : filteredCommissions;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginatedCeoSales = useMemo(() => filteredCeoSales.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredCeoSales, page]);
  const paginatedCommissions = useMemo(() => filteredCommissions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredCommissions, page]);

  const totalCA = isCeo
    ? filteredCeoSales.reduce((s, v) => s + v.amount_ht, 0)
    : filteredCommissions.reduce((s, c) => s + (c.amount || 0), 0);
  const totalPaid = isCeo
    ? filteredCeoSales.filter((v) => v.payment_status === "paid").reduce((s, v) => s + v.amount_ht, 0)
    : filteredCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + (c.amount || 0), 0);
  const count = items.length;

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
            <span className="text-xs text-muted-foreground">{isCeo ? "ventes" : "commissions"}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-sm font-bold text-foreground">{totalCA.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">{isCeo ? "CA HT" : "total"}</span>
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
          <p className="text-lg font-semibold text-foreground">
            {isCeo ? "Aucune vente pour le moment" : "Aucune commission pour le moment"}
          </p>
        </div>
      ) : isCeo ? (
        <>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[200px]">Contact</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Montant HT</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Commissions</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCeoSales.map((sale) => (
                  <TableRow key={sale.id} className="border-border hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setDetailSale(sale)}>
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
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{sale.commission_count}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sale.closed_by_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(sale.sold_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setCommissionsModalSale(sale); }}>
                        <Settings className="h-3.5 w-3.5" />
                        Com.
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredCeoSales.length)} sur {filteredCeoSales.length}
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
      ) : (
        <>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Vente</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mon rôle</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCommissions.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-secondary/50 transition-colors">
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">{c.product}</p>
                        <p className="text-xs text-muted-foreground">{c.contact_name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(c.sold_at)}</TableCell>
                    <TableCell>
                      {(() => {
                        const cfg = ROLE_CONFIG[c.role];
                        if (!cfg) return <span className="text-xs text-muted-foreground">{c.role}</span>;
                        const Icon = cfg.icon;
                        return (
                          <Badge variant="outline" className={`text-[10px] leading-tight ${cfg.class}`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{c.percentage}%</TableCell>
                    <TableCell className="font-semibold text-sm text-foreground">
                      {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] leading-tight ${PAYMENT_COLORS[c.status || "pending"] || ""}`}>
                        {c.status === "paid" ? "Payée" : "En attente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredCommissions.length)} sur {filteredCommissions.length}
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
