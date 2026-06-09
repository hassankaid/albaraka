/**
 * Hook de persistance M18 — calque M14/M16 (module_id="m18").
 * Importe l'amont (M1 via profil, M5/M6/M11/M12/M14/M16/M17 via mappers) puis pré-remplit
 * les niveaux HT/MT/LT de l'échelle (src='herite'), et dérive upstream_forced.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { freshData, freshState, STORAGE_KEY, PROFILE_KEY, MODULE_ID, DEBOUNCE_MS, LEVEL_KEYS, toIntPrice, type M18State } from "./types";

function readLocal(): M18State | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s: M18State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

// ─── Mappers amont (verbatim, lecture défensive) ──────────────────────
function buildM1FromProfile(p: any): any {
  if (!p || typeof p !== "object") return null;
  if (!p.sous_niche_2 && !p.avatar) return null;
  return {
    schema_version: "m1_v2", module: "M1_NICHE",
    niche: (p.sous_niche_2 && p.sous_niche_2.cible) || "",
    niche_phrase: (p.sous_niche_2 && p.sous_niche_2.phrase) || "",
    avatar_nom: (p.avatar && p.avatar.socio && p.avatar.socio.nom) || "",
    avatar_age: (p.avatar && p.avatar.socio && p.avatar.socio.age) || "",
    marche: p.marche || "",
    complete: !!p.m1_completed_at,
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
  const pv = sd.prix_valeur || {}, bao = sd.bao || {};
  return {
    prix_ht: toIntPrice(h.prix_ht) || toIntPrice(pv.prix_ht),
    or: h.or || bao.or || {},
    halal_no_riba: !!(h.halal_no_riba || (sd.paiements && sd.paiements.note_halal_acknowledged)),
    complete: !!(h.signed || d.signed),
  };
}
function _mapM11(d: any): any {
  if (!d || typeof d !== "object") return null;
  const sd = (d.state && d.state.data) || d.data || {};
  const prog = d.programme || sd;
  const mods = Array.isArray(prog.modules) ? prog.modules : (Array.isArray(sd.modules) ? sd.modules : []);
  return {
    point_a: prog.point_a || sd.point_a || "",
    point_b: prog.point_b || sd.point_b || "",
    nb_modules: prog.nb_modules || mods.length,
    duree_programme_mois: prog.duree_programme_mois || sd.duree_programme_mois || 12,
    complete: !!d.signed,
  };
}
function _mapM12(d: any): any {
  if (!d || typeof d !== "object") return null;
  const sd = (d.state && d.state.data) || d.data || {};
  const n = d.naming || {};
  const p = d.positionnement || sd.positionnement || {};
  const fin = sd.final || {}, meth = sd.methode || {};
  return {
    programme_nom: n.programme_nom || fin.nom || "",
    programme_baseline: n.programme_baseline || fin.baseline || "",
    methode_nom: n.methode_nom || meth.nom || "",
    categorie_nouvelle: p.categorie_nouvelle || "",
    complete: !!d.signed,
  };
}
function _mapM14(d: any): any {
  if (!d || typeof d !== "object") return null;
  const s = d;
  const mt = s.mt || {};
  return {
    mt_format: mt.format || "",
    mt_format_label: mt.format_label || "",
    mt_prix: toIntPrice(mt.prix_mt),
    mt_prix_annualise: toIntPrice(mt.prix_mt_annualise || mt.prix_mt),
    mt_prix_unite: mt.prix_mt_unite || "one_shot",
    programme_ht_nom: s.programme_ht_nom || "",
    programme_ht_baseline: s.programme_ht_baseline || "",
    methode_nom: s.methode_nom || "",
    categorie_nouvelle: s.categorie_nouvelle || "",
    prix_ht: toIntPrice(s.prix_ht),
    halal_no_riba: !!s.halal_no_riba,
    point_b_ht: s.point_b_ht || "",
    niche: s.niche || "",
    avatar: s.avatar || "",
    upstream_forced_inherited: !!s.upstream_forced_inherited,
    complete: !!(s.signed || d.signed),
  };
}
function _mapM16(d: any): any {
  if (!d || typeof d !== "object") return null;
  const sd = (d.state && d.state.data) || d.data || {};
  const h = (d.handoff_to_m17 && typeof d.handoff_to_m17 === "object" ? d.handoff_to_m17 : null)
    || (d.handoff_to_m18 && typeof d.handoff_to_m18 === "object" ? d.handoff_to_m18 : null)
    || d.lt || d.tripwire || (Object.keys(sd).length ? sd : d);
  const nom = h.lt_nom || h.tripwire_nom || h.nom || h.titre || "";
  const prix = toIntPrice(h.lt_prix != null ? h.lt_prix : h.prix_lt != null ? h.prix_lt : h.prix != null ? h.prix : 0);
  const format = h.lt_format || h.format || "";
  if (!nom && !prix) return null;
  return { lt_nom: nom, lt_prix: prix, lt_format: format, complete: !!d.signed };
}
function _mapM17(d: any): any {
  if (!d || typeof d !== "object") return null;
  const h = d.handoff_to_m18 || d;
  const aov = toIntPrice(h.aov != null ? h.aov : h.panier_moyen != null ? h.panier_moyen : 0);
  const hasBump = !!(h.order_bump || h.has_order_bump);
  const hasUpsell = !!(h.upsell || h.has_upsell);
  if (!aov && !hasBump && !hasUpsell) return null;
  return { aov, order_bump: hasBump, upsell: hasUpsell, complete: !!d.signed };
}

function applyImports(state: M18State, profile: any): M18State {
  if (!profile || typeof profile !== "object" || state.demoMode) return state;
  const next: M18State = { ...state };
  let touched = false;
  const set = (key: string, val: any) => {
    if (val && !next[key as keyof M18State]) {
      (next as any)[key] = val;
      (next as any)[key.replace("_data", "_source")] = "profile";
      touched = true;
    }
  };
  set("m1_data", buildM1FromProfile(profile));
  set("m5_data", _mapM5(profile.m5));
  set("m6_data", _mapM6(profile.m6));
  set("m11_data", _mapM11(profile.m11));
  set("m12_data", _mapM12(profile.m12));
  set("m14_data", _mapM14(profile.m14));
  set("m16_data", _mapM16(profile.m16));
  set("m17_data", _mapM17(profile.m17));
  if (!touched) return state;

  // prefillFromUpstream : niveaux HT/MT/LT + upstream_forced
  const m6 = next.m6_data, m12 = next.m12_data, m14 = next.m14_data, m16 = next.m16_data;
  if (m14 && m14.upstream_forced_inherited) next.upstream_forced = true;
  const niveaux = { ...next.data.niveaux, gratuit: { ...next.data.niveaux.gratuit }, lead_magnet: { ...next.data.niveaux.lead_magnet }, lt: { ...next.data.niveaux.lt }, mt: { ...next.data.niveaux.mt }, ht: { ...next.data.niveaux.ht } };
  // HT
  if (niveaux.ht.src !== "manual") {
    const htNom = (m12 && m12.programme_nom) || (m6 && m6.or && m6.or.nom) || (m14 && m14.programme_ht_nom) || "";
    const htPrix = (m6 && m6.prix_ht) || (m14 && m14.prix_ht) || 0;
    if (htNom && !niveaux.ht.nom) { niveaux.ht.nom = htNom; niveaux.ht.src = "herite"; }
    if (htPrix && !niveaux.ht.prix) { niveaux.ht.prix = htPrix; niveaux.ht.src = "herite"; }
  }
  // MT
  if (m14 && niveaux.mt.src !== "manual") {
    const mtNom = m14.methode_nom || ((m12 && m12.programme_nom) ? m12.programme_nom + " — version autonome" : (m14.programme_ht_nom ? m14.programme_ht_nom + " — version autonome" : ""));
    const mtPrix = m14.mt_prix_annualise || m14.mt_prix || 0;
    if (mtNom && !niveaux.mt.nom) { niveaux.mt.nom = mtNom; niveaux.mt.src = "herite"; }
    if (mtPrix && !niveaux.mt.prix) { niveaux.mt.prix = mtPrix; niveaux.mt.src = "herite"; }
    if (m14.mt_format_label && !niveaux.mt.format) niveaux.mt.format = m14.mt_format_label;
  }
  // LT
  if (m16 && niveaux.lt.src !== "manual") {
    if (m16.lt_nom && !niveaux.lt.nom) { niveaux.lt.nom = m16.lt_nom; niveaux.lt.src = "herite"; }
    if (m16.lt_prix && !niveaux.lt.prix) { niveaux.lt.prix = m16.lt_prix; niveaux.lt.src = "herite"; }
  }
  next.data = { ...next.data, niveaux };
  return next;
}

function migrateState(loaded: any): M18State {
  const base = freshState();
  const s: M18State = { ...base, ...loaded };
  s.data = { ...freshData(), ...(loaded.data || {}) };
  const fd = freshData();
  if (!s.data.niveaux || typeof s.data.niveaux !== "object") s.data.niveaux = fd.niveaux;
  LEVEL_KEYS.forEach((k) => { if (!(s.data.niveaux as any)[k] || typeof (s.data.niveaux as any)[k] !== "object") (s.data.niveaux as any)[k] = (fd.niveaux as any)[k]; });
  if (!s.data.transitions || typeof s.data.transitions !== "object") s.data.transitions = { lt_mt: "", mt_ht: "" };
  if (!s.data.ltv || typeof s.data.ltv !== "object") s.data.ltv = { taux_lt_mt: 0 };
  if (typeof s.data.ltv.taux_lt_mt !== "number") s.data.ltv.taux_lt_mt = parseInt(s.data.ltv.taux_lt_mt as any, 10) || 0;
  if (!s.data.emails || typeof s.data.emails !== "object") s.data.emails = { lt_mt: [], mt_ht: [] };
  if (!Array.isArray(s.data.emails.lt_mt)) s.data.emails.lt_mt = [];
  if (!Array.isArray(s.data.emails.mt_ht)) s.data.emails.mt_ht = [];
  if (typeof s.data.connexion_lt_mt !== "string") s.data.connexion_lt_mt = "";
  s.demoMode = false; s._activeDemo = null;
  return s;
}

function applyImportsFromLocal(state: M18State): M18State {
  try { const raw = localStorage.getItem(PROFILE_KEY); if (!raw) return state; return applyImports(state, JSON.parse(raw)); } catch { return state; }
}
async function applyImportsFromCloud(state: M18State, userId: string): Promise<M18State> {
  try {
    const { data, error } = await supabase.from("liberty_user_profile" as never).select("data").eq("user_id", userId as never).maybeSingle();
    if (error || !data) return state;
    const profile = (data as any).data;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return applyImports(state, profile);
  } catch { return state; }
}

export interface UsePersistedM18State {
  state: M18State;
  setState: (next: M18State | ((prev: M18State) => M18State)) => void;
  isLoading: boolean;
  resetState: () => Promise<void>;
  flushNow: () => Promise<void>;
}

export function usePersistedM18State(userId: string | null): UsePersistedM18State {
  const [state, setStateInternal] = useState<M18State>(() => {
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
        let merged: M18State = local ? migrateState(local) : freshState();
        if (!error && data) {
          const cloudTs = new Date((data as any).updated_at).getTime();
          const localTs = local?._updated_at ? new Date(local._updated_at).getTime() : 0;
          if (cloudTs >= localTs && (data as any).data) { merged = migrateState((data as any).data); writeLocal(merged); }
        }
        merged = await applyImportsFromCloud(merged, userId);
        merged = applyImportsFromLocal(merged);
        if (!cancelled) setStateInternal(merged);
      } catch (e) { console.warn("[M18] init cloud failed:", (e as Error).message); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const pushCloud = useCallback(async (snapshot: M18State) => {
    if (!userId || isDemoRef.current) return;
    try {
      const isComplete = !!(snapshot.signed && snapshot.signed_at);
      const payload: any = { user_id: userId, module_id: MODULE_ID, data: snapshot, status: isComplete ? "completed" : "in_progress", updated_at: new Date().toISOString() };
      if (isComplete) payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from("liberty_module_progress" as never).upsert(payload, { onConflict: "user_id,module_id" });
      if (error) throw error;
    } catch (e) { console.warn("[M18] save cloud failed:", (e as Error).message); }
  }, [userId]);

  const setState = useCallback((next: M18State | ((prev: M18State) => M18State)) => {
    setStateInternal((prev) => {
      const computed = typeof next === "function" ? (next as (p: M18State) => M18State)(prev) : next;
      const enriched: M18State = { ...computed, _updated_at: new Date().toISOString() };
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
      catch (e) { console.warn("[M18] reset cloud failed:", (e as Error).message); }
    }
  }, [userId]);

  useEffect(() => () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); }, []);

  return { state, setState, isLoading, resetState, flushNow };
}
