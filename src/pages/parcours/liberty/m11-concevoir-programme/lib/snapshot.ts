/**
 * M11 — buildM11Snapshot : agrégat complet poussé vers liberty_user_profile.data.m11
 * et propagé en aval (M12 NAMING / M13 TRANSITION DIY / M18 VALUE LADDER). Port verbatim.
 */
import {
  type M11State, BLOOM_LEVELS, EXERCICE_TYPES, TIERS, SCHEMA_VERSION, VERSION, deepClone,
  ACCOUNTABILITY_VALIDATION, ACCOUNTABILITY_FREQUENCE, ACCOUNTABILITY_ENGAGEMENT, ACCOUNTABILITY_PROGRESSION,
} from "./types";
import {
  isModuleFicheComplete, computeGateScore, computeAccountabilityForce, isAccountabilityComplete,
  analyzeBloomCoherence, analyzeAccountability, estimateAccountabilityCostPerStudent,
  validateModuleName, validateObjectifMesurable, countObstaclesMalFormules,
} from "./validations";

function lbl(dict: any, key: string): string { return dict[key] ? dict[key].label : ""; }

export function buildM11Snapshot(state: M11State): any {
  const d = state.data;
  const m1 = state.m1_data || {}, m2 = state.m2_data || {}, m3 = state.m3_data || {};
  const m5 = state.m5_data || {}, m6 = state.m6_data || {}, m7 = state.m7_data || {};
  const m8 = state.m8_data || {}, m10 = state.m10_data || {};
  const upstream_forced = !!state.upstream_forced;

  const modulesOut = (d.modules || []).map((m, i) => {
    const leconsArr = Array.isArray(m.lecons) ? m.lecons : [];
    const leconsOut = leconsArr.map((l, li) => ({
      id: l.id || ("lec_" + (i + 1) + "_" + (li + 1)),
      index: li + 1,
      titre: l.titre || "",
      angle: l.angle || "",
      duree_min: parseInt(l.duree_min, 10) || 0,
      active_recall: l.active_recall || "",
      complete: (l.titre || "").trim().length >= 3 && (l.angle || "").trim().length >= 10,
    }));
    const dureeLeconsCalc = leconsOut.reduce((acc, l) => acc + (l.duree_min || 0), 0);
    const nbLeconsAvecRecall = leconsOut.filter((l) => (l.active_recall || "").trim().length >= 10).length;
    return {
      id: m.id || ("mod_" + (i + 1)),
      index: i + 1,
      nom: m.nom || "",
      obstacle_origine: m.obstacle_origine || "",
      objectif_mesurable: m.objectif_mesurable || "",
      niveau_bloom: m.niveau_bloom || "",
      niveau_bloom_label: BLOOM_LEVELS[m.niveau_bloom as keyof typeof BLOOM_LEVELS] ? BLOOM_LEVELS[m.niveau_bloom as keyof typeof BLOOM_LEVELS].label : "",
      duree_video_min: parseInt(m.duree_video, 10) || 0,
      type_exercice: m.type_exercice || "",
      type_exercice_label: EXERCICE_TYPES[m.type_exercice as keyof typeof EXERCICE_TYPES] ? EXERCICE_TYPES[m.type_exercice as keyof typeof EXERCICE_TYPES].label : "",
      livrable_attendu: m.livrable_attendu || "",
      mise_situation: m.mise_situation || "",
      auto_evaluation: m.auto_evaluation || "",
      concepts_revises: m.concepts_revises || "",
      mode_validation: m.mode_validation || "",
      mode_validation_effectif: m.mode_validation || (d.accountability && d.accountability.validation_par_defaut) || "",
      lecons: leconsOut,
      nb_lecons: leconsOut.length,
      nb_lecons_completes: leconsOut.filter((l) => l.complete).length,
      nb_lecons_avec_recall: nbLeconsAvecRecall,
      duree_lecons_min: dureeLeconsCalc,
      complete: isModuleFicheComplete(m),
    };
  });

  const dureeTotale = modulesOut.reduce((acc, m) => acc + (m.duree_video_min || 0), 0);
  const totalLecons = modulesOut.reduce((acc, m) => acc + (m.nb_lecons || 0), 0);
  const totalLeconsCompletes = modulesOut.reduce((acc, m) => acc + (m.nb_lecons_completes || 0), 0);
  const gateScore = computeGateScore(d);
  const cohAnalysis = analyzeBloomCoherence(d);
  const a = d.accountability || ({} as any);
  const acAnalysis = analyzeAccountability(d, m6);
  const costEst = estimateAccountabilityCostPerStudent(d, m6);

  return {
    schema_version: SCHEMA_VERSION,
    module: "M11_CONCEVOIR_PROGRAMME",
    version: VERSION,
    signed: !!state.signed,
    signed_at: state.signed_at || null,
    signed_by: state.signed_by || "",

    programme: {
      point_a: d.point_a || "",
      point_b: d.point_b || "",
      tier_bloom_target: d.tier_bloom_target || "",
      tier_bloom_target_label: TIERS[d.tier_bloom_target as keyof typeof TIERS] ? TIERS[d.tier_bloom_target as keyof typeof TIERS].label : "",
      obstacles_brut: (d.obstacles_brut || []).filter((o) => (o || "").trim().length > 0),
      obstacles_ordonnes: d.obstacles_ordonnes || [],
      modules: modulesOut,
      nb_modules: modulesOut.length,
      nb_lecons_total: totalLecons,
      nb_lecons_completes: totalLeconsCompletes,
      duree_totale_min: dureeTotale,
      duree_programme_mois: parseInt(d.duree_programme_mois, 10) || 12,
    },
    gate: {
      items: deepClone(d.gate),
      score: gateScore,
      override_warning: !!d.gate.override_warning,
      passed: gateScore >= 6 && (gateScore >= 8 || !!d.gate.override_warning),
    },
    bloom_coherence: { score: cohAnalysis.score, warnings: cohAnalysis.warnings || [] },
    accountability: {
      validation_par_defaut: a.validation_par_defaut || "",
      validation_par_defaut_label: lbl(ACCOUNTABILITY_VALIDATION, a.validation_par_defaut),
      frequence_contact_humain: a.frequence_contact_humain || "",
      frequence_contact_humain_label: lbl(ACCOUNTABILITY_FREQUENCE, a.frequence_contact_humain),
      engagement_initial: a.engagement_initial || "",
      engagement_initial_label: lbl(ACCOUNTABILITY_ENGAGEMENT, a.engagement_initial),
      progression_modules: a.progression_modules || "",
      progression_modules_label: lbl(ACCOUNTABILITY_PROGRESSION, a.progression_modules),
      force: computeAccountabilityForce(d),
      force_max: 16,
      complete: isAccountabilityComplete(d),
      score: acAnalysis.score,
      warnings: acAnalysis.warnings || [],
      cost_estimate: costEst ? {
        hours_per_program_per_student: costEst.hours_per_program,
        cost_eur_per_program_per_student: costEst.cost_per_program,
        revenue_eur_per_program_per_student: costEst.revenue_per_program,
        ratio_cost_revenue: costEst.ratio,
        duree_programme_mois: costEst.duree_mois,
        overrides_modules_used: costEst.overrides_modules_used,
      } : null,
      accountability_check_required_m18: true,
    },
    validations_syntax: {
      modules_sans_verbe: modulesOut.filter((m) => m.nom && validateModuleName(m.nom)).map((m) => m.index),
      obstacles_mal_formules: countObstaclesMalFormules(d.obstacles_brut),
      objectifs_sans_chiffre: modulesOut.filter((m) => m.objectif_mesurable && validateObjectifMesurable(m.objectif_mesurable)).map((m) => m.index),
    },

    m11_score_is_forced: gateScore < 8 && !!d.gate.override_warning,
    upstream_forced_inherited: upstream_forced,

    niche: m1.niche || null,
    niche_phrase: m1.niche_phrase || null,
    avatar: m1.avatar_nom || null,
    dominant_pain: m2.dominant_pain || null,
    ht_point_a: m5.ht_point_a || null,
    ht_point_b: m5.ht_point_b || null,
    ht_timeframe_days: m5.ht_timeframe_days || null,
    headline_promesse: m5.headline_promesse || m3.headline_promesse || null,
    prix_ht: m6.prix_ht || null,
    bao: m6.bao || null,
    type_garantie_label: m7.type_garantie_label || null,
    promesse_resultat: m7.promesse_resultat || null,
    formule_marketing: m7.formule_marketing || null,
    vendeur_statut: m7.vendeur_statut || null,
    contexte_m8: m8.contexte || null,
    happy_clients_count: m10.happy_clients_count || null,

    handoff_to_m12: true,
    handoff_to_m13: true,
    handoff_to_m18: true,
    last_save: state.last_save || null,
  };
}
