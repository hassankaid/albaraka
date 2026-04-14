/**
 * Fenêtre d'accès au lien visio :
 *   - Ouvre 15 minutes AVANT le début programmé
 *   - Se ferme à la fin exacte (scheduled_at + duration_minutes)
 */
export const JOIN_EARLY_MINUTES = 15;
export const JOIN_GRACE_MINUTES = 0;

export interface SessionWindowInput {
  scheduled_at: string | Date;
  duration_minutes: number;
  meeting_url?: string | null;
  status?: string | null;
}

export type JoinPhase =
  | "no_link"          // pas de lien fourni
  | "cancelled"        // session annulée
  | "too_early"        // avant start - 10min
  | "open"             // dans la fenêtre active
  | "ended";           // après end + 15min

export function computeJoinPhase(s: SessionWindowInput, now: Date = new Date()): JoinPhase {
  if (s.status === "cancelled") return "cancelled";
  if (!s.meeting_url) return "no_link";

  const start = new Date(s.scheduled_at).getTime();
  const end = start + s.duration_minutes * 60_000;
  const opensAt = start - JOIN_EARLY_MINUTES * 60_000;
  const closesAt = end + JOIN_GRACE_MINUTES * 60_000;
  const t = now.getTime();

  if (t < opensAt) return "too_early";
  if (t > closesAt) return "ended";
  return "open";
}

export function windowOpensAt(s: Pick<SessionWindowInput, "scheduled_at">): Date {
  const start = new Date(s.scheduled_at).getTime();
  return new Date(start - JOIN_EARLY_MINUTES * 60_000);
}
