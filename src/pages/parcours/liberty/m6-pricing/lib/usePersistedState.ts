/**
 * Hook de persistance M6 — calque M5 mais module_id="m6".
 * Importe M1+M2+M3+M4+M5 depuis liberty_user_profile (clé locale + Supabase).
 * Lit handoff_to_m6 du M5 pour propager upstream_forced.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultM6State, type M6State,
  type M1ImportData, type M2ImportData, type M3ImportData,
  type M4ImportData, type M5ImportData,
} from "./types";

const STORAGE_KEY = "m6_pricing_state_v1";
const PROFILE_KEY = "liberty_user_profile_v1";
const MODULE_ID = "m6";
const DEBOUNCE_MS = 500;

function readLocal(): M6State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M6State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function applyImports(state: M6State, profile: any): M6State {
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
    };
    next = { ...next, m1_data: m1, m1_source: "profile" };
    touched = true;
  }

  // M2
  if (!next.m2_data && profile.m2 && profile.m2.data) {
    const m2: M2ImportData = {
      source: "module_2_psychologie",
      data: {
        step8: profile.m2.data.step8 ?? undefined,
        dominant_pain: profile.m2.data.step1?.dominant_pain ?? profile.m2.data.dominant_pain ?? undefined,
        dominant_desire: profile.m2.data.step2?.dominant_desire ?? profile.m2.data.dominant_desire ?? undefined,
      },
    };
    next = { ...next, m2_data: m2, m2_source: "profile" };
    touched = true;
  }

  // M3
  if (!next.m3_data && profile.m3) {
    const raw = profile.m3;
    const m3: M3ImportData = {
      source: raw.source ?? "module_3_anatomie",
      complete: raw.complete,
      promesse: raw.promesse,
      mecanisme: raw.mecanisme,
      prix: raw.prix,
      garantie: raw.garantie,
      prix_score_global: raw.prix_score_global,
      headline_promesse: raw.headline_promesse ?? raw.promesse,
      hero_mecanisme_nom: raw.hero_mecanisme_nom ?? raw.mecanisme?.nom,
      prix_display: raw.prix_display ?? (raw.prix?.montant ? `${raw.prix.montant}€` : undefined),
    };
    next = { ...next, m3_data: m3, m3_source: "profile" };
    touched = true;
  }

  // M4
  if (!next.m4_data && profile.m4) {
    const raw = profile.m4;
    const m4: M4ImportData = {
      source: raw.source ?? "module_4_value_ladder",
      complete: raw.complete,
      entry_strategy: raw.entry?.strategy ?? raw.entry_strategy ?? null,
      entry_strategy_label: raw.entry?.strategy_label ?? raw.entry_strategy_label,
      ht_monthly_target: raw.entry?.ht_monthly_target ?? raw.ht_monthly_target,
      strategy_score: raw.entry?.score ?? raw.strategy_score ?? null,
      strategy_score_is_forced: !!(raw.entry?.forced ?? raw.strategy_score_is_forced),
      ht: raw.ladder?.high ? {
        name: raw.ladder.high.name, price: raw.ladder.high.price,
        format: raw.ladder.high.format, rationale: raw.ladder.high.rationale,
      } : raw.ht,
    };
    next = { ...next, m4_data: m4, m4_source: "profile" };
    touched = true;
  }

  // M5 (handoff_to_m6) — défini par M5 LockScreen
  if (!next.m5_data && profile.m5) {
    const raw = profile.m5;
    const m5: M5ImportData = {
      source: raw.source ?? "module_5_high_ticket",
      complete: raw.complete,
      handoff_to_m6: raw.handoff_to_m6 ?? undefined,
    };
    const handoff = m5.handoff_to_m6;
    next = {
      ...next,
      m5_data: m5,
      m5_source: "profile",
      upstream_forced: !!(handoff?.upstream_forced || handoff?.strategy_score_is_forced),
    };
    touched = true;
  }

  return touched ? next : state;
}

function applyImportsFromLocal(state: M6State): M6State {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return state;
    return applyImports(state, JSON.parse(raw));
  } catch { return state; }
}

async function applyImportsFromCloud(state: M6State, userId: string): Promise<M6State> {
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

export interface UsePersistedM6State {
  state: M6State;
  setState: (next: M6State | ((prev: M6State) => M6State)) => void;
  isLoading: boolean;
  isCloudMode: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM6State(userId: string | null): UsePersistedM6State {
  const [state, setStateInternal] = useState<M6State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ?? defaultM6State());
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
        let merged = local ?? defaultM6State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) {
            merged = (data as any).data as M6State;
            writeLocal(merged);
          }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) { setStateInternal(merged); setIsCloudMode(true); }
      } catch (e) {
        console.warn("[M6] init cloud failed:", (e as Error).message);
        if (!cancelled) setIsCloudMode(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M6State) => {
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
      console.warn("[M6] save cloud failed:", (e as Error).message);
    }
  }, [userId]);

  const setState = useCallback((next: M6State | ((prev: M6State) => M6State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M6State) => M6State)(prev) : next;
      const enriched: M6State = { ...computed, _updated_at: new Date().toISOString() };
      if (enriched.demoMode) return enriched; // mode démo : RAM only
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
    const fresh = applyImportsFromLocal(defaultM6State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (userId) {
      try {
        await supabase.from("liberty_module_progress" as never).delete()
          .eq("user_id", userId as never).eq("module_id", MODULE_ID as never);
      } catch (e) { console.warn("[M6] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
  }, []);

  return { state, setState, isLoading, isCloudMode, resetState, flushNow };
}
