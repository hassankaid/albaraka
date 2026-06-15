import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useParcoursBySlug,
  useUpdateParcours,
  useDeletePhase,
  useReorderPhases,
  useDeleteChapitre,
  useReorderChapitres,
  type ParcoursPhaseRow,
  type ParcoursChapitreRow,
} from "@/hooks/useAdminParcours";
import { ParcoursFormDialog } from "@/components/admin/parcours/ParcoursFormDialog";
import { PhaseFormDialog } from "@/components/admin/parcours/PhaseFormDialog";
import { CreateChapitreDialog } from "@/components/admin/parcours/CreateChapitreDialog";
import {
  Loader2,
  ArrowLeft,
  ChevronRight,
  Video,
  BookOpen,
  Flag,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Settings2,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_META: Record<string, { icon: any; label: string }> = {
  video: { icon: Video, label: "Vidéo" },
  redirect_formation: { icon: BookOpen, label: "→ Formation" },
  milestone: { icon: Flag, label: "Étape clé" },
};

export default function ParcoursEditor() {
  const { profile } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useParcoursBySlug(slug);

  const updateParcours = useUpdateParcours();
  const reorderPhases = useReorderPhases();
  const deletePhase = useDeletePhase();

  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [phaseDialog, setPhaseDialog] = useState<{ phase: ParcoursPhaseRow | null } | null>(null);
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<ParcoursPhaseRow | null>(null);

  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return <Navigate to="/admin/parcours" replace />;

  const { parcours, phases, chapitres } = data;
  const sortedPhases = [...phases].sort((a, b) => a.ordre - b.ordre);
  const isPublished = parcours.status === "published";

  async function togglePublish() {
    try {
      await updateParcours.mutateAsync({
        id: parcours.id,
        status: isPublished ? "draft" : "published",
      });
      toast.success(isPublished ? "Parcours dépublié" : "Parcours publié");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  }

  function movePhase(phaseId: string, dir: "up" | "down") {
    const ids = sortedPhases.map((p) => p.id);
    const idx = ids.indexOf(phaseId);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    reorderPhases.mutate({ parcours_id: parcours.id, ordered_ids: ids });
  }

  async function confirmDeletePhase() {
    if (!deletePhaseTarget) return;
    try {
      await deletePhase.mutateAsync(deletePhaseTarget.id);
      toast.success("Phase supprimée");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setDeletePhaseTarget(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          to="/admin/parcours"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux parcours
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-heading text-foreground">{parcours.titre}</h1>
              <Badge variant="outline" className="uppercase text-xs">
                {parcours.pass_type.replace("_", " ")}
              </Badge>
              <Badge variant={isPublished ? "default" : "secondary"} className="text-xs">
                {parcours.status}
              </Badge>
            </div>
            {parcours.subtitle && (
              <p className="text-muted-foreground mt-1">{parcours.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(`/parcours/${parcours.slug}`, "_blank")}
            >
              <ExternalLink className="h-4 w-4" /> Voir côté élève
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setEditSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4" /> Réglages
            </Button>
            <Button
              variant={isPublished ? "outline" : "default"}
              size="sm"
              className="gap-2"
              onClick={togglePublish}
              disabled={updateParcours.isPending}
            >
              {isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isPublished ? "Dépublier" : "Publier"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setPhaseDialog({ phase: null })}>
          <Plus className="h-4 w-4" /> Ajouter une phase
        </Button>
      </div>

      <div className="space-y-6">
        {sortedPhases.map((phase, idx) => (
          <PhaseBlock
            key={phase.id}
            phase={phase}
            isFirst={idx === 0}
            isLast={idx === sortedPhases.length - 1}
            chapitres={chapitres
              .filter((c) => c.phase_id === phase.id)
              .sort((a, b) => a.ordre - b.ordre)}
            slug={parcours.slug}
            movePending={reorderPhases.isPending}
            onEdit={() => setPhaseDialog({ phase })}
            onDelete={() => setDeletePhaseTarget(phase)}
            onMove={(dir) => movePhase(phase.id, dir)}
          />
        ))}

        {sortedPhases.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Aucune phase dans ce parcours</p>
            <Button onClick={() => setPhaseDialog({ phase: null })} className="gap-2">
              <Plus className="h-4 w-4" /> Créer la première phase
            </Button>
          </div>
        )}
      </div>

      {/* Réglages parcours */}
      {editSettingsOpen && (
        <ParcoursFormDialog
          open={editSettingsOpen}
          onOpenChange={setEditSettingsOpen}
          parcours={parcours}
        />
      )}

      {/* Création / édition phase */}
      {phaseDialog && (
        <PhaseFormDialog
          open={!!phaseDialog}
          onOpenChange={(v) => !v && setPhaseDialog(null)}
          parcoursId={parcours.id}
          phase={phaseDialog.phase}
        />
      )}

      {/* Confirmation suppression phase */}
      <AlertDialog
        open={!!deletePhaseTarget}
        onOpenChange={(v) => !v && setDeletePhaseTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette phase ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletePhaseTarget && (
                <>
                  La phase <strong>{deletePhaseTarget.titre}</strong> et tous ses chapitres
                  (vidéos, ressources, progression) seront définitivement supprimés.
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
                confirmDeletePhase();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PhaseBlock({
  phase,
  chapitres,
  slug,
  isFirst,
  isLast,
  movePending,
  onEdit,
  onDelete,
  onMove,
}: {
  phase: ParcoursPhaseRow;
  chapitres: ParcoursChapitreRow[];
  slug: string;
  isFirst: boolean;
  isLast: boolean;
  movePending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const navigate = useNavigate();
  const reorderChapitres = useReorderChapitres();
  const deleteChapitre = useDeleteChapitre();
  const [createChapOpen, setCreateChapOpen] = useState(false);
  const [deleteChapTarget, setDeleteChapTarget] = useState<ParcoursChapitreRow | null>(null);

  function moveChapitre(chapId: string, dir: "up" | "down") {
    const ids = chapitres.map((c) => c.id);
    const idx = ids.indexOf(chapId);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    reorderChapitres.mutate({ phase_id: phase.id, ordered_ids: ids });
  }

  async function confirmDeleteChap() {
    if (!deleteChapTarget) return;
    try {
      await deleteChapitre.mutateAsync(deleteChapTarget.id);
      toast.success("Chapitre supprimé");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setDeleteChapTarget(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">
                {phase.emoji ? `${phase.emoji} ` : ""}Phase {phase.numero} — {phase.titre}
              </h2>
              {phase.status !== "published" && (
                <Badge variant="secondary" className="text-xs">
                  {phase.status}
                </Badge>
              )}
              <Badge variant="outline">
                {chapitres.length} chapitre{chapitres.length > 1 ? "s" : ""}
              </Badge>
            </div>
            {phase.description && (
              <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isFirst || movePending}
              onClick={() => onMove("up")}
              title="Monter"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLast || movePending}
              onClick={() => onMove("down")}
              title="Descendre"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Modifier">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {chapitres.map((chap, idx) => {
            const meta = TYPE_META[chap.type] ?? TYPE_META.video;
            const Icon = meta.icon;
            return (
              <div
                key={chap.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-accent/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  onClick={() => navigate(`/admin/parcours/${slug}/chapitre/${chap.id}`)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      Chapitre {chap.numero} — {chap.titre}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {meta.label}
                    </Badge>
                    {chap.status !== "published" && (
                      <Badge variant="secondary" className="text-xs">
                        {chap.status}
                      </Badge>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={idx === 0 || reorderChapitres.isPending}
                    onClick={() => moveChapitre(chap.id, "up")}
                    title="Monter"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={idx === chapitres.length - 1 || reorderChapitres.isPending}
                    onClick={() => moveChapitre(chap.id, "down")}
                    title="Descendre"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/admin/parcours/${slug}/chapitre/${chap.id}`)}
                    title="Éditer le contenu"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteChapTarget(chap)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
          {chapitres.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Aucun chapitre dans cette phase.</p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-2 mt-2"
            onClick={() => setCreateChapOpen(true)}
          >
            <Plus className="h-4 w-4" /> Ajouter un chapitre
          </Button>
        </div>
      </CardContent>

      <CreateChapitreDialog
        open={createChapOpen}
        onOpenChange={setCreateChapOpen}
        phaseId={phase.id}
        onCreated={(id) => navigate(`/admin/parcours/${slug}/chapitre/${id}`)}
      />

      <AlertDialog
        open={!!deleteChapTarget}
        onOpenChange={(v) => !v && setDeleteChapTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce chapitre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteChapTarget && (
                <>
                  Le chapitre <strong>{deleteChapTarget.titre}</strong> (vidéos, ressources,
                  progression) sera définitivement supprimé.
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
                confirmDeleteChap();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
