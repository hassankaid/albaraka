/**
 * M12 — buildM12Snapshot : agrégat poussé vers liberty_user_profile.data.m12
 * et propagé en aval (M13 TRANSITION DIY). Port verbatim Sidali v1.2.1.
 */
import { type M12State, type TechKey, TECHNIQUES, SCHEMA_VERSION, VERSION, freshTests } from "./types";
import { nonEmptyCandidats, countDistinctTechniques, hasMinTrace, compileCategorieNouvelle, evaluateName } from "./validations";

export function buildM12Snapshot(state: M12State): any {
  const d = state.data;
  const f = d.final || ({} as any);
  const p = d.positionnement || ({} as any);
  const me = d.methode || ({} as any);
  const ren = d.modules_renommes || [];
  const candidats = nonEmptyCandidats(d).map((c) => ({
    nom: c.nom, technique: c.technique || "",
    technique_label: c.technique ? TECHNIQUES[c.technique as TechKey]?.label || "" : "",
  }));
  const tests = d.tests_par_candidat || {};
  const finalIdx = f.candidat_idx_source >= 0 ? String(f.candidat_idx_source) : null;
  const finalTests = (finalIdx && tests[finalIdx]) ? tests[finalIdx] : (tests["final"] || freshTests());
  const auto = evaluateName(f.nom || "");
  const compiledCategorie = compileCategorieNouvelle(p);
  const m1 = state.m1_data || {}, m2 = state.m2_data || {}, m3 = state.m3_data || {};
  const m4 = state.m4_data || {}, m5 = state.m5_data || {}, m6 = state.m6_data || {}, m7 = state.m7_data || {};
  const m8 = state.m8_data || {}, m10 = state.m10_data || {}, m11 = state.m11_data || {};
  const upstream_forced = !!state.upstream_forced;

  return {
    schema_version: SCHEMA_VERSION,
    module: "M12_NAMING",
    version: VERSION,
    signed: !!state.signed,
    signed_at: state.signed_at || null,
    signed_by: state.signed_by || "",

    naming: {
      programme_nom: f.nom || "",
      programme_baseline: f.baseline || "",
      programme_technique: f.technique || "",
      programme_technique_label: f.technique ? TECHNIQUES[f.technique as TechKey]?.label || "" : "",
      premier_choix_intuitif: d.premier_choix_intuitif || "",
      premier_choix_intuitif_label: d.premier_choix_intuitif ? TECHNIQUES[d.premier_choix_intuitif as TechKey]?.label || "" : "",
      candidats_explores: candidats,
      nb_techniques_explorees: countDistinctTechniques(d.candidats || []),
      methode_nom: me.nom || "",
      methode_baseline: me.baseline || "",
      methode_est_acronyme: !!me.est_acronyme,
      methode_acronyme_developpe: me.acronyme_developpe || "",
      modules_renommes: ren.map((r) => ({ index: r.index, nom_origine: r.nom_origine || "", nom_final: r.nom_final || "", baseline: r.baseline || "" })),
    },
    positionnement: {
      cat_type: p.cat_type || "",
      cat_cible: p.cat_cible || "",
      cat_resultat: p.cat_resultat || "",
      categorie_nouvelle: compiledCategorie,
      ennemi_declare: p.ennemi_declare || "",
    },
    tests: {
      auto_checks_score: auto.score,
      auto_checks_max: auto.max,
      test_telephone_valide: !!(finalTests.telephone && hasMinTrace(finalTests.telephone_trace)),
      test_telephone_trace: finalTests.telephone_trace || "",
      test_google_valide: !!(finalTests.google && hasMinTrace(finalTests.google_trace)),
      test_google_trace: finalTests.google_trace || "",
      test_promesse_valide: !!(finalTests.promesse && hasMinTrace(finalTests.promesse_trace)),
      test_promesse_trace: finalTests.promesse_trace || "",
      test_resonance_valide: !!(finalTests.resonance && hasMinTrace(finalTests.resonance_trace)),
      test_resonance_trace: finalTests.resonance_trace || "",
      nb_candidats_explores: candidats.length,
    },

    m12_score_is_forced: false,
    upstream_forced_inherited: upstream_forced,

    niche: m1.niche || m7.niche || null,
    niche_phrase: m1.niche_phrase || m7.niche_phrase || null,
    avatar: m1.avatar_nom || m7.avatar || m6.avatar || null,
    avatar_age: m1.avatar_age || null,
    dominant_pain: m2.dominant_pain || m7.dominant_pain || m6.dominant_pain || null,
    point_a: m11.point_a || m5.ht_point_a || m7.point_a || null,
    point_b: m11.point_b || m5.ht_point_b || m7.point_b || m6.point_b || null,
    ht_timeframe_days: m5.ht_timeframe_days || m7.ht_timeframe_days || null,
    mecanisme_anchor: m5.mecanisme_anchor || m7.mecanisme_anchor || m6.mecanisme_anchor || null,
    headline_promesse_amont: m5.headline_promesse || m7.headline_promesse || m6.headline_promesse || m3.headline_promesse || null,
    entry_strategy: m5.entry_strategy || m4.entry_strategy || m7.entry_strategy || m6.entry_strategy || null,
    prix_ht: m6.prix_ht || m7.prix_ht || null,
    payment_options: m6.payment_options || m7.payment_options || [],
    halal_no_riba: m6.halal_no_riba || m7.halal_no_riba || false,
    bao: m7.bao || { bronze: m6.bronze || null, argent: m6.argent || null, or: m6.or || null },
    ma_bugatti: m7.ma_bugatti || m6.ma_bugatti || null,
    ancrage_phrase: m7.ancrage_phrase || m6.ancrage_phrase || null,
    commitment_no_price_drop: m7.commitment_no_price_drop || m6.commitment_no_price_drop || null,

    type_garantie: m7.type_garantie || null,
    type_garantie_label: m7.type_garantie_label || "",
    promesse_resultat: m7.promesse_resultat || "",
    promesse_duree_jours: m7.promesse_duree_jours || 0,
    formule_marketing_garantie: m7.formule_marketing || "",
    vendeur_statut: m7.vendeur_statut || "",

    tier_bloom_target: m11.tier_bloom_target || null,
    tier_bloom_target_label: m11.tier_bloom_target_label || "",
    nb_modules: m11.nb_modules || 0,
    duree_programme_mois: m11.duree_programme_mois || 12,
    modules_m11: Array.isArray(m11.modules) ? m11.modules : [],

    nom_offre_m8: m8.nom_offre || null,
    ton_salutation_m8: m8.ton_salutation || null,
    objectif_clients_m10: m10.objectif_clients || null,

    handoff_to_m13: true,
    last_save: state.last_save || null,
  };
}
