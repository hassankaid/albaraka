import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Onglet « Équipe » du dashboard CEO, par conférence (18/11/2026).
 *
 * Deux RPC, SECURITY DEFINER et réservées au CEO côté SQL :
 *   - equipe_qualification_conference : par membre, leads appelés, inscrits,
 *     calls, ventes (setter), suivi post-conférence et gestion ;
 *   - equipe_classement_conference    : top setters / closers / apporteurs.
 *
 * La période est la semaine d'inscription à la conférence : du début de la
 * conférence précédente (dimanche 11h) au début de celle-ci. Les ventes sont
 * celles rattachées à la conférence (sales.conference_date).
 *
 * Les anciennes RPC team_qualification_stats / team_sales_rankings (par dates)
 * restent en base mais ne sont plus utilisées : elles comptaient comme
 * « traité » tout lead touché, redistribution comprise.
 */
export interface TeamQualificationRow {
  user_id: string;
  full_name: string;
  role: string;
  collaborateur_level: string | null;
  /** Leads passés d'un statut d'appel (À qualifier, À relancer, Pas de réponse, DM) à un résultat, ou relance notée. */
  nb_appeles: number;
  /** Parmi ces passages, ceux vers Inscrit conférence ou Call booké. */
  nb_inscrits: number;
  /** Entre 0 et 1 : nb_inscrits / nb_appeles. */
  taux_inscription: number;
  /** Inscrits qui ont ensuite pris un rendez-vous non annulé. */
  nb_calls: number;
  /** Ventes de la conférence où le membre a une commission de setter. */
  nb_ventes: number;
  montant_ventes_ht: number;
  /** Leads suivis après la conférence (rediffusion, sans réponse post-conférence…). */
  nb_post_conference: number;
  /** Redistribution : remises en « À qualifier », réattributions, bascules DM. */
  nb_gestion: number;
}

export interface TeamRankingRow {
  role: "setter" | "closer" | "apporteur";
  user_id: string;
  full_name: string;
  nb_ventes: number;
  montant_total_ht: number;
  montant_commissions: number;
}

export function useTeamPerformance(conference: string | null) {
  return useQuery({
    queryKey: ["team-performance", conference],
    enabled: !!conference,
    queryFn: async () => {
      const [qualifRes, rankingsRes] = await Promise.all([
        (supabase as any).rpc("equipe_qualification_conference", { p_conference: conference }),
        (supabase as any).rpc("equipe_classement_conference", { p_conference: conference }),
      ]);
      if (qualifRes.error) throw qualifRes.error;
      if (rankingsRes.error) throw rankingsRes.error;

      const nombre = (v: any) => Number(v ?? 0);
      const qualification = ((qualifRes.data ?? []) as any[]).map((r) => ({
        ...r,
        nb_appeles: nombre(r.nb_appeles),
        nb_inscrits: nombre(r.nb_inscrits),
        taux_inscription: nombre(r.taux_inscription),
        nb_calls: nombre(r.nb_calls),
        nb_ventes: nombre(r.nb_ventes),
        montant_ventes_ht: nombre(r.montant_ventes_ht),
        nb_post_conference: nombre(r.nb_post_conference),
        nb_gestion: nombre(r.nb_gestion),
      })) as TeamQualificationRow[];
      const rankings = ((rankingsRes.data ?? []) as any[]).map((r) => ({
        ...r,
        nb_ventes: nombre(r.nb_ventes),
        montant_total_ht: nombre(r.montant_total_ht),
        montant_commissions: nombre(r.montant_commissions),
      })) as TeamRankingRow[];
      return {
        qualification,
        rankings: {
          setter: rankings.filter((r) => r.role === "setter"),
          closer: rankings.filter((r) => r.role === "closer"),
          apporteur: rankings.filter((r) => r.role === "apporteur"),
        },
      };
    },
  });
}
