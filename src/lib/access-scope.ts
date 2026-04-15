/**
 * Access scope helpers — source of truth for "who can see what" at the route level.
 * Used by ProtectedRoute, SharedLayout and SpaceSwitcher so they agree on the rules.
 */

export interface ProfileLike {
  role?: string | null;
  is_active?: boolean | null;
  is_also_apporteur?: boolean | null;
  onboarding_completed?: boolean | null;
}

/**
 * Paths reachable from the apporteur side (ApporteurLayout) — either exclusively
 * (/my-space/*) or shared with the team side via SharedLayout.
 *
 * Keep this aligned with the routes declared under ApporteurLayout + SharedLayout
 * in src/App.tsx.
 */
export function isApporteurScopedPath(pathname: string): boolean {
  if (pathname === "/onboarding") return true;
  if (pathname.startsWith("/my-space")) return true;
  if (pathname.startsWith("/training")) return true;
  if (pathname.startsWith("/mon-coaching")) return true;
  if (pathname === "/coaching/calendar") return true;
  if (pathname === "/working/activity") return true;
  if (pathname === "/working/organisation") return true;
  if (pathname === "/working/personal-brand") return true;
  if (pathname === "/working/content") return true;
  if (pathname === "/working/contents") return true;
  if (pathname === "/working/agent") return true;
  if (pathname.startsWith("/parcours/")) return true;
  return false;
}

/**
 * Returns true when the user should *effectively* behave like an apporteur —
 * i.e. only see the apporteur layout and paths:
 *   - role = "apporteur" (always)
 *   - role = "collaborateur" but is_active = false AND is_also_apporteur = true
 *     (deactivated collaborator who still has an apporteur side — "Sonia case")
 */
export function isEffectiveApporteur(profile: ProfileLike | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === "apporteur") return true;
  if (
    profile.role === "collaborateur" &&
    profile.is_active === false &&
    profile.is_also_apporteur === true
  ) {
    return true;
  }
  return false;
}

/**
 * Returns true when the user has no active role at all and must be
 * locked out with a "compte désactivé" screen:
 *   - collaborateur, inactive, WITHOUT is_also_apporteur fallback
 * CEO/agence/apporteur active are never in this state.
 */
export function isLockedOut(profile: ProfileLike | null | undefined): boolean {
  if (!profile) return false;
  return (
    profile.role === "collaborateur" &&
    profile.is_active === false &&
    !profile.is_also_apporteur
  );
}
