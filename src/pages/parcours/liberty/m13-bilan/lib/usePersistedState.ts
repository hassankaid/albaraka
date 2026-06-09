/**
 * Hook de persistance M13 — calque léger (module_id="m13").
 * Détecte la présence de M10 (bannière) et lit le snapshot M12 (nom/baseline programme).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultM13State, freshChecks, STORAGE_KEY, PROFILE_KEY, MODULE_ID, DEBOUNCE_MS, type M13State } from "./types";

function readLocal(): M13State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M13State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

function applyImports(state: M13State, profile: any): M13State {
  if (!profile || typeof profile !== "object") return state;
  const m10 = profile.m10 && (profile.m10.data || profile.m10);
  const m12 = profile.m12 && (profile.m12.data || profile.m12);
  const m10Present = !!m10;
  const m12Data = m12 || null;
  if (state.m10_present === m10Present && state.m12_data === m12Data) return state;
  return { ...state, m10_present: m10Present, m12_data: m12Data };
}
function migrateState(loaded: any): M13State {
  const base = defaultM13State();
  const s: M13State = { ...base, ...loaded };
  s.checks = { ...freshChecks(), ...(loaded.checks || {}) };
  return s;
}
function applyImportsFromLocal(state: M13State): M13State {
  try { const raw = localStorage.getItem(PROFILE_KEY); if (!raw) return state; return applyImports(state, JSON.parse(raw)); } catch { return state; }
}
async function applyImportsFromCloud(state: M13State, userId: string): Promise<M13State> {
  try {
    const { data, error } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM13State {
  state: M13State;
  setState: (next: M13State | ((prev: M13State) => M13State)) => void;
  isLoading: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM13State(userId: string | null): UsePersistedM13State {
  const [state, setStateInternal] = useState<M13State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ? migrateState(local) : defaultM13State());
  });
  const [isLoading, setIsLoading] = useState<boolean>(!!userId);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const local = readLocal();
        const { data, error } = await supabase.from("liberty_module_progress" as never).select("data, updated_at").eq("user_id", userId as never).eq("module_id", MODULE_ID as never).maybeSingle();
        let merged: M13State = local ? migrateState(local) : defaultM13State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) { merged = migrateState((data as any).data); writeLocal(merged); }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) setStateInternal(merged);
      } catch (e) { console.warn("[M13] init cloud failed:", (e as Error).message); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M13State) => {
    if (!userId) return;
    try {
      const status = snapshot.signed ? "signed" : "in_progress";
      const payload: any = { user_id: userId, module_id: MODULE_ID, data: snapshot, status, updated_at: new Date().toISOString() };
      if (snapshot.signed) payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from("liberty_module_progress" as never).upsert(payload, { onConflict: "user_id,module_id" });
      if (error) throw error;
    } catch (e) { console.warn("[M13] save cloud failed:", (e as Error).message); }
  }, [userId]);

  const setState = useCallback((next: M13State | ((prev: M13State) => M13State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M13State) => M13State)(prev) : next;
      const enriched: M13State = { ...computed, _updated_at: new Date().toISOString() };
      writeLocal(enriched);
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => { void pushCloud(enriched); }, DEBOUNCE_MS);
      return enriched;
    });
  }, [pushCloud]);

  const flushNow = useCallback(async () => {
    if (debounceRef.current !== null) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
    await pushCloud(state);
  }, [state, pushCloud]);

  const resetState = useCallback(async () => {
    if (debounceRef.current !== null) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
    const fresh = applyImportsFromLocal(defaultM13State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    if (userId) {
      try { await supabase.from("liberty_module_progress" as never).delete().eq("user_id", userId as never).eq("module_id", MODULE_ID as never); }
      catch (e) { console.warn("[M13] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); }, []);

  return { state, setState, isLoading, resetState, flushNow };
}
