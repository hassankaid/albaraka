import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ParcoursVideoRow, ParcoursRessourceRow } from "@/hooks/useAdminParcours";

export function useParcoursChapitreContent(chapitreId: string | undefined) {
  return useQuery({
    queryKey: ["parcours-chapitre-content", chapitreId],
    enabled: !!chapitreId,
    queryFn: async () => {
      const [videosRes, ressRes] = await Promise.all([
        (supabase as any).from("parcours_chapitre_videos").select("*").eq("chapitre_id", chapitreId!).order("ordre"),
        (supabase as any).from("parcours_chapitre_ressources").select("*").eq("chapitre_id", chapitreId!).order("ordre"),
      ]);
      if (videosRes.error) throw videosRes.error;
      if (ressRes.error) throw ressRes.error;
      return {
        videos: (videosRes.data ?? []) as ParcoursVideoRow[],
        ressources: (ressRes.data ?? []) as ParcoursRessourceRow[],
      };
    },
  });
}
