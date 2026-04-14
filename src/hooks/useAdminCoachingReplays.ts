import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COACHING_SLOTS, type CoachingSlot } from "@/config/coachingSlots";
import type { CoachingOccurrenceRow } from "@/hooks/useCoachingTracking";

const DAYS_ORDER = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

function parisYMD(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

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
  const parts = fmt.formatToParts(utcDate).reduce<Record<string, string>>(
    (acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    },
    {},
  );
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

export interface ExpectedOccurrence {
  slot: CoachingSlot;
  occurrenceDate: string;
  startedAt: Date;
  row: CoachingOccurrenceRow | null;
  attendanceCount: number;
  replayViewsCount: number;
}

export function useRecentOccurrences(weeksBack: number = 12) {
  return useQuery({
    queryKey: ["admin-coaching-occurrences", weeksBack],
    queryFn: async (): Promise<ExpectedOccurrence[]> => {
      const now = new Date();
      const since = new Date(now.getTime() - weeksBack * 7 * 86_400_000);

      const [
        { data: occurrences, error: occErr },
        { data: attendance, error: attErr },
        { data: views, error: vwErr },
      ] = await Promise.all([
        supabase
          .from("coaching_occurrences")
          .select("*")
          .gte("started_at", since.toISOString())
          .order("started_at", { ascending: false }),
        supabase
          .from("coaching_attendance")
          .select("occurrence_id")
          .gte("joined_at", since.toISOString()),
        supabase
          .from("coaching_replay_views")
          .select("occurrence_id")
          .gte("viewed_at", since.toISOString()),
      ]);
      if (occErr) throw occErr;
      if (attErr) throw attErr;
      if (vwErr) throw vwErr;

      const occByKey = new Map<string, CoachingOccurrenceRow>();
      for (const o of (occurrences ?? []) as CoachingOccurrenceRow[]) {
        occByKey.set(`${o.slot_id}|${o.occurrence_date}`, o);
      }
      const attendanceByOcc = new Map<string, number>();
      for (const a of (attendance ?? []) as { occurrence_id: string }[]) {
        attendanceByOcc.set(a.occurrence_id, (attendanceByOcc.get(a.occurrence_id) ?? 0) + 1);
      }
      const viewsByOcc = new Map<string, number>();
      for (const v of (views ?? []) as { occurrence_id: string }[]) {
        viewsByOcc.set(v.occurrence_id, (viewsByOcc.get(v.occurrence_id) ?? 0) + 1);
      }

      const expected: ExpectedOccurrence[] = [];
      const todayParis = parisYMD(now);
      const [yy, mm, dd] = todayParis.split("-").map(Number);

      for (const slot of COACHING_SLOTS) {
        const targetDow = DAYS_ORDER.indexOf(slot.day);
        const todayDow = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
        let offset = (todayDow - targetDow + 7) % 7;
        for (let week = 0; week < weeksBack; week++) {
          const dayShift = offset + week * 7;
          const y = yy;
          const mo = mm - 1;
          const d = dd - dayShift;
          const startedAt = parisWallClockToUtc(y, mo, d, slot.hour, slot.minute);
          const endMs = startedAt.getTime() + slot.durationMinutes * 60_000;
          if (endMs > now.getTime()) continue;
          if (startedAt.getTime() < since.getTime()) break;
          const occDate = parisYMD(startedAt);
          const row = occByKey.get(`${slot.id}|${occDate}`) ?? null;
          const attendanceCount = row ? (attendanceByOcc.get(row.id) ?? 0) : 0;
          const replayViewsCount = row ? (viewsByOcc.get(row.id) ?? 0) : 0;
          expected.push({
            slot,
            occurrenceDate: occDate,
            startedAt,
            row,
            attendanceCount,
            replayViewsCount,
          });
        }
      }

      expected.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      return expected;
    },
  });
}

export function useUpsertOccurrenceReplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      slot: CoachingSlot;
      occurrenceDate: string;
      startedAt: Date;
      replayUrl: string | null;
      replayPassword: string | null;
    }) => {
      const { slot, occurrenceDate, startedAt, replayUrl, replayPassword } = params;
      const { data: occId, error: rpcErr } = await supabase.rpc(
        "ensure_coaching_occurrence",
        {
          p_slot_id: slot.id,
          p_occurrence_date: occurrenceDate,
          p_started_at: startedAt.toISOString(),
          p_duration_minutes: slot.durationMinutes,
        },
      );
      if (rpcErr) throw rpcErr;
      const { error } = await supabase
        .from("coaching_occurrences")
        .update({
          replay_url: replayUrl && replayUrl.trim() !== "" ? replayUrl.trim() : null,
          replay_password:
            replayPassword && replayPassword.trim() !== "" ? replayPassword.trim() : null,
        })
        .eq("id", occId as string);
      if (error) throw error;
      return occId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coaching-occurrences"] });
      qc.invalidateQueries({ queryKey: ["coaching-replays-available"] });
    },
  });
}

