import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import type { WeekPlan, Answers, CoachingSlot } from "../lib/generatePlanning";
import type { DayName } from "../lib/predefinedTasks";

// Map BDD group_coaching_recurrences → CoachingSlot (pour le moteur)
function dayFromIso(iso: string): DayName {
  // Convertit l'ISO (timestamptz) en nom de jour en Europe/Paris
  const d = new Date(iso);
  // toLocaleDateString en fr-FR retourne "lundi 13 avril 2026" ; on mappe.
  const days: DayName[] = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  // Approximation simple : on suppose que la TZ du user est proche de Paris (on n'a pas mieux)
  return days[d.getDay()];
}
function hmFromIso(iso: string): { h: number; m: number } {
  const d = new Date(iso);
  return { h: d.getHours(), m: d.getMinutes() };
}

export function useCoachingSlots() {
  return useQuery({
    queryKey: ["organisation", "coaching-slots"],
    queryFn: async (): Promise<CoachingSlot[]> => {
      const { data, error } = await supabase
        .from("group_coaching_recurrences")
        .select("id, title, description, start_at, duration_minutes")
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => {
        const { h, m } = hmFromIso(r.start_at);
        return {
          id: r.id,
          day: dayFromIso(r.start_at),
          h,
          m,
          dur: r.duration_minutes,
          label: `🎓 ${r.title}`,
          desc: r.description ?? undefined,
        };
      });
    },
  });
}

export function useOrganisationProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["organisation", "profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_organisation_profile")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLatestOrganisationPlan() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["organisation", "latest-plan", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_organisation_plans")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveOrganisation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { passLevel } = useUserPass();

  return useMutation({
    mutationFn: async (input: {
      answers: Answers;
      plan: WeekPlan;
      selectedRecurrenceIds?: string[];
      commit?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const pack = passLevel === "liberty" ? "liberty" : "al_baraka";

      // Upsert profile
      const profilePatch: any = {
        user_id: user.id,
        pack,
        answers: input.answers as any,
        updated_at: new Date().toISOString(),
      };
      if (input.commit) profilePatch.committed_at = new Date().toISOString();

      const { error: profileErr } = await supabase
        .from("user_organisation_profile")
        .upsert(profilePatch, { onConflict: "user_id" });
      if (profileErr) throw profileErr;

      // Insert new plan version
      const { data: versionData, error: versionErr } = await supabase.rpc(
        "next_organisation_plan_version",
        { p_user_id: user.id }
      );
      if (versionErr) throw versionErr;
      const version = Number(versionData ?? 1);

      const { data, error } = await supabase
        .from("user_organisation_plans")
        .insert({
          user_id: user.id,
          version,
          pack,
          plan: input.plan as any,
          selected_recurrence_ids: input.selectedRecurrenceIds ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organisation"] });
    },
  });
}
