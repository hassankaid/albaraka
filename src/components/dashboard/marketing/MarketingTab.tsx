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
import { Input } from "@/components/ui/input";
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
  Mail,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCheck,
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
  orphanOnly?: boolean; // si true, ne montre que les calls/sales sans lead_id
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
                const isOrphan = row.source === "inconnu";
                const leadIdsForSource = isOrphan
                  ? undefined // orphelins : pas de leadIds, on filtre différemment dans le drill-down
                  : new Set(
                      data.rawLeads.filter((l) => l.source === row.source).map((l) => l.id),
                    );
                return (
                  <tr
                    key={row.source}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                      idx % 2 === 1 ? "bg-muted/10" : ""
                    } ${isOrphan ? "italic" : ""}`}
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
                        {isOrphan && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground/50" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[260px] text-xs">
                              RDV ou ventes créés sans fiche lead rattachée (ex : closing direct via
                              recommandation, appel entrant…). Comptés dans les totaux pour ne rien
                              rater, mais sans source d'acquisition identifiée.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">
                      {isOrphan ? (
                        <span className="text-xs text-muted-foreground tabular-nums">—</span>
                      ) : (
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
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        disabled={row.calls === 0}
                        onClick={() =>
                          onDrill({
                            mode: "calls",
                            title: `RDV — ${sourceLabel(row.source)}`,
                            leadIds: leadIdsForSource,
                            orphanOnly: isOrphan,
                          })
                        }
                        className="text-xs text-foreground tabular-nums hover:text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
                      >
                        {num(row.calls)}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-muted-foreground tabular-nums">
                      {isOrphan || row.leads === 0 ? "—" : pct(row.leadToCall, 0)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        disabled={row.sales === 0}
                        onClick={() =>
                          onDrill({
                            mode: "sales",
                            title: `Ventes — ${sourceLabel(row.source)}`,
                            leadIds: leadIdsForSource,
                            orphanOnly: isOrphan,
                          })
                        }
                        className="text-xs text-foreground tabular-nums hover:text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
                      >
                        {num(row.sales)}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-muted-foreground tabular-nums">
                      {isOrphan || row.leads === 0 ? "—" : pct(row.leadToSale, 0)}
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
const PAGE_SIZE = 25;

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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Reset search + page quand le drill change
  const drillKey = `${drill.mode}__${drill.title}`;
  useMemo(() => {
    setSearch("");
    setPage(0);
  }, [drillKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const context = useMemo(() => {
    const leadIds = drill.leadIds;
    const orphanOnly = !!drill.orphanOnly;
    const keepCallOrSale = (entityLeadId: string | null, isOrphan: boolean) => {
      if (orphanOnly) return isOrphan;
      if (!leadIds) return true;
      return !!entityLeadId && leadIds.has(entityLeadId);
    };

    const leadsInScope = leadIds
      ? data.rawLeads.filter((l) => leadIds.has(l.id))
      : data.rawLeads;
    const leadById = new Map(data.rawLeads.map((l) => [l.id, l]));

    const callsInScope = data.rawCalls
      .filter((c) => c.status !== "cancelled")
      .filter((c) => keepCallOrSale(c.lead_id, c.is_orphan));
    const salesInScope = data.rawSales.filter((s) =>
      keepCallOrSale(s.lead_id, s.is_orphan),
    );

    const tagsByLead = new Map<string, MarketingTag[]>();
    for (const t of data.rawTags) {
      const arr = tagsByLead.get(t.lead_id) ?? [];
      arr.push(t);
      tagsByLead.set(t.lead_id, arr);
    }

    const callsByLead = new Map<string, MarketingCall[]>();
    for (const c of data.rawCalls) {
      if (c.status === "cancelled") continue;
      if (!c.lead_id) continue;
      const arr = callsByLead.get(c.lead_id) ?? [];
      arr.push(c);
      callsByLead.set(c.lead_id, arr);
    }
    const salesByLead = new Map<string, MarketingSale[]>();
    for (const s of data.rawSales) {
      if (!s.lead_id) continue;
      const arr = salesByLead.get(s.lead_id) ?? [];
      arr.push(s);
      salesByLead.set(s.lead_id, arr);
    }

    return {
      leadsInScope,
      callsInScope,
      salesInScope,
      leadById,
      tagsByLead,
      callsByLead,
      salesByLead,
    };
  }, [drill, data]);

  // Apply search
  const q = search.trim().toLowerCase();
  const match = (...fields: (string | null | undefined)[]) =>
    !q || fields.some((f) => f && f.toLowerCase().includes(q));

  const filteredLeads = context.leadsInScope.filter((l) =>
    match(l.raw_full_name, l.raw_email, l.raw_phone, sourceLabel(l.source)),
  );
  const filteredCalls = context.callsInScope.filter((c) => {
    const l = c.lead_id ? context.leadById.get(c.lead_id) : null;
    return match(
      l?.raw_full_name,
      c.raw_full_name,
      l?.raw_email,
      c.raw_email,
      l?.raw_phone,
      c.raw_phone,
      l ? sourceLabel(l.source) : "Inconnu",
    );
  });
  const filteredSales = context.salesInScope.filter((s) => {
    const l = s.lead_id ? context.leadById.get(s.lead_id) : null;
    return match(
      l?.raw_full_name,
      s.contact_name,
      l?.raw_email,
      s.contact_email,
      l?.raw_phone,
      s.contact_phone,
      s.product,
    );
  });

  // Sort filtered lists
  const sortedLeads = useMemo(
    () =>
      [...filteredLeads].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [filteredLeads],
  );
  const sortedCalls = useMemo(
    () =>
      [...filteredCalls].sort((a, b) =>
        (b.scheduled_at || b.created_at).localeCompare(a.scheduled_at || a.created_at),
      ),
    [filteredCalls],
  );
  const sortedSales = useMemo(
    () => [...filteredSales].sort((a, b) => (b.sold_at || "").localeCompare(a.sold_at || "")),
    [filteredSales],
  );

  function paginate<T>(items: T[]) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    return {
      items: items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
      totalPages,
      safePage,
    };
  }

  let total = 0;
  let totalSecondary = "";
  if (drill.mode === "leads") total = sortedLeads.length;
  else if (drill.mode === "calls") total = sortedCalls.length;
  else if (drill.mode === "sales") {
    total = sortedSales.length;
    totalSecondary = eur(sortedSales.reduce((s, x) => s + x.amount_ht, 0));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            {drill.title}
            <Badge variant="secondary" className="font-mono">
              {total}
            </Badge>
            {totalSecondary && (
              <Badge variant="outline" className="font-mono">
                {totalSecondary}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un nom, email, téléphone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="h-8 text-xs pl-8"
            />
          </div>

          {drill.mode === "leads" && (
            <LeadsList
              page={paginate(sortedLeads)}
              tagsByLead={context.tagsByLead}
              callsByLead={context.callsByLead}
              salesByLead={context.salesByLead}
              onPageChange={setPage}
            />
          )}
          {drill.mode === "calls" && (
            <CallsList
              page={paginate(sortedCalls)}
              leadById={context.leadById}
              onPageChange={setPage}
            />
          )}
          {drill.mode === "sales" && (
            <SalesList
              page={paginate(sortedSales)}
              leadById={context.leadById}
              onPageChange={setPage}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModalPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
        aria-label="Page précédente"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="text-[11px] text-muted-foreground tabular-nums px-1">
        {page + 1} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
        aria-label="Page suivante"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LeadsList({
  page,
  tagsByLead,
  callsByLead,
  salesByLead,
  onPageChange,
}: {
  page: { items: MarketingLead[]; totalPages: number; safePage: number };
  tagsByLead: Map<string, MarketingTag[]>;
  callsByLead: Map<string, MarketingCall[]>;
  salesByLead: Map<string, MarketingSale[]>;
  onPageChange: (p: number) => void;
}) {
  if (page.items.length === 0) return <EmptyRow label="Aucun lead" />;
  return (
    <div>
      <div className="grid grid-cols-[1.7fr_130px_150px_60px_60px_1.4fr] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Lead</span>
        <span>Source</span>
        <span>Opt-in</span>
        <span className="text-center">RDV</span>
        <span className="text-center">Vente</span>
        <span>Tags</span>
      </div>
      <div className="divide-y divide-border/40 max-h-[55vh] overflow-y-auto">
        {page.items.map((l, idx) => {
          const tags = tagsByLead.get(l.id) ?? [];
          const nbCalls = callsByLead.get(l.id)?.length ?? 0;
          const nbSales = salesByLead.get(l.id)?.length ?? 0;
          return (
            <div
              key={l.id}
              className={`grid grid-cols-[1.7fr_130px_150px_60px_60px_1.4fr] gap-3 items-center px-3 py-2.5 ${
                idx % 2 === 1 ? "bg-muted/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {l.raw_full_name || "—"}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {l.raw_email && (
                      <span className="flex items-center gap-1 truncate" title={l.raw_email}>
                        <Mail className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{l.raw_email}</span>
                      </span>
                    )}
                    {l.raw_phone && (
                      <span className="flex items-center gap-1 truncate" title={l.raw_phone}>
                        <Phone className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{l.raw_phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] w-fit"
                style={{ borderColor: sourceColor(l.source) }}
              >
                {sourceLabel(l.source)}
              </Badge>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatParisDateTime(l.created_at)}
              </span>
              <div className="text-center">
                {nbCalls > 0 ? (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {nbCalls}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40">—</span>
                )}
              </div>
              <div className="text-center">
                {nbSales > 0 ? (
                  <Badge className="text-[10px] font-mono bg-[hsl(var(--kpi-paid))] hover:bg-[hsl(var(--kpi-paid))]">
                    {nbSales}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40">—</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground/60">—</span>
                ) : (
                  tags.map((t, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[9px] font-normal px-1.5 py-0"
                      title={`${tagCategoryLabel(t.category)} · ${tagKeyLabel(t.key)}`}
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
      <div className="flex items-center justify-between pt-3 border-t border-border px-3">
        <span className="text-[11px] text-muted-foreground">
          Page <span className="font-semibold text-foreground">{page.safePage + 1}</span> sur{" "}
          {page.totalPages}
        </span>
        <ModalPagination
          page={page.safePage}
          totalPages={page.totalPages}
          onChange={onPageChange}
        />
      </div>
    </div>
  );
}

function CallsList({
  page,
  leadById,
  onPageChange,
}: {
  page: { items: MarketingCall[]; totalPages: number; safePage: number };
  leadById: Map<string, MarketingLead>;
  onPageChange: (p: number) => void;
}) {
  if (page.items.length === 0) return <EmptyRow label="Aucun RDV" />;
  return (
    <div>
      <div className="grid grid-cols-[1.7fr_130px_150px_150px_110px_1fr] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Lead</span>
        <span>Source</span>
        <span>RDV prévu</span>
        <span>RDV pris le</span>
        <span>Statut</span>
        <span>Résultat</span>
      </div>
      <div className="divide-y divide-border/40 max-h-[55vh] overflow-y-auto">
        {page.items.map((c, idx) => {
          const lead = c.lead_id ? leadById.get(c.lead_id) : null;
          const displayName = lead?.raw_full_name || c.raw_full_name || "—";
          const displayEmail = lead?.raw_email || c.raw_email;
          const displayPhone = lead?.raw_phone || c.raw_phone;
          return (
            <div
              key={c.id}
              className={`grid grid-cols-[1.7fr_130px_150px_150px_110px_1fr] gap-3 items-center px-3 py-2.5 ${
                idx % 2 === 1 ? "bg-muted/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {displayEmail && (
                      <span className="truncate" title={displayEmail}>
                        {displayEmail}
                      </span>
                    )}
                    {displayPhone && (
                      <span className="truncate" title={displayPhone}>
                        · {displayPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] w-fit ${c.is_orphan ? "italic text-muted-foreground" : ""}`}
                style={{ borderColor: lead ? sourceColor(lead.source) : undefined }}
              >
                {lead ? sourceLabel(lead.source) : "Inconnu"}
              </Badge>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {c.scheduled_at ? formatParisDateTime(c.scheduled_at) : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatParisDateTime(c.created_at)}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] w-fit ${callStatusClass(c.status)}`}
              >
                {callStatusLabel(c.status)}
              </Badge>
              <span className="text-[11px] text-foreground truncate" title={c.outcome ?? ""}>
                {outcomeLabel(c.outcome)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border px-3">
        <span className="text-[11px] text-muted-foreground">
          Page <span className="font-semibold text-foreground">{page.safePage + 1}</span> sur{" "}
          {page.totalPages}
        </span>
        <ModalPagination
          page={page.safePage}
          totalPages={page.totalPages}
          onChange={onPageChange}
        />
      </div>
    </div>
  );
}

function SalesList({
  page,
  leadById,
  onPageChange,
}: {
  page: { items: MarketingSale[]; totalPages: number; safePage: number };
  leadById: Map<string, MarketingLead>;
  onPageChange: (p: number) => void;
}) {
  if (page.items.length === 0) return <EmptyRow label="Aucune vente" />;
  return (
    <div>
      <div className="grid grid-cols-[1.7fr_130px_130px_1fr_100px_110px] gap-3 px-3 pb-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Client</span>
        <span>Source</span>
        <span>Date vente</span>
        <span>Produit</span>
        <span className="text-right">Montant HT</span>
        <span>Paiement</span>
      </div>
      <div className="divide-y divide-border/40 max-h-[55vh] overflow-y-auto">
        {page.items.map((s, idx) => {
          const lead = s.lead_id ? leadById.get(s.lead_id) : null;
          const displayName = lead?.raw_full_name || s.contact_name || "—";
          const displayEmail = lead?.raw_email || s.contact_email;
          const displayPhone = lead?.raw_phone || s.contact_phone;
          return (
            <div
              key={s.id}
              className={`grid grid-cols-[1.7fr_130px_130px_1fr_100px_110px] gap-3 items-center px-3 py-2.5 ${
                idx % 2 === 1 ? "bg-muted/10" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {displayEmail && (
                      <span className="truncate" title={displayEmail}>
                        {displayEmail}
                      </span>
                    )}
                    {displayPhone && (
                      <span className="truncate" title={displayPhone}>
                        · {displayPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] w-fit ${s.is_orphan ? "italic text-muted-foreground" : ""}`}
                style={{ borderColor: lead ? sourceColor(lead.source) : undefined }}
              >
                {lead ? sourceLabel(lead.source) : "Inconnu"}
              </Badge>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {s.sold_at ? formatParisDateTime(s.sold_at) : "—"}
              </span>
              <span className="text-[11px] text-foreground truncate" title={s.product ?? ""}>
                {s.product || "—"}
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums text-right">
                {eur(s.amount_ht)}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] w-fit ${paymentStatusClass(s.payment_status)}`}
              >
                {paymentStatusLabel(s.payment_status)}
              </Badge>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border px-3">
        <span className="text-[11px] text-muted-foreground">
          Page <span className="font-semibold text-foreground">{page.safePage + 1}</span> sur{" "}
          {page.totalPages}
        </span>
        <ModalPagination
          page={page.safePage}
          totalPages={page.totalPages}
          onChange={onPageChange}
        />
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16">
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

function callStatusClass(s: string | null): string {
  switch (s) {
    case "completed":
      return "border-[hsl(var(--kpi-paid)/0.4)] text-[hsl(var(--kpi-paid))] bg-[hsl(var(--kpi-paid)/0.08)]";
    case "scheduled":
      return "border-blue-500/40 text-blue-500 bg-blue-500/8";
    case "no_show":
      return "border-destructive/40 text-destructive bg-destructive/8";
    case "rescheduled":
      return "border-amber-500/40 text-amber-500 bg-amber-500/8";
    default:
      return "";
  }
}

function outcomeLabel(o: string | null): string {
  if (!o) return "—";
  const map: Record<string, string> = {
    sale: "💰 Vente",
    no_sale: "❌ Pas de vente",
    follow_up: "🔁 Relance",
    not_qualified: "⚠️ Non qualifié",
    not_interested: "❌ Pas intéressé",
    wrong_number: "📵 Mauvais numéro",
  };
  return map[o] ?? o;
}

function paymentStatusLabel(s: string | null): string {
  switch (s) {
    case "paid":
      return "Payé";
    case "in_progress":
      return "En cours";
    case "pending":
      return "En attente";
    case "late":
      return "Retard";
    case "lost":
      return "Perdu";
    default:
      return s ?? "—";
  }
}

function paymentStatusClass(s: string | null): string {
  switch (s) {
    case "paid":
      return "border-[hsl(var(--kpi-paid)/0.4)] text-[hsl(var(--kpi-paid))] bg-[hsl(var(--kpi-paid)/0.08)]";
    case "in_progress":
    case "pending":
      return "border-[hsl(var(--kpi-in-progress)/0.4)] text-[hsl(var(--kpi-in-progress))] bg-[hsl(var(--kpi-in-progress)/0.08)]";
    case "late":
      return "border-[hsl(var(--kpi-late)/0.4)] text-[hsl(var(--kpi-late))] bg-[hsl(var(--kpi-late)/0.08)]";
    case "lost":
      return "border-[hsl(var(--kpi-lost)/0.4)] text-[hsl(var(--kpi-lost))] bg-[hsl(var(--kpi-lost)/0.08)]";
    default:
      return "";
  }
}
