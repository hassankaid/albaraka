import { useState } from "react";
import {
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  pointerWithin,
  closestCenter,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModuleWithChapters {
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
}

type DragType = "module" | "chapitre";

interface ActiveDrag {
  id: string;
  type: DragType;
  sourceModuleId?: string;
  titre: string;
}

export function useFormationDnd(formationId: string, modules: ModuleWithChapters[]) {
  const queryClient = useQueryClient();
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-training", "modules-tree"] });
    queryClient.invalidateQueries({ queryKey: ["admin-training", "formations"] });
    queryClient.invalidateQueries({ queryKey: ["training"] });
  };

  const reorderModulesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { error } = await (supabase as any).rpc("reorder_modules", {
        p_formation_id: formationId,
        p_module_ids: orderedIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordre des modules mis à jour");
      invalidate();
    },
    onError: () => {
      toast.error("Erreur lors du réordonnancement");
      invalidate();
    },
  });

  const moveChapitreMutation = useMutation({
    mutationFn: async (args: {
      chapitreId: string;
      targetModuleId: string;
      targetOrdre: number;
    }) => {
      const { error } = await (supabase as any).rpc("move_chapitre", {
        p_chapitre_id: args.chapitreId,
        p_target_module_id: args.targetModuleId,
        p_target_ordre: args.targetOrdre,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chapitre déplacé");
      invalidate();
    },
    onError: () => {
      toast.error("Erreur lors du déplacement");
      invalidate();
    },
  });

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCenter(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { type: DragType; sourceModuleId?: string; titre: string } | undefined;
    if (!data) return;
    setActiveDrag({
      id: String(active.id),
      type: data.type,
      sourceModuleId: data.sourceModuleId,
      titre: data.titre,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;

    const activeData = active.data.current as { type: DragType; sourceModuleId?: string } | undefined;
    const overData = over.data.current as { type: string; moduleId?: string } | undefined;

    if (!activeData) return;

    // Case 1: reorder modules
    if (activeData.type === "module" && active.id !== over.id) {
      const oldIdx = modules.findIndex((m) => m.id === active.id);
      const newIdx = modules.findIndex((m) => m.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      const newOrder = arrayMove(modules, oldIdx, newIdx).map((m) => m.id);

      queryClient.setQueryData<ModuleWithChapters[]>(
        ["admin-training", "modules-tree", formationId],
        (old) => {
          if (!old) return old;
          return arrayMove(
            [...old],
            old.findIndex((m) => m.id === active.id),
            old.findIndex((m) => m.id === over.id)
          );
        }
      );

      reorderModulesMutation.mutate(newOrder);
      return;
    }

    // Case 2: move chapitre
    if (activeData.type === "chapitre") {
      const chapitreId = String(active.id);
      const sourceModuleId = activeData.sourceModuleId;
      if (!sourceModuleId) return;

      let targetModuleId: string;
      let targetOrdre: number;

      if (overData?.type === "chapitre") {
        const overModuleId = overData.moduleId!;
        const overModule = modules.find((m) => m.id === overModuleId);
        if (!overModule) return;
        const overIdx = overModule.chapitres.findIndex((c) => c.id === over.id);
        if (overIdx === -1) return;
        targetModuleId = overModuleId;
        targetOrdre = overIdx;
      } else if (overData?.type === "module-droppable") {
        targetModuleId = overData.moduleId!;
        const targetModule = modules.find((m) => m.id === targetModuleId);
        targetOrdre = targetModule?.chapitres.length ?? 0;
      } else {
        return;
      }

      // No-op check
      if (
        targetModuleId === sourceModuleId &&
        modules.find((m) => m.id === sourceModuleId)?.chapitres.findIndex((c) => c.id === chapitreId) === targetOrdre
      ) {
        return;
      }

      moveChapitreMutation.mutate({ chapitreId, targetModuleId, targetOrdre });
    }
  };

  const handleDragCancel = () => setActiveDrag(null);

  return {
    sensors,
    collisionDetection,
    activeDrag,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
