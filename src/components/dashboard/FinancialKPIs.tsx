import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Percent, AlertTriangle, PiggyBank, BarChart3, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Payment {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  sale_id: string | null;
  payment_number: number;
  total_payments: number;
}

interface Sale {
  id: string;
  amount_ht: number;
  contact_id: string;
  product: string;
  mensualites: number | null;
  payment_status: string | null;
  sold_at: string | null;
}

interface ContactInfo {
  id: string;
  full_name: string | null;
}

interface Commission {
  id: string;
  amount: number | null;
  status: string | null;
  role: string;
  beneficiary_user_id: string | null;
  beneficiary_external: string | null;
  sale_id: string;
}

interface ProfileInfo {
  id: string;
  full_name: string;
}

interface FixedCharge {
  id: string;
  name: string;
  amount: number;
  frequency: string;
}

interface Props {
  caGenere: number;
  caCollecte: number;
  tauxCashCollecte: number;
  tauxImpayes: number;
  benefice: number;
  totalChargesCumul: number;
  totalCommissions: number;
  isFiltered?: boolean;
  // Detail data
  sales: Sale[];
  payments: Payment[];
  contactMap: Map<string, ContactInfo>;
  commissions: Commission[];
  profiles: ProfileInfo[];
  totalSalariesCumul: number;
  totalFixedChargesCumul: number;
  commissionsPaid: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const saleStatusCfg: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]" },
  in_progress: { label: "En cours", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  pending: { label: "En attente", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  late: { label: "Retard", className: "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]" },
  lost: { label: "Perdu", className: "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]" },
};

const paymentStatusCfg: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]" },
  pending: { label: "En attente", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  late: { label: "En retard", className: "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]" },
  lost: { label: "Perdu", className: "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]" },
};

type KpiKey = "caGenere" | "caCollecte" | "tauxCollecte" | "tauxImpayes" | "commissions" | "charges" | "benefice" | "roi";

