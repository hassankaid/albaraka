import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { FileText, Download, CheckCircle2, Trash2, RefreshCw, Loader2, Eye, Users, Euro, AlertCircle, CalendarDays, Clock } from "lucide-react";
import { fetchInvoiceHtml, downloadInvoicePdf } from "@/lib/downloadInvoicePdf";
import InvoicePreviewModal from "@/components/InvoicePreviewModal";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const INVOICE_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  generated: { label: "Générée", variant: "outline" },
  sent: { label: "Envoyée", variant: "default" },
  paid: { label: "Payée", variant: "default" },
};

interface BeneficiaryToInvoice {
  beneficiary_user_id: string;
  full_name: string;
  roles: string[];
  commission_count: number;
  total_amount: number;
  fixed_salary: number | null;
  fixed_salary_active: boolean;
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

/** The generation period is always the previous month. */
function getPreviousMonth() {
  const now = new Date();
  const m = now.getMonth(); // 0-indexed
  if (m === 0) return { month: 11, year: now.getFullYear() - 1 };
  return { month: m - 1, year: now.getFullYear() };
}

export default function AdminInvoices() {
  const { profile } = useAuth();
  const now = new Date();
  const prev = getPreviousMonth();

  // Generation — fixed to previous month
  const genMonth = prev.month;   // 0-indexed
  const genYear = prev.year;

  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryToInvoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);
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