export interface LeaderboardRow {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  pass_level: "al_baraka" | "liberty";
  attendedCount: number;
  replayViewsCount: number;
  eligibleCount: number;
  attendanceRate: number;
}

export function useAttendanceLeaderboard(periodDays: number = 30) {
  return useQuery({
    queryKey: ["admin-coaching-leaderboard", periodDays],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();
      const [
        { data: profiles, error: pErr },
        { data: passes, error: passErr },
        { data: attendance, error: attErr },
        { data: views, error: vwErr },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role, is_active")
          .in("role", ["apporteur", "collaborateur", "ceo"]),
        supabase.from("user_passes").select("user_id, pass_type").is("revoked_at", null),
        supabase
          .from("coaching_attendance")
          .select("user_id, occurrence:coaching_occurrences!inner(started_at)")
          .gte("occurrence.started_at", since),
        supabase
          .from("coaching_replay_views")
          .select("user_id, occurrence:coaching_occurrences!inner(started_at)")
          .gte("occurrence.started_at", since),
      ]);
      if (pErr) throw pErr;
      if (passErr) throw passErr;
      if (attErr) throw attErr;
      if (vwErr) throw vwErr;

      const passLevelByUser = new Map<string, "al_baraka" | "liberty">();
      for (const p of (passes ?? []) as { user_id: string; pass_type: string }[]) {
        const current = passLevelByUser.get(p.user_id);
        if (p.pass_type === "liberty" || !current) {
          passLevelByUser.set(
            p.user_id,
            (p.pass_type === "liberty" ? "liberty" : "al_baraka") as "liberty" | "al_baraka",
          );
        }
      }

      const attendanceByUser = new Map<string, number>();
      for (const a of (attendance ?? []) as { user_id: string }[]) {
        attendanceByUser.set(a.user_id, (attendanceByUser.get(a.user_id) ?? 0) + 1);
      }
      const viewsByUser = new Map<string, number>();
      for (const v of (views ?? []) as { user_id: string }[]) {
        viewsByUser.set(v.user_id, (viewsByUser.get(v.user_id) ?? 0) + 1);
      }

      const eligibleCount = countPastOccurrencesClient(periodDays);

      const rows: LeaderboardRow[] = [];
      for (const p of (profiles ?? []) as any[]) {
        const level = passLevelByUser.get(p.id);
        if (!level) continue;
        if (!p.is_active && p.role !== "ceo") continue;
        const attendedCount = attendanceByUser.get(p.id) ?? 0;
        const replayViewsCount = viewsByUser.get(p.id) ?? 0;
        rows.push({
          user_id: p.id,
          full_name: p.full_name ?? "",
          email: p.email ?? "",
          role: p.role,
          pass_level: level,
          attendedCount,
          replayViewsCount,
          eligibleCount,
          attendanceRate:
            eligibleCount > 0 ? Math.round((attendedCount / eligibleCount) * 100) : 0,
        });
      }
      rows.sort((a, b) => a.attendanceRate - b.attendanceRate);
      return rows;
    },
  });
}

function countPastOccurrencesClient(days: number, now: Date = new Date()): number {
  const sinceMs = now.getTime() - days * 86_400_000;
  let count = 0;
  for (const slot of COACHING_SLOTS) {
    const targetDow = DAYS_ORDER.indexOf(slot.day);
    for (let back = 0; back <= days + 7; back++) {
      const candidate = new Date(now.getTime() - back * 86_400_000);
      if (candidate.getDay() !== targetDow) continue;
      const today = new Date(candidate);
      today.setHours(slot.hour, slot.minute, 0, 0);
      const endMs = today.getTime() + slot.durationMinutes * 60_000;
      if (endMs > now.getTime()) continue;
      if (endMs < sinceMs) break;
      count++;
    }
  }
  return count;
}