export default function FinancialKPIs(props: Props) {
  const {
    caGenere, caCollecte, tauxCashCollecte, tauxImpayes, benefice,
    totalChargesCumul, totalCommissions, isFiltered,
    sales, payments, contactMap, commissions, profiles,
    totalSalariesCumul, totalFixedChargesCumul, commissionsPaid,
  } = props;

  const [openModal, setOpenModal] = useState<KpiKey | null>(null);
  const [modalPage, setModalPage] = useState(0);

  // Reset page when modal changes
  const handleOpenModal = (key: KpiKey) => { setModalPage(0); setOpenModal(key); };

  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const saleMap = new Map(sales.map(s => [s.id, s]));

  const kpis: { key: KpiKey; label: string; value: string; icon: any; color: string; hasDetail: boolean }[] = [
    { key: "caGenere", label: "CA Généré", value: fmt(caGenere), icon: TrendingUp, color: "text-primary", hasDetail: true },
    { key: "caCollecte", label: "CA Collecté", value: fmt(caCollecte), icon: Wallet, color: "text-emerald-500", hasDetail: true },
    { key: "tauxCollecte", label: isFiltered ? "Taux collecte" : "Taux encaissé", value: `${tauxCashCollecte.toFixed(1)}%`, icon: Percent, color: "text-blue-500", hasDetail: true },
    { key: "tauxImpayes", label: isFiltered ? "Éch. impayées" : "Taux d'impayés", value: `${tauxImpayes.toFixed(1)}%`, icon: AlertTriangle, color: tauxImpayes > 10 ? "text-destructive" : "text-amber-500", hasDetail: true },
    { key: "commissions", label: "Commissions", value: fmt(totalCommissions), icon: CreditCard, color: "text-orange-500", hasDetail: true },
    { key: "charges", label: "Charges", value: fmt(totalChargesCumul), icon: BarChart3, color: "text-muted-foreground", hasDetail: true },
    { key: "benefice", label: "Bénéfice", value: fmt(benefice), icon: PiggyBank, color: benefice >= 0 ? "text-emerald-500" : "text-destructive", hasDetail: true },
    { key: "roi", label: "ROI Ads", value: "—", icon: TrendingDown, color: "text-muted-foreground", hasDetail: false },
  ];

  // ── Compute detail data based on modal ──
  const paidPayments = payments.filter(p => p.status === "paid");
  const lateOrLostPayments = payments.filter(p => p.status === "late" || p.status === "lost");
  const dueCommissions = commissions.filter(c => c.status === "due" || c.status === "invoiced");
  const paidCommissions = commissions.filter(c => c.status === "paid");

  const MODAL_PAGE_SIZE = 15;

  const sortedSalesForCA = useMemo(() =>
    [...sales].sort((a, b) => (b.sold_at || "").localeCompare(a.sold_at || "")),
    [sales]
  );

  const renderModalContent = (key: KpiKey) => {
    switch (key) {
      case "caGenere": {
        const totalPages = Math.ceil(sortedSalesForCA.length / MODAL_PAGE_SIZE);
        const safePage = Math.min(modalPage, Math.max(0, totalPages - 1));
        const paginated = sortedSalesForCA.slice(safePage * MODAL_PAGE_SIZE, (safePage + 1) * MODAL_PAGE_SIZE);

        return (
          <div className="space-y-0">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_50px_56px_68px_90px] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Client</span>
              <span>Date</span>
              <span className="text-center">Mens.</span>
              <span className="text-center">Éch.</span>
              <span className="text-center">Statut</span>
              <span className="text-right">Montant HT</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/40">
              {paginated.map((s, idx) => {
                const contact = contactMap.get(s.contact_id);
                const totalCount = s.mensualites || 1;
                const salePayments = payments.filter(p => p.sale_id === s.id);
                const paidCount = salePayments.filter(p => p.status === "paid").length;
                const isComplete = paidCount >= totalCount;
                const cfg = saleStatusCfg[s.payment_status || "pending"] || saleStatusCfg.pending;

                return (
                  <div key={s.id} className={`grid grid-cols-[1fr_100px_50px_56px_68px_90px] gap-3 items-center px-3 py-2.5 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">{contact?.full_name || "Inconnu"}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{s.sold_at ? formatDate(s.sold_at) : "—"}</span>
                    <span className="text-[11px] font-medium text-foreground tabular-nums text-center">{totalCount}×</span>
                    <div className="flex justify-center">
                      {isComplete ? (
                        <span className="text-[hsl(var(--kpi-paid))] text-xs">✓</span>
                      ) : (
                        <span className="text-[11px] font-semibold tabular-nums text-foreground">{paidCount}<span className="text-muted-foreground">/{totalCount}</span></span>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>{cfg.label}</Badge>
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(s.amount_ht)}</span>
                  </div>
                );
              })}
            </div>

            {/* Footer with pagination */}
            <div className="flex items-center justify-between pt-3 border-t border-border px-3">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{sales.length}</span> vente{sales.length > 1 ? "s" : ""} — Total <span className="font-bold text-foreground">{fmt(caGenere)}</span>
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button disabled={safePage === 0} onClick={() => setModalPage(p => p - 1)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] text-muted-foreground tabular-nums px-1">{safePage + 1}/{totalPages}</span>
                  <button disabled={safePage >= totalPages - 1} onClick={() => setModalPage(p => p + 1)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "caCollecte":
      case "tauxCollecte":
        return (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_80px_80px_70px] gap-2 px-2 pb-1.5 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Client</span>
              <span>Échéance</span>
              <span className="text-right">Montant</span>
              <span className="text-center">Statut</span>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y divide-border/50">
                {paidPayments.sort((a, b) => b.due_date.localeCompare(a.due_date)).map(p => {
                  const sale = p.sale_id ? saleMap.get(p.sale_id) : null;
                  const contact = sale ? contactMap.get(sale.contact_id) : null;
                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_80px_80px_70px] gap-2 items-center px-2 py-1.5">
                      <span className="text-xs font-medium text-foreground truncate">{contact?.full_name || "Inconnu"}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(p.due_date)}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(p.amount)}</span>
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]">
                          Payé
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="border-t border-border pt-2 px-2 flex justify-between">
              <span className="text-xs font-medium text-muted-foreground">{paidPayments.length} échéance{paidPayments.length > 1 ? "s" : ""} payée{paidPayments.length > 1 ? "s" : ""}</span>
              <span className="text-sm font-bold text-[hsl(var(--kpi-paid))]">{fmt(caCollecte)}</span>
            </div>
          </div>
        );

      case "tauxImpayes":
        return (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_80px_80px_70px] gap-2 px-2 pb-1.5 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Client</span>
              <span>Échéance</span>
              <span className="text-right">Montant</span>
              <span className="text-center">Statut</span>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y divide-border/50">
                {lateOrLostPayments.sort((a, b) => a.due_date.localeCompare(b.due_date)).map(p => {
                  const sale = p.sale_id ? saleMap.get(p.sale_id) : null;
                  const contact = sale ? contactMap.get(sale.contact_id) : null;
                  const cfg = paymentStatusCfg[p.status] || paymentStatusCfg.pending;
                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_80px_80px_70px] gap-2 items-center px-2 py-1.5">
                      <span className="text-xs font-medium text-foreground truncate">{contact?.full_name || "Inconnu"}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(p.due_date)}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(p.amount)}</span>
                      <div className="flex justify-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>{cfg.label}</Badge>
                      </div>
                    </div>
                  );
                })}
                {lateOrLostPayments.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">Aucune échéance impayée 🎉</p>
                )}
              </div>
            </ScrollArea>
            {lateOrLostPayments.length > 0 && (
              <div className="border-t border-border pt-2 px-2 flex justify-between">
                <span className="text-xs font-medium text-muted-foreground">{lateOrLostPayments.length} échéance{lateOrLostPayments.length > 1 ? "s" : ""}</span>
                <span className="text-sm font-bold text-destructive">{fmt(lateOrLostPayments.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
            )}
          </div>
        );

      case "commissions":
        const allComms = [...paidCommissions, ...dueCommissions].sort((a, b) => (b.amount || 0) - (a.amount || 0));
        return (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_80px_80px_70px] gap-2 px-2 pb-1.5 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Bénéficiaire</span>
              <span>Rôle</span>
              <span className="text-right">Montant</span>
              <span className="text-center">Statut</span>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y divide-border/50">
                {allComms.map(c => {
                  const name = c.beneficiary_user_id ? profileMap.get(c.beneficiary_user_id)?.full_name : c.beneficiary_external;
                  const isPaid = c.status === "paid";
                  return (
                    <div key={c.id} className="grid grid-cols-[1fr_80px_80px_70px] gap-2 items-center px-2 py-1.5">
                      <span className="text-xs font-medium text-foreground truncate">{name || "—"}</span>
                      <span className="text-[11px] text-muted-foreground capitalize">{c.role === "agence_marketing" ? "Agence" : c.role}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(c.amount || 0)}</span>
                      <div className="flex justify-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${isPaid ? paymentStatusCfg.paid.className : paymentStatusCfg.pending.className}`}>
                          {isPaid ? "Payée" : "Due"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="border-t border-border pt-2 px-2 flex justify-between">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium">{paidCommissions.length}</span> payée{paidCommissions.length > 1 ? "s" : ""} · <span className="font-medium">{dueCommissions.length}</span> due{dueCommissions.length > 1 ? "s" : ""}
              </span>
              <span className="text-sm font-bold text-foreground">{fmt(totalCommissions)}</span>
            </div>
          </div>
        );

      case "charges":
        return (
          <div className="space-y-3 px-2">
            {[
              { label: "Commissions payées", amount: commissionsPaid, color: "bg-orange-400" },
              { label: "Salaires fixes", amount: totalSalariesCumul, color: "bg-blue-400" },
              { label: "Charges fixes", amount: totalFixedChargesCumul, color: "bg-violet-400" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">{fmt(item.amount)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total charges</span>
              <span className="text-sm font-bold text-foreground">{fmt(totalChargesCumul)}</span>
            </div>
          </div>
        );

      case "benefice":
        return (
          <div className="space-y-3 px-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">CA Collecté (entrées)</span>
              <span className="text-sm font-bold text-[hsl(var(--kpi-paid))] tabular-nums">{fmt(caCollecte)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Commissions payées</span>
              <span className="text-sm font-bold text-foreground tabular-nums">- {fmt(commissionsPaid)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Charges (salaires + fixes)</span>
              <span className="text-sm font-bold text-foreground tabular-nums">- {fmt(totalSalariesCumul + totalFixedChargesCumul)}</span>
            </div>
            <div className="border-t-2 border-border pt-3 flex justify-between">
              <span className="text-sm font-semibold text-foreground">Bénéfice net</span>
              <span className={`text-lg font-bold tabular-nums ${benefice >= 0 ? "text-[hsl(var(--kpi-paid))]" : "text-destructive"}`}>{fmt(benefice)}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const modalTitles: Record<KpiKey, string> = {
    caGenere: "Détail — CA Généré",
    caCollecte: "Détail — CA Collecté",
    tauxCollecte: isFiltered ? "Détail — Taux de collecte" : "Détail — Taux encaissé",
    tauxImpayes: isFiltered ? "Détail — Échéances impayées" : "Détail — Taux d'impayés",
    commissions: "Détail — Commissions",
    charges: "Détail — Charges",
    benefice: "Détail — Bénéfice",
    roi: "ROI Ads",
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((k) => (
          <button
            key={k.key}
            onClick={() => k.hasDetail && setOpenModal(k.key)}
            disabled={!k.hasDetail}
            className={`bg-card border border-border rounded-xl p-3 flex flex-col gap-1 text-left transition-all ${
              k.hasDetail ? "hover:border-primary/30 hover:shadow-sm cursor-pointer" : "cursor-default"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
              <span className="text-[11px] text-muted-foreground font-medium truncate">{k.label}</span>
            </div>
            <span className="text-sm font-bold text-foreground">{k.value}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!openModal} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{openModal ? modalTitles[openModal] : ""}</DialogTitle>
          </DialogHeader>
          {openModal && renderModalContent(openModal)}
        </DialogContent>
      </Dialog>
    </>
  );
}
