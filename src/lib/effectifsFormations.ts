/**
 * Effectifs de l'espace Training, pour la vue CEO du catalogue.
 *
 * Un élève = une personne avec une inscription ACTIVE (`revoked_at` nul).
 * Le total compte les personnes distinctes, pas les inscriptions : un élève
 * inscrit à six formations compte une fois. Le CEO qui consulte est retiré du
 * compte — ses propres inscriptions servent à tester, pas à apprendre.
 */

export type LigneInscription = { formation_id: string; user_id: string };

export type Effectifs = {
  /** Nombre d'élèves par formation (id de formation → nombre). */
  parFormation: Record<string, number>;
  /** Nombre de personnes distinctes inscrites à au moins une formation. */
  total: number;
};

export function compterEleves(lignes: LigneInscription[], exclureUserId?: string | null): Effectifs {
  const parFormation: Record<string, Set<string>> = {};
  const personnes = new Set<string>();
  for (const { formation_id, user_id } of lignes) {
    if (!user_id || user_id === exclureUserId) continue;
    (parFormation[formation_id] ??= new Set()).add(user_id);
    personnes.add(user_id);
  }
  return {
    parFormation: Object.fromEntries(Object.entries(parFormation).map(([id, s]) => [id, s.size])),
    total: personnes.size,
  };
}
