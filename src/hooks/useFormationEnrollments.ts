import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useFormationEnrollments() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["formation-enrollments", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("formation_enrollments")
        .select("formation_id")
        .eq("user_id", userId!)
        .is("revoked_at", null);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.formation_id));
    },
  });

  return {
    isLoading: query.isLoading,
    has: (formationId: string) => (query.data ?? new Set()).has(formationId),
    enrolledIds: query.data ?? new Set<string>(),
  };
}
