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
import { migrateAnswers, type BrandAnswers, type BrandMode } from "../lib/sections";

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
  current_cycle_id: string | null;
  current_cycle_started_at: string | null;
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
  cycle_id: string;
  cycle_started_at: string;
  week_num: 1 | 2 | 3 | 4;
  theme: string;
  scripts: WeeklyScript[];
  stories: WeeklyStoryDay[];
  generated_at: string;
  published_at: string | null;
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
// Une ligne user_personal_brand par (user_id, mode) : un membre Liberty peut
// avoir deux espaces indépendants (mode "pass" + mode "liberty"). Le hook
// prend donc le mode courant en paramètre ; il reste inerte tant que le mode
// n'est pas résolu (null).
export function usePersonalBrand(mode: BrandMode | null) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["personal-brand", userId, mode],
    enabled: !!userId && !!mode,
    queryFn: async (): Promise<PersonalBrandRow | null> => {
      const { data, error } = await supabase
        .from("user_personal_brand")
        .select("*")
        .eq("user_id", userId!)
        .eq("mode", mode!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // Refonte 19/05/2026 : applique le remap silencieux des anciennes
      // valeurs (ex. "Hommes uniquement" → "Hommes", "18-20 ans" → "18-20").
      // Les valeurs vraiment obsolètes (B-rolls, "Setting", etc.) restent en
      // BDD et sont gérées par QuestionBlock via hasDeprecatedValue (bandeau).
      const row = data as unknown as PersonalBrandRow;
      return { ...row, answers: migrateAnswers(row.answers || {}) };
    },
  });
}

// Récupère les semaines du cycle en cours (current_cycle_id sur user_personal_brand).
// Si pas de cycle en cours → liste vide.
export function useBrandWeeks(cycleId: string | null | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["personal-brand-weeks", userId, cycleId],
    enabled: !!userId && !!cycleId,
    queryFn: async (): Promise<PersonalBrandWeekRow[]> => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from("personal_brand_weeks")
        .select("*")
        .eq("user_id", userId!)
        .eq("cycle_id", cycleId)
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
        { onConflict: "user_id,mode" },
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
        { onConflict: "user_id,mode" },
      );

      return profiles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
    },
  });
}

// Confirmation étape 1 / 2 — ciblée sur la ligne (user_id, mode) courante.
export function useConfirmStep(step: 1 | 2, mode: BrandMode) {
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
        .eq("user_id", user.id)
        .eq("mode", mode);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
    },
  });
}

// Étape 3 : génération d'une semaine.
// - Si pas de cycle en cours (ou cycle terminé) → démarre un nouveau cycle
//   en générant un UUID et en sauvegardant current_cycle_id +
//   current_cycle_started_at sur user_personal_brand.
// - Si cycle déjà en cours → on génère dans ce cycle existant.
export function useGenerateWeek() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      weekNum: 1 | 2 | 3 | 4;
      mode: BrandMode;
      basePrompt: string;
      topicsHistory: string[];
      currentCycleId: string | null;     // null si pas de cycle en cours
      currentCycleStartedAt: string | null;
    }): Promise<PersonalBrandWeekRow> => {
      if (!user) throw new Error("Not authenticated");
      const weekCfg = WEEKS.find((w) => w.num === params.weekNum)!;

      // Si nouveau cycle (week_num = 1 et pas de cycle actif OU cycle existant
      // mais on génère une semaine d'un autre cycle) → on génère un nouvel ID.
      // Sinon on utilise le cycle existant.
      const isStartingNewCycle =
        params.weekNum === 1 && !params.currentCycleId;
      const cycleId = isStartingNewCycle
        ? crypto.randomUUID()
        : (params.currentCycleId ?? crypto.randomUUID());
      const cycleStartedAt = isStartingNewCycle
        ? new Date().toISOString()
        : (params.currentCycleStartedAt ?? new Date().toISOString());

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

      // Insert / upsert la ligne week (clé : user, cycle, week_num)
      const { data: row, error } = await supabase
        .from("personal_brand_weeks")
        .upsert(
          {
            user_id: user.id,
            mode: params.mode,
            cycle_id: cycleId,
            cycle_started_at: cycleStartedAt,
            week_num: params.weekNum,
            theme: weekCfg.theme,
            scripts: scripts as any,
            stories: stories as any,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,cycle_id,week_num" },
        )
        .select("*")
        .single();
      if (error) throw error;

      // Mise à jour anti-répétition : extraire les titres et les ajouter
      // dans topics_history (cumulé sur tous les cycles).
      // Si c'est un nouveau cycle, persister aussi current_cycle_id +
      // current_cycle_started_at sur user_personal_brand.
      const newTopics = scripts
        .map((s: WeeklyScript) => s.title)
        .filter((t): t is string => typeof t === "string" && t.length > 0);
      const updatedTopics =
        newTopics.length > 0
          ? Array.from(new Set([...(params.topicsHistory || []), ...newTopics]))
          : null;

      const userUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updatedTopics) userUpdate.topics_history = updatedTopics as any;
      if (isStartingNewCycle) {
        userUpdate.current_cycle_id = cycleId;
        userUpdate.current_cycle_started_at = cycleStartedAt;
      }
      if (Object.keys(userUpdate).length > 1) {
        await supabase
          .from("user_personal_brand")
          .update(userUpdate)
          .eq("user_id", user.id)
          .eq("mode", params.mode);
      }

      return row as unknown as PersonalBrandWeekRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand-weeks"] });
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
    },
  });
}

// Démarrage explicite d'un nouveau cycle (quand le précédent est terminé
// et que l'élève re-confirme étape 1 + étape 2). Reset current_cycle_id
// à null pour que la prochaine génération de S1 crée un nouveau cycle.
// Ciblé sur la ligne (user_id, mode) courante.
export function useStartNewCycle(mode: BrandMode) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_personal_brand")
        .update({
          current_cycle_id: null,
          current_cycle_started_at: null,
          step1_confirmed_at: null,
          step2_confirmed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("mode", mode);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-brand"] });
      queryClient.invalidateQueries({ queryKey: ["personal-brand-weeks"] });
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
