import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export interface InvitationRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  onboarding_completed: boolean | null;
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
        .select("id, full_name, email, role, is_active, onboarding_completed, access_opened_at, last_access_sent_at, access_sent_count")
        .in("role", ["apporteur", "collaborateur"])
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InvitationRow[];
    },
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          access_opened_at: null,
          last_access_sent_at: null,
          access_sent_count: 0,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expirée, reconnecte-toi.");

      const url = `${SUPABASE_URL}/functions/v1/send-apporteur-access-email`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_ids: params.userIds, test_mode: params.testMode }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return JSON.parse(text) as SendAccessResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
    },
  });
}
