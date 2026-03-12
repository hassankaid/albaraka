import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BadgeEuro, RefreshCw, Plus, Settings } from "lucide-react";
import { formatDateOnly } from "@/lib/formatDate";
import NewSaleModal from "@/components/sales/NewSaleModal";
import ManageCommissionsModal from "@/components/sales/ManageCommissionsModal";
import SaleDetailModal from "@/components/sales/SaleDetailModal";

interface CeoSale {
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
}

interface UserCommission {
  id: string;
  role: string;
  percentage: number;
  amount: number | null;
  status: string | null;
  product: string;
  amount_ht: number;
  sold_at: string | null;
  contact_name: string | null;
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

const ROLE_COLORS: Record<string, string> = {
  apporteur: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  setter: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  closer: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  agence_marketing: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

export default function Sales() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isCeo = profile?.role === "ceo";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // CEO state
  const [ceoSales, setCeoSales] = useState<CeoSale[]>([]);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [commissionsModalSale, setCommissionsModalSale] = useState<CeoSale | null>(null);
  const [detailSale, setDetailSale] = useState<CeoSale | null>(null);

  // Non-CEO state
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

  // Stats
  const totalCA = isCeo
    ? ceoSales.reduce((s, v) => s + v.amount_ht, 0)
    : userCommissions.reduce((s, c) => s + (c.amount || 0), 0);
  const totalPaid = isCeo
    ? ceoSales.filter((v) => v.payment_status === "paid").reduce((s, v) => s + v.amount_ht, 0)
    : userCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + (c.amount || 0), 0);
  const count = isCeo ? ceoSales.length : userCommissions.length;

  const userTz = profile?.timezone || "Europe/Paris";
  const formatDate = (d: string | null) =>
    d ? formatDateOnly(d, userTz) : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ventes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isCeo ? "Toutes les ventes" : "Ventes avec vos commissions"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          {isCeo && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setNewSaleOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle vente
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50">
              <BadgeEuro className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{isCeo ? "Ventes" : "Commissions"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{totalCA.toLocaleString("fr-FR")} €</p>
            <p className="text-xs text-muted-foreground">{isCeo ? "CA total HT" : "Total commissions"}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{totalPaid.toLocaleString("fr-FR")} €</p>
            <p className="text-xs text-muted-foreground">Payé</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BadgeEuro className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">
            {isCeo ? "Aucune vente pour le moment" : "Aucune commission pour le moment"}
          </p>
        </div>
      ) : isCeo ? (
        /* CEO TABLE */
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Contact</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Montant HT</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Commissions</TableHead>
                <TableHead>Closer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ceoSales.map((sale) => (
                <TableRow key={sale.id} className="border-border hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setDetailSale(sale)}>
                   <TableCell>
                     <div>
                       <p className="font-semibold text-foreground">{sale.contact_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{sale.contact_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{sale.product}</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {sale.amount_ht.toLocaleString("fr-FR")} €
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${PAYMENT_COLORS[sale.payment_status || "pending"] || ""}`}>
                      {PAYMENT_LABELS[sale.payment_status || "pending"] || sale.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{sale.commission_count}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sale.closed_by_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(sale.sold_at)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setCommissionsModalSale(sale); }}>
                       <Settings className="h-4 w-4 mr-1" />
                       Commissions
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* NON-CEO TABLE */
        <Card className="border-border/50 overflow-hidden">
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
              {userCommissions.map((c) => (
                <TableRow key={c.id} className="border-border hover:bg-secondary/50 transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">{c.product}</p>
                      <p className="text-xs text-muted-foreground">{c.contact_name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.sold_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${ROLE_COLORS[c.role] || ""}`}>
                      {c.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">{c.percentage}%</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${PAYMENT_COLORS[c.status || "pending"] || ""}`}>
                      {c.status === "paid" ? "Payée" : "En attente"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
