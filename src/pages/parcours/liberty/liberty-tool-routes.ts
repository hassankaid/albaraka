/**
 * Mapping des outils interactifs Liberty livrés vers leur route React.
 *
 * Ajouter ici les nouvelles entrées au fur et à mesure que les outils
 * M2 → M18 sont implémentés. La clé est le titre du chapitre tel qu'inséré
 * dans la BDD (voir migration `20260526180000_liberty_parcours_skeleton.sql`).
 */
export const LIBERTY_TOOL_ROUTES: Record<string, string> = {
  "M1 — NICHE": "/parcours/liberty/m1",
  "M2 — PSYCHOLOGIE": "/parcours/liberty/m2",
  "M3 — ANATOMIE D'UNE OFFRE": "/parcours/liberty/m3",
  "M4 — VALUE LADDER": "/parcours/liberty/m4",
  "M5 — HIGH TICKET": "/parcours/liberty/m5",
  "M6 — PRICING": "/parcours/liberty/m6",
  "M7 — GARANTIE": "/parcours/liberty/m7",
  "M8 — PREUVE SOCIALE & ÉTUDES DE CAS": "/parcours/liberty/m8",
  "M11 — CONCEVOIR UN PROGRAMME": "/parcours/liberty/m11",
  "M12 — NAMING & POSITIONNEMENT D'OFFRE": "/parcours/liberty/m12",
  "M13 — TRANSITION DIY": "/parcours/liberty/m13",
  "M14 — ARCHITECTURER TON MIDDLE-TICKET": "/parcours/liberty/m14",
  // …
};

export function getLibertyToolRouteForChapitre(
  parcoursSlug: string | undefined,
  chapitreTitre: string | undefined,
): string | null {
  if (parcoursSlug !== "liberty" || !chapitreTitre) return null;
  return LIBERTY_TOOL_ROUTES[chapitreTitre] ?? null;
}
