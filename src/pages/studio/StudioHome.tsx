import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Film,
  Plus,
  Sparkles,
  Clock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStudioProjects,
  useCreateStudioProject,
  useDeleteStudioProject,
} from "./hooks/useStudioProjects";
import {
  STATUS_LABEL,
  STATUS_TONE,
  type StudioProject,
  type StudioProjectStatus,
} from "./types";

const STATUS_ICON: Record<StudioProjectStatus, JSX.Element> = {
  draft: <Clock className="h-3 w-3" />,
  audio_uploaded: <Clock className="h-3 w-3" />,
  transcribed: <Sparkles className="h-3 w-3" />,
  broll_ready: <Sparkles className="h-3 w-3" />,
  processing: <Loader2 className="h-3 w-3 animate-spin" />,
  done: <CheckCircle2 className="h-3 w-3" />,
  failed: <AlertTriangle className="h-3 w-3" />,
};

const TONE_CLASS: Record<
  "default" | "primary" | "warning" | "success" | "danger",
  string
> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  warning: "bg-amber-500/15 text-amber-500",
  success: "bg-emerald-500/15 text-emerald-500",
  danger: "bg-destructive/15 text-destructive",
};

export default function StudioHome() {
  const navigate = useNavigate();
  const projectsQuery = useStudioProjects();
  const createMutation = useCreateStudioProject();
  const deleteMutation = useDeleteStudioProject();

  const handleNewProject = async () => {
    try {
      const project = await createMutation.mutateAsync({
        source: "manual",
        title: `Nouvelle vidéo — ${format(new Date(), "d MMM HH:mm", { locale: fr })}`,
      });
      navigate(`/studio/projects/${project.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Création échouée");
    }
  };

  const handleDelete = async (project: StudioProject) => {
    if (!confirm(`Supprimer définitivement "${project.title ?? "ce projet"}" ?`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(project.id);
      toast.success("Projet supprimé");
    } catch (e: any) {
      toast.error(e?.message ?? "Suppression échouée");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <p className="text-xs tracking-[0.3em] uppercase text-primary">
          Studio · Albaraka
        </p>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-3xl text-foreground">Mes vidéos</h1>
            <p className="text-sm text-muted-foreground">
              Crée tes Reels à partir d'un script et de ta voix-off. L'IA s'occupe des visuels et des sous-titres.
            </p>
          </div>
          <Button onClick={handleNewProject} disabled={createMutation.isPending} className="gap-2">
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Nouvelle vidéo
          </Button>
        </div>
      </div>

      {/* Bandeau "version preview" — explicite tant qu'on n'a pas ouvert
          à tous les apporteurs. Évite que Sidali se demande pourquoi
          Studio n'est pas visible côté Sanna/Mahir. */}
      <div className="rounded-lg border border-primary/30 bg-primary/[0.05] p-3 flex items-start gap-3 text-xs">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Preview interne.</span>{" "}
          Studio est en cours de construction et n'est ouvert qu'à toi + Sidali Test pour valider chaque brique avant ouverture aux apporteurs.
        </p>
      </div>

      {/* Grille des projets */}
      {projectsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : projectsQuery.data && projectsQuery.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsQuery.data.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={() => navigate(`/studio/projects/${p.id}`)}
              onDelete={() => handleDelete(p)}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <EmptyState onNew={handleNewProject} pending={createMutation.isPending} />
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
  deleting,
}: {
  project: StudioProject;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const tone = STATUS_TONE[project.status];
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors group">
      <button
        onClick={onOpen}
        className="block w-full aspect-video bg-gradient-to-br from-primary/20 via-primary/5 to-background relative"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="h-12 w-12 text-primary/40 group-hover:text-primary/60 transition-colors" />
        </div>
        <Badge
          className={`absolute top-2 left-2 gap-1 ${TONE_CLASS[tone]} border-0`}
        >
          {STATUS_ICON[project.status]}
          {STATUS_LABEL[project.status]}
        </Badge>
        {project.source === "personal_brand" && (
          <Badge className="absolute top-2 right-2 gap-1 bg-background/80 text-foreground backdrop-blur-sm border-0">
            <Sparkles className="h-3 w-3" /> Personal Brand
          </Badge>
        )}
      </button>
      <CardContent className="p-3 space-y-2">
        <button
          onClick={onOpen}
          className="block text-left w-full hover:text-primary transition-colors"
        >
          <p className="text-sm font-medium text-foreground truncate">
            {project.title ?? "Sans titre"}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(project.created_at), "d MMM yyyy · HH:mm", { locale: fr })}
          </p>
        </button>
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={onOpen} className="text-xs">
            Ouvrir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onNew, pending }: { onNew: () => void; pending: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-10 flex flex-col items-center text-center gap-4">
        <div className="p-4 rounded-full bg-primary/10">
          <Film className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="font-heading text-xl text-foreground">
            Aucune vidéo pour l'instant
          </h2>
          <p className="text-sm text-muted-foreground">
            Démarre une nouvelle vidéo en partant d'un script vierge, ou ouvre un script depuis ton calendrier Personal Brand et clique sur "Produire en vidéo".
          </p>
        </div>
        <Button onClick={onNew} disabled={pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Créer ma première vidéo
        </Button>
      </CardContent>
    </Card>
  );
}
