// Qui proposer dans les menus « collaborateur », « setter », « closer » (Hassan, 19/10/2026).
//
// La source est le statut de la fiche dans Admin › Équipe : « Désactiver le rôle
// collaborateur » met is_active à false. Les menus lisent ce statut à chaque
// ouverture, donc désactiver quelqu'un le retire partout, le réactiver l'y remet,
// sans autre manipulation.
//
// Ce qui est déjà posé ne bouge pas : une vente ou un lead qui porte déjà un
// collaborateur désactivé garde son nom affiché, suivi de « (inactif) ».

export interface ProfilEquipe {
  id: string;
  full_name: string;
  role: string;
  is_active?: boolean | null;
}

/** Collaborateur encore en poste (une fiche sans statut compte comme active). */
export function estCollaborateurActif(p: Pick<ProfilEquipe, "role" | "is_active">): boolean {
  return p.role === "collaborateur" && p.is_active !== false;
}

/** Les personnes à proposer comme setter ou closer : le CEO et les collaborateurs actifs. */
export function estEquipeActive(p: Pick<ProfilEquipe, "role" | "is_active">): boolean {
  return p.role === "ceo" || estCollaborateurActif(p);
}

/** L'équipe active, plus la personne déjà choisie si elle a été désactivée depuis. */
export function equipeProposee<T extends ProfilEquipe>(profils: T[], valeurActuelle?: string | null): T[] {
  return profils.filter((p) => estEquipeActive(p) || (!!valeurActuelle && p.id === valeurActuelle));
}

/** Le nom à afficher, avec « (inactif) » pour un collaborateur désactivé. */
export function nomEquipe(p: ProfilEquipe): string {
  return p.role === "collaborateur" && p.is_active === false ? `${p.full_name} (inactif)` : p.full_name;
}
