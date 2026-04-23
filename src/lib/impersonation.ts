export const IMPERSONATION_HOST = "view.albarakaecosysteme.com";
export const PRIMARY_APP_HOST = "plateforme.albarakaecosysteme.com";

export const IMPERSONATION_ORIGIN = `https://${IMPERSONATION_HOST}`;
export const PRIMARY_APP_ORIGIN = `https://${PRIMARY_APP_HOST}`;

export function isImpersonationHost(host: string | undefined | null): boolean {
  if (!host) return false;
  return host.toLowerCase() === IMPERSONATION_HOST;
}

export function isRunningInImpersonation(): boolean {
  if (typeof window === "undefined") return false;
  return isImpersonationHost(window.location.host);
}

/**
 * Retourne l'origine à utiliser pour construire une URL publique destinée
 * à être partagée (liens de quiz, invitations, etc.). En mode impersonation
 * (view.albarakaecosysteme.com), on bascule sur l'origine primaire pour ne
 * jamais exposer le domaine d'impersonation à des prospects externes.
 */
export function getPublicAppOrigin(): string {
  if (typeof window === "undefined") return PRIMARY_APP_ORIGIN;
  if (isRunningInImpersonation()) return PRIMARY_APP_ORIGIN;
  return window.location.origin;
}
