import { useMemo, useState, Fragment } from "react";
import { Navigate, Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search, History, ChevronDown, Plus, Trash2, Ticket,
  GraduationCap, Send, Mail, Pencil, Rocket, FlaskConical,
  BarChart3, Loader2, Users, CheckCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  useAdminTrainingAccess,
  type UserAccessRow,
  type ManualEnrollment,
} from "@/hooks/useAdminTrainingAccess";
import { useGrantPass, useRevokePass } from "@/hooks/useAdminPasses";
import type { PassType } from "@/hooks/useUserPass";
import {
  useAvailableFormationsForUser,
  useGrantEnrollment,
  useRevokeEnrollment,
} from "@/hooks/useStudentTracking";
import { useToggleEarlyAccess } from "@/hooks/useAccessAdmin";
import { SendInvitationDialog } from "@/components/admin/access/SendInvitationDialog";
import { EditUserEmailDialog } from "@/components/admin/access/EditUserEmailDialog";
import { AccessHistoryDialog } from "@/components/admin/access/AccessHistoryDialog";
import { NewStudentDialog } from "@/components/admin/access/NewStudentDialog";

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  collaborateur: "Collaborateur",
  apporteur: "Apporteur",
};

type StatusFilter = "all" | "not_sent" | "invited" | "activated";
type RoleFilter = "all" | "apporteur" | "collaborateur" | "ceo";

function getInvitationStatus(u: UserAccessRow): { label: string; className: string } {
  if (u.onboarding_completed) {
    return {
      label: "Accès ouvert",
      className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20",
    };
  }
  if (u.access_opened_at) {
    return {
      label: "Invitation envoyée",
      className: "bg-primary/15 text-primary border-primary/40 hover:bg-primary/20",
    };
  }
  return {
    label: "Non envoyé",
    className: "bg-red-500/10 text-red-500 border-red-500/40 hover:bg-red-500/15",
  };
}

