// ─────────────────────────────────────────────────────────────────────────
// Tri de la liste des élèves.
//
// Extrait du composant pour être testable — le piège n'est pas le tri
// lui-même, c'est le traitement des valeurs absentes.
//
// « Jamais connecté » n'est PAS « connecté il y a très longtemps ». Si on les
// mélange, 135 élèves qui n'ont jamais ouvert leur compte se retrouvent noyés
// parmi les inactifs, et on perd la seule information qui distingue un élève
// à relancer d'un élève à activer. Les absents finissent donc toujours en bas,
// quel que soit le critère.
// ─────────────────────────────────────────────────────────────────────────
export type CritereTri = "connexion" | "activite" | "nom";

export interface EleveTriable {
  full_name: string | null;
  email: string;
  derniere_connexion?: string | null;
  last_activity_at?: string | null;
}

/** Plus récent d'abord ; les valeurs absentes toujours en dernier. */
export function comparerDates(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return b.localeCompare(a);
}

export function trier<T extends EleveTriable>(eleves: T[], critere: CritereTri): T[] {
  const copie = [...eleves];
  if (critere === "connexion") {
    copie.sort((a, b) => comparerDates(a.derniere_connexion, b.derniere_connexion));
  } else if (critere === "activite") {
    copie.sort((a, b) => comparerDates(a.last_activity_at, b.last_activity_at));
  } else {
    copie.sort((a, b) =>
      (a.full_name || a.email).localeCompare(b.full_name || b.email, "fr"),
    );
  }
  return copie;
}
