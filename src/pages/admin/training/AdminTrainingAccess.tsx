import { useMemo, useState, Fragment } from "react";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  History,
  ChevronDown,
  Plus,
  Trash2,
  Ticket,
  GraduationCap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  collaborateur: "Collaborateur",
  apporteur: "Apporteur",
};

export default function AdminTrainingAccess() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [addDialogUserId, setAddDialogUserId] = useState<string | null>(null);

  const { data: rows, isLoading } = useAdminTrainingAccess(false);
  const { data: rowsFull } = useAdminTrainingAccess(true);
  const grantPass = useGrantPass();
  const revokePass = useRevokePass();

  if (profile && profile.role !== "ceo") {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const togglePass = async (
    userId: string,
    passType: PassType,
    isActive: boolean,
    existingId?: string
  ) => {
    try {
      if (isActive && existingId) {
        await revokePass.mutateAsync({ passId: existingId, userId });
        toast({ title: "Pass révoqué" });
      } else if (!isActive) {
        await grantPass.mutateAsync({ userId, passType });
        toast({ title: "Pass attribué" });
      }
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const historyUser = rowsFull?.find((u) => u.id === historyUserId) ?? null;
  const addDialogUser = rows?.find((u) => u.id === addDialogUserId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" />
          Accès & Passes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gère les Pass AL BARAKA / Liberty et les formations attribuées à la carte
          pour chaque utilisateur.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Utilisateurs</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
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
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-center">AL BARAKA</TableHead>
                  <TableHead className="text-center">Liberty</TableHead>
                  <TableHead>Formations à la carte</TableHead>
                  <TableHead className="text-right">Historique</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const alBaraka = u.passes.find(
                    (p) => p.pass_type === "al_baraka"
                  );
                  const liberty = u.passes.find(
                    (p) => p.pass_type === "liberty"
                  );
                  const isExpanded = !!expanded[u.id];
                  const count = u.manual_enrollments.length;
                  return (
                    <Fragment key={u.id}>
                      <TableRow>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{u.full_name || "—"}</span>
                            <span className="text-xs text-muted-foreground">
                              {u.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ROLE_LABELS[u.role] ?? u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={!!alBaraka}
                            onCheckedChange={() =>
                              togglePass(u.id, "al_baraka", !!alBaraka, alBaraka?.id)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={!!liberty}
                            onCheckedChange={() =>
                              togglePass(u.id, "liberty", !!liberty, liberty?.id)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggleExpand(u.id)}
                            className="inline-flex items-center gap-2 text-sm hover:text-primary transition-colors"
                          >
                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                            <span
                              className={cn(
                                count === 0 ? "text-muted-foreground" : "font-medium"
                              )}
                            >
                              {count === 0
                                ? "Aucune"
                                : count === 1
                                  ? "1 formation"
                                  : `${count} formations`}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryUserId(u.id)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
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
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-6"
                    >
                      Aucun utilisateur.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Historique */}
      <Dialog
        open={!!historyUserId}
        onOpenChange={(o) => !o && setHistoryUserId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Historique — {historyUser?.full_name || "—"}
            </DialogTitle>
            <DialogDescription>
              Pass et formations à la carte, actifs + révoqués.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                Pass
              </h4>
              {(historyUser?.passes ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aucun pass attribué.
                </p>
              ) : (
                (historyUser?.passes ?? [])
                  .slice()
                  .sort((a, b) => (a.granted_at < b.granted_at ? 1 : -1))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between p-2 rounded border text-sm"
                    >
                      <div>
                        <div className="font-medium capitalize">
                          {p.pass_type.replace("_", " ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Attribué le{" "}
                          {format(new Date(p.granted_at), "d MMM yyyy", {
                            locale: fr,
                          })}
                          {p.revoked_at && (
                            <>
                              {" · Révoqué le "}
                              {format(new Date(p.revoked_at), "d MMM yyyy", {
                                locale: fr,
                              })}
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={p.revoked_at ? "outline" : "default"}>
                        {p.revoked_at ? "Révoqué" : "Actif"}
                      </Badge>
                    </div>
                  ))
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                Formations à la carte
              </h4>
              {(historyUser?.manual_enrollments ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aucune formation attribuée à la carte.
                </p>
              ) : (
                (historyUser?.manual_enrollments ?? [])
                  .slice()
                  .sort((a, b) => (a.granted_at < b.granted_at ? 1 : -1))
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex justify-between p-2 rounded border text-sm"
                    >
                      <div>
                        <div className="font-medium">{e.formation_title}</div>
                        <div className="text-xs text-muted-foreground">
                          Attribuée le{" "}
                          {format(new Date(e.granted_at), "d MMM yyyy", {
                            locale: fr,
                          })}
                          {e.revoked_at && (
                            <>
                              {" · Supprimée le "}
                              {format(new Date(e.revoked_at), "d MMM yyyy", {
                                locale: fr,
                              })}
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={e.revoked_at ? "outline" : "default"}>
                        {e.revoked_at ? "Révoquée" : "Active"}
                      </Badge>
                    </div>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajout formation à la carte */}
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
  user,
  onAddClick,
}: {
  user: UserAccessRow;
  onAddClick: () => void;
}) {
  const revoke = useRevokeEnrollment();

  const handleRevoke = async (e: ManualEnrollment) => {
    try {
      await revoke.mutateAsync({ enrollment_id: e.id, user_id: user.id });
      toast({ title: "Formation retirée" });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message,
        variant: "destructive",
      });
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
                <span className="text-sm font-medium truncate">
                  {e.formation_title}
                </span>
                <span className="text-xs text-muted-foreground">
                  · Ajoutée le{" "}
                  {format(new Date(e.granted_at), "d MMM yyyy", { locale: fr })}
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
        <Button
          variant="outline"
          size="sm"
          onClick={onAddClick}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Ajouter une formation à la carte
        </Button>
      </div>
    </div>
  );
}

function AddFormationDialog({
  user,
  onClose,
}: {
  user: UserAccessRow;
  onClose: () => void;
}) {
  const currentIds = user.manual_enrollments.map((e) => e.formation_id);
  const { data: available = [], isLoading } = useAvailableFormationsForUser(
    user.id,
    currentIds
  );
  const grant = useGrantEnrollment();
  const [selectedId, setSelectedId] = useState<string>("");

  const handleSubmit = async () => {
    if (!selectedId) return;
    try {
      await grant.mutateAsync({
        user_id: user.id,
        formation_id: selectedId,
      });
      toast({ title: "Formation ajoutée" });
      onClose();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une formation à la carte</DialogTitle>
          <DialogDescription>
            Pour <strong>{user.full_name || user.email}</strong>. Attribution
            manuelle, indépendante des pass.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Formation</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isLoading
                    ? "Chargement..."
                    : available.length === 0
                      ? "Aucune formation disponible"
                      : "Sélectionne une formation"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(available as any[]).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.titre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedId || grant.isPending}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {grant.isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
