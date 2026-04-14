import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvitationRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  access_opened_at: string | null;
  last_access_sent_at: string | null;
  access_sent_count: number;
}

export function useInvitationsList() {
  return useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async (): Promise<InvitationRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, is_active, access_opened_at, last_access_sent_at, access_sent_count")
        .in("role", ["apporteur", "collaborateur"])
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InvitationRow[];
    },
  });
}

export interface SendAccessResult {
  sent: string[];
  failed: Array<{ user_id: string; error: string }>;
}

export function useSendAccessEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      userIds: string[];
      testMode: boolean;
    }): Promise<SendAccessResult> => {
      const { data, error } = await supabase.functions.invoke(
        "send-apporteur-access-email",
        {
          body: { user_ids: params.userIds, test_mode: params.testMode },
        },
      );
      if (error) throw error;
      return data as SendAccessResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
    },
  });
}
