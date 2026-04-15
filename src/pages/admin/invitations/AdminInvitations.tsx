import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
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
import { Mail, Send, Search, FlaskConical, Loader2, RotateCcw, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useInvitationsList, useSendAccessEmail, useRevokeInvitation } from "@/hooks/useAdminInvitations";
import { supabase } from "@/integrations/supabase/client";

type Filter = "all" | "not_sent" | "invited" | "activated";

export default function AdminInvitations() {
  const { profile } = useAuth();
  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;

  const { data: rows, isLoading } = useInvitationsList();
  const sendMutation = useSendAccessEmail();
  const revokeMutation = useRevokeInvitation();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [testMode, setTestMode] = useState(false);
  const [earlyAccess, setEarlyAccess] = useState(true);
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
      const isSent = !!r.access_opened_at;
      const isActivated = !!r.access_opened_at && r.onboarding_completed === true;
      if (filter === "not_sent") return !isSent;
      if (filter === "invited") return isSent && !isActivated;
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

  async function applyEarlyAccess(userIds: string[]) {
    // 1. Marque les profils early_access = true
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ early_access: true })
      .in("id", userIds);
    if (updErr) throw updErr;

    // 2. Grant pass al_baraka (skip ceux qui l'ont déjà et non révoqué)
    const { data: existing } = await supabase
      .from("user_passes")
      .select("user_id, pass_type, revoked_at")
      .in("user_id", userIds)
      .eq("pass_type", "al_baraka")
      .is("revoked_at", null);
    const alreadyGranted = new Set((existing ?? []).map((r: any) => r.user_id));
    const toGrant = userIds
      .filter((id) => !alreadyGranted.has(id))
      .map((user_id) => ({ user_id, pass_type: "al_baraka" as const, notes: "early_access invitation" }));
    if (toGrant.length > 0) {
      const { error: passErr } = await supabase.from("user_passes").insert(toGrant);
      if (passErr) throw passErr;
    }
  }

  async function doSend() {
    setConfirmOpen(false);
    try {
      if (earlyAccess) {
        await applyEarlyAccess(pendingIds);
      }
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Invitations & Accès</h1>
          <p className="text-muted-foreground mt-1">
            Ouvre l'accès à la plateforme aux apporteurs et collaborateurs, ou renvoie un lien en cas de perte de mot de passe.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin/invitations/campaign">
            <BarChart3 className="h-4 w-4" />
            Suivi de campagne early access
          </Link>
        </Button>
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

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-center gap-4">
          <Rocket className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              Accès anticipé
              <Badge variant={earlyAccess ? "default" : "outline"}>
                {earlyAccess ? "ACTIF" : "OFF"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {earlyAccess
                ? "Les utilisateurs invités obtiennent le pass Al Baraka et voient le message \"Formations bientôt\" tant que le toggle global est activé côté admin Training."
                : "Invitation standard : les formations doivent être complétées pour débloquer les outils Working."}
            </p>
          </div>
          <Switch checked={earlyAccess} onCheckedChange={setEarlyAccess} />
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
              {earlyAccess && (
                <div className="mt-3 text-sm rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-foreground">
                  <strong>🚀 Accès anticipé :</strong> pass Al Baraka octroyé + <code className="text-xs">early_access</code> marqué sur le profil.
                </div>
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
  onRevoke,
  disabled,
  testMode,
}: {
  row: ReturnType<typeof useInvitationsList>["data"] extends Array<infer T> | undefined ? T : never;
  checked: boolean;
  onToggle: () => void;
  onSend: () => void;
  onRevoke: () => void;
  disabled: boolean;
  testMode: boolean;
}) {
  const isSent = !!row.access_opened_at;
  const isActivated = !!row.access_opened_at && row.onboarding_completed === true;
  const hasAnyTrace = isSent || !!row.last_access_sent_at || row.access_sent_count > 0;
  let statusLabel = "Non envoyé";
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  if (isActivated) {
    statusLabel = "Accès ouvert";
    statusVariant = "default";
  } else if (isSent) {
    statusLabel = "Invitation envoyée";
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
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onSend} disabled={disabled}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isSent ? "Renvoyer" : "Envoyer"}
          </Button>
          {testMode && hasAnyTrace && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRevoke}
              disabled={disabled}
              title="Réinitialiser l'invitation (mode test uniquement)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
