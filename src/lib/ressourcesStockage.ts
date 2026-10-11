// Fichiers des ressources de formation dans le stockage privé (voir ressourcesFormation.ts).
import { supabase } from "@/integrations/supabase/client";
import { STOCKAGE_RESSOURCES, cheminStockage, estFichierStocke } from "@/lib/ressourcesFormation";

/** Supprime du stockage les fichiers de ces ressources (une ressource supprimée, une vidéo supprimée…). */
export async function supprimerFichiersStockes(ressources: { url: string }[]) {
  const chemins = ressources.filter((r) => estFichierStocke(r.url)).map((r) => cheminStockage(r.url));
  if (chemins.length) await supabase.storage.from(STOCKAGE_RESSOURCES).remove(chemins);
}
