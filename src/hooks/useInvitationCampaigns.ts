import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignRow {
  id: string;
  user_id: string;
  wave_number: number;
  planned_date: string;
  planned_time: string;
  sent_at: string | null;
  error: string | null;
  // joined
  full_name: string;
  email: string;
  onboarding_completed: boolean | null;
}

export interface WaveSummary {
  wave: number;
  date: string;
  total: number;
  sent: number;
  pending: number;
  errors: number;
}

export function useCampaignRows() {
  return useQuery({
    queryKey: ["campaign-rows"],
    queryFn: async (): Promise<CampaignRow[]> => {
      const { data, error } = await (supabase as any)
        .from("invitation_campaigns")
        .select(
          "id, user_id, wave_number, planned_date, planned_time, sent_at, error, profiles!inner(full_name, email, onboarding_completed)",
        )
        .order("wave_number")
        .order("sent_at", { nullsFirst: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        wave_number: r.wave_number,
        planned_date: r.planned_date,
        planned_time: r.planned_time,
        sent_at: r.sent_at,
        error: r.error,
        full_name: r.profiles?.full_name ?? "",
        email: r.profiles?.email ?? "",
        onboarding_completed: r.profiles?.onboarding_completed ?? false,
      }));
    },
    refetchInterval: 30_000,
  });
}

export function useCampaignRuns() {
  return useQuery({
    queryKey: ["campaign-runs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invitation_campaign_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function summarizeWaves(rows: CampaignRow[]): WaveSummary[] {
  const map = new Map<number, WaveSummary>();
  for (const r of rows) {
    const w = r.wave_number;
    if (!map.has(w)) {
      map.set(w, { wave: w, date: r.planned_date, total: 0, sent: 0, pending: 0, errors: 0 });
    }
    const s = map.get(w)!;
    s.total++;
    if (r.sent_at) s.sent++;
    else s.pending++;
    if (r.error) s.errors++;
  }
  return Array.from(map.values()).sort((a, b) => a.wave - b.wave);
}

/** Compute next wave firing time (10:00 Paris = 08:00 UTC). Returns null if all waves done. */
export function nextWaveFireTime(waves: WaveSummary[], now: Date = new Date()): { wave: number; date: Date; remaining: number } | null {
  for (const w of waves) {
    if (w.pending === 0) continue;
    // Build date = planned_date at 10:00 Paris
    const [y, m, d] = w.date.split("-").map(Number);
    // Simple approximation: 10:00 Paris = 08:00 UTC (works for CEST summer)
    const fire = new Date(Date.UTC(y, m - 1, d, 8, 0, 0));
    if (fire.getTime() <= now.getTime()) {
      // Already passed without firing → consider "now" as imminent
      return { wave: w.wave, date: now, remaining: 0 };
    }
    return { wave: w.wave, date: fire, remaining: fire.getTime() - now.getTime() };
  }
  return null;
}
