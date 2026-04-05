import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import {
  GripVertical,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Eye,
  BookOpen,
  Users,
  Layers,
  GraduationCap,
} from "lucide-react";
import { useState } from "react";

interface AdminFormationRowProps {
  formation: {
    id: string;
    slug: string;
    titre: string;
    description: string | null;
    cover_url: string | null;
    status: string;
    nb_modules: number;
    nb_chapitres: number;
    nb_enrollments: number;
  };
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onOpenEditor: () => void;
  isReorderDisabled?: boolean;
}

export function AdminFormationRow({
  formation,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
  onPreview,
  onOpenEditor,
  isReorderDisabled,
}: AdminFormationRowProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: formation.id, disabled: isReorderDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
    published: { label: "Publiée", className: "bg-primary/10 text-primary" },
    archived: { label: "Archivée", className: "bg-muted text-muted-foreground line-through" },
  };
  const sc = statusConfig[formation.status] ?? statusConfig.draft;
  const isDraft = formation.status === "draft";

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
      >
        {/* Drag handle */}
        {!isReorderDisabled && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        {/* Cover */}
        <div className="h-16 w-24 rounded-lg bg-muted overflow-hidden shrink-0">
          {formation.cover_url ? (
            <img
              src={formation.cover_url}
              alt={formation.titre}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
              onClick={onOpenEditor}
            >
              {formation.titre}
            </span>
            <Badge variant="secondary" className={sc.className}>
              {sc.label}
            </Badge>
          </div>
          {formation.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {formation.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {formation.nb_modules} modules
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {formation.nb_chapitres} chapitres
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formation.nb_enrollments} inscrits
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" />
            Éditer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Éditer métadonnées
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Voir comme élève
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleArchive}>
                {formation.status === "archived" ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Désarchiver
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archiver
                  </>
                )}
              </DropdownMenuItem>
              {isDraft && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette formation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La formation "{formation.titre}" et tous
              ses modules, chapitres, vidéos et ressources seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
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
