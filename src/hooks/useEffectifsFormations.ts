import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { compterEleves, type Effectifs, type LigneInscription } from "@/lib/effectifsFormations";

const PAGE = 1000;

/**
 * Effectifs du catalogue Training (vue CEO). Lecture paginée : le client
 * Supabase plafonne à 1 000 lignes, et il y avait déjà ~800 inscriptions
 * actives en septembre 2026. La RLS ne laisse lire toutes les inscriptions
 * qu'au CEO (`enrollments_select_ceo`).
 */
export function useEffectifsFormations(enabled: boolean, viewerId?: string | null) {
  return useQuery({
    queryKey: ["training", "effectifs", viewerId],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<Effectifs> => {
      const lignes: LigneInscription[] = [];
      for (let depuis = 0; ; depuis += PAGE) {
        const { data, error } = await supabase
          .from("formation_enrollments")
          .select("formation_id, user_id")
          .is("revoked_at", null)
          .order("id", { ascending: true })
          .range(depuis, depuis + PAGE - 1);
        if (error) throw error;
        lignes.push(...((data ?? []) as LigneInscription[]));
        if (!data || data.length < PAGE) break;
      }
      return compterEleves(lignes, viewerId);
    },
  });
}
