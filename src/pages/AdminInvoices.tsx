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
import { FileText, Download, CheckCircle2, Trash2, RefreshCw, Loader2, Eye, Users, Euro, AlertCircle, CalendarDays, Clock, Settings2, CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { buildInvoicePdfBlobUrl, downloadInvoicePdf, generateInvoicePdfBlob } from "@/lib/downloadInvoicePdf";
import InvoicePreviewModal from "@/components/InvoicePreviewModal";
import JSZip from "jszip";
import CommissionDetailModal from "@/components/invoices/CommissionDetailModal";

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
  bank_rib_url: string | null;
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
  bank_rib_url: string | null;
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

  // Bulk delete
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [bulkDeleteTotal, setBulkDeleteTotal] = useState(0);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Bulk download
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);
  const [bulkDownloadTotal, setBulkDownloadTotal] = useState(0);

  // RIB viewer
  const [ribViewerOpen, setRibViewerOpen] = useState(false);
  const [ribViewerBlobUrl, setRibViewerBlobUrl] = useState<string | null>(null);
  const [ribViewerName, setRibViewerName] = useState("");
  const [ribViewerLoading, setRibViewerLoading] = useState(false);
  const [ribViewerExt, setRibViewerExt] = useState("");
  const [ribViewerTextContent, setRibViewerTextContent] = useState<string | null>(null);

  // Commission detail modal
  const [commDetailBeneficiary, setCommDetailBeneficiary] = useState<BeneficiaryToInvoice | null>(null);

  // Fixed salary modal
  interface SalaryProfile { id: string; full_name: string; role: string; salary_period_id: string | null; amount: number | null; start_date: string | null; end_date: string | null; }
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryProfiles, setSalaryProfiles] = useState<SalaryProfile[]>([]);
  const [loadingSalaries, setLoadingSalaries] = useState(false);

  const fetchSalaryProfiles = useCallback(async () => {
    setLoadingSalaries(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["collaborateur", "agence"])
      .order("full_name");

    // Fetch active salary periods (no end_date or end_date >= today)
    const today = new Date().toISOString().slice(0, 10);
    const { data: periods } = await (supabase.from("salary_periods" as any) as any)
      .select("id, profile_id, amount, start_date, end_date");

    const activePeriods = ((periods || []) as any[]).filter((sp) => !sp.end_date || sp.end_date >= today);
    const periodMap = new Map(activePeriods.map((sp) => [sp.profile_id, sp]));

    const merged = ((profiles || []) as any[]).map((p) => {
      const sp = periodMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        salary_period_id: sp?.id || null,
        amount: sp?.amount || null,
        start_date: sp?.start_date || null,
        end_date: sp?.end_date || null,
      };
    });
    setSalaryProfiles(merged);
    setLoadingSalaries(false);
  }, []);

  const updateSalary = async (profileId: string, amount: number | null) => {
    const profile = salaryProfiles.find(p => p.id === profileId);
    if (!profile) return;

    const today = new Date().toISOString().slice(0, 10);

    if (amount && amount > 0) {
      if (profile.salary_period_id) {
        // Update existing period
        const { error } = await (supabase.from("salary_periods" as any) as any).update({ amount }).eq("id", profile.salary_period_id);
        if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      } else {
        // Create new period
        const { error } = await (supabase.from("salary_periods" as any) as any).insert({ profile_id: profileId, amount, start_date: today });
        if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      }
    } else if (profile.salary_period_id) {
      // Deactivate: set end_date to today
      const { error } = await (supabase.from("salary_periods" as any) as any).update({ end_date: today }).eq("id", profile.salary_period_id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    }

    fetchSalaryProfiles();
    fetchBeneficiaries();
  };

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
      .select("beneficiary_user_id, amount, role, payments!commissions_payment_id_fkey(paid_at), profiles!commissions_beneficiary_user_id_fkey(full_name, bank_rib_url)")
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
          bank_rib_url: (c.profiles as any)?.bank_rib_url || null,
        };
      }
      if (c.role && !grouped[uid].roles.includes(c.role)) {
        grouped[uid].roles.push(c.role);
      }
      grouped[uid].commission_count++;
      grouped[uid].total_amount += c.amount || 0;
    });

    // Fetch active salary periods for this invoice period
    const periodStart = `${genYear}-${String(month).padStart(2, "0")}-01`;
    const periodEndMonth = month === 12 ? 1 : month + 1;
    const periodEndYear = month === 12 ? genYear + 1 : genYear;
    const periodEnd = `${periodEndYear}-${String(periodEndMonth).padStart(2, "0")}-01`;

    const { data: salaryPeriodsData } = await (supabase.from("salary_periods" as any) as any)
      .select("id, profile_id, amount, start_date, end_date");

    // Filter salary periods active during the invoice month
    const activeSalaryPeriods = ((salaryPeriodsData || []) as any[]).filter((sp: any) => {
      return sp.amount > 0 && sp.start_date < periodEnd && (!sp.end_date || sp.end_date >= periodStart);
    });

    const salaryUserIds = activeSalaryPeriods.map((sp: any) => sp.profile_id);
    let alreadyInvoicedIds = new Set<string>();
    if (salaryUserIds.length > 0) {
      const { data: existingInvoices } = await supabase
        .from("apporteur_invoices")
        .select("apporteur_id")
        .eq("period_month", month)
        .eq("period_year", genYear)
        .in("apporteur_id", salaryUserIds);
      alreadyInvoicedIds = new Set((existingInvoices || []).map((inv: any) => inv.apporteur_id));
    }

    // Get profile info for salary beneficiaries
    const salaryProfileIds = [...new Set(salaryUserIds)];
    let salaryProfileMap = new Map<string, any>();
    if (salaryProfileIds.length > 0) {
      const { data: spProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, role, bank_rib_url")
        .in("id", salaryProfileIds);
      (spProfiles || []).forEach((p: any) => salaryProfileMap.set(p.id, p));
    }

    activeSalaryPeriods.forEach((sp: any) => {
      const profileId = sp.profile_id;
      if (alreadyInvoicedIds.has(profileId)) return;
      const prof = salaryProfileMap.get(profileId);
      if (!grouped[profileId]) {
        grouped[profileId] = {
          beneficiary_user_id: profileId,
          full_name: prof?.full_name || "Inconnu",
          roles: [prof?.role || "collaborateur"],
          commission_count: 0,
          total_amount: 0,
          fixed_salary: sp.amount,
          fixed_salary_active: true,
          bank_rib_url: prof?.bank_rib_url || null,
        };
      } else {
        if (grouped[profileId].roles.length === 0 && prof?.role) {
          grouped[profileId].roles.push(prof.role);
        }
        grouped[profileId].fixed_salary = sp.amount;
        grouped[profileId].fixed_salary_active = true;
        if (!grouped[profileId].bank_rib_url) grouped[profileId].bank_rib_url = prof?.bank_rib_url || null;
      }
      grouped[profileId].total_amount += Number(sp.amount);
    });

    const list = Object.values(grouped).sort((a, b) => a.full_name.localeCompare(b.full_name));
    setBeneficiaries(list);
    setSelectedIds(new Set());
    setLoadingBeneficiaries(false);
  }, [genMonth, genYear]);

  useEffect(() => { fetchBeneficiaries(); }, [fetchBeneficiaries]);

  // Fetch all invoices
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    const { data, error } = await supabase
      .from("apporteur_invoices")
      .select("*, profiles!apporteur_invoices_apporteur_id_fkey(full_name, bank_rib_url)")
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
        bank_rib_url: inv.profiles?.bank_rib_url || null,
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
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (inv: InvoiceRow) => {
    setPreviewInvoice(inv);
    setPreviewLoading(true);
    setPreviewPdfUrl("");
    try {
      const url = await buildInvoicePdfBlobUrl(inv.id);
      setPreviewPdfUrl(url);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger la facture", variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewInvoice(null);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl("");
    }
  };

  const handleDownload = async (inv: InvoiceRow) => {
    if (!inv.pdf_url) return;
    setDownloading(inv.id);
    try {
      await downloadInvoicePdf(inv.invoice_number, inv.pdf_url, inv.id);
      } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossible de télécharger la facture";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
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

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedInvoiceIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    setBulkDeleteProgress(0);
    setBulkDeleteTotal(ids.length);
    setShowBulkDeleteConfirm(false);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const { data, error } = await supabase.functions.invoke("delete-apporteur-invoice", {
        body: { invoice_id: ids[i] },
      });
      if (error || data?.error) {
        errorCount++;
      } else {
        successCount++;
      }
      setBulkDeleteProgress(i + 1);
    }

    setBulkDeleting(false);
    setSelectedInvoiceIds(new Set());
    toast({
      title: "Suppression terminée",
      description: `${successCount} facture(s) supprimée(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}. Commissions remises en "due".`,
    });
    fetchBeneficiaries();
    fetchInvoices();
  };

  const handleBulkDownload = async (invoicesToDownload: InvoiceRow[]) => {
    const withPdf = invoicesToDownload.filter(inv => inv.pdf_url);
    if (withPdf.length === 1) {
  setBulkDownloading(true);
  setBulkDownloadProgress(0);
  setBulkDownloadTotal(1);
  try {
    await downloadInvoicePdf(withPdf[0].invoice_number, withPdf[0].pdf_url!, withPdf[0].id);
    setBulkDownloadProgress(1);
    toast({ title: "Téléchargement terminé", description: "1 facture téléchargée" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Impossible de télécharger la facture";
    toast({ title: "Erreur", description: msg, variant: "destructive" });
  }
  setBulkDownloading(false);
  return;
}

    setBulkDownloading(true);
    setBulkDownloadProgress(0);
    setBulkDownloadTotal(withPdf.length);

    const zip = new JSZip();
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < withPdf.length; i++) {
  try {
    const blob = await generateInvoicePdfBlob(
      withPdf[i].invoice_number,
      withPdf[i].pdf_url!,
      withPdf[i].id
    );
    zip.file(`${withPdf[i].invoice_number}.pdf`, blob);
    successCount++;
  } catch {
    errorCount++;
  }
  setBulkDownloadProgress(i + 1);
}

    if (successCount > 0) {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factures_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setBulkDownloading(false);
    toast({
      title: "Téléchargement terminé",
      description: `${successCount} facture(s) dans le ZIP${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}`,
    });
  };

  const toggleInvoiceSelect = (id: string) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllInvoices = () => {
    if (selectedInvoiceIds.size === filteredInvoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(filteredInvoices.map(inv => inv.id)));
    }
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
    const map: Record<string, string> = { apporteur: "Apporteur", closer: "Closer", collaborateur: "Collaborateur", agence: "Agence", agence_marketing: "Agence", ceo: "CEO" };
    return map[roles[0]] || roles[0] || "—";
    return map[roles[0]] || roles[0];
  };
  const periodLabel = `${MONTHS[genMonth]} ${genYear}`;

  const openRibViewer = async (name: string, ribUrl: string) => {
    // Cleanup previous blob URL
    if (ribViewerBlobUrl) URL.revokeObjectURL(ribViewerBlobUrl);
    setRibViewerName(name);
    setRibViewerOpen(true);
    setRibViewerLoading(true);
    setRibViewerBlobUrl(null);
    setRibViewerTextContent(null);
    try {
      // Extract relative storage path from whatever format bank_rib_url is stored as
      let filePath = ribUrl;
      // If it's a full URL, extract just the path after /ribs/
      const urlMatch = ribUrl.match(/\/ribs\/(.+?)(?:\?|$)/);
      if (urlMatch) {
        filePath = decodeURIComponent(urlMatch[1]);
      } else if (ribUrl.startsWith("http")) {
        // Full URL but doesn't match expected pattern — try URL parsing
        try {
          const url = new URL(ribUrl);
          const pathMatch = url.pathname.match(/\/ribs\/(.+)/);
          filePath = pathMatch ? decodeURIComponent(pathMatch[1]) : ribUrl;
        } catch { /* keep ribUrl as-is */ }
      }
      // Remove leading slash if present
      filePath = filePath.replace(/^\/+/, "");
      
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      setRibViewerExt(ext);

      // Download file as blob via Supabase SDK (bypasses CORS/blocker issues)
      const { data, error } = await supabase.storage.from("ribs").download(filePath);
      if (error || !data) throw error || new Error("No data");

      // For text files, read as text content
      if (ext === "txt") {
        const text = await data.text();
        setRibViewerTextContent(text);
      } else {
        const blobUrl = URL.createObjectURL(data);
        setRibViewerBlobUrl(blobUrl);
      }
    } catch (err) {
      console.error("RIB download error:", err);
      toast({ title: "Erreur", description: "Impossible de charger le RIB", variant: "destructive" });
    } finally {
      setRibViewerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Facturation</h1>
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
            <div className="ml-auto flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => { setSalaryModalOpen(true); fetchSalaryProfiles(); }} className="gap-1.5 text-xs">
                <Settings2 className="h-3.5 w-3.5" /> Salaires fixes
              </Button>
              <Button variant="ghost" size="icon" onClick={fetchBeneficiaries} disabled={loadingBeneficiaries}>
                <RefreshCw className={`h-4 w-4 ${loadingBeneficiaries ? "animate-spin" : ""}`} />
              </Button>
            </div>
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
                        <TableHead className="w-12 text-center">RIB</TableHead>
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
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="text-xs tabular-nums cursor-pointer hover:bg-primary/20 transition-colors"
                                onClick={() => a.commission_count > 0 && setCommDetailBeneficiary(a)}
                              >
                                {a.commission_count}
                              </Badge>
                              {a.fixed_salary_active && (
                                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
                                  + Salaire fixe
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-semibold tabular-nums">
                            {a.total_amount.toLocaleString("fr-FR")} €
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            {a.bank_rib_url ? (
                              <Button size="icon" variant="ghost" onClick={() => openRibViewer(a.full_name, a.bank_rib_url!)} title="Voir le RIB">
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
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
            <div className="ml-auto flex items-center gap-2">
              {selectedInvoiceIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkDownload(filteredInvoices.filter(inv => selectedInvoiceIds.has(inv.id)))}
                    disabled={bulkDownloading}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger ({selectedInvoiceIds.size})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    disabled={bulkDeleting}
                    className="gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer ({selectedInvoiceIds.size})
                  </Button>
                </>
              )}
              {filteredInvoices.some(inv => inv.pdf_url) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkDownload(filteredInvoices)}
                  disabled={bulkDownloading}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                   Tout télécharger ({filteredInvoices.filter(inv => inv.pdf_url).length})
                </Button>
              )}
            </div>
          </div>

          {/* Bulk download progress */}
          {bulkDownloading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Téléchargement en cours… {bulkDownloadProgress}/{bulkDownloadTotal}
              </div>
              <Progress value={(bulkDownloadProgress / bulkDownloadTotal) * 100} className="h-2" />
            </div>
          )}

          {/* Bulk delete progress */}
          {bulkDeleting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Suppression en cours… {bulkDeleteProgress}/{bulkDeleteTotal}
              </div>
              <Progress value={(bulkDeleteProgress / bulkDeleteTotal) * 100} className="h-2" />
            </div>
          )}

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
                        <TableHead className="w-12 pl-4">
                          <Checkbox
                            checked={filteredInvoices.length > 0 && selectedInvoiceIds.size === filteredInvoices.length}
                            onCheckedChange={toggleAllInvoices}
                          />
                        </TableHead>
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
                            <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedInvoiceIds.has(inv.id)}
                                onCheckedChange={() => toggleInvoiceSelect(inv.id)}
                              />
                            </TableCell>
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
                                {inv.bank_rib_url && (
                                  <Button size="icon" variant="ghost" onClick={() => openRibViewer(inv.apporteur_name, inv.bank_rib_url!)} title="Voir le RIB">
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                )}
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

      {/* ── BULK DELETE CONFIRMATION MODAL ── */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer {selectedInvoiceIds.size} facture(s)</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer les <strong>{selectedInvoiceIds.size}</strong> facture(s) sélectionnée(s) ?
              Les commissions associées repasseront en statut "due".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer ({selectedInvoiceIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PREVIEW MODAL ── */}
      <InvoicePreviewModal
        open={!!previewInvoice}
        onOpenChange={(open) => !open && closePreview()}
        invoiceNumber={previewInvoice?.invoice_number || ""}
        pdfBlobUrl={previewPdfUrl}
        loading={previewLoading}
        invoiceId={previewInvoice?.id}
        skipRegeneration
      />
      {/* ── FIXED SALARY MODAL ── */}
      <Dialog open={salaryModalOpen} onOpenChange={setSalaryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Salaires fixes mensuels</DialogTitle>
            <DialogDescription>
              Gérez les salaires fixes des collaborateurs et de l'agence marketing. Ces montants sont ajoutés automatiquement aux factures mensuelles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {loadingSalaries ? (
              <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : salaryProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun collaborateur ou agence trouvé.</p>
            ) : salaryProfiles.map(p => (
              <div key={p.id} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{p.full_name}</p>
                  <Badge variant="secondary" className="text-xs mt-0.5">{p.role === "agence" ? "Agence" : "Collaborateur"}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28">
                    <Input
                      type="number"
                      placeholder="0"
                      value={p.amount ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        setSalaryProfiles(prev => prev.map(sp => sp.id === p.id ? { ...sp, amount: val } : sp));
                      }}
                      onBlur={() => updateSalary(p.id, p.amount)}
                      className="text-right text-sm h-8"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">€</span>
                  <Switch
                    checked={!!p.amount && p.amount > 0}
                    onCheckedChange={(checked) => updateSalary(p.id, checked ? (p.amount || 0) : null)}
                  />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── COMMISSION DETAIL MODAL ── */}
      <CommissionDetailModal
        open={!!commDetailBeneficiary}
        onOpenChange={(open) => !open && setCommDetailBeneficiary(null)}
        beneficiaryUserId={commDetailBeneficiary?.beneficiary_user_id || null}
        beneficiaryName={commDetailBeneficiary?.full_name || ""}
        periodEndDate={`${genMonth === 11 ? genYear + 1 : genYear}-${String((genMonth + 2) > 12 ? 1 : genMonth + 2).padStart(2, "0")}-01`}
      />

      {/* ── RIB VIEWER MODAL ── */}
      <Dialog open={ribViewerOpen} onOpenChange={(open) => {
        if (!open && ribViewerBlobUrl) URL.revokeObjectURL(ribViewerBlobUrl);
        if (!open) setRibViewerTextContent(null);
        setRibViewerOpen(open);
      }}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>RIB — {ribViewerName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted rounded flex items-center justify-center">
            {ribViewerLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : ribViewerTextContent ? (
              <pre className="w-full h-full overflow-auto p-4 text-sm whitespace-pre-wrap font-mono">{ribViewerTextContent}</pre>
            ) : ribViewerBlobUrl ? (
              (() => {
                const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ribViewerExt);
                if (isImage) {
                  return <img src={ribViewerBlobUrl} alt="RIB" className="max-w-full max-h-full object-contain" />;
                }
                if (ribViewerExt === "docx") {
                  return (
                    <div className="text-center p-6 space-y-2">
                      <p className="text-sm text-muted-foreground">L'aperçu n'est pas disponible pour les fichiers .docx</p>
                      <p className="text-sm text-muted-foreground">Utilisez le bouton Télécharger ci-dessous.</p>
                    </div>
                  );
                }
                return <iframe src={ribViewerBlobUrl} className="w-full h-full border-0 rounded" title="RIB" />;
              })()
            ) : (
              <p className="text-sm text-muted-foreground">Impossible de charger le document.</p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRibViewerOpen(false)}>Fermer</Button>
            {(ribViewerBlobUrl || ribViewerTextContent) && (
              <Button asChild>
                <a href={ribViewerBlobUrl || `data:text/plain;charset=utf-8,${encodeURIComponent(ribViewerTextContent || "")}`} download={`rib-${ribViewerName}.${ribViewerExt || "pdf"}`}>
                  <Download className="h-4 w-4 mr-2" /> Télécharger
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
