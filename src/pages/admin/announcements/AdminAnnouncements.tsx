import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  Send,
  Trash2,
  Users,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AnnouncementRow {
  id: string;
  author_id: string;
  title: string;
  body: string;
  target_roles: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ReadStat {
  announcement_id: string;
  total: number;
  read: number;
}

interface RecipientRow {
  user_id: string;
  full_name: string | null;
  role: string | null;
  read_at: string | null;
}

type RoleKey = "ceo" | "collaborateur" | "apporteur";

const ROLE_LABELS: Record<RoleKey, string> = {
  ceo: "CEO",
  collaborateur: "Collaborateurs",
  apporteur: "Apporteurs",
};

export default function AdminAnnouncements() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<Record<RoleKey, boolean>>({
    ceo: true,
    collaborateur: true,
    apporteur: true,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const announcementsQuery = useQuery({
    queryKey: ["announcements", "all"],
    queryFn: async (): Promise<AnnouncementRow[]> => {
      const { data, error } = await supabase
        .from("announcements" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as AnnouncementRow[]) ?? [];
    },
  });

  // Stats de lecture par annonce (une requête agrégée côté client).
  const statsQuery = useQuery({
    queryKey: ["announcements", "read-stats"],
    queryFn: async (): Promise<Record<string, ReadStat>> => {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("metadata, read_at")
        .eq("type", "announcement");
      if (error) throw error;
      const stats: Record<string, ReadStat> = {};
      for (const row of (data as any[]) ?? []) {
        const aid = row.metadata?.announcement_id as string | undefined;
        if (!aid) continue;
        if (!stats[aid]) stats[aid] = { announcement_id: aid, total: 0, read: 0 };
        stats[aid].total += 1;
        if (row.read_at) stats[aid].read += 1;
      }
      return stats;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      const selectedRoles = (Object.keys(roles) as RoleKey[]).filter((r) => roles[r]);
      if (selectedRoles.length === 0) throw new Error("Sélectionne au moins un rôle cible.");
      if (!title.trim() || !body.trim()) throw new Error("Titre et corps obligatoires.");
      const { error } = await supabase.from("announcements" as any).insert({
        author_id: user.id,
        title: title.trim(),
        body: body.trim(),
        target_roles: selectedRoles,
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Annonce publiée ✦", description: "Les notifications ont été envoyées." });
      setDialogOpen(false);
      setTitle("");
      setBody("");
      setRoles({ ceo: true, collaborateur: true, apporteur: true });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: any) => {
      toast({ title: "Erreur", description: e?.message ?? "Publication impossible", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Annonce supprimée" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  if (profile?.role !== "ceo") {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Accès réservé au CEO.
      </div>
    );
  }

  const announcements = announcementsQuery.data ?? [];
  const stats = statsQuery.data ?? {};

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Annonces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publie une annonce : elle sera envoyée en notification à chaque utilisateur ciblé.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle annonce
        </Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune annonce pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const stat = stats[a.id];
            const isExpanded = !!expanded[a.id];
            return (
              <Card key={a.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{a.title}</h3>
                        {a.published_at ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Publiée {formatDistanceToNow(new Date(a.published_at), { locale: fr, addSuffix: true })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Brouillon</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                        {a.body}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          Cible : {a.target_roles.map((r) => ROLE_LABELS[r as RoleKey] ?? r).join(", ")}
                        </span>
                        <span>·</span>
                        <span>{format(new Date(a.created_at), "d MMM yyyy HH:mm", { locale: fr })}</span>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Les notifications envoyées aux utilisateurs seront aussi supprimées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(a.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* COMPTEUR + TOGGLE EXPAND */}
                  {stat && stat.total > 0 && (
                    <>
                      <Separator />
                      <button
                        type="button"
                        onClick={() => toggleExpand(a.id)}
                        className="w-full flex items-center gap-3 text-left hover:bg-secondary/40 -mx-2 px-2 py-1.5 rounded-md transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              <span className="font-semibold text-foreground">{stat.read}</span>
                              {" / "}
                              {stat.total} lues
                              <span className="ml-2 text-muted-foreground">
                                ({Math.round((stat.read / stat.total) * 100)}%)
                              </span>
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              {isExpanded ? "Masquer" : "Voir les destinataires"}
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            </span>
                          </div>
                          <Progress
                            value={(stat.read / stat.total) * 100}
                            className="h-1.5"
                          />
                        </div>
                      </button>

                      {isExpanded && <RecipientsList announcementId={a.id} />}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle annonce</DialogTitle>
            <DialogDescription>
              L'annonce est envoyée immédiatement en notification aux rôles cochés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                placeholder="Ex: Nouvelle formation disponible"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                rows={6}
                placeholder="Le contenu complet de ton annonce..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Destinataires</Label>
              <div className="flex flex-wrap gap-4">
                {(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={roles[r]}
                      onCheckedChange={(c) =>
                        setRoles((prev) => ({ ...prev, [r]: c === true }))
                      }
                    />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {publishMutation.isPending ? "Publication..." : "Publier maintenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecipientsList({ announcementId }: { announcementId: string }) {
  const query = useQuery({
    queryKey: ["announcement-recipients", announcementId],
    queryFn: async (): Promise<RecipientRow[]> => {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("user_id, read_at, profile:profiles!notifications_user_id_fkey(full_name, role)")
        .eq("type", "announcement")
        .eq("metadata->>announcement_id", announcementId);
      if (error) throw error;
      const rows = ((data as any[]) ?? []).map((r) => ({
        user_id: r.user_id as string,
        read_at: r.read_at as string | null,
        full_name: r.profile?.full_name ?? null,
        role: r.profile?.role ?? null,
      })) as RecipientRow[];
      rows.sort((a, b) =>
        (a.full_name ?? "").localeCompare(b.full_name ?? "", "fr", { sensitivity: "base" })
      );
      return rows;
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-2 pt-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const recipients = query.data ?? [];
  if (recipients.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic pt-2">
        Aucun destinataire.
      </p>
    );
  }

  return (
    <div className="pt-2 border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left font-medium text-xs text-muted-foreground px-3 py-2">Nom</th>
            <th className="text-left font-medium text-xs text-muted-foreground px-3 py-2 hidden sm:table-cell">Rôle</th>
            <th className="text-left font-medium text-xs text-muted-foreground px-3 py-2">Statut</th>
            <th className="text-left font-medium text-xs text-muted-foreground px-3 py-2 hidden sm:table-cell">Lu le</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {recipients.map((r) => (
            <tr key={r.user_id}>
              <td className="px-3 py-2 font-medium text-foreground">
                {r.full_name ?? <span className="text-muted-foreground italic">sans nom</span>}
              </td>
              <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                {r.role ? ROLE_LABELS[r.role as RoleKey] ?? r.role : "—"}
              </td>
              <td className="px-3 py-2">
                {r.read_at ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600">
                    <Check className="h-4 w-4" />
                    <span className="text-xs">Lue</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="text-xs">Non lue</span>
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                {r.read_at
                  ? format(new Date(r.read_at), "d MMM HH:mm", { locale: fr })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
