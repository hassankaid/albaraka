import type { ContentWizardState } from "../types";
import type { ContentPieceStatus } from "@/hooks/useContentPiece";

/**
 * Calcule le statut d'un contenu à partir de son état.
 * Le statut est dérivé, jamais set manuellement.
 *
 * Règles (dans l'ordre) :
 * 1. publie   : au moins une plateforme cochée
 * 2. pret     : tout rempli (idée + script + description) ET date de publication définie
 * 3. en_cours : tous les autres cas
 */
export function computeStatus(
  state: Pick<
    ContentWizardState,
    | "selectedIdea"
    | "script"
    | "description"
    | "publicationChecklist"
    | "scheduledFor"
  >
): ContentPieceStatus {
  const anyPlatformPublished = Object.values(state.publicationChecklist).some(
    (v) => v === true
  );
  if (anyPlatformPublished) return "publie";

  const hasIdea = state.selectedIdea !== null;
  const hasScript = state.script !== null;
  const hasDescription = state.description !== null;
  const hasScheduledDate =
    state.scheduledFor !== null && state.scheduledFor !== "";

  if (hasIdea && hasScript && hasDescription && hasScheduledDate) {
    return "pret";
  }

  return "en_cours";
}
