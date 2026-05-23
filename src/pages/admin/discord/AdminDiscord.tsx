import { useMemo, useState, type ReactNode } from "react";
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
  useAdminDiscordUserRecap,
  type AdminDiscordRow,
  type AdminDiscordUserRecapRow,
} from "@/hooks/useAdminDiscord";
import { getDiscordAvatarUrl } from "@/hooks/useDiscordLink";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DISCORD_BRAND_COLOR = "#5865F2";

/** Logo Discord inline (SVG). Réutilisé dans toute la page. */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02C2.0 9.46 1.31 13.5 1.65 17.5c0 .02.01.04.03.05a19.95 19.95 0 0 0 5.99 3.03c.03.01.06 0 .08-.02.46-.63.87-1.29 1.22-1.99.02-.04 0-.08-.04-.09a13.06 13.06 0 0 1-1.86-.89c-.04-.02-.04-.08-.01-.11.12-.09.25-.19.37-.29.02-.02.05-.02.07-.01 3.9 1.78 8.13 1.78 11.99 0 .02-.01.05 0 .07.01.12.1.24.2.37.29.04.03.04.09-.01.11a12.06 12.06 0 0 1-1.86.89c-.04.01-.05.06-.04.09.36.7.77 1.36 1.22 1.99.03.02.06.03.09.02 1.96-.61 3.95-1.52 5.99-3.03.02-.01.03-.03.03-.05.36-4.62-.6-8.62-2.69-12.15-.01-.01-.02-.02-.04-.02zM8.52 15.09c-1.18 0-2.16-1.08-2.16-2.41 0-1.33.95-2.41 2.16-2.41 1.21 0 2.18 1.09 2.16 2.41 0 1.33-.96 2.41-2.16 2.41zm7.97 0c-1.18 0-2.16-1.08-2.16-2.41 0-1.33.95-2.41 2.16-2.41 1.21 0 2.18 1.09 2.16 2.41 0 1.33-.95 2.41-2.16 2.41z" />
    </svg>
  );
}

/** Petit rond violet Discord avec logo blanc dedans — pour les headers de colonne rôle. */
function DiscordBadge() {
  return (
    <div
      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: DISCORD_BRAND_COLOR }}
    >
      <DiscordIcon className="h-3 w-3 text-white" />
    </div>
  );
}

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

      <Tabs defaultValue="recap">
        <TabsList>
          <TabsTrigger value="recap">Récap par élève</TabsTrigger>
          <TabsTrigger value="liaisons">Détail & actions</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        {/* ─── Tab Récap par élève ─── */}
        <TabsContent value="recap" className="space-y-4">
          <UserRecapTab />
        </TabsContent>

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

/**
 * D5 v2 — Tab Récap par élève : 1 ligne par élève éligible avec
 * tous les booléens formation + Discord + rôles dans un même tableau.
 */
