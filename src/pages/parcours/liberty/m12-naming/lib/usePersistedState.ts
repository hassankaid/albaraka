/**
 * Hook de persistance M12 — calque M11 (module_id="m12").
 * Importe M1-M11 depuis liberty_user_profile (mappers verbatim), dérive upstream_forced.
 * Aucun champ utilisateur prérempli (l'amont sert au contexte + générateurs + handoff).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultM12State, freshData, freshTests, STORAGE_KEY, PROFILE_KEY, MODULE_ID, DEBOUNCE_MS, type M12State } from "./types";

function readLocal(): M12State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M12State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

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
function _mapM2(d: any): any {
  if (!d || typeof d !== "object") return null;
  const sd = (d.data && typeof d.data === "object") ? d.data : d;
  const pain = (sd.step1 && sd.step1.pains && sd.step1.pains.map((p: any) => p && p.text).filter(Boolean)[0]) || d.dominant_pain || (d.steps && d.steps.douleur && d.steps.douleur.bloc1) || "";
  return { dominant_pain: pain };
}
function _mapM3(d: any): any {
  if (!d || typeof d !== "object") return null;
  return {
    hero_mecanisme_nom: d.hero_mecanisme_nom || (d.mecanisme && d.mecanisme.nom) || "",
    headline_promesse: d.headline_promesse || (d.promesse && d.promesse.text) || "",
  };
}
function _mapM4(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = d.handoff_to_m5 || d;
  return { entry_strategy: h.entry_strategy || d.entry_strategy || null, strategy_score_is_forced: !!(h.strategy_score_is_forced || d.strategy_forced), complete: !!(h.signed || d.signed) };
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
    mecanisme_anchor: h.mecanisme_anchor || "",
    headline_promesse: h.headline_promesse || "",
    entry_strategy: h.entry_strategy || null,
    strategy_score_is_forced: !!h.strategy_score_is_forced,
    m5_score_is_forced: !!h.m5_score_is_forced,
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
    payment_options: Array.isArray(h.payment_options) ? h.payment_options : [],
    halal_no_riba: !!(h.halal_no_riba || pa.note_halal_acknowledged),
    bronze: h.bronze || bao.bronze || {}, argent: h.argent || bao.argent || {}, or: h.or || bao.or || {},
    ma_bugatti: h.ma_bugatti || vp.ma_bugatti || "",
    ancrage_phrase: h.ancrage_phrase || vp.ancrage_phrase || "",
    commitment_no_price_drop: h.commitment_no_price_drop || sd.commitment_no_price_drop || null,
    dominant_pain: h.dominant_pain || null, point_a: h.point_a || null, point_b: h.point_b || null,
    headline_promesse: h.headline_promesse || null, entry_strategy: h.entry_strategy || null,
    m6_score_is_forced: !!h.m6_score_is_forced, strategy_score_is_forced: !!h.strategy_score_is_forced,
    avatar: h.avatar || null, niche: h.niche || null, mecanisme_anchor: h.mecanisme_anchor || null,
    complete: !!(h.signed || d.signed),
  };
}
function _mapM7(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = (d.handoff_to_m8 && typeof d.handoff_to_m8 === "object") ? d.handoff_to_m8 : d;
  return {
    type_garantie: h.type_garantie || null,
    type_garantie_label: h.type_garantie_label || h.type_label || "",
    promesse_resultat: h.promesse_resultat || "",
    promesse_duree_jours: parseInt(h.promesse_duree_jours, 10) || 0,
    formule_marketing: h.formule_marketing || h.expose_formule_marketing || "",
    vendeur_statut: h.vendeur_statut || "",
    upstream_forced_inherited: !!h.upstream_forced_inherited,
    m7_score_is_forced: !!h.m7_score_is_forced,
    complete: !!(h.signed || d.signed),
  };
}
function _mapM8(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = (d.handoff_to_m9 && typeof d.handoff_to_m9 === "object") ? d.handoff_to_m9 : d;
  const sd = (d.data && typeof d.data === "object") ? d.data : d;
  const bc = sd.brief_client || {};
  return { nom_offre: h.nom_offre || bc.nom_offre || "", ton_salutation: h.ton_salutation || bc.ton_salutation || "", contexte: h.contexte || bc.contexte || "", complete: !!d.signed };
}
function _mapM10(d: any): any {
  if (!d || typeof d !== "object") return null;
  return { objectif_clients: d.objectif_clients || null, happy_clients_count: d.happy_clients_count || null, complete: !!d.signed || !!d.completed_at };
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
    accountability: d.accountability || sd.accountability || null,
    complete: !!d.signed,
  };
}

function applyImports(state: M12State, profile: any): M12State {
  if (!profile || typeof profile !== "object" || state.demoMode) return state;
  const next: M12State = { ...state };
  let touched = false;
  const set = (key: string, val: any) => {
    if (val && !next[key as keyof M12State]) { (next as any)[key] = val; (next as any)[key.replace("_data", "_source")] = "profile"; touched = true; }
  };
  set("m1_data", buildM1FromProfile(profile));
  set("m2_data", _mapM2(profile.m2));
  set("m3_data", _mapM3(profile.m3));
  set("m4_data", _mapM4(profile.m4));
  set("m5_data", _mapM5(profile.m5));
  set("m6_data", _mapM6(profile.m6));
  set("m7_data", _mapM7(profile.m7));
  set("m8_data", _mapM8(profile.m8));
  set("m10_data", _mapM10(profile.m10));
  set("m11_data", _mapM11(profile.m11));

  // upstream_forced
  const m4 = next.m4_data, m5 = next.m5_data, m6 = next.m6_data, m7 = next.m7_data;
  const forced = !!((m4 && m4.strategy_score_is_forced) || (m5 && (m5.strategy_score_is_forced || m5.m5_score_is_forced)) || (m6 && (m6.m6_score_is_forced || m6.strategy_score_is_forced)) || (m7 && (m7.m7_score_is_forced || m7.upstream_forced_inherited)));
  if (forced && !next.upstream_forced) { next.upstream_forced = true; touched = true; }
  return touched ? next : state;
}

function migrateState(loaded: any): M12State {
  const base = defaultM12State();
  const s: M12State = { ...base, ...loaded };
  s.data = { ...freshData(), ...(loaded.data || {}) };
  if (!Array.isArray(s.data.candidats) || s.data.candidats.length === 0) s.data.candidats = freshData().candidats;
  if (!Array.isArray(s.data.top3_indices)) s.data.top3_indices = [];
  if (!s.data.tests_par_candidat || typeof s.data.tests_par_candidat !== "object") s.data.tests_par_candidat = {};
  Object.keys(s.data.tests_par_candidat).forEach((k) => {
    const t: any = s.data.tests_par_candidat[k];
    if (t && typeof t === "object") ["telephone", "google", "promesse", "resonance"].forEach((key) => { if (!(key + "_trace" in t)) t[key + "_trace"] = ""; });
  });
  if (!s.data.final) s.data.final = freshData().final;
  if (!s.data.positionnement) s.data.positionnement = freshData().positionnement;
  if ((s.data.positionnement as any).categorie_nouvelle && !s.data.positionnement.cat_type) {
    s.data.positionnement.cat_type = (s.data.positionnement as any).categorie_nouvelle;
    delete (s.data.positionnement as any).categorie_nouvelle;
  }
  if (!s.data.methode) s.data.methode = freshData().methode;
  if (!Array.isArray(s.data.modules_renommes)) s.data.modules_renommes = [];
  if (!s.data.generator_inputs) s.data.generator_inputs = freshData().generator_inputs;
  if (typeof s.data.premier_choix_intuitif !== "string") s.data.premier_choix_intuitif = "";
  s.demoMode = null; s._activeDemo = null;
  return s;
}

function applyImportsFromLocal(state: M12State): M12State {
  try { const raw = localStorage.getItem(PROFILE_KEY); if (!raw) return state; return applyImports(state, JSON.parse(raw)); } catch { return state; }
}
async function applyImportsFromCloud(state: M12State, userId: string): Promise<M12State> {
  try {
    const { data, error } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM12State {
  state: M12State;
  setState: (next: M12State | ((prev: M12State) => M12State)) => void;
  isLoading: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM12State(userId: string | null): UsePersistedM12State {
  const [state, setStateInternal] = useState<M12State>(() => {
    const local = readLocal();
    return applyImportsFromLocal(local ? migrateState(local) : defaultM12State());
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
        let merged: M12State = local ? migrateState(local) : defaultM12State();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) { merged = migrateState((data as any).data); writeLocal(merged); }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) setStateInternal(merged);
      } catch (e) { console.warn("[M12] init cloud failed:", (e as Error).message); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M12State) => {
    if (!userId || isDemoRef.current) return;
    try {
      const isComplete = !!(snapshot.signed && snapshot.signed_at);
      const payload: any = { user_id: userId, module_id: MODULE_ID, data: snapshot, status: isComplete ? "completed" : "in_progress", updated_at: new Date().toISOString() };
      if (isComplete) payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from("liberty_module_progress" as never).upsert(payload, { onConflict: "user_id,module_id" });
      if (error) throw error;
    } catch (e) { console.warn("[M12] save cloud failed:", (e as Error).message); }
  }, [userId]);

  const setState = useCallback((next: M12State | ((prev: M12State) => M12State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M12State) => M12State)(prev) : next;
      const enriched: M12State = { ...computed, _updated_at: new Date().toISOString() };
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
    const fresh = applyImportsFromLocal(defaultM12State());
    setStateInternal(fresh);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    if (userId) {
      try { await supabase.from("liberty_module_progress" as never).delete().eq("user_id", userId as never).eq("module_id", MODULE_ID as never); }
      catch (e) { console.warn("[M12] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); }, []);

  return { state, setState, isLoading, resetState, flushNow };
}
