// Semaine "marketing" = dimanche 12h00 Europe/Paris → dimanche 12h00 Europe/Paris suivant.
// Correspond au créneau de switch de conférence côté client Al Baraka.
// DST-safe : utilise Intl pour calculer l'offset Paris à chaque date, pas d'hypothèse +1/+2.

const PARIS_TZ = "Europe/Paris";

/** Parts Paris d'une instant UTC (an, mois 1-12, jour 1-31, heure 0-23, minute, weekday 0=Dim..6=Sam). */
function parisParts(utc: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(utc);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour") === "24" ? "00" : get("hour")),
    minute: Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

/** Convertit un wall-clock Paris (an, mois 1-12, jour, heure, minute) en Date UTC. */
function parisWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  // Paris est soit UTC+1 (hiver) soit UTC+2 (été). On teste les deux candidats.
  for (const offset of [1, 2]) {
    const utc = new Date(Date.UTC(year, month - 1, day, hour - offset, minute, 0));
    const p = parisParts(utc);
    if (
      p.year === year &&
      p.month === month &&
      p.day === day &&
      p.hour === hour &&
      p.minute === minute
    ) {
      return utc;
    }
  }
  // Fallback (ne devrait pas arriver) : hiver +1
  return new Date(Date.UTC(year, month - 1, day, hour - 1, minute, 0));
}

/**
 * Retourne la fenêtre hebdomadaire "marketing" contenant `ref` :
 * from = dimanche 12h00 Paris précédent (ou égal si ref est exactement un dim 12h Paris)
 * to   = dimanche 12h00 Paris suivant (exclusif sur le to — la fenêtre est [from, to))
 */
export function parisSundayNoonWeekRange(ref: Date): { from: Date; to: Date } {
  const p = parisParts(ref);
  // On part du jour Paris de ref et on recule jusqu'au dim 12h Paris précédent (weekday=0, hour>=12).
  // Simple : on construit le dim 12h Paris de cette semaine Paris (dim précédent ou égal).
  // Nombre de jours à reculer pour atteindre dimanche :
  //   weekday=0 (dim) : 0 jour sauf si hour<12 → reculer 7 jours (semaine précédente)
  //   weekday=1..6    : reculer weekday jours
  let daysBack = p.weekday === 0 ? (p.hour < 12 ? 7 : 0) : p.weekday;
  // Construit la date Paris dim à 12h00
  // On part de (p.year, p.month, p.day) Paris et on recule daysBack jours en Paris-space.
  // Astuce : on construit une Date UTC avec ces parts à midi UTC, on recule daysBack jours,
  // on relit les parts Paris pour obtenir (year, month, day) Paris du dimanche.
  const anchor = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
  const back = new Date(anchor.getTime() - daysBack * 86400000);
  const bp = parisParts(back);
  const from = parisWallClockToUtc(bp.year, bp.month, bp.day, 12, 0);
  const to = new Date(from.getTime() + 7 * 86400000);
  return { from, to };
}

/** Décale une fenêtre marketing de N semaines (N peut être négatif). */
export function shiftParisWeek(
  range: { from: Date; to: Date },
  n: number,
): { from: Date; to: Date } {
  // On prend un point au milieu de la semaine cible (ajout de 3.5j = 3j12h) et on recalcule
  // via parisSundayNoonWeekRange : ça gère proprement les transitions DST.
  const midpoint = new Date(range.from.getTime() + (n * 7 + 3) * 86400000 + 12 * 3600000);
  return parisSundayNoonWeekRange(midpoint);
}

/** Formatte la borne de la fenêtre pour affichage UI (jour mois Paris). */
export function formatParisDate(d: Date, opts?: { withYear?: boolean }): string {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    day: "numeric",
    month: "short",
    year: opts?.withYear ? "numeric" : undefined,
  });
  return fmt.format(d);
}

/** Numéro de semaine marketing : index 1-based dans l'année, basé sur le from Paris. */
export function parisMarketingWeekNumber(range: { from: Date; to: Date }): number {
  // Approximation : on numérote par l'ordre du dim 12h from dans l'année Paris.
  // Pour simplifier : week number ISO du midpoint de la fenêtre.
  const mid = new Date(range.from.getTime() + 3.5 * 86400000);
  // ISO week : dupliqué ici pour éviter la dépendance à date-fns ici.
  const target = new Date(mid);
  target.setUTCHours(0, 0, 0, 0);
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
}
