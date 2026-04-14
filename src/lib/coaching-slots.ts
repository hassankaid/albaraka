import type { CoachingSlot, DayName } from "@/config/coachingSlots";

const DAYS_ORDER: DayName[] = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

function parisOffsetMinutes(utcDate: Date): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(utcDate).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asIfUtc - utcDate.getTime()) / 60000);
}

function parisWallClockToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = new Date(Date.UTC(year, monthIndex, day, hour, minute));
  const offset = parisOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60000);
}

export function nextOccurrenceParis(slot: CoachingSlot, now: Date = new Date()): Date {
  const targetDow = DAYS_ORDER.indexOf(slot.day);

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const y = Number(parts.year);
  const mo = Number(parts.month) - 1;
  const d = Number(parts.day);

  const todayParisAsUtc = new Date(Date.UTC(y, mo, d));
  const currentDow = todayParisAsUtc.getUTCDay();
  const daysAhead = (targetDow - currentDow + 7) % 7;

  const candidate = parisWallClockToUtc(y, mo, d + daysAhead, slot.hour, slot.minute);
  const endMs = candidate.getTime() + slot.durationMinutes * 60000;

  if (endMs <= now.getTime()) {
    return parisWallClockToUtc(y, mo, d + daysAhead + 7, slot.hour, slot.minute);
  }
  return candidate;
}

const FR_DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function parisParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
}

/** "lundi 13 avril — 20h30" en Europe/Paris, quel que soit le fuseau du client */
export function formatParisFull(date: Date): string {
  const p = parisParts(date);
  const dow = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  const day = Number(p.day);
  const month = FR_MONTHS[Number(p.month) - 1];
  return `${FR_DAYS[dow]} ${day} ${month} — ${p.hour}h${p.minute}`;
}

/** "20h30" en Europe/Paris */
export function formatParisTime(date: Date): string {
  const p = parisParts(date);
  return `${p.hour}h${p.minute}`;
}

/** "13 avril" en Europe/Paris */
export function formatParisDayMonth(date: Date): string {
  const p = parisParts(date);
  return `${Number(p.day)} ${FR_MONTHS[Number(p.month) - 1]}`;
}

/** "13 avril 2026" en Europe/Paris */
export function formatParisDayMonthYear(date: Date): string {
  const p = parisParts(date);
  return `${Number(p.day)} ${FR_MONTHS[Number(p.month) - 1]} ${p.year}`;
}

/** "lundi 13 avril 2026" en Europe/Paris */
export function formatParisWeekdayDate(date: Date): string {
  const p = parisParts(date);
  const dow = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  return `${FR_DAYS[dow]} ${Number(p.day)} ${FR_MONTHS[Number(p.month) - 1]} ${p.year}`;
}

export function sortSlotsByNextOccurrence(
  slots: CoachingSlot[],
  now: Date = new Date(),
): Array<{ slot: CoachingSlot; nextStart: Date }> {
  return slots
    .map((slot) => ({ slot, nextStart: nextOccurrenceParis(slot, now) }))
    .sort((a, b) => a.nextStart.getTime() - b.nextStart.getTime());
}

/**
 * Retourne les occurrences des 4 créneaux pour la semaine en cours
 * (lundi → dimanche, TZ Paris). Si tous les créneaux de cette semaine
 * sont terminés, bascule sur la semaine suivante.
 */
export function currentWeekOccurrences(
  slots: CoachingSlot[],
  now: Date = new Date(),
): Array<{ slot: CoachingSlot; nextStart: Date }> {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const y = Number(parts.year);
  const mo = Number(parts.month) - 1;
  const d = Number(parts.day);

  const todayDow = new Date(Date.UTC(y, mo, d)).getUTCDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;

  function computeWeek(shift: number) {
    return slots
      .map((slot) => {
        const targetDow = DAYS_ORDER.indexOf(slot.day);
        const mondayTargetDow = 1;
        const dayShift =
          mondayOffset + shift + ((targetDow - mondayTargetDow + 7) % 7);
        const start = parisWallClockToUtc(y, mo, d + dayShift, slot.hour, slot.minute);
        return { slot, nextStart: start };
      })
      .sort((a, b) => a.nextStart.getTime() - b.nextStart.getTime());
  }

  const current = computeWeek(0);
  const allEnded = current.every(
    ({ slot, nextStart }) => nextStart.getTime() + slot.durationMinutes * 60_000 <= now.getTime(),
  );
  return allEnded ? computeWeek(7) : current;
}
