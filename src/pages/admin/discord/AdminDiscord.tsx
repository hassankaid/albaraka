import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useAdminDiscordOverview,
  useAdminDiscordGrants,
  useDiscordAdminAction,
  type AdminDiscordRow,
} from "@/hooks/useAdminDiscord";
import { getDiscordAvatarUrl } from "@/hooks/useDiscordLink";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Page admin Discord (D5) — réservée CEO.
 *
 * 2 onglets :
 *   - "Liaisons" : 1 row par (user lié × formation gated), avec status grant
 *     et boutons d'action (grant/revoke/resync)
 *   - "Audit log" : 100 derniers grants/revokes, tous statuts
 */

const STATUS_TONE: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  success: { label: "Accès OK", className: "bg-emerald-500/15 text-emerald-500 border-0", icon: CheckCircle2 },
  failed: { label: "Échec", className: "bg-destructive/15 text-destructive border-0", icon: XCircle },
  pending: { label: "En attente", className: "bg-amber-500/15 text-amber-500 border-0", icon: AlertCircle },
  none: { label: "Pas d'accès", className: "bg-muted text-muted-foreground border-0", icon: AlertCircle },
};

export default function AdminDiscord() {
  const { profile } = useAuth();
  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  const overviewQuery = useAdminDiscordOverview();
  const grantsQuery = useAdminDiscordGrants(100);
  const action = useDiscordAdminAction();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formationFilter, setFormationFilter] = useState<string>("all");

  const rows = overviewQuery.data ?? [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.grant_status !== statusFilter) return false;
      if (formationFilter !== "all" && r.formation_slug !== formationFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = [
          r.full_name,
          r.email,
          r.discord_username,
          r.discord_global_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, formationFilter]);

  // Stats globales
  const stats = useMemo(() => {
    const total = rows.length;
    const success = rows.filter((r) => r.grant_status === "success").length;
    const failed = rows.filter((r) => r.grant_status === "failed").length;
    const pending = rows.filter((r) => r.grant_status === "pending").length;
    const none_eligible = rows.filter(
      (r) => r.grant_status === "none" && r.progress_pct >= 100,
    ).length;
    return { total, success, failed, pending, none_eligible };
  }, [rows]);

  const handleAction = async (
    actionType: "grant" | "revoke" | "resync",
    row: AdminDiscordRow,
  ) => {
    const reasonInput =
      actionType === "resync"
        ? null
        : window.prompt(
            actionType === "grant"
              ? `Raison du grant manuel pour ${row.full_name ?? row.email} (${row.discord_role_label}) ?`
              : `Raison de la révocation pour ${row.full_name ?? row.email} (${row.discord_role_label}) ?`,
          );
    if (actionType !== "resync" && !reasonInput) return;

    try {
      const result = await action.mutateAsync({
        action: actionType,
        userId: row.user_id,
        formationId: row.formation_id,
        reason: reasonInput ?? undefined,
      });
      toast({
        title:
          actionType === "grant"
            ? "Rôle attribué"
            : actionType === "revoke"
            ? "Rôle retiré"
            : "Sync relancée",
        description:
          actionType === "resync"
            ? `${result.result?.stats?.granted ?? 0} grant(s) effectués`
            : `${row.discord_role_label} — ${row.full_name ?? row.email}`,
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: (e as Error)?.message ?? "Action échouée",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Administration Discord</h1>
        <p className="text-sm text-muted-foreground">
          Gérer les liaisons élève ↔ Discord, voir l'historique des grants, override manuel.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Couples user × formation" value={stats.total} tone="default" />
        <StatCard label="Accès OK" value={stats.success} tone="emerald" />
        <StatCard label="Échec" value={stats.failed} tone="red" />
        <StatCard label="En attente" value={stats.pending} tone="amber" />
        <StatCard
          label="Éligibles non-grantés"
          value={stats.none_eligible}
          tone="primary"
          hint="100% complétés sans rôle Discord — bons candidats à un grant manuel"
        />
      </div>

      <Tabs defaultValue="liaisons">
        <TabsList>
          <TabsTrigger value="liaisons">Liaisons & accès</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        {/* ─── Tab Liaisons ─── */}
        <TabsContent value="liaisons" className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Recherche par nom / email / handle Discord…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="success">Accès OK</SelectItem>
                <SelectItem value="failed">Échec</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="none">Pas d'accès</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formationFilter} onValueChange={setFormationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Formation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes formations</SelectItem>
                <SelectItem value="marketing-digital">Marketing Digital</SelectItem>
                <SelectItem value="setting">Setting</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => overviewQuery.refetch()}
              disabled={overviewQuery.isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${overviewQuery.isFetching ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {overviewQuery.isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Aucune liaison trouvée avec ces filtres.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Élève</th>
                        <th className="text-left p-3">Formation</th>
                        <th className="text-left p-3">Progress</th>
                        <th className="text-left p-3">Discord</th>
                        <th className="text-left p-3">Statut</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <AdminRow
                          key={`${row.user_id}-${row.formation_id}`}
                          row={row}
                          onAction={handleAction}
                          pending={action.isPending}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab Audit Log ─── */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit log (100 derniers)</CardTitle>
              <CardDescription>
                Toutes les opérations de grant/revoke, tous statuts confondus.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {grantsQuery.isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !grantsQuery.data || grantsQuery.data.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Aucun grant pour l'instant.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Élève</th>
                        <th className="text-left p-3">Formation</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Reason</th>
                        <th className="text-left p-3">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grantsQuery.data.map((g) => (
                        <tr key={g.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(g.granted_at), "d MMM HH:mm", { locale: fr })}
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{g.full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{g.email}</div>
                          </td>
                          <td className="p-3 text-xs">{g.formation_titre ?? "—"}</td>
                          <td className="p-3">
                            <StatusBadge status={g.revoked_at ? "revoked" : g.status} />
                          </td>
                          <td className="p-3 text-xs text-muted-foreground max-w-[300px] truncate">
                            {g.reason}
                            {g.error_message && (
                              <div className="text-destructive text-[10px] truncate">
                                {g.error_message}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                              {g.source}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "default" | "emerald" | "red" | "amber" | "primary";
  hint?: string;
}) {
  const toneClass = {
    default: "text-foreground",
    emerald: "text-emerald-500",
    red: "text-destructive",
    amber: "text-amber-500",
    primary: "text-primary",
  }[tone];
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
        {hint && (
          <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "revoked") {
    return (
      <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">
        Révoqué
      </Badge>
    );
  }
  const t = STATUS_TONE[status] ?? STATUS_TONE.none;
  const Icon = t.icon;
  return (
    <Badge className={`gap-1 text-[10px] ${t.className}`}>
      <Icon className="h-3 w-3" />
      {t.label}
    </Badge>
  );
}

function AdminRow({
  row,
  onAction,
  pending,
}: {
  row: AdminDiscordRow;
  onAction: (action: "grant" | "revoke" | "resync", row: AdminDiscordRow) => void;
  pending: boolean;
}) {
  const avatarUrl = row.discord_avatar
    ? getDiscordAvatarUrl(row.discord_user_id ?? "", row.discord_avatar)
    : null;

  const displayName = row.discord_global_name || row.discord_username || "—";

  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="p-3">
        <div className="text-sm font-medium">{row.full_name ?? "—"}</div>
        <div className="text-[11px] text-muted-foreground">{row.email}</div>
      </td>
      <td className="p-3 text-sm">{row.formation_titre}</td>
      <td className="p-3 text-sm">
        <span
          className={
            row.progress_pct >= 100
              ? "text-emerald-500 font-medium"
              : "text-muted-foreground"
          }
        >
          {Number(row.progress_pct).toFixed(0)}%
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-[10px] bg-[#5865F2] text-white">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-xs">{displayName}</div>
            {row.is_guild_member === false && (
              <div className="text-[10px] text-amber-500">Pas sur le serveur</div>
            )}
          </div>
        </div>
      </td>
      <td className="p-3">
        <StatusBadge status={row.grant_status} />
        {row.grant_error && (
          <div className="text-[10px] text-destructive mt-1 max-w-[200px] truncate">
            {row.grant_error}
          </div>
        )}
      </td>
      <td className="p-3">
        <div className="flex gap-1 justify-end">
          {row.grant_status === "success" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction("revoke", row)}
              disabled={pending}
              className="h-7 text-xs"
            >
              Révoquer
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onAction("grant", row)}
              disabled={pending}
              className="h-7 text-xs"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Grant"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction("resync", row)}
            disabled={pending}
            className="h-7 text-xs"
            title="Resync ce user"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
