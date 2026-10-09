/**
 * Étapes d'un parcours (09/10/2026) : une formation peut regrouper ses
 * modules en étapes (« ÉTAPE 1 — SETTING », « ÉTAPE 2 — CLOSING »). Le titre
 * d'étape s'affiche au-dessus du premier module de chaque groupe ; une
 * formation sans étape garde son affichage habituel.
 */
export interface AvecEtape {
  etape?: string | null;
}

/** Titre d'étape à afficher avant le module `i`, ou null. */
export function debutEtape(modules: AvecEtape[], i: number): string | null {
  const etape = modules[i]?.etape?.trim();
  if (!etape) return null;
  const precedente = i > 0 ? modules[i - 1]?.etape?.trim() : null;
  return precedente === etape ? null : etape;
}
