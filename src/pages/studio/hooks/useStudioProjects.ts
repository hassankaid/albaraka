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
