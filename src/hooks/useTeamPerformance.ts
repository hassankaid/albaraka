import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook qui agrège les 3 RPCs de l'onglet "Équipe" du dashboard CEO :
 *   - team_activity_stats       : nb leads touchés par membre dans la période
 *   - team_qualification_stats  : taux de qualification par membre
 *   - team_sales_rankings       : top setters / closers / apporteurs par ventes
 *
 * Les RPCs sont SECURITY DEFINER et gatées CEO côté SQL — un non-CEO
 * recevra une erreur 403. Le composant qui consomme ce hook doit donc
 * vérifier le rôle côté UI avant de l'appeler.
 */
export interface TeamActivityRow {
  user_id: string;
  full_name: string;
  role: string;
  collaborateur_level: string | null;
  nb_leads_handled: number;
  nb_activities: number;
}

export interface TeamQualificationRow {
  user_id: string;
  full_name: string;
  role: string;
  collaborateur_level: string | null;
  nb_leads_handled: number;
  nb_inscrit_conf: number;
  nb_call_booke: number;
  /** Ratio entre 0 et 1 (à formater en % côté UI). */
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
      const [activityRes, qualifRes, rankingsRes] = await Promise.all([
        (supabase as any).rpc("team_activity_stats", { p_from: fromIso, p_to: toIso }),
        (supabase as any).rpc("team_qualification_stats", { p_from: fromIso, p_to: toIso }),
        (supabase as any).rpc("team_sales_rankings", { p_from: fromIso, p_to: toIso }),
      ]);
      if (activityRes.error) throw activityRes.error;
      if (qualifRes.error) throw qualifRes.error;
      if (rankingsRes.error) throw rankingsRes.error;

      const rankings = (rankingsRes.data ?? []) as TeamRankingRow[];
      return {
        activity: (activityRes.data ?? []) as TeamActivityRow[],
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
