/**
 * Mapping des outils interactifs Liberty livrés vers leur route React.
 *
 * Ajouter ici les nouvelles entrées au fur et à mesure que les outils
 * M2 → M18 sont implémentés. La clé est le titre du chapitre tel qu'inséré
 * dans la BDD (voir migration `20260526180000_liberty_parcours_skeleton.sql`).
 */
export const LIBERTY_TOOL_ROUTES: Record<string, string> = {
  "M1 — NICHE": "/parcours/liberty/m1",
  // M2 — PSYCHOLOGIE : à venir
  // M3 — ANATOMIE D'UNE OFFRE : à venir
  // …
};

export function getLibertyToolRouteForChapitre(
  parcoursSlug: string | undefined,
  chapitreTitre: string | undefined,
): string | null {
  if (parcoursSlug !== "liberty" || !chapitreTitre) return null;
  return LIBERTY_TOOL_ROUTES[chapitreTitre] ?? null;
}
