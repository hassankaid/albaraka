import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserPass } from "@/hooks/useUserPass";

export interface ManualEnrollment {
  id: string;
  formation_id: string;
  formation_title: string;
  granted_at: string;
  granted_by: string | null;
  notes: string | null;
  revoked_at: string | null;
}

export interface UserAccessRow {
  id: string;
  full_name: string;
  email: string;
  role: "ceo" | "collaborateur" | "apporteur" | string;
  is_active: boolean;
  early_access: boolean;
  onboarding_completed: boolean | null;
  access_opened_at: string | null;
  last_access_sent_at: string | null;
  access_sent_count: number;
  passes: UserPass[];
  manual_enrollments: ManualEnrollment[];
}

export function useAdminTrainingAccess(includeRevoked = false) {
  return useQuery({
    queryKey: ["admin-training-access", includeRevoked],
    queryFn: async (): Promise<UserAccessRow[]> => {
      const [
        { data: profiles, error: pErr },
        { data: passes, error: passErr },
        { data: enrollments, error: enrErr },
      ] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, email, full_name, role, is_active, early_access, onboarding_completed, access_opened_at, last_access_sent_at, access_sent_count")
          .in("role", ["apporteur", "collaborateur", "ceo"])
          .order("full_name", { ascending: true }),
        supabase.from("user_passes").select("*"),
        (supabase as any)
          .from("formation_enrollments")
          .select("id, user_id, formation_id, granted_at, granted_by, notes, revoked_at, source, formation:formations(id, titre)")
          .eq("source", "manual"),
      ]);
      if (pErr) throw pErr;
      if (passErr) throw passErr;
      if (enrErr) throw enrErr;

      const passesByUser = new Map<string, UserPass[]>();
      for (const p of (passes ?? []) as UserPass[]) {
        if (!includeRevoked && p.revoked_at) continue;
        const arr = passesByUser.get(p.user_id) ?? [];
        arr.push(p);
        passesByUser.set(p.user_id, arr);
      }

      const enrollmentsByUser = new Map<string, ManualEnrollment[]>();
      for (const e of (enrollments ?? []) as any[]) {
        if (!includeRevoked && e.revoked_at) continue;
        const row: ManualEnrollment = {
          id: e.id,
          formation_id: e.formation_id,
          formation_title: e.formation?.titre ?? "Formation supprimée",
          granted_at: e.granted_at,
          granted_by: e.granted_by,
          notes: e.notes,
          revoked_at: e.revoked_at,
        };
        const arr = enrollmentsByUser.get(e.user_id) ?? [];
        arr.push(row);
        enrollmentsByUser.set(e.user_id, arr);
      }

      return ((profiles ?? []) as any[]).map((pr: any) => ({
        id: pr.id,
        full_name: pr.full_name ?? "",
        email: pr.email ?? "",
        role: pr.role,
        is_active: !!pr.is_active,
        early_access: !!pr.early_access,
        onboarding_completed: pr.onboarding_completed ?? null,
        access_opened_at: pr.access_opened_at ?? null,
        last_access_sent_at: pr.last_access_sent_at ?? null,
        access_sent_count: pr.access_sent_count ?? 0,
        passes: passesByUser.get(pr.id) ?? [],
        manual_enrollments: (enrollmentsByUser.get(pr.id) ?? []).sort((a, b) =>
          a.formation_title.localeCompare(b.formation_title, "fr", { sensitivity: "base" })
        ),
      }));
    },
  });
}
