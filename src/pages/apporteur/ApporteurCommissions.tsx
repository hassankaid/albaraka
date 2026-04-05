import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Euro, FileText, RefreshCw, Download, CheckCircle2, Clock, ArrowRight, Loader2, Eye, Users, Briefcase, TrendingUp } from "lucide-react";
import { fetchInvoiceHtml, downloadInvoicePdf } from "@/lib/downloadInvoicePdf";
import { toast } from "@/hooks/use-toast";
import InvoicePreviewModal from "@/components/InvoicePreviewModal";
import CommissionProjection from "@/components/commissions/CommissionProjection";
import { formatDateOnly } from "@/lib/formatDate";

interface CommissionRow {
  id: string;
  sale_id: string;
  role: string;
  percentage: number;
  amount: number | null;
  status: string | null;
  paid_at: string | null;
  client_name: string | null;
  payment_number: number | null;
  total_payments: number | null;
  payment_paid_at: string | null;
  payment_due_date: string | null;
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

const INVOICE_STATUS: Record<string, { label: string; class: string }> = {
  draft: { label: "Brouillon", class: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  generated: { label: "Générée", class: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  sent: { label: "Envoyée", class: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  paid: { label: "Payée", class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

// Map raw DB roles to source categories for filtering
const ROLE_SOURCE_CATEGORY: Record<string, string> = {
  apporteur: "apporteur",
  setter: "collaborateur",
  closer: "collaborateur",
  agence_marketing: "collaborateur",
  collaborateur: "collaborateur",
};

// Precise role labels for display on each commission line
const PRECISE_ROLE_LABELS: Record<string, string> = {
  apporteur: "Apporteur",
  setter: "Setter",
  closer: "Closer",
  agence_marketing: "Agence",
  collaborateur: "Collaborateur",
};

const SOURCE_FILTER_LABELS: Record<string, { label: string; class: string; icon: typeof Users }> = {
  apporteur: { label: "Apport d'affaires", class: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: Users },
  collaborateur: { label: "Collaborateur", class: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Briefcase },
};

function InvoiceActions({ pdfUrl, invoiceNumber, invoiceId }: { pdfUrl: string; invoiceNumber: string; invoiceId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async () => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const html = await fetchInvoiceHtml(pdfUrl);
      setPreviewHtml(html);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger la facture", variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoiceNumber, pdfUrl, invoiceId, { skipRegeneration: true });
    } catch {
      toast({ title: "Erreur", description: "Impossible de télécharger la facture", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={openPreview}>
          <Eye className="h-3 w-3 mr-1" />
          Voir
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
          {downloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
          PDF
        </Button>
      </div>
      <InvoicePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        invoiceNumber={invoiceNumber}
        htmlContent={previewHtml}
        loading={previewLoading}
        invoiceId={invoiceId}
        skipRegeneration
      />
    </>
  );
}

interface ApporteurCommissionsProps {
  /** If set, only show commissions for this role. Otherwise show all user's commissions. */
  defaultRoleFilter?: string;
}

export default function ApporteurCommissions({ defaultRoleFilter }: ApporteurCommissionsProps = {}) {
  const { profile } = useAuth();
  const [allCommissions, setAllCommissions] = useState<CommissionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [roleFilter, setRoleFilter] = useState<string>(defaultRoleFilter || "all");

  // History filters
  const now = new Date();
  const [historyYear, setHistoryYear] = useState(now.getFullYear());
  const [historyMonth, setHistoryMonth] = useState<string>("all");

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const userId = profile.id;

    let commissionsQuery = supabase.from("commissions")
      .select("*, sales!commissions_sale_id_fkey(contact_id, mensualites, contacts!sales_contact_id_fkey(full_name), leads!sales_lead_id_fkey(contacts!leads_contact_id_fkey(full_name))), payments!commissions_payment_id_fkey(payment_number, total_payments, paid_at, due_date)")
      .eq("beneficiary_user_id", userId)
      .order("created_at", { ascending: false });

    const [commissionsRes, invoicesRes] = await Promise.all([
      commissionsQuery,
      supabase.from("apporteur_invoices")
        .select("*")
        .eq("apporteur_id", userId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false }),
    ]);

    setAllCommissions(
      (commissionsRes.data || []).map((c: any) => ({
        id: c.id,
        sale_id: c.sale_id,
        role: c.role,
        percentage: c.percentage,
        amount: c.amount,
        status: c.status,
        paid_at: c.paid_at,
        client_name: c.sales?.contacts?.full_name || c.sales?.leads?.contacts?.full_name || null,
        payment_number: c.payments?.payment_number || null,
        total_payments: c.payments?.total_payments || c.sales?.mensualites || null,
        payment_paid_at: c.payments?.paid_at || null,
        payment_due_date: c.payments?.due_date || null,
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
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Detect available source categories (apporteur vs collaborateur)
  const availableCategories = useMemo(() => {
    const cats = new Set(allCommissions.map(c => ROLE_SOURCE_CATEGORY[c.role] || "collaborateur"));
    return Array.from(cats).sort();
  }, [allCommissions]);

  const showRoleFilter = availableCategories.length > 1 && !defaultRoleFilter;

  // Filter commissions by source category
  const filteredCommissions = useMemo(() => {
    const activeFilter = defaultRoleFilter || roleFilter;
    if (activeFilter === "all") return allCommissions;
    return allCommissions.filter(c => (ROLE_SOURCE_CATEGORY[c.role] || "collaborateur") === activeFilter);
  }, [allCommissions, roleFilter, defaultRoleFilter]);

  // ── KPIs ──
  const notCancelled = filteredCommissions.filter(c => c.status !== "cancelled");
  const uniqueSaleIds = new Set(notCancelled.map(c => c.sale_id));

  const totalPrevu = notCancelled.reduce((s, c) => s + (c.amount || 0), 0);
  const totalRecevoir = filteredCommissions.filter(c => ["due", "invoiced"].includes(c.status || "")).reduce((s, c) => s + (c.amount || 0), 0);
  const totalRecu = filteredCommissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = filteredCommissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.amount || 0), 0);
  const totalCancelled = filteredCommissions.filter(c => c.status === "cancelled").reduce((s, c) => s + (c.amount || 0), 0);
  const totalAll = totalRecu + totalRecevoir + totalPending + totalCancelled;

  // ── Prochaines commissions (dashboard) ──
  const upcoming = useMemo(() => {
    const dueItems = filteredCommissions
      .filter(c => ["due", "invoiced"].includes(c.status || ""))
      .sort((a, b) => (a.payment_due_date || "").localeCompare(b.payment_due_date || ""));
    const pendingItems = filteredCommissions
      .filter(c => c.status === "pending")
      .sort((a, b) => (a.payment_due_date || "").localeCompare(b.payment_due_date || ""));
    return [...dueItems, ...pendingItems];
  }, [filteredCommissions]);

  // ── History: paid commissions grouped by month ──
  const paidCommissions = useMemo(() => {
    return filteredCommissions
      .filter(c => c.status === "paid")
      .sort((a, b) => (b.paid_at || b.payment_paid_at || "").localeCompare(a.paid_at || a.payment_paid_at || ""));
  }, [filteredCommissions]);

  const filteredPaid = useMemo(() => {
    return paidCommissions.filter(c => {
      const dateStr = c.paid_at || c.payment_paid_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (d.getFullYear() !== historyYear) return false;
      if (historyMonth !== "all" && d.getMonth() !== Number(historyMonth)) return false;
      return true;
    });
  }, [paidCommissions, historyYear, historyMonth]);

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, CommissionRow[]> = {};
    filteredPaid.forEach(c => {
      const dateStr = c.paid_at || c.payment_paid_at;
      const d = new Date(dateStr!);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const [y, m] = key.split("-").map(Number);
        return { year: y, month: m, items, total: items.reduce((s, c) => s + (c.amount || 0), 0) };
      });
  }, [filteredPaid]);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Progress bar segments ──
  const progressSegments = totalAll > 0 ? [
    { color: "#22c55e", width: (totalRecu / totalAll) * 100 },
    { color: "#f59e0b", width: (totalRecevoir / totalAll) * 100 },
    { color: "#6b7280", width: (totalPending / totalAll) * 100 },
    { color: "#ef4444", width: (totalCancelled / totalAll) * 100 },
  ] : [];

  const renderRoleBadge = (role: string) => {
    const category = ROLE_SOURCE_CATEGORY[role] || "collaborateur";
    const info = SOURCE_FILTER_LABELS[category];
    if (!info) return null;
    const Icon = info.icon;
    const preciseLabel = PRECISE_ROLE_LABELS[role] || role;
    return (
      <Badge variant="outline" className={`text-xs ${info.class}`}>
        <Icon className="h-3 w-3 mr-1" />
        {preciseLabel}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-foreground">Commissions & Factures</h2>
        {showRoleFilter && (
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sources</SelectItem>
              {availableCategories.map(r => (
                <SelectItem key={r} value={r}>
                  {SOURCE_FILTER_LABELS[r]?.label || r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="projection" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Projection</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: DASHBOARD ═══ */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground">{totalPrevu.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">Total prévu ({uniqueSaleIds.size} vente{uniqueSaleIds.size > 1 ? "s" : ""})</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-orange-500/10 to-yellow-500/10">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground">{totalRecevoir.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">À recevoir</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground">{totalRecu.toLocaleString("fr-FR")} €</p>
                <p className="text-xs text-muted-foreground">Reçu</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress bar */}
          {totalAll > 0 && (
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-secondary">
                {progressSegments.map((seg, i) => (
                  seg.width > 0 && (
                    <div
                      key={i}
                      className="h-full transition-all"
                      style={{ width: `${seg.width}%`, backgroundColor: seg.color }}
                    />
                  )
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                  {totalRecu.toLocaleString("fr-FR")} € reçu
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  {totalRecevoir.toLocaleString("fr-FR")} € à recevoir
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b7280" }} />
                  {totalPending.toLocaleString("fr-FR")} € en attente
                </span>
              </div>
            </div>
          )}

          {/* Prochaines commissions */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Prochaines commissions</h3>
            {upcoming.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium">Aucune commission à venir</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 10).map((c) => {
                  const isDue = ["due", "invoiced"].includes(c.status || "");
                  return (
                    <Card key={c.id} className="border-border/50">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm truncate">{c.client_name || "—"}</span>
                            {showRoleFilter && renderRoleBadge(c.role)}
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              Mensualité {c.payment_number || "?"}/{c.total_payments || "?"}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {isDue && c.payment_paid_at
                                ? `Payée le ${formatDateOnly(c.payment_paid_at)}`
                                : c.payment_due_date
                                  ? `Échéance ${formatDateOnly(c.payment_due_date)}`
                                  : "—"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-foreground text-sm">
                            {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                          </span>
                          <Badge variant="outline" className={`text-xs whitespace-nowrap ${isDue
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }`}>
                            {isDue ? "À recevoir" : "En attente"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {upcoming.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setActiveTab("history")}
                  >
                    Voir tout <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </section>
        </TabsContent>

        {/* ═══ TAB: PROJECTION ═══ */}
        <TabsContent value="projection" className="mt-4">
          <CommissionProjection
            userId={profile?.id}
            roleSourceFilter={defaultRoleFilter || (roleFilter !== "all" ? roleFilter : undefined)}
          />
        </TabsContent>

        {/* ═══ TAB 2: HISTORIQUE ═══ */}
        <TabsContent value="history" className="space-y-6 mt-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={String(historyYear)} onValueChange={(v) => setHistoryYear(Number(v))}>
              <SelectTrigger className="w-28 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={historyMonth} onValueChange={setHistoryMonth}>
              <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {groupedByMonth.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Euro className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">Aucune commission reçue</p>
              </CardContent>
            </Card>
          ) : (
            groupedByMonth.map((group) => (
              <section key={`${group.year}-${group.month}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">
                    {MONTHS[group.month]} {group.year}
                  </h3>
                  <span className="text-sm font-semibold text-foreground">
                    Total : {group.total.toLocaleString("fr-FR")} €
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.items.map((c) => (
                    <Card key={c.id} className="border-border/50">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-foreground text-sm truncate">{c.client_name || "—"}</span>
                          {showRoleFilter && renderRoleBadge(c.role)}
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Mensualité {c.payment_number || "?"}/{c.total_payments || "?"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-foreground text-sm">
                            {c.amount != null ? `${c.amount.toLocaleString("fr-FR")} €` : "—"}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Reçu le {c.paid_at ? formatDateOnly(c.paid_at) : "—"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))
          )}
        </TabsContent>

        {/* ═══ TAB 3: FACTURES ═══ */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          {invoices.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">Aucune facture générée pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            invoices.map((inv) => {
              const statusInfo = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft;
              return (
                <Card key={inv.id} className="border-border/50">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {inv.invoice_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Période : {MONTHS[inv.period_month - 1]} {inv.period_year}
                        </p>
                        <p className="text-sm text-foreground font-medium">
                          Montant : {inv.total_amount.toLocaleString("fr-FR")} €
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${statusInfo.class}`}>{statusInfo.label}</Badge>
                    </div>
                    {inv.pdf_url && (
                      <InvoiceActions pdfUrl={inv.pdf_url} invoiceNumber={inv.invoice_number} invoiceId={inv.id} />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
