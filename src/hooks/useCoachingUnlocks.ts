// ─────────────────────────────────────────────────────────────────────────
// Quels coachings hebdomadaires sont ouverts à l'utilisateur courant.
//
// Réécrit le 28/09/2026 : la règle vivait ici, dans le navigateur. Elle est
// descendue en base (public.coachings_de), pour deux raisons.
//
//  1. Les dérogations manuelles du CEO doivent pouvoir contredire
//     l'automatique. Une règle calculée côté client ne peut pas les lire de
//     façon fiable.
//  2. Deux endroits qui décident finissent par diverger. C'était déjà le cas
//     entre get_formation_progress >= 100 (Discord, fonctionnalités) et
//     is_formation_complete_for_user (coachings, certificats).
//
// Le hook ne fait plus que lire et exposer. Aucune règle ici.
// ─────────────────────────────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  COACHING_UNLOCK_RULES,
  type CoachingUnlockRule,
} from "@/config/coachingUnlockRules";

/** Ce que la base renvoie pour un créneau. */
export interface EtatCoaching {
  slot_id: string;
  titre: string;
  deverrouille: boolean;
  /** manuel · staff · libre · formation — d'où vient la décision. */
  origine: "manuel" | "staff" | "libre" | "formation";
  formation_requise: string | null;
  motif_manuel: string | null;
}

export interface CoachingUnlocks {
  /** true si le créneau est verrouillé pour l'utilisateur courant. */
  isLocked: (slotId: string) => boolean;
  /** Règle de déverrouillage d'un créneau (formation requise), ou undefined. */
  getRule: (slotId: string) => CoachingUnlockRule | undefined;
  /** D'où vient la décision, pour l'affichage. */
  getOrigine: (slotId: string) => EtatCoaching["origine"] | undefined;
  isLoading: boolean;
}

export function useCoachingUnlocks(): CoachingUnlocks {
  const { profile } = useAuth();
  const userId = profile?.id;

  const query = useQuery({
    queryKey: ["coachings-etat", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<EtatCoaching[]> => {
      const { data, error } = await (supabase as any).rpc("mes_coachings");
      if (error) throw error;
      return (data ?? []) as EtatCoaching[];
    },
  });

  const parSlot = new Map((query.data ?? []).map((e) => [e.slot_id, e]));

  function isLocked(slotId: string): boolean {
    // Pendant le chargement on considère verrouillé : mieux vaut ouvrir après
    // coup que laisser entrevoir un coaching qu'on refermera. L'inverse serait
    // perçu comme un accès retiré.
    if (query.isLoading) return true;
    const etat = parSlot.get(slotId);
    if (!etat) return false; // créneau inconnu de la base → pas de verrou
    return !etat.deverrouille;
  }

  return {
    isLocked,
    // Les libellés d'affichage restent côté front ; seule la DÉCISION est en base.
    getRule: (slotId: string) => COACHING_UNLOCK_RULES[slotId],
    getOrigine: (slotId: string) => parSlot.get(slotId)?.origine,
    isLoading: query.isLoading,
  };
}
