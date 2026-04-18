import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle, RotateCw, CheckCircle2, XCircle, Webhook, History, FileSearch,
  Loader2, ChevronDown, ChevronRight, Search, Calendar, ImportIcon as ImportIcn, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

interface WebhookFailure {
  id: string;
  source: string;
  received_at: string;
  payload: any;
  error_message: string | null;
  status_code: number | null;
  replayed_at: string | null;
  replay_status: "success" | "failed" | null;
  replay_error: string | null;
  resolved_at: string | null;
  created_call_id: string | null;
}

interface AuditMissingEvent {
  event_uri: string;
  invitee_email: string;
  invitee_name: string;
  scheduled_at: string;
  host_email: string;
  event_name: string;
}

interface AuditResult {
  stats: { total_calendly_events: number; total_invitees: number; in_db: number; missing: number };
  missing: AuditMissingEvent[];
  import_results?: Array<{ event_uri: string; invitee_email: string; ok: boolean; status?: number; response?: any; error?: string }>;
}

export default function AdminCalendlyWebhooks() {
  const { profile } = useAuth();
  if (profile && profile.role !== "ceo") return <Navigate to="/dashboard" replace />;

  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [payloadDialog, setPayloadDialog] = useState<WebhookFailure | null>(null);
  const [auditDialog, setAuditDialog] = useState(false);
  const [auditDays, setAuditDays] = useState("30");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: failures, isLoading } = useQuery({
    queryKey: ["webhook-failures", showResolved],
    queryFn: async (): Promise<WebhookFailure[]> => {
      let q = (supabase as any).from("webhook_failures").select("*").eq("source", "calendly").order("received_at", { ascending: false });
      if (!showResolved) q = q.is("resolved_at", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WebhookFailure[];
    },
  });

  const replay = useMutation({
    mutationFn: async (failureId: string) => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Session expirée");
      const res = await fetch(`${SUPABASE_URL}/functions/v1/replay-calendly-webhook`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ failure_id: failureId }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.response?.error || body?.error || "Replay échoué");
      return body;
    },
    onSuccess: () => {
      toast({ title: "Webhook rejoué avec succès", description: "Le call a été créé." });
      qc.invalidateQueries({ queryKey: ["webhook-failures"] });
    },
    onError: (e: any) => {
      toast({ title: "Replay échoué", description: e?.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["webhook-failures"] });
    },
  });

  const runAudit = useMutation({
    mutationFn: async ({ days, importMissing }: { days: number; importMissing: boolean }): Promise<AuditResult> => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Session expirée");
      const res = await fetch(`${SUPABASE_URL}/functions/v1/audit-calendly-history`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ days, import_missing: importMissing }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || "Audit échoué");
      return body as AuditResult;
    },
    onSuccess: (data) => {
      setAuditResult(data);
      qc.invalidateQueries({ queryKey: ["webhook-failures"] });
    },
    onError: (e: any) => {
      toast({ title: "Audit échoué", description: e?.message, variant: "destructive" });
    },
  });

  const filtered = (failures ?? []).filter((f) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      f.error_message?.toLowerCase().includes(s) ||
      JSON.stringify(f.payload).toLowerCase().includes(s)
    );
  });

  function previewContact(p: any): string {
    const inv = p?.payload;
    if (!inv) return "—";
    const name = [inv.first_name, inv.last_name].filter(Boolean).join(" ") || "—";
    const email = inv.email ?? "—";
    return `${name} · ${email}`;
  }

  function previewSchedule(p: any): string {
    const at = p?.payload?.scheduled_event?.start_time;
    if (!at) return "—";
    return format(new Date(at), "d MMM yyyy 'à' HH:mm", { locale: fr });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" />
            Webhooks Calendly
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi et rejeu des webhooks en échec, audit historique pour détecter les calls manquants.
          </p>
        </div>
        <Button onClick={() => setAuditDialog(true)} variant="outline" className="gap-2">
          <FileSearch className="h-4 w-4" />
          Audit historique Calendly
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Webhooks en échec
              {failures && (
                <Badge variant="outline" className="ml-2">
                  {filtered.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans erreur ou payload…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[280px]"
                />
              </div>
              <Button
                variant={showResolved ? "default" : "outline"}
                size="sm"
                onClick={() => setShowResolved((v) => !v)}
                className="gap-1.5"
              >
                <History className="h-3.5 w-3.5" />
                {showResolved ? "Masquer résolus" : "Inclure résolus"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground italic">
              {showResolved ? "Aucun échec enregistré." : "Aucun échec en attente. ✨"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçu</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>RDV prévu</TableHead>
                  <TableHead>Erreur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(f.received_at), "d MMM yyyy · HH:mm", { locale: fr })}
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(f.received_at), { locale: fr, addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{previewContact(f.payload)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{previewSchedule(f.payload)}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-[300px] truncate" title={f.error_message ?? ""}>
                      {f.error_message ?? "—"}
                    </TableCell>
                    <TableCell>
                      {f.resolved_at ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Résolu
                        </Badge>
                      ) : f.replay_status === "failed" ? (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" /> Replay KO
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8"
                          onClick={() => setPayloadDialog(f)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Payload
                        </Button>
                        {!f.resolved_at && (
                          <Button
                            size="sm"
                            className="gap-1.5 h-8"
                            onClick={() => replay.mutate(f.id)}
                            disabled={replay.isPending}
                          >
                            {replay.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                            Rejouer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Payload */}
      <Dialog open={!!payloadDialog} onOpenChange={(o) => !o && setPayloadDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payload du webhook</DialogTitle>
            <DialogDescription>
              {payloadDialog && format(new Date(payloadDialog.received_at), "d MMM yyyy 'à' HH:mm:ss", { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          {payloadDialog && (
            <div className="space-y-3">
              {payloadDialog.error_message && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive uppercase mb-1">Erreur</p>
                  <p className="text-sm text-destructive font-mono break-all">{payloadDialog.error_message}</p>
                </div>
              )}
              <div className="rounded-md border bg-muted/40 p-3 max-h-[60vh] overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(payloadDialog.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Audit Calendly */}
      <Dialog open={auditDialog} onOpenChange={(o) => { if (!o) { setAuditDialog(false); setAuditResult(null); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Audit historique Calendly
            </DialogTitle>
            <DialogDescription>
              Compare les RDV de l'API Calendly avec ta base. Détecte les calls qui ne sont pas remontés (webhook foiré, secret manquant, etc.).
            </DialogDescription>
          </DialogHeader>

          {!auditResult ? (
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="space-y-1">
                  <Label>Période à scanner</Label>
                  <Select value={auditDays} onValueChange={setAuditDays}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 derniers jours</SelectItem>
                      <SelectItem value="30">30 derniers jours</SelectItem>
                      <SelectItem value="90">3 derniers mois</SelectItem>
                      <SelectItem value="180">6 derniers mois</SelectItem>
                      <SelectItem value="365">1 an</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => runAudit.mutate({ days: parseInt(auditDays), importMissing: false })}
                  disabled={runAudit.isPending}
                  className="gap-2"
                >
                  {runAudit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Lancer l'audit
                </Button>
              </div>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                <strong>Pré-requis</strong> : la variable d'environnement <code>CALENDLY_API_TOKEN</code> doit être configurée dans les secrets Supabase. Token = Personal Access Token Calendly (Settings → Integrations → API & Webhooks).
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <StatCard label="Events Calendly" value={auditResult.stats.total_calendly_events} />
                <StatCard label="Invités" value={auditResult.stats.total_invitees} />
                <StatCard label="Présents en base" value={auditResult.stats.in_db} variant="success" />
                <StatCard label="Manquants" value={auditResult.stats.missing} variant={auditResult.stats.missing > 0 ? "warning" : "success"} />
              </div>
              {auditResult.missing.length > 0 ? (
                <>
                  <div className="rounded-md border max-h-[40vh] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Invité</TableHead>
                          <TableHead>Hôte</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditResult.missing.map((m) => (
                          <TableRow key={m.event_uri}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(m.scheduled_at), "d MMM HH:mm", { locale: fr })}
                            </TableCell>
                            <TableCell className="text-xs">{m.invitee_name} · {m.invitee_email}</TableCell>
                            <TableCell className="text-xs">{m.host_email}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{m.event_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Cliquer "Importer tout" simule un payload pour chaque manquant et appelle webhook-calendly.
                    </p>
                    <Button
                      onClick={async () => {
                        setImporting(true);
                        try {
                          const res = await runAudit.mutateAsync({ days: parseInt(auditDays), importMissing: true });
                          const okCount = (res.import_results || []).filter((r) => r.ok).length;
                          const failCount = (res.import_results || []).filter((r) => !r.ok).length;
                          toast({
                            title: `${okCount} call${okCount > 1 ? "s" : ""} importé${okCount > 1 ? "s" : ""}`,
                            description: failCount > 0 ? `${failCount} échec(s) — voir webhook_failures` : undefined,
                            variant: failCount > 0 ? "destructive" : "default",
                          });
                        } finally {
                          setImporting(false);
                        }
                      }}
                      disabled={importing}
                      className="gap-2"
                    >
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImportIcn className="h-4 w-4" />}
                      Importer tout ({auditResult.missing.length})
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">Aucun manquant — tout est synchronisé.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAuditDialog(false); setAuditResult(null); }}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, variant = "neutral" }: { label: string; value: number; variant?: "neutral" | "success" | "warning" }) {
  const cls = variant === "success"
    ? "border-emerald-500/30 bg-emerald-500/5"
    : variant === "warning"
      ? "border-amber-500/40 bg-amber-500/10"
      : "border-border";
  return (
    <div className={`rounded-md border p-3 ${cls}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
