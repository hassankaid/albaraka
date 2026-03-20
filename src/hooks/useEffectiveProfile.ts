import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/hooks/useViewAs";

/**
 * Returns the "effective" profile: the simulated one if ViewAs is active, otherwise the real one.
 * The real auth profile is always available as `realProfile`.
 */
export function useEffectiveProfile() {
  const { profile: realProfile } = useAuth();
  const { viewAsProfile, isViewingAs } = useViewAs();

  const effectiveProfile = isViewingAs && viewAsProfile
    ? {
        ...realProfile,
        // Override identity & role fields with the viewed user
        id: viewAsProfile.id,
        full_name: viewAsProfile.full_name,
        email: viewAsProfile.email,
        role: viewAsProfile.role,
        collaborateur_level: viewAsProfile.collaborateur_level,
        is_also_apporteur: viewAsProfile.is_also_apporteur,
        can_add_instagram_leads: viewAsProfile.can_add_instagram_leads,
        avatar_url: viewAsProfile.avatar_url,
        timezone: viewAsProfile.timezone ?? realProfile?.timezone ?? null,
        is_active: viewAsProfile.is_active,
      }
    : realProfile;

  return { profile: effectiveProfile, realProfile, isViewingAs };
}
