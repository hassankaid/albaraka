import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { RefreshCw, Check, CreditCard, AlertTriangle, CircleDollarSign, Search, Inbox, ChevronLeft, ChevronRight, Phone, MessageSquare, MoreHorizontal, Clock, XCircle, CalendarIcon, ListOrdered, Save, X as XIcon, Loader2, FileText, Link as LinkIcon, Download, Archive } from "lucide-react";
import JSZip from "jszip";
import { formatDateOnly } from "@/lib/formatDate";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useUpdatePaymentAdmin } from "@/hooks/usePaymentAdmin";
import PaymentScheduleModal from "@/components/payments/PaymentScheduleModal";
import ClientInvoiceModal from "@/components/payments/ClientInvoiceModal";

interface PaymentRow {
  id: string;
  payment_number: number;
  total_payments: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  sale_id: string | null;
  closed_by: string | null;
  sale_type: string | null;
  payment_code: string | null;
  _isUserInvolved: boolean;
}

const getPaymentStatusInfo = (status: string, dueDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (status === "paid") return { label: "Payé", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", key: "paid" };
  if (status === "cancelled" || status === "lost") return { label: "Perdu", className: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30", key: "lost" };
  if (status === "late") return { label: "En retard", className: "bg-red-500/20 text-red-300 border-red-500/30", key: "late" };
  if (status === "pending" && due < today) return { label: "En retard", className: "bg-red-500/20 text-red-300 border-red-500/30", key: "late" };
  return { label: "En attente", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", key: "pending" };
};

const getMonthRange = (offset: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  const end = new Date(d);
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
};

const getBillingPeriodLabel = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

const PAGE_SIZE = 50;

function PaymentNotesCell({ paymentId, initialNotes, contactName, onSave }: { paymentId: string; initialNotes: string; contactName: string | null; onSave: (id: string, notes: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(initialNotes); }, [initialNotes]);

  const handleSave = async () => {
    if (value === initialNotes) { setOpen(false); return; }
    setSaving(true);
    await onSave(paymentId, value);
    setSaving(false);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground max-w-[180px] text-left"
        title={initialNotes || "Ajouter un commentaire"}
      >
        <MessageSquare className="h-3 w-3 shrink-0" />
        <span className="truncate">{initialNotes || "—"}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Commentaire — {contactName || "Client"}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-[120px] bg-card resize-none"
            placeholder="Ajouter un commentaire de suivi..."
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setValue(initialNotes); setOpen(false); }}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Payments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isCeo = profile?.role === "ceo";
  const userTz = profile?.timezone || "Europe/Paris";

  const [allPayments, setAllPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [periodFilter, setPeriodFilter] = useState("today");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  

  // Lost confirmation dialog
  const [lostConfirmPayment, setLostConfirmPayment] = useState<PaymentRow | null>(null);
  // Paid date picker
  const [paidPickerPayment, setPaidPickerPayment] = useState<PaymentRow | null>(null);
  // Schedule modal (toutes les mensualités d'une vente)
  const [scheduleModal, setScheduleModal] = useState<{ saleId: string; contactName: string | null } | null>(null);
  // Client invoice modal (facture liée à un payment paid)
  const [invoiceModal, setInvoiceModal] = useState<{
    paymentId: string;
    contactName: string | null;
    contactEmail: string | null;
    amount: number;
    paidAt: string | null;
  } | null>(null);
  // Modale "Lien personnalisé" : pour les ventes acompte, permet au commercial
  // de choisir le nombre de mensualités du paiement final puis copier le lien
  // adapté (?code=ALB-XXX → 1x, /checkout/4?code=ALB-XXX → 4x, etc.)
  const [linkModal, setLinkModal] = useState<{
    paymentCode: string;
    contactName: string | null;
  } | null>(null);
  const [linkInstallments, setLinkInstallments] = useState<number>(1);

  // Modale "Téléchargement factures du mois" : pour la compta, génère un ZIP
  // de toutes les factures clients (PDF) encaissées sur le mois sélectionné.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState<string>(() => {
    // Default au mois précédent (le plus utile pour la compta : "transmettre
    // les factures du mois écoulé au comptable")
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7); // "YYYY-MM"
  });
  const [bulkPreview, setBulkPreview] = useState<{
    paidPayments: number;
    existingInvoices: number;
    toGenerate: number;
    totalAmount: number;
    loading: boolean;
  }>({
    paidPayments: 0,
    existingInvoices: 0,
    toGenerate: 0,
    totalAmount: 0,
    loading: false,
  });
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    phase: "idle" | "generating" | "downloading";
    current: number;
    total: number;
  }>({ phase: "idle", current: 0, total: 0 });
  // Inline edit states
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState<string>("");
  const updatePaymentAdmin = useUpdatePaymentAdmin();

  // Inline update handler (CEO only). Refetch après update pour avoir la
  // bonne valeur (avec cascade commissions appliquée côté DB).
  async function handleInlineUpdate(payment_id: string, patch: { due_date?: string; amount?: number }) {
    try {
      await updatePaymentAdmin.mutateAsync({ payment_id, ...patch });
      toast({ title: "Mensualité mise à jour" });
      fetchPayments();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  }

  const fetchPayments = useCallback(async () => {
    const batchSize = 1000;
    let from = 0;
    let all: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const { data } = await supabase
        .from("payments")
        .select(`
          id, payment_number, total_payments, amount, due_date, paid_at, status, notes, sale_id,
          contacts!payments_contact_id_fkey(full_name, email, phone_normalized, payment_code),
          sales!payments_sale_id_fkey(closed_by, sale_type)
        `)
        .order("due_date", { ascending: false })
        .range(from, from + batchSize - 1);

      if (data && data.length > 0) {
        all = [...all, ...data];
        if (data.length < batchSize) hasMore = false;
        else from += batchSize;
      } else {
        hasMore = false;
      }
    }

    // For non-CEO, fetch sale_ids where user has commissions
    let userSaleIds: Set<string> | null = null;
    if (!isCeo && profile?.id) {
      const { data: comms } = await supabase
        .from("commissions")
        .select("sale_id")
        .eq("beneficiary_user_id", profile.id);
      userSaleIds = new Set((comms || []).map((c) => c.sale_id));
    }

    setAllPayments(
      all.map((p: any) => ({
        id: p.id,
        payment_number: p.payment_number,
        total_payments: p.total_payments,
        amount: p.amount,
        due_date: p.due_date,
        paid_at: p.paid_at,
        status: p.status,
        notes: p.notes,
        contact_name: p.contacts?.full_name || null,
        contact_email: p.contacts?.email || null,
        contact_phone: p.contacts?.phone_normalized || null,
        sale_id: p.sale_id || null,
        closed_by: p.sales?.closed_by || null,
        sale_type: p.sales?.sale_type || null,
        payment_code: p.contacts?.payment_code || null,
        _isUserInvolved: userSaleIds ? (p.sale_id ? userSaleIds.has(p.sale_id) : false) : true,
      }))
    );
    setLoading(false);
  }, [isCeo, profile?.id]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Téléchargement en masse des factures clients du mois (CEO compta) ──
  // Helpers : 12 derniers mois pour le sélecteur
  const monthOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 0; i < 12; i++) {
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      opts.push({ value: ymd, label: label.charAt(0).toUpperCase() + label.slice(1) });
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, []);

  // Calcule les bornes [from, to[ d'un mois donné (YYYY-MM)
  function monthBounds(ym: string): { from: string; to: string } {
    const [y, m] = ym.split("-").map(Number);
    const fromDate = new Date(Date.UTC(y, m - 1, 1));
    const toDate = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1));
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
  }

  // Aperçu : compte des paiements payés + factures déjà générées + à générer
  useEffect(() => {
    if (!bulkOpen) return;
    let cancelled = false;
    (async () => {
      setBulkPreview((p) => ({ ...p, loading: true }));
      const { from, to } = monthBounds(bulkMonth);

      // 1. Tous les paiements payés du mois
      const { data: paid } = await (supabase as any)
        .from("payments")
        .select("id, amount")
        .eq("status", "paid")
        .gte("paid_at", from)
        .lt("paid_at", to);

      if (cancelled) return;
      const paidPayments = (paid || []).length;
      const totalAmount = (paid || []).reduce(
        (s: number, p: any) => s + Number(p.amount || 0),
        0,
      );

      // 2. Compte les factures déjà générées (avec PDF) pour ces paiements
      let existingInvoices = 0;
      if (paid && paid.length > 0) {
        const ids = paid.map((p: any) => p.id);
        const { data: invs } = await (supabase as any)
          .from("client_invoices")
          .select("id, html_path, payment_id")
          .in("payment_id", ids)
          .not("html_path", "is", null);
        existingInvoices = (invs || []).length;
      }

      if (cancelled) return;
      setBulkPreview({
        paidPayments,
        existingInvoices,
        toGenerate: paidPayments - existingInvoices,
        totalAmount,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, [bulkOpen, bulkMonth]);

  async function handleBulkDownload() {
    setBulkDownloading(true);
    setBulkProgress({ phase: "idle", current: 0, total: 0 });

    try {
      const { from, to } = monthBounds(bulkMonth);

      // 1. Récupère TOUS les paiements payés du mois
      const { data: paid, error: paidErr } = await (supabase as any)
        .from("payments")
        .select("id, paid_at")
        .eq("status", "paid")
        .gte("paid_at", from)
        .lt("paid_at", to)
        .order("paid_at", { ascending: true });

      if (paidErr) throw new Error(paidErr.message);
      if (!paid || paid.length === 0) {
        toast({ title: "Aucun paiement payé sur ce mois" });
        return;
      }

      // 2. Phase "Génération" : pour chaque paiement, génère la facture
      //    si elle n'existe pas (idempotent côté generate-client-invoice).
      setBulkProgress({ phase: "generating", current: 0, total: paid.length });
      const invoicePathsByPaymentId = new Map<string, { invoiceNumber: string; htmlPath: string }>();
      const failedGen: string[] = [];

      for (let i = 0; i < paid.length; i++) {
        const p = paid[i];
        try {
          // D'abord check si une facture existe déjà avec PDF
          const { data: existing } = await (supabase as any)
            .from("client_invoices")
            .select("invoice_number, html_path")
            .eq("payment_id", p.id)
            .maybeSingle();

          if (existing?.html_path) {
            // Cas 1 : facture complète, on l'utilise telle quelle.
            invoicePathsByPaymentId.set(p.id, {
              invoiceNumber: existing.invoice_number,
              htmlPath: existing.html_path,
            });
          } else {
            // Cas 2 : pas de facture du tout (existing === null).
            // Cas 3 : ligne client_invoices créée mais html_path NULL → orpheline
            //         (échec PDF sur un précédent run). On force la régénération.
            // Dans les 2 cas on appelle generate-client-invoice avec send_email:
            // false pour ne pas re-spammer. Pour le cas 3 on passe regenerate:
            // true pour expliciter l'intention et permettre à l'edge function
            // de logger qu'on est dans un retry d'orpheline.
            const isOrphan = !!existing && !existing.html_path;
            const { data, error } = await (supabase as any).functions.invoke(
              "generate-client-invoice",
              {
                body: {
                  payment_id: p.id,
                  send_email: false,
                  ...(isOrphan ? { regenerate: true } : {}),
                },
              },
            );
            if (error) {
              console.error(
                `generate-client-invoice error for ${p.id} (orphan=${isOrphan})`,
                error,
              );
              failedGen.push(p.id);
            } else if (data?.invoice?.invoice_number && data?.invoice?.html_path) {
              invoicePathsByPaymentId.set(p.id, {
                invoiceNumber: data.invoice.invoice_number,
                htmlPath: data.invoice.html_path,
              });
            } else if (data?.error) {
              console.error(
                `generate-client-invoice failed for ${p.id} (orphan=${isOrphan})`,
                data.error,
              );
              failedGen.push(p.id);
            }
          }
        } catch (e) {
          console.error("error processing payment", p.id, e);
          failedGen.push(p.id);
        }
        setBulkProgress({ phase: "generating", current: i + 1, total: paid.length });
      }

      // 3. Phase "Téléchargement" : zip tous les PDF
      const invoices = Array.from(invoicePathsByPaymentId.values()).sort((a, b) =>
        a.invoiceNumber.localeCompare(b.invoiceNumber),
      );
      if (invoices.length === 0) {
        toast({
          title: "Aucune facture disponible",
          description: "Impossible de générer ou récupérer les factures pour ce mois.",
          variant: "destructive",
        });
        return;
      }

      setBulkProgress({ phase: "downloading", current: 0, total: invoices.length });
      const zip = new JSZip();
      const folderName = `factures-clients-${bulkMonth}`;
      const folder = zip.folder(folderName);
      let okCount = 0;
      const failedDl: string[] = [];

      for (let i = 0; i < invoices.length; i++) {
        const inv = invoices[i];
        try {
          const { data: signed, error: signErr } = await (supabase as any).storage
            .from("invoices")
            .createSignedUrl(inv.htmlPath, 300);
          if (signErr || !signed?.signedUrl) {
            failedDl.push(inv.invoiceNumber);
            continue;
          }
          const res = await fetch(signed.signedUrl);
          if (!res.ok) {
            failedDl.push(inv.invoiceNumber);
            continue;
          }
          const blob = await res.blob();
          folder!.file(`${inv.invoiceNumber}.pdf`, blob);
          okCount++;
        } catch (e) {
          console.error("download failed for", inv.invoiceNumber, e);
          failedDl.push(inv.invoiceNumber);
        }
        setBulkProgress({ phase: "downloading", current: i + 1, total: invoices.length });
      }

      if (okCount === 0) {
        toast({
          title: "Échec",
          description: "Aucune facture n'a pu être téléchargée.",
          variant: "destructive",
        });
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const totalFailed = failedGen.length + failedDl.length;
      toast({
        title: `${okCount} facture${okCount > 1 ? "s" : ""} téléchargée${okCount > 1 ? "s" : ""}`,
        description:
          totalFailed > 0
            ? `${totalFailed} en échec (génération ou téléchargement). ZIP prêt avec ${okCount} factures.`
            : "ZIP prêt à transmettre à votre comptable",
      });
      setBulkOpen(false);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de générer l'archive",
        variant: "destructive",
      });
    } finally {
      setBulkDownloading(false);
      setBulkProgress({ phase: "idle", current: 0, total: 0 });
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
    toast({ title: "Données actualisées" });
  };

  const markAsPaid = async (paymentId: string, paidDate: Date) => {
    const dateStr = format(paidDate, "yyyy-MM-dd");
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: dateStr })
      .eq("id", paymentId);
    if (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } else {
      toast({ title: "Paiement marqué comme payé" });
      setPaidPickerPayment(null);
      fetchPayments();
      // Déclenche en arrière-plan la génération + envoi de la facture client.
      // Non-bloquant : si ça échoue, le CEO peut toujours regénérer via le
      // bouton facture (FileText) sur la ligne du paiement.
      (supabase.functions as any)
        .invoke("generate-client-invoice", {
          body: { payment_id: paymentId, send_email: true },
        })
        .then((res: any) => {
          if (res?.error) {
            console.warn("[client-invoice] auto-trigger failed:", res.error);
          }
        })
        .catch((e: any) => console.warn("[client-invoice] auto-trigger error:", e));
    }
  };

  const markAsLate = async (paymentId: string) => {
    const { error } = await supabase
      .from("payments")
      .update({ status: "late" })
      .eq("id", paymentId);
    if (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } else {
      toast({ title: "Paiement marqué en retard" });
      fetchPayments();
    }
  };

  const markAsLost = async (paymentId: string) => {
    const { error } = await supabase
      .from("payments")
      .update({ status: "lost" })
      .eq("id", paymentId);
    if (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } else {
      toast({ title: "Paiement marqué comme perdu (cascade appliquée)" });
      setLostConfirmPayment(null);
      fetchPayments();
    }
  };

  const saveNotes = async (paymentId: string, newNotes: string) => {
    const { error } = await supabase
      .from("payments")
      .update({ notes: newNotes })
      .eq("id", paymentId);
    if (error) {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    } else {
      setAllPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, notes: newNotes } : p));
      toast({ title: "Commentaire enregistré" });
    }
  };

  const filteredPayments = useMemo(() => {
    // For non-CEO, only show payments where user has commissions
    let result = isCeo ? allPayments : allPayments.filter((p) => p._isUserInvolved);

    if (periodFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      result = result.filter((p) => p.due_date === todayStr);
    } else if (periodFilter === "this_month" || periodFilter === "next_month") {
      const offset = periodFilter === "this_month" ? 0 : 1;
      const { start, end } = getMonthRange(offset);
      result = result.filter((p) => p.due_date >= start && p.due_date <= end);
    } else if (periodFilter === "billing_period") {
      const { start, end } = getMonthRange(-1);
      result = result.filter((p) => p.due_date >= start && p.due_date <= end);
    }

    if (statusFilters.length > 0) {
      result = result.filter((p) => {
        const info = getPaymentStatusInfo(p.status, p.due_date);
        return statusFilters.includes(info.key);
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.contact_name && p.contact_name.toLowerCase().includes(q)) ||
          (p.contact_email && p.contact_email.toLowerCase().includes(q))
      );
    }


    return result;
  }, [allPayments, statusFilters, periodFilter, search, isCeo]);

  useEffect(() => { setPage(0); }, [statusFilters, periodFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const paginatedPayments = useMemo(
    () => filteredPayments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredPayments, page]
  );

  // KPIs: based on the same period/user filters as the table (but before status/search filters)
  const kpiPayments = useMemo(() => {
    let result = isCeo ? allPayments : allPayments.filter((p) => p._isUserInvolved);

    if (periodFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      result = result.filter((p) => p.due_date === todayStr);
    } else if (periodFilter === "this_month" || periodFilter === "next_month") {
      const offset = periodFilter === "this_month" ? 0 : 1;
      const { start, end } = getMonthRange(offset);
      result = result.filter((p) => p.due_date >= start && p.due_date <= end);
    } else if (periodFilter === "billing_period") {
      const { start, end } = getMonthRange(-1);
      result = result.filter((p) => p.due_date >= start && p.due_date <= end);
    }

    return result;
  }, [allPayments, isCeo, periodFilter]);

  const totalPendingMonth = kpiPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  // "Encaissé" filtre par paid_at (date d'encaissement réelle), pas par
  // due_date. Cohérent avec la modale "Factures du mois" et avec la
  // sémantique comptable. Permet d'aligner les chiffres dashboard ↔ ZIP
  // factures pour la transmission au comptable.
  const totalPaidMonth = useMemo(() => {
    const inUserScope = isCeo
      ? allPayments
      : allPayments.filter((p) => p._isUserInvolved);
    const paid = inUserScope.filter((p) => p.status === "paid" && !!p.paid_at);

    if (periodFilter === "all") {
      return paid.reduce((s, p) => s + p.amount, 0);
    }
    if (periodFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      return paid
        .filter((p) => p.paid_at === todayStr)
        .reduce((s, p) => s + p.amount, 0);
    }
    if (periodFilter === "this_month" || periodFilter === "next_month") {
      const offset = periodFilter === "this_month" ? 0 : 1;
      const { start, end } = getMonthRange(offset);
      return paid
        .filter((p) => p.paid_at! >= start && p.paid_at! <= end)
        .reduce((s, p) => s + p.amount, 0);
    }
    if (periodFilter === "billing_period") {
      const { start, end } = getMonthRange(-1);
      return paid
        .filter((p) => p.paid_at! >= start && p.paid_at! <= end)
        .reduce((s, p) => s + p.amount, 0);
    }
    return 0;
  }, [allPayments, isCeo, periodFilter]);
  const today = new Date().toISOString().split("T")[0];
  const totalOverdue = kpiPayments
    .filter((p) => (p.status === "pending" && p.due_date < today) || p.status === "late")
    .reduce((s, p) => s + p.amount, 0);
  const totalLost = kpiPayments
    .filter((p) => p.status === "lost" || p.status === "cancelled")
    .reduce((s, p) => s + p.amount, 0);

  const canChangeStatus = (status: string) => status === "pending" || status === "late";

  return (
    <div className="space-y-4">
      {/* Top bar: KPIs + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <CreditCard className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-sm font-bold text-foreground">{totalPendingMonth.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">en attente</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-red-500/30">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-sm font-bold text-foreground">{totalOverdue.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">en retard</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
            <CircleDollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm font-bold text-foreground">{totalPaidMonth.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">encaissé</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-zinc-600/30">
            <XCircle className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-sm font-bold text-foreground">{totalLost.toLocaleString("fr-FR")} €</span>
            <span className="text-xs text-muted-foreground">perdu</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isCeo && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setBulkOpen(true)}
              title="Télécharger toutes les factures clients d'un mois (pour la comptabilité)"
            >
              <Archive className="h-3.5 w-3.5" />
              Factures du mois
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={refreshing} title="Actualiser">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="all">Toutes périodes</SelectItem>
            <SelectItem value="this_month">Ce mois</SelectItem>
            <SelectItem value="next_month">Mois prochain</SelectItem>
            <SelectItem value="billing_period">Facturation ({getBillingPeriodLabel()})</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-card min-w-[130px] justify-between">
              {statusFilters.length === 0
                ? "Tous statuts"
                : statusFilters.length === 1
                  ? { pending: "En attente", late: "En retard", paid: "Payé", lost: "Perdu" }[statusFilters[0]]
                  : `${statusFilters.length} statuts`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[160px] p-2" align="start">
            {[
              { key: "pending", label: "En attente" },
              { key: "late", label: "En retard" },
              { key: "paid", label: "Payé" },
              { key: "lost", label: "Perdu" },
            ].map((s) => (
              <label key={s.key} className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-secondary rounded">
                <input
                  type="checkbox"
                  checked={statusFilters.includes(s.key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setStatusFilters((prev) => [...prev, s.key]);
                    } else {
                      setStatusFilters((prev) => prev.filter((f) => f !== s.key));
                    }
                  }}
                  className="rounded border-border"
                />
                {s.label}
              </label>
            ))}
            {statusFilters.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full mt-1 h-7 text-xs" onClick={() => setStatusFilters([])}>
                Réinitialiser
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-card"
          />
        </div>

        <span className="text-xs text-muted-foreground font-medium tabular-nums ml-auto">
          {filteredPayments.length} paiement{filteredPayments.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground">Aucun paiement trouvé</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[200px]">Client</TableHead>
                  <TableHead>N°</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Payé le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[200px]">Commentaire</TableHead>
                  {isCeo && <TableHead className="w-[80px]">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((p) => {
                    const statusInfo = getPaymentStatusInfo(p.status, p.due_date);
                    return (
                        <TableRow className={`border-border hover:bg-secondary/50 transition-colors ${p.status === "lost" ? "opacity-60" : ""}`}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{p.contact_name || "—"}</p>
                          {p.contact_email && <p className="text-xs text-muted-foreground truncate">{p.contact_email}</p>}
                          {p.contact_phone && (
                            <a href={`tel:${p.contact_phone}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5">
                              <Phone className="h-3 w-3" />
                              {p.contact_phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {p.payment_number}/{p.total_payments}
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-foreground">
                        {isCeo && p.status !== "paid" ? (
                          editingAmountId === p.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={amountDraft}
                                onChange={(e) => setAmountDraft(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const n = Number(amountDraft);
                                    if (n > 0 && n !== p.amount) {
                                      handleInlineUpdate(p.id, { amount: n });
                                    }
                                    setEditingAmountId(null);
                                  } else if (e.key === "Escape") {
                                    setEditingAmountId(null);
                                  }
                                }}
                                className="h-7 w-24 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  const n = Number(amountDraft);
                                  if (n > 0 && n !== p.amount) {
                                    handleInlineUpdate(p.id, { amount: n });
                                  }
                                  setEditingAmountId(null);
                                }}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingAmountId(null)}
                              >
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto px-2 py-0.5 font-semibold text-sm hover:bg-secondary"
                              onClick={() => {
                                setAmountDraft(String(p.amount));
                                setEditingAmountId(p.id);
                              }}
                            >
                              {p.amount.toLocaleString("fr-FR")} €
                            </Button>
                          )
                        ) : (
                          `${p.amount.toLocaleString("fr-FR")} €`
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {isCeo && p.status !== "paid" ? (
                          <Popover
                            open={editingDateId === p.id}
                            onOpenChange={(o) => setEditingDateId(o ? p.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-auto px-2 py-0.5 text-xs gap-1.5 hover:bg-secondary">
                                <CalendarIcon className="h-3 w-3 opacity-50" />
                                {formatDateOnly(p.due_date, userTz)}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={new Date(p.due_date)}
                                onSelect={(d) => {
                                  if (d) {
                                    handleInlineUpdate(p.id, { due_date: format(d, "yyyy-MM-dd") });
                                    setEditingDateId(null);
                                  }
                                }}
                                locale={fr}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          formatDateOnly(p.due_date, userTz)
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {isCeo && (p.paid_at || p.status === "paid") ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-auto p-0 font-normal text-xs text-muted-foreground hover:text-foreground">
                                {p.paid_at ? formatDateOnly(p.paid_at, userTz) : "—"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={p.paid_at ? new Date(p.paid_at) : new Date()}
                                onSelect={(date) => { if (date) markAsPaid(p.id, date); }}
                                locale={fr}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          p.paid_at ? formatDateOnly(p.paid_at, userTz) : "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] leading-tight ${statusInfo.className}`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <PaymentNotesCell paymentId={p.id} initialNotes={p.notes || ""} contactName={p.contact_name} onSave={saveNotes} />
                      </TableCell>
                      {isCeo && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {p.sale_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title="Voir toutes les mensualités du client"
                                onClick={() => setScheduleModal({ saleId: p.sale_id!, contactName: p.contact_name })}
                              >
                                <ListOrdered className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {p.status === "paid" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                title="Facture client"
                                onClick={() => setInvoiceModal({
                                  paymentId: p.id,
                                  contactName: p.contact_name,
                                  contactEmail: p.contact_email,
                                  amount: p.amount,
                                  paidAt: p.paid_at,
                                })}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {p.sale_type === "acompte" && p.payment_code && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                                title="Générer le lien personnalisé pour le paiement final"
                                onClick={() => {
                                  setLinkInstallments(1);
                                  setLinkModal({
                                    paymentCode: p.payment_code!,
                                    contactName: p.contact_name,
                                  });
                                }}
                              >
                                <LinkIcon className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canChangeStatus(p.status) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => setPaidPickerPayment(p)} className="text-emerald-400">
                                    <Check className="h-3.5 w-3.5 mr-2" /> Payé
                                  </DropdownMenuItem>
                                  {p.status !== "late" && (
                                    <DropdownMenuItem onClick={() => markAsLate(p.id)} className="text-red-400">
                                      <Clock className="h-3.5 w-3.5 mr-2" /> En retard
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setLostConfirmPayment(p)} className="text-zinc-400">
                                    <XCircle className="h-3.5 w-3.5 mr-2" /> Perdu
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredPayments.length)} sur {filteredPayments.length}
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

      {/* Lost confirmation dialog */}
      <Dialog open={!!lostConfirmPayment} onOpenChange={(open) => !open && setLostConfirmPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer « Perdu »</DialogTitle>
            <DialogDescription>
              Cette action marquera ce paiement et toutes les mensualités suivantes (non payées) comme perdues. Les commissions associées seront annulées.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <p><strong>Client :</strong> {lostConfirmPayment?.contact_name || "—"}</p>
            <p><strong>Mensualité :</strong> {lostConfirmPayment?.payment_number}/{lostConfirmPayment?.total_payments} — {lostConfirmPayment?.amount.toLocaleString("fr-FR")} €</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setLostConfirmPayment(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => lostConfirmPayment && markAsLost(lostConfirmPayment.id)}>
              Confirmer Perdu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paid date picker dialog */}
      <Dialog open={!!paidPickerPayment} onOpenChange={(open) => !open && setPaidPickerPayment(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Date de paiement</DialogTitle>
            <DialogDescription>
              {paidPickerPayment?.contact_name || "Client"} — {paidPickerPayment?.amount.toLocaleString("fr-FR")} €
            </DialogDescription>
          </DialogHeader>
          <Calendar
            mode="single"
            required
            selected={paidPickerPayment?.due_date ? new Date(paidPickerPayment.due_date) : new Date()}
            defaultMonth={paidPickerPayment?.due_date ? new Date(paidPickerPayment.due_date) : new Date()}
            onSelect={(date) => { if (date && paidPickerPayment) markAsPaid(paidPickerPayment.id, date); }}
            locale={fr}
            initialFocus
            className="pointer-events-auto mx-auto"
          />
        </DialogContent>
      </Dialog>

      {/* Modale "Toutes les mensualités du client" — CEO only */}
      <PaymentScheduleModal
        open={!!scheduleModal}
        onClose={() => setScheduleModal(null)}
        saleId={scheduleModal?.saleId ?? null}
        contactName={scheduleModal?.contactName ?? null}
      />

      {/* Modale "Facture client" — CEO only, sur paid */}
      <ClientInvoiceModal
        open={!!invoiceModal}
        onClose={() => setInvoiceModal(null)}
        paymentId={invoiceModal?.paymentId ?? null}
        clientName={invoiceModal?.contactName ?? null}
        clientEmail={invoiceModal?.contactEmail ?? null}
        amount={invoiceModal?.amount ?? 0}
        paidAt={invoiceModal?.paidAt ?? null}
      />

      {/* Modale "Téléchargement factures du mois" — CEO uniquement, génère
          un ZIP des PDF des factures clients encaissées sur le mois choisi.
          Idéal pour transmettre l'archive au comptable. */}
      <Dialog
        open={bulkOpen}
        onOpenChange={(o) => {
          if (!bulkDownloading) setBulkOpen(o);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Télécharger les factures du mois</DialogTitle>
            <DialogDescription>
              Génère un ZIP avec toutes les factures clients (PDF) encaissées sur le mois
              sélectionné. À transmettre à la comptabilité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Mois
              </label>
              <Select
                value={bulkMonth}
                onValueChange={setBulkMonth}
                disabled={bulkDownloading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm space-y-2">
              {bulkPreview.loading ? (
                <span className="text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Calcul en cours…
                </span>
              ) : bulkPreview.paidPayments === 0 ? (
                <span className="text-muted-foreground">
                  Aucun paiement encaissé ce mois-ci.
                </span>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-foreground">
                      <strong className="text-primary">{bulkPreview.paidPayments}</strong> paiement{bulkPreview.paidPayments > 1 ? "s" : ""} encaissé{bulkPreview.paidPayments > 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {bulkPreview.totalAmount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  {bulkPreview.toGenerate > 0 && (
                    <div className="text-[11px] text-amber-300/90 leading-relaxed pt-1 border-t border-border/40">
                      <strong>{bulkPreview.toGenerate}</strong> facture{bulkPreview.toGenerate > 1 ? "s" : ""} à générer
                      {bulkPreview.existingInvoices > 0 ? ` (${bulkPreview.existingInvoices} déjà disponible${bulkPreview.existingInvoices > 1 ? "s" : ""})` : ""}.
                      Elles seront créées automatiquement avant le téléchargement (sans envoi d'email au client).
                    </div>
                  )}
                </>
              )}
            </div>

            {bulkDownloading && bulkProgress.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {bulkProgress.phase === "generating"
                      ? "Génération des factures manquantes…"
                      : "Téléchargement et création du ZIP…"}
                  </span>
                  <span className="tabular-nums">
                    {bulkProgress.current} / {bulkProgress.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      bulkProgress.phase === "generating" ? "bg-amber-400" : "bg-primary"
                    }`}
                    style={{
                      width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkOpen(false)}
              disabled={bulkDownloading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleBulkDownload}
              disabled={bulkDownloading || bulkPreview.paidPayments === 0 || bulkPreview.loading}
              className="gap-2"
            >
              {bulkDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {bulkDownloading
                ? bulkProgress.phase === "generating"
                  ? "Génération…"
                  : "Téléchargement…"
                : `Télécharger ${bulkPreview.paidPayments > 0 ? `(${bulkPreview.paidPayments})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale "Lien personnalisé" — choix du nombre de mensualités pour
          générer le lien checkout adapté à transmettre au client */}
      <Dialog open={!!linkModal} onOpenChange={(o) => !o && setLinkModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lien personnalisé de paiement final</DialogTitle>
          </DialogHeader>
          {linkModal && (() => {
            const baseUrl = window.location.origin;
            const path =
              linkInstallments === 1
                ? `/checkout?code=${linkModal.paymentCode}`
                : `/checkout/${linkInstallments}?code=${linkModal.paymentCode}`;
            const fullLink = `${baseUrl}${path}`;
            return (
              <div className="space-y-4">
                {linkModal.contactName && (
                  <p className="text-xs text-muted-foreground">
                    Pour : <span className="font-medium text-foreground">{linkModal.contactName}</span>
                  </p>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Plan de paiement
                  </label>
                  <Select
                    value={String(linkInstallments)}
                    onValueChange={(v) => setLinkInstallments(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 fois (paiement comptant)</SelectItem>
                      <SelectItem value="2">2 fois</SelectItem>
                      <SelectItem value="3">3 fois</SelectItem>
                      <SelectItem value="4">4 fois</SelectItem>
                      <SelectItem value="5">5 fois</SelectItem>
                      <SelectItem value="6">6 fois</SelectItem>
                      <SelectItem value="7">7 fois</SelectItem>
                      <SelectItem value="8">8 fois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Lien à transmettre
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={fullLink}
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/30 text-foreground select-all"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(fullLink);
                        toast({
                          title: "Lien copié",
                          description: `Lien ${linkInstallments}x copié dans le presse-papier`,
                        });
                      }}
                    >
                      Copier
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ce lien identifie le client via son code paiement{" "}
                  <span className="font-mono text-foreground">{linkModal.paymentCode}</span>.
                  Son acompte sera automatiquement déduit du solde à régler.
                  Le code promo <span className="font-mono">ALBARAKA20</span> reste utilisable
                  par le client pour appliquer 20% de remise.
                </p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
