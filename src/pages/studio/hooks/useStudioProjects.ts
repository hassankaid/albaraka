import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  PersonalBrandSourceRef,
  StudioProject,
  StudioProjectSource,
} from "../types";

/**
 * Hooks TanStack Query pour Studio Albaraka (Brique B1).
 *
 * - useStudioProjects() : liste mes projets (RLS owner ou CEO)
 * - useStudioProject(id) : détail d'un projet
 * - useCreateStudioProject() : créer un nouveau projet (manual ou depuis PB)
 */

const PROJECTS_KEY = ["studio", "projects"] as const;
const PROJECT_KEY = (id: string) => ["studio", "project", id] as const;

export function useStudioProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...PROJECTS_KEY, user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async (): Promise<StudioProject[]> => {
      const { data, error } = await (supabase as any)
        .from("studio_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudioProject[];
    },
  });
}

export function useStudioProject(id: string | undefined) {
  return useQuery({
    queryKey: id ? PROJECT_KEY(id) : ["studio", "project", "none"],
    enabled: !!id,
    queryFn: async (): Promise<StudioProject | null> => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("studio_projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return (data as StudioProject | null) ?? null;
    },
  });
}

export interface CreateStudioProjectInput {
  title?: string;
  source: StudioProjectSource;
  source_personal_brand?: PersonalBrandSourceRef | null;
  script_text?: string | null;
}

export function useCreateStudioProject() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStudioProjectInput): Promise<StudioProject> => {
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await (supabase as any)
        .from("studio_projects")
        .insert({
          user_id: user.id,
          title: input.title ?? null,
          status: "draft",
          source: input.source,
          source_personal_brand: input.source_personal_brand ?? null,
          script_text: input.script_text ?? null,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as StudioProject;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useDeleteStudioProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("studio_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/**
 * Update partiel d'un projet. Utilisé pour :
 *   - sauvegarder le script_text (auto-save debounced — B2)
 *   - mettre à jour audio_path / audio_duration_seconds (B2)
 *   - changer le statut (audio_uploaded, transcribed, ...)
 *   - mettre à jour title, error_message, etc.
 */
export function useUpdateStudioProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<StudioProject>;
    }): Promise<StudioProject> => {
      const { data, error } = await (supabase as any)
        .from("studio_projects")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as StudioProject;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: PROJECT_KEY(data.id) });
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/**
 * Déclenche la transcription Whisper du projet (B3). Appelle l'edge function
 * `studio-transcribe` qui télécharge l'audio, l'envoie à OpenAI Whisper,
 * découpe en segments 3-6s, et UPDATE la row avec transcript + segments + statut.
 */
export function useTriggerTranscription() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      projectId: string,
    ): Promise<{
      segments: Array<{ idx: number; start_ms: number; end_ms: number; text: string }>;
      text: string;
      duration: number;
      language: string;
      nb_segments: number;
      cost_cents: number;
    }> => {
      const { data, error } = await supabase.functions.invoke(
        "studio-transcribe",
        { body: { project_id: projectId } },
      );
      if (error) {
        // Quand l'edge function renvoie un non-2xx, le client Supabase met
        // data=null et error=FunctionsHttpError dont .message est générique
        // ("Edge Function returned a non-2xx status code"). Le vrai message
        // est dans error.context (Response), qu'on parse manuellement.
        let msg = error.message ?? "Transcription échouée";
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } catch {
            // Body pas JSON — on garde le message générique
          }
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, projectId) => {
      qc.invalidateQueries({ queryKey: PROJECT_KEY(projectId) });
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/**
 * Planifie les N prompts visuels en UN SEUL appel Claude (B4 v5).
 * Garantit la cohérence narrative entre segments (même protagoniste,
 * même style visuel). Persiste les prompts dans segments_json[i].broll_prompt
 * AVANT la génération vidéo. L'élève peut alors les éditer avant de cliquer
 * "Tout générer".
 */
export function usePlanBrolls() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      projectId: string,
    ): Promise<{
      protagonist: string;
      visual_style: string;
      prompts: string[];
      nb_segments: number;
    }> => {
      const { data, error } = await supabase.functions.invoke(
        "studio-plan-brolls",
        { body: { project_id: projectId } },
      );
      if (error) {
        let msg = error.message ?? "Planification échouée";
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } catch {
            // ignore
          }
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, projectId) => {
      qc.invalidateQueries({ queryKey: PROJECT_KEY(projectId) });
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/**
 * B4 v7 — Génère un GROUPE de b-rolls en multi-shot Kling 3.0.
 * Au lieu de N appels isolés, on lance un seul appel pour N segments
 * (jusqu'à 6) qui produit UNE vidéo cohérente. Tous les segments du
 * groupe partagent le même broll_path avec des offsets différents.
 */
export function useGenerateBrollMultishot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      segmentIndices,
    }: {
      projectId: string;
      segmentIndices: number[];
    }): Promise<{
      broll_path: string;
      segments: Array<{ idx: number; start_ms: number; end_ms: number }>;
      actual_duration_s: number | null;
      all_ready: boolean;
    }> => {
      const { data, error } = await supabase.functions.invoke(
        "studio-generate-broll-multishot",
        { body: { project_id: projectId, segment_indices: segmentIndices } },
      );
      if (error) {
        let msg = error.message ?? "Génération multi-shot échouée";
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } catch {
            // ignore
          }
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: PROJECT_KEY(vars.projectId) });
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/**
 * Génère un b-roll pour UN segment (B4). Appelle l'edge function
 * `studio-generate-broll` qui orchestre Claude (prompt visuel) + fal.ai Seedance
 * (clip 9:16) + upload Storage + UPDATE segments_json[idx].
 *
 * Coût : ~$0.05 par clip 720p 5s + ~$0.001 prompt Claude.
 * Durée : ~30-90s par segment (variable selon charge fal.ai).
 */
export function useGenerateBroll() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      segmentIdx,
    }: {
      projectId: string;
      segmentIdx: number;
    }): Promise<{
      segment_idx: number;
      broll_path: string;
      broll_prompt: string;
      seed: number | null;
      all_ready: boolean;
      new_status: string;
    }> => {
      const { data, error } = await supabase.functions.invoke(
        "studio-generate-broll",
        { body: { project_id: projectId, segment_idx: segmentIdx } },
      );
      if (error) {
        let msg = error.message ?? "Génération b-roll échouée";
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } catch {
            // ignore parsing error, keep generic message
          }
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: PROJECT_KEY(vars.projectId) });
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/**
 * Génère une URL signée temporaire pour lire un fichier du bucket `studio`.
 * Cache de 1h côté front (suffisant pour une session d'édition).
 */
export function useStudioSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["studio", "signed-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000, // 50 min : un peu avant l'expiration 1h Supabase
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("studio")
        .createSignedUrl(path, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}
