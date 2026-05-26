import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import { isFormationCompleteForUser } from "@/lib/certificateEligibility";

/**
 * Hook qui détermine si l'utilisateur courant peut accéder à Personal Brand.
 *
 * Règle (26/05/2026) :
 *   - CEO / coach → toujours OK (staff)
 *   - Pass Liberty → toujours OK (pass premium, pas de prérequis)
 *   - Pass AL BARAKA (sans Liberty) → uniquement si la formation
 *     MARKETING DIGITAL est validée (chapitres complétés + tous les quiz
 *     validés = état "certif débloqué")
 *   - Aucun pass → bloqué
 *
 * Le check utilise `isFormationCompleteForUser` (lib/certificateEligibility)
 * qui vérifie chapitres + quiz_attempts.validated.
 */
const MARKETING_DIGITAL_FORMATION_ID = "4949ffda-77d2-450e-adad-83554645af32";

export interface PersonalBrandAccessResult {
  canAccess: boolean;
  isLoading: boolean;
  /** True si l'user a un pass AL BARAKA (sans Liberty) et doit valider Marketing. */
  needsMarketingCompletion: boolean;
  /** True si Marketing Digital est validé (utile pour afficher la raison du blocage). */
  marketingComplete: boolean;
}

export function useCanAccessPersonalBrand(): PersonalBrandAccessResult {
  const { profile, isLoading: authLoading } = useAuth();
  const { hasAlBaraka, hasLiberty, hasAnyPass, isLoading: passLoading } =
    useUserPass();

  const isStaff =
    !!profile && (profile.role === "ceo" || profile.is_coach === true);
  const isLibertyAccess = hasLiberty;

  // Doit faire le check Marketing : pass AL BARAKA actif, pas Liberty, pas staff
  const needsMarketingCompletion =
    hasAnyPass && !isStaff && !hasLiberty && hasAlBaraka;

  const { data: marketingComplete, isLoading: marketingLoading } = useQuery({
    queryKey: ["marketing-digital-complete", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      return await isFormationCompleteForUser(
        profile.id,
        MARKETING_DIGITAL_FORMATION_ID,
      );
    },
    enabled: !!profile?.id && needsMarketingCompletion,
    staleTime: 5 * 60 * 1000, // 5 min de cache (la complétion change rarement)
  });

  const isLoading =
    authLoading ||
    passLoading ||
    (needsMarketingCompletion && marketingLoading);

  let canAccess = false;
  if (isStaff) canAccess = true;
  else if (isLibertyAccess) canAccess = true;
  else if (hasAlBaraka && marketingComplete === true) canAccess = true;

  return {
    canAccess,
    isLoading,
    needsMarketingCompletion,
    marketingComplete: marketingComplete === true,
  };
}
