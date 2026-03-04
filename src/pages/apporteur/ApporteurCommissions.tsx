import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Euro, FileText, RefreshCw, Download } from "lucide-react";
import { formatDateOnly } from "@/lib/formatDate";

interface CommissionRow {
  id: string;
  sale_id: string;
  role: string;
  percentage: number;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  client_name: string | null;
  payment_number: number | null;
  total_payments: number | null;
  payment_amount: number | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  period_month: number;
  period_year: number;
  total_amount: number;
  status: string;
  pdf_url: string | null;
}

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const COMMISSION_STATUS: Record<string, { label: string; class: string }> = {
  pending: { label: "En attente", class: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  due: { label: "Due", class: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  invoiced: { label: "Facturée", class: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  paid: { label: "Payée", class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

const INVOICE_STATUS: Record<string, { label: string; class: string }> = {
  draft: { label: "Brouillon", class: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  generated: { label: "Générée", class: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  sent: { label: "Envoyée", class: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  paid: { label: "Payée", class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

export default function ApporteurCommissions() {
  const { profile } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const userId = profile.id;

    // Commissions with sale + contact info
    const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

    const [commissionsRes, invoicesRes] = await Promise.all([
      supabase.from("commissions")
        .select("*, sales!commissions_sale_id_fkey(product, amount_ht, contact_id, mensualites, contacts!sales_contact_id_fkey(full_name))")
        .eq("beneficiary_user_id", userId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false }),
      supabase.from("apporteur_invoices")
        .select("*")
        .eq("apporteur_id", userId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false }),
    ]);

    setCommissions(
      (commissionsRes.data || []).map((c: any) => ({
        id: c.id,
        sale_id: c.sale_id,
        role: c.role,
        percentage: c.percentage,
        amount: c.amount,
        status: c.status,
        created_at: c.created_at,
        client_name: c.sales?.contacts?.full_name || null,
        payment_number: null,
        total_payments: c.sales?.mensualites || null,
        payment_amount: c.sales?.amount_ht ? c.sales.amount_ht / (c.sales.mensualites || 1) : null,
      }))
    );

    setInvoices(
      (invoicesRes.data || []).map((i: any) => ({
        id: i.id,
        invoice_number: i.invoice_number,
        period_month: i.period_month,
        period_year: i.period_year,
        total_amount: i.total_amount,
        status: i.status,
        pdf_url: i.pdf_url,
      }))
    );

    setLoading(false);
  }, [profile, selectedMonth, selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalMonth = commissions.reduce((s, c) => s + (c.amount || 0), 0);
  const paidMonth = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.amount || 0), 0);
  const pendingMonth = totalMonth - paidMonth;

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Commissions & Factures</h2>

      <Tabs defaultValue="commissions">
        <TabsList className="bg-secondary">
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-6 mt-4">
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-28 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground">{totalMonth.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">Total du mois</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground">{paidMonth.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">Payées</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-orange-500/10 to-yellow-500/10">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground">{pendingMonth.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </CardContent>
            </Card>
          </div>

          {/* Commissions list */}
          {commissions.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Euro className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">Aucune commission ce mois</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Client</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c) => {
                    const statusInfo = COMMISSION_STATUS[c.status || "pending"] || COMMISSION_STATUS.pending;
                    return (
                      <TableRow key={c.id} className="border-border hover:bg-secondary/50 transition-colors">
                        <TableCell className="font-semibold text-foreground">{c.client_name || "—"}</TableCell>
                        <TableCell className="text-sm text-foreground">{c.percentage}%</TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusInfo.class}`}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.created_at ? formatDateOnly(c.created_at) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-border bg-secondary/30">
                    <TableCell className="font-semibold text-foreground">Total</TableCell>
                    <TableCell />
                    <TableCell className="font-bold text-foreground">{totalMonth.toLocaleString("fr-FR")} €</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6 mt-4">
          {invoices.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">Aucune facture pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const statusInfo = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft;
                    return (
                      <TableRow key={inv.id} className="border-border hover:bg-secondary/50 transition-colors">
                        <TableCell className="font-medium text-foreground">{inv.invoice_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {MONTHS[inv.period_month - 1]} {inv.period_year}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{inv.total_amount.toLocaleString("fr-FR")} €</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusInfo.class}`}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {inv.pdf_url ? (
                            <Button size="sm" variant="outline" asChild>
                              <a href={inv.pdf_url} target="_blank" rel="noreferrer">
                                <Download className="h-3 w-3 mr-1" />
                                PDF
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
