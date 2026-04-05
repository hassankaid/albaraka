import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  ContentFormat,
  ContentTheme,
  ContentIdea,
  ContentScript,
  ContentDescription,
  MontageChecklist,
  PublicationChecklist,
} from "@/pages/working/content-wizard/types";

export type ContentPieceStatus = "draft" | "ready" | "scheduled" | "published" | "archived";

export interface ContentPiece {
  id: string;
  user_id: string;
  title: string | null;
  format: ContentFormat;
  theme: ContentTheme;
  status: ContentPieceStatus;
  ideas: ContentIdea[] | null;
  selected_idea: ContentIdea | null;
  script: ContentScript | null;
  description: ContentDescription | null;
  montage_checklist: MontageChecklist;
  publication_checklist: PublicationChecklist;
  scheduled_for: string | null;
  published_at: string | null;
  current_step: number;
  created_at: string;
  updated_at: string;
}

export interface ContentPieceUpsertInput {
  id?: string;
  title?: string | null;
  format: ContentFormat;
  theme: ContentTheme;
  status?: ContentPieceStatus;
  ideas?: ContentIdea[] | null;
  selected_idea?: ContentIdea | null;
  script?: ContentScript | null;
  description?: ContentDescription | null;
  montage_checklist?: MontageChecklist;
  publication_checklist?: PublicationChecklist;
  scheduled_for?: string | null;
  current_step?: number;
}

export function useContentPiece(id: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-pieces", "detail", id],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("content_pieces")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as ContentPiece | null;
    },
    enabled: !!id && !!user?.id,
  });
}

export function useContentPiecesList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-pieces", "list", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("content_pieces")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ContentPiece[];
    },
    enabled: !!user?.id,
  });
}

export function useUpsertContentPiece() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ContentPieceUpsertInput): Promise<ContentPiece> => {
      if (!user?.id) throw new Error("Utilisateur non connecté");

      const payload = {
        ...input,
        user_id: user.id,
      };

      if (input.id) {
        const { data, error } = await (supabase as any)
          .from("content_pieces")
          .update(payload)
          .eq("id", input.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return data as ContentPiece;
      } else {
        const { data, error } = await (supabase as any)
          .from("content_pieces")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data as ContentPiece;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
      queryClient.setQueryData(["content-pieces", "detail", data.id], data);
    },
  });
}

export function useDeleteContentPiece() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Utilisateur non connecté");
      const { error } = await (supabase as any)
        .from("content_pieces")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
    },
  });
}
