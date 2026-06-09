/** M16 — buildM16Snapshot : handoff M16→M17 (boosters) avec bornes order-bump / OTO. */
import { type M16State, type FormatKey, SCHEMA_VERSION, VERSION, FORMATS_LT, LIVRABLE_LABEL } from "./types";
import { ctx, pricingEval } from "./validations";

export function buildM16Snapshot(state: M16State): any {
  const d = state.data || ({} as any);
  const f = FORMATS_LT[d.format_choisi as FormatKey] || null;
  const pe = pricingEval(state);
  const c = ctx(state);
  return {
    schema_version: SCHEMA_VERSION,
    module: "M16_LOW_TICKET",
    version: VERSION,
    signed: !!state.signed,
    signed_at: state.signed_at || null,
    signed_by: state.signed_by || "",
    lt: {
      format: d.format_choisi || "",
      format_label: f ? f.label : "",
      livrable_type: f ? f.livrable : "",
      livrable_label: f ? LIVRABLE_LABEL[f.livrable] : "",
      titre: d.titre || "",
      promesse: d.promesse_lt || "",
      lien_mt: d.promesse_lien_mt || "",
      prix: pe.lt,
      prix_unite: "one_shot",
      ratio_vs_mt: pe.ratio,
      ratio_ok: pe.ratioOk,
      prix_in_window: pe.inWindow,
      prix_psychologique: pe.isPsycho,
      nb_sections: Array.isArray(d.sections) ? d.sections.length : 0,
      charte: d.appearance ? d.appearance.mode : "albaraka",
    },
    niche: c.niche || null,
    avatar: c.avatar || null,
    mecanisme_nom: c.mecanisme || null,
    programme_mt_nom: c.programme_mt || null,
    prix_mt: c.prix_mt || null,
    prix_ht: c.prix_ht || null,
    halal_no_riba: !!c.halal,
    order_bump_range: { min: Math.round(pe.lt * 0.3), max: Math.round(pe.lt * 0.7) },
    oto_range: { min: Math.round((c.prix_mt || 0) * 0.5), max: Math.round((c.prix_mt || 0) * 0.7) },
    handoff_to_m17: true,
    last_save: state.last_save || null,
  };
}
