import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook qui agrège 2 RPCs de l'onglet "Équipe" du dashboard CEO :
 *   - team_qualification_stats  : taux de qualification par membre
 *   - team_sales_rankings       : top setters / closers / apporteurs par ventes
 *
 * Les RPCs sont SECURITY DEFINER et gatées CEO côté SQL — un non-CEO
 * recevra une erreur 403.
 *
 * Note : la RPC team_activity_stats existe toujours en base mais n'est
 * plus exploitée côté UI (section retirée à la demande du CEO).
 */
export interface TeamQualificationRow {
  user_id: string;
  full_name: string;
  role: string;
  collaborateur_level: string | null;
  nb_leads_handled: number;
  nb_inscrit_conf: number;
  /** Ratio entre 0 et 1 (à formater en % côté UI). nb_inscrit_conf / nb_leads_handled. */
  taux_qualif: number;
}

export interface TeamRankingRow {
  role: "setter" | "closer" | "apporteur";
  user_id: string;
  full_name: string;
  nb_ventes: number;
  montant_total_ht: number;
  montant_commissions: number;
}

interface Params {
  from: Date | null;
  to: Date | null;
  enabled?: boolean;
}

export function useTeamPerformance({ from, to, enabled = true }: Params) {
  const fromIso = from ? from.toISOString() : null;
  const toIso = to ? to.toISOString() : null;

  return useQuery({
    queryKey: ["team-performance", fromIso, toIso],
    enabled: enabled && !!fromIso && !!toIso,
    queryFn: async () => {
      const [qualifRes, rankingsRes] = await Promise.all([
        (supabase as any).rpc("team_qualification_stats", { p_from: fromIso, p_to: toIso }),
        (supabase as any).rpc("team_sales_rankings", { p_from: fromIso, p_to: toIso }),
      ]);
      if (qualifRes.error) throw qualifRes.error;
      if (rankingsRes.error) throw rankingsRes.error;

      const rankings = (rankingsRes.data ?? []) as TeamRankingRow[];
      return {
        qualification: (qualifRes.data ?? []) as TeamQualificationRow[],
        rankings: {
          setter: rankings.filter((r) => r.role === "setter"),
          closer: rankings.filter((r) => r.role === "closer"),
          apporteur: rankings.filter((r) => r.role === "apporteur"),
        },
      };
    },
  });
}
