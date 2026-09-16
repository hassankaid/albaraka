/**
 * Qui a le droit d'ouvrir quel chapitre d'un parcours.
 *
 * Deux règles se combinent :
 *
 *  1. Progression linéaire (règle historique) : tout ce qui suit le premier
 *     chapitre non terminé est fermé.
 *  2. La théorie avant la pratique : un chapitre relié à un module de formation
 *     (`theorie_chapitre_id`) ne s'ouvre qu'une fois ce module validé. C'est ce
 *     qui empêche un élève Liberty d'attaquer l'outil M3 sans avoir vu le
 *     MODULE 3 d'OFFER CREATION.
 *
 * Un chapitre déjà terminé reste toujours accessible : la seconde règle ne doit
 * jamais faire reculer quelqu'un sur du travail déjà fait.
 */

export interface ChapitreOrdonne {
  id: string;
  theorie_chapitre_id?: string | null;
}

export interface AccesChapitre {
  /** L'élève peut ouvrir ce chapitre. */
  accessible: boolean;
  /**
   * Module de théorie à valider avant d'ouvrir ce chapitre — renseigné
   * uniquement quand c'est le seul obstacle, donc quand ce chapitre est bien
   * l'étape courante. Null sinon.
   */
  theorieManquante: string | null;
}

export function calculerAccesChapitres(
  ordonnes: ChapitreOrdonne[],
  termines: Set<string>,
  theoriesValidees: Set<string>,
): Map<string, AccesChapitre> {
  const acces = new Map<string, AccesChapitre>();
  let bloque = false;

  for (const chapitre of ordonnes) {
    const dejaFait = termines.has(chapitre.id);
    const theorie = chapitre.theorie_chapitre_id ?? null;
    const theorieManquante =
      !bloque && !dejaFait && theorie && !theoriesValidees.has(theorie) ? theorie : null;

    acces.set(chapitre.id, { accessible: !bloque && !theorieManquante, theorieManquante });

    if (!dejaFait) bloque = true;
  }

  return acces;
}

/**
 * Nom court d'un module de théorie, pour les boutons : « MODULE 4 : L'ÉCOSYSTÈME
 * D'OFFRES & LA VALUE LADDER » devient « MODULE 4 ».
 */
export function abregerTitreModule(titre: string): string {
  const court = titre.split(/\s*[:—]\s*/)[0].trim();
  return court || titre.trim();
}
