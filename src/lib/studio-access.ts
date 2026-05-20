/**
 * Studio Albaraka — gate d'accès.
 *
 * Brique B1 (20/05/2026) : la feature n'est ouverte qu'à :
 *   - role = "ceo" (admin)
 *   - email = "sidalisidali38100@gmail.com" (Sidali Test)
 *
 * Quand la V1 sera validée, on ouvrira progressivement par tier de Pass
 * (cf. Brique B6 — quotas).
 */

const STUDIO_ALLOWED_EMAILS = [
  "sidalisidali38100@gmail.com", // SIDALI TEST (apporteur)
];

export interface StudioAccessProfile {
  role?: string | null;
  email?: string | null;
}

export function isStudioAllowed(
  profile: StudioAccessProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.role === "ceo") return true;
  if (!profile.email) return false;
  return STUDIO_ALLOWED_EMAILS.includes(profile.email.toLowerCase());
}
