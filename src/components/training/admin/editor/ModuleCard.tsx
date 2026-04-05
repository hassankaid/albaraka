import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { ChapitreRow } from "./ChapitreRow";
import { EditModuleDialog } from "./EditModuleDialog";
import { CreateChapitreDialog } from "./CreateChapitreDialog";
import {
  GripVertical,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface ModuleCardProps {
  module: {
    id: string;
    titre: string;
    description: string | null;
    ordre: number;
    status: string;
    chapitres: Array<{
      id: string;
      titre: string;
      description: string | null;
      ordre: number;
      status: string;
      duree_estimee_minutes: number | null;
    }>;
  };
  isFirst: boolean;
  isLast: boolean;
  totalModules: number;
  formationId: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  published: { label: "Publié", className: "bg-primary/10 text-primary" },
  archived: { label: "Archivé", className: "bg-muted text-muted-foreground" },
};

export function ModuleCard({ module, isFirst, isLast, totalModules, formationId }: ModuleCardProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(totalModules <= 3);
  const [editOpen, setEditOpen] = useState(false);
  const [createChapOpen, setCreateChapOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Sortable for module reordering
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: module.id,
    data: {
      type: "module",
      titre: module.titre,
    },
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Droppable zone for chapters
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `module-droppable-${module.id}`,
    data: {
      type: "module-droppable",
      moduleId: module.id,
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-training", "modules-tree"] });
    queryClient.invalidateQueries({ queryKey: ["admin-training", "formations"] });
    queryClient.invalidateQueries({ queryKey: ["training"] });
  };

  const moveMutation = useMutation({
    mutationFn: async (direction: "up" | "down") => {
      const { data: all } = await supabase
        .from("formation_modules")
        .select("id, ordre")
        .eq("formation_id", formationId)
        .order("ordre", { ascending: true });
      if (!all) return;

      const idx = all.findIndex((m) => m.id === module.id);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= all.length) return;

      const a = all[idx];
      const b = all[swapIdx];
      await supabase.from("formation_modules").update({ ordre: b.ordre }).eq("id", a.id);
      await supabase.from("formation_modules").update({ ordre: a.ordre }).eq("id", b.id);
    },
    onSuccess: invalidate,
    onError: () => toast.error("Impossible de déplacer le module"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const newStatus = module.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("formation_modules")
        .update({ status: newStatus })
        .eq("id", module.id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(newStatus === "published" ? "Module publié" : "Module dépublié");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (module.chapitres.length > 0) {
        throw new Error(
          `Impossible : ce module contient ${module.chapitres.length} chapitre(s). Supprime-les d'abord.`
        );
      }
      const { error } = await supabase.from("formation_modules").delete().eq("id", module.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Module supprimé");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sc = statusConfig[module.status] ?? statusConfig.draft;

  return (
    <>
      <Card
        ref={setSortableRef}
        style={sortableStyle}
        {...attributes}
        className="overflow-hidden"
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2 p-4">
            {/* Drag handle — functional */}
            <span
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
            >
              <GripVertical className="h-5 w-5" />
            </span>

            {/* Order badge */}
            <Badge variant="outline" className="text-xs font-mono">
              #{module.ordre + 1}
            </Badge>

            {/* Title + meta (clickable to toggle) */}
            <CollapsibleTrigger asChild>
              <button className="flex flex-1 items-center gap-2 text-left min-w-0">
                <span className="text-base font-semibold text-foreground truncate">
                  {module.titre}
                </span>
                <Badge className={`${sc.className} text-[10px]`}>{sc.label}</Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {module.chapitres.length} chap.
                </span>
              </button>
            </CollapsibleTrigger>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isFirst || moveMutation.isPending}
                onClick={() => moveMutation.mutate("up")}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isLast || moveMutation.isPending}
                onClick={() => moveMutation.mutate("down")}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCreateChapOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Éditer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleStatusMutation.mutate()}>
                    {module.status === "published" ? (
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

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent>
            {module.description && (
              <p className="px-4 pb-2 text-sm text-muted-foreground">{module.description}</p>
            )}
            <SortableContext
              items={module.chapitres.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                ref={setDroppableRef}
                className={`divide-y border-t transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
              >
                {module.chapitres.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    Aucun chapitre dans ce module ·{" "}
                    <button
                      onClick={() => setCreateChapOpen(true)}
                      className="text-primary hover:underline"
                    >
                      Ajouter le premier chapitre
                    </button>
                  </div>
                ) : (
                  module.chapitres.map((chap, idx) => (
                    <ChapitreRow
                      key={chap.id}
                      chapitre={chap}
                      moduleId={module.id}
                      isFirst={idx === 0}
                      isLast={idx === module.chapitres.length - 1}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Dialogs */}
      <EditModuleDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        module={module}
        onUpdated={invalidate}
      />
      <CreateChapitreDialog
        open={createChapOpen}
        onOpenChange={setCreateChapOpen}
        moduleId={module.id}
        onCreated={invalidate}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce module ?</AlertDialogTitle>
            <AlertDialogDescription>
              {module.chapitres.length > 0
                ? `Ce module contient ${module.chapitres.length} chapitre(s). Supprime-les d'abord.`
                : `Le module "${module.titre}" sera définitivement supprimé.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={module.chapitres.length > 0}
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
