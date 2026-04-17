import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export interface AccessTimelineEvent {
  event_at: string;
  event_type: string;
  title: string;
  subtitle: string | null;
  performed_by_name: string | null;
  details: Record<string, any>;
}

/** Timeline complète des actions d'accès pour un user (pass, enrollments, invitation_sent, email_changed, early_access). */
export function useAccessTimeline(userId: string | null) {
  return useQuery({
    queryKey: ["access-timeline", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AccessTimelineEvent[]> => {
      const { data, error } = await (supabase as any).rpc("get_user_access_timeline", {
        p_user_id: userId,
      });
      if (error) throw error;
      return (data ?? []) as AccessTimelineEvent[];
    },
  });
}

/** Change l'email d'un user via edge function update-user-email (CEO only). */
export function useUpdateUserEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId: string; newEmail: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expirée, reconnecte-toi.");

      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-user-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: params.userId, new_email: params.newEmail }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      return body as { success: true; old_email: string; new_email: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-training-access"] });
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
      qc.invalidateQueries({ queryKey: ["access-timeline"] });
    },
  });
}

/** Toggle early_access + attribue/révoque pass al_baraka en conséquence + audit log. */
export function useToggleEarlyAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId: string; enable: boolean; performedBy: string }) => {
      const { userId, enable, performedBy } = params;

      // 1) Update profile
      const { error: pErr } = await (supabase as any)
        .from("profiles")
        .update({ early_access: enable })
        .eq("id", userId);
      if (pErr) throw pErr;

      if (enable) {
        // 2a) Grant pass al_baraka si pas déjà actif
        const { data: existing } = await supabase
          .from("user_passes")
          .select("id")
          .eq("user_id", userId)
          .eq("pass_type", "al_baraka")
          .is("revoked_at", null)
          .maybeSingle();
        if (!existing) {
          const { error: passErr } = await supabase.from("user_passes").insert({
            user_id: userId,
            pass_type: "al_baraka",
            notes: "early_access toggle",
            granted_by: performedBy,
          } as any);
          if (passErr) throw passErr;
        }
      }
      // NB: on ne révoque PAS automatiquement le pass al_baraka à la désactivation
      // (cas d'usage : early_access désactivé mais on garde le pass pour accès normal).

      // 3) Audit log
      const { error: auditErr } = await (supabase as any).from("access_audit_log").insert({
        user_id: userId,
        action: enable ? "early_access_granted" : "early_access_revoked",
        details: { auto_grant_pass: enable },
        performed_by: performedBy,
      });
      if (auditErr) console.warn("Audit log failed:", auditErr.message);

      return { userId, enable };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-training-access"] });
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
      qc.invalidateQueries({ queryKey: ["access-timeline"] });
    },
  });
}

/** Wrapper de useSendAccessEmail qui re-fetch après envoi. */
export function useSendAccessInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userIds: string[]; testMode: boolean }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expirée, reconnecte-toi.");
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-apporteur-access-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_ids: params.userIds, test_mode: params.testMode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      return body as {
        sent: string[];
        failed: Array<{ user_id: string; error: string }>;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-training-access"] });
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
      qc.invalidateQueries({ queryKey: ["access-timeline"] });
    },
  });
}