function UserRecapTab() {
  const recapQuery = useAdminDiscordUserRecap();
  const [search, setSearch] = useState("");
  const [passFilter, setPassFilter] = useState<string>("all");
  const [discordFilter, setDiscordFilter] = useState<string>("all"); // all / linked / not_linked
  // Pour chaque colonne formation/role : "all" / "yes" / "no"
  const [marketingDone, setMarketingDone] = useState("all");
  const [settingDone, setSettingDone] = useState("all");
  const [closingDone, setClosingDone] = useState("all");
  const [marketingRole, setMarketingRole] = useState("all");
  const [settingRole, setSettingRole] = useState("all");
  const [closingRole, setClosingRole] = useState("all");

  const rows = recapQuery.data ?? [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // Recherche
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
      // Pass type
      if (passFilter !== "all" && r.pass_type !== passFilter) return false;
      // Discord linked
      if (discordFilter === "linked" && !r.discord_linked) return false;
      if (discordFilter === "not_linked" && r.discord_linked) return false;
      // Formations
      if (marketingDone === "yes" && !r.marketing_completed) return false;
      if (marketingDone === "no" && r.marketing_completed) return false;
      if (settingDone === "yes" && !r.setting_completed) return false;
      if (settingDone === "no" && r.setting_completed) return false;
      if (closingDone === "yes" && !r.closing_completed) return false;
      if (closingDone === "no" && r.closing_completed) return false;
      // Rôles
      if (marketingRole === "yes" && !r.has_marketing_role) return false;
      if (marketingRole === "no" && r.has_marketing_role) return false;
      if (settingRole === "yes" && !r.has_setting_role) return false;
      if (settingRole === "no" && r.has_setting_role) return false;
      if (closingRole === "yes" && !r.has_closing_role) return false;
      if (closingRole === "no" && r.has_closing_role) return false;
      return true;
    });
  }, [
    rows, search, passFilter, discordFilter,
    marketingDone, settingDone, closingDone,
    marketingRole, settingRole, closingRole,
  ]);

  // Compteurs en haut
  const counts = useMemo(() => {
    const total = filtered.length;
    const linked = filtered.filter((r) => r.discord_linked).length;
    const m = filtered.filter((r) => r.marketing_completed).length;
    const s = filtered.filter((r) => r.setting_completed).length;
    const c = filtered.filter((r) => r.closing_completed).length;
    return { total, linked, m, s, c };
  }, [filtered]);

  const resetFilters = () => {
    setSearch("");
    setPassFilter("all");
    setDiscordFilter("all");
    setMarketingDone("all");
    setSettingDone("all");
    setClosingDone("all");
    setMarketingRole("all");
    setSettingRole("all");
    setClosingRole("all");
  };

  return (
    <>
      {/* Filtres principaux */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom / email / handle Discord…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={passFilter} onValueChange={setPassFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Pass" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous Pass</SelectItem>
            <SelectItem value="al_baraka">AL BARAKA</SelectItem>
            <SelectItem value="liberty">Liberty</SelectItem>
          </SelectContent>
        </Select>
        <Select value={discordFilter} onValueChange={setDiscordFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Discord" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous (Discord)</SelectItem>
            <SelectItem value="linked">Discord lié</SelectItem>
            <SelectItem value="not_linked">Discord non lié</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={resetFilters} className="text-xs">
          Reset filtres
        </Button>
        <Button
          variant="outline"
          onClick={() => recapQuery.refetch()}
          disabled={recapQuery.isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${recapQuery.isFetching ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Filtres colonnes — chaque formation groupée avec son rôle Discord */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs items-center">
        <ColumnFilter label="🎓 Mkt fini" value={marketingDone} onChange={setMarketingDone} />
        <ColumnFilter
          label={<><DiscordBadge /> Mkt</>}
          value={marketingRole}
          onChange={setMarketingRole}
        />
        <span className="border-l border-border h-6 mx-1" />
        <ColumnFilter label="🎓 Set fini" value={settingDone} onChange={setSettingDone} />
        <ColumnFilter
          label={<><DiscordBadge /> Set</>}
          value={settingRole}
          onChange={setSettingRole}
        />
        <span className="border-l border-border h-6 mx-1" />
        <ColumnFilter label="🎓 Cls fini" value={closingDone} onChange={setClosingDone} />
        <ColumnFilter
          label={<><DiscordBadge /> Cls</>}
          value={closingRole}
          onChange={setClosingRole}
        />
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="Élèves affichés" value={counts.total} tone="default" />
        <StatCard label="Avec Discord lié" value={counts.linked} tone="primary" />
        <StatCard label="Marketing fini" value={counts.m} tone="emerald" />
        <StatCard label="Setting fini" value={counts.s} tone="emerald" />
        <StatCard label="Closing fini" value={counts.c} tone="emerald" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {recapQuery.isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aucun élève avec ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Élève</th>
                    <th className="text-center p-3">Pass</th>
                    <th className="text-center p-3">Discord</th>
                    <th className="text-center p-3 border-l border-border" title="Formation Marketing terminée">🎓 Mkt</th>
                    <th className="text-center p-3" title="Rôle Discord Marketing attribué">
                      <div className="flex items-center justify-center gap-1.5">
                        <DiscordBadge /><span>Mkt</span>
                      </div>
                    </th>
                    <th className="text-center p-3 border-l border-border" title="Formation Setting terminée">🎓 Set</th>
                    <th className="text-center p-3" title="Rôle Discord Setting attribué">
                      <div className="flex items-center justify-center gap-1.5">
                        <DiscordBadge /><span>Set</span>
                      </div>
                    </th>
                    <th className="text-center p-3 border-l border-border" title="Formation Closing terminée">🎓 Cls</th>
                    <th className="text-center p-3" title="Rôle Discord Closing attribué">
                      <div className="flex items-center justify-center gap-1.5">
                        <DiscordBadge /><span>Cls</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <RecapRow key={row.user_id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ColumnFilter({
  label,
  value,
  onChange,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground flex items-center gap-1">{label}:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-[80px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="yes">Oui</SelectItem>
          <SelectItem value="no">Non</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function YesNoCell({ value, dimmed = false }: { value: boolean; dimmed?: boolean }) {
  if (value) {
    return (
      <div className="flex justify-center">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <XCircle className={`h-5 w-5 ${dimmed ? "text-muted-foreground/40" : "text-muted-foreground"}`} />
    </div>
  );
}

function RecapRow({ row }: { row: AdminDiscordUserRecapRow }) {
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
      <td className="p-3 text-center">
        <Badge
          className={
            row.pass_type === "liberty"
              ? "bg-purple-500/15 text-purple-500 border-0 text-[10px]"
              : "bg-amber-500/15 text-amber-500 border-0 text-[10px]"
          }
        >
          {row.pass_type === "liberty" ? "Liberty" : "AL BARAKA"}
        </Badge>
      </td>
      <td className="p-3 text-center">
        {row.discord_linked ? (
          <div className="flex flex-col items-center gap-1">
            <Avatar className="h-6 w-6">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-[9px] bg-[#5865F2] text-white">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-[10px] truncate max-w-[100px]" title={displayName}>
              {displayName}
            </div>
            {row.is_guild_member === false && (
              <div className="text-[9px] text-amber-500">Pas sur le serveur</div>
            )}
          </div>
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
        )}
      </td>
      {/* Marketing : formation puis rôle Discord, côte à côte */}
      <td className="p-3 border-l border-border">
        <YesNoCell value={row.marketing_completed} />
      </td>
      <td className="p-3">
        <YesNoCell value={row.has_marketing_role} dimmed={!row.marketing_completed} />
      </td>
      {/* Setting */}
      <td className="p-3 border-l border-border">
        <YesNoCell value={row.setting_completed} />
      </td>
      <td className="p-3">
        <YesNoCell value={row.has_setting_role} dimmed={!row.setting_completed} />
      </td>
      {/* Closing */}
      <td className="p-3 border-l border-border">
        <YesNoCell value={row.closing_completed} />
      </td>
      <td className="p-3">
        <YesNoCell value={row.has_closing_role} dimmed={!row.closing_completed} />
      </td>
    </tr>
  );
}
