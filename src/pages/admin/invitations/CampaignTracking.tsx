import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Rocket, Download, ArrowLeft, Clock, CheckCircle2, AlertCircle, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCampaignRows,
  useCampaignRuns,
  summarizeWaves,
  nextWaveFireTime,
  type CampaignRow,
  type WaveSummary,
} from "@/hooks/useInvitationCampaigns";

type WaveFilter = "all" | "1" | "2" | "3";
type StatusFilter = "all" | "sent" | "pending" | "error" | "activated";

export default function CampaignTracking() {
  const { profile } = useAuth();
  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;

  const { data: rows, isLoading } = useCampaignRows();
  const { data: runs } = useCampaignRuns();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const [waveFilter, setWaveFilter] = useState<WaveFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const waves = useMemo(() => summarizeWaves(rows ?? []), [rows]);
  const next = useMemo(() => nextWaveFireTime(waves, now), [waves, now]);

  const totalSent = waves.reduce((s, w) => s + w.sent, 0);
  const totalAll = waves.reduce((s, w) => s + w.total, 0);
  const globalPct = totalAll > 0 ? Math.round((totalSent / totalAll) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (waveFilter !== "all" && r.wave_number !== Number(waveFilter)) return false;
      if (statusFilter === "sent" && !r.sent_at) return false;
      if (statusFilter === "pending" && r.sent_at) return false;
      if (statusFilter === "error" && !r.error) return false;
      if (statusFilter === "activated" && !r.onboarding_completed) return false;
      if (q && !r.full_name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, waveFilter, statusFilter, search]);

  function exportCsv(waveNumber: number | "all") {
    const subset = (rows ?? []).filter((r) => waveNumber === "all" || r.wave_number === waveNumber);
    const header = "Nom complet,Email,Vague,Date invitation,Statut\n";
    const lines = subset.map((r) => {
      const status = r.error
        ? "Erreur"
        : r.onboarding_completed
          ? "Accès activé"
          : r.sent_at
            ? "Invitation envoyée"
            : "En attente";
      const sentDate = r.sent_at ? new Date(r.sent_at).toISOString().slice(0, 16).replace("T", " ") : "";
      const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
      return [esc(r.full_name), esc(r.email), r.wave_number, sentDate, esc(status)].join(",");
    });
    const csv = header + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = waveNumber === "all" ? `campagne-complete-${dateStr}.csv` : `campagne-vague${waveNumber}-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatRemaining(ms: number): string {
    if (ms <= 0) return "maintenant";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}j ${h}h${m.toString().padStart(2, "0")}`;
    if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
    return `${m}min`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/admin/invitations"><ArrowLeft className="h-4 w-4" />Retour</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-heading">📊 Suivi de campagne early access</h1>
            <p className="text-sm text-muted-foreground">Envoi automatisé sur 3 vagues — page temporaire pour la campagne</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCsv("all")}>
          <Download className="h-4 w-4" />
          Export global
        </Button>
      </div>

      {/* Bloc prochaine vague */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
        <CardContent className="p-6 flex items-start gap-4 flex-wrap">
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/20 shrink-0">
            <Rocket className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1 min-w-[250px] space-y-2">
            {next ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Prochaine vague</p>
                <h3 className="text-xl font-bold text-foreground">
                  Vague {next.wave} — {waves.find((w) => w.wave === next.wave)?.total ?? 0} apporteurs
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {next.remaining === 0
                    ? "Part maintenant (ou au prochain cron)"
                    : <>Partira dans <strong className="text-foreground">{formatRemaining(next.remaining)}</strong> — {next.date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris)</>
                  }
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Campagne terminée</p>
                <h3 className="text-xl font-bold text-foreground">✅ Les 3 vagues ont été envoyées</h3>
              </>
            )}
            <div className="pt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progression globale</span>
                <span className="font-medium">{totalSent} / {totalAll} — {globalPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all" style={{ width: `${globalPct}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 cards vagues */}
      <div className="grid gap-3 sm:grid-cols-3">
        {waves.map((w) => (
          <WaveCard key={w.wave} summary={w} onExport={() => exportCsv(w.wave)} />
        ))}
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Détail par utilisateur</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom ou email…"
                  className="pl-8 w-[200px]"
                />
              </div>
              <div className="flex gap-1">
                {(["all","1","2","3"] as WaveFilter[]).map((f) => (
                  <Button key={f} size="sm" variant={waveFilter === f ? "default" : "outline"} onClick={() => setWaveFilter(f)}>
                    {f === "all" ? "Toutes vagues" : `V${f}`}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1">
                {(["all","sent","pending","error","activated"] as StatusFilter[]).map((f) => (
                  <Button key={f} size="sm" variant={statusFilter === f ? "default" : "outline"} onClick={() => setStatusFilter(f)}>
                    {f === "all" && "Tous"}
                    {f === "sent" && "Envoyés"}
                    {f === "pending" && "En attente"}
                    {f === "error" && "Erreurs"}
                    {f === "activated" && "Activés"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vague</TableHead>
                  <TableHead>Envoi</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Aucun résultat</TableCell></TableRow>
                )}
                {filtered.map((r) => <CampaignRowView key={r.id} row={r} />)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Historique runs */}
      {runs && runs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">📜 Historique des envois</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Déclenché par</TableHead>
                  <TableHead>Traités</TableHead>
                  <TableHead>Envoyés</TableHead>
                  <TableHead>Erreurs</TableHead>
                  <TableHead>Durée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.started_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</TableCell>
                    <TableCell><Badge variant="outline">{r.triggered_by}</Badge></TableCell>
                    <TableCell>{r.processed}</TableCell>
                    <TableCell className="text-emerald-500 font-medium">{r.sent}</TableCell>
                    <TableCell className={r.failed > 0 ? "text-destructive font-medium" : ""}>{r.failed}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.finished_at ? `${Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)}s` : "en cours"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WaveCard({ summary, onExport }: { summary: WaveSummary; onExport: () => void }) {
  const pct = summary.total > 0 ? Math.round((summary.sent / summary.total) * 100) : 0;
  const fullySent = summary.sent === summary.total && summary.total > 0;
  return (
    <Card className={fullySent ? "border-emerald-500/30 bg-emerald-500/5" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vague {summary.wave}</p>
            <p className="text-sm font-medium mt-0.5">{new Date(summary.date).toLocaleDateString("fr-FR")}</p>
          </div>
          {fullySent ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Envoyés</span>
            <span className="font-medium">{summary.sent} / {summary.total}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all ${fullySent ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {summary.errors > 0 && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {summary.errors} erreur{summary.errors > 1 ? "s" : ""}
          </p>
        )}
        <Button
          variant="outline" size="sm" className="w-full gap-1.5" disabled={summary.sent === 0} onClick={onExport}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </CardContent>
    </Card>
  );
}

function CampaignRowView({ row }: { row: CampaignRow }) {
  let badge;
  if (row.error) {
    badge = <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Erreur</Badge>;
  } else if (row.onboarding_completed) {
    badge = <Badge className="gap-1 bg-emerald-500 hover:bg-emerald-500/90"><CheckCircle2 className="h-3 w-3" /> Accès activé</Badge>;
  } else if (row.sent_at) {
    badge = <Badge variant="default" className="gap-1">Invitation envoyée</Badge>;
  } else {
    badge = <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
  }
  return (
    <TableRow>
      <TableCell className="font-medium">{row.full_name}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{row.email}</TableCell>
      <TableCell><Badge variant="outline">V{row.wave_number}</Badge></TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.sent_at ? new Date(row.sent_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—"}
      </TableCell>
      <TableCell>
        {badge}
        {row.error && <p className="text-xs text-destructive mt-1 line-clamp-1" title={row.error}>{row.error}</p>}
      </TableCell>
    </TableRow>
  );
}
