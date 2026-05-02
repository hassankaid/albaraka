// Drill-down du KPI Budget Ads : ouvre une modal qui affiche le détail
// par campagne (vue par défaut), puis pour une campagne donnée le détail
// jour par jour (au clic sur la ligne).
//
// La fenêtre temporelle suit la même logique que useMarketingDashboardData
// (plage de 7 jours avant la conf jusqu'à la conf incluse).

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ChevronLeft, MousePointer, Eye, Euro } from "lucide-react";
import { channelLabel } from "@/lib/marketing/labels";
import type { ConferenceFilter as ConferenceFilterValue } from "@/lib/marketing/conferenceFilter";

// ── Formatters ────────────────────────────────────────────────────────
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

const pct = (n: number) => `${(n * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

function formatDate(ymd: string): string {
  // ymd au format YYYY-MM-DD ; on construit en UTC pour éviter tout TZ shift
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// Identique à conferenceToAdsDateRange dans useMarketingDashboardData.
// Dupliqué ici pour autonomie (sinon il faudrait l'exporter, mineur).
function conferenceToAdsDateRange(
  filter: ConferenceFilterValue,
): { fromYmd: string; toYmd: string } | null {
  if (filter.mode === "all") return null;
  if (filter.mode === "single") {
    const d = filter.date;
    const confDate = new Date(d + "T00:00:00Z");
    const fromDate = new Date(confDate.getTime() - 7 * 86400000);
    return { fromYmd: fromDate.toISOString().slice(0, 10), toYmd: d };
  }
  const from = new Date(filter.from + "T00:00:00Z");
  const fromDate = new Date(from.getTime() - 7 * 86400000);
  return { fromYmd: fromDate.toISOString().slice(0, 10), toYmd: filter.to };
}

// ── Types ─────────────────────────────────────────────────────────────
interface AdsRow {
  id: string;
  date: string;
  campaign_name: string | null;
  campaign_id: string | null;
  channel: string | null;
  amount_spent: number | null;
  impressions: number | null;
  clicks: number | null;
}

interface CampaignAggregate {
  campaignName: string;
  channel: string;
  spent: number;
  impressions: number;
  clicks: number;
  daysCount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  filter: ConferenceFilterValue;
}

// ── Composant ────────────────────────────────────────────────────────
export default function AdsDrillDownModal({ open, onClose, filter }: Props) {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ads-drill-down", JSON.stringify(filter)],
    enabled: open,
    queryFn: async (): Promise<AdsRow[]> => {
      let q = (supabase as any)
        .from("ads")
        .select(
          "id, date, campaign_name, campaign_id, channel, amount_spent, impressions, clicks",
        );
      const range = conferenceToAdsDateRange(filter);
      if (range) {
        q = q.gte("date", range.fromYmd).lte("date", range.toYmd);
      }
      const { data, error } = await q.order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdsRow[];
    },
  });

  // Reset la campagne sélectionnée à chaque ouverture / changement de filtre
  // pour éviter d'afficher du vide si la campagne précédente n'existe plus.
  const handleClose = () => {
    setSelectedCampaign(null);
    onClose();
  };

  // ── Vue 1 : agrégation par campagne ─────────────────────────────────
  const campaigns = useMemo<CampaignAggregate[]>(() => {
    if (!data) return [];
    const map = new Map<string, CampaignAggregate>();
    for (const r of data) {
      const key = r.campaign_name ?? "(sans nom)";
      const cur = map.get(key) ?? {
        campaignName: key,
        channel: r.channel ?? "—",
        spent: 0,
        impressions: 0,
        clicks: 0,
        daysCount: 0,
      };
      cur.spent += Number(r.amount_spent ?? 0);
      cur.impressions += Number(r.impressions ?? 0);
      cur.clicks += Number(r.clicks ?? 0);
      cur.daysCount += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
  }, [data]);

  // ── Vue 2 : détail jour pour une campagne ───────────────────────────
  const dailyRows = useMemo(() => {
    if (!data || !selectedCampaign) return [];
    return data
      .filter((r) => (r.campaign_name ?? "(sans nom)") === selectedCampaign)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, selectedCampaign]);

  // Totaux pour le header
  const totalSpent = useMemo(
    () => (data ?? []).reduce((s, r) => s + Number(r.amount_spent ?? 0), 0),
    [data],
  );
  const totalImpressions = useMemo(
    () => (data ?? []).reduce((s, r) => s + Number(r.impressions ?? 0), 0),
    [data],
  );
  const totalClicks = useMemo(
    () => (data ?? []).reduce((s, r) => s + Number(r.clicks ?? 0), 0),
    [data],
  );

  // Sub-total quand on est sur une campagne donnée
  const campaignTotal = useMemo(() => {
    if (!selectedCampaign || !data) return null;
    const rows = data.filter(
      (r) => (r.campaign_name ?? "(sans nom)") === selectedCampaign,
    );
    return {
      spent: rows.reduce((s, r) => s + Number(r.amount_spent ?? 0), 0),
      impressions: rows.reduce((s, r) => s + Number(r.impressions ?? 0), 0),
      clicks: rows.reduce((s, r) => s + Number(r.clicks ?? 0), 0),
      days: rows.length,
    };
  }, [data, selectedCampaign]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          {selectedCampaign ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Retour aux campagnes
              </button>
              <DialogTitle className="text-base mt-1 flex items-center gap-2">
                <span className="truncate">{selectedCampaign}</span>
              </DialogTitle>
              {campaignTotal && (
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    {eur(campaignTotal.spent)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {num(campaignTotal.impressions)} impressions
                  </span>
                  <span className="flex items-center gap-1">
                    <MousePointer className="h-3 w-3" />
                    {num(campaignTotal.clicks)} clics
                  </span>
                  <span className="text-muted-foreground/70">
                    sur {campaignTotal.days} jour{campaignTotal.days > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <DialogTitle className="text-base">Budget Ads — détail par campagne</DialogTitle>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  {eur(totalSpent)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {num(totalImpressions)} impressions
                </span>
                <span className="flex items-center gap-1">
                  <MousePointer className="h-3 w-3" />
                  {num(totalClicks)} clics
                </span>
                <span className="text-muted-foreground/70">
                  · {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}
                </span>
              </div>
            </>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Aucune dépense ads sur la période sélectionnée.
            </div>
          ) : selectedCampaign ? (
            // ─── Vue 2 : jour par jour ────────────────────────────────
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b border-border">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium text-right">Dépense</th>
                  <th className="py-2 font-medium text-right">Impressions</th>
                  <th className="py-2 font-medium text-right">Clics</th>
                  <th className="py-2 font-medium text-right">CTR</th>
                  <th className="py-2 font-medium text-right">CPC</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((r) => {
                  const spent = Number(r.amount_spent ?? 0);
                  const imp = Number(r.impressions ?? 0);
                  const clk = Number(r.clicks ?? 0);
                  const ctr = imp > 0 ? clk / imp : 0;
                  const cpc = clk > 0 ? spent / clk : 0;
                  return (
                    <tr key={r.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2 font-medium">{formatDate(r.date)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-primary">
                        {eur2(spent)}
                      </td>
                      <td className="py-2 text-right tabular-nums">{num(imp)}</td>
                      <td className="py-2 text-right tabular-nums">{num(clk)}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {imp > 0 ? pct(ctr) : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {clk > 0 ? eur2(cpc) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            // ─── Vue 1 : par campagne ─────────────────────────────────
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b border-border">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 font-medium">Channel</th>
                  <th className="py-2 font-medium">Campagne</th>
                  <th className="py-2 font-medium text-right">Dépense</th>
                  <th className="py-2 font-medium text-right">Impressions</th>
                  <th className="py-2 font-medium text-right">Clics</th>
                  <th className="py-2 font-medium text-right">CTR</th>
                  <th className="py-2 font-medium text-right">Jours</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const ctr = c.impressions > 0 ? c.clicks / c.impressions : 0;
                  return (
                    <tr
                      key={c.campaignName}
                      onClick={() => setSelectedCampaign(c.campaignName)}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {channelLabel(c.channel)}
                        </span>
                      </td>
                      <td className="py-2 max-w-[280px]">
                        <div className="truncate font-medium" title={c.campaignName}>
                          {c.campaignName}
                        </div>
                      </td>
                      <td className="py-2 text-right tabular-nums font-semibold text-primary">
                        {eur(c.spent)}
                      </td>
                      <td className="py-2 text-right tabular-nums">{num(c.impressions)}</td>
                      <td className="py-2 text-right tabular-nums">{num(c.clicks)}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {c.impressions > 0 ? pct(ctr) : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {c.daysCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
