import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FeatureKey = "quiz_organisation" | "working_activity";

export function useFeatureUnlocks() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["feature-unlocks", userId],
    enabled: !!userId,
    queryFn: async (): Promise<FeatureKey[]> => {
      const { data, error } = await supabase
        .from("user_feature_unlocks")
        .select("feature")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.feature as FeatureKey);
    },
  });

  const unlocked = new Set(query.data ?? []);
  return {
    isLoading: query.isLoading,
    has: (key: FeatureKey) => unlocked.has(key),
  };
}
