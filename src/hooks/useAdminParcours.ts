import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParcoursRow {
  id: string;
  slug: string;
  titre: string;
  pass_type: string;
  subtitle: string | null;
  status: string;
  ordre: number;
  created_at: string;
}

export interface ParcoursPhaseRow {
  id: string;
  parcours_id: string;
  numero: number;
  titre: string;
  emoji: string | null;
  description: string | null;
  ordre: number;
  status: string;
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
        .order("ordre", { ascending: true });
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
      // Couvre admin-parcours-list + admin-parcours + parcours (vue élève) :
      // publier/renommer un chapitre doit rafraîchir la vue élève.
      invalidateParcours(qc);
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

/* -------------------------------------------------------------------------- */
/*  Mutations admin : parcours / phases / chapitres (CEO only via RLS)         */
/* -------------------------------------------------------------------------- */

// Invalide à la fois les vues admin (liste + détail) et la vue élève (useParcours).
function invalidateParcours(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-parcours-list"] });
  qc.invalidateQueries({ queryKey: ["admin-parcours"] });
  qc.invalidateQueries({ queryKey: ["parcours"] });
}

// ── Parcours ──────────────────────────────────────────────────────────────
export function useCreateParcours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      titre: string;
      slug: string;
      pass_type: string;
      subtitle?: string | null;
    }): Promise<string> => {
      const { data: maxRow } = await (supabase as any)
        .from("parcours")
        .select("ordre")
        .order("ordre", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrdre = (maxRow?.ordre ?? -1) + 1;
      const { data, error } = await (supabase as any)
        .from("parcours")
        .insert({
          titre: input.titre,
          slug: input.slug,
          pass_type: input.pass_type,
          subtitle: input.subtitle ?? null,
          status: "draft", // jamais publié automatiquement
          ordre: nextOrdre,
        })
        .select("slug")
        .single();
      if (error) throw error;
      return data.slug as string;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

export function useUpdateParcours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: { id: string } & Partial<
        Pick<ParcoursRow, "slug" | "titre" | "subtitle" | "pass_type" | "status" | "ordre">
      >,
    ) => {
      const { id, ...rest } = patch;
      const { error } = await (supabase as any).from("parcours").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

export function useDeleteParcours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // FK ON DELETE CASCADE : phases → chapitres → vidéos/ressources/progress.
      const { error } = await (supabase as any).from("parcours").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

// ── Phases ──────────────────────────────────────────────────────────────────
export function useCreatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      parcours_id: string;
      titre: string;
      emoji?: string | null;
      description?: string | null;
    }) => {
      const { data: maxRow } = await (supabase as any)
        .from("parcours_phases")
        .select("numero")
        .eq("parcours_id", input.parcours_id)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = (maxRow?.numero ?? 0) + 1;
      const { error } = await (supabase as any).from("parcours_phases").insert({
        parcours_id: input.parcours_id,
        titre: input.titre,
        emoji: input.emoji ?? null,
        description: input.description ?? null,
        numero: next,
        ordre: next,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

export function useUpdatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: { id: string } & Partial<
        Pick<ParcoursPhaseRow, "titre" | "description"> & { emoji: string | null; status: string }
      >,
    ) => {
      const { id, ...rest } = patch;
      const { error } = await (supabase as any).from("parcours_phases").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

export function useDeletePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("parcours_phases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

export function useReorderPhases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { parcours_id: string; ordered_ids: string[] }) => {
      const { error } = await (supabase as any).rpc("reorder_parcours_phases", {
        p_parcours_id: input.parcours_id,
        p_ordered_ids: input.ordered_ids,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

// ── Chapitres (l'édition d'un chapitre existant = useUpdateParcoursChapitre) ──
export function useCreateChapitre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      phase_id: string;
      titre: string;
      type: "video" | "redirect_formation" | "milestone";
      formation_id?: string | null;
      milestone_message?: string | null;
      milestone_emoji?: string | null;
    }): Promise<string> => {
      const { data: maxRow } = await (supabase as any)
        .from("parcours_chapitres")
        .select("numero")
        .eq("phase_id", input.phase_id)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = (maxRow?.numero ?? 0) + 1;
      // Respecte la contrainte chapitre_type_coherent :
      //   redirect_formation → formation_id requis ; milestone → message requis.
      const row: Record<string, unknown> = {
        phase_id: input.phase_id,
        titre: input.titre,
        type: input.type,
        numero: next,
        ordre: next,
        status: "draft",
      };
      if (input.type === "redirect_formation") {
        row.formation_id = input.formation_id ?? null;
      }
      if (input.type === "milestone") {
        row.milestone_message = input.milestone_message ?? null;
        row.milestone_emoji = input.milestone_emoji ?? null;
      }
      const { data, error } = await (supabase as any)
        .from("parcours_chapitres")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

export function useDeleteChapitre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("parcours_chapitres").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}

export function useReorderChapitres() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { phase_id: string; ordered_ids: string[] }) => {
      const { error } = await (supabase as any).rpc("reorder_parcours_chapitres", {
        p_phase_id: input.phase_id,
        p_ordered_ids: input.ordered_ids,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateParcours(qc),
  });
}
