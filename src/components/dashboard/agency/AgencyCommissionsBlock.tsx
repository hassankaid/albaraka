// AgencyCommissionsBlock — bloc synthèse des commissions de l'agence
// affiché sous le Marketing Dashboard dans le AgencyDashboard.
//
// 3 KPIs :
//   - Commissions collectées (status=paid)
//   - Commissions à venir (status IN due/invoiced/pending)
//   - ROI (total / budget ads de la période)
//
// Les 2 premiers KPIs sont cliquables → ouvrent une modale avec le détail
// des lignes concernées. Le ROI est informatif (pas de drill-down).
//
// Filtre période : prop `filter` synchronisée avec MarketingTab via le parent.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMarketingDashboardData } from "@/hooks/useMarketingDashboardData";
import type { ConferenceFilter } from "@/lib/marketing/conferenceFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Loader2, CheckCircle2, Clock, TrendingUp, Info, Euro } from "lucide-react";
import { formatDateOnly } from "@/lib/formatDate";

// ─── Formatters ──────────────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const eur2 = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

// ─── Types ───────────────────────────────────────────────────────────
interface CommissionRow {
  id: string;
  sale_id: string;
  role: string;
  amount: number | null;
  percentage: number | null;
  status: string | null;
  paid_at: string | null;
  sale_product: string | null;
  sale_amount_ht: number | null;
  sale_sold_at: string | null;
  sale_conference_date: string | null;
  client_name: string | null;
}

type DrillKind = "collected" | "pending";

// ─── Component ───────────────────────────────────────────────────────
export default function AgencyCommissionsBlock({ filter }: { filter: ConferenceFilter }) {
  const { profile } = useAuth();
  const userId = profile?.id;

  // Budget ads via le hook déjà en place (React Query cache → pas de double fetch)
  const { data: marketingData } = useMarketingDashboardData(filter);
  const budgetAds = marketingData?.budget ?? 0;

  // Commissions de l'agence filtrées par conference_date de la vente liée
  const { data: commissions, isLoading } = useQuery({
    queryKey: ["agency-commissions", userId, JSON.stringify(filter)],
    enabled: !!userId,
    queryFn: async (): Promise<CommissionRow[]> => {
      // sales!inner pour filtrer sur sales.conference_date
      let q: any = (supabase as any)
        .from("commissions")
        .select(
          `id, sale_id, role, amount, percentage, status, paid_at,
           sales!inner(id, product, amount_ht, sold_at, conference_date,
                      contacts!sales_contact_id_fkey(full_name))`,
        )
        .eq("beneficiary_user_id", userId);

      if (filter.mode === "single") {
        q = q.eq("sales.conference_date", filter.date);
      } else if (filter.mode === "range") {
        q = q.gte("sales.conference_date", filter.from).lte("sales.conference_date", filter.to);
      }
      // mode "all" → aucun filtre

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        id: c.id,
        sale_id: c.sale_id,
        role: c.role,
        amount: c.amount !== null ? Number(c.amount) : null,
        percentage: c.percentage !== null ? Number(c.percentage) : null,
        status: c.status,
        paid_at: c.paid_at,
        sale_product: c.sales?.product ?? null,
        sale_amount_ht: c.sales?.amount_ht ? Number(c.sales.amount_ht) : null,
        sale_sold_at: c.sales?.sold_at ?? null,
        sale_conference_date: c.sales?.conference_date ?? null,
        client_name: c.sales?.contacts?.full_name ?? null,
      }));
    },
  });

  const collected = useMemo(
    () => (commissions ?? []).filter((c) => c.status === "paid"),
    [commissions],
  );
  const pending = useMemo(
    () => (commissions ?? []).filter((c) => ["due", "invoiced", "pending"].includes(c.status ?? "")),
    [commissions],
  );
  const collectedTotal = collected.reduce((s, c) => s + (c.amount ?? 0), 0);
  const pendingTotal = pending.reduce((s, c) => s + (c.amount ?? 0), 0);
  const totalActif = collectedTotal + pendingTotal;
  const roi = budgetAds > 0 ? (totalActif / budgetAds) * 100 : null;

  const [drill, setDrill] = useState<DrillKind | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Euro className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Mes Commissions</h3>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            Agence
          </Badge>
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />}
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard
            label="Collectées"
            value={eur(collectedTotal)}
            subLabel={`${collected.length} ligne${collected.length !== 1 ? "s" : ""}`}
            icon={CheckCircle2}
            color="text-emerald-500"
            tooltip="Commissions dont le paiement a été encaissé (status=paid)."
            onClick={collected.length > 0 ? () => setDrill("collected") : undefined}
          />
          <KpiCard
            label="À venir"
            value={eur(pendingTotal)}
            subLabel={`${pending.length} ligne${pending.length !== 1 ? "s" : ""}`}
            icon={Clock}
            color="text-amber-500"
            tooltip="Commissions dues, facturées ou en attente de paiement (hors annulées)."
            onClick={pending.length > 0 ? () => setDrill("pending") : undefined}
          />
          <KpiCard
            label="ROI"
            value={roi !== null ? `${roi.toFixed(0)}%` : "—"}
            subLabel={roi !== null ? `${eur(totalActif)} / ${eur(budgetAds)}` : "Pas de budget ads sur la période"}
            icon={TrendingUp}
            color="text-primary"
            tooltip="ROI agence = (commissions collectées + à venir) ÷ budget ads de la période."
          />
        </div>

        {/* Modale drill-down */}
        <CommissionsModal
          open={!!drill}
          onClose={() => setDrill(null)}
          title={drill === "collected" ? "Commissions collectées" : "Commissions à venir"}
          rows={drill === "collected" ? collected : drill === "pending" ? pending : []}
        />
      </div>
    </TooltipProvider>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  subLabel,
  icon: Icon,
  color,
  tooltip,
  onClick,
}: {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tooltip?: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <Card
      onClick={onClick}
      className={
        clickable
          ? "cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
          : ""
      }
    >
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${color}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
          </div>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {subLabel && <div className="text-[11px] text-muted-foreground">{subLabel}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Modale drill-down ───────────────────────────────────────────────
function CommissionsModal({
  open,
  onClose,
  title,
  rows,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: CommissionRow[];
}) {
  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4 pr-8">
            <span>{title}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length} ligne{rows.length !== 1 ? "s" : ""} · Total {eur2(total)}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vente</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Montant vente</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead>Payée le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune ligne
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.sale_sold_at ? formatDateOnly(r.sale_sold_at) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{r.client_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.sale_product ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {r.sale_amount_ht !== null ? eur2(r.sale_amount_ht) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {r.amount !== null ? eur2(r.amount) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.paid_at ? formatDateOnly(r.paid_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    paid: { label: "Payée", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    due: { label: "Due", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    invoiced: { label: "Facturée", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    pending: { label: "En attente", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
    cancelled: { label: "Annulée", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  };
  const cfg = map[status ?? ""] ?? { label: status ?? "—", className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}
