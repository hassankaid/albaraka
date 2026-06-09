/**
 * Hook de persistance M11 — calque M8 (module_id="m11").
 * Importe M1,M2,M3,M5,M6,M7,M8,M10 depuis liberty_user_profile, prérempli Point A/B,
 * tier (depuis prix M6) et auto-coche les items de gate selon l'amont (non destructif).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultM11State, freshData, freshGate, tierFromPrice,
  STORAGE_KEY, PROFILE_KEY, MODULE_ID, DEBOUNCE_MS, type M11State,
} from "./types";

function readLocal(): M11State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M11State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

// ─── Mappers amont (port verbatim, lecture défensive multi-shape) ─────
function buildM1FromProfile(p: any): any {
  if (!p || typeof p !== "object") return null;
  if (!p.sous_niche_2 && !p.avatar && !p.m1) return null;
  const m1 = p.m1 || {};
  return {
    niche: (p.sous_niche_2 && p.sous_niche_2.cible) || m1.niche || m1.sous_niche_2 || "",
    niche_phrase: (p.sous_niche_2 && p.sous_niche_2.phrase) || m1.niche_phrase || "",
    avatar_nom: (p.avatar && p.avatar.socio && p.avatar.socio.nom) || m1.avatar_nom || p.avatar || "",
    avatar_age: (p.avatar && p.avatar.socio && p.avatar.socio.age) || m1.avatar_age || "",
    marche: p.marche || "",
    complete: !!(p.m1_completed_at || (m1 && m1.complete)),
  };
}
function _mapM2(d: any): any {
  if (!d || typeof d !== "object") return null;
  const sd = (d.data && typeof d.data === "object") ? d.data : d;
  const pain = (sd.step1 && sd.step1.pains && sd.step1.pains.map((p: any) => p && p.text).filter(Boolean)[0])
    || d.dominant_pain || (d.steps && d.steps.douleur && d.steps.douleur.bloc1) || "";
  return { dominant_pain: pain };
}
function _mapM3(d: any): any {
  if (!d || typeof d !== "object") return null;
  return {
    hero_mecanisme_nom: d.hero_mecanisme_nom || (d.mecanisme && d.mecanisme.nom) || "",
    headline_promesse: d.headline_promesse || (d.promesse && d.promesse.text) || "",
    complete: !!(d.completed || d.complete || (d.engagement && d.engagement.date_signature) || d.signed),
  };
}
function _mapM5(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = d.handoff_to_m6 || d;
  const sd = (d.state && d.state.data) || d.data || {};
  const pont = sd.pont || {};
  return {
    ht_point_a: h.ht_point_a || (pont.pointA && pont.pointA.formulated) || "",
    ht_point_b: h.ht_point_b || (pont.pointB && pont.pointB.formulated) || "",
    ht_timeframe_days: h.ht_timeframe_days || 90,
    headline_promesse: h.headline_promesse || "",
    complete: !!(h.signed || d.signed),
  };
}
function _mapM6(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = d.handoff_to_m7 || d;
  const sd = (d.state && d.state.data) || d.data || {};
  const pv = sd.prix_valeur || {};
  return {
    prix_ht: parseInt(h.prix_ht, 10) || parseInt(pv.prix_ht, 10) || 0,
    dominant_pain: h.dominant_pain || null,
    point_a: h.point_a || null,
    point_b: h.point_b || null,
    headline_promesse: h.headline_promesse || null,
    complete: !!(h.signed || d.signed),
  };
}
function _mapM7(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = (d.handoff_to_m8 && typeof d.handoff_to_m8 === "object") ? d.handoff_to_m8 : d;
  return {
    type_garantie_label: h.type_garantie_label || h.type_label || "",
    promesse_resultat: h.promesse_resultat || "",
    formule_marketing: h.formule_marketing || h.expose_formule_marketing || "",
    vendeur_statut: h.vendeur_statut || "",
    complete: !!(h.signed || d.signed),
  };
}
function _mapM8(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = (d.handoff_to_m9 && typeof d.handoff_to_m9 === "object") ? d.handoff_to_m9 : d;
  const sd = (d.data && typeof d.data === "object") ? d.data : d;
  const bc = sd.brief_client || {};
  return {
    contexte: h.contexte || bc.contexte || "lifestyle",
    contexte_label: h.contexte_label || "",
    complete: !!d.signed,
  };
}
function _mapM10(d: any): any {
  if (!d || typeof d !== "object") return null;
  return {
    happy_clients_count: parseInt(d.happy_clients_count, 10) || 0,
    onboarding_validated: !!d.onboarding_validated,
    retours_positifs: !!d.retours_positifs,
    complete: !!d.signed || !!d.completed_at,
  };
}

function applyImports(state: M11State, profile: any): M11State {
  if (!profile || typeof profile !== "object") return state;
  if (state.demoMode) return state;
  const next: M11State = { ...state };
  let touched = false;

  const set = (key: string, val: any) => {
    if (val && !next[key as keyof M11State]) { (next as any)[key] = val; (next as any)[key.replace("_data", "_source")] = "profile"; touched = true; }
  };
  set("m1_data", buildM1FromProfile(profile));
  set("m2_data", _mapM2(profile.m2));
  set("m3_data", _mapM3(profile.m3));
  set("m5_data", _mapM5(profile.m5));
  set("m6_data", _mapM6(profile.m6));
  set("m7_data", _mapM7(profile.m7));
  set("m8_data", _mapM8(profile.m8));
  set("m10_data", _mapM10(profile.m10));

  // Prefill non destructif
  const m2 = next.m2_data, m5 = next.m5_data, m6 = next.m6_data, m10 = next.m10_data;
  const data = { ...next.data, gate: { ...next.data.gate } };
  let dataTouched = false;
  if (!data.point_a) {
    const c = (m5 && m5.ht_point_a) || (m2 && m2.dominant_pain) || (m6 && m6.dominant_pain) || "";
    if (c) { data.point_a = c; dataTouched = true; }
  }
  if (!data.point_b) {
    const c = (m5 && m5.ht_point_b) || (m6 && m6.point_b) || "";
    if (c) { data.point_b = c; dataTouched = true; }
  }
  if (!data.tier_bloom_target && m6 && m6.prix_ht) {
    data.tier_bloom_target = tierFromPrice(m6.prix_ht); dataTouched = true;
  }
  if (m10 && (m10.happy_clients_count >= 10 || m10.complete)) {
    if (!data.gate.dix_clients_heureux) { data.gate.dix_clients_heureux = true; dataTouched = true; }
    if (!data.gate.integration_validee && m10.onboarding_validated) { data.gate.integration_validee = true; dataTouched = true; }
    if (!data.gate.retours_positifs && m10.retours_positifs) { data.gate.retours_positifs = true; dataTouched = true; }
  }
  if (next.m1_data && next.m1_data.complete && !data.gate.niche_specifique) { data.gate.niche_specifique = true; dataTouched = true; }
  if (next.m3_data && next.m3_data.complete && !data.gate.offre_validee) { data.gate.offre_validee = true; dataTouched = true; }
  if (dataTouched) { next.data = data; touched = true; }

  return touched ? next : state;
}

/** Migration douce d'un state chargé (complète les clés manquantes). */
function migrateState(loaded: any): M11State {
  const base = defaultM11State();
  const s: M11State = { ...base, ...loaded };
  s.data = { ...freshData(), ...(loaded.data || {}) };
  if (!s.data.gate) s.data.gate = freshGate();
  const fg = freshGate();
  (Object.keys(fg) as (keyof typeof fg)[]).forEach((k) => {
    if (typeof (s.data.gate as any)[k] === "undefined") (s.data.gate as any)[k] = fg[k];
  });
  if (!Array.isArray(s.data.obstacles_brut)) s.data.obstacles_brut = [];
  if (!Array.isArray(s.data.obstacles_ordonnes)) s.data.obstacles_ordonnes = [];
  if (!Array.isArray(s.data.modules)) s.data.modules = [];
  if (!s.data.duree_programme_mois) s.data.duree_programme_mois = "12";
  if (!s.data.accountability) s.data.accountability = base.data.accountability;
  s.demoMode = null; s._activeDemo = null;
  return s;
}

