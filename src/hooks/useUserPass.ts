import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PassType = "al_baraka" | "liberty";
export type PassLevel = "none" | "al_baraka" | "liberty";

export interface UserPass {
  id: string;
  user_id: string;
  pass_type: PassType;
  granted_at: string;
  granted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  notes: string | null;
}

export function useUserPass() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["user-passes", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserPass[]> => {
      const { data, error } = await supabase
        .from("user_passes")
        .select("*")
        .eq("user_id", userId!)
        .is("revoked_at", null);
      if (error) throw error;
      return (data ?? []) as UserPass[];
    },
  });

  const passes = query.data ?? [];
  const hasAlBaraka = passes.some((p) => p.pass_type === "al_baraka");
  const hasLiberty = passes.some((p) => p.pass_type === "liberty");
  const hasAnyPass = hasAlBaraka || hasLiberty;
  const passLevel: PassLevel = hasLiberty ? "liberty" : hasAlBaraka ? "al_baraka" : "none";

  return {
    passes,
    hasAlBaraka,
    hasLiberty,
    hasAnyPass,
    passLevel,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
