import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { EditChapitreDialog } from "./EditChapitreDialog";
import {
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Clock,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ChapitreRowProps {
  chapitre: {
    id: string;
    titre: string;
    description: string | null;
    ordre: number;
    status: string;
    duree_estimee_minutes: number | null;
  };
  moduleId: string;
  formationSlug: string;
  isFirst: boolean;
  isLast: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  published: { label: "Publié", className: "bg-primary/10 text-primary" },
  archived: { label: "Archivé", className: "bg-muted text-muted-foreground" },
};

export function ChapitreRow({ chapitre, moduleId, formationSlug, isFirst, isLast }: ChapitreRowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Sortable for chapter drag
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: chapitre.id,
    data: {
      type: "chapitre",
      sourceModuleId: moduleId,
      moduleId,
      titre: chapitre.titre,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-training", "modules-tree"] });
    queryClient.invalidateQueries({ queryKey: ["admin-training", "formations"] });
    queryClient.invalidateQueries({ queryKey: ["training"] });
  };

  const moveMutation = useMutation({
    mutationFn: async (direction: "up" | "down") => {
      const { data: all } = await supabase
        .from("formation_chapitres")
        .select("id, ordre")
        .eq("module_id", moduleId)
        .order("ordre", { ascending: true });
      if (!all) return;

      const idx = all.findIndex((c) => c.id === chapitre.id);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= all.length) return;

      const a = all[idx];
      const b = all[swapIdx];
      await supabase.from("formation_chapitres").update({ ordre: b.ordre }).eq("id", a.id);
      await supabase.from("formation_chapitres").update({ ordre: a.ordre }).eq("id", b.id);
    },
    onSuccess: invalidate,
    onError: () => toast.error("Impossible de déplacer le chapitre"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const newStatus = chapitre.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("formation_chapitres")
        .update({ status: newStatus })
        .eq("id", chapitre.id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(newStatus === "published" ? "Chapitre publié" : "Chapitre dépublié");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("formation_chapitres").delete().eq("id", chapitre.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chapitre supprimé");
      invalidate();
    },
    onError: () => toast.error("Impossible de supprimer le chapitre"),
  });

  const sc = statusConfig[chapitre.status] ?? statusConfig.draft;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        {/* Drag handle — functional */}
        <span
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </span>

        {/* Order */}
        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
          {chapitre.ordre + 1}
        </Badge>

        {/* Title + meta */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <button
            onClick={() => navigate(`/admin/training/${formationSlug}/chapitre/${chapitre.id}`)}
            className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors text-left"
          >
            {chapitre.titre}
          </button>
          <Badge className={`${sc.className} text-[10px]`}>{sc.label}</Badge>
          {chapitre.duree_estimee_minutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              <Clock className="h-3 w-3" />
              {chapitre.duree_estimee_minutes} min
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isFirst || moveMutation.isPending}
            onClick={() => moveMutation.mutate("up")}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isLast || moveMutation.isPending}
            onClick={() => moveMutation.mutate("down")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/admin/training/${formationSlug}/chapitre/${chapitre.id}`)}>
                <Film className="mr-2 h-4 w-4" />
                Éditer vidéos & ressources
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleStatusMutation.mutate()}>
                {chapitre.status === "published" ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Dépublier
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Publier
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialogs */}
      <EditChapitreDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        chapitre={chapitre}
        onUpdated={invalidate}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce chapitre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le chapitre "{chapitre.titre}" et toutes ses vidéos et ressources seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
