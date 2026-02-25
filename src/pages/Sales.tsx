import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BadgeEuro, RefreshCw, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SaleRow {
  id: string;
  product: string;
  amount_ht: number;
  payment_status: string | null;
  sold_at: string | null;
  created_at: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  closed_by_name?: string | null;
  commission_amount?: number | null;
  commission_role?: string | null;
}

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
};

export default function Sales() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isCeo = profile?.role === "ceo";

  const fetchSales = useCallback(async () => {
    if (!profile) return;

    if (isCeo) {
      // CEO: fetch all sales with contact and closer info
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id, product, amount_ht, payment_status, sold_at, created_at,
          contacts!sales_contact_id_fkey(full_name, email),
          profiles!sales_closed_by_fkey(full_name)
        `)
        .order("sold_at", { ascending: false });

      if (!error && data) {
        setSales(
          data.map((s: any) => ({
            id: s.id,
            product: s.product,
            amount_ht: s.amount_ht,
            payment_status: s.payment_status,
            sold_at: s.sold_at,
            created_at: s.created_at,
            contact_name: s.contacts?.full_name,
            contact_email: s.contacts?.email,
            closed_by_name: s.profiles?.full_name,
          }))
        );
      }
    } else {
      // Collaborateur/Apporteur: fetch only sales where they have a commission
      const { data, error } = await supabase
        .from("commissions")
        .select(`
          amount, role,
          sales!commissions_sale_id_fkey(
            id, product, amount_ht, payment_status, sold_at, created_at,
            contacts!sales_contact_id_fkey(full_name, email)
          )
        `)
        .eq("beneficiary_user_id", profile.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSales(
          data
            .filter((c: any) => c.sales)
            .map((c: any) => ({
              id: c.sales.id,
              product: c.sales.product,
              amount_ht: c.sales.amount_ht,
              payment_status: c.sales.payment_status,
              sold_at: c.sales.sold_at,
              created_at: c.sales.created_at,
              contact_name: c.sales.contacts?.full_name,
              contact_email: c.sales.contacts?.email,
              commission_amount: c.amount,
              commission_role: c.role,
            }))
        );
      }
    }

    setLoading(false);
  }, [profile, isCeo]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSales();
    setRefreshing(false);
    toast({ title: "Données actualisées" });
  };

  const totalHT = sales.reduce((sum, s) => sum + s.amount_ht, 0);
  const totalPaid = sales.filter((s) => s.payment_status === "paid").reduce((sum, s) => sum + s.amount_ht, 0);

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
            <Button size="sm" className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle vente
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50">
              <BadgeEuro className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sales.length}</p>
              <p className="text-xs text-muted-foreground">Ventes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{totalHT.toLocaleString("fr-FR")} €</p>
            <p className="text-xs text-muted-foreground">Total HT</p>
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
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BadgeEuro className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucune vente pour le moment</p>
        </div>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Contact</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Montant HT</TableHead>
                <TableHead>Paiement</TableHead>
                {!isCeo && <TableHead>Commission</TableHead>}
                {isCeo && <TableHead>Closer</TableHead>}
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id} className="border-border hover:bg-secondary/50 transition-colors">
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
                  {!isCeo && (
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">
                          {sale.commission_amount != null ? `${sale.commission_amount.toLocaleString("fr-FR")} €` : "—"}
                        </p>
                        {sale.commission_role && (
                          <p className="text-xs text-muted-foreground">{sale.commission_role}</p>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isCeo && (
                    <TableCell className="text-sm text-muted-foreground">
                      {sale.closed_by_name || "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {sale.sold_at
                      ? format(new Date(sale.sold_at), "dd MMM yyyy", { locale: fr })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
