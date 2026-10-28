// Réglages du lead scoring (28/10/2026) : jours du tag « Jeu-Ven » et choix de le
// faire peser dans l'ordre d'appel. Modifiables par le CEO dans Lead Scoring.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScoringReglages {
  jours_jeu_ven: number[];
  jeu_ven_tri: boolean;
}

export function useScoringReglages() {
  return useQuery({
    queryKey: ["scoring-reglages"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ScoringReglages> => {
      // scoring_reglages (28/10/2026) n'est pas encore dans les types générés.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("scoring_reglages").select("jours_jeu_ven, jeu_ven_tri").maybeSingle();
      if (error) throw error;
      return data ?? { jours_jeu_ven: [4, 5], jeu_ven_tri: false };
    },
  });
}
