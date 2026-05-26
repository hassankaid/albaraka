import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Percent, AlertTriangle, PiggyBank, BarChart3, User, ChevronLeft, ChevronRight, CheckCheck, Filter, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

interface SalaryPeriod {
  id: string;
  profile_id: string;
  amount: number;
  start_date: string;
  end_date: string | null;
}

interface FixedChargeDetail {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
}

interface Ad {
  id: string;
  date: string;
  campaign_name: string;
  amount_spent: number;
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
  roi?: number | null;
  // For charges detail modal
  salaryPeriods?: SalaryPeriod[];
  fixedChargesDetail?: FixedChargeDetail[];
  adsDetail?: Ad[];
  dateRange?: { from: Date; to: Date } | null;
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

type KpiKey = "caGenere" | "caCollecte" | "tauxCollecte" | "tauxImpayes" | "commissions" | "charges" | "benefice";

const MODAL_PAGE_SIZE = 15;

type ChargeLine = { month: string; category: string; name: string; amount: number };

function ChargesModalContent({
  cats,
  categoryTotals,
  catColors,
  grandTotal,
  finalLines,
  ChargesTable,
  setModalPage,
}: {
  cats: readonly string[];
  categoryTotals: Record<string, number>;
  catColors: Record<string, { dot: string; active: string }>;
  grandTotal: number;
  finalLines: ChargeLine[];
  ChargesTable: React.ComponentType<{ lines: ChargeLine[]; showCat: boolean }>;
  setModalPage: (fn: (p: number) => number) => void;
}) {
  const [activeCat, setActiveCat] = useState("Tout");

  const handleCat = (cat: string) => {
    setActiveCat(cat);
    setModalPage(() => 0);
  };

  const displayedLines = activeCat === "Tout" ? finalLines : finalLines.filter(l => l.category === activeCat);

  return (
    <div className="space-y-3">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {cats.map(cat => {
          const isActive = activeCat === cat;
          const total = cat === "Tout" ? grandTotal : (categoryTotals[cat] || 0);
          const colors = catColors[cat];
          return (
            <button
              key={cat}
              onClick={() => handleCat(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                isActive
                  ? cat === "Tout"
                    ? "bg-foreground text-background border-foreground"
                    : `${colors?.active || "bg-foreground text-background"} border-transparent`
                  : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {cat !== "Tout" && !isActive && (
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${colors?.dot || "bg-muted"}`} />
              )}
              <span>{cat}</span>
              <span className={`tabular-nums ${isActive ? "opacity-80" : "opacity-60"}`}>{fmt(total)}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <ChargesTable lines={displayedLines} showCat={activeCat === "Tout"} />

      {/* Grand total */}
      <div className="flex items-center justify-between px-3 pt-2 border-t-2 border-border">
        <span className="text-sm font-semibold text-foreground">Total charges (cumul période)</span>
        <span className="text-lg font-bold text-foreground tabular-nums">{fmt(grandTotal)}</span>
      </div>
    </div>
  );
}

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
    salaryPeriods = [], fixedChargesDetail = [], adsDetail = [], dateRange,
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

  const roiGenere = totalAdsCumul > 0 ? caGenere / totalAdsCumul : null;
  const roiCollecte = totalAdsCumul > 0 ? caCollecte / totalAdsCumul : null;

  const roiGenereDisplay = roiGenere !== null ? `x${roiGenere.toFixed(2)}` : "—";
  const roiCollecteDisplay = roiCollecte !== null ? `x${roiCollecte.toFixed(2)}` : "—";

  const roiGenereColor = roiGenere !== null
    ? roiGenere >= 1 ? "text-emerald-500" : "text-destructive"
    : "text-muted-foreground";
  const roiCollecteColor = roiCollecte !== null
    ? roiCollecte >= 1 ? "text-emerald-500" : "text-destructive"
    : "text-muted-foreground";

  const tauxCollecteTooltip = isFiltered
    ? "📊 Mode période : sur toutes les échéances prévues dans cette période, quel pourcentage a bien été encaissé ? Les échéances en retard ou perdues font baisser ce taux. Cela mesure votre efficacité de recouvrement sur la période choisie."
    : "📊 Mode global (Tout) : on compare le total réellement encaissé (CA Collecté) au total des ventes signées (CA Généré) depuis le début. Cela montre où en est la maturité de vos encaissements sur l'ensemble de l'activité.";

  const kpis: { key: KpiKey; label: string; value: string; icon: any; color: string; hasDetail: boolean; tooltip?: string }[] = [
    { key: "caGenere", label: "CA Généré", value: fmt(caGenere), icon: TrendingUp, color: "text-primary", hasDetail: true },
    { key: "caCollecte", label: "CA Collecté", value: fmt(caCollecte), icon: Wallet, color: "text-emerald-500", hasDetail: true },
    { key: "tauxCollecte", label: isFiltered ? "Taux collecte" : "Taux encaissé", value: `${tauxCashCollecte.toFixed(1)}%`, icon: Percent, color: "text-blue-500", hasDetail: true, tooltip: tauxCollecteTooltip },
    { key: "tauxImpayes", label: isFiltered ? "Éch. impayées" : "Taux d'impayés", value: `${tauxImpayes.toFixed(1)}%`, icon: AlertTriangle, color: tauxImpayes > 10 ? "text-destructive" : "text-amber-500", hasDetail: true },
    { key: "commissions", label: "Commissions", value: fmt(totalCommissions), icon: CreditCard, color: "text-orange-500", hasDetail: true },
    { key: "charges", label: "Charges", value: fmt(totalChargesCumul), icon: BarChart3, color: "text-muted-foreground", hasDetail: true },
    { key: "benefice", label: "Bénéfice", value: fmt(benefice), icon: PiggyBank, color: benefice >= 0 ? "text-emerald-500" : "text-destructive", hasDetail: true },
  ];

  const sortedSalesForCA = useMemo(() => [...sales].sort((a, b) => (b.sold_at || "").localeCompare(a.sold_at || "")), [sales]);
  const paidPayments = useMemo(() => [...paidInPeriod].sort((a, b) => (b.paid_at || b.due_date).localeCompare(a.paid_at || a.due_date)), [paidInPeriod]);
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
        const q = searchQuery.toLowerCase();
        const filtered = q
          ? paidPayments.filter(p => {
              const sale = p.sale_id ? saleMap.get(p.sale_id) : null;
              const contact = sale ? contactMap.get(sale.contact_id) : null;
              return (contact?.full_name || "").toLowerCase().includes(q);
            })
          : paidPayments;
        const { items, safePage, totalPages } = paginate(filtered);
        return (
          <div>
            <div className="px-3 pb-3">
              <Input
                placeholder="Rechercher un client…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setModalPage(0); }}
                className="h-8 text-xs"
              />
            </div>
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
              <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{filtered.length}</span> échéance{filtered.length > 1 ? "s" : ""} payée{filtered.length > 1 ? "s" : ""} — Total <span className="font-bold text-foreground">{fmt(filtered.reduce((s, p) => s + p.amount, 0))}</span></span>
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
        const todayDate = new Date();
        const rangeStart = dateRange?.from ?? new Date(2020, 0, 1);
        const rangeEnd = dateRange?.to && dateRange.to > todayDate ? todayDate : (dateRange?.to ?? todayDate);

        // Generate months in range
        const months: string[] = [];
        const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
        const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
        while (cursor <= endMonth) {
          months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
          cursor.setMonth(cursor.getMonth() + 1);
        }

        const monthLabel = (m: string) => {
          const [y, mo] = m.split("-");
          return new Date(+y, +mo - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
        };

        type ChargeLine = { month: string; category: string; name: string; amount: number };
        const rawLines: ChargeLine[] = [];

        // Salaires per month
        salaryPeriods.forEach(sp => {
          const name = profileMap.get(sp.profile_id)?.full_name || "Inconnu";
          months.forEach(m => {
            const [y, mo] = m.split("-").map(Number);
            const mStart = new Date(y, mo - 1, 1);
            const mEnd = new Date(y, mo, 0);
            const spStart = new Date(sp.start_date);
            const spEnd = sp.end_date ? new Date(sp.end_date) : rangeEnd;
            if (spStart <= mEnd && spEnd >= mStart) {
              rawLines.push({ month: m, category: "Salaires", name, amount: sp.amount });
            }
          });
        });

        // Charges fixes per month
        fixedChargesDetail.filter(c => c.is_active).forEach(c => {
          if (c.frequency === "one_time") {
            const m = c.start_date.substring(0, 7);
            if (months.includes(m)) rawLines.push({ month: m, category: "Charges fixes", name: c.name, amount: c.amount });
          } else if (c.frequency === "yearly") {
            // Full amount only on the anniversary month (same month as start_date)
            const cStart = new Date(c.start_date);
            const cEnd = c.end_date ? new Date(c.end_date) : rangeEnd;
            const billingMonth = cStart.getMonth(); // 0-indexed
            let year = cStart.getFullYear();
            while (true) {
              const hitDate = new Date(year, billingMonth, 1);
              if (hitDate > cEnd || hitDate > rangeEnd) break;
              if (hitDate >= rangeStart && hitDate >= cStart) {
                const m = `${year}-${String(billingMonth + 1).padStart(2, "0")}`;
                if (months.includes(m)) {
                  rawLines.push({ month: m, category: "Charges fixes", name: c.name, amount: c.amount });
                }
              }
              year++;
            }
          } else {
            // Monthly
            months.forEach(m => {
              const [y, mo] = m.split("-").map(Number);
              const mStart = new Date(y, mo - 1, 1);
              const mEnd = new Date(y, mo, 0);
              const cStart = new Date(c.start_date);
              const cEnd = c.end_date ? new Date(c.end_date) : rangeEnd;
              if (cStart <= mEnd && cEnd >= mStart) {
                rawLines.push({ month: m, category: "Charges fixes", name: c.name, amount: c.amount });
              }
            });
          }
        });

        // Publicité — aggregate by month+campaign
        const adsAgg = new Map<string, ChargeLine>();
        adsDetail.forEach(a => {
          const m = a.date.substring(0, 7);
          if (!months.includes(m)) return;
          const key = `${m}|${a.campaign_name}`;
          const existing = adsAgg.get(key);
          if (existing) existing.amount += a.amount_spent;
          else adsAgg.set(key, { month: m, category: "Publicité", name: a.campaign_name, amount: a.amount_spent });
        });

        const finalLines = [...rawLines, ...Array.from(adsAgg.values())]
          .sort((a, b) => b.month.localeCompare(a.month) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

        const categoryTotals: Record<string, number> = {};
        finalLines.forEach(l => { categoryTotals[l.category] = (categoryTotals[l.category] || 0) + l.amount; });
        const grandTotal = finalLines.reduce((s, l) => s + l.amount, 0);

        const catColors: Record<string, { dot: string; active: string }> = {
          "Salaires": { dot: "bg-blue-400", active: "bg-blue-500 text-white" },
          "Charges fixes": { dot: "bg-gold-400", active: "bg-gold-500 text-white" },
          "Publicité": { dot: "bg-rose-400", active: "bg-rose-500 text-white" },
        };

        const cats = ["Tout", "Salaires", "Charges fixes", "Publicité"] as const;

        const ChargesTable = ({ lines, showCat }: { lines: ChargeLine[]; showCat: boolean }) => {
          const { items, safePage, totalPages } = paginate(lines);
          return (
            <>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left font-medium px-3 py-2">Mois</th>
                      {showCat && <th className="text-left font-medium px-3 py-2">Catégorie</th>}
                      <th className="text-left font-medium px-3 py-2">Libellé</th>
                      <th className="text-right font-medium px-3 py-2">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {items.map((l, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-muted/10" : ""}>
                        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{monthLabel(l.month)}</td>
                        {showCat && (
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${catColors[l.category]?.dot || "bg-muted"}`} />
                              <span className="text-muted-foreground">{l.category}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-1.5 font-medium text-foreground truncate max-w-[200px]">{l.name}</td>
                        <td className="px-3 py-1.5 text-right font-bold text-foreground tabular-nums whitespace-nowrap">{fmt(l.amount)}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={showCat ? 4 : 3} className="px-3 py-6 text-center text-muted-foreground">Aucune charge</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">{lines.length}</span> ligne{lines.length > 1 ? "s" : ""}</span>
                <ModalPagination page={safePage} totalPages={totalPages} setPage={setModalPage} />
              </div>
            </>
          );
        };

        // Use authoritative totals from the hook to match KPI exactly
        const authoritativeTotals: Record<string, number> = {
          "Salaires": totalSalariesCumul,
          "Charges fixes": totalFixedChargesCumul,
          "Publicité": totalAdsCumul,
        };

        return (
          <ChargesModalContent
            cats={cats}
            categoryTotals={authoritativeTotals}
            catColors={catColors}
            grandTotal={totalChargesCumul}
            finalLines={finalLines}
            ChargesTable={ChargesTable}
            setModalPage={setModalPage}
          />
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
    
  };

  // Wider dialog for commissions (more columns)
  const wideModals: KpiKey[] = ["commissions", "charges"];
  const dialogSize = openModal && wideModals.includes(openModal) ? "max-w-5xl" : "max-w-3xl";

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {kpis.map((k) => {
            const card = (
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
                  {k.tooltip && <Info className="h-3 w-3 text-muted-foreground/50" />}
                </div>
                <span className="text-sm font-bold text-foreground">{k.value}</span>
              </button>
            );

            if (k.tooltip) {
              return (
                <Tooltip key={k.key}>
                  <TooltipTrigger asChild>{card}</TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
                    <p>{k.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            return card;
          })}
        {/* ROI dual card */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-1.5 cursor-default">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] text-muted-foreground font-medium">ROI Ads</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">Généré</span>
              <span className={`text-sm font-bold ${roiGenereColor}`}>{roiGenereDisplay}</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">Collecté</span>
              <span className={`text-sm font-bold ${roiCollecteColor}`}>{roiCollecteDisplay}</span>
            </div>
          </div>
        </div>
        </div>
      </TooltipProvider>

      <Dialog open={!!openModal} onOpenChange={() => setOpenModal(null)}>
        <DialogContent
          className={`${dialogSize} max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden`}
        >
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-base">
              {openModal ? modalTitles[openModal] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2 py-3 min-h-0">
            {openModal && renderModalContent(openModal)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
