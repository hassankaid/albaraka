// Taux de conversion de Mon Activité (Sidali, 13/10/2026).
//   Présents          = RDV obtenus − no-show
//   Prise de RDV      = RDV obtenus ÷ conversations (= réponses reçues) × 100
//   Présence en RDV   = présents ÷ RDV obtenus × 100
//   Closing           = ventes ÷ présents × 100 (et non plus ÷ RDV obtenus)
// Un taux sans dénominateur vaut null (affiché « — »).

export interface SaisieActivite {
  replies_received: number;
  appointments: number;
  no_shows?: number | null;
  sales_made: number;
}

export interface TauxActivite {
  conversations: number;
  rdv: number;
  noShows: number;
  presents: number;
  ventes: number;
  tauxPriseRdv: number | null;
  tauxPresence: number | null;
  tauxClosing: number | null;
}

function pourcentage(numerateur: number, denominateur: number): number | null {
  if (denominateur <= 0) return null;
  return Math.round((numerateur / denominateur) * 1000) / 10;
}

export function presents(rdv: number, noShows: number): number {
  return Math.max(0, rdv - noShows);
}

export function calculerTaux(saisies: SaisieActivite[]): TauxActivite {
  const conversations = saisies.reduce((s, j) => s + (j.replies_received || 0), 0);
  const rdv = saisies.reduce((s, j) => s + (j.appointments || 0), 0);
  const noShows = saisies.reduce((s, j) => s + (j.no_shows || 0), 0);
  const ventes = saisies.reduce((s, j) => s + (j.sales_made || 0), 0);
  const p = presents(rdv, noShows);
  return {
    conversations,
    rdv,
    noShows,
    presents: p,
    ventes,
    tauxPriseRdv: pourcentage(rdv, conversations),
    tauxPresence: pourcentage(p, rdv),
    tauxClosing: pourcentage(ventes, p),
  };
}

export function formaterTaux(taux: number | null): string {
  return taux === null ? "—" : `${taux.toLocaleString("fr-FR")} %`;
}
