import { useEffect, useRef, useCallback } from "react";
import { useContentWizard } from "../ContentWizardContext";
import { useUpsertContentPiece } from "@/hooks/useContentPiece";
import { toast } from "sonner";

const AUTO_SAVE_DEBOUNCE_MS = 2000;

export function useWizardAutoSave() {
  const { state, setContentPieceId, setSaveState } = useContentWizard();
  const upsertMutation = useUpsertContentPiece();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const buildPayload = useCallback(() => {
    return {
      id: state.contentPieceId || undefined,
      title: state.title,
      format: state.format,
      theme: state.theme,
      status: state.status,
      ideas: state.ideas.length > 0 ? state.ideas : null,
      selected_idea: state.selectedIdea,
      script: state.script,
      description: state.description,
      montage_checklist: state.montageChecklist,
      publication_checklist: state.publicationChecklist,
      scheduled_for: state.scheduledFor,
      current_step: state.currentStep,
    };
  }, [state]);

  const doSave = useCallback(
    async (silent: boolean = true) => {
      if (!state.selectedIdea) return;

      setSaveState("saving");
      try {
        const result = await upsertMutation.mutateAsync(buildPayload());
        if (!state.contentPieceId) {
          setContentPieceId(result.id);
        }
        setSaveState("saved", new Date().toISOString());
        if (!silent) {
          toast.success("Contenu sauvegardé");
        }
      } catch (error: any) {
        setSaveState("error");
        if (!silent) {
          toast.error("Erreur de sauvegarde : " + (error?.message || "inconnue"));
        }
      }
    },
    [state.selectedIdea, state.contentPieceId, buildPayload, upsertMutation, setContentPieceId, setSaveState]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!state.selectedIdea) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      doSave(true);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.selectedIdea,
    state.script,
    state.description,
    state.montageChecklist,
    state.publicationChecklist,
    state.currentStep,
    state.format,
    state.theme,
    state.status,
    state.scheduledFor,
    state.title,
  ]);

  return {
    saveNow: () => doSave(false),
    isSaving: state.saveState === "saving",
  };
}
