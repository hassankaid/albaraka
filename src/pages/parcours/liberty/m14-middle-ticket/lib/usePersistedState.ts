/**
 * Hook de persistance M14 — calque M12 (module_id="m14").
 * Importe M1/M3/M5/M6/M7/M10/M11/M12/M13 depuis liberty_user_profile (mappers verbatim),
 * dérive upstream_forced (m6/m7/m12) et pré-remplit modules_decision depuis M11.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultM14State, freshData, STORAGE_KEY, PROFILE_KEY, MODULE_ID, DEBOUNCE_MS, type M14State, type M14Step } from "./types";

function readLocal(): M14State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M14State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

// ─── Mappers amont (verbatim, lecture défensive) ──────────────────────
function buildM1FromProfile(p: any): any {
  if (!p || typeof p !== "object") return null;
  if (!p.sous_niche_2 && !p.avatar && !p.m1) return null;
  const m1 = p.m1 || {};
  return {
    niche: (p.sous_niche_2 && p.sous_niche_2.cible) || m1.niche || "",
    niche_phrase: (p.sous_niche_2 && p.sous_niche_2.phrase) || m1.niche_phrase || "",
    avatar_nom: (p.avatar && p.avatar.socio && p.avatar.socio.nom) || m1.avatar_nom || "",
    avatar_age: (p.avatar && p.avatar.socio && p.avatar.socio.age) || m1.avatar_age || "",
    marche: p.marche || "",
    complete: !!(p.m1_completed_at || m1.complete),
  };
}
function _mapM3(d: any): any {
  if (!d || typeof d !== "object") return null;
  return {
    hero_mecanisme_nom: d.hero_mecanisme_nom || (d.mecanisme && d.mecanisme.nom) || "",
    headline_promesse: d.headline_promesse || (d.promesse && d.promesse.text) || "",
    prix_display: d.prix_display || (d.prix && d.prix.montant ? d.prix.montant + "€" : "") || (d.vehicule && d.vehicule.prix) || "",
    vehicule_format: (d.vehicule && d.vehicule.format) || "",
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
    mecanisme_anchor: h.mecanisme_anchor || (sd.structure && sd.structure.mecanisme_anchor) || "",
    headline_promesse: h.headline_promesse || "",
    prix_display: h.prix_display || "",
    complete: !!(h.signed || d.signed),
  };
}
function _mapM6(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = d.handoff_to_m7 || d;
  const sd = (d.state && d.state.data) || d.data || {};
  const pv = sd.prix_valeur || {}, vp = sd.valeur_prix || {}, bao = sd.bao || {}, pa = sd.paiements || {};
  return {
    prix_ht: parseInt(h.prix_ht, 10) || parseInt(pv.prix_ht, 10) || 0,
    resultat_client_12m: parseInt(h.resultat_client_12m, 10) || parseInt(pv.resultat_client_12m, 10) || 0,
    roi_calcule: h.roi_calcule || pv.roi_calcule || 0,
    or: h.or || bao.or || {},
    ma_bugatti: h.ma_bugatti || vp.ma_bugatti || "",
    ancrage_phrase: h.ancrage_phrase || vp.ancrage_phrase || "",
    halal_no_riba: !!(h.halal_no_riba || pa.note_halal_acknowledged),
    dominant_pain: h.dominant_pain || null,
    m6_score_is_forced: !!h.m6_score_is_forced,
    strategy_score_is_forced: !!h.strategy_score_is_forced,
    complete: !!(h.signed || d.signed),
  };
}
function _mapM7(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = (d.handoff_to_m8 && typeof d.handoff_to_m8 === "object") ? d.handoff_to_m8 : d;
  const sd = (d.state && d.state.data) || d.data || {};
  const eg = sd.expose_garantie || {};
  return {
    type_garantie: h.type_garantie || null,
    type_garantie_label: h.type_garantie_label || h.type_label || "",
    formule_marketing: h.formule_marketing || eg.formule_marketing || h.expose_formule_marketing || "",
    upstream_forced_inherited: !!h.upstream_forced_inherited,
    m7_score_is_forced: !!h.m7_score_is_forced,
    complete: !!(h.signed || d.signed),
  };
}
function _mapM10(d: any): any {
  if (!d || typeof d !== "object") return null;
  return { objectif_clients: d.objectif_clients || null, deadline_jours: d.deadline_jours || null, clients_signes: d.clients_signes || 0, complete: !!d.signed || !!d.completed_at };
}
function _mapM11(d: any): any {
  if (!d || typeof d !== "object") return null;
  const sd = (d.state && d.state.data) || d.data || {};
  const prog = d.programme || sd;
  const mods = Array.isArray(prog.modules) ? prog.modules : (Array.isArray(sd.modules) ? sd.modules : []);
  return {
    point_a: prog.point_a || sd.point_a || "",
    point_b: prog.point_b || sd.point_b || "",
    tier_bloom_target: prog.tier_bloom_target || sd.tier_bloom_target || "",
    tier_bloom_target_label: prog.tier_bloom_target_label || "",
    modules: mods,
    nb_modules: prog.nb_modules || mods.length,
    duree_programme_mois: prog.duree_programme_mois || sd.duree_programme_mois || 12,
    complete: !!d.signed,
  };
}
function _mapM12(d: any): any {
  if (!d || typeof d !== "object") return null;
  const sd = (d.state && d.state.data) || d.data || {};
  const n = d.naming || {};
  const fin = sd.final || {}, meth = sd.methode || {};
  const p = d.positionnement || sd.positionnement || {};
  return {
    programme_nom: n.programme_nom || fin.nom || "",
    programme_baseline: n.programme_baseline || fin.baseline || "",
    methode_nom: n.methode_nom || meth.nom || "",
    methode_baseline: n.methode_baseline || meth.baseline || "",
    modules_renommes: Array.isArray(n.modules_renommes) ? n.modules_renommes : (Array.isArray(sd.modules_renommes) ? sd.modules_renommes : []),
    categorie_nouvelle: p.categorie_nouvelle || p.cat_type || "",
    ennemi_declare: p.ennemi_declare || "",
    upstream_forced_inherited: !!d.upstream_forced_inherited,
    complete: !!d.signed,
  };
}
function _mapM13(d: any): any {
  if (!d || typeof d !== "object") return null;
  return { non_negociables_signes: !!d.non_negociables_signes || !!d.all_checked || !!d.signed, complete: !!d.signed };
}

function applyImports(state: M14State, profile: any): M14State {
  if (!profile || typeof profile !== "object" || state.demoMode) return state;
  const next: M14State = { ...state };
  let touched = false;
  const set = (key: string, val: any) => {
    if (val && !next[key as keyof M14State]) {
      (next as any)[key] = val;
      (next as any)[key.replace("_data", "_source")] = "profile";
      touched = true;
    }
  };
  set("m1_data", buildM1FromProfile(profile));
  set("m3_data", _mapM3(profile.m3));
  set("m5_data", _mapM5(profile.m5));
  set("m6_data", _mapM6(profile.m6));
  set("m7_data", _mapM7(profile.m7));
  set("m10_data", _mapM10(profile.m10));
  set("m11_data", _mapM11(profile.m11));
  set("m12_data", _mapM12(profile.m12));
  set("m13_data", _mapM13(profile.m13));

  // upstream_forced (m6 / m7 / m12)
  const m6 = next.m6_data, m7 = next.m7_data, m12 = next.m12_data;
  const forced = !!((m6 && (m6.m6_score_is_forced || m6.strategy_score_is_forced)) || (m7 && (m7.m7_score_is_forced || m7.upstream_forced_inherited)) || (m12 && m12.upstream_forced_inherited));
  if (forced && !next.upstream_forced) { next.upstream_forced = true; touched = true; }

  // pré-remplissage modules_decision depuis M11 si vide
  const m11 = next.m11_data;
  if (m11 && Array.isArray(m11.modules) && (!next.data.modules_decision || next.data.modules_decision.length === 0)) {
    next.data = {
      ...next.data,
      modules_decision: m11.modules.map((mod: any) => ({
        index: mod.index || 0,
        nom_origine: mod.nom || "",
        objectif_origine: mod.objectif_mesurable || "",
        livrable_origine: mod.livrable_attendu || "",
        duree_video_min: mod.duree_video_min || 0,
        decision: "" as const,
        adaptation: "",
      })),
    };
    touched = true;
  }
  return touched ? next : state;
}

function migrateState(loaded: any): M14State {
  const base = defaultM14State();
  const s: M14State = { ...base, ...loaded };
  s.data = { ...freshData(), ...(loaded.data || {}) };
  if (!Array.isArray(s.data.formats_explores)) s.data.formats_explores = [];
  if (typeof s.data.format_choisi !== "string") s.data.format_choisi = "";
  if (typeof s.data.format_justification !== "string") s.data.format_justification = "";
  if (!s.data.matrice_reponses || typeof s.data.matrice_reponses !== "object") s.data.matrice_reponses = { temps: "", niche: "", cadence: "" };
  if (!Array.isArray(s.data.modules_decision)) s.data.modules_decision = [];
  if (typeof s.data.modules_decision_format_origine !== "string") s.data.modules_decision_format_origine = "";
  if (typeof s.data.prix_mt !== "number") s.data.prix_mt = parseInt(s.data.prix_mt as any, 10) || 0;
  if (typeof s.data.prix_mt_unite !== "string") s.data.prix_mt_unite = "";
  if (typeof s.data.valeur_percue_eur !== "number") s.data.valeur_percue_eur = parseInt(s.data.valeur_percue_eur as any, 10) || 0;
  if (typeof s.data.justification_prix !== "string") s.data.justification_prix = "";
  if ((s.data as any).lancement) delete (s.data as any).lancement;
  // migration étapes v1 → v2
  if ((s.current as any) === "lancement") s.current = "pricing";
  if ((s.current as any) === "degraissage") s.current = "architecture";
  if ((s.highest as any) === "lancement") s.highest = "pricing";
  if ((s.highest as any) === "degraissage") s.highest = "architecture";
  s.demoMode = null; s._activeDemo = null;
  return s;
}

function applyImportsFromLocal(state: M14State): M14State {
  try { const raw = localStorage.getItem(PROFILE_KEY); if (!raw) return state; return applyImports(state, JSON.parse(raw)); } catch { return state; }
}
async function applyImportsFromCloud(state: M14State, userId: string): Promise<M14State> {
  try {
    const { data, error } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM14State {
  state: M14State;
  setState: (next: M14State | ((prev: M14State) => M14State)) => void;
  isLoading: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM14State(userId: string | null): UsePersistedM14State {
  const [state, setStateInternal] = useState<M14State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ? migrateState(local) : defaultM14State());
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
        const { data, error } = await supabase.from("liberty_module_progress" as never).select("data, updated_at").eq("user_id", userId as never).eq("module_id", MODULE_ID as never).maybeSingle();
        let merged: M14State = local ? migrateState(local) : defaultM14State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) { merged = migrateState((data as any).data); writeLocal(merged); }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) setStateInternal(merged);
      } catch (e) { console.warn("[M14] init cloud failed:", (e as Error).message); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M14State) => {
    if (!userId || isDemoRef.current) return;
    try {
      const isComplete = !!(snapshot.signed && snapshot.signed_at);
      const payload: any = { user_id: userId, module_id: MODULE_ID, data: snapshot, status: isComplete ? "completed" : "in_progress", updated_at: new Date().toISOString() };
      if (isComplete) payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from("liberty_module_progress" as never).upsert(payload, { onConflict: "user_id,module_id" });
      if (error) throw error;
    } catch (e) { console.warn("[M14] save cloud failed:", (e as Error).message); }
  }, [userId]);

  const setState = useCallback((next: M14State | ((prev: M14State) => M14State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M14State) => M14State)(prev) : next;
      const enriched: M14State = { ...computed, _updated_at: new Date().toISOString() };
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
    const fresh = applyImportsFromLocal(defaultM14State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    if (userId) {
      try { await supabase.from("liberty_module_progress" as never).delete().eq("user_id", userId as never).eq("module_id", MODULE_ID as never); }
      catch (e) { console.warn("[M14] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); }, []);

  return { state, setState, isLoading, resetState, flushNow };
}

export type { M14Step };
