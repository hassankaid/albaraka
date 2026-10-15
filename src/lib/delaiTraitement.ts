// Délai de traitement d'un lead (Sidali, 15/10/2026) : le temps entre le moment
// où le prospect remplit le formulaire (created_at) et la première action de
// l'équipe sur la fiche (premiere_action_le : statut, note ou relance ;
// migration 20261015170000).

export interface LeadDelai {
  created_at?: string | null;
  premiere_action_le?: string | null;
  status?: string | null;
}

/** « 12 min », « 2 h 15 », « 3 j 4 h ». */
export function dureeCourte(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) {
    const reste = minutes % 60;
    return reste ? `${heures} h ${String(reste).padStart(2, "0")}` : `${heures} h`;
  }
  const jours = Math.floor(heures / 24);
  const h = heures % 24;
  return h ? `${jours} j ${h} h` : `${jours} j`;
}

/**
 * « traité en 2 h 15 » une fois la première action faite ; « en attente depuis 5 h »
 * pour un lead encore « À qualifier » sans aucune action ; null sinon.
 */
export function delaiTraitement(
  lead: LeadDelai,
  maintenant = new Date(),
): { texte: string; enAttente: boolean } | null {
  if (!lead.created_at) return null;
  const debut = new Date(lead.created_at).getTime();
  if (Number.isNaN(debut)) return null;
  if (lead.premiere_action_le) {
    const fin = new Date(lead.premiere_action_le).getTime();
    if (Number.isNaN(fin)) return null;
    return { texte: `traité en ${dureeCourte(fin - debut)}`, enAttente: false };
  }
  if (lead.status === "a_qualifier") {
    return { texte: `en attente depuis ${dureeCourte(maintenant.getTime() - debut)}`, enAttente: true };
  }
  return null;
}
