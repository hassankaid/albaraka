// Renvois « pour aller plus loin » d'un chapitre (table `chapitre_renvois`).
//
// Lus par `renvois_du_chapitre()`, jamais par la table : c'est la fonction qui
// décide ce que l'élève a le droit de voir — seulement des cibles publiées,
// et, pour une formation où il n'est pas inscrit, les titres sans le contenu
// (`accessible = false`, affiché verrouillé).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Renvoi {
  id: string;
  /** Vidéo sous laquelle le renvoi s'affiche ; `null` : tout le chapitre. */
  video_id: string | null;
  message: string | null;
  ordre: number;
  cible_chapitre_id: string;
  cible_video_id: string | null;
  cible_chapitre_titre: string;
  cible_video_titre: string | null;
  cible_module_titre: string;
  cible_formation_slug: string;
  cible_formation_titre: string;
  meme_formation: boolean;
  accessible: boolean;
  /** Toujours vrai pour un élève ; le CEO voit aussi les brouillons. */
  cible_publiee: boolean;
}

export const cleRenvois = (chapitreId: string | undefined) => ["training", "renvois", chapitreId] as const;

export function useRenvoisDuChapitre(chapitreId: string | undefined) {
  return useQuery({
    queryKey: cleRenvois(chapitreId),
    enabled: !!chapitreId,
    queryFn: async (): Promise<Renvoi[]> => {
      // La fonction n'est pas encore dans les types générés.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("renvois_du_chapitre", { p_chapitre: chapitreId });
      if (error) throw error;
      return (data ?? []) as Renvoi[];
    },
  });
}

/** L'adresse du chapitre cible, ouvert sur la bonne vidéo s'il y en a une. */
export function lienRenvoi(r: Pick<Renvoi, "cible_formation_slug" | "cible_chapitre_id" | "cible_video_id">): string {
  const base = `/training/${r.cible_formation_slug}/chapitre/${r.cible_chapitre_id}`;
  return r.cible_video_id ? `${base}?video=${r.cible_video_id}` : base;
}
