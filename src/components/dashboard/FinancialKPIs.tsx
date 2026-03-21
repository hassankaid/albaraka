import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Percent, AlertTriangle, PiggyBank, BarChart3, User, ChevronLeft, ChevronRight, CheckCheck, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
  percentage?: number;
  payment_id?: string | null;
  paid_at?: string | null;
}

interface ProfileInfo {
  id: string;
  full_name: string;
}

interface ActiveSalary {
  id: string;
  profile_id: string;
  full_name: string;
  amount: number;
  start_date: string;
  end_date: string | null;
}

interface ActiveCharge {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
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
  sales: Sale[];
  payments: Payment[];
  paidInPeriod: Payment[];
  contactMap: Map<string, ContactInfo>;
  commissions: Commission[];
  profiles: ProfileInfo[];
  totalSalariesCumul: number;
  totalFixedChargesCumul: number;
  commissionsPaid: number;
  activeSalaries: ActiveSalary[];
  activeCharges: ActiveCharge[];
  allPayments: Payment[];
  allSales: Sale[];
  totalAdsCumul: number;
  roi: number | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const statusCfg: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-[hsl(var(--kpi-paid)/0.15)] text-[hsl(var(--kpi-paid))] border-[hsl(var(--kpi-paid)/0.3)]" },
  in_progress: { label: "En cours", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  pending: { label: "En attente", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  late: { label: "Retard", className: "bg-[hsl(var(--kpi-late)/0.15)] text-[hsl(var(--kpi-late))] border-[hsl(var(--kpi-late)/0.4)]" },
  lost: { label: "Perdu", className: "bg-[hsl(var(--kpi-lost)/0.2)] text-[hsl(var(--kpi-lost))] border-[hsl(var(--kpi-lost)/0.5)]" },
  due: { label: "À payer", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
  invoiced: { label: "Facturée", className: "bg-[hsl(var(--kpi-in-progress)/0.15)] text-[hsl(var(--kpi-in-progress))] border-[hsl(var(--kpi-in-progress)/0.3)]" },
};

const roleLabels: Record<string, string> = {
  closer: "Closer",
  setter: "Setter",
  apporteur: "Apporteur",
  agence_marketing: "Agence",
};

const freqLabels: Record<string, string> = {
  monthly: "Mensuel",
  yearly: "Annuel",
  one_time: "Ponctuel",
};

type KpiKey = "caGenere" | "caCollecte" | "tauxCollecte" | "tauxImpayes" | "commissions" | "charges" | "benefice" | "roi";

const MODAL_PAGE_SIZE = 15;

// Reusable pagination footer
function ModalPagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (fn: (p: number) => number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 transition-colors">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="text-[11px] text-muted-foreground tabular-nums px-1">{page + 1} / {totalPages}</span>
      <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 transition-colors">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function FinancialKPIs(props: Props) {
  const {
    caGenere, caCollecte, tauxCashCollecte, tauxImpayes, benefice,
    totalChargesCumul, totalCommissions, isFiltered,
    sales, payments, paidInPeriod, contactMap, commissions, profiles,
    totalSalariesCumul, totalFixedChargesCumul, commissionsPaid,
    activeSalaries, activeCharges, allPayments, allSales,
    totalAdsCumul, roi,
  } = props;

  const [openModal, setOpenModal] = useState<KpiKey | null>(null);
  const [modalPage, setModalPage] = useState(0);
  const [commFilterBenef, setCommFilterBenef] = useState<string>("all");
  const [commFilterSale, setCommFilterSale] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const handleOpenModal = (key: KpiKey) => { setModalPage(0); setCommFilterBenef("all"); setCommFilterSale("all"); setSearchQuery(""); setOpenModal(key); };

  const profileMap = new Map(profiles.map(p => [p.id, p]));
  // Use allSales for lookups so filtered payments always find their sale/contact
  const saleMap = new Map(allSales.map(s => [s.id, s]));
  // Use allPayments for commission lookups (commissions may reference payments outside filtered range)
  const allPaymentMap = new Map(allPayments.map(p => [p.id, p]));

  const roiDisplayValue = roi !== null
    ? `x${roi.toFixed(2)}`
    : "—";

  const roiColor = roi !== null
    ? roi >= 1
      ? "text-emerald-500"
      : "text-destructive"
    : "text-muted-foreground";

  const kpis: { key: KpiKey; label: string; value: string; icon: any; color: string; hasDetail: boolean }[] = [
    { key: "caGenere", label: "CA Généré", value: fmt(caGenere), icon: TrendingUp, color: "text-primary", hasDetail: true },
    { key: "caCollecte", label: "CA Collecté", value: fmt(caCollecte), icon: Wallet, color: "text-emerald-500", hasDetail: true },
    { key: "tauxCollecte", label: isFiltered ? "Taux collecte" : "Taux encaissé", value: `${tauxCashCollecte.toFixed(1)}%`, icon: Percent, color: "text-blue-500", hasDetail: true },
    { key: "tauxImpayes", label: isFiltered ? "Éch. impayées" : "Taux d'impayés", value: `${tauxImpayes.toFixed(1)}%`, icon: AlertTriangle, color: tauxImpayes > 10 ? "text-destructive" : "text-amber-500", hasDetail: true },
    { key: "commissions", label: "Commissions", value: fmt(totalCommissions), icon: CreditCard, color: "text-orange-500", hasDetail: true },
    { key: "charges", label: "Charges", value: fmt(totalChargesCumul), icon: BarChart3, color: "text-muted-foreground", hasDetail: true },
    { key: "benefice", label: "Bénéfice", value: fmt(benefice), icon: PiggyBank, color: benefice >= 0 ? "text-emerald-500" : "text-destructive", hasDetail: true },
    { key: "roi", label: "ROI", value: roiDisplayValue, icon: TrendingUp, color: roiColor, hasDetail: false },
  ];

  const sortedSalesForCA = useMemo(() => [...sales].sort((a, b) => (b.sold_at || "").localeCompare(a.sold_at || "")), [sales]);
  const paidPayments = useMemo(() => [...payments].filter(p => p.status === "paid").sort((a, b) => b.due_date.localeCompare(a.due_date)), [payments]);
  const lateOrLostPayments = useMemo(() => [...payments].filter(p => p.status === "late" || p.status === "lost").sort((a, b) => b.due_date.localeCompare(a.due_date)), [payments]);
  const engagedCommissions = useMemo(() => {
    const getDate = (c: Commission) => {
      const p = c.payment_id ? allPaymentMap.get(c.payment_id) : null;
      // Primary: payment client paid_at, fallback: due_date
      return p?.paid_at || p?.due_date || "";
    };
    return commissions
      .filter(c => c.status === "due" || c.status === "paid" || c.status === "invoiced")
      .sort((a, b) => getDate(b).localeCompare(getDate(a)));
  }, [commissions, allPaymentMap]);

  // Unique beneficiaries and sales for commission filters
  const commBeneficiaries = useMemo(() => {
    const map = new Map<string, string>();
    engagedCommissions.forEach(c => {
      const key = c.beneficiary_user_id || c.beneficiary_external || "";
      if (!key || map.has(key)) return;
      const name = c.beneficiary_user_id ? profileMap.get(c.beneficiary_user_id)?.full_name : c.beneficiary_external;
      if (name) map.set(key, name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [engagedCommissions, profileMap]);

  const commSales = useMemo(() => {
    const map = new Map<string, string>();
    engagedCommissions.forEach(c => {
      if (map.has(c.sale_id)) return;
      const sale = saleMap.get(c.sale_id);
      const clientName = sale ? contactMap.get(sale.contact_id)?.full_name : null;
      if (clientName) map.set(c.sale_id, clientName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [engagedCommissions, saleMap, contactMap]);

  const filteredCommissions = useMemo(() => {
    return engagedCommissions.filter(c => {
      if (commFilterBenef !== "all") {
        const key = c.beneficiary_user_id || c.beneficiary_external || "";
        if (key !== commFilterBenef) return false;
      }
      if (commFilterSale !== "all" && c.sale_id !== commFilterSale) return false;
      return true;
    });
  }, [engagedCommissions, commFilterBenef, commFilterSale]);

  function paginate<T>(items: T[]) {
    const totalPages = Math.ceil(items.length / MODAL_PAGE_SIZE);
    const safePage = Math.min(modalPage, Math.max(0, totalPages - 1));
    return { items: items.slice(safePage * MODAL_PAGE_SIZE, (safePage + 1) * MODAL_PAGE_SIZE), safePage, totalPages };
  }

  const renderModalContent = (key: KpiKey) => {
    switch (key) {
      // ═══════════════════ CA GÉNÉRÉ ═══════════════════
      case "caGenere": {
        const { items, safePage, totalPages } = paginate(sortedSalesForCA);
        return (
          <div>
            <div className="grid grid-cols-[1fr_100px_50px_56px_68px_90px] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Client</span><span>Date</span><span className="text-center">Mens.</span><span className="text-center">Éch.</span><span className="text-center">Statut</span><span className="text-right">Montant HT</span>
            </div>
            <div className="divide-y divide-border/40">
              {items.map((s, idx) => {
                const contact = contactMap.get(s.contact_id);
                const totalCount = s.mensualites || 1;
                const sp = payments.filter(p => p.sale_id === s.id);
                const paidCount = sp.filter(p => p.status === "paid").length;
                const isComplete = paidCount >= totalCount;
                const cfg = statusCfg[s.payment_status || "pending"] || statusCfg.pending;
                return (
                  <div key={s.id} className={`grid grid-cols-[1fr_100px_50px_56px_68px_90px] gap-3 items-center px-3 py-2.5 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><User className="h-3 w-3 text-muted-foreground" /></div>
                      <span className="text-xs font-medium text-foreground truncate">{contact?.full_name || "Inconnu"}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{s.sold_at ? formatDate(s.sold_at) : "—"}</span>
                    <span className="text-[11px] font-medium text-foreground tabular-nums text-center">{totalCount}×</span>
                    <div className="flex justify-center">
                      {isComplete ? <CheckCheck className="h-4 w-4 text-[hsl(var(--kpi-paid))]" /> : <span className="text-[11px] font-semibold tabular-nums text-foreground">{paidCount}<span className="text-muted-foreground">/{totalCount}</span></span>}
                    </div>
                    <div className="flex justify-center"><Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>{cfg.label}</Badge></div>
                    <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(s.amount_ht)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border px-3">
              <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{sales.length}</span> vente{sales.length > 1 ? "s" : ""} — Total <span className="font-bold text-foreground">{fmt(caGenere)}</span></span>
              <ModalPagination page={safePage} totalPages={totalPages} setPage={setModalPage} />
            </div>
          </div>
        );
      }

      // ═══════════════════ CA COLLECTÉ / TAUX COLLECTE ═══════════════════
      case "caCollecte":
      case "tauxCollecte": {
        const { items, safePage, totalPages } = paginate(paidPayments);
        return (
          <div>
            <div className="grid grid-cols-[1fr_100px_56px_80px_68px_90px] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Client</span><span>Date éch.</span><span className="text-center">N°</span><span className="text-center">Date paiem.</span><span className="text-center">Statut</span><span className="text-right">Montant</span>
            </div>
            <div className="divide-y divide-border/40">
              {items.map((p, idx) => {
                const sale = p.sale_id ? saleMap.get(p.sale_id) : null;
                const contact = sale ? contactMap.get(sale.contact_id) : null;
                return (
                  <div key={p.id} className={`grid grid-cols-[1fr_100px_56px_80px_68px_90px] gap-3 items-center px-3 py-2.5 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><User className="h-3 w-3 text-muted-foreground" /></div>
                      <span className="text-xs font-medium text-foreground truncate">{contact?.full_name || "Inconnu"}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(p.due_date)}</span>
                    <span className="text-[11px] font-medium text-foreground tabular-nums text-center">{p.payment_number}/{p.total_payments}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums text-center">{p.paid_at ? formatDate(p.paid_at) : "—"}</span>
                    <div className="flex justify-center"><Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${statusCfg.paid.className}`}>Payé</Badge></div>
                    <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(p.amount)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border px-3">
              <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{paidPayments.length}</span> échéance{paidPayments.length > 1 ? "s" : ""} payée{paidPayments.length > 1 ? "s" : ""} — Total <span className="font-bold text-foreground">{fmt(caCollecte)}</span></span>
              <ModalPagination page={safePage} totalPages={totalPages} setPage={setModalPage} />
            </div>
          </div>
        );
      }

      // ═══════════════════ TAUX D'IMPAYÉS ═══════════════════
      case "tauxImpayes": {
        if (lateOrLostPayments.length === 0) {
          return <p className="text-sm text-muted-foreground py-8 text-center">Aucune échéance impayée 🎉</p>;
        }
        const { items, safePage, totalPages } = paginate(lateOrLostPayments);
        const totalImpaye = lateOrLostPayments.reduce((s, p) => s + p.amount, 0);
        return (
          <div>
            <div className="grid grid-cols-[1fr_100px_56px_68px_90px] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Client</span><span>Date éch.</span><span className="text-center">N°</span><span className="text-center">Statut</span><span className="text-right">Montant</span>
            </div>
            <div className="divide-y divide-border/40">
              {items.map((p, idx) => {
                const sale = p.sale_id ? saleMap.get(p.sale_id) : null;
                const contact = sale ? contactMap.get(sale.contact_id) : null;
                const cfg = statusCfg[p.status] || statusCfg.pending;
                return (
                  <div key={p.id} className={`grid grid-cols-[1fr_100px_56px_68px_90px] gap-3 items-center px-3 py-2.5 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><User className="h-3 w-3 text-muted-foreground" /></div>
                      <span className="text-xs font-medium text-foreground truncate">{contact?.full_name || "Inconnu"}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(p.due_date)}</span>
                    <span className="text-[11px] font-medium text-foreground tabular-nums text-center">{p.payment_number}/{p.total_payments}</span>
                    <div className="flex justify-center"><Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>{cfg.label}</Badge></div>
                    <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(p.amount)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border px-3">
              <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{lateOrLostPayments.length}</span> échéance{lateOrLostPayments.length > 1 ? "s" : ""} — Total <span className="font-bold text-destructive">{fmt(totalImpaye)}</span></span>
              <ModalPagination page={safePage} totalPages={totalPages} setPage={setModalPage} />
            </div>
          </div>
        );
      }

      // ═══════════════════ COMMISSIONS ═══════════════════
      case "commissions": {
        const filteredTotal = filteredCommissions.reduce((s, c) => s + (c.amount || 0), 0);
        const { items, safePage, totalPages } = paginate(filteredCommissions);
        return (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-2 px-3 pb-3">
              <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <Select value={commFilterBenef} onValueChange={(v) => { setCommFilterBenef(v); setModalPage(0); }}>
                <SelectTrigger className="h-7 text-xs w-[180px]">
                  <SelectValue placeholder="Bénéficiaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les bénéficiaires</SelectItem>
                  {commBeneficiaries.map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={commFilterSale} onValueChange={(v) => { setCommFilterSale(v); setModalPage(0); }}>
                <SelectTrigger className="h-7 text-xs w-[180px]">
                  <SelectValue placeholder="Vente (client)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les ventes</SelectItem>
                  {commSales.map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_1fr_65px_46px_50px_76px_76px_62px_78px] gap-1.5 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Bénéficiaire</span><span>Client</span><span>Rôle</span><span className="text-center">%</span><span className="text-center">N°</span><span className="text-center">Payé le</span><span className="text-center">Versé le</span><span className="text-center">Statut</span><span className="text-right">Montant</span>
            </div>
            <div className="divide-y divide-border/40">
              {items.map((c, idx) => {
                const name = c.beneficiary_user_id ? profileMap.get(c.beneficiary_user_id)?.full_name : c.beneficiary_external;
                const sale = saleMap.get(c.sale_id);
                const clientName = sale ? contactMap.get(sale.contact_id)?.full_name : null;
                const payment = c.payment_id ? allPaymentMap.get(c.payment_id) : null;
                const cfg = statusCfg[c.status || "pending"] || statusCfg.pending;
                return (
                  <div key={c.id} className={`grid grid-cols-[1fr_1fr_65px_46px_50px_76px_76px_62px_78px] gap-1.5 items-center px-3 py-2.5 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <span className="text-xs font-medium text-foreground truncate">{name || "—"}</span>
                    <span className="text-xs text-muted-foreground truncate">{clientName || "—"}</span>
                    <span className="text-[10px] text-muted-foreground">{roleLabels[c.role] || c.role}</span>
                    <span className="text-[10px] font-medium text-foreground tabular-nums text-center">{c.percentage ?? "—"}%</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums text-center">
                      {payment ? `${payment.payment_number}/${payment.total_payments}` : "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums text-center">{payment?.paid_at ? formatDate(payment.paid_at) : "—"}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums text-center">{c.status === "paid" && c.paid_at ? formatDate(c.paid_at) : "—"}</span>
                    <div className="flex justify-center"><Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.className}`}>{cfg.label}</Badge></div>
                    <span className="text-xs font-bold text-foreground tabular-nums text-right">{fmt(c.amount || 0)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border px-3">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredCommissions.length}</span> commission{filteredCommissions.length > 1 ? "s" : ""} — Total <span className="font-bold text-foreground">{fmt(filteredTotal)}</span>
              </span>
              <ModalPagination page={safePage} totalPages={totalPages} setPage={setModalPage} />
            </div>
          </div>
        );
      }

      // ═══════════════════ CHARGES ═══════════════════
      case "charges": {
        return (
          <div className="space-y-4">
            {/* Commissions payées */}
            <div>
              <div className="flex items-center gap-2 px-3 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Commissions payées</span>
                <span className="ml-auto text-sm font-bold text-foreground tabular-nums">{fmt(commissionsPaid)}</span>
              </div>
            </div>

            {/* Salaires fixes */}
            <div>
              <div className="flex items-center gap-2 px-3 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Salaires fixes</span>
                <span className="ml-auto text-sm font-bold text-foreground tabular-nums">{fmt(totalSalariesCumul)}</span>
              </div>
              {activeSalaries.length > 0 && (
                <div className="border border-border rounded-lg mx-3 divide-y divide-border/40">
                  {activeSalaries.map((s, idx) => (
                    <div key={s.id} className={`flex items-center justify-between px-3 py-2 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><User className="h-3 w-3 text-muted-foreground" /></div>
                        <span className="text-xs font-medium text-foreground truncate">{s.full_name}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums">{fmt(s.amount)}/mois</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Charges fixes */}
            <div>
              <div className="flex items-center gap-2 px-3 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Charges fixes</span>
                <span className="ml-auto text-sm font-bold text-foreground tabular-nums">{fmt(totalFixedChargesCumul)}</span>
              </div>
              {activeCharges.length > 0 && (
                <div className="border border-border rounded-lg mx-3 divide-y divide-border/40">
                  {activeCharges.map((c, idx) => (
                    <div key={c.id} className={`flex items-center justify-between px-3 py-2 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-foreground truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">{freqLabels[c.frequency] || c.frequency}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums">{fmt(c.amount)}{c.frequency === "monthly" ? "/mois" : c.frequency === "yearly" ? "/an" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publicité */}
            <div>
              <div className="flex items-center gap-2 px-3 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Publicité</span>
                <span className="ml-auto text-sm font-bold text-foreground tabular-nums">{fmt(totalAdsCumul)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-border px-3">
              <span className="text-sm font-semibold text-foreground">Total charges</span>
              <span className="text-lg font-bold text-foreground tabular-nums">{fmt(totalChargesCumul)}</span>
            </div>
          </div>
        );
      }

      // ═══════════════════ BÉNÉFICE ═══════════════════
      case "benefice": {
        const lines = [
          { label: "CA Collecté", amount: caCollecte, color: "text-[hsl(var(--kpi-paid))]", sign: "+" },
          { label: "Commissions payées", amount: commissionsPaid, color: "text-foreground", sign: "−" },
          { label: "Salaires fixes", amount: totalSalariesCumul, color: "text-foreground", sign: "−" },
          { label: "Charges fixes", amount: totalFixedChargesCumul, color: "text-foreground", sign: "−" },
          { label: "Publicité", amount: totalAdsCumul, color: "text-foreground", sign: "−" },
        ];
        return (
          <div>
            <div className="divide-y divide-border/40">
              {lines.map((l, idx) => (
                <div key={l.label} className={`flex items-center justify-between px-3 py-3 ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground w-4 text-center">{l.sign}</span>
                    <span className="text-sm text-foreground">{l.label}</span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${l.color}`}>{fmt(l.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 mt-1 border-t-2 border-border px-3">
              <span className="text-sm font-semibold text-foreground">Bénéfice net</span>
              <span className={`text-xl font-bold tabular-nums ${benefice >= 0 ? "text-[hsl(var(--kpi-paid))]" : "text-destructive"}`}>{fmt(benefice)}</span>
            </div>
          </div>
        );
      }

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
    benefice: "Détail — Bénéfice net",
    roi: "ROI",
  };

  // Wider dialog for commissions (more columns)
  const wideModals: KpiKey[] = ["commissions"];
  const dialogSize = openModal && wideModals.includes(openModal) ? "max-w-5xl" : "max-w-3xl";

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((k) => (
          <button
            key={k.key}
            onClick={() => k.hasDetail && handleOpenModal(k.key)}
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
        <DialogContent className={dialogSize}>
          <DialogHeader>
            <DialogTitle className="text-base">{openModal ? modalTitles[openModal] : ""}</DialogTitle>
          </DialogHeader>
          {openModal && renderModalContent(openModal)}
        </DialogContent>
      </Dialog>
    </>
  );
}
