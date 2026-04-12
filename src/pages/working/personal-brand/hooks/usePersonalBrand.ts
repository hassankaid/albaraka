import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildBioPrompt, extractProfilesJson, PROFILE_BATCHES } from "../lib/buildPrompts";
import type { BrandAnswers } from "../lib/sections";

export interface GeneratedProfile {
  style: string;
  username: string;
  profileName: string;
  lines: string[];
}

export interface PersonalBrandRow {
  user_id: string;
  answers: BrandAnswers;
  generated_profiles: GeneratedProfile[] | null;
  profiles_generated_at: string | null;
  updated_at: string;
  created_at: string;
}

export function usePersonalBrand() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["personal-brand", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PersonalBrandRow | null> => {
      const { data, error } = await supabase
        .from("user_personal_brand")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PersonalBrandRow) ?? null;
    },
  });
}

export function useSaveBrand() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (answers: BrandAnswers) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_personal_brand")
        .upsert(
          {
            user_id: user.id,
            answers: answers as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
    },
  });
}

export function useGenerateProfiles() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (answers: BrandAnswers): Promise<GeneratedProfile[]> => {
      if (!user) throw new Error("Not authenticated");
      const base = buildBioPrompt(answers);
      const calls = PROFILE_BATCHES.map((extraInstruction) => {
        const prompt = base.replace(
          "Génère 5 profils",
          `Génère 5 profils (${extraInstruction})`
        );
        return supabase.functions
          .invoke<{ response: string }>("claude-content-generator", { body: { prompt } })
          .then((res) => {
            if (res.error) throw res.error;
            const raw = (res.data?.response as string) || "";
            return extractProfilesJson(raw) as GeneratedProfile[];
          });
      });
      const batches = await Promise.all(calls);
      const profiles = batches.flat();

      // Persister
      await supabase
        .from("user_personal_brand")
        .upsert(
          {
            user_id: user.id,
            answers: answers as any,
            generated_profiles: profiles as any,
            profiles_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      return profiles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
    },
  });
}
