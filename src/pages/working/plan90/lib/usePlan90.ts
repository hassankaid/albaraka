/** Persistance cloud du Plan 90 jours (table closing_plan90, 1 ligne/user, data JSONB). */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emptyPlan, emptyDay, emptyWeek, LEGACY_SK, type Plan90Data, type DayData } from "./config";

const DEBOUNCE_MS = 600;

function normalize(loaded: any): Plan90Data {
  const base = emptyPlan();
  if (!loaded || typeof loaded !== "object") return base;
  for (let w = 1; w <= 12; w++) {
    const lw = loaded[w];
    if (!lw || typeof lw !== "object") { base[w] = emptyWeek(w); continue; }
    const days: Record<number, DayData> = {};
    for (let d = 0; d < 7; d++) {
      const ld = lw.days && lw.days[d];
      days[d] = ld && typeof ld === "object"
        ? { ...emptyDay(), ...ld, emotions: Array.isArray(ld.emotions) ? ld.emotions : [] }
        : emptyDay();
    }
    base[w] = { week: w, days };
  }
  return base;
}

function readLegacy(): Plan90Data | null {
  try { const s = localStorage.getItem(LEGACY_SK); return s ? normalize(JSON.parse(s)) : null; } catch { return null; }
}

export function usePlan90(userId: string | null | undefined) {
  const [data, setDataState] = useState<Plan90Data>(() => emptyPlan());
  const [isLoading, setIsLoading] = useState<boolean>(!!userId);
  const debounceRef = useRef<number | null>(null);

  const pushCloud = useCallback(async (snapshot: Plan90Data) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("closing_plan90" as never).upsert(
        { user_id: userId, data: snapshot as never, updated_at: new Date().toISOString() } as never,
        { onConflict: "user_id" },
      );
      if (error) throw error;
    } catch (e) { console.warn("[Plan90] save failed:", (e as Error).message); }
  }, [userId]);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from("closing_plan90" as never)
          .select("data")
          .eq("user_id", userId as never)
          .maybeSingle();
        let next: Plan90Data;
        const cloud = !error && row ? (row as any).data : null;
        const hasCloud = cloud && typeof cloud === "object" && Object.keys(cloud).length > 0;
        if (hasCloud) {
          next = normalize(cloud);
        } else {
          const legacy = readLegacy();
          if (legacy) { next = legacy; void pushCloud(legacy); }
          else next = emptyPlan();
        }
        if (!cancelled) setDataState(next);
      } catch (e) {
        console.warn("[Plan90] load failed:", (e as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, pushCloud]);

  const setData = useCallback((updater: Plan90Data | ((prev: Plan90Data) => Plan90Data)) => {
    setDataState((prev) => {
      const next = typeof updater === "function" ? (updater as (p: Plan90Data) => Plan90Data)(prev) : updater;
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => { void pushCloud(next); }, DEBOUNCE_MS);
      return next;
    });
  }, [pushCloud]);

  const reset = useCallback(() => {
    const fresh = emptyPlan();
    setDataState(fresh);
    if (debounceRef.current !== null) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
    void pushCloud(fresh);
  }, [pushCloud]);

  useEffect(() => () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); }, []);

  return { data, setData, isLoading, reset };
}
