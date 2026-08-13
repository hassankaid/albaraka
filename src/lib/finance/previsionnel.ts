/**
 * CA collecté prévisionnel d'une période.
 *
 * Fiabilité mesurée sur les données réelles (août 2026) : 98 % des montants sont
 * encaissés dans le mois même de leur `due_date`, et il n'existe aucun arriéré
 * antérieur ouvert. Une projection assise sur les échéances déjà planifiées est
 * donc fidèle — c'est ce que fait ce module, sans modéliser les ventes à venir
 * (leur contribution au cash du mois est quasi nulle depuis juin 2026).
 */

/** Date → "YYYY-MM-DD" en heure LOCALE. */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Une échéance, réduite aux champs dont le prévisionnel a besoin. */
export interface ForecastPayment {
  amount: number;
  status: string;
  due_date: string;
}

export interface Previsionnel<T> {
  /** Échéances de la période dont la date n'est pas encore passée. */
  aVenir: number;
  /** Échéances échues mais pas encore remontées payées (prélèvement en cours). */
  echu: number;
  /** Échéances en retard avéré. */
  retard: number;
  /** Échéances perdues — exclues de l'objectif. */
  perdu: number;
  /** Objectif de la période : encaissé + tout ce qui reste, hors perdu. */
  previsionnel: number;
  /** Ce qui aurait dû être encaissé à ce jour (échéances échues, hors perdues). */
  duADate: number;
  /** Écart au rythme : négatif = retard sur l'échéancier, positif = avance. */
  ecartADate: number;
  /** Part des échéances qui finit encaissée, mesurée sur les 3 derniers mois clos. */
  tauxRealisation: number;
  /** Encaissé + reste pondéré par le taux de réalisation. */
  atterrissage: number;
  /** Le reste à encaisser, le plus urgent d'abord. */
  resteList: T[];
}

const sumOf = (list: ForecastPayment[]) => list.reduce((s, p) => s + (p.amount || 0), 0);

/**
 * Taux de réalisation observé sur les 3 derniers mois CLOS : part des échéances dues
 * qui finit encaissée. Ratio paid/(paid+lost) — les lignes encore ouvertes sont exclues
 * des deux termes, donc un mois pas tout à fait soldé ne tire pas le taux vers le bas.
 * Fenêtre courte volontairement : le taux se dégrade dans le temps (99 % en janvier
 * 2026, 88 % en juillet), une moyenne longue serait à la traîne.
 */
export function tauxRealisationObserve(allPayments: ForecastPayment[], today: Date): number {
  const start = ymd(new Date(today.getFullYear(), today.getMonth() - 3, 1));
  const end = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
  const window = allPayments.filter((p) => p.due_date >= start && p.due_date < end);
  const paid = sumOf(window.filter((p) => p.status === "paid"));
  const lost = sumOf(window.filter((p) => p.status === "lost"));
  return paid + lost > 0 ? paid / (paid + lost) : 1;
}

export function computePrevisionnel<T extends ForecastPayment>(params: {
  /** Encaissé sur la période, basé sur `paid_at` (peut inclure des échéances dues avant). */
  caCollecte: number;
  /** Échéances dont la `due_date` tombe dans la période, bornées à la FIN de période. */
  periodPayments: T[];
  /** Toutes les échéances, pour calculer le taux de réalisation historique. */
  allPayments: ForecastPayment[];
  today: Date;
}): Previsionnel<T> {
  const { caCollecte, periodPayments, allPayments, today } = params;
  const todayStr = ymd(today);

  const aVenirList = periodPayments.filter((p) => p.status === "pending" && p.due_date > todayStr);
  const echuList = periodPayments.filter((p) => p.status === "pending" && p.due_date <= todayStr);
  const retardList = periodPayments.filter((p) => p.status === "late");
  const perduList = periodPayments.filter((p) => p.status === "lost");

  const aVenir = sumOf(aVenirList);
  const echu = sumOf(echuList);
  const retard = sumOf(retardList);
  const perdu = sumOf(perduList);

  const reste = aVenir + echu + retard;
  const previsionnel = caCollecte + reste;

  const duADate = sumOf(periodPayments.filter((p) => p.status !== "lost" && p.due_date <= todayStr));
  const tauxRealisation = tauxRealisationObserve(allPayments, today);

  return {
    aVenir,
    echu,
    retard,
    perdu,
    previsionnel,
    duADate,
    ecartADate: caCollecte - duADate,
    tauxRealisation,
    atterrissage: caCollecte + reste * tauxRealisation,
    // Le plus urgent d'abord : retards, puis échues, puis à venir par date.
    resteList: [...retardList, ...echuList, ...aVenirList].sort((a, b) =>
      a.due_date.localeCompare(b.due_date)
    ),
  };
}
