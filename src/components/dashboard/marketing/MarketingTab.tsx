import { useState, useMemo } from "react";
import PeriodFilter, { type DateRange } from "@/components/dashboard/PeriodFilter";
import {
  useMarketingDashboardData,
  type MarketingDashboardData,
  type MarketingLead,
  type MarketingCall,
  type MarketingSale,
  type MarketingTag,
} from "@/hooks/useMarketingDashboardData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Loader2,
  Euro,
  Users,
  Target,
  CalendarCheck,
  TrendingUp,
  Tag as TagIcon,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Calendar as CalendarIcon,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { parisSundayNoonWeekRange } from "@/lib/marketing/weekRange";
import {
  sourceLabel,
  tagCategoryLabel,
  tagKeyLabel,
  channelLabel,
  sourceColor,
} from "@/lib/marketing/labels";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Formatters ──────────────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const eur2 = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);

const num = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

const pct = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits).replace(/\.0+$/, "")}%`;

function formatParisDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Types drill-down ────────────────────────────────────────────────
type DrillMode = "leads" | "calls" | "sales";

interface DrillState {
  mode: DrillMode;
  title: string;
  leadIds?: Set<string>; // si défini, on filtre les listes sur ces leads
}

// ─── Main Tab ────────────────────────────────────────────────────────
export default function MarketingTab() {
  const [dateRange, setDateRange] = useState<DateRange | null>(() =>
    parisSundayNoonWeekRange(new Date()),
  );
  const { data, isLoading } = useMarketingDashboardData(dateRange);
  const [drill, setDrill] = useState<DrillState | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* ── Barre filtre ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <PeriodFilter
            value={dateRange}
            onChange={setDateRange}
            weekMode="sundayNoonParis"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-help">
                <Info className="h-3 w-3" />
                <span>Règle de cohorte</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[320px] text-xs leading-relaxed">
              <p>
                <strong>Tous les RDV et ventes sont attribués à la semaine d'inscription du lead.</strong>
                {" "}Un lead opt-in dimanche 14h sur le webi du 19 avril reste dans cette semaine,
                même si son call tombe mardi et sa vente 3 semaines plus tard.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <MarketingKPIs data={data} onDrill={setDrill} />
            {data.channelSpend.length > 0 && <ChannelSpendCard data={data} />}
            <SourcePerformanceTable data={data} onDrill={setDrill} />
            <TagDashboardCard data={data} onDrill={setDrill} />
          </>
        )}

        {data && drill && (
          <DrillDownDialog
            open={!!drill}
            onClose={() => setDrill(null)}
            drill={drill}
            data={data}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── KPI Cards ───────────────────────────────────────────────────────
function MarketingKPIs({
  data,
  onDrill,
}: {
  data: MarketingDashboardData;
  onDrill: (s: DrillState) => void;
}) {
  const kpis: Array<{
    key: string;
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    tooltip?: string;
    onClick?: () => void;
  }> = [
    {
      key: "budget",
      label: "Budget Ads",
      value: eur(data.budget),
      icon: Euro,
      color: "text-primary",
      tooltip: "Somme de toutes les dépenses ads (Meta, TikTok…) sur la période.",
    },
    {
      key: "leads",
      label: "Leads",
      value: num(data.leads),
      icon: Users,
      color: "text-blue-500",
      tooltip: "Nombre d'opt-ins créés sur la période (tous channels confondus).",
      onClick:
        data.leads > 0
          ? () => onDrill({ mode: "leads", title: `Leads de la période` })
          : undefined,
    },
    {
      key: "cpl",
      label: "CPL",
      value: data.leads > 0 ? eur2(data.cpl) : "—",
      icon: TrendingUp,
      color: "text-cyan-500",
      tooltip: "Coût par lead = Budget Ads ÷ Leads (toutes sources, y compris organiques et apporteurs).",
    },
    {
      key: "rdv",
      label: "RDV pris",
      value: num(data.calls),
      icon: CalendarCheck,
      color: "text-violet-500",
      tooltip:
        "Nombre de RDV pris par les leads de la période (hors RDV annulés), peu importe la date effective du call.",
      onClick:
        data.calls > 0
          ? () => onDrill({ mode: "calls", title: `RDV pris par les leads de la période` })
          : undefined,
    },
    {
      key: "cpr",
      label: "CPR",
      value: data.calls > 0 ? eur2(data.cpr) : "—",
      icon: Euro,
      color: "text-amber-500",
      tooltip: "Coût par RDV = Budget Ads ÷ Nombre de RDV pris.",
    },
    {
      key: "sales",
      label: "Ventes",
      value: num(data.sales),
      icon: Target,
      color: "text-[hsl(var(--kpi-paid))]",
      tooltip: "Nombre de ventes signées par les leads de la période (primaires uniquement, hors acomptes).",
      onClick:
        data.sales > 0
          ? () => onDrill({ mode: "sales", title: `Ventes signées par les leads de la période` })
          : undefined,
    },
    {
      key: "cac",
      label: "CAC",
      value: data.sales > 0 ? eur2(data.cac) : "—",
      icon: Euro,
      color: "text-orange-500",
      tooltip: "Coût d'acquisition client = Budget Ads ÷ Nombre de ventes.",
    },
    {
      key: "revenue",
      label: "CA généré",
      value: eur(data.revenue),
      icon: ShoppingBag,
      color: "text-[hsl(var(--kpi-paid))]",
      tooltip: "Chiffre d'affaires HT généré par les leads de la période, peu importe la date des ventes.",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((k) => {
          const card = (
            <button
              key={k.key}
              onClick={k.onClick}
              disabled={!k.onClick}
              className={`bg-card border border-border rounded-xl p-3 flex flex-col gap-1 text-left transition-all ${
                k.onClick
                  ? "hover:border-primary/40 hover:shadow-sm cursor-pointer"
                  : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                <span className="text-[11px] text-muted-foreground font-medium truncate">
                  {k.label}
                </span>
                {k.tooltip && <Info className="h-3 w-3 text-muted-foreground/50 ml-auto" />}
              </div>
              <span className="text-base lg:text-lg font-bold text-foreground tabular-nums">
                {k.value}
              </span>
            </button>
          );
          return k.tooltip ? (
            <Tooltip key={k.key}>
              <TooltipTrigger asChild>{card}</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
                <p>{k.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            card
          );
        })}
      </div>

      {/* Deux cards "taux" en complément */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <ConversionCard
          label="Taux de conversion Leads → RDV"
          numerator={data.calls}
          denominator={data.leads}
          hint="Parmi les leads de la période, combien ont pris un RDV"
          colorClass="text-violet-500"
        />
        <ConversionCard
          label="Taux de conversion Leads → Vente"
          numerator={data.sales}
          denominator={data.leads}
          hint="Parmi les leads de la période, combien ont signé une vente"
          colorClass="text-[hsl(var(--kpi-paid))]"
        />
      </div>
    </>
  );
}

