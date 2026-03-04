import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { FileText, Download, CheckCircle2, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { downloadInvoicePdf } from "@/lib/downloadInvoicePdf";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const INVOICE_STATUS: Record<string, { label: string; class: string }> = {
  draft: { label: "Brouillon", class: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  generated: { label: "Générée", class: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  sent: { label: "Envoyée", class: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  paid: { label: "Payée", class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

interface ApporteurToInvoice {
  beneficiary_user_id: string;
  full_name: string;
  commission_count: number;
  total_amount: number;
}

interface InvoiceRow {
  id: string;
  apporteur_id: string;
  apporteur_name: string;
  invoice_number: string;
  period_month: number;
  period_year: number;
  total_amount: number;
  status: string;
  pdf_url: string | null;
  generated_at: string | null;
  paid_at: string | null;
}

export default function AdminInvoices() {
  const { profile } = useAuth();
  const now = new Date();

  // Generation section state
  const [genMonth, setGenMonth] = useState(now.getMonth()); // 0-indexed for display, will +1 for query
  const [genYear, setGenYear] = useState(now.getFullYear());
  const [apporteurs, setApporteurs] = useState<ApporteurToInvoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingApporteurs, setLoadingApporteurs] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genTotal, setGenTotal] = useState(0);

  // Invoice list state
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");

  // Delete modal
  const [deleteInvoice, setDeleteInvoice] = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  // Fetch apporteurs with due commissions for selected period
  const fetchApporteurs = useCallback(async () => {
    setLoadingApporteurs(true);
    const month = genMonth + 1;
    const startDate = `${genYear}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? genYear + 1 : genYear;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("commissions")
      .select("beneficiary_user_id, amount, payments!commissions_payment_id_fkey(paid_at), profiles!commissions_beneficiary_user_id_fkey(full_name)")
      .eq("role", "apporteur")
      .eq("status", "due")
      .not("payment_id", "is", null);

    if (error) {
      console.error(error);
      setLoadingApporteurs(false);
      return;
    }

    // Filter by payment date in period
    const filtered = (data || []).filter((c: any) => {
      const paidAt = c.payments?.paid_at;
      return paidAt && paidAt >= startDate && paidAt < endDate;
    });

    // Group by apporteur
    const grouped: Record<string, ApporteurToInvoice> = {};
    filtered.forEach((c: any) => {
      const uid = c.beneficiary_user_id;
      if (!uid) return;
      if (!grouped[uid]) {
        grouped[uid] = {
          beneficiary_user_id: uid,
          full_name: c.profiles?.full_name || "Inconnu",
          commission_count: 0,
          total_amount: 0,
        };
      }
      grouped[uid].commission_count++;
      grouped[uid].total_amount += c.amount || 0;
    });

    const list = Object.values(grouped).sort((a, b) => a.full_name.localeCompare(b.full_name));
    setApporteurs(list);
    setSelectedIds(new Set(list.map(a => a.beneficiary_user_id)));
    setLoadingApporteurs(false);
  }, [genMonth, genYear]);

  useEffect(() => { fetchApporteurs(); }, [fetchApporteurs]);

  // Fetch all invoices
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    const { data, error } = await supabase
      .from("apporteur_invoices")
      .select("*, profiles!apporteur_invoices_apporteur_id_fkey(full_name)")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setInvoices((data || []).map((inv: any) => ({
        id: inv.id,
        apporteur_id: inv.apporteur_id,
        apporteur_name: inv.profiles?.full_name || "Inconnu",
        invoice_number: inv.invoice_number,
        period_month: inv.period_month,
        period_year: inv.period_year,
        total_amount: inv.total_amount,
        status: inv.status,
        pdf_url: inv.pdf_url,
        generated_at: inv.generated_at,
        paid_at: inv.paid_at,
      })));
    }
    setLoadingInvoices(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === apporteurs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(apporteurs.map(a => a.beneficiary_user_id)));
    }
  };

  const generateInvoices = async (ids: string[]) => {
    if (ids.length === 0) return;
    setGenerating(true);
    setGenProgress(0);
    setGenTotal(ids.length);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const { data, error } = await supabase.functions.invoke("generate-apporteur-invoice", {
        body: { apporteur_id: ids[i], month: genMonth + 1, year: genYear },
      });

      if (error || data?.error) {
        errorCount++;
        const errMsg = data?.error || error?.message || "Erreur inconnue";
        if (errMsg !== "Invoice already exists for this period") {
          console.error(`Error for ${ids[i]}:`, errMsg);
        }
      } else {
        successCount++;
      }
      setGenProgress(i + 1);
    }

    setGenerating(false);
    toast({
      title: "Génération terminée",
      description: `${successCount} facture(s) générée(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}`,
    });

    fetchApporteurs();
    fetchInvoices();
  };

  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (inv: InvoiceRow) => {
    if (!inv.pdf_url) return;
    setDownloading(inv.id);
    try {
      await downloadInvoicePdf(inv.pdf_url, inv.invoice_number);
    } catch {
      toast({ title: "Erreur", description: "Impossible de télécharger la facture", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const handleMarkPaid = async (inv: InvoiceRow) => {
    const { error } = await supabase
      .from("apporteur_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", inv.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Facture marquée payée" });
    fetchInvoices();
  };

  const handleDelete = async () => {
    if (!deleteInvoice) return;
    setDeleting(true);

    const { data, error } = await supabase.functions.invoke("delete-apporteur-invoice", {
      body: { invoice_id: deleteInvoice.id },
    });

    setDeleting(false);
    setDeleteInvoice(null);

    if (error || data?.error) {
      toast({ title: "Erreur", description: data?.error || error?.message, variant: "destructive" });
      return;
    }

    toast({ title: "Facture supprimée", description: "Les commissions ont été remises en statut 'due'." });
    fetchApporteurs();
    fetchInvoices();
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterMonth !== "all" && inv.period_month !== Number(filterMonth) + 1) return false;
    if (inv.period_year !== filterYear) return false;
    if (filterSearch && !inv.apporteur_name.toLowerCase().includes(filterSearch.toLowerCase()) && !inv.invoice_number.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* ── GENERATION SECTION ── */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Générer les factures
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mois :</span>
              <Select value={String(genMonth)} onValueChange={(v) => setGenMonth(Number(v))}>
                <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Année :</span>
              <Select value={String(genYear)} onValueChange={(v) => setGenYear(Number(v))}>
                <SelectTrigger className="w-24 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingApporteurs ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Chargement...
            </div>
          ) : apporteurs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucun apporteur avec des commissions à facturer pour cette période.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Apporteurs avec commissions à facturer :
              </p>
              <div className="space-y-2 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Checkbox
                    checked={selectedIds.size === apporteurs.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium text-foreground">Tout sélectionner</span>
                </div>
                {apporteurs.map(a => (
                  <div key={a.beneficiary_user_id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(a.beneficiary_user_id)}
                        onCheckedChange={() => toggleSelect(a.beneficiary_user_id)}
                      />
                      <span className="text-sm text-foreground font-medium">{a.full_name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {a.total_amount.toLocaleString("fr-FR")} € ({a.commission_count} commission{a.commission_count > 1 ? "s" : ""})
                    </span>
                  </div>
                ))}
              </div>

              {generating && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération en cours... {genProgress}/{genTotal}
                  </div>
                  <Progress value={(genProgress / genTotal) * 100} className="h-2" />
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => generateInvoices(Array.from(selectedIds))}
                  disabled={generating || selectedIds.size === 0}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Générer les factures sélectionnées ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateInvoices(apporteurs.map(a => a.beneficiary_user_id))}
                  disabled={generating}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Générer TOUTES les factures du mois
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── INVOICE LIST ── */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Factures générées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
              <SelectTrigger className="w-24 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="generated">Générée</SelectItem>
                <SelectItem value="sent">Envoyée</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Rechercher..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-48 bg-card"
            />
          </div>

          {loadingInvoices ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" /> Chargement...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune facture trouvée.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apporteur</TableHead>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map(inv => {
                    const statusInfo = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.apporteur_name}</TableCell>
                        <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                        <TableCell>{MONTHS[inv.period_month - 1]} {inv.period_year}</TableCell>
                        <TableCell className="text-right font-semibold">{inv.total_amount.toLocaleString("fr-FR")} €</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusInfo.class}`}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {inv.pdf_url && (
                              <Button size="icon" variant="ghost" onClick={() => handleDownload(inv)} title="Télécharger" disabled={downloading === inv.id}>
                                {downloading === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                            )}
                            {inv.status !== "paid" && (
                              <Button size="icon" variant="ghost" onClick={() => handleMarkPaid(inv)} title="Marquer payée" className="text-emerald-400 hover:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => setDeleteInvoice(inv)} title="Supprimer" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <Dialog open={!!deleteInvoice} onOpenChange={(open) => !open && setDeleteInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la facture</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer la facture <strong>{deleteInvoice?.invoice_number}</strong> ?
              Les commissions associées repasseront en statut "due".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteInvoice(null)} disabled={deleting}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
