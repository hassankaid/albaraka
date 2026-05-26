/**
 * Hook de persistance M3 — calque exact du hook M2 mais module_id="m3".
 * Importe M1 + M2 depuis liberty_user_profile (clé locale + Supabase).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultM3State, type M3State, type M1ImportData, type M2ImportData, type MarketType } from "./types";

const STORAGE_KEY = "m3_anatomie_state_v3";
const M1_PROFILE_KEY = "liberty_user_profile_v1";
const MODULE_ID = "m3";
const DEBOUNCE_MS = 800;

function readLocal(): M3State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M3State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function inferMarketTypeFromM1(m1: M1ImportData | null): MarketType | null {
  const marcheId = m1?.marche?.id;
  if (!marcheId) return null;
  if (marcheId === "argent") return "b2c_info";
  if (marcheId === "sante" || marcheId === "relations") return "b2c_transfo";
  return null;
}

function applyImports(state: M3State, profile: any): M3State {
  if (!profile || typeof profile !== "object") return state;

  let next = { ...state };
  let touched = false;

  // M1 import — depuis le profil pivot Liberty
  if (!next.m1_data && profile.sous_niche_2) {
    const m1: M1ImportData = {
      source: "module_1_niche",
      sous_niche_2: profile.sous_niche_2 ?? null,
      avatar: profile.avatar ?? null,
      marche: profile.marche ?? null,
      archetype: profile.archetype ?? null,
    };
    next = { ...next, m1_data: m1 };
    // Si market_type pas encore choisi, on infère depuis le marché M1.
    if (!next.market_type) {
      const inferred = inferMarketTypeFromM1(m1);
      if (inferred) next = { ...next, market_type: inferred };
    }
    touched = true;
  }

  // M2 import — depuis le profil pivot Liberty (M2 le push à la fin)
  if (!next.m2_data && profile.m2 && profile.m2.data) {
    const m2: M2ImportData = {
      source: "module_2_psychologie",
      version: profile.m2.version ?? "1.5.0",
      data: profile.m2.data,
      scores: profile.m2.scores,
    };
    next = { ...next, m2_data: m2 };
    touched = true;
  }

  return touched ? next : state;
}

function applyImportsFromLocal(state: M3State): M3State {
  try {
    const raw = localStorage.getItem(M1_PROFILE_KEY);
    if (!raw) return state;
    return applyImports(state, JSON.parse(raw));
  } catch { return state; }
}

async function applyImportsFromCloud(state: M3State, userId: string): Promise<M3State> {
  try {
    const { data, error } = await supabase
      .from("liberty_user_profile" as never)
      .select("data")
      .eq("user_id", userId as never)
      .maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(M1_PROFILE_KEY, JSON.stringify(profile)); } catch {}
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM3State {
  state: M3State;
  setState: (next: M3State | ((prev: M3State) => M3State)) => void;
  isLoading: boolean;
  isCloudMode: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM3State(userId: string | null): UsePersistedM3State {
  const [state, setStateInternal] = useState<M3State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ?? defaultM3State());
  });
  const [isLoading, setIsLoading] = useState<boolean>(!!userId);
  const [isCloudMode, setIsCloudMode] = useState<boolean>(false);
  const debounceRef = useRef<number | null>(null);
  const isDemoRef = useRef<boolean>(!!state.demoMode);
  isDemoRef.current = !!state.demoMode;

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const local = readLocal();
        const { data, error } = await supabase
          .from("liberty_module_progress" as never)
          .select("data, updated_at")
          .eq("user_id", userId as never)
          .eq("module_id", MODULE_ID as never)
          .maybeSingle();
        let merged = local ?? defaultM3State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) {
            merged = (data as any).data as M3State;
            writeLocal(merged);
          }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) { setStateInternal(merged); setIsCloudMode(true); }
      } catch (e) {
        console.warn("[M3] init cloud failed:", (e as Error).message);
        if (!cancelled) setIsCloudMode(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M3State) => {
    if (!userId || isDemoRef.current) return;
    try {
      const isComplete = !!(snapshot.engagement?.date_signature);
      const payload: any = {
        user_id: userId, module_id: MODULE_ID, data: snapshot,
        status: isComplete ? "completed" : "in_progress",
        updated_at: new Date().toISOString(),
      };
      if (isComplete) payload.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("liberty_module_progress" as never)
        .upsert(payload, { onConflict: "user_id,module_id" });
      if (error) throw error;
    } catch (e) {
      console.warn("[M3] save cloud failed:", (e as Error).message);
    }
  }, [userId]);

  const setState = useCallback((next: M3State | ((prev: M3State) => M3State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M3State) => M3State)(prev) : next;
      const enriched: M3State = { ...computed, _updated_at: new Date().toISOString() };
      if (enriched.demoMode) return enriched;
      writeLocal(enriched);
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => { void pushCloud(enriched); }, DEBOUNCE_MS);
      return enriched;
    });
  }, [pushCloud]);

  const flushNow = useCallback(async () => {
    if (debounceRef.current !== null) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
    if (state.demoMode) return;
    await pushCloud(state);
  }, [state, pushCloud]);

  const resetState = useCallback(async () => {
    if (debounceRef.current !== null) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
    const fresh = applyImportsFromLocal(defaultM3State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (userId) {
      try {
        await supabase.from("liberty_module_progress" as never).delete()
          .eq("user_id", userId as never).eq("module_id", MODULE_ID as never);
      } catch (e) { console.warn("[M3] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
  }, []);

  return { state, setState, isLoading, isCloudMode, resetState, flushNow };
}
