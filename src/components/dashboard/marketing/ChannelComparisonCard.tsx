// Bloc maître "Performance Facebook vs Instagram" du dashboard marketing.
//
// Affiche en 3 zones :
//   1. Tableau comparatif côte à côte (leads, RDV, ventes, taux conv, CA)
//   2. Profils distinctifs (top tags surreprésentés sur chaque canal)
//   3. Verdict synthétique
//
// Chaque chiffre est cliquable et ouvre le drill-down filtré sur les
// leadIds du canal — ce qui permet d'analyser les leads/calls/sales d'un
// canal spécifique sans changer le filtre global du dashboard.

import { Facebook, Instagram, Trophy, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type {
  MarketingDashboardData,
  ChannelComparisonStats,
  AdChannel,
  ChannelTagDistinctive,
} from "@/hooks/useMarketingDashboardData";
import { tagCategoryLabel, tagKeyLabel } from "@/lib/marketing/labels";

// ── Formatters ────────────────────────────────────────────────────────
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const num = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

const pct = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits).replace(/\.0+$/, "")}%`;

// ── Types ─────────────────────────────────────────────────────────────
interface DrillState {
  mode: "leads" | "calls" | "sales";
  title: string;
  leadIds?: Set<string>;
  orphanOnly?: boolean;
}

interface Props {
  data: MarketingDashboardData;
  onDrill: (s: DrillState) => void;
}

// ── Composant principal ──────────────────────────────────────────────
export default function ChannelComparisonCard({ data, onDrill }: Props) {
  const { fb, ig, verdict } = data.channelComparison;

  // Si aucun lead n'a d'utm fb/ig, on n'affiche pas le bloc.
  if (fb.leads === 0 && ig.leads === 0) return null;

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Performance Facebook vs Instagram
          </h3>
          <span className="text-[11px] text-muted-foreground">
            ({num(fb.leads + ig.leads)} leads issus de Meta Ads
            {data.leads > fb.leads + ig.leads
              ? ` sur ${num(data.leads)} au total`
              : ""}
            )
          </span>
        </div>

        {/* ─── ZONE 1 : Tableau comparatif ───────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <ChannelCard stats={fb} onDrill={onDrill} />
          <ChannelCard stats={ig} onDrill={onDrill} />
        </div>

        {/* ─── ZONE 2 : Profils distinctifs ─────────────────────────── */}
        {(fb.topDistinctiveTags.length > 0 || ig.topDistinctiveTags.length > 0) && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <DistinctiveProfileColumn
              channel="fb"
              tags={fb.topDistinctiveTags}
              channelLeadIds={fb.leadIds}
              onDrill={onDrill}
            />
            <DistinctiveProfileColumn
              channel="ig"
              tags={ig.topDistinctiveTags}
              channelLeadIds={ig.leadIds}
              onDrill={onDrill}
            />
          </div>
        )}

        {/* ─── ZONE 3 : Verdict synthétique ─────────────────────────── */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Verdict
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <VerdictTile label="Volume" winner={verdict.moreLeads} />
            <VerdictTile label="Conv. Lead → RDV" winner={verdict.bestLeadToCall} />
            <VerdictTile label="Conv. Lead → Vente" winner={verdict.bestLeadToSale} />
            <VerdictTile label="Chiffre d'affaires" winner={verdict.moreRevenue} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Carte d'un canal (zone 1) ─────────────────────────────────────────
function ChannelCard({
  stats,
  onDrill,
}: {
  stats: ChannelComparisonStats;
  onDrill: (s: DrillState) => void;
}) {
  const { channel, leads, calls, sales, revenue, leadToCall, leadToSale, leadIds } = stats;
  const Icon = channel === "fb" ? Facebook : Instagram;
  const accentClass =
    channel === "fb"
      ? "text-blue-400 border-blue-500/30 bg-blue-500/5"
      : "text-pink-400 border-pink-500/30 bg-pink-500/5";
  const labelTitle = channel === "fb" ? "Facebook" : "Instagram";

  const leadIdsSet = new Set(leadIds);
  const drillBase = `${labelTitle}`;

  const Row = ({
    label,
    value,
    onClick,
  }: {
    label: string;
    value: string;
    onClick?: () => void;
  }) => (
    <div className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={`text-xs tabular-nums font-semibold transition-colors ${
          onClick ? "hover:text-primary cursor-pointer" : "cursor-default"
        }`}
      >
        {value}
      </button>
    </div>
  );

  return (
    <div className={`rounded-lg border p-3 ${accentClass}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-semibold">{labelTitle}</span>
      </div>
      <div className="space-y-0">
        <Row
          label="Leads"
          value={num(leads)}
          onClick={
            leads > 0
              ? () =>
                  onDrill({
                    mode: "leads",
                    title: `Leads ${drillBase}`,
                    leadIds: leadIdsSet,
                  })
              : undefined
          }
        />
        <Row
          label="RDV pris"
          value={num(calls)}
          onClick={
            calls > 0
              ? () =>
                  onDrill({
                    mode: "calls",
                    title: `RDV pris — ${drillBase}`,
                    leadIds: leadIdsSet,
                  })
              : undefined
          }
        />
        <Row
          label="Ventes"
          value={num(sales)}
          onClick={
            sales > 0
              ? () =>
                  onDrill({
                    mode: "sales",
                    title: `Ventes — ${drillBase}`,
                    leadIds: leadIdsSet,
                  })
              : undefined
          }
        />
        <Row label="Conv. Lead → RDV" value={leads > 0 ? pct(leadToCall) : "—"} />
        <Row label="Conv. Lead → Vente" value={leads > 0 ? pct(leadToSale) : "—"} />
        <Row label="CA généré" value={eur(revenue)} />
      </div>
    </div>
  );
}

