// useCoachingUnlocks — détermine quels coachings hebdomadaires sont
// déverrouillés pour l'utilisateur courant (demande CEO 20/05/2026).
//
// Règle : un coaching ne se débloque que si l'élève a TERMINÉ la formation
// associée (cf. coachingUnlockRules.ts). Le verrou ne concerne QUE les élèves
// (role = apporteur) — le CEO et le staff (collaborateur / coach) bypassent.
//
// On réutilise isFormationCompleteForUser (source de vérité de la complétion :
// tous chapitres + tous quiz validés). Les 3 formations requises sont
// vérifiées en parallèle, le résultat est caché 5 min par React Query.

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isFormationCompleteForUser } from "@/lib/certificateEligibility";
import {
  COACHING_UNLOCK_RULES,
  REQUIRED_FORMATION_IDS,
  type CoachingUnlockRule,
} from "@/config/coachingUnlockRules";

export interface CoachingUnlocks {
  /** true si le créneau est verrouillé pour l'utilisateur courant. */
  isLocked: (slotId: string) => boolean;
  /** Règle de déverrouillage d'un créneau (formation requise), ou undefined. */
  getRule: (slotId: string) => CoachingUnlockRule | undefined;
  /** Vérification de complétion en cours (élève uniquement). */
  isLoading: boolean;
}

export function useCoachingUnlocks(): CoachingUnlocks {
  const { profile } = useAuth();
  const userId = profile?.id;

  // Le verrou ne s'applique qu'aux élèves apporteurs. CEO + collaborateur +
  // coach voient tout déverrouillé.
  const isStudent = profile?.role === "apporteur";

  const query = useQuery({
    queryKey: ["coaching-unlocks", userId],
    enabled: !!userId && isStudent,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const results = await Promise.all(
        REQUIRED_FORMATION_IDS.map(
          async (fid) =>
            [fid, await isFormationCompleteForUser(userId!, fid)] as const,
        ),
      );
      return Object.fromEntries(results);
    },
  });

  const completionByFormation = query.data ?? {};
  const isLoadingForStudent = isStudent && query.isLoading;

  function isLocked(slotId: string): boolean {
    const rule = COACHING_UNLOCK_RULES[slotId];
    if (!rule) return false; // pas de règle → coaching libre
    if (!isStudent) return false; // CEO + staff bypassent

    // Pendant le chargement on considère verrouillé : on évite de flasher un
    // coaching déverrouillé avant la vérification (locked → unlocked est un
    // sens de transition acceptable, l'inverse non).
    if (isLoadingForStudent) return true;

    return completionByFormation[rule.formationId] !== true;
  }

  return {
    isLocked,
    getRule: (slotId: string) => COACHING_UNLOCK_RULES[slotId],
    isLoading: isLoadingForStudent,
  };
}
