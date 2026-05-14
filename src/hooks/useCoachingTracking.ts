import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type CoachingSlot } from "@/config/coachingSlots";
import { fetchActiveCoachingSlots } from "@/hooks/useCoachingSlots";

export interface CoachingOccurrenceRow {
  id: string;
  slot_id: string;
  occurrence_date: string;
  started_at: string;
  duration_minutes: number;
  replay_url: string | null;
  replay_password: string | null;
  replay_added_at: string | null;
  replay_available_until: string | null;
}

export interface AvailableReplay extends CoachingOccurrenceRow {
  slot: CoachingSlot | null;
}

function parisYMDForInstant(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

export function useLogAttendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      slot: CoachingSlot;
      startedAt: Date;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { slot, startedAt } = params;
      const occurrenceDate = parisYMDForInstant(startedAt);
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
      const { error: attErr } = await supabase
        .from("coaching_attendance")
        .upsert(
          { user_id: user.id, occurrence_id: occId as string },
          { onConflict: "user_id,occurrence_id", ignoreDuplicates: true },
        );
      if (attErr) throw attErr;
      return occId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coaching-stats"] });
      qc.invalidateQueries({ queryKey: ["coaching-attendance"] });
    },
  });
}

export function useLogReplayView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (occurrenceId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("coaching_replay_views")
        .upsert(
          { user_id: user.id, occurrence_id: occurrenceId },
          { onConflict: "user_id,occurrence_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coaching-stats"] });
      qc.invalidateQueries({ queryKey: ["coaching-replays-available"] });
    },
  });
}

export function useAvailableReplays() {
  return useQuery({
    queryKey: ["coaching-replays-available"],
    queryFn: async (): Promise<AvailableReplay[]> => {
      const now = new Date();
      const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 86_400_000).toISOString();
      const [{ data, error }, slots] = await Promise.all([
        supabase
          .from("coaching_occurrences")
          .select("*")
          .not("replay_url", "is", null)
          .gte("started_at", thirtyDaysAgoIso)
          .order("started_at", { ascending: false }),
        fetchActiveCoachingSlots(),
      ]);
      if (error) throw error;
      return ((data ?? []) as CoachingOccurrenceRow[]).map((row) => ({
        ...row,
        slot: slots.find((s) => s.id === row.slot_id) ?? null,
      }));
    },
  });
}

function countPastOccurrencesInWindow(
  slots: CoachingSlot[],
  days: number,
  now: Date = new Date(),
): number {
  const sinceMs = now.getTime() - days * 86_400_000;
  const DAYS_ORDER = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ] as const;
  let count = 0;
  for (const slot of slots) {
    const targetDow = DAYS_ORDER.indexOf(slot.day);
    for (let back = 0; back <= days + 7; back++) {
      const candidate = new Date(now.getTime() - back * 86_400_000);
      if (candidate.getDay() !== targetDow) continue;
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Paris",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      const today = new Date(candidate);
      today.setHours(slot.hour, slot.minute, 0, 0);
      const endMs = today.getTime() + slot.durationMinutes * 60_000;
      if (endMs > now.getTime()) continue;
      if (endMs < sinceMs) break;
      count++;
      // suppress unused warning
      void fmt;
    }
  }
  return count;
}

export interface MyCoachingStats {
  periodDays: number;
  eligibleCount: number;
  attendedCount: number;
  replayViewsCount: number;
  attendanceRate: number;
}

export function useMyCoachingStats(periodDays: number = 30) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["coaching-stats", userId, periodDays],
    enabled: !!userId,
    queryFn: async (): Promise<MyCoachingStats> => {
      const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();
      const [{ data: attRows, error: attErr }, { data: viewRows, error: viewErr }, slots] =
        await Promise.all([
          supabase
            .from("coaching_attendance")
            .select("occurrence:coaching_occurrences!inner(started_at)")
            .eq("user_id", userId!)
            .gte("occurrence.started_at", since),
          supabase
            .from("coaching_replay_views")
            .select("occurrence:coaching_occurrences!inner(started_at)")
            .eq("user_id", userId!)
            .gte("occurrence.started_at", since),
          fetchActiveCoachingSlots(),
        ]);
      if (attErr) throw attErr;
      if (viewErr) throw viewErr;
      const eligibleCount = countPastOccurrencesInWindow(slots, periodDays);
      const attendedCount = (attRows ?? []).length;
      const replayViewsCount = (viewRows ?? []).length;
      const attendanceRate =
        eligibleCount > 0
          ? Math.round((attendedCount / eligibleCount) * 100)
          : 0;
      return { periodDays, eligibleCount, attendedCount, replayViewsCount, attendanceRate };
    },
  });
}
