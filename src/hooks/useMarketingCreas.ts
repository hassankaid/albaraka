// Données de l'onglet « Par créa » du tableau de bord Marketing (03/11/2026).
// Les fonctions SQL vérifient elles-mêmes le rôle (CEO ou agence).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Plateforme, PubBrute } from "@/lib/marketing/creas";

export function useMarketingCreas(from: string, to: string) {
  return useQuery({
    queryKey: ["marketing-creas", from, to],
    staleTime: 60_000,
    queryFn: async (): Promise<PubBrute[]> => {
      const { data, error } = await (supabase as any).rpc("marketing_par_crea", { p_from: from, p_to: to });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        plateforme: r.plateforme,
        pub_id: r.pub_id,
        pub_nom: r.pub_nom,
        groupe_nom: r.groupe_nom,
        campagne_nom: r.campagne_nom,
        depense: Number(r.depense ?? 0),
        impressions: Number(r.impressions ?? 0),
        clics: Number(r.clics ?? 0),
        leads: Number(r.leads ?? 0),
        inscrits: Number(r.inscrits ?? 0),
        rdv: Number(r.rdv ?? 0),
        ventes: Number(r.ventes ?? 0),
        ca: Number(r.ca ?? 0),
      }));
    },
  });
}

export interface LeadDeCrea {
  lead_id: string;
  nom: string | null;
  cree_le: string;
  statut: string;
  inscrit: boolean;
  rdv: boolean;
  ventes: number;
  ca: number;
  vendu_le: string | null;
  pub_id: string | null;
}

/** Les leads de toutes les pubs d'une créa. */
export function useDetailCrea(plateforme: Plateforme | null, pubIds: (string | null)[], from: string, to: string) {
  return useQuery({
    queryKey: ["marketing-crea-detail", plateforme, pubIds.join(","), from, to],
    enabled: !!plateforme && pubIds.length > 0,
    queryFn: async (): Promise<LeadDeCrea[]> => {
      const parties = await Promise.all(
        pubIds.map(async (id) => {
          const { data, error } = await (supabase as any).rpc("marketing_crea_detail", {
            p_plateforme: plateforme, p_pub_id: id ?? "", p_from: from, p_to: to,
          });
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ ...r, ventes: Number(r.ventes ?? 0), ca: Number(r.ca ?? 0), pub_id: id }));
        }),
      );
      return parties.flat().sort((a, b) => b.cree_le.localeCompare(a.cree_le));
    },
  });
}
