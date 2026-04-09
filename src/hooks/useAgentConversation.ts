import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
type AgentContextType = string;

export interface AgentConversation {
  id: string;
  user_id: string;
  title: string | null;
  context_type: AgentContextType;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function useAgentConversationsList(limit: number = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-conversations", "list", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("agent_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as AgentConversation[];
    },
    enabled: !!user?.id,
  });
}

export function useAgentConversation(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-conversations", "detail", id],
    queryFn: async () => {
      if (!id || !user?.id) return null;

      const { data: conv, error: convError } = await (supabase as any)
        .from("agent_conversations")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (convError) throw convError;
      if (!conv) return null;

      const { data: messages, error: msgError } = await (supabase as any)
        .from("agent_messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (msgError) throw msgError;

      return {
        conversation: conv as AgentConversation,
        messages: (messages || []) as AgentMessage[],
      };
    },
    enabled: !!id && !!user?.id,
  });
}

export function useCreateAgentConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { title: string; context_type: AgentContextType }) => {
      if (!user?.id) throw new Error("Utilisateur non connecté");
      const { data, error } = await (supabase as any)
        .from("agent_conversations")
        .insert({
          user_id: user.id,
          title: input.title,
          context_type: input.context_type,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AgentConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-conversations"] });
    },
  });
}

export function useAppendAgentMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      conversation_id: string;
      role: "user" | "assistant";
      content: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from("agent_messages")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as AgentMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["agent-conversations", "detail", data.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["agent-conversations", "list"] });
    },
  });
}

export function useDeleteAgentConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("agent_conversations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-conversations"] });
    },
  });
}

export function useRenameAgentConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const { data, error } = await (supabase as any)
        .from("agent_conversations")
        .update({ title: input.title })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as AgentConversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["agent-conversations", "detail", data.id],
      });
    },
  });
}

export async function callAgentProspect(
  messages: { role: "user" | "assistant"; content: string }[],
  contextType: AgentContextType
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("claude-agent-prospect", {
    body: { messages, context_type: contextType },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.response || "";
}
