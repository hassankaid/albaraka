import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Script, ScriptPhase, ObjectionCategory, Objection } from "@/lib/scripts/types";

// ─── READ HOOKS ───

export function useScripts(type: "setting" | "closing") {
  return useQuery({
    queryKey: ["scripts", type],
    queryFn: async (): Promise<Script[]> => {
      const { data: scripts, error } = await (supabase as any)
        .from("scripts")
        .select("*")
        .eq("type", type)
        .eq("status", "published")
        .order("ordre");
      if (error) throw error;

      const scriptIds = (scripts || []).map((s: any) => s.id);
      if (scriptIds.length === 0) return [];

      const { data: phases, error: pErr } = await (supabase as any)
        .from("script_phases")
        .select("*")
        .in("script_id", scriptIds)
        .order("ordre");
      if (pErr) throw pErr;

      return (scripts || []).map((s: any) => ({
        id: s.id,
        nom: s.nom,
        icon: s.icon,
        couleur: s.couleur,
        cat: s.cat,
        description: s.description,
        phases: (phases || [])
          .filter((p: any) => p.script_id === s.id)
          .map((p: any): ScriptPhase => ({
            label: p.label,
            voix: p.voix,
            lines: p.lines || [],
            cases: p.cases || undefined,
            lines2: p.lines2 || undefined,
            cases2: p.cases2 || undefined,
          })),
      })) as Script[];
    },
  });
}

export function useObjectionCategories(type: "setting" | "closing") {
  return useQuery({
    queryKey: ["objection-categories", type],
    queryFn: async (): Promise<ObjectionCategory[]> => {
      const { data: categories, error } = await (supabase as any)
        .from("objection_categories")
        .select("*")
        .eq("type", type)
        .eq("status", "published")
        .order("ordre");
      if (error) throw error;

      const catIds = (categories || []).map((c: any) => c.id);
      if (catIds.length === 0) return [];

      const { data: objections, error: oErr } = await (supabase as any)
        .from("objections")
        .select("*")
        .in("category_id", catIds)
        .order("ordre");
      if (oErr) throw oErr;

      return (categories || []).map((c: any) => ({
        id: c.id,
        label: c.label,
        icon: c.icon,
        objections: (objections || [])
          .filter((o: any) => o.category_id === c.id)
          .map((o: any): Objection => ({
            id: o.id,
            situation: o.situation,
            reponse: o.reponse,
            verbatim: o.verbatim || undefined,
            etapes: o.etapes || undefined,
          })),
      })) as ObjectionCategory[];
    },
  });
}

export function useScriptExtras() {
  return useQuery({
    queryKey: ["script-extras"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("script_extras")
        .select("*");
      if (error) throw error;

      const echelle = (data || []).find((d: any) => d.key === "process_echelle");
      const armes = (data || []).find((d: any) => d.key === "armes_dernier_recours");

      return {
        processEchelle: echelle
          ? { label: echelle.label, etapes: echelle.data as string[] }
          : null,
        armesDernierRecours: armes
          ? { label: armes.label, techniques: armes.data as { nom: string; texte: string }[] }
          : null,
      };
    },
  });
}

// ─── ADMIN HOOKS (mutations) ───

export function useCreateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nom: string; icon: string; couleur: string; cat: string; type: string; description: string }) => {
      const { data: maxOrdre } = await (supabase as any).from("scripts").select("ordre").eq("type", input.type).order("ordre", { ascending: false }).limit(1).single();
      const { data, error } = await (supabase as any).from("scripts").insert({ ...input, ordre: (maxOrdre?.ordre ?? -1) + 1 }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

export function useUpdateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any).from("scripts").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

export function useDeleteScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("scripts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

// ─── PHASE MUTATIONS ───

export function useScriptWithPhases(scriptId: string | null) {
  return useQuery({
    queryKey: ["script-detail", scriptId],
    queryFn: async () => {
      if (!scriptId) return null;
      const { data: script, error } = await (supabase as any).from("scripts").select("*").eq("id", scriptId).single();
      if (error) throw error;
      const { data: phases, error: pErr } = await (supabase as any).from("script_phases").select("*").eq("script_id", scriptId).order("ordre");
      if (pErr) throw pErr;
      return { script, phases: phases || [] };
    },
    enabled: !!scriptId,
  });
}

export function useCreatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { script_id: string; label: string; voix: string; lines: string[]; cases?: any; lines2?: string[]; cases2?: any }) => {
      const { data: maxOrdre } = await (supabase as any).from("script_phases").select("ordre").eq("script_id", input.script_id).order("ordre", { ascending: false }).limit(1).single();
      const { data, error } = await (supabase as any).from("script_phases").insert({ ...input, ordre: (maxOrdre?.ordre ?? -1) + 1 }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["script-detail", data.script_id] });
      qc.invalidateQueries({ queryKey: ["scripts"] });
    },
  });
}

export function useUpdatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; script_id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any).from("script_phases").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["script-detail", data.script_id] });
      qc.invalidateQueries({ queryKey: ["scripts"] });
    },
  });
}

export function useDeletePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, script_id }: { id: string; script_id: string }) => {
      const { error } = await (supabase as any).from("script_phases").delete().eq("id", id);
      if (error) throw error;
      return { script_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["script-detail", data.script_id] });
      qc.invalidateQueries({ queryKey: ["scripts"] });
    },
  });
}

export function useReorderPhases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ script_id, phase_ids }: { script_id: string; phase_ids: string[] }) => {
      const { error } = await (supabase as any).rpc("reorder_script_phases", { p_script_id: script_id, p_phase_ids: phase_ids });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["script-detail", variables.script_id] });
      qc.invalidateQueries({ queryKey: ["scripts"] });
    },
  });
}

// ─── OBJECTION CATEGORY MUTATIONS ───

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; icon: string; type: string }) => {
      const { data: maxOrdre } = await (supabase as any).from("objection_categories").select("ordre").eq("type", input.type).order("ordre", { ascending: false }).limit(1).single();
      const { data, error } = await (supabase as any).from("objection_categories").insert({ ...input, ordre: (maxOrdre?.ordre ?? -1) + 1 }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objection-categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any).from("objection_categories").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objection-categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("objection_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objection-categories"] }),
  });
}

// ─── OBJECTION MUTATIONS ───

export function useCreateObjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { category_id: string; situation: string; reponse: string; verbatim?: string; etapes?: string[] }) => {
      const { data: maxOrdre } = await (supabase as any).from("objections").select("ordre").eq("category_id", input.category_id).order("ordre", { ascending: false }).limit(1).single();
      const { data, error } = await (supabase as any).from("objections").insert({ ...input, ordre: (maxOrdre?.ordre ?? -1) + 1 }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objection-categories"] }),
  });
}

export function useUpdateObjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any).from("objections").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objection-categories"] }),
  });
}

export function useDeleteObjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("objections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objection-categories"] }),
  });
}
