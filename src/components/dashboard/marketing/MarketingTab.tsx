import { useState } from "react";
import PeriodFilter, { type DateRange } from "@/components/dashboard/PeriodFilter";
import { useMarketingDashboardData } from "@/hooks/useMarketingDashboardData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Euro, Users, Target, Calendar, TrendingUp, Tag as TagIcon } from "lucide-react";
import { parisSundayNoonWeekRange } from "@/lib/marketing/weekRange";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const currency = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const CHANNEL_COLORS: Record<string, string> = {
  meta: "#1877f2",
  facebook: "#1877f2",
  instagram: "#e4405f",
  tiktok: "#000000",
  youtube: "#ff0000",
  google: "#4285f4",
  inconnu: "#9ca3af",
};

function colorFor(channel: string) {
  const k = channel.toLowerCase();
  return CHANNEL_COLORS[k] ?? "#6366f1";
}

function KPICard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <p className="text-2xl font-bold font-heading mt-1">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function MarketingTab() {
  // Par défaut : la semaine marketing en cours (dim 12h Paris → dim 12h Paris)
  const [dateRange, setDateRange] = useState<DateRange | null>(() =>
    parisSundayNoonWeekRange(new Date()),
  );
  const { data, isLoading } = useMarketingDashboardData(dateRange);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <PeriodFilter
          value={dateRange}
          onChange={setDateRange}
          weekMode="sundayNoonParis"
        />
        <span className="text-[11px] text-muted-foreground">
          Tous les RDV et ventes sont rattachés à la semaine d'inscription du lead.
        </span>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ─── KPIs globaux ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            <KPICard
              label="Budget Ads"
              value={currency(data.budget)}
              icon={Euro}
            />
            <KPICard
              label="Leads"
              value={data.leads.toLocaleString("fr-FR")}
              hint={`opt-ins de la période`}
              icon={Users}
            />
            <KPICard
              label="CPL"
              value={data.leads > 0 ? currency(data.cpl) : "—"}
              hint="budget / leads"
              icon={Euro}
            />
            <KPICard
              label="RDV pris"
              value={data.calls.toLocaleString("fr-FR")}
              hint={`taux L→RDV ${pct(data.leadToCallRate)}`}
              icon={Calendar}
            />
            <KPICard
              label="CPR"
              value={data.calls > 0 ? currency(data.cpr) : "—"}
              hint="budget / RDV"
              icon={Euro}
            />
            <KPICard
              label="Ventes"
              value={data.sales.toLocaleString("fr-FR")}
              hint={`taux L→Vente ${pct(data.leadToSaleRate)}`}
              icon={Target}
            />
            <KPICard
              label="CAC"
              value={data.sales > 0 ? currency(data.cac) : "—"}
              hint="budget / ventes"
              icon={Euro}
            />
            <KPICard
              label="CA généré"
              value={currency(data.revenue)}
              hint="par les leads de la période"
              icon={TrendingUp}
            />
          </div>

          {/* ─── Budget Ads par channel ─── */}
          {data.channelSpend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Budget Ads par channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.channelSpend}>
                    <XAxis dataKey="channel" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip
                      formatter={(v: number) => currency(v)}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    />
                    <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
                      {data.channelSpend.map((c, i) => (
                        <Cell key={i} fill={colorFor(c.channel)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ─── Performance par source lead ─── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance par source de lead</CardTitle>
              <p className="text-xs text-muted-foreground">
                Quel funnel d'acquisition convertit le mieux ? (Webi, VSL A/B, Organique, Apporteurs…)
              </p>
            </CardHeader>
            <CardContent>
              {data.sourceBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Aucun lead sur la période.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-2 font-medium">Source</th>
                        <th className="text-right py-2 px-2 font-medium">Leads</th>
                        <th className="text-right py-2 px-2 font-medium">RDV</th>
                        <th className="text-right py-2 px-2 font-medium">L→RDV</th>
                        <th className="text-right py-2 px-2 font-medium">Ventes</th>
                        <th className="text-right py-2 px-2 font-medium">L→Vente</th>
                        <th className="text-right py-2 px-2 font-medium">CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sourceBreakdown.map((row) => (
                        <tr
                          key={row.source}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="py-2 px-2 font-mono">{row.source}</td>
                          <td className="py-2 px-2 text-right font-semibold">{row.leads}</td>
                          <td className="py-2 px-2 text-right">{row.calls}</td>
                          <td className="py-2 px-2 text-right">{pct(row.leadToCall)}</td>
                          <td className="py-2 px-2 text-right">{row.sales}</td>
                          <td className="py-2 px-2 text-right">{pct(row.leadToSale)}</td>
                          <td className="py-2 px-2 text-right font-semibold">{currency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Dashboard tags ─── */}
          <TagDashboard data={data.tagBreakdown} totalLeads={data.leads} />
        </>
      )}
    </div>
  );
}

function TagDashboard({
  data,
  totalLeads,
}: {
  data: Array<{
    category: string;
    key: string;
    leads: number;
    calls: number;
    sales: number;
    leadToCall: number;
    leadToSale: number;
  }>;
  totalLeads: number;
}) {
  // Groupe par catégorie
  const categories = Array.from(new Set(data.map((r) => r.category)));
  const byCategory = new Map<string, typeof data>();
  for (const cat of categories) {
    byCategory.set(
      cat,
      data.filter((r) => r.category === cat).sort((a, b) => b.leads - a.leads),
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Profil type des leads de la période
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucun tag posé sur les leads de cette période.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TagIcon className="h-4 w-4" />
          Profil type des leads de la période
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Répartition des {totalLeads} leads par tag, avec le taux de conversion pour chaque tag.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {categories.map((cat) => {
          const rows = byCategory.get(cat) ?? [];
          const catTotal = rows.reduce((s, r) => s + r.leads, 0);
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {cat}
              </p>
              <div className="space-y-1.5">
                {rows.map((r) => {
                  const widthPct = catTotal > 0 ? (r.leads / catTotal) * 100 : 0;
                  return (
                    <div
                      key={r.key}
                      className="flex items-center gap-3 text-xs"
                    >
                      <span className="w-40 truncate font-medium" title={r.key}>
                        {r.key}
                      </span>
                      <div className="flex-1 relative h-5 rounded bg-muted overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/70 rounded"
                          style={{ width: `${widthPct}%` }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-foreground">
                          {r.leads} ({widthPct.toFixed(0)}%)
                        </span>
                      </div>
                      <span className="w-16 text-right text-muted-foreground">
                        RDV {pct(r.leadToCall)}
                      </span>
                      <span className="w-16 text-right text-muted-foreground">
                        Vente {pct(r.leadToSale)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
