import { useState } from "react";
import PeriodFilter, { type DateRange } from "@/components/dashboard/PeriodFilter";
import { useTeamPerformance, type TeamRankingRow } from "@/hooks/useTeamPerformance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Activity, Award, Crown, Loader2, Sparkles, Target, Trophy, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Formatters ─────────────────────────────────────────────────────
const num = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const pct = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

// ─── Helpers UI ─────────────────────────────────────────────────────
function roleBadge(role: string, level: string | null) {
  if (role === "ceo") return { label: "CEO", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  if (role === "apporteur") return { label: "Apporteur", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" };
  if (role === "collaborateur") {
    if (level === "confirme") return { label: "Collab confirmé", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
    if (level === "intermediaire") return { label: "Collab intermédiaire", cls: "bg-blue-500/10 text-blue-400/80 border-blue-500/20" };
    return { label: "Collab", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
  }
  if (role === "agence") return { label: "Agence", cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
  return { label: role, cls: "bg-muted text-muted-foreground border-border" };
}

const ROLE_PODIUM_META: Record<"setter" | "closer" | "apporteur", {
  label: string;
  icon: any;
  color: string;
}> = {
  setter:    { label: "Top Setters",    icon: Target,   color: "text-blue-400" },
  closer:    { label: "Top Closers",    icon: Trophy,   color: "text-emerald-400" },
  apporteur: { label: "Top Apporteurs", icon: Sparkles, color: "text-amber-400" },
};

const TOP_N = 5;

// ─── Default period : cette semaine (lundi → dimanche ISO) ─────────
function defaultThisWeek(): DateRange {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = lundi
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7, 0, 0, 0);
  return { from, to };
}

// ─── Composant principal ────────────────────────────────────────────
export default function TeamTab() {
  const [dateRange, setDateRange] = useState<DateRange | null>(defaultThisWeek());

  const { data, isLoading, isError, error } = useTeamPerformance({
    from: dateRange?.from ?? null,
    to: dateRange?.to ?? null,
  });

  return (
    <div className="space-y-4">
      {/* Sélecteur de période */}
      <PeriodFilter value={dateRange} onChange={setDateRange} weekMode="isoMonday" />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            Erreur de chargement : {(error as any)?.message ?? "inconnue"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && (
        <>
          {/* ─── Section A — Activité ─────────────────────────────── */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="font-heading text-base text-foreground">Activité sur la période</h3>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {data.activity.length} membre{data.activity.length > 1 ? "s" : ""} actif{data.activity.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Nombre de leads touchés (changement de statut, note, appel…) par membre sur la période choisie.
              </p>
              {data.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune activité sur la période.
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Membre</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="text-right">Leads touchés</TableHead>
                        <TableHead className="text-right">Actions totales</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.activity.map((row) => {
                        const rb = roleBadge(row.role, row.collaborateur_level);
                        return (
                          <TableRow key={row.user_id} className="border-border hover:bg-secondary/40">
                            <TableCell className="font-medium text-foreground">{row.full_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-[10px] leading-tight", rb.cls)}>
                                {rb.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground">{num(row.nb_leads_handled)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{num(row.nb_activities)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Section B — Qualification ────────────────────────── */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-heading text-base text-foreground">Qualification</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Sur les leads touchés sur la période, combien sont passés en « inscrit conférence » ou « call booké » par ce membre. Le taux est la somme des deux divisée par les leads touchés.
              </p>
              {data.qualification.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune qualification sur la période.
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Membre</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="text-right">Touchés</TableHead>
                        <TableHead className="text-right">Inscrit conf</TableHead>
                        <TableHead className="text-right">Call booké</TableHead>
                        <TableHead className="text-right">Taux qualif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.qualification.map((row) => {
                        const rb = roleBadge(row.role, row.collaborateur_level);
                        const tauxNum = Number(row.taux_qualif) || 0;
                        const tauxCls = tauxNum >= 0.4
                          ? "text-emerald-400"
                          : tauxNum >= 0.2
                            ? "text-amber-400"
                            : "text-muted-foreground";
                        return (
                          <TableRow key={row.user_id} className="border-border hover:bg-secondary/40">
                            <TableCell className="font-medium text-foreground">{row.full_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-[10px] leading-tight", rb.cls)}>
                                {rb.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{num(row.nb_leads_handled)}</TableCell>
                            <TableCell className="text-right text-foreground">{num(row.nb_inscrit_conf)}</TableCell>
                            <TableCell className="text-right text-foreground">{num(row.nb_call_booke)}</TableCell>
                            <TableCell className={cn("text-right font-bold", tauxCls)}>{pct(tauxNum, 0)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Section C — Classements ventes ───────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(["setter", "closer", "apporteur"] as const).map((role) => (
              <RankingPodium key={role} role={role} rows={data.rankings[role]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sous-composant Podium ─────────────────────────────────────────
function RankingPodium({
  role,
  rows,
}: {
  role: "setter" | "closer" | "apporteur";
  rows: TeamRankingRow[];
}) {
  const meta = ROLE_PODIUM_META[role];
  const Icon = meta.icon;
  const top = rows.slice(0, TOP_N);

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", meta.color)} />
          <h3 className="font-heading text-base text-foreground">{meta.label}</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {rows.length} actif{rows.length > 1 ? "s" : ""}
          </Badge>
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune vente sur la période.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {top.map((r, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li
                  key={r.user_id}
                  className={cn(
                    "flex items-start gap-3 rounded-md px-2.5 py-2 border",
                    i === 0
                      ? "border-amber-500/40 bg-amber-500/[0.04]"
                      : "border-border/60 bg-card",
                  )}
                >
                  <div className="flex-shrink-0 w-6 text-center text-sm font-bold text-muted-foreground">
                    {medal ?? `${i + 1}.`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {num(r.nb_ventes)} vente{r.nb_ventes > 1 ? "s" : ""} · {eur(r.montant_total_ht)} HT
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Commissions perçues : <span className="text-foreground font-medium">{eur(r.montant_commissions)}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
