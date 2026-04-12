import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AgentKnowledgeEntry {
  id: string;
  slug: string;
  title: string;
  category: "scripts" | "objections" | "system";
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export function useAgentKnowledgeList() {
  return useQuery({
    queryKey: ["agent-knowledge"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agent_knowledge_base")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as AgentKnowledgeEntry[];
    },
  });
}

export function useUpdateAgentKnowledge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      content?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from("agent_knowledge_base")
        .update({
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
          updated_by: user?.id || null,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as AgentKnowledgeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-knowledge"] });
    },
  });
}