function ConversionCard({
  label,
  numerator,
  denominator,
  hint,
  colorClass,
}: {
  label: string;
  numerator: number;
  denominator: number;
  hint: string;
  colorClass: string;
}) {
  const rate = denominator > 0 ? numerator / denominator : 0;
  const pctWidth = Math.min(100, rate * 100);
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-xl font-bold tabular-nums ${colorClass}`}>
          {denominator > 0 ? pct(rate) : "—"}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {hint} — <span className="font-medium text-foreground">{num(numerator)}</span> sur{" "}
        <span className="font-medium text-foreground">{num(denominator)}</span>
      </p>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass.replace("text-", "bg-")}`}
          style={{ width: `${pctWidth}%` }}
        />
      </div>
    </div>
  );
}

// ─── Budget par channel ──────────────────────────────────────────────
function ChannelSpendCard({ data }: { data: MarketingDashboardData }) {
  const chart = data.channelSpend.map((c) => ({
    channel: channelLabel(c.channel),
    rawChannel: c.channel,
    spent: c.spent,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Budget Ads par channel</h3>
          <p className="text-[11px] text-muted-foreground">Dépense par plateforme sur la période</p>
        </div>
        <span className="text-sm font-bold tabular-nums text-primary">{eur(data.budget)}</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="channel" fontSize={11} stroke="currentColor" className="text-muted-foreground" />
          <YAxis
            fontSize={11}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <ChartTooltip
            formatter={(v: number) => eur(v)}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
          />
          <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
            {chart.map((c, i) => (
              <Cell key={i} fill={sourceColor(c.rawChannel)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Tableau Performance par source ──────────────────────────────────
type SortKey = "leads" | "calls" | "sales" | "revenue" | "leadToCall" | "leadToSale";

function SourcePerformanceTable({
  data,
  onDrill,
}: {
  data: MarketingDashboardData;
  onDrill: (s: DrillState) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("leads");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...data.sourceBreakdown];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return arr;
  }, [data.sourceBreakdown, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    ) : sortDir === "desc" ? (
      <ArrowDown className="h-3 w-3" />
    ) : (
      <ArrowUp className="h-3 w-3" />
    );

  const Th = ({ k, label, align }: { k: SortKey; label: string; align: "left" | "right" }) => (
    <th
      className={`py-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        <SortIcon k={k} />
      </button>
    </th>
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 pb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Performance par source de lead</h3>
          <p className="text-[11px] text-muted-foreground">
            Quelle source convertit le mieux (Webinaire, VSL, Organique, Apporteurs…)
          </p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          Aucun lead sur la période.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-y border-border">
              <tr>
                <th className="py-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left">
                  Source
                </th>
                <Th k="leads" label="Leads" align="right" />
                <Th k="calls" label="RDV" align="right" />
                <Th k="leadToCall" label="Conv. RDV" align="right" />
                <Th k="sales" label="Ventes" align="right" />
                <Th k="leadToSale" label="Conv. Vente" align="right" />
                <Th k="revenue" label="CA HT" align="right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const leadIdsForSource = new Set(
                  data.rawLeads.filter((l) => l.source === row.source).map((l) => l.id),
                );
                return (
                  <tr
                    key={row.source}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                      idx % 2 === 1 ? "bg-muted/10" : ""
                    }`}
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: sourceColor(row.source) }}
                        />
                        <span className="text-xs font-medium text-foreground">
                          {sourceLabel(row.source)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() =>
                          onDrill({
                            mode: "leads",
                            title: `Leads — ${sourceLabel(row.source)}`,
                            leadIds: leadIdsForSource,
                          })
                        }
                        className="text-xs font-semibold text-foreground tabular-nums hover:text-primary hover:underline"
                      >
                        {num(row.leads)}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        disabled={row.calls === 0}
                        onClick={() =>
                          onDrill({
                            mode: "calls",
                            title: `RDV — ${sourceLabel(row.source)}`,
                            leadIds: leadIdsForSource,
                          })
                        }
                        className="text-xs text-foreground tabular-nums hover:text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
                      >
                        {num(row.calls)}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-muted-foreground tabular-nums">
                      {row.leads > 0 ? pct(row.leadToCall, 0) : "—"}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        disabled={row.sales === 0}
                        onClick={() =>
                          onDrill({
                            mode: "sales",
                            title: `Ventes — ${sourceLabel(row.source)}`,
                            leadIds: leadIdsForSource,
                          })
                        }
                        className="text-xs text-foreground tabular-nums hover:text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
                      >
                        {num(row.sales)}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-muted-foreground tabular-nums">
                      {row.leads > 0 ? pct(row.leadToSale, 0) : "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-xs font-bold text-foreground tabular-nums">
                      {eur(row.revenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/20 border-t border-border">
              <tr>
                <td className="py-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </td>
                <td className="py-2 px-2 text-right text-xs font-bold tabular-nums">
                  {num(data.leads)}
                </td>
                <td className="py-2 px-2 text-right text-xs font-bold tabular-nums">
                  {num(data.calls)}
                </td>
                <td className="py-2 px-2 text-right text-xs tabular-nums text-muted-foreground">
                  {data.leads > 0 ? pct(data.leadToCallRate, 0) : "—"}
                </td>
                <td className="py-2 px-2 text-right text-xs font-bold tabular-nums">
                  {num(data.sales)}
                </td>
                <td className="py-2 px-2 text-right text-xs tabular-nums text-muted-foreground">
                  {data.leads > 0 ? pct(data.leadToSaleRate, 0) : "—"}
                </td>
                <td className="py-2 px-2 text-right text-xs font-bold tabular-nums">
                  {eur(data.revenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard tags ──────────────────────────────────────────────────
function TagDashboardCard({
  data,
  onDrill,
}: {
  data: MarketingDashboardData;
  onDrill: (s: DrillState) => void;
}) {
  const categories = Array.from(new Set(data.tagBreakdown.map((r) => r.category)));
  const byCategory = new Map(
    categories.map((c) => [c, data.tagBreakdown.filter((r) => r.category === c)]),
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Profil type des leads de la période
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Répartition par tag et taux de conversion associé
            </p>
          </div>
        </div>
      </div>

      {data.tagBreakdown.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aucun tag posé sur les leads de cette période.
        </p>
      ) : (
        categories.map((cat) => {
          const rows = byCategory.get(cat) ?? [];
          const catTotal = rows.reduce((s, r) => s + r.leads, 0);
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tagCategoryLabel(cat)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {catTotal} lead{catTotal > 1 ? "s" : ""} taggué{catTotal > 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-1.5">
                {rows.map((r) => {
                  const w = catTotal > 0 ? (r.leads / catTotal) * 100 : 0;
                  return (
                    <button
                      key={`${r.category}::${r.key}`}
                      onClick={() =>
                        onDrill({
                          mode: "leads",
                          title: `Leads — ${tagCategoryLabel(cat)} : ${tagKeyLabel(r.key)}`,
                          leadIds: new Set(r.leadIds),
                        })
                      }
                      className="w-full group flex items-center gap-3 hover:bg-muted/40 rounded-md px-2 py-1.5 -mx-2 transition-colors text-left"
                    >
                      <span className="w-44 md:w-52 text-xs font-medium text-foreground truncate">
                        {tagKeyLabel(r.key)}
                      </span>
                      <div className="flex-1 relative h-6 rounded-md bg-muted overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/80 rounded-md transition-all"
                          style={{ width: `${w}%` }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-foreground">
                          {num(r.leads)} lead{r.leads > 1 ? "s" : ""} · {w.toFixed(0)}%
                        </span>
                      </div>
                      <div className="hidden md:flex items-center gap-3 text-[11px] tabular-nums">
                        <span className="text-muted-foreground">
                          Conv. RDV{" "}
                          <span className="font-semibold text-foreground">
                            {pct(r.leadToCall, 0)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Conv. Vente{" "}
                          <span className="font-semibold text-foreground">
                            {pct(r.leadToSale, 0)}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Drill-down Dialog ───────────────────────────────────────────────
function DrillDownDialog({
  open,
  onClose,
  drill,
  data,
}: {
  open: boolean;
  onClose: () => void;
  drill: DrillState;
  data: MarketingDashboardData;
}) {
  const filtered = useMemo(() => {
    const leadIds = drill.leadIds;
    const leads = leadIds
      ? data.rawLeads.filter((l) => leadIds.has(l.id))
      : data.rawLeads;
    const keepLead = (id: string) => (leadIds ? leadIds.has(id) : true);
    const calls = data.rawCalls
      .filter((c) => c.status !== "cancelled")
      .filter((c) => keepLead(c.lead_id));
    const sales = data.rawSales.filter((s) => s.lead_id && keepLead(s.lead_id));
    const leadById = new Map(data.rawLeads.map((l) => [l.id, l]));
    const tagsByLead = new Map<string, MarketingTag[]>();
    for (const t of data.rawTags) {
      const arr = tagsByLead.get(t.lead_id) ?? [];
      arr.push(t);
      tagsByLead.set(t.lead_id, arr);
    }
    return { leads, calls, sales, leadById, tagsByLead };
  }, [drill, data]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">{drill.title}</DialogTitle>
        </DialogHeader>

        {drill.mode === "leads" && (
          <LeadsList
            leads={filtered.leads}
            tagsByLead={filtered.tagsByLead}
          />
        )}
        {drill.mode === "calls" && (
          <CallsList calls={filtered.calls} leadById={filtered.leadById} />
        )}
        {drill.mode === "sales" && (
          <SalesList sales={filtered.sales} leadById={filtered.leadById} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LeadsList({
  leads,
  tagsByLead,
}: {
  leads: MarketingLead[];
  tagsByLead: Map<string, MarketingTag[]>;
}) {
  if (leads.length === 0) return <EmptyRow label="Aucun lead" />;
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-[1fr_130px_130px_1fr] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background">
        <span>Lead</span>
        <span>Source</span>
        <span>Opt-in</span>
        <span>Tags</span>
      </div>
      <div className="divide-y divide-border/40">
        {leads.map((l, idx) => {
          const tags = tagsByLead.get(l.id) ?? [];
          return (
            <div
              key={l.id}
              className={`grid grid-cols-[1fr_130px_130px_1fr] gap-3 items-center px-3 py-2.5 ${
                idx % 2 === 1 ? "bg-muted/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {l.raw_full_name || "—"}
                  </p>
                  {l.raw_email && (
                    <p className="text-[10px] text-muted-foreground truncate">{l.raw_email}</p>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-foreground">
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: sourceColor(l.source) }}
                >
                  {sourceLabel(l.source)}
                </Badge>
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatParisDateTime(l.created_at)}
              </span>
              <div className="flex flex-wrap gap-1">
                {tags.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground/60">—</span>
                ) : (
                  tags.map((t, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[9px] font-normal px-1.5"
                    >
                      {tagKeyLabel(t.key)}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground px-3 py-2 border-t border-border">
        {leads.length} lead{leads.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}

function CallsList({
  calls,
  leadById,
}: {
  calls: MarketingCall[];
  leadById: Map<string, MarketingLead>;
}) {
  const sorted = useMemo(
    () =>
      [...calls].sort((a, b) => {
        const ax = a.scheduled_at || a.created_at;
        const bx = b.scheduled_at || b.created_at;
        return bx.localeCompare(ax);
      }),
    [calls],
  );
  if (sorted.length === 0) return <EmptyRow label="Aucun RDV" />;
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-[1fr_110px_130px_110px] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background">
        <span>Lead</span>
        <span>Source</span>
        <span>Date RDV</span>
        <span>Statut</span>
      </div>
      <div className="divide-y divide-border/40">
        {sorted.map((c, idx) => {
          const lead = leadById.get(c.lead_id);
          return (
            <div
              key={c.id}
              className={`grid grid-cols-[1fr_110px_130px_110px] gap-3 items-center px-3 py-2.5 ${
                idx % 2 === 1 ? "bg-muted/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-foreground truncate">
                  {lead?.raw_full_name || "—"}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] w-fit">
                {lead ? sourceLabel(lead.source) : "—"}
              </Badge>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {c.scheduled_at ? formatParisDateTime(c.scheduled_at) : "—"}
              </span>
              <Badge
                variant={c.status === "completed" ? "default" : "secondary"}
                className="text-[10px] w-fit"
              >
                {callStatusLabel(c.status)}
              </Badge>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground px-3 py-2 border-t border-border">
        {sorted.length} RDV
      </p>
    </div>
  );
}

function SalesList({
  sales,
  leadById,
}: {
  sales: MarketingSale[];
  leadById: Map<string, MarketingLead>;
}) {
  const sorted = useMemo(
    () =>
      [...sales].sort((a, b) => (b.sold_at || "").localeCompare(a.sold_at || "")),
    [sales],
  );
  if (sorted.length === 0) return <EmptyRow label="Aucune vente" />;
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-[1fr_110px_130px_1fr_100px] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background">
        <span>Client</span>
        <span>Source</span>
        <span>Date</span>
        <span>Produit</span>
        <span className="text-right">Montant HT</span>
      </div>
      <div className="divide-y divide-border/40">
        {sorted.map((s, idx) => {
          const lead = s.lead_id ? leadById.get(s.lead_id) : null;
          return (
            <div
              key={s.id}
              className={`grid grid-cols-[1fr_110px_130px_1fr_100px] gap-3 items-center px-3 py-2.5 ${
                idx % 2 === 1 ? "bg-muted/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-foreground truncate">
                  {lead?.raw_full_name || "—"}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] w-fit">
                {lead ? sourceLabel(lead.source) : "—"}
              </Badge>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {s.sold_at ? formatParisDateTime(s.sold_at) : "—"}
              </span>
              <span className="text-[11px] text-foreground truncate">{s.product || "—"}</span>
              <span className="text-xs font-bold text-foreground tabular-nums text-right">
                {eur(s.amount_ht)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground px-3 py-2 border-t border-border">
        {sorted.length} vente{sorted.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function callStatusLabel(s: string | null): string {
  switch (s) {
    case "completed":
      return "Effectué";
    case "scheduled":
      return "Prévu";
    case "no_show":
      return "No-show";
    case "rescheduled":
      return "Reporté";
    case "cancelled":
      return "Annulé";
    default:
      return s ?? "—";
  }
}
