/**
 * Hook de persistance M8 — calque M7 (module_id="m8").
 * Importe M1-M7 depuis liberty_user_profile, détecte upstream_forced et
 * prérempli le brief (nom d'offre + douleur) depuis l'amont si vide.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultM8State, prefillNomOffre, prefillDouleur, type M8State } from "./types";

const STORAGE_KEY = "m8_preuve_sociale_state_v1";
const PROFILE_KEY = "liberty_user_profile_v1";
const MODULE_ID = "m8";
const DEBOUNCE_MS = 500;

function readLocal(): M8State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M8State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

function applyImports(state: M8State, profile: any): M8State {
  if (!profile || typeof profile !== "object") return state;
  let next: M8State = { ...state };
  let touched = false;

  const m7raw = profile.m7?.handoff_to_m8 ?? profile.m7 ?? null;
  const m6raw = profile.m6?.handoff_to_m7 ?? profile.m6 ?? null;
  const m5raw = profile.m5?.handoff_to_m6 ?? profile.m5 ?? null;

  if (!next.m1_data && profile.m1) { next = { ...next, m1_data: profile.m1 }; touched = true; }
  if (!next.m1_data && profile.sous_niche_2) {
    next = { ...next, m1_data: { niche: profile.sous_niche_2, avatar_nom: profile.avatar ?? null } }; touched = true;
  }
  if (!next.m2_data && profile.m2) {
    next = { ...next, m2_data: profile.m2?.data?.step1 ?? profile.m2?.data ?? profile.m2 }; touched = true;
  }
  if (!next.m3_data && profile.m3) { next = { ...next, m3_data: profile.m3 }; touched = true; }
  if (!next.m4_data && profile.m4) { next = { ...next, m4_data: profile.m4 }; touched = true; }
  if (!next.m5_data && m5raw) { next = { ...next, m5_data: m5raw }; touched = true; }
  if (!next.m6_data && m6raw) { next = { ...next, m6_data: m6raw }; touched = true; }
  if (!next.m7_data && m7raw) { next = { ...next, m7_data: m7raw }; touched = true; }

  // upstream_forced : hérité de la cascade M4-M7
  const forced =
    !!(m7raw?.upstream_forced || m7raw?.strategy_score_is_forced ||
       m6raw?.upstream_forced || m6raw?.strategy_score_is_forced ||
       profile.m4?.strategy_score_is_forced);
  if (forced && !next.upstream_forced) { next = { ...next, upstream_forced: true }; touched = true; }

  // Préremplissage du brief si vide
  if (!next.data.brief_client.nom_offre) {
    const nom = prefillNomOffre(next);
    if (nom) { next = { ...next, data: { ...next.data, brief_client: { ...next.data.brief_client, nom_offre: nom } } }; touched = true; }
  }
  if (!next.data.brief_client.douleur_passe_hint) {
    const d = prefillDouleur(next);
    if (d) { next = { ...next, data: { ...next.data, brief_client: { ...next.data.brief_client, douleur_passe_hint: d } } }; touched = true; }
  }

  return touched ? next : state;
}

function applyImportsFromLocal(state: M8State): M8State {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return state;
    return applyImports(state, JSON.parse(raw));
  } catch { return state; }
}

async function applyImportsFromCloud(state: M8State, userId: string): Promise<M8State> {
  try {
    const { data, error } = await supabase
      .from("liberty_user_profile" as never)
      .select("data")
      .eq("user_id", userId as never)
      .maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM8State {
  state: M8State;
  setState: (next: M8State | ((prev: M8State) => M8State)) => void;
  isLoading: boolean;
  isCloudMode: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM8State(userId: string | null): UsePersistedM8State {
  const [state, setStateInternal] = useState<M8State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ?? defaultM8State());
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
        let merged = local ?? defaultM8State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) {
            merged = (data as any).data as M8State;
            writeLocal(merged);
          }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) { setStateInternal(merged); setIsCloudMode(true); }
      } catch (e) {
        console.warn("[M8] init cloud failed:", (e as Error).message);
        if (!cancelled) setIsCloudMode(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M8State) => {
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
      console.warn("[M8] save cloud failed:", (e as Error).message);
    }
  }, [userId]);

  const setState = useCallback((next: M8State | ((prev: M8State) => M8State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M8State) => M8State)(prev) : next;
      const enriched: M8State = { ...computed, _updated_at: new Date().toISOString() };
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
    const fresh = applyImportsFromLocal(defaultM8State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    if (userId) {
      try {
        await supabase.from("liberty_module_progress" as never).delete()
          .eq("user_id", userId as never).eq("module_id", MODULE_ID as never);
      } catch (e) { console.warn("[M8] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
  }, []);

  return { state, setState, isLoading, isCloudMode, resetState, flushNow };
}
