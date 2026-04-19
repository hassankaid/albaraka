// Modèle de filtre pour le dashboard marketing : filtrage par conférence du dimanche.
// Une conférence = le dimanche 12h00 Paris, identifié par sa date (YYYY-MM-DD).

export type ConferenceFilter =
  | { mode: "single"; date: string } // une conf précise
  | { mode: "range"; from: string; to: string } // plage (mois, trimestre, année, custom)
  | { mode: "all" }; // tout l'historique

/** Retourne la date ISO (YYYY-MM-DD) du dimanche le plus récent ≤ ref, heure Paris. */
export function currentOrPrevSunday(ref: Date): string {
  // Wall clock Paris parts
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(ref);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour") === "24" ? "00" : get("hour"));
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = weekdayMap[get("weekday")] ?? 0;

  // Dim du milieu de semaine Paris (via UTC anchor)
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  // Si on est dim après 12h Paris : ce dim
  // Sinon : dim précédent
  let daysBack = dow;
  if (dow === 0 && hour < 12) daysBack = 7;
  const back = new Date(anchor.getTime() - daysBack * 86400000);
  const backFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return backFmt.format(back); // YYYY-MM-DD
}

/** Liste de confs (YYYY-MM-DD) autour de ref : `past` dim dans le passé + `future` dim dans le futur. */
export function buildConferenceList(
  ref: Date = new Date(),
  past = 20,
  future = 5,
): string[] {
  const currentStr = currentOrPrevSunday(ref);
  const out: string[] = [currentStr];
  const current = new Date(currentStr + "T12:00:00Z");
  // Add future
  for (let i = 1; i <= future; i++) {
    const d = new Date(current.getTime() + i * 7 * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  // Add past
  for (let i = 1; i <= past; i++) {
    const d = new Date(current.getTime() - i * 7 * 86400000);
    out.unshift(d.toISOString().slice(0, 10));
  }
  return out; // trié ancien → récent
}

/** Formatte une date YYYY-MM-DD en "dim 19 avril 2026" (fr). */
export function formatConferenceLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return fmt.format(d);
}

/** Formatte plus court : "dim 19 avr". */
export function formatConferenceLabelShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return fmt.format(d).replace(".", "");
}

/** Format complet : "Conférence du dimanche 19 avril 2026". */
export function formatConferenceLabelFull(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Conférence du ${fmt.format(d)}`;
}
