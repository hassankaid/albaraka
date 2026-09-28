// ─────────────────────────────────────────────────────────────────────────
// Lecture et écriture des dérogations manuelles aux règles d'accès.
//
// Toute la résolution est en base (public.acces_de) : ce hook ne calcule
// rien. C'est délibéré — une règle d'accès dupliquée dans le navigateur finit
// par diverger de celle qui fait autorité, et on ne s'en aperçoit qu'au
// moment où un élève voit ce qu'il ne devrait pas.
// ─────────────────────────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DomaineAcces = "coaching" | "formation" | "fonctionnalite" | "pass";
export type Decision = "autorise" | "bloque";

export interface LigneAcces {
  domaine: DomaineAcces;
  cible: string;
  libelle: string;
  actif: boolean;
  /** D'où vient l'état : manuel · staff · libre · formation · inscription · attribue · aucun */
  origine: string;
  motif_manuel: string | null;
  expire_le: string | null;
}

/** L'état effectif de tous les accès d'une personne. */
export function useAccesDe(userId: string | null) {
  return useQuery({
    queryKey: ["acces-de", userId],
    enabled: !!userId,
    queryFn: async (): Promise<LigneAcces[]> => {
      const { data, error } = await (supabase as any).rpc("acces_de", { p_user: userId });
      if (error) throw error;
      return (data ?? []) as LigneAcces[];
    },
  });
}

export function useDefinirAcces() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      userId: string;
      domaine: DomaineAcces;
      cible: string;
      decision: Decision;
      motif: string;
      expireLe?: string | null;
    }) => {
      const { error } = await (supabase as any).rpc("definir_acces_manuel", {
        p_user: v.userId,
        p_domaine: v.domaine,
        p_cible: v.cible,
        p_decision: v.decision,
        p_motif: v.motif,
        p_expire_le: v.expireLe || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["acces-de", v.userId] });
      qc.invalidateQueries({ queryKey: ["acces-manuels-actifs"] });
    },
  });
}

/** Retire la dérogation : l'accès repasse sous le régime automatique. */
export function useRetirerAcces() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { userId: string; domaine: DomaineAcces; cible: string }) => {
      const { error } = await (supabase as any).rpc("retirer_acces_manuel", {
        p_user: v.userId,
        p_domaine: v.domaine,
        p_cible: v.cible,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["acces-de", v.userId] });
      qc.invalidateQueries({ queryKey: ["acces-manuels-actifs"] });
    },
  });
}

export interface DerogationActive {
  id: string;
  user_id: string;
  nom: string;
  email: string;
  domaine: DomaineAcces;
  cible: string;
  decision: Decision;
  motif: string;
  expire_le: string | null;
  accorde_le: string;
  accorde_par_nom: string | null;
}

/**
 * Toutes les dérogations en vigueur, les plus anciennes d'abord.
 *
 * Cet écran n'est pas un confort : un blocage manuel sans date de fin est
 * invisible une fois posé. L'élève voit une porte fermée, et l'automatique ne
 * la rouvrira jamais. C'est le mode de défaillance de ce genre d'outil.
 */
export function useDerogationsActives() {
  return useQuery({
    queryKey: ["acces-manuels-actifs"],
    queryFn: async (): Promise<DerogationActive[]> => {
      const { data, error } = await (supabase as any).rpc("acces_manuels_actifs");
      if (error) throw error;
      return (data ?? []) as DerogationActive[];
    },
  });
}
