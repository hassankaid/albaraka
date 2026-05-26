/**
 * Hook de persistance M7 — calque M6 mais module_id="m7".
 * Importe M1-M6 depuis liberty_user_profile. Lit handoff_to_m7 du M6 pour propager upstream_forced.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultM7State, type M7State,
  type M1ImportData, type M2ImportData, type M3ImportData,
  type M4ImportData, type M5ImportData, type M6ImportData,
} from "./types";

const STORAGE_KEY = "m7_garantie_state_v1";
const PROFILE_KEY = "liberty_user_profile_v1";
const MODULE_ID = "m7";
const DEBOUNCE_MS = 500;

function readLocal(): M7State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M7State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function applyImports(state: M7State, profile: any): M7State {
  if (!profile || typeof profile !== "object") return state;
  let next = { ...state };
  let touched = false;

  if (!next.m1_data && profile.sous_niche_2) {
    const m1: M1ImportData = {
      source: "module_1_niche",
      sous_niche_2: profile.sous_niche_2 ?? null,
      avatar: profile.avatar ?? null,
      marche: profile.marche ?? null,
    };
    next = { ...next, m1_data: m1, m1_source: "profile" }; touched = true;
  }

  if (!next.m2_data && profile.m2 && profile.m2.data) {
    const m2: M2ImportData = {
      source: "module_2_psychologie",
      data: {
        dominant_pain: profile.m2.data.step1?.dominant_pain ?? profile.m2.data.dominant_pain ?? undefined,
        step8: profile.m2.data.step8 ?? undefined,
      },
    };
    next = { ...next, m2_data: m2, m2_source: "profile" }; touched = true;
  }

  if (!next.m3_data && profile.m3) {
    const raw = profile.m3;
    const m3: M3ImportData = {
      source: raw.source ?? "module_3_anatomie",
      complete: raw.complete,
      promesse: raw.promesse,
      hero_mecanisme_nom: raw.hero_mecanisme_nom ?? raw.mecanisme?.nom,
      prix_display: raw.prix_display ?? (raw.prix?.montant ? `${raw.prix.montant}€` : undefined),
      garantie: raw.garantie,
    };
    next = { ...next, m3_data: m3, m3_source: "profile" }; touched = true;
  }

  if (!next.m4_data && profile.m4) {
    const raw = profile.m4;
    const m4: M4ImportData = {
      source: raw.source ?? "module_4_value_ladder",
      complete: raw.complete,
      entry_strategy: raw.entry?.strategy ?? raw.entry_strategy ?? null,
      ht_monthly_target: raw.entry?.ht_monthly_target ?? raw.ht_monthly_target,
      strategy_score_is_forced: !!(raw.entry?.forced ?? raw.strategy_score_is_forced),
      ht: raw.ladder?.high ? { name: raw.ladder.high.name, price: raw.ladder.high.price } : raw.ht,
    };
    next = { ...next, m4_data: m4, m4_source: "profile" }; touched = true;
  }

  if (!next.m5_data && profile.m5) {
    const raw = profile.m5;
    const m5: M5ImportData = {
      source: raw.source ?? "module_5_high_ticket",
      complete: raw.complete,
      handoff_to_m6: raw.handoff_to_m6,
    };
    next = { ...next, m5_data: m5, m5_source: "profile" }; touched = true;
  }

  if (!next.m6_data && profile.m6) {
    const raw = profile.m6;
    const m6: M6ImportData = {
      source: raw.source ?? "module_6_pricing",
      complete: raw.complete,
      handoff_to_m7: raw.handoff_to_m7,
    };
    const handoff7 = m6.handoff_to_m7;
    const handoff6 = next.m5_data?.handoff_to_m6;
    next = {
      ...next,
      m6_data: m6,
      m6_source: "profile",
      upstream_forced: !!(handoff7?.upstream_forced
        || handoff7?.strategy_score_is_forced
        || handoff6?.upstream_forced
        || handoff6?.strategy_score_is_forced),
    };
    touched = true;
  }

  return touched ? next : state;
}

function applyImportsFromLocal(state: M7State): M7State {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return state;
    return applyImports(state, JSON.parse(raw));
  } catch { return state; }
}

async function applyImportsFromCloud(state: M7State, userId: string): Promise<M7State> {
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

export interface UsePersistedM7State {
  state: M7State;
  setState: (next: M7State | ((prev: M7State) => M7State)) => void;
  isLoading: boolean;
  isCloudMode: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM7State(userId: string | null): UsePersistedM7State {
  const [state, setStateInternal] = useState<M7State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ?? defaultM7State());
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
        let merged = local ?? defaultM7State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) {
            merged = (data as any).data as M7State;
            writeLocal(merged);
          }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) { setStateInternal(merged); setIsCloudMode(true); }
      } catch (e) {
        console.warn("[M7] init cloud failed:", (e as Error).message);
        if (!cancelled) setIsCloudMode(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M7State) => {
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
      console.warn("[M7] save cloud failed:", (e as Error).message);
    }
  }, [userId]);

  const setState = useCallback((next: M7State | ((prev: M7State) => M7State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M7State) => M7State)(prev) : next;
      const enriched: M7State = { ...computed, _updated_at: new Date().toISOString() };
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
    const fresh = applyImportsFromLocal(defaultM7State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (userId) {
      try {
        await supabase.from("liberty_module_progress" as never).delete()
          .eq("user_id", userId as never).eq("module_id", MODULE_ID as never);
      } catch (e) { console.warn("[M7] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
  }, []);

  return { state, setState, isLoading, isCloudMode, resetState, flushNow };
}
