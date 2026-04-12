import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass, type PassType } from "@/hooks/useUserPass";

export type ChapitreType = "video" | "redirect_formation" | "milestone";

export interface ParcoursChapitre {
  id: string;
  phase_id: string;
  numero: number;
  titre: string;
  type: ChapitreType;
  ordre: number;
  description: string | null;
  duree_estimee_minutes: number | null;
  vimeo_id: string | null;
  video_url: string | null;
  formation_id: string | null;
  milestone_message: string | null;
  milestone_emoji: string | null;
  status: string;
}

export interface ParcoursPhase {
  id: string;
  numero: number;
  titre: string;
  emoji: string | null;
  description: string | null;
  ordre: number;
  chapitres: ParcoursChapitre[];
}

export interface Parcours {
  id: string;
  pass_type: PassType;
  slug: string;
  titre: string;
  subtitle: string | null;
  status: string;
  phases: ParcoursPhase[];
}

export interface ParcoursProgress {
  completedChapitreIds: Set<string>;
  totalChapitres: number;
  completedCount: number;
  percent: number;
  currentChapitreId: string | null;
  currentPhaseNumero: number | null;
  isChapitreAccessible: (chapitreId: string) => boolean;
}

function computeProgress(parcours: Parcours, completedIds: Set<string>): ParcoursProgress {
  const ordered = parcours.phases
    .flatMap((ph) => ph.chapitres.map((c) => ({ ...c, phase_numero: ph.numero })));
  const total = ordered.length;
  const done = ordered.filter((c) => completedIds.has(c.id)).length;

  let currentChapitreId: string | null = null;
  let currentPhaseNumero: number | null = null;
  for (const c of ordered) {
    if (!completedIds.has(c.id)) {
      currentChapitreId = c.id;
      currentPhaseNumero = c.phase_numero;
      break;
    }
  }

  const accessibleUntil = new Map<string, boolean>();
  let blocked = false;
  for (const c of ordered) {
    accessibleUntil.set(c.id, !blocked);
    if (!completedIds.has(c.id)) blocked = true;
  }

  return {
    completedChapitreIds: completedIds,
    totalChapitres: total,
    completedCount: done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    currentChapitreId,
    currentPhaseNumero,
    isChapitreAccessible: (id) => accessibleUntil.get(id) ?? false,
  };
}

async function fetchParcours(slug: string): Promise<Parcours | null> {
  const { data: p, error } = await supabase
    .from("parcours")
    .select("id, pass_type, slug, titre, subtitle, status")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;

  const { data: phases, error: phErr } = await supabase
    .from("parcours_phases")
    .select("id, numero, titre, emoji, description, ordre")
    .eq("parcours_id", p.id)
    .eq("status", "published")
    .order("ordre", { ascending: true });
  if (phErr) throw phErr;

  const phaseIds = (phases ?? []).map((ph) => ph.id);
  const { data: chapitres, error: chErr } = phaseIds.length
    ? await supabase
        .from("parcours_chapitres")
        .select("*")
        .in("phase_id", phaseIds)
        .eq("status", "published")
        .order("ordre", { ascending: true })
    : { data: [], error: null };
  if (chErr) throw chErr;

  const byPhase = new Map<string, ParcoursChapitre[]>();
  for (const ch of (chapitres ?? []) as unknown as ParcoursChapitre[]) {
    if (!byPhase.has(ch.phase_id)) byPhase.set(ch.phase_id, []);
    byPhase.get(ch.phase_id)!.push(ch);
  }

  return {
    ...(p as Omit<Parcours, "phases">),
    phases: (phases ?? []).map((ph) => ({
      ...ph,
      chapitres: byPhase.get(ph.id) ?? [],
    })),
  } as Parcours;
}

export function useParcours(slug?: string | null) {
  const { user } = useAuth();
  const { passLevel } = useUserPass();
  const userId = user?.id ?? null;

  const effectiveSlug = slug ?? (passLevel !== "none" ? passLevel.replace("_", "-") : null);

  const parcoursQuery = useQuery({
    queryKey: ["parcours", effectiveSlug],
    enabled: !!effectiveSlug,
    queryFn: () => fetchParcours(effectiveSlug!),
  });

  const progressQuery = useQuery({
    queryKey: ["parcours-progress", effectiveSlug, userId],
    enabled: !!parcoursQuery.data && !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const chapitreIds = parcoursQuery.data!.phases.flatMap((ph) =>
        ph.chapitres.map((c) => c.id)
      );
      if (chapitreIds.length === 0) return new Set();
      const { data, error } = await supabase
        .from("parcours_chapitre_progress")
        .select("chapitre_id")
        .eq("user_id", userId!)
        .in("chapitre_id", chapitreIds);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.chapitre_id));
    },
  });

  const progress = parcoursQuery.data && progressQuery.data
    ? computeProgress(parcoursQuery.data, progressQuery.data)
    : null;

  return {
    parcours: parcoursQuery.data ?? null,
    progress,
    isLoading: parcoursQuery.isLoading || progressQuery.isLoading,
    isError: parcoursQuery.isError || progressQuery.isError,
  };
}

export function useCompleteChapitre() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (chapitreId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("parcours_chapitre_progress")
        .upsert(
          { user_id: user.id, chapitre_id: chapitreId },
          { onConflict: "user_id,chapitre_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcours-progress"] });
    },
  });
}

export function useUnlockFormation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formationId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("formation_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("formation_id", formationId)
        .is("revoked_at", null)
        .maybeSingle();
      if (existing) return existing;

      const { data, error } = await supabase
        .from("formation_enrollments")
        .insert({
          user_id: user.id,
          formation_id: formationId,
          source: "parcours",
          granted_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training", "formations"] });
      queryClient.invalidateQueries({ queryKey: ["formation-enrollments"] });
    },
  });
}
