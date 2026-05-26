/**
 * Hook de persistance M4 — calque exact du hook M3 mais module_id="m4".
 * Importe M1 + M2 + M3 depuis liberty_user_profile (clé locale + Supabase).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultM4State, type M4State, type M1ImportData, type M2ImportData, type M3ImportData,
  type MarketType,
} from "./types";

const STORAGE_KEY = "m4_value_ladder_state_v1";
const PROFILE_KEY = "liberty_user_profile_v1";
const MODULE_ID = "m4";
const DEBOUNCE_MS = 800;

function readLocal(): M4State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M4State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function inferMarketTypeFromM1(m1: M1ImportData | null): MarketType | null {
  const marcheId = m1?.marche?.id;
  if (!marcheId) return null;
  if (marcheId === "argent") return "b2c_info";
  if (marcheId === "sante" || marcheId === "relations") return "b2c_transfo";
  return null;
}

function inferMarketTypeFromM3(m3: M3ImportData | null): MarketType | null {
  return m3?.market_type ?? null;
}

/** Compute prix_score_global = moyenne des scores M3 (fallback si non fourni). */
function computeM3GlobalScore(m3Snapshot: any): number | null {
  if (!m3Snapshot) return null;
  if (typeof m3Snapshot.prix_score_global === "number") return m3Snapshot.prix_score_global;
  if (m3Snapshot.scores && typeof m3Snapshot.scores === "object") {
    const vals = Object.values(m3Snapshot.scores).filter((v) => typeof v === "number") as number[];
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return null;
}

function applyImports(state: M4State, profile: any): M4State {
  if (!profile || typeof profile !== "object") return state;

  let next = { ...state };
  let touched = false;

  // M1
  if (!next.m1_data && profile.sous_niche_2) {
    const m1: M1ImportData = {
      source: "module_1_niche",
      sous_niche_2: profile.sous_niche_2 ?? null,
      avatar: profile.avatar ?? null,
      marche: profile.marche ?? null,
      archetype: profile.archetype ?? null,
    };
    next = { ...next, m1_data: m1 };
    touched = true;
  }

  // M2
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

  // M3 (snapshot poussé par LockScreen M3)
  if (!next.m3_data && profile.m3) {
    const raw = profile.m3;
    const m3: M3ImportData = {
      source: raw.source ?? "module_3_anatomie",
      version: raw.version,
      complete: raw.complete,
      market_type: raw.market_type ?? null,
      promesse: raw.promesse,
      mecanisme: raw.mecanisme,
      vehicule: raw.vehicule,
      bonus: raw.bonus,
      garantie: raw.garantie,
      urgence: raw.urgence,
      prix: raw.prix,
      scores: raw.scores,
      prix_score_global: computeM3GlobalScore(raw) ?? undefined,
    };
    next = { ...next, m3_data: m3 };
    touched = true;
  }

  // Inférer le market_type si pas encore choisi (priorité : M3 explicite > M1 marché)
  if (!next.market_type) {
    const inferred = inferMarketTypeFromM3(next.m3_data) ?? inferMarketTypeFromM1(next.m1_data);
    if (inferred) {
      next = { ...next, market_type: inferred };
      touched = true;
    }
  }

  return touched ? next : state;
}

function applyImportsFromLocal(state: M4State): M4State {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return state;
    return applyImports(state, JSON.parse(raw));
  } catch { return state; }
}

async function applyImportsFromCloud(state: M4State, userId: string): Promise<M4State> {
  try {
    const { data, error } = await supabase
      .from("liberty_user_profile" as never)
      .select("data")
      .eq("user_id", userId as never)
      .maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM4State {
  state: M4State;
  setState: (next: M4State | ((prev: M4State) => M4State)) => void;
  isLoading: boolean;
  isCloudMode: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM4State(userId: string | null): UsePersistedM4State {
  const [state, setStateInternal] = useState<M4State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ?? defaultM4State());
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
        let merged = local ?? defaultM4State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) {
            merged = (data as any).data as M4State;
            writeLocal(merged);
          }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) { setStateInternal(merged); setIsCloudMode(true); }
      } catch (e) {
        console.warn("[M4] init cloud failed:", (e as Error).message);
        if (!cancelled) setIsCloudMode(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M4State) => {
    if (!userId || isDemoRef.current) return;
    try {
      const isComplete = !!(snapshot.signed && snapshot.signed_at);
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
      console.warn("[M4] save cloud failed:", (e as Error).message);
    }
  }, [userId]);

  const setState = useCallback((next: M4State | ((prev: M4State) => M4State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M4State) => M4State)(prev) : next;
      const enriched: M4State = { ...computed, _updated_at: new Date().toISOString() };
      if (enriched.demoMode) return enriched; // mode démo : RAM only, pas de persistance
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
    const fresh = applyImportsFromLocal(defaultM4State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (userId) {
      try {
        await supabase.from("liberty_module_progress" as never).delete()
          .eq("user_id", userId as never).eq("module_id", MODULE_ID as never);
      } catch (e) { console.warn("[M4] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
  }, []);

  return { state, setState, isLoading, isCloudMode, resetState, flushNow };
}
