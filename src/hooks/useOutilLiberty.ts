import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { abregerTitreModule } from "@/lib/parcoursAcces";
import { getLibertyToolRouteForChapitre } from "@/pages/parcours/liberty/liberty-tool-routes";

export interface OutilLie {
  /** Nom court affiché à l'élève, ex. « M3 ». */
  nom: string;
  route: string;
  /**
   * Vrai outil interactif livré. Six étapes du parcours n'en ont pas (M9, M10,
   * M15, M17, M19, M20) : on ne promet pas un outil qui n'existe pas.
   */
  estOutil: boolean;
}

/**
 * L'outil interactif que ce module de théorie débloque, s'il y en a un.
 *
 * C'est le retour du va-et-vient : la vidéo du MODULE 3 d'OFFER CREATION
 * renvoie vers l'outil M3 du parcours Liberty.
 *
 * `theorie_chapitre_id` est trop récent pour les types Supabase générés, d'où
 * le cast — la colonne est déclarée dans la migration
 * 20260916110000_theorie_avant_outil_liberty.sql.
 */
export function useOutilLibertyDuChapitre(chapitreId?: string, actif = true) {
  return useQuery({
    queryKey: ["parcours", "outil-du-chapitre", chapitreId],
    enabled: !!chapitreId && actif,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<OutilLie | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("parcours_chapitres")
        .select("id, titre")
        .eq("theorie_chapitre_id", chapitreId!)
        .eq("status", "published")
        .maybeSingle();
      if (error || !data) return null;
      const outil = getLibertyToolRouteForChapitre("liberty", data.titre);
      return {
        nom: abregerTitreModule(data.titre),
        route: outil ?? `/parcours/liberty/chapitre/${data.id}`,
        estOutil: !!outil,
      };
    },
  });
}
