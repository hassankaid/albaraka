import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";

export type FeatureKey =
  | "quiz_organisation"
  | "working_activity"
  | "quiz_lead_magnet"
  | "payment_links";

// Ouverts à tout pass actif dès l'achat, sans attendre la fin d'une partie du
// parcours (CGV du 02/11/2026 : « la totalité des outils dès l'ouverture de
// l'accès », décision 1A de Sidali). Mon Activité couvre aussi l'Agent IA Setting.
export const OUVERTS_AVEC_LE_PASS: FeatureKey[] = ["working_activity", "quiz_organisation"];

export function useFeatureUnlocks() {
  const { user } = useAuth();
  const { hasAnyPass, isLoading: passLoading } = useUserPass();
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
    isLoading: query.isLoading || passLoading,
    has: (key: FeatureKey) =>
      unlocked.has(key) || (hasAnyPass && OUVERTS_AVEC_LE_PASS.includes(key)),
  };
}
