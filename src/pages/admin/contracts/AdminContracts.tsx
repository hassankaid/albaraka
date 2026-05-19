/**
 * Page back-office CEO de gestion des contrats clients.
 * Route : /admin/contracts
 *
 * Liste paginée + filtres + actions (voir détail, télécharger PDF signé/non
 * signé, renvoyer email, annuler le contrat).
 *
 * Phase 6 (Sidali 19/05/2026).
 */

import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileText,
  RefreshCw,
  Search,
  MoreHorizontal,
  Download,
  Eye,
  Mail,
  Ban,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  PercentSquare,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ContractRow {
  id: string;
  contract_number: string;
  sale_id: string;
  contact_id: string | null;
  buyer_profile_id: string | null;
  template_key: string;
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  client_postal_code: string;
  client_city: string;
  client_country: string;
  amount_total: number;
  amount_original: number;
  discount_amount: number;
  coupon_code: string | null;
  payment_modality: string;
  installments_count: number;
  first_payment_date: string;
  agreements_snapshot: Array<{
    id?: string;
    text?: string;
    checked?: boolean;
    checked_at?: string;
  }>;
  status: "pending_signature" | "signed" | "voided";
  unsigned_pdf_path: string | null;
  signed_pdf_path: string | null;
  signature_png_path: string | null;
  signed_at: string | null;
  signature_ip: string | null;
  signature_user_agent: string | null;
  email_sent_at: string | null;
  email_sent_to: string | null;
  created_at: string;
}

type StatusFilter = "all" | "pending_signature" | "signed" | "voided";
type TemplateFilter =
  | "all"
  | "pass_standard"
  | "pass_conference"
  | "liberty_standard"
  | "liberty_conference";
type DateRange = "all" | "today" | "7d" | "30d" | "90d";

const PAGE_SIZE = 50;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function templateLabel(key: string): string {
  switch (key) {
    case "pass_standard":
      return "Pass AL BARAKA";
    case "pass_conference":
      return "Pass AL BARAKA (conf.)";
    case "liberty_standard":
      return "Liberty";
    case "liberty_conference":
      return "Liberty (conf.)";
    default:
      return key;
  }
}

function templateToPassType(key: string): "al_baraka" | "liberty" {
  return key.startsWith("pass") ? "al_baraka" : "liberty";
}

function relativeFr(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "—";
  }
}

function formatDateTimeFr(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return "—";
  }
}