  // Fetch all beneficiaries with due commissions OR fixed salary for the previous month
  const fetchBeneficiaries = useCallback(async () => {
    setLoadingBeneficiaries(true);
    const month = genMonth + 1;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? genYear + 1 : genYear;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    // Fetch commissions
    const { data, error } = await supabase
      .from("commissions")
      .select("beneficiary_user_id, amount, role, payments!commissions_payment_id_fkey(paid_at), profiles!commissions_beneficiary_user_id_fkey(full_name)")
      .eq("status", "due")
      .not("payment_id", "is", null);

    if (error) {
      console.error(error);
      setLoadingBeneficiaries(false);
      return;
    }

    const filtered = (data || []).filter((c: any) => {
      const paidAt = c.payments?.paid_at;
      return paidAt && paidAt < endDate;
    });

    const grouped: Record<string, BeneficiaryToInvoice> = {};
    filtered.forEach((c: any) => {
      const uid = c.beneficiary_user_id;
      if (!uid) return;
      if (!grouped[uid]) {
        grouped[uid] = {
          beneficiary_user_id: uid,
          full_name: c.profiles?.full_name || "Inconnu",
          roles: [],
          commission_count: 0,
          total_amount: 0,
          fixed_salary: null,
          fixed_salary_active: false,
        };
      }
      if (c.role && !grouped[uid].roles.includes(c.role)) {
        grouped[uid].roles.push(c.role);
      }
      grouped[uid].commission_count++;
      grouped[uid].total_amount += c.amount || 0;
    });

    // Fetch profiles with fixed salary active (to include even without commissions)
    const { data: salaryProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, fixed_salary, fixed_salary_active")
      .eq("fixed_salary_active", true);

    (salaryProfiles || []).forEach((p: any) => {
      if (!p.fixed_salary || p.fixed_salary <= 0) return;
      if (!grouped[p.id]) {
        grouped[p.id] = {
          beneficiary_user_id: p.id,
          full_name: p.full_name || "Inconnu",
          roles: [],
          commission_count: 0,
          total_amount: 0,
          fixed_salary: p.fixed_salary,
          fixed_salary_active: true,
        };
      } else {
        grouped[p.id].fixed_salary = p.fixed_salary;
        grouped[p.id].fixed_salary_active = true;
      }
      grouped[p.id].total_amount += Number(p.fixed_salary);
    });

    const list = Object.values(grouped).sort((a, b) => a.full_name.localeCompare(b.full_name));
    setBeneficiaries(list);
    setSelectedIds(new Set(list.map(a => a.beneficiary_user_id)));
    setLoadingBeneficiaries(false);
  }, [genMonth, genYear]);

  useEffect(() => { fetchBeneficiaries(); }, [fetchBeneficiaries]);

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
    if (selectedIds.size === beneficiaries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(beneficiaries.map(a => a.beneficiary_user_id)));
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

    fetchBeneficiaries();
    fetchInvoices();
  };

  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRow | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (inv: InvoiceRow) => {
    if (!inv.pdf_url) return;
    setPreviewInvoice(inv);
    setPreviewLoading(true);
    setPreviewHtml("");
    try {
      const html = await fetchInvoiceHtml(inv.pdf_url);
      setPreviewHtml(html);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger la facture", variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (inv: InvoiceRow) => {
    if (!inv.pdf_url) return;
    setDownloading(inv.id);
    try {
      const html = await fetchInvoiceHtml(inv.pdf_url);
      await downloadInvoicePdf(inv.invoice_number, html);
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
    fetchBeneficiaries();
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

  // Stats
  const totalCommAmount = beneficiaries.reduce((sum, a) => sum + a.total_amount, 0);
  const totalCommCount = beneficiaries.reduce((sum, a) => sum + a.commission_count, 0);

  const getRoleLabel = (roles: string[]) => {
    if (roles.length > 1) return "Multi-rôles";
    const map: Record<string, string> = { apporteur: "Apporteur", closer: "Closer", collaborateur: "Collaborateur" };
    return map[roles[0]] || roles[0];
  };
  const periodLabel = `${MONTHS[genMonth]} ${genYear}`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Facturation</h1>
        <p className="text-sm text-muted-foreground mt-1">Générez et gérez les factures de commissions pour tous les bénéficiaires</p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="generate" className="gap-2">
            <FileText className="h-4 w-4" />
            À facturer
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            Factures générées
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB: GENERATION                                    */}
        {/* ═══════════════════════════════════════════════════ */}
        <TabsContent value="generate" className="space-y-5">
          {/* Period indicator — read-only */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-3">
            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Période : <span className="text-primary font-semibold">{periodLabel}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Commissions à payer jusqu'à {periodLabel} inclus
              </p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={fetchBeneficiaries} disabled={loadingBeneficiaries}>
              <RefreshCw className={`h-4 w-4 ${loadingBeneficiaries ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loadingBeneficiaries ? (
            <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : beneficiaries.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground mb-1">Aucune facture à générer</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Il n'y a pas de commissions au statut « à payer » pour {periodLabel}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-border/50">
                  <CardContent className="py-4 px-5 flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{beneficiaries.length}</p>
                      <p className="text-xs text-muted-foreground">Bénéficiaire{beneficiaries.length > 1 ? "s" : ""}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="py-4 px-5 flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Euro className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalCommAmount.toLocaleString("fr-FR")} €</p>
                      <p className="text-xs text-muted-foreground">Montant total</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="py-4 px-5 flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <AlertCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalCommCount}</p>
                      <p className="text-xs text-muted-foreground">Commission{totalCommCount > 1 ? "s" : ""}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Beneficiaries table */}
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-12 pl-4">
                          <Checkbox
                            checked={selectedIds.size === beneficiaries.length}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Bénéficiaire</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="text-center">Commissions</TableHead>
                        <TableHead className="text-right pr-6">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {beneficiaries.map(a => (
                        <TableRow key={a.beneficiary_user_id} className="cursor-pointer" onClick={() => toggleSelect(a.beneficiary_user_id)}>
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(a.beneficiary_user_id)}
                              onCheckedChange={() => toggleSelect(a.beneficiary_user_id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{a.full_name}</TableCell>
                          <TableCell>
                            <Badge variant={a.roles.length > 1 ? "default" : "secondary"} className="text-xs">
                              {getRoleLabel(a.roles)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs tabular-nums">{a.commission_count}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-semibold tabular-nums">
                            {a.total_amount.toLocaleString("fr-FR")} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Progress bar */}
              {generating && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération en cours… {genProgress}/{genTotal}
                  </div>
                  <Progress value={(genProgress / genTotal) * 100} className="h-2" />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => generateInvoices(Array.from(selectedIds))}
                  disabled={generating || selectedIds.size === 0}
                  className="gradient-primary text-primary-foreground"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Générer ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateInvoices(beneficiaries.map(a => a.beneficiary_user_id))}
                  disabled={generating}
                >
                  Tout générer
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB: GENERATED INVOICES                            */}
        {/* ═══════════════════════════════════════════════════ */}
        <TabsContent value="history" className="space-y-5">
          {/* Filters bar */}
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
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="generated">Générée</SelectItem>
                <SelectItem value="sent">Envoyée</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Rechercher…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-48 bg-card"
            />
          </div>

          {/* Table */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              {loadingInvoices ? (
                <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" /> Chargement…
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune facture trouvée pour cette période.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Bénéficiaire</TableHead>
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
                        const isPaid = inv.status === "paid";
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.apporteur_name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{inv.invoice_number}</TableCell>
                            <TableCell className="text-sm">{MONTHS[inv.period_month - 1]} {inv.period_year}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{inv.total_amount.toLocaleString("fr-FR")} €</TableCell>
                            <TableCell>
                              <Badge
                                variant={statusInfo.variant}
                                className={isPaid ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : ""}
                              >
                                {isPaid && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {inv.pdf_url && (
                                  <Button size="icon" variant="ghost" onClick={() => openPreview(inv)} title="Voir">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {inv.pdf_url && (
                                  <Button size="icon" variant="ghost" onClick={() => handleDownload(inv)} title="Télécharger" disabled={downloading === inv.id}>
                                    {downloading === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                  </Button>
                                )}
                                {!isPaid && (
                                  <Button size="icon" variant="ghost" onClick={() => handleMarkPaid(inv)} title="Marquer payée" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500">
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
        </TabsContent>
      </Tabs>

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

      {/* ── PREVIEW MODAL ── */}
      <InvoicePreviewModal
        open={!!previewInvoice}
        onOpenChange={(open) => !open && setPreviewInvoice(null)}
        invoiceNumber={previewInvoice?.invoice_number || ""}
        htmlContent={previewHtml}
        loading={previewLoading}
      />
    </div>
  );
}
