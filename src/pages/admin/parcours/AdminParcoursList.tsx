import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAllParcours, useDeleteParcours, type ParcoursRow } from "@/hooks/useAdminParcours";
import { ParcoursFormDialog } from "@/components/admin/parcours/ParcoursFormDialog";
import { Loader2, Map, ChevronRight, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminParcoursList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: parcours, isLoading } = useAllParcours();
  const del = useDeleteParcours();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ParcoursRow | null>(null);
  const [deleting, setDeleting] = useState<ParcoursRow | null>(null);

  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success("Parcours supprimé");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la suppression");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" /> Parcours
          </h1>
          <p className="text-muted-foreground mt-1">
            Crée et gère les parcours AL BARAKA et Liberty : réglages, phases, chapitres,
            vidéos et ressources.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau parcours
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (parcours ?? []).length === 0 && (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">Aucun parcours pour le moment.</p>
          <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Créer ton premier parcours
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(parcours ?? []).map((p) => (
          <Card
            key={p.id}
            className="hover:border-primary/50 transition-colors cursor-pointer h-full"
            onClick={() => navigate(`/admin/parcours/${p.slug}`)}
          >
            <CardContent className="p-5 flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Map className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{p.titre}</h3>
                  <Badge variant="outline" className="uppercase text-xs">
                    {p.pass_type.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant={p.status === "published" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {p.status}
                  </Badge>
                </div>
                {p.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4 mr-2" /> Modifier les réglages
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleting(p)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Création */}
      <ParcoursFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(slug) => navigate(`/admin/parcours/${slug}`)}
      />

      {/* Édition réglages */}
      {editing && (
        <ParcoursFormDialog
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          parcours={editing}
        />
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce parcours ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  <strong>{deleting.titre}</strong> et toutes ses phases, chapitres, vidéos,
                  ressources et la progression des élèves seront définitivement supprimés. Cette
                  action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
