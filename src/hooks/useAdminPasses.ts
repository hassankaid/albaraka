import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PassType, UserPass } from "@/hooks/useUserPass";

export interface UserWithPasses {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  passes: UserPass[];
}

export function useUsersWithPasses(includeRevoked = false) {
  return useQuery({
    queryKey: ["admin-users-with-passes", includeRevoked],
    queryFn: async (): Promise<UserWithPasses[]> => {
      const [{ data: profiles, error: pErr }, { data: passes, error: passErr }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, full_name, role, is_active")
            .in("role", ["apporteur", "collaborateur"])
            .order("full_name", { ascending: true }),
          supabase.from("user_passes").select("*"),
        ]);
      if (pErr) throw pErr;
      if (passErr) throw passErr;

      const byUser = new Map<string, UserPass[]>();
      for (const p of (passes ?? []) as UserPass[]) {
        if (!includeRevoked && p.revoked_at) continue;
        if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
        byUser.get(p.user_id)!.push(p);
      }

      return (profiles ?? []).map((pr) => ({
        id: pr.id,
        email: pr.email,
        full_name: pr.full_name,
        role: pr.role,
        is_active: pr.is_active,
        passes: byUser.get(pr.id) ?? [],
      }));
    },
  });
}

export function useGrantPass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { userId: string; passType: PassType; notes?: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("user_passes")
        .insert({
          user_id: args.userId,
          pass_type: args.passType,
          granted_by: user.id,
          notes: args.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-passes"] });
      queryClient.invalidateQueries({ queryKey: ["user-passes", vars.userId] });
    },
  });
}

export function useRevokePass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { passId: string; userId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("user_passes")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
        .eq("id", args.passId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-passes"] });
      queryClient.invalidateQueries({ queryKey: ["user-passes", vars.userId] });
    },
  });
}