export default function AdminTrainingAccess() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [earlyFilter, setEarlyFilter] = useState<"all" | "on" | "off">("all");
  const [testMode, setTestMode] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [editEmailUser, setEditEmailUser] = useState<UserAccessRow | null>(null);
  const [sendUsers, setSendUsers] = useState<UserAccessRow[] | null>(null);
  const [addDialogUserId, setAddDialogUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: rows, isLoading } = useAdminTrainingAccess(false);
  const { data: rowsFull } = useAdminTrainingAccess(true);
  const grantPass = useGrantPass();
  const revokePass = useRevokePass();
  const toggleEarly = useToggleEarlyAccess();

  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((u) => {
      if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (earlyFilter === "on" && !u.early_access) return false;
      if (earlyFilter === "off" && u.early_access) return false;
      if (statusFilter !== "all") {
        const isSent = !!u.access_opened_at;
        const isActivated = isSent && u.onboarding_completed === true;
        if (statusFilter === "not_sent" && isSent) return false;
        if (statusFilter === "invited" && (!isSent || isActivated)) return false;
        if (statusFilter === "activated" && !isActivated) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, roleFilter, earlyFilter]);

  const togglePass = async (userId: string, passType: PassType, isActive: boolean, existingId?: string) => {
    try {
      if (isActive && existingId) {
        await revokePass.mutateAsync({ passId: existingId, userId });
        toast({ title: "Pass révoqué" });
      } else if (!isActive) {
        await grantPass.mutateAsync({ userId, passType });
        toast({ title: "Pass attribué" });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    }
  };

  const handleToggleEarly = async (u: UserAccessRow) => {
    try {
      await toggleEarly.mutateAsync({
        userId: u.id,
        enable: !u.early_access,
        performedBy: profile!.id,
      });
      toast({ title: u.early_access ? "Early access désactivé" : "Early access activé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }
  function toggleSelectOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  const historyUser = rowsFull?.find((u) => u.id === historyUserId) ?? null;
  const addDialogUser = rows?.find((u) => u.id === addDialogUserId) ?? null;
  const selectedRows = useMemo(
    () => filtered.filter((u) => selected.has(u.id)),
    [filtered, selected],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            Accès & Pass
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hub unique de gestion des accès utilisateur : passes, formations, invitations, early access, email et historique.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <NewStudentDialog />
          <Button asChild variant="outline" className="gap-2">
            <Link to="/admin/invitations/campaign">
              <BarChart3 className="h-4 w-4" />
              Suivi des vagues de campagne
            </Link>
          </Button>
        </div>
      </div>

      {/* Toggle mode test */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-center gap-4">
          <FlaskConical className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              Mode test
              <Badge variant={testMode ? "default" : "outline"} className="text-[10px]">
                {testMode ? "ACTIF" : "OFF"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {testMode
                ? "Les envois partent vers contact@hassankaid.com avec sujet [TEST → email_réel]"
                : "Envoi vers les vrais destinataires"}
            </p>
          </div>
          <Switch checked={testMode} onCheckedChange={setTestMode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" /> Utilisateurs
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom ou email…"
                  className="pl-8 w-[220px]"
                />
              </div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous rôles</SelectItem>
                  <SelectItem value="apporteur">Apporteurs</SelectItem>
                  <SelectItem value="collaborateur">Collaborateurs</SelectItem>
                  <SelectItem value="ceo">CEO</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="not_sent">Non envoyés</SelectItem>
                  <SelectItem value="invited">Invités</SelectItem>
                  <SelectItem value="activated">Activés</SelectItem>
                </SelectContent>
              </Select>
              <Select value={earlyFilter} onValueChange={(v) => setEarlyFilter(v as any)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Early: tous</SelectItem>
                  <SelectItem value="on">Early: actif</SelectItem>
                  <SelectItem value="off">Early: inactif</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setSendUsers(selectedRows)}
                disabled={selected.size === 0}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Envoyer à la sélection ({selected.size})
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-center">Early</TableHead>
                  <TableHead className="text-center">AL BARAKA</TableHead>
                  <TableHead className="text-center">Liberty</TableHead>
                  <TableHead>Formations à la carte</TableHead>
                  <TableHead>Statut invitation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const alBaraka = u.passes.find((p) => p.pass_type === "al_baraka");
                  const liberty = u.passes.find((p) => p.pass_type === "liberty");
                  const isExpanded = !!expanded[u.id];
                  const count = u.manual_enrollments.length;
                  const status = getInvitationStatus(u);
                  return (
                    <Fragment key={u.id}>
                      <TableRow className={selected.has(u.id) ? "bg-primary/5" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(u.id)}
                            onCheckedChange={() => toggleSelectOne(u.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{u.full_name || "—"}</span>
                              <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                              onClick={() => setEditEmailUser(u)}
                              title="Modifier l'email"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={u.early_access}
                            onCheckedChange={() => handleToggleEarly(u)}
                            disabled={toggleEarly.isPending}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={!!alBaraka}
                            onCheckedChange={() => togglePass(u.id, "al_baraka", !!alBaraka, alBaraka?.id)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={!!liberty}
                            onCheckedChange={() => togglePass(u.id, "liberty", !!liberty, liberty?.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggleExpand(u.id)}
                            className="inline-flex items-center gap-2 text-sm hover:text-primary transition-colors"
                          >
                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={cn(count === 0 ? "text-muted-foreground" : "font-medium")}>
                              {count === 0 ? "Aucune" : count === 1 ? "1 formation" : `${count} formations`}
                            </span>
                            <ChevronDown
                              className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                            />
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <Badge variant="outline" className={status.className}>{status.label}</Badge>
                            {u.last_access_sent_at && (
                              <p className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(u.last_access_sent_at), { locale: fr, addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-8"
                              onClick={() => setSendUsers([u])}
                              title={u.access_opened_at ? "Renvoyer l'invitation" : "Envoyer l'invitation"}
                            >
                              {u.access_opened_at ? <CheckCheck className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                              {u.access_opened_at ? "Renvoyer" : "Envoyer"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setHistoryUserId(u.id)}
                              title="Historique"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-0">
                            <ManualEnrollmentsPanel
                              user={u}
                              onAddClick={() => setAddDialogUserId(u.id)}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                      Aucun utilisateur.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {historyUser && (
        <AccessHistoryDialog
          userId={historyUser.id}
          userName={historyUser.full_name || historyUser.email}
          onClose={() => setHistoryUserId(null)}
        />
      )}

      {editEmailUser && (
        <EditUserEmailDialog
          userId={editEmailUser.id}
          userName={editEmailUser.full_name || editEmailUser.email}
          currentEmail={editEmailUser.email}
          onClose={() => setEditEmailUser(null)}
        />
      )}

      {sendUsers && sendUsers.length > 0 && (
        <SendInvitationDialog
          users={sendUsers}
          defaultTestMode={testMode}
          onClose={() => setSendUsers(null)}
        />
      )}

      {addDialogUser && (
        <AddFormationDialog
          user={addDialogUser}
          onClose={() => setAddDialogUserId(null)}
        />
      )}
    </div>
  );
}

function ManualEnrollmentsPanel({
  user, onAddClick,
}: { user: UserAccessRow; onAddClick: () => void }) {
  const revoke = useRevokeEnrollment();

  const handleRevoke = async (e: ManualEnrollment) => {
    try {
      await revoke.mutateAsync({ enrollment_id: e.id, user_id: user.id });
      toast({ title: "Formation retirée" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="px-6 py-4 space-y-3">
      {user.manual_enrollments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Aucune formation à la carte pour cet utilisateur.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {user.manual_enrollments.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 py-1.5 px-3 rounded-md bg-background border"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate">{e.formation_title}</span>
                <span className="text-xs text-muted-foreground">
                  · Ajoutée le {format(new Date(e.granted_at), "d MMM yyyy", { locale: fr })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(e)}
                disabled={revoke.isPending}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button variant="outline" size="sm" onClick={onAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une formation à la carte
        </Button>
      </div>
    </div>
  );
}

function AddFormationDialog({
  user, onClose,
}: { user: UserAccessRow; onClose: () => void }) {
  const currentIds = user.manual_enrollments.map((e) => e.formation_id);
  const { data: available = [], isLoading } = useAvailableFormationsForUser(user.id, currentIds);
  const grant = useGrantEnrollment();
  const [selectedId, setSelectedId] = useState<string>("");

  const handleSubmit = async () => {
    if (!selectedId) return;
    try {
      await grant.mutateAsync({ user_id: user.id, formation_id: selectedId });
      toast({ title: "Formation ajoutée" });
      onClose();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une formation à la carte</DialogTitle>
          <DialogDescription>
            Pour <strong>{user.full_name || user.email}</strong>. Attribution manuelle, indépendante des pass.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Formation</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isLoading ? "Chargement..." : available.length === 0 ? "Aucune formation disponible" : "Sélectionne une formation"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(available as any[]).map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.titre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!selectedId || grant.isPending} className="gap-2">
            {grant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {grant.isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
