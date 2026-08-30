// Modèle de filtre pour le dashboard marketing : filtrage par conférence du dimanche.
// Une conférence = un dimanche, identifié par sa date (YYYY-MM-DD).
//
// L'heure de bascule ci-dessous doit suivre l'heure de début réelle, portée par
// `conferences.starts_at_local` (11h00 depuis le 30/08/2026 ; c'était 18h30 au
// printemps, et ce fichier disait 12h00). Elle ne sert qu'à choisir la
// conférence proposée par défaut dans la liste déroulante : une fonction
// synchrone ne peut pas interroger la base, donc on la garde en constante et on
// la met à jour si l'horaire change durablement.

/** Heure de début des conférences, heure de Paris. Voir l'en-tête du fichier. */
const HEURE_BASCULE = 11;

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
  // Dimanche après l'heure de début : cette conférence. Sinon : la précédente.
  let daysBack = dow;
  if (dow === 0 && hour < HEURE_BASCULE) daysBack = 7;
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

/** Ajoute `n` semaines à une date de conférence (YYYY-MM-DD). */
export function dimanchePlus(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return new Date(d.getTime() + n * 7 * 86400000).toISOString().slice(0, 10);
}

/**
 * Conférence sur laquelle les inscriptions du moment sont rattachées : celle du
 * jour tant qu'elle n'a pas commencé, celle du dimanche suivant après.
 *
 * À ne pas confondre avec `currentOrPrevSunday`, qui répond « quelle est la
 * dernière conférence passée ». Le tableau de bord a besoin des deux : la
 * dernière passée pour lire des résultats, celle en cours pour voir arriver les
 * leads. Ne garder que la première faisait disparaître de la liste déroulante la
 * conférence du jour — avec tous ses inscrits de la semaine.
 *
 * C'est toujours la suivante, par construction : `currentOrPrevSunday` bascule
 * exactement à l'heure de début.
 *
 * Miroir de `next_sunday_noon_paris_after()` côté base. Les deux doivent
 * répondre la même chose, sinon l'affichage et le rattachement divergent.
 */
export function conferenceEnCours(ref: Date = new Date()): string {
  return dimanchePlus(currentOrPrevSunday(ref), 1);
}