function dateRangeStartIso(range: DateRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  start.setDate(start.getDate() - days);
  return start.toISOString();
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminContracts() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  // Filtres
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [page, setPage] = useState(0);

  // Modales
  const [detailContract, setDetailContract] = useState<ContractRow | null>(null);
  const [voidContract, setVoidContract] = useState<ContractRow | null>(null);
  const [resendContract, setResendContract] = useState<ContractRow | null>(null);
  const [resendConfirm, setResendConfirm] = useState<ContractRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Reset page si on change un filtre
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, templateFilter, dateRange]);

  // ─── Query principale ───────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: [
      "admin-contracts",
      { search, statusFilter, templateFilter, dateRange, page },
    ],
    queryFn: async () => {
      let q = (supabase.from("client_contracts" as any) as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (templateFilter !== "all") q = q.eq("template_key", templateFilter);

      const startIso = dateRangeStartIso(dateRange);
      if (startIso) q = q.gte("created_at", startIso);

      if (search.trim().length > 0) {
        const term = search.trim().replace(/[%_]/g, " ");
        const like = `%${term}%`;
        // OR : nom (first/last), email, n° contrat
        q = q.or(
          `client_first_name.ilike.${like},client_last_name.ilike.${like},client_email.ilike.${like},contract_number.ilike.${like}`,
        );
      }

      q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, error, count } = await q;
      if (error) throw error;

      return {
        rows: (data || []) as ContractRow[],
        count: count ?? 0,
      };
    },
  });

  // ─── Stats globales (toutes périodes, indép. des filtres) ──────────────
  const statsQuery = useQuery({
    queryKey: ["admin-contracts-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("client_contracts" as any) as any)
        .select("status");
      if (error) throw error;
      const rows = (data || []) as Array<{ status: string }>;
      const total = rows.length;
      const pending = rows.filter((r) => r.status === "pending_signature").length;
      const signed = rows.filter((r) => r.status === "signed").length;
      const voided = rows.filter((r) => r.status === "voided").length;
      const signatureRate = total > 0 ? Math.round((signed / total) * 100) : 0;
      return { total, pending, signed, voided, signatureRate };
    },
  });

  // ─── Mutation : annuler un contrat ─────────────────────────────────────
  const voidMutation = useMutation({
    mutationFn: async (contract: ContractRow) => {
      const { error } = await (supabase.from("client_contracts" as any) as any)
        .update({ status: "voided" })
        .eq("id", contract.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Contrat annulé", description: "Le statut a été basculé en 'annulé'." });
      qc.invalidateQueries({ queryKey: ["admin-contracts"] });
      qc.invalidateQueries({ queryKey: ["admin-contracts-stats"] });
      setVoidContract(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible d'annuler le contrat.",
        variant: "destructive",
      });
    },
  });

  // ─── Mutation : renvoyer l'email d'accès + signature ──────────────────
  const resendMutation = useMutation({
    mutationFn: async (contract: ContractRow) => {
      if (!contract.buyer_profile_id) {
        throw new Error("Aucun profil acheteur lié à ce contrat.");
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expirée, reconnecte-toi.");

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/send-apporteur-access-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_ids: [contract.buyer_profile_id],
            pass_type: templateToPassType(contract.template_key),
            include_discord_button: true,
            contract_id: contract.id,
          }),
        },
      );
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      try {
        return JSON.parse(text);
      } catch {
        return { sent: [contract.buyer_profile_id], failed: [] };
      }
    },
    onSuccess: (data: { failed?: Array<{ error?: string }> } | undefined, contract) => {
      const failedCount = Array.isArray(data?.failed) ? data.failed.length : 0;
      if (failedCount > 0) {
        const firstError = data!.failed![0]?.error || "erreur inconnue";
        toast({
          title: "Email non envoyé",
          description: firstError,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Email envoyé",
        description: `Renvoyé à ${contract.client_email}.`,
      });
      qc.invalidateQueries({ queryKey: ["admin-contracts"] });
      setResendContract(null);
      setResendConfirm(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de renvoyer l'email.",
        variant: "destructive",
      });
    },
  });

  // ─── Téléchargement PDF (signed URL Storage) ──────────────────────────
  const handleDownloadPdf = async (
    contract: ContractRow,
    variant: "signed" | "unsigned",
  ) => {
    const path =
      variant === "signed" ? contract.signed_pdf_path : contract.unsigned_pdf_path;
    if (!path) {
      toast({
        title: "PDF indisponible",
        description:
          variant === "signed"
            ? "Le contrat n'a pas encore été signé."
            : "Le PDF non signé n'a pas encore été généré.",
        variant: "destructive",
      });
      return;
    }
    setDownloadingId(contract.id);
    try {
      const { data, error } = await supabase.storage
        .from("contracts")
        .createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) {
        throw error || new Error("URL signée vide");
      }
      // Ouvre dans un nouvel onglet (le browser télécharge selon Content-Disposition)
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'obtenir le lien.";
      toast({
        title: "Erreur de téléchargement",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── Garde CEO ─────────────────────────────────────────────────────────
  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  // ─── Memo : pagination calc ────────────────────────────────────────────
  const totalCount = listQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFiltersActive =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    templateFilter !== "all" ||
    dateRange !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTemplateFilter("all");
    setDateRange("all");
  };

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Contrats clients
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Génération automatique post-paiement Pass / Liberty
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="h-5 w-5 text-primary" />}
          label="Total contrats"
          value={stats ? String(stats.total) : "—"}
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="En attente de signature"
          value={stats ? String(stats.pending) : "—"}
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          label="Signés"
          value={stats ? String(stats.signed) : "—"}
          loading={statsQuery.isLoading}
        />
        <StatCard
          icon={<PercentSquare className="h-5 w-5 text-primary" />}
          label="Taux de signature"
          value={stats ? `${stats.signatureRate}%` : "—"}
          loading={statsQuery.isLoading}
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nom, email, n° de contrat…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-48 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending_signature">En attente de signature</SelectItem>
            <SelectItem value="signed">Signés</SelectItem>
            <SelectItem value="voided">Annulés</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={templateFilter}
          onValueChange={(v) => setTemplateFilter(v as TemplateFilter)}
        >
          <SelectTrigger className="w-52 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les formules</SelectItem>
            <SelectItem value="pass_standard">Pass AL BARAKA</SelectItem>
            <SelectItem value="pass_conference">Pass AL BARAKA (conf.)</SelectItem>
            <SelectItem value="liberty_standard">Liberty</SelectItem>
            <SelectItem value="liberty_conference">Liberty (conf.)</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={dateRange}
          onValueChange={(v) => setDateRange(v as DateRange)}
        >
          <SelectTrigger className="w-40 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute la période</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
        {hasFiltersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            Effacer filtres
          </Button>
        )}
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
            title="Rafraîchir"
          >
            <RefreshCw
              className={`h-4 w-4 ${listQuery.isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" /> Chargement…
            </div>
          ) : listQuery.isError ? (
            <div className="py-16 text-center text-destructive">
              Erreur : {(listQuery.error as Error)?.message || "inconnue"}
            </div>
          ) : (listQuery.data?.rows.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun contrat trouvé pour les filtres actuels.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>N° contrat</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Formule</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Modalité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé</TableHead>
                    <TableHead>Signé</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data!.rows.map((c) => (
                    <ContractRowItem
                      key={c.id}
                      row={c}
                      onView={() => setDetailContract(c)}
                      onResend={() => {
                        if (c.email_sent_at) setResendConfirm(c);
                        else resendMutation.mutate(c);
                        setResendContract(c);
                      }}
                      onVoid={() => setVoidContract(c)}
                      onDownload={(variant) => handleDownloadPdf(c, variant)}
                      downloading={downloadingId === c.id}
                      resendLoading={
                        resendMutation.isPending &&
                        resendMutation.variables?.id === c.id
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, totalCount)} sur {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || listQuery.isFetching}
            >
              Précédent
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || listQuery.isFetching}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Détail */}
      <ContractDetailDialog
        contract={detailContract}
        open={!!detailContract}
        onOpenChange={(open) => !open && setDetailContract(null)}
        onDownload={handleDownloadPdf}
      />

      {/* Confirm annulation */}
      <AlertDialog
        open={!!voidContract}
        onOpenChange={(open) => !open && setVoidContract(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le contrat{" "}
              <strong>{voidContract?.contract_number}</strong> sera basculé en
              statut <strong>annulé</strong>. Cette action est réservée aux cas
              de remboursement ou de litige. Le PDF reste archivé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voidMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (voidContract) voidMutation.mutate(voidContract);
              }}
              disabled={voidMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {voidMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm renvoi email (si déjà envoyé) */}
      <AlertDialog
        open={!!resendConfirm}
        onOpenChange={(open) => !open && setResendConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renvoyer l'email&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              L'email a déjà été envoyé le{" "}
              <strong>{formatDateTimeFr(resendConfirm?.email_sent_at ?? null)}</strong>
              {resendConfirm?.email_sent_to
                ? ` à ${resendConfirm.email_sent_to}`
                : ""}
              . Confirme-tu un nouvel envoi&nbsp;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resendMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (resendConfirm) resendMutation.mutate(resendConfirm);
              }}
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              Renvoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="py-4 px-5 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {loading ? "…" : value}
          </p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Row item ──────────────────────────────────────────────────────────────

function ContractRowItem({
  row,
  onView,
  onResend,
  onVoid,
  onDownload,
  downloading,
  resendLoading,
}: {
  row: ContractRow;
  onView: () => void;
  onResend: () => void;
  onVoid: () => void;
  onDownload: (variant: "signed" | "unsigned") => void;
  downloading: boolean;
  resendLoading: boolean;
}) {
  const isSigned = row.status === "signed";
  const isVoided = row.status === "voided";
  const isPending = row.status === "pending_signature";
  const discountInfo =
    row.discount_amount > 0 ? ` (-${formatEur(row.discount_amount)})` : "";

  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-primary">
        {row.contract_number}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {row.client_first_name} {row.client_last_name}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[220px]">
            {row.client_email}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-sm">{templateLabel(row.template_key)}</TableCell>
      <TableCell className="text-right tabular-nums">
        <div className="flex flex-col items-end">
          <span className="font-semibold">{formatEur(row.amount_total)}</span>
          {discountInfo && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {discountInfo}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.payment_modality}
      </TableCell>
      <TableCell>
        {isSigned && (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Signé
          </Badge>
        )}
        {isPending && (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" /> En attente
          </Badge>
        )}
        {isVoided && (
          <Badge variant="secondary" className="text-zinc-500">
            <XCircle className="h-3 w-3 mr-1" /> Annulé
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {relativeFr(row.created_at)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {row.signed_at ? format(new Date(row.signed_at), "dd/MM/yyyy") : "—"}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={downloading || resendLoading}
            >
              {downloading || resendLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" /> Voir le contrat
            </DropdownMenuItem>
            {row.signed_pdf_path && (
              <DropdownMenuItem onClick={() => onDownload("signed")}>
                <Download className="h-4 w-4 mr-2" /> PDF signé
              </DropdownMenuItem>
            )}
            {row.unsigned_pdf_path && !isSigned && (
              <DropdownMenuItem onClick={() => onDownload("unsigned")}>
                <Download className="h-4 w-4 mr-2" /> PDF non signé
              </DropdownMenuItem>
            )}
            {(isPending || !row.email_sent_at) && !isVoided && (
              <DropdownMenuItem onClick={onResend}>
                <Mail className="h-4 w-4 mr-2" />{" "}
                {row.email_sent_at ? "Renvoyer email" : "Envoyer email"}
              </DropdownMenuItem>
            )}
            {!isVoided && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onVoid}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" /> Annuler le contrat
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ─── Détail ───────────────────────────────────────────────────────────────

function ContractDetailDialog({
  contract,
  open,
  onOpenChange,
  onDownload,
}: {
  contract: ContractRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (c: ContractRow, variant: "signed" | "unsigned") => void;
}) {
  const agreements = useMemo(() => {
    if (!contract) return [];
    return Array.isArray(contract.agreements_snapshot)
      ? contract.agreements_snapshot
      : [];
  }, [contract]);

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">
            {contract.contract_number}
          </DialogTitle>
          <DialogDescription>
            {templateLabel(contract.template_key)} —{" "}
            {format(new Date(contract.created_at), "dd MMMM yyyy 'à' HH:mm", {
              locale: fr,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Client */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Client
            </h3>
            <div className="rounded-lg border border-border/60 p-4 space-y-1.5">
              <div className="font-medium text-foreground">
                {contract.client_first_name} {contract.client_last_name}
              </div>
              <div className="text-muted-foreground">{contract.client_email}</div>
              <div className="text-muted-foreground">{contract.client_phone}</div>
              <div className="text-muted-foreground">
                {contract.client_address}
              </div>
              <div className="text-muted-foreground">
                {contract.client_postal_code} {contract.client_city},{" "}
                {contract.client_country}
              </div>
            </div>
          </section>

          {/* Vente */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Vente
            </h3>
            <div className="rounded-lg border border-border/60 p-4 space-y-1.5">
              <Row label="Formule" value={templateLabel(contract.template_key)} />
              <Row
                label="Prix d'origine"
                value={formatEur(contract.amount_original)}
              />
              {contract.discount_amount > 0 && (
                <Row
                  label={`Remise${contract.coupon_code ? ` (${contract.coupon_code})` : ""}`}
                  value={`-${formatEur(contract.discount_amount)}`}
                  valueClassName="text-emerald-600 dark:text-emerald-400"
                />
              )}
              <Row
                label="Montant total"
                value={formatEur(contract.amount_total)}
                valueClassName="font-semibold text-foreground"
              />
              <Row label="Modalité" value={contract.payment_modality} />
              <Row
                label="Première échéance"
                value={
                  contract.first_payment_date
                    ? format(new Date(contract.first_payment_date), "dd/MM/yyyy")
                    : "—"
                }
              />
            </div>
          </section>

          {/* Statut */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Statut
            </h3>
            <div className="rounded-lg border border-border/60 p-4 space-y-1.5">
              <Row label="Statut actuel" value={statusLabel(contract.status)} />
              <Row label="Créé le" value={formatDateTimeFr(contract.created_at)} />
              <Row
                label="Signé le"
                value={formatDateTimeFr(contract.signed_at)}
              />
              <Row
                label="Email envoyé"
                value={
                  contract.email_sent_at
                    ? `${formatDateTimeFr(contract.email_sent_at)}${contract.email_sent_to ? ` → ${contract.email_sent_to}` : ""}`
                    : "—"
                }
              />
              {contract.signed_at && (
                <>
                  <Row
                    label="IP signature"
                    value={contract.signature_ip || "—"}
                  />
                  <Row
                    label="User agent"
                    value={contract.signature_user_agent || "—"}
                    valueClassName="text-xs break-all"
                  />
                </>
              )}
            </div>
          </section>

          {/* Engagements */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Engagements ({agreements.length})
            </h3>
            <div className="rounded-lg border border-border/60 p-4 space-y-2">
              {agreements.length === 0 ? (
                <p className="text-muted-foreground italic">
                  Aucun engagement enregistré.
                </p>
              ) : (
                agreements.map((ag, idx) => (
                  <div
                    key={ag.id || idx}
                    className="flex items-start gap-2 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-foreground">{ag.text || "—"}</p>
                      {ag.checked_at && (
                        <p className="text-muted-foreground mt-0.5">
                          {formatDateTimeFr(ag.checked_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {contract.signed_pdf_path && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(contract, "signed")}
            >
              <Download className="h-4 w-4 mr-1.5" /> PDF signé
            </Button>
          )}
          {contract.unsigned_pdf_path && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(contract, "unsigned")}
            >
              <Download className="h-4 w-4 mr-1.5" /> PDF non signé
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-foreground text-right ${valueClassName || ""}`}>
        {value}
      </span>
    </div>
  );
}

function statusLabel(s: ContractRow["status"]): string {
  if (s === "signed") return "Signé";
  if (s === "voided") return "Annulé";
  return "En attente de signature";
}