function applyImportsFromLocal(state: M11State): M11State {
  try { const raw = localStorage.getItem(PROFILE_KEY); if (!raw) return state; return applyImports(state, JSON.parse(raw)); } catch { return state; }
}
async function applyImportsFromCloud(state: M11State, userId: string): Promise<M11State> {
  try {
    const { data, error } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM11State {
  state: M11State;
  setState: (next: M11State | ((prev: M11State) => M11State)) => void;
  isLoading: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM11State(userId: string | null): UsePersistedM11State {
  const [state, setStateInternal] = useState<M11State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ? migrateState(local) : defaultM11State());
  });
  const [isLoading, setIsLoading] = useState<boolean>(!!userId);
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
          .eq("user_id", userId as never).eq("module_id", MODULE_ID as never).maybeSingle();
        let merged: M11State = local ? migrateState(local) : defaultM11State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) { merged = migrateState((data as any).data); writeLocal(merged); }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) setStateInternal(merged);
      } catch (e) {
        console.warn("[M11] init cloud failed:", (e as Error).message);
      } finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M11State) => {
    if (!userId || isDemoRef.current) return;
    try {
      const isComplete = !!(snapshot.signed && snapshot.signed_at);
      const payload: any = { user_id: userId, module_id: MODULE_ID, data: snapshot, status: isComplete ? "completed" : "in_progress", updated_at: new Date().toISOString() };
      if (isComplete) payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from("liberty_module_progress" as never).upsert(payload, { onConflict: "user_id,module_id" });
      if (error) throw error;
    } catch (e) { console.warn("[M11] save cloud failed:", (e as Error).message); }
  }, [userId]);

  const setState = useCallback((next: M11State | ((prev: M11State) => M11State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M11State) => M11State)(prev) : next;
      const enriched: M11State = { ...computed, _updated_at: new Date().toISOString() };
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
    const fresh = applyImportsFromLocal(defaultM11State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    if (userId) {
      try { await supabase.from("liberty_module_progress" as never).delete().eq("user_id", userId as never).eq("module_id", MODULE_ID as never); }
      catch (e) { console.warn("[M11] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); }, []);

  return { state, setState, isLoading, resetState, flushNow };
}
