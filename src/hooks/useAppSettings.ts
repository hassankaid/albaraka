import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppSettingKey = "training_coming_soon_enabled";

export function useAppSetting<T = unknown>(key: AppSettingKey) {
  return useQuery({
    queryKey: ["app-settings", key],
    queryFn: async (): Promise<T | null> => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value ?? null) as T | null;
    },
  });
}

export function useSetAppSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { key: AppSettingKey; value: unknown }) => {
      const { error } = await (supabase as any)
        .from("app_settings")
        .upsert(
          { key: args.key, value: args.value as any, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["app-settings", vars.key] });
    },
  });
}
