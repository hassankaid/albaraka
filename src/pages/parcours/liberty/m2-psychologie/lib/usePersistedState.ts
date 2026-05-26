/**
 * Hook de persistance pour le M2 PSYCHOLOGIE.
 * Cousin du hook M1 — module_id="m2", clé localStorage différente.
 * Importe automatiquement le profil pivot M1 si présent.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultM2State, mapM1ProfileToM2, prefillFromM1, type M2State } from "./types";

const STORAGE_KEY = "m2_psychologie_state_v1";
const M1_PROFILE_KEY = "liberty_user_profile_v1";
const MODULE_ID = "m2";
const DEBOUNCE_MS = 800;

function readLocal(): M2State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as M2State) : null;
  } catch {
    return null;
  }
}
function writeLocal(s: M2State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* */
  }
}

/**
 * Tente d'importer le profil pivot M1 dans le state M2 si pas déjà fait.
 * Réplique de SharedHandoff.tryImportM1() Sidali.
 */
function applyM1Import(state: M2State): M2State {
  if (state.m1) return state; // déjà importé
  try {
    const raw = localStorage.getItem(M1_PROFILE_KEY);
    if (!raw) return state;
    const profile = JSON.parse(raw);
    const mapped = mapM1ProfileToM2(profile);
    if (!mapped) return state;
    const next: M2State = {
      ...state,
      m1: mapped,
      data: {
        ...state.data,
        welcome: {
          imported: true,
          sourceTag: "Module 1 — " + (mapped.niche.sub_niche || "niche cristallisée"),
        },
      },
    };
    return prefillFromM1(next);
  } catch (e) {
    console.warn("[M2] tryImportM1 (local):", (e as Error).message);
    return state;
  }
}

/**
 * Tente d'importer le profil pivot M1 depuis le cloud Supabase
 * (table liberty_user_profile). Async, complète localement après.
 */
async function applyM1ImportFromCloud(state: M2State, userId: string): Promise<M2State> {
  if (state.m1) return state;
  try {
    const { data, error } = await supabase
      .from("liberty_user_profile" as never)
      .select("data")
      .eq("user_id", userId as never)
      .maybeSingle();
    if (error || !data || !(data as any).data) return state;
    const mapped = mapM1ProfileToM2((data as any).data);
    if (!mapped) return state;
    const next: M2State = {
      ...state,
      m1: mapped,
      data: {
        ...state.data,
        welcome: {
          imported: true,
          sourceTag: "Module 1 — " + (mapped.niche.sub_niche || "niche cristallisée"),
        },
      },
    };
    // Persiste la copie locale pour la prochaine fois.
    try {
      localStorage.setItem(M1_PROFILE_KEY, JSON.stringify((data as any).data));
    } catch {}
    return prefillFromM1(next);
  } catch (e) {
    console.warn("[M2] tryImportM1 (cloud):", (e as Error).message);
    return state;
  }
}

export interface UsePersistedM2State {
  state: M2State;
  setState: (next: M2State | ((prev: M2State) => M2State)) => void;
  isLoading: boolean;
  isCloudMode: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM2State(userId: string | null): UsePersistedM2State {
  const [state, setStateInternal] = useState<M2State>(() => {
    const local = readLocal();
    return applyM1Import(local ?? defaultM2State());
  });
  const [isLoading, setIsLoading] = useState<boolean>(!!userId);
  const [isCloudMode, setIsCloudMode] = useState<boolean>(false);
  const debounceRef = useRef<number | null>(null);
  const isDemoRef = useRef<boolean>(!!state.demoMode);
  isDemoRef.current = !!state.demoMode;

  // ─── INIT load cloud ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const local = readLocal();
        // 1. Load M2 module state from cloud
        const { data, error } = await supabase
          .from("liberty_module_progress" as never)
          .select("data, updated_at")
          .eq("user_id", userId as never)
          .eq("module_id", MODULE_ID as never)
          .maybeSingle();
        let merged = local ?? defaultM2State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) {
            merged = (data as any).data as M2State;
            writeLocal(merged);
          }
        }
        // 2. Import M1 profile from cloud if not yet imported
        if (!merged.m1) {
          merged = await applyM1ImportFromCloud(merged, userId);
        }
        if (!merged.m1) {
          merged = applyM1Import(merged);
        }
        if (!cancelled) {
          setStateInternal(merged);
          setIsCloudMode(true);
        }
      } catch (e) {
        console.warn("[M2] init cloud failed:", (e as Error).message);
        if (!cancelled) setIsCloudMode(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const pushCloud = useCallback(
    async (snapshot: M2State) => {
      if (!userId || isDemoRef.current) return;
      try {
        const isComplete = !!(snapshot.signed?.date);
        const payload: any = {
          user_id: userId,
          module_id: MODULE_ID,
          data: snapshot,
          status: isComplete ? "completed" : "in_progress",
          updated_at: new Date().toISOString(),
        };
        if (isComplete) payload.completed_at = new Date().toISOString();
        const { error } = await supabase
          .from("liberty_module_progress" as never)
          .upsert(payload, { onConflict: "user_id,module_id" });
        if (error) throw error;
      } catch (e) {
        console.warn("[M2] save cloud failed:", (e as Error).message);
      }
    },
    [userId],
  );

  const setState = useCallback(
    (next: M2State | ((prev: M2State) => M2State)) => {
      setStateInternal((prev) => {
        const computed = typeof next === "function" ? (next as (p: M2State) => M2State)(prev) : next;
        const enriched: M2State = { ...computed, _updated_at: new Date().toISOString() };
        if (enriched.demoMode) {
          return enriched;
        }
        writeLocal(enriched);
        if (debounceRef.current !== null) {
          window.clearTimeout(debounceRef.current);
        }
        debounceRef.current = window.setTimeout(() => {
          void pushCloud(enriched);
        }, DEBOUNCE_MS);
        return enriched;
      });
    },
    [pushCloud],
  );

  const flushNow = useCallback(async () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (state.demoMode) return;
    await pushCloud(state);
  }, [state, pushCloud]);

  const resetState = useCallback(async () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const fresh = applyM1Import(defaultM2State()); // garde l'import M1 au reset
    setStateInternal(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (userId) {
      try {
        await supabase
          .from("liberty_module_progress" as never)
          .delete()
          .eq("user_id", userId as never)
          .eq("module_id", MODULE_ID as never);
      } catch (e) {
        console.warn("[M2] reset cloud failed:", (e as Error).message);
      }
    }
  }, [userId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { state, setState, isLoading, isCloudMode, resetState, flushNow };
}
