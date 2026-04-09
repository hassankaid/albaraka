import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TypeAppel = "ads" | "organique" | "transformation";
export type ProspectNiveau = "facile" | "moyen" | "difficile";

export interface ProspectReplique {
  cue: string;
  reponse: string;
}

export interface ProspectProfile {
  id: string;
  emoji: string;
  label: string;
  niveau: ProspectNiveau;
  description: string;
  ordre: number;
  status: string;
}

export interface ProspectScript {
  id: string;
  profile_id: string;
  type_appel: TypeAppel;
  titre: string;
  intro: string;
  repliques: ProspectReplique[];
}

// ─── READ HOOKS ───

export function useProspectProfiles() {
  return useQuery({
    queryKey: ["prospect-profiles"],
    queryFn: async (): Promise<ProspectProfile[]> => {
      const { data, error } = await (supabase as any)
        .from("prospect_profiles")
        .select("*")
        .eq("status", "published")
        .order("ordre");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProspectScripts(profileId: string | null) {
  return useQuery({
    queryKey: ["prospect-scripts", profileId],
    queryFn: async (): Promise<ProspectScript[]> => {
      if (!profileId) return [];
      const { data, error } = await (supabase as any)
        .from("prospect_scripts")
        .select("*")
        .eq("profile_id", profileId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
  });
}

export function useProspectProfileWithScripts(profileId: string | null) {
  return useQuery({
    queryKey: ["prospect-profile-detail", profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data: profile, error: pErr } = await (supabase as any)
        .from("prospect_profiles")
        .select("*")
        .eq("id", profileId)
        .single();
      if (pErr) throw pErr;
      const { data: scripts, error: sErr } = await (supabase as any)
        .from("prospect_scripts")
        .select("*")
        .eq("profile_id", profileId);
      if (sErr) throw sErr;
      return { profile: profile as ProspectProfile, scripts: (scripts || []) as ProspectScript[] };
    },
    enabled: !!profileId,
  });
}

// ─── ADMIN MUTATIONS ───

export function useCreateProspectProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { emoji: string; label: string; niveau: ProspectNiveau; description: string }) => {
      const { data: maxOrdre } = await (supabase as any)
        .from("prospect_profiles")
        .select("ordre")
        .order("ordre", { ascending: false })
        .limit(1)
        .single();
      const { data, error } = await (supabase as any)
        .from("prospect_profiles")
        .insert({ ...input, ordre: (maxOrdre?.ordre ?? -1) + 1, status: "published" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospect-profiles"] }),
  });
}

export function useUpdateProspectProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any)
        .from("prospect_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["prospect-profiles"] });
      qc.invalidateQueries({ queryKey: ["prospect-profile-detail", data.id] });
    },
  });
}

export function useDeleteProspectProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("prospect_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospect-profiles"] }),
  });
}

export function useUpsertProspectScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; profile_id: string; type_appel: TypeAppel; titre: string; intro: string; repliques: ProspectReplique[] }) => {
      if (input.id) {
        const { data, error } = await (supabase as any)
          .from("prospect_scripts")
          .update({ titre: input.titre, intro: input.intro, repliques: input.repliques, updated_at: new Date().toISOString() })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from("prospect_scripts")
          .insert({ profile_id: input.profile_id, type_appel: input.type_appel, titre: input.titre, intro: input.intro, repliques: input.repliques })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["prospect-scripts", data.profile_id] });
      qc.invalidateQueries({ queryKey: ["prospect-profile-detail", data.profile_id] });
    },
  });
}

export function useDeleteProspectScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, profile_id }: { id: string; profile_id: string }) => {
      const { error } = await (supabase as any).from("prospect_scripts").delete().eq("id", id);
      if (error) throw error;
      return { profile_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["prospect-scripts", data.profile_id] });
      qc.invalidateQueries({ queryKey: ["prospect-profile-detail", data.profile_id] });
    },
  });
}
