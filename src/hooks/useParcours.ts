import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass, type PassType } from "@/hooks/useUserPass";
import { calculerAccesChapitres } from "@/lib/parcoursAcces";

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
  /** Module de théorie à valider avant d'ouvrir ce chapitre (null = aucun). */
  theorie_chapitre_id: string | null;
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

/** Module de théorie exigé avant un chapitre, tel qu'affiché à l'élève. */
export interface TheorieRequise {
  chapitreId: string;
  titre: string;
  /** Page du module dans la formation. */
  route: string;
  faite: boolean;
}

export interface ParcoursProgress {
  completedChapitreIds: Set<string>;
  totalChapitres: number;
  completedCount: number;
  percent: number;
  currentChapitreId: string | null;
  currentPhaseNumero: number | null;
  isChapitreAccessible: (chapitreId: string) => boolean;
  /**
   * Théorie qui bloque ce chapitre — seulement quand c'est l'étape courante,
   * pour ne pas afficher le même appel à l'action sur dix lignes d'affilée.
   */
  theorieManquante: (chapitreId: string) => TheorieRequise | null;
  /**
   * Théorie rattachée à ce chapitre et pas encore validée, où qu'il se trouve
   * dans le parcours. Sert à orienter l'élève vers son prochain pas sans
   * dépendre de l'état exact de la progression au moment du clic.
   */
  theoriePour: (chapitreId: string) => TheorieRequise | null;
}

type CatalogueTheories = Map<string, TheorieRequise>;

function computeProgress(
  parcours: Parcours,
  completedIds: Set<string>,
  theories: CatalogueTheories,
  estStaff: boolean,
): ParcoursProgress {
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

  // Un module de théorie qu'on n'arrive pas à lire (droits, brouillon, lien
  // cassé) ne doit jamais enfermer l'élève : dans ce cas il ne bloque rien.
  // Le CEO et les coachs relisent le contenu : leur imposer la théorie les
  // obligerait à valider dix-neuf modules pour ouvrir un outil.
  const validees = new Set<string>();
  for (const [id, t] of theories) {
    if (estStaff || t.faite) validees.add(id);
  }
  const pourCalcul = ordered.map((c) => ({
    id: c.id,
    theorie_chapitre_id: c.theorie_chapitre_id && theories.has(c.theorie_chapitre_id)
      ? c.theorie_chapitre_id
      : null,
  }));

  const acces = calculerAccesChapitres(pourCalcul, completedIds, validees);

  const theorieParChapitre = new Map<string, string>();
  for (const c of pourCalcul) {
    if (c.theorie_chapitre_id) theorieParChapitre.set(c.id, c.theorie_chapitre_id);
  }

  return {
    completedChapitreIds: completedIds,
    totalChapitres: total,
    completedCount: done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    currentChapitreId,
    currentPhaseNumero,
    isChapitreAccessible: (id) => acces.get(id)?.accessible ?? false,
    theorieManquante: (id) => {
      const manquante = acces.get(id)?.theorieManquante;
      return manquante ? theories.get(manquante) ?? null : null;
    },
    theoriePour: (id) => {
      if (estStaff || completedIds.has(id)) return null;
      const theorieId = theorieParChapitre.get(id);
      if (!theorieId) return null;
      const requise = theories.get(theorieId);
      return requise && !requise.faite ? requise : null;
    },
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

/**
 * Les modules de théorie exigés par ce parcours : leur titre, leur page, et si
 * l'élève les a validés. Un module illisible (non inscrit, dépublié) est
 * simplement absent du catalogue et ne bloque alors plus rien.
 */
async function fetchTheories(parcours: Parcours, userId: string): Promise<CatalogueTheories> {
  const ids = Array.from(
    new Set(
      parcours.phases
        .flatMap((ph) => ph.chapitres)
        .map((c) => c.theorie_chapitre_id)
        .filter((id): id is string => !!id),
    ),
  );
  const catalogue: CatalogueTheories = new Map();
  if (ids.length === 0) return catalogue;

  const { data: chapitres } = await supabase
    .from("formation_chapitres")
    .select("id, titre, module_id")
    .in("id", ids);
  if (!chapitres || chapitres.length === 0) return catalogue;

  const moduleIds = Array.from(new Set(chapitres.map((c) => c.module_id)));
  const { data: modules } = await supabase
    .from("formation_modules")
    .select("id, formation_id")
    .in("id", moduleIds);
  const formationParModule = new Map((modules ?? []).map((m) => [m.id, m.formation_id]));

  const formationIds = Array.from(new Set((modules ?? []).map((m) => m.formation_id)));
  const { data: formations } = formationIds.length
    ? await supabase.from("formations").select("id, slug").in("id", formationIds)
    : { data: [] };
  const slugParFormation = new Map((formations ?? []).map((f) => [f.id, f.slug]));

  const { data: progression } = await supabase
    .from("chapitre_progress")
    .select("chapitre_id")
    .eq("user_id", userId)
    .in("chapitre_id", ids);
  const faites = new Set((progression ?? []).map((r) => r.chapitre_id));

  for (const c of chapitres) {
    const slug = slugParFormation.get(formationParModule.get(c.module_id) ?? "");
    if (!slug) continue;
    catalogue.set(c.id, {
      chapitreId: c.id,
      titre: c.titre,
      route: `/training/${slug}/chapitre/${c.id}`,
      faite: faites.has(c.id),
    });
  }
  return catalogue;
}

export function useParcours(slug?: string | null) {
  const { user, profile } = useAuth();
  const { passLevel } = useUserPass();
  const userId = user?.id ?? null;

  const effectiveSlug = slug ?? (passLevel !== "none" ? passLevel.replace("_", "-") : null);
  const estStaff = profile?.role === "ceo" || profile?.is_coach === true;

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

  const theoriesQuery = useQuery({
    queryKey: ["parcours-theories", effectiveSlug, userId],
    enabled: !!parcoursQuery.data && !!userId,
    queryFn: () => fetchTheories(parcoursQuery.data!, userId!),
  });

  const progress = parcoursQuery.data && progressQuery.data && theoriesQuery.data
    ? computeProgress(parcoursQuery.data, progressQuery.data, theoriesQuery.data, estStaff)
    : null;

  return {
    parcours: parcoursQuery.data ?? null,
    progress,
    isLoading:
      parcoursQuery.isLoading || progressQuery.isLoading || theoriesQuery.isLoading,
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
      const { data, error } = await supabase.rpc("unlock_formation_from_parcours", {
        p_formation_id: formationId,
      });
      if (error) throw error;
      return { id: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training", "formations"] });
      queryClient.invalidateQueries({ queryKey: ["formation-enrollments"] });
    },
  });
}
