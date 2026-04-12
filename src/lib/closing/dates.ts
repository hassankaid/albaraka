import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import { TOTAL_WEEKS } from "./phases";

export function ymd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function mondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getPlanWeekStart(startedAt: string | Date, weekNumber: number): Date {
  const start = typeof startedAt === "string" ? parseISO(startedAt) : startedAt;
  const firstMonday = mondayOf(start);
  return addDays(firstMonday, (weekNumber - 1) * 7);
}

export function getCurrentPlanWeek(startedAt: string | Date, today: Date = new Date()): number {
  const start = typeof startedAt === "string" ? parseISO(startedAt) : startedAt;
  const firstMonday = mondayOf(start);
  const days = differenceInCalendarDays(today, firstMonday);
  const week = Math.floor(days / 7) + 1;
  return Math.max(1, Math.min(TOTAL_WEEKS, week));
}

export function getPlanDayDate(startedAt: string | Date, weekNumber: number, dayIndex: number): Date {
  return addDays(getPlanWeekStart(startedAt, weekNumber), dayIndex);
}

export function isPlanCompleted(startedAt: string | Date, today: Date = new Date()): boolean {
  const start = typeof startedAt === "string" ? parseISO(startedAt) : startedAt;
  const firstMonday = mondayOf(start);
  const days = differenceInCalendarDays(today, firstMonday);
  return days >= TOTAL_WEEKS * 7;
}
