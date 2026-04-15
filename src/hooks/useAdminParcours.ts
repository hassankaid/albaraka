import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParcoursRow {
  id: string;
  slug: string;
  titre: string;
  pack: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface ParcoursPhaseRow {
  id: string;
  parcours_id: string;
  numero: number;
  titre: string;
  description: string | null;
  ordre: number;
}

export interface ParcoursChapitreRow {
  id: string;
  phase_id: string;
  numero: number;
  titre: string;
  type: "video" | "redirect_formation" | "milestone";
  ordre: number;
  vimeo_id: string | null;
  video_url: string | null;
  duree_estimee_minutes: number | null;
  description: string | null;
  formation_id: string | null;
  milestone_message: string | null;
  milestone_emoji: string | null;
  status: string;
}

export interface ParcoursVideoRow {
  id: string;
  chapitre_id: string;
  titre: string;
  url: string | null;
  vimeo_id: string | null;
  notes: string | null;
  duree_secondes: number | null;
  ordre: number;
}

export interface ParcoursRessourceRow {
  id: string;
  chapitre_id: string;
  video_id: string | null;
  titre: string;
  type: "pdf" | "image" | "link";
  url: string;
  ordre: number;
}

export function useAllParcours() {
  return useQuery({
    queryKey: ["admin-parcours-list"],
    queryFn: async (): Promise<ParcoursRow[]> => {
      const { data, error } = await (supabase as any)
        .from("parcours")
        .select("*")
        .order("pack", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ParcoursRow[];
    },
  });
}

export function useParcoursBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["admin-parcours", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: parcours, error: pErr } = await (supabase as any)
        .from("parcours")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (pErr) throw pErr;

      const { data: phases, error: phErr } = await (supabase as any)
        .from("parcours_phases")
        .select("*")
        .eq("parcours_id", parcours.id)
        .order("ordre", { ascending: true });
      if (phErr) throw phErr;

      const phaseIds = (phases ?? []).map((p: any) => p.id);
      const { data: chapitres, error: cErr } = await (supabase as any)
        .from("parcours_chapitres")
        .select("*")
        .in("phase_id", phaseIds)
        .order("ordre", { ascending: true });
      if (cErr) throw cErr;

      return {
        parcours: parcours as ParcoursRow,
        phases: (phases ?? []) as ParcoursPhaseRow[],
        chapitres: (chapitres ?? []) as ParcoursChapitreRow[],
      };
    },
  });
}

export function useParcoursChapitre(chapitreId: string | undefined) {
  return useQuery({
    queryKey: ["admin-parcours-chapitre", chapitreId],
    enabled: !!chapitreId,
    queryFn: async () => {
      const [chapRes, videosRes, ressRes] = await Promise.all([
        (supabase as any).from("parcours_chapitres").select("*").eq("id", chapitreId!).single(),
        (supabase as any).from("parcours_chapitre_videos").select("*").eq("chapitre_id", chapitreId!).order("ordre"),
        (supabase as any).from("parcours_chapitre_ressources").select("*").eq("chapitre_id", chapitreId!).order("ordre"),
      ]);
      if (chapRes.error) throw chapRes.error;
      if (videosRes.error) throw videosRes.error;
      if (ressRes.error) throw ressRes.error;
      return {
        chapitre: chapRes.data as ParcoursChapitreRow,
        videos: (videosRes.data ?? []) as ParcoursVideoRow[],
        ressources: (ressRes.data ?? []) as ParcoursRessourceRow[],
      };
    },
  });
}

export function useUpdateParcoursChapitre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ParcoursChapitreRow> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await (supabase as any).from("parcours_chapitres").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-parcours-chapitre", variables.id] });
      qc.invalidateQueries({ queryKey: ["admin-parcours"] });
    },
  });
}

export function useUpsertParcoursVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (video: Partial<ParcoursVideoRow> & { chapitre_id: string }) => {
      if (video.id) {
        const { id, ...rest } = video;
        const { error } = await (supabase as any).from("parcours_chapitre_videos").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await (supabase as any)
        .from("parcours_chapitre_videos")
        .insert(video)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-parcours-chapitre", variables.chapitre_id] });
      qc.invalidateQueries({ queryKey: ["parcours-chapitre-content", variables.chapitre_id] });
    },
  });
}

export function useDeleteParcoursVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; chapitre_id: string }) => {
      const { error } = await (supabase as any).from("parcours_chapitre_videos").delete().eq("id", params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-parcours-chapitre", variables.chapitre_id] });
      qc.invalidateQueries({ queryKey: ["parcours-chapitre-content", variables.chapitre_id] });
    },
  });
}

export function useUpsertParcoursRessource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (res: Partial<ParcoursRessourceRow> & { chapitre_id: string }) => {
      if (res.id) {
        const { id, ...rest } = res;
        const { error } = await (supabase as any).from("parcours_chapitre_ressources").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await (supabase as any)
        .from("parcours_chapitre_ressources")
        .insert(res)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-parcours-chapitre", variables.chapitre_id] });
      qc.invalidateQueries({ queryKey: ["parcours-chapitre-content", variables.chapitre_id] });
    },
  });
}

export function useDeleteParcoursRessource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; chapitre_id: string }) => {
      const { error } = await (supabase as any).from("parcours_chapitre_ressources").delete().eq("id", params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-parcours-chapitre", variables.chapitre_id] });
      qc.invalidateQueries({ queryKey: ["parcours-chapitre-content", variables.chapitre_id] });
    },
  });
}

export function useFormationsForSelect() {
  return useQuery({
    queryKey: ["formations-for-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("id, titre, slug")
        .order("titre", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; titre: string; slug: string }>;
    },
  });
}
