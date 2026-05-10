import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  buildBioPrompt,
  parseJsonArrayLenient,
  PROFILE_BATCHES,
  buildWeeklyScriptsPrompt,
  buildWeeklyStoriesPrompt,
  WEEKS,
  type WeeklyContext,
} from "../lib/buildPrompts";
import type { BrandAnswers, BrandMode } from "../lib/sections";

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
  mode: BrandMode | null;
  step1_confirmed_at: string | null;
  step2_confirmed_at: string | null;
  topics_history: string[];
  started_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface WeeklyScript {
  day: number;
  title: string;
  pilier: string;
  objectif: string;
  hook: string;
  valeur: string[] | string;
  cta: string;
  overlay?: string;
  ambiance?: string;
  alt_hooks?: string[];
}

export interface WeeklyStoryDay {
  day: number;
  stories: Array<{ type: string; desc: string }>;
}

export interface PersonalBrandWeekRow {
  id: string;
  user_id: string;
  mode: BrandMode;
  month: string;
  week_num: 1 | 2 | 3 | 4;
  theme: string;
  scripts: WeeklyScript[];
  stories: WeeklyStoryDay[];
  generated_at: string;
  published_at: string | null;
}

// ───── HELPERS ─────────────────────────────────────────────────────────
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

async function callClaude(prompt: string): Promise<string> {
  const res = await supabase.functions.invoke<{ response: string }>(
    "claude-content-generator",
    { body: { prompt } },
  );
  if (res.error) throw res.error;
  return (res.data?.response as string) || "";
}

async function callClaudeWithRetry<T>(
  prompt: string,
  parser: (raw: string) => T,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const raw = await callClaude(prompt);
      return parser(raw);
    } catch (e) {
      lastErr = e;
      console.warn(`[claude] attempt ${attempt}/${maxAttempts} failed:`, e);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }
  throw lastErr ?? new Error("Tous les essais ont échoué");
}

// ───── QUERIES ─────────────────────────────────────────────────────────
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

export function useBrandWeeks(month?: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const m = month ?? currentMonth();
  return useQuery({
    queryKey: ["personal-brand-weeks", userId, m],
    enabled: !!userId,
    queryFn: async (): Promise<PersonalBrandWeekRow[]> => {
      const { data, error } = await supabase
        .from("personal_brand_weeks")
        .select("*")
        .eq("user_id", userId!)
        .eq("month", m)
        .order("week_num", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PersonalBrandWeekRow[];
    },
  });
}

// ───── MUTATIONS ───────────────────────────────────────────────────────
export function useSaveBrand() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { answers: BrandAnswers; mode: BrandMode }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("user_personal_brand").upsert(
        {
          user_id: user.id,
          answers: params.answers as any,
          mode: params.mode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
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
    mutationFn: async (params: {
      answers: BrandAnswers;
      mode: BrandMode;
    }): Promise<GeneratedProfile[]> => {
      if (!user) throw new Error("Not authenticated");
      const base = buildBioPrompt(params.answers, params.mode);
      const calls = PROFILE_BATCHES.map((extra) => {
        const prompt = base.replace("Génère 5 profils", `Génère 5 profils (${extra})`);
        return callClaudeWithRetry(prompt, (raw) =>
          parseJsonArrayLenient<GeneratedProfile>(raw),
        );
      });
      const batches = await Promise.all(calls);
      const profiles = batches.flat();

      await supabase.from("user_personal_brand").upsert(
        {
          user_id: user.id,
          answers: params.answers as any,
          mode: params.mode,
          generated_profiles: profiles as any,
          profiles_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      return profiles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
    },
  });
}

// Confirmation étape 1 (profil Instagram configuré côté lead)
export function useConfirmStep(step: 1 | 2) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const col = step === 1 ? "step1_confirmed_at" : "step2_confirmed_at";
      const { error } = await supabase
        .from("user_personal_brand")
        .update({
          [col]: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
    },
  });
}

// Étape 3 : génération d'une semaine
export function useGenerateWeek() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      weekNum: 1 | 2 | 3 | 4;
      mode: BrandMode;
      basePrompt: string;
      topicsHistory: string[];
    }): Promise<PersonalBrandWeekRow> => {
      if (!user) throw new Error("Not authenticated");
      const month = currentMonth();
      const weekCfg = WEEKS.find((w) => w.num === params.weekNum)!;

      const ctx: WeeklyContext = {
        weekNum: params.weekNum,
        theme: weekCfg.theme,
        focus: weekCfg.focus,
        ctaStyle: weekCfg.ctaStyle,
        arc: weekCfg.arc,
        topicsHistory: params.topicsHistory,
        basePrompt: params.basePrompt,
      };

      // Générer scripts puis stories en séquence (séparés pour fiabilité)
      const scripts = await callClaudeWithRetry(
        buildWeeklyScriptsPrompt(ctx),
        (raw) => parseJsonArrayLenient<WeeklyScript>(raw),
      );
      const stories = await callClaudeWithRetry(
        buildWeeklyStoriesPrompt(ctx),
        (raw) => parseJsonArrayLenient<WeeklyStoryDay>(raw),
      );

      // Insert / upsert la ligne week
      const { data: row, error } = await supabase
        .from("personal_brand_weeks")
        .upsert(
          {
            user_id: user.id,
            mode: params.mode,
            month,
            week_num: params.weekNum,
            theme: weekCfg.theme,
            scripts: scripts as any,
            stories: stories as any,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,mode,month,week_num" },
        )
        .select("*")
        .single();
      if (error) throw error;

      // Mise à jour anti-répétition : extraire les titres et les ajouter
      // dans topics_history (cumulé sur tous les mois).
      const newTopics = scripts
        .map((s: WeeklyScript) => s.title)
        .filter((t): t is string => typeof t === "string" && t.length > 0);
      if (newTopics.length > 0) {
        const updated = Array.from(
          new Set([...(params.topicsHistory || []), ...newTopics]),
        );
        await supabase
          .from("user_personal_brand")
          .update({ topics_history: updated as any, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }

      return row as unknown as PersonalBrandWeekRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand-weeks"] });
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
    },
  });
}

export function useConfirmWeekPublished() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (weekRowId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("personal_brand_weeks")
        .update({ published_at: new Date().toISOString() })
        .eq("id", weekRowId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand-weeks"] });
    },
  });
}
