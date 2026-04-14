export const IMPERSONATION_HOST = "view.albarakaecosysteme.com";

export const IMPERSONATION_ORIGIN = `https://${IMPERSONATION_HOST}`;

export function isImpersonationHost(host: string | undefined | null): boolean {
  if (!host) return false;
  return host.toLowerCase() === IMPERSONATION_HOST;
}

export function isRunningInImpersonation(): boolean {
  if (typeof window === "undefined") return false;
  return isImpersonationHost(window.location.host);
}
