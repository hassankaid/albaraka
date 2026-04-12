import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUsersWithPasses, useGrantPass, useRevokePass } from "@/hooks/useAdminPasses";
import type { PassType } from "@/hooks/useUserPass";
import { toast } from "@/hooks/use-toast";

export default function AdminCoachingPasses() {
  const [search, setSearch] = useState("");
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useUsersWithPasses(false);
  const { data: usersFull } = useUsersWithPasses(true);
  const grant = useGrantPass();
  const revoke = useRevokePass();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const togglePass = async (userId: string, passType: PassType, isActive: boolean, existingId?: string) => {
    try {
      if (isActive && existingId) {
        await revoke.mutateAsync({ passId: existingId, userId });
        toast({ title: "Pass révoqué" });
      } else if (!isActive) {
        await grant.mutateAsync({ userId, passType });
        toast({ title: "Pass attribué" });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    }
  };

  const historyUser = usersFull?.find((u) => u.id === historyUserId) ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pass Al Baraka & Liberty</CardTitle>
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
                <TableHead className="text-center">Al Baraka</TableHead>
                <TableHead className="text-center">Liberty</TableHead>
                <TableHead className="text-right">Historique</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const alBaraka = u.passes.find((p) => p.pass_type === "al_baraka");
                const liberty = u.passes.find((p) => p.pass_type === "liberty");
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{u.full_name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{u.role}</Badge>
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryUserId(u.id)}>
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    Aucun utilisateur.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!historyUserId} onOpenChange={(o) => !o && setHistoryUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historique des pass — {historyUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {(historyUser?.passes ?? []).length === 0 && (
              <p className="text-muted-foreground">Aucun pass attribué.</p>
            )}
            {(historyUser?.passes ?? [])
              .sort((a, b) => (a.granted_at < b.granted_at ? 1 : -1))
              .map((p) => (
                <div key={p.id} className="flex justify-between p-2 rounded border">
                  <div>
                    <div className="font-medium capitalize">{p.pass_type.replace("_", " ")}</div>
                    <div className="text-xs text-muted-foreground">
                      Attribué le {format(new Date(p.granted_at), "d MMM yyyy", { locale: fr })}
                      {p.revoked_at && (
                        <> · Révoqué le {format(new Date(p.revoked_at), "d MMM yyyy", { locale: fr })}</>
                      )}
                    </div>
                  </div>
                  <Badge variant={p.revoked_at ? "outline" : "default"}>
                    {p.revoked_at ? "Révoqué" : "Actif"}
                  </Badge>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
