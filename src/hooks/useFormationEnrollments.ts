import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Inscriptions données par le parcours ou le pass : elles n'ouvrent pas, à
 * elles seules, une formation masquée aux élèves (les anciennes formations,
 * remplacées par les parcours). Toute autre provenance (achat à la carte,
 * accès donné à la main…) l'ouvre : c'est la vente à la carte (Sidali, 13/10/2026).
 */
const SOURCES_DU_PASS = new Set(["parcours", "auto_cm_complete", "auto_pass", "auto_free"]);

export function estAchatALaCarte(source: string | null | undefined): boolean {
  return !!source && !SOURCES_DU_PASS.has(source);
}

export function useFormationEnrollments() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["formation-enrollments", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase
        .from("formation_enrollments")
        .select("formation_id, source")
        .eq("user_id", userId!)
        .is("revoked_at", null);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.formation_id, r.source as string]));
    },
  });

  const sources = query.data ?? new Map<string, string>();
  return {
    isLoading: query.isLoading,
    has: (formationId: string) => sources.has(formationId),
    /** Vrai si l'élève a cette formation par un achat à la carte (ou un accès manuel). */
    aLaCarte: (formationId: string) => estAchatALaCarte(sources.get(formationId)),
    enrolledIds: new Set(sources.keys()),
  };
}
