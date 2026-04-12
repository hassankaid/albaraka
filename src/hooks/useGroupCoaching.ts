import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type MeetingProvider = "zoom" | "meet" | "teams" | "other";
export type GroupSessionStatus = "scheduled" | "live" | "completed" | "cancelled";
export type RecurrenceFrequency = "none" | "weekly" | "biweekly" | "monthly";

export interface GroupSession {
  id: string;
  recurrence_id: string | null;
  title: string;
  description: string | null;
  coach_user_id: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_provider: MeetingProvider;
  meeting_url: string | null;
  status: GroupSessionStatus;
  created_by: string | null;
  coach?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface CreateSessionInput {
  title: string;
  description?: string | null;
  coach_user_id: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_provider: MeetingProvider;
  meeting_url?: string | null;
  recurrence: {
    frequency: RecurrenceFrequency;
    end_at?: string | null;
  };
}

const HORIZON_MONTHS = 6;

function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function useGroupSessions(range: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ["group-sessions", range.from.toISOString(), range.to.toISOString()],
    queryFn: async (): Promise<GroupSession[]> => {
      const { data, error } = await supabase
        .from("group_coaching_sessions")
        .select(
          "id, recurrence_id, title, description, coach_user_id, scheduled_at, duration_minutes, meeting_provider, meeting_url, status, created_by, coach:profiles!group_coaching_sessions_coach_user_id_fkey(id, full_name, avatar_url)"
        )
        .gte("scheduled_at", range.from.toISOString())
        .lte("scheduled_at", range.to.toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as GroupSession[];
    },
  });
}

export function useCreateGroupSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      if (!user) throw new Error("Not authenticated");

      if (input.recurrence.frequency === "none") {
        const { data, error } = await supabase
          .from("group_coaching_sessions")
          .insert({
            title: input.title,
            description: input.description ?? null,
            coach_user_id: input.coach_user_id,
            scheduled_at: input.scheduled_at,
            duration_minutes: input.duration_minutes,
            meeting_provider: input.meeting_provider,
            meeting_url: input.meeting_url ?? null,
            status: "scheduled",
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        return { session: data, recurrence: null, inserted: 1 };
      }

      // Create recurrence + generate occurrences
      const { data: recurrence, error: recErr } = await supabase
        .from("group_coaching_recurrences")
        .insert({
          title: input.title,
          description: input.description ?? null,
          coach_user_id: input.coach_user_id,
          frequency: input.recurrence.frequency,
          start_at: input.scheduled_at,
          end_at: input.recurrence.end_at ?? null,
          duration_minutes: input.duration_minutes,
          meeting_provider: input.meeting_provider,
          meeting_url: input.meeting_url ?? null,
          created_by: user.id,
        })
        .select()
        .single();
      if (recErr) throw recErr;

      const until = input.recurrence.end_at
        ? new Date(input.recurrence.end_at)
        : addMonths(new Date(input.scheduled_at), HORIZON_MONTHS);

      const { data: inserted, error: rpcErr } = await supabase.rpc(
        "generate_recurrence_occurrences",
        {
          p_recurrence_id: recurrence.id,
          p_until: until.toISOString(),
        }
      );
      if (rpcErr) throw rpcErr;

      return { session: null, recurrence, inserted: inserted ?? 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-sessions"] });
    },
  });
}

export interface UpdateSessionInput {
  id: string;
  scope?: "single" | "all_future";
  patch: Partial<Pick<
    GroupSession,
    | "title"
    | "description"
    | "scheduled_at"
    | "duration_minutes"
    | "meeting_provider"
    | "meeting_url"
    | "status"
  >>;
}

export function useUpdateGroupSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scope = "single", patch }: UpdateSessionInput) => {
      if (scope === "single") {
        const { data, error } = await supabase
          .from("group_coaching_sessions")
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // all_future : find recurrence_id + scheduled_at pivot
      const { data: pivot, error: pErr } = await supabase
        .from("group_coaching_sessions")
        .select("recurrence_id, scheduled_at")
        .eq("id", id)
        .single();
      if (pErr) throw pErr;
      if (!pivot.recurrence_id) {
        // not part of a series : fall back to single update
        const { data, error } = await supabase
          .from("group_coaching_sessions")
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("group_coaching_sessions")
        .update(patch)
        .eq("recurrence_id", pivot.recurrence_id)
        .gte("scheduled_at", pivot.scheduled_at)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-sessions"] });
    },
  });
}

export function useCancelGroupSession() {
  const update = useUpdateGroupSession();
  return {
    ...update,
    mutate: (args: { id: string; scope?: "single" | "all_future" }) =>
      update.mutate({ id: args.id, scope: args.scope, patch: { status: "cancelled" } }),
    mutateAsync: (args: { id: string; scope?: "single" | "all_future" }) =>
      update.mutateAsync({ id: args.id, scope: args.scope, patch: { status: "cancelled" } }),
  };
}
