import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AdminFormationRow } from "@/components/training/admin/AdminFormationRow";
import { CreateFormationDialog } from "@/components/training/admin/CreateFormationDialog";
import { EditFormationDialog } from "@/components/training/admin/EditFormationDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";

export interface Formation {
  id: string;
  slug: string;
  titre: string;
  description: string | null;
  couleur: string | null;
  cover_url: string | null;
  status: string;
  ordre: number;
  nb_modules: number;
  nb_chapitres: number;
  nb_enrollments: number;
}

export default function AdminTrainingList() {
  const navigate = useNavigate();
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");

  const isCeo = profile?.role === "ceo";

  const { data: formations, isLoading } = useQuery({
    queryKey: ["admin-training", "formations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("id, slug, titre, description, couleur, cover_url, status, ordre")
        .order("ordre", { ascending: true });
      if (error) throw error;

      const enriched: Formation[] = await Promise.all(
        (data ?? []).map(async (f) => {
          const [{ count: nbModules }, { count: nbEnrollments }, { data: chapters }] = await Promise.all([
            supabase
              .from("formation_modules")
              .select("id", { count: "exact", head: true })
              .eq("formation_id", f.id),
            supabase
              .from("formation_enrollments")
              .select("id", { count: "exact", head: true })
              .eq("formation_id", f.id)
              .is("revoked_at", null),
            supabase
              .from("formation_chapitres")
              .select("id, formation_modules!inner(formation_id)")
              .eq("formation_modules.formation_id", f.id),
          ]);
          return {
            ...f,
            nb_modules: nbModules ?? 0,
            nb_chapitres: (chapters ?? []).length,
            nb_enrollments: nbEnrollments ?? 0,
          };
        })
      );
      return enriched;
    },
    enabled: isCeo,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { error } = await (supabase as any).rpc("reorder_formations", {
        p_formation_ids: orderedIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordre mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin-training"] });
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
    onError: () => toast.error("Erreur lors du réordonnancement"),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (formationId: string) => {
      const { data, error } = await (supabase as any).rpc("duplicate_formation", {
        p_formation_id: formationId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Formation dupliquée");
      queryClient.invalidateQueries({ queryKey: ["admin-training"] });
    },
    onError: () => toast.error("Erreur lors de la duplication"),
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "archived" ? "draft" : "archived";
      const { error } = await supabase
        .from("formations")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(newStatus === "archived" ? "Formation archivée" : "Formation restaurée");
      queryClient.invalidateQueries({ queryKey: ["admin-training"] });
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("formations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formation supprimée");
      queryClient.invalidateQueries({ queryKey: ["admin-training"] });
    },
    onError: () => toast.error("Impossible de supprimer"),
  });

  // Access control
  if (!authLoading && !isCeo) {
    return <Navigate to="/training" replace />;
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !formations) return;

    const oldIdx = formations.findIndex((f) => f.id === active.id);
    const newIdx = formations.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const newOrder = arrayMove(formations, oldIdx, newIdx);
    queryClient.setQueryData(["admin-training", "formations"], newOrder);
    reorderMutation.mutate(newOrder.map((f) => f.id));
  };

  const filteredFormations = (formations ?? []).filter((f) =>
    statusFilter === "all" ? true : f.status === statusFilter
  );

  const counts = {
    all: formations?.length ?? 0,
    draft: formations?.filter((f) => f.status === "draft").length ?? 0,
    published: formations?.filter((f) => f.status === "published").length ?? 0,
    archived: formations?.filter((f) => f.status === "archived").length ?? 0,
  };

  const editingFormation = editingId
    ? (formations ?? []).find((f) => f.id === editingId) ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Gestion des formations</h2>
            <p className="text-sm text-muted-foreground">
              Crée, édite et organise tes formations Ethicarena Training
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle formation
        </Button>
      </div>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Toutes ({counts.all})</TabsTrigger>
          <TabsTrigger value="draft">Brouillons ({counts.draft})</TabsTrigger>
          <TabsTrigger value="published">Publiées ({counts.published})</TabsTrigger>
          <TabsTrigger value="archived">Archivées ({counts.archived})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredFormations.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">
            Aucune formation dans cette catégorie.
          </p>
          {statusFilter === "all" && (
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Créer ta première formation
            </Button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filteredFormations.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filteredFormations.map((formation) => (
                <AdminFormationRow
                  key={formation.id}
                  formation={formation}
                  onEdit={() => setEditingId(formation.id)}
                  onDuplicate={() => duplicateMutation.mutate(formation.id)}
                  onToggleArchive={() =>
                    toggleArchiveMutation.mutate({
                      id: formation.id,
                      currentStatus: formation.status,
                    })
                  }
                  onDelete={() => deleteMutation.mutate(formation.id)}
                  onPreview={() => navigate(`/training/${formation.slug}`)}
                  onOpenEditor={() => navigate(`/admin/training/${formation.slug}`)}
                  isReorderDisabled={statusFilter !== "all"}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Dialogs */}
      <CreateFormationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() =>
          queryClient.invalidateQueries({ queryKey: ["admin-training"] })
        }
      />
      {editingFormation && (
        <EditFormationDialog
          open={!!editingId}
          onOpenChange={(v) => !v && setEditingId(null)}
          formation={editingFormation}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-training"] });
            queryClient.invalidateQueries({ queryKey: ["training"] });
          }}
        />
      )}
    </div>
  );
}
