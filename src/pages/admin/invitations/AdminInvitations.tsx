import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Send, Search, FlaskConical, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useInvitationsList, useSendAccessEmail } from "@/hooks/useAdminInvitations";

type Filter = "all" | "not_sent" | "invited" | "activated";

export default function AdminInvitations() {
  const { profile } = useAuth();
  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;

  const { data: rows, isLoading } = useInvitationsList();
  const sendMutation = useSendAccessEmail();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [testMode, setTestMode] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (q && !r.full_name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) {
        return false;
      }
      const isInvited = !!r.last_access_sent_at;
      const isActivated = !!r.access_opened_at && r.access_sent_count > 0;
      if (filter === "not_sent") return !isInvited;
      if (filter === "invited") return isInvited && !r.access_opened_at;
      if (filter === "activated") return isActivated;
      return true;
    });
  }, [rows, search, filter]);

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function askConfirm(ids: string[]) {
    if (ids.length === 0) return;
    setPendingIds(ids);
    setConfirmOpen(true);
  }

  async function doSend() {
    setConfirmOpen(false);
    try {
      const result = await sendMutation.mutateAsync({ userIds: pendingIds, testMode });
      const okCount = result.sent.length;
      const failCount = result.failed.length;
      toast({
        title: `${okCount} envoi${okCount > 1 ? "s" : ""} OK${failCount > 0 ? ` • ${failCount} échec${failCount > 1 ? "s" : ""}` : ""}`,
        description:
          failCount > 0
            ? result.failed.map((f) => `${f.user_id}: ${f.error}`).join("\n")
            : testMode
              ? "Email(s) envoyé(s) à contact@hassankaid.com (mode test)"
              : "Email(s) envoyé(s) aux destinataires",
        variant: failCount > 0 ? "destructive" : "default",
      });
      setSelected(new Set());
    } catch (e: any) {
      toast({
        title: "Erreur d'envoi",
        description: e.message ?? String(e),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Invitations & Accès</h1>
        <p className="text-muted-foreground mt-1">
          Ouvre l'accès à la plateforme aux apporteurs et collaborateurs, ou renvoie un lien en cas de perte de mot de passe.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-4">
          <FlaskConical className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              Mode test
              <Badge variant={testMode ? "default" : "outline"}>
                {testMode ? "ACTIF" : "OFF"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {testMode
                ? "Tous les emails partent vers contact@hassankaid.com avec sujet [TEST → email_réel]"
                : "Les emails partent vers les vrais destinataires (à utiliser une fois le domaine Resend vérifié)"}
            </p>
          </div>
          <Switch checked={testMode} onCheckedChange={setTestMode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Utilisateurs
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom ou email…"
                  className="pl-8 w-[220px]"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "not_sent", "invited", "activated"] as Filter[]).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" && "Tous"}
                    {f === "not_sent" && "Non envoyés"}
                    {f === "invited" && "Invités"}
                    {f === "activated" && "Activés"}
                  </Button>
                ))}
              </div>
              <Button
                onClick={() => askConfirm(Array.from(selected))}
                disabled={selected.size === 0 || sendMutation.isPending}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer à la sélection ({selected.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernier envoi</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline-block" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur ne correspond aux filtres.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <InvitationRowView
                  key={r.id}
                  row={r}
                  checked={selected.has(r.id)}
                  onToggle={() => toggleOne(r.id)}
                  onSend={() => askConfirm([r.id])}
                  disabled={sendMutation.isPending}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'envoi</DialogTitle>
            <DialogDescription>
              Tu vas envoyer l'email d'accès à <strong>{pendingIds.length}</strong> utilisateur
              {pendingIds.length > 1 ? "s" : ""}.
              {testMode ? (
                <> Tous les envois iront vers <strong>contact@hassankaid.com</strong> (mode test).</>
              ) : (
                <> Les emails iront aux vrais destinataires.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button onClick={doSend}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvitationRowView({
  row,
  checked,
  onToggle,
  onSend,
  disabled,
}: {
  row: ReturnType<typeof useInvitationsList>["data"] extends Array<infer T> | undefined ? T : never;
  checked: boolean;
  onToggle: () => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const isInvited = !!row.last_access_sent_at;
  const isActivated = !!row.access_opened_at && row.access_sent_count > 0;
  let statusLabel = "Non envoyé";
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  if (isActivated) {
    statusLabel = "Accès ouvert";
    statusVariant = "default";
  } else if (isInvited) {
    statusLabel = "Invité";
    statusVariant = "secondary";
  }

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={checked} onCheckedChange={onToggle} />
      </TableCell>
      <TableCell className="font-medium">{row.full_name || "—"}</TableCell>
      <TableCell className="text-muted-foreground">{row.email}</TableCell>
      <TableCell>
        <Badge variant="outline">{row.role}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
        {row.access_sent_count > 0 && (
          <span className="text-xs text-muted-foreground ml-2">×{row.access_sent_count}</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.last_access_sent_at
          ? formatDistanceToNow(new Date(row.last_access_sent_at), {
              locale: fr,
              addSuffix: true,
            })
          : "—"}
      </TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={onSend} disabled={disabled}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {isInvited ? "Renvoyer" : "Envoyer"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
