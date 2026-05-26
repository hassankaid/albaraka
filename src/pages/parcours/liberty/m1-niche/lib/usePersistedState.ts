/**
 * Hook de persistance hybride pour l'outil M1 NICHE.
 *
 * - Source de vérité côté cloud : table `liberty_module_progress` (module_id=m1).
 * - Cache local : `localStorage` clé `m1_niche_state_v1` pour zéro flicker au reload.
 * - Mode démo : state isolé en mémoire, JAMAIS persisté pour ne pas écraser
 *   le vrai parcours de l'élève.
 * - Sauvegarde Supabase debounced à 800ms pour ne pas spammer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultM1State, type M1State } from "./types";

const STORAGE_KEY = "m1_niche_state_v1";
const MODULE_ID = "m1";
const DEBOUNCE_MS = 800;

function readLocal(): M1State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as M1State) : null;
  } catch {
    return null;
  }
}

function writeLocal(state: M1State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota dépassé : on ignore silencieusement */
  }
}

export interface UsePersistedM1State {
  state: M1State;
  setState: (next: M1State | ((prev: M1State) => M1State)) => void;
  isLoading: boolean;
  isCloudMode: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM1State(userId: string | null): UsePersistedM1State {
  const [state, setStateInternal] = useState<M1State>(() => {
    return readLocal() ?? defaultM1State();
  });
  const [isLoading, setIsLoading] = useState<boolean>(!!userId);
  const [isCloudMode, setIsCloudMode] = useState<boolean>(false);
  const debounceRef = useRef<number | null>(null);
  const isDemoRef = useRef<boolean>(false);
  isDemoRef.current = !!state.demoMode;

  // ─── INITIAL LOAD : compare cloud vs local et garde le plus récent ──────
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
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
        if (cancelled) return;

        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) {
            const cloudState = (data as any).data as M1State;
            writeLocal(cloudState);
            setStateInternal(cloudState);
          } else if (local) {
            // Local plus récent → on garde le local, push silencieux au prochain save
          }
        }
        setIsCloudMode(true);
      } catch (e) {
        console.warn("[M1NICHE] loadModule cloud failed, fallback local:", (e as Error).message);
        setIsCloudMode(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ─── SAVE : local immédiat + cloud debounced (sauf démo) ────────────────
  const pushCloud = useCallback(
    async (snapshot: M1State) => {
      if (!userId || isDemoRef.current) return;
      try {
        const payload: any = {
          user_id: userId,
          module_id: MODULE_ID,
          data: snapshot,
          status: snapshot.completed ? "completed" : "in_progress",
          updated_at: new Date().toISOString(),
        };
        if (snapshot.completed) {
          payload.completed_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from("liberty_module_progress" as never)
          .upsert(payload, { onConflict: "user_id,module_id" });
        if (error) throw error;
      } catch (e) {
        console.warn("[M1NICHE] save cloud failed:", (e as Error).message);
      }
    },
    [userId],
  );

  const setState = useCallback(
    (next: M1State | ((prev: M1State) => M1State)) => {
      setStateInternal((prev) => {
        const computed = typeof next === "function" ? (next as (p: M1State) => M1State)(prev) : next;
        const enriched: M1State = { ...computed, _updated_at: new Date().toISOString() };

        // Mode démo : RAM only.
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
    const fresh = defaultM1State();
    setStateInternal(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* */
    }
    if (userId) {
      try {
        await supabase
          .from("liberty_module_progress" as never)
          .delete()
          .eq("user_id", userId as never)
          .eq("module_id", MODULE_ID as never);
      } catch (e) {
        console.warn("[M1NICHE] reset cloud failed:", (e as Error).message);
      }
    }
  }, [userId]);

  // Clean up timer on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { state, setState, isLoading, isCloudMode, resetState, flushNow };
}
