/** Récupère l'offre Liberty de l'utilisateur (liberty_user_profile) → préremplissage Script Forge. */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildPrefillFromProfile, type PrefillResult } from "./liberty-prefill";

export function useLibertyOffer(userId: string | null | undefined): {
  prefill: PrefillResult | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["script-forge-liberty-offer", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PrefillResult | null> => {
      const { data, error } = await supabase
        .from("liberty_user_profile" as never)
        .select("data")
        .eq("user_id", userId as never)
        .maybeSingle();
      if (error || !data) return null;
      try {
        return buildPrefillFromProfile((data as any).data);
      } catch {
        return null;
      }
    },
  });
  return { prefill: data ?? null, isLoading };
}
