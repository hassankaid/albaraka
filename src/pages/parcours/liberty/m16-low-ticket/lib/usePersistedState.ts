/**
 * Hook de persistance M16 — calque M14 (module_id="m16").
 * Importe l'amont (M1 via profil, M6/M12/M14/M15 via mappers) puis pré-remplit
 * format_suggere + prix_lt_suggere (équivalent tryImportAll + prefillFromUpstream).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  freshData, freshState, STORAGE_KEY, PROFILE_KEY, MODULE_ID, DEBOUNCE_MS,
  PRIX_MIN, PRIX_MAX, clampInt, type M16State,
} from "./types";
import { ctx } from "./validations";

function readLocal(): M16State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M16State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

// ─── Mappers amont (verbatim) ─────────────────────────────────────────
function buildM1FromProfile(p: any): any {
  if (!p || typeof p !== "object") return null;
  if (!p.sous_niche_2 && !p.avatar) return null;
  return {
    niche: (p.sous_niche_2 && p.sous_niche_2.cible) || "",
    niche_phrase: (p.sous_niche_2 && p.sous_niche_2.phrase) || "",
    avatar_nom: (p.avatar && p.avatar.socio && p.avatar.socio.nom) || "",
    marche: p.marche || "",
    dominant_pain: (p.avatar && p.avatar.psycho && p.avatar.psycho.probleme) || "",
    complete: !!p.m1_completed_at,
  };
}
function _mapM6(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = d.handoff_to_m7 || d;
  const sd = (d.state && d.state.data) || d.data || {};
  const pv = sd.prix_valeur || {};
  return { prix_ht: clampInt(h.prix_ht, clampInt(pv.prix_ht, 0)), dominant_pain: h.dominant_pain || "", complete: !!(h.signed || d.signed) };
}
function _mapM12(d: any): any {
  if (!d || typeof d !== "object") return null;
  const sd = (d.state && d.state.data) || d.data || {};
  const n = d.naming || {};
  const fin = sd.final || {}, meth = sd.methode || {};
  return { methode_nom: n.methode_nom || meth.nom || "", programme_nom: n.programme_nom || fin.nom || "", complete: !!d.signed };
}
function _mapM14(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = (d.handoff_to_m15 && typeof d.handoff_to_m15 === "object") ? d.handoff_to_m15 : d;
  const dd = h.data || h;
  const mt = h.mt || dd.mt || {};
  return {
    prix_mt: clampInt(mt.prix_mt, clampInt(dd.prix_mt, 0)),
    prix_mt_unite: mt.prix_mt_unite || dd.prix_mt_unite || "one_shot",
    format_mt: mt.format || dd.format_choisi || "",
    format_mt_label: mt.format_label || "",
    niche: h.niche || "",
    avatar: h.avatar || "",
    methode_nom: h.methode_nom || "",
    programme_mt_nom: h.programme_ht_nom || "",
    point_a: h.point_a_ht || "",
    point_b: h.point_b_ht || "",
    promesse_amont: h.headline_promesse_amont || "",
    prix_ht: clampInt(h.prix_ht, 0),
    dominant_pain: h.dominant_pain || "",
    halal_no_riba: !!h.halal_no_riba,
    complete: !!(h.signed || d.signed),
  };
}
function _mapM15(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = d.handoff_to_m16 || d;
  return { niche: h.niche || "", avatar_label: h.avatar_label || "", mecanisme_nom: h.mecanisme_nom || "", complete: !!(h.signed || d.signed) };
}

function applyImports(state: M16State, profile: any): M16State {
  if (!profile || typeof profile !== "object" || state.demoMode) return state;
  const next: M16State = { ...state };
  let touched = false;
  const set = (key: string, val: any) => {
    if (val && !next[key as keyof M16State]) {
      (next as any)[key] = val;
      (next as any)[key.replace("_data", "_source")] = "profile";
      touched = true;
    }
  };
  set("m1_data", buildM1FromProfile(profile));
  set("m6_data", _mapM6(profile.m6));
  set("m12_data", _mapM12(profile.m12));
  set("m14_data", _mapM14(profile.m14));
  set("m15_data", _mapM15(profile.m15));
  if (!touched) return state;

  // prefillFromUpstream : format_suggere + prix_lt_suggere
  const nd = { ...next.data };
  let prefilled = false;
  if (!nd.format_choisi) {
    const f = (next.m14_data && next.m14_data.format_mt) || "";
    const sugg = f === "masterclass" || f === "groupe" ? "mini_cours" : "ebook";
    if (nd.format_suggere !== sugg) { nd.format_suggere = sugg; prefilled = true; }
  }
  const c = ctx(next);
  if (!nd.prix_lt && c.prix_mt) {
    let suggest = Math.round(c.prix_mt / 12);
    suggest = Math.max(PRIX_MIN, Math.min(PRIX_MAX, suggest));
    if (nd.prix_lt_suggere !== suggest) { nd.prix_lt_suggere = suggest; prefilled = true; }
  }
  if (prefilled) next.data = nd;
  return next;
}

function migrateState(loaded: any): M16State {
  const base = freshState();
  const s: M16State = { ...base, ...loaded };
  s.data = { ...freshData(), ...(loaded.data || {}) };
  s.data.appearance = { ...freshData().appearance, ...(loaded.data && loaded.data.appearance ? loaded.data.appearance : {}) };
  if (!Array.isArray(s.data.sections)) s.data.sections = [];
  s.demoMode = false; s.demoLabel = "";
  return s;
}

function applyImportsFromLocal(state: M16State): M16State {
  try { const raw = localStorage.getItem(PROFILE_KEY); if (!raw) return state; return applyImports(state, JSON.parse(raw)); } catch { return state; }
}
async function applyImportsFromCloud(state: M16State, userId: string): Promise<M16State> {
  try {
    const { data, error } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM16State {
  state: M16State;
  setState: (next: M16State | ((prev: M16State) => M16State)) => void;
  isLoading: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM16State(userId: string | null): UsePersistedM16State {
  const [state, setStateInternal] = useState<M16State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ? migrateState(local) : freshState());
  });
  const [isLoading, setIsLoading] = useState<boolean>(!!userId);
  const debounceRef = useRef<number | null>(null);
  const isDemoRef = useRef<boolean>(state.demoMode);
  isDemoRef.current = state.demoMode;

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const local = readLocal();
        const { data, error } = await supabase.from("liberty_module_progress" as never).select("data, updated_at").eq("user_id", userId as never).eq("module_id", MODULE_ID as never).maybeSingle();
        let merged: M16State = local ? migrateState(local) : freshState();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) { merged = migrateState((data as any).data); writeLocal(merged); }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) setStateInternal(merged);
      } catch (e) { console.warn("[M16] init cloud failed:", (e as Error).message); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M16State) => {
    if (!userId || isDemoRef.current) return;
    try {
      const isComplete = !!(snapshot.signed && snapshot.signed_at);
      const payload: any = { user_id: userId, module_id: MODULE_ID, data: snapshot, status: isComplete ? "completed" : "in_progress", updated_at: new Date().toISOString() };
      if (isComplete) payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from("liberty_module_progress" as never).upsert(payload, { onConflict: "user_id,module_id" });
      if (error) throw error;
    } catch (e) { console.warn("[M16] save cloud failed:", (e as Error).message); }
  }, [userId]);

  const setState = useCallback((next: M16State | ((prev: M16State) => M16State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M16State) => M16State)(prev) : next;
      const enriched: M16State = { ...computed, _updated_at: new Date().toISOString() };
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
    const fresh = applyImportsFromLocal(freshState());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    if (userId) {
      try { await supabase.from("liberty_module_progress" as never).delete().eq("user_id", userId as never).eq("module_id", MODULE_ID as never); }
      catch (e) { console.warn("[M16] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); }, []);

  return { state, setState, isLoading, resetState, flushNow };
}
