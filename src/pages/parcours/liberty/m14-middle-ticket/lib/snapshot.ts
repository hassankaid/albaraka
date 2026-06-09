/** M14 — buildM14Snapshot : produit handoff_to_m15 avec propagation upstream complète. */
import { type M14State, SCHEMA_VERSION, VERSION, FORMATS, type FormatKey } from "./types";
import { evaluatePricing, countDecisions, getPrixHT } from "./validations";

export function buildM14Snapshot(state: M14State): any {
  const d = state.data || ({} as any);
  const fmt = d.format_choisi || "";
  const fmtCfg = fmt ? FORMATS[fmt as FormatKey] : null;
  const prixHT = getPrixHT(state);
  const evp = evaluatePricing(d.prix_mt, prixHT, d.prix_mt_unite, d.valeur_percue_eur);
  const stats = countDecisions(d.modules_decision);

  const modulesActifs = (d.modules_decision || [])
    .filter((m: any) => m.decision === "garder" || m.decision === "adapter")
    .map((m: any) => ({
      index: m.index, nom_origine: m.nom_origine, decision: m.decision,
      adaptation: m.adaptation || "", duree_video_min: m.duree_video_min || 0,
      objectif_origine: m.objectif_origine || "", livrable_origine: m.livrable_origine || "",
    }));
  const modulesRetires = (d.modules_decision || [])
    .filter((m: any) => m.decision === "retirer")
    .map((m: any) => ({ index: m.index, nom_origine: m.nom_origine }));

  const m1 = state.m1_data || {};
  const m3 = state.m3_data || {};
  const m5 = state.m5_data || {};
  const m6 = state.m6_data || {};
  const m7 = state.m7_data || {};
  const m10 = state.m10_data || {};
  const m11 = state.m11_data || {};
  const m12 = state.m12_data || {};
  const m13 = state.m13_data || {};
  const upstream_forced = !!state.upstream_forced;

  return {
    schema_version: SCHEMA_VERSION,
    module: "M14_MIDDLE_TICKET",
    version: VERSION,
    signed: !!state.signed,
    signed_at: state.signed_at || null,
    signed_by: state.signed_by || "",
    mt: {
      format: fmt,
      format_label: fmtCfg ? fmtCfg.label : "",
      format_range: fmtCfg ? fmtCfg.range : "",
      format_justification: d.format_justification || "",
      formats_explores: Array.isArray(d.formats_explores) ? d.formats_explores : [],
      matrice_reponses: d.matrice_reponses || {},
      prix_mt: parseInt(d.prix_mt, 10) || 0,
      prix_mt_unite: d.prix_mt_unite || "one_shot",
      prix_mt_annualise: evp.prix_mt_effectif,
      valeur_percue_eur: parseInt(d.valeur_percue_eur, 10) || 0,
      justification_prix: d.justification_prix || "",
      ratio_vs_ht: evp.ratio,
      ratio_vs_ht_pct: evp.ratio_pct,
      ratio_in_range: evp.in_range,
      plancher_ok: evp.plancher_ok,
      ecart_ok: evp.ecart_ok,
      valeur_ok: evp.valeur_ok,
      modules_actifs: modulesActifs,
      modules_retires: modulesRetires,
      nb_modules_actifs: modulesActifs.length,
      nb_modules_gardes: stats.garder,
      nb_modules_adaptes: stats.adapter,
      nb_modules_retires: stats.retirer,
    },
    m14_score_is_forced: false,
    upstream_forced_inherited: upstream_forced,
    niche: m1.niche || null,
    niche_phrase: m1.niche_phrase || null,
    avatar: m1.avatar_nom || null,
    avatar_age: m1.avatar_age || null,
    dominant_pain: (m6 && m6.dominant_pain) || null,
    point_a_ht: m11.point_a || m5.ht_point_a || null,
    point_b_ht: m11.point_b || m5.ht_point_b || null,
    ht_timeframe_days: m5.ht_timeframe_days || null,
    mecanisme_anchor: m5.mecanisme_anchor || null,
    headline_promesse_amont: m5.headline_promesse || m3.headline_promesse || null,
    prix_ht: prixHT || null,
    halal_no_riba: !!m6.halal_no_riba,
    programme_ht_nom: m12.programme_nom || (m6.or && m6.or.nom) || null,
    programme_ht_baseline: m12.programme_baseline || null,
    methode_nom: m12.methode_nom || null,
    methode_baseline: m12.methode_baseline || null,
    categorie_nouvelle: m12.categorie_nouvelle || null,
    ennemi_declare: m12.ennemi_declare || null,
    type_garantie: m7.type_garantie || null,
    type_garantie_label: m7.type_garantie_label || "",
    formule_marketing_garantie: m7.formule_marketing || "",
    objectif_clients_m10: m10.objectif_clients || null,
    non_negociables_signes: !!(m13 && m13.non_negociables_signes),
    tier_bloom_target: m11.tier_bloom_target || null,
    duree_programme_mois: m11.duree_programme_mois || null,
    handoff_to_m15: true,
    last_save: state.last_save || null,
  };
}