// ── Colonne profils distinctifs (zone 2) ─────────────────────────────
function DistinctiveProfileColumn({
  channel,
  tags,
  channelLeadIds,
  onDrill,
}: {
  channel: AdChannel;
  tags: ChannelTagDistinctive[];
  channelLeadIds: string[];
  onDrill: (s: DrillState) => void;
}) {
  const Icon = channel === "fb" ? Facebook : Instagram;
  const accent = channel === "fb" ? "text-blue-400" : "text-pink-400";
  const channelLabel = channel === "fb" ? "Facebook" : "Instagram";

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className={`h-3 w-3 ${accent}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Profil distinctif {channelLabel}
        </span>
      </div>
      {tags.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/70 italic">
          Pas de tag distinctif sur cette période.
        </p>
      ) : (
        <ul className="space-y-1">
          {tags.map((t) => {
            // Intersection : leads ayant ce tag ET appartenant à ce canal
            // → calculé côté hook via t.leadIds × channelLeadIds, mais on
            // n'a que les pct ici. Pour le drill, on filtre sur channelLeadIds
            // (le drill leads avec ce filtre montre toutes les leads du canal,
            // pas seulement celles du tag — c'est OK car le tag est juste une
            // étiquette de profil ici).
            return (
              <li
                key={`${t.category}::${t.key}`}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`h-3 w-3 flex-shrink-0 ${accent}`} />
                  <span className="text-muted-foreground/70 text-[10px]">
                    {tagCategoryLabel(t.category)}
                  </span>
                  <span className="font-medium truncate">
                    {tagKeyLabel(t.key)}
                  </span>
                </span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  <span className="tabular-nums font-semibold">
                    {pct(t.pctInChannel)}
                  </span>
                  <span className="text-muted-foreground/60 text-[10px]">
                    vs {pct(t.pctInOther)}
                  </span>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      channel === "fb" ? "text-blue-400" : "text-pink-400"
                    }`}
                    title={`Surreprésentation : ${t.lift.toFixed(1)}× plus présent ici`}
                  >
                    ×{t.lift.toFixed(1)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Tuile de verdict (zone 3) ─────────────────────────────────────────
function VerdictTile({
  label,
  winner,
}: {
  label: string;
  winner: AdChannel | "tie";
}) {
  if (winner === "tie") {
    return (
      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
        <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-xs font-semibold text-muted-foreground mt-0.5">
          Égalité
        </div>
      </div>
    );
  }
  const Icon = winner === "fb" ? Facebook : Instagram;
  const accent =
    winner === "fb"
      ? "bg-blue-500/10 border-blue-500/30"
      : "bg-pink-500/10 border-pink-500/30";
  const textAccent = winner === "fb" ? "text-blue-400" : "text-pink-400";
  const winnerLabel = winner === "fb" ? "Facebook" : "Instagram";
  return (
    <div className={`rounded-md border ${accent} px-2 py-1.5 text-center`}>
      <div className="text-[10px] text-muted-foreground/80 uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`text-xs font-semibold mt-0.5 flex items-center justify-center gap-1 ${textAccent}`}
      >
        <Icon className="h-3 w-3" />
        {winnerLabel}
      </div>
    </div>
  );
}
