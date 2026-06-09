/** M18 — buildM18Snapshot : écosystème complet + propagation upstream + handoff_to_m19. */
import { type M18State, SCHEMA_VERSION, VERSION, LEVELS, toIntPrice } from "./types";
import { computeLTV, getPrixLT, getPrixMT, getPrixHT, hasLT, getNiv } from "./validations";
import { effectiveEmails } from "./emails";

export function buildM18Snapshot(state: M18State): any {
  const d = state.data;
  const ltvR = computeLTV(state);
  const m1 = state.m1_data || {}, m6 = state.m6_data || {}, m12 = state.m12_data || {}, m14 = state.m14_data || {};

  const niveaux: Record<string, any> = {};
  LEVELS.forEach((lv) => {
    const n = getNiv(state, lv.key);
    niveaux[lv.key] = {
      niveau: lv.id, label: lv.label, role: lv.roleLabel,
      nom: n.nom || "", paid: lv.paid,
      prix: lv.paid ? toIntPrice(n.prix) : 0,
    };
    if (lv.key === "gratuit") niveaux.gratuit.canaux = n.canaux || "";
    if (lv.key === "mt") niveaux.mt.format = n.format || "";
  });

  return {
    schema_version: SCHEMA_VERSION,
    module: "M18_VALUE_LADDER",
    version: VERSION,
    signed: !!state.signed,
    signed_at: state.signed_at || null,
    signed_by: state.signed_by || "",
    value_ladder: {
      niveaux,
      a_low_ticket: hasLT(state),
      connexion_lt_mt: d.connexion_lt_mt || "",
      transitions: { lt_mt: d.transitions.lt_mt || "", mt_ht: d.transitions.mt_ht || "" },
      emails_ascension: { lt_mt: effectiveEmails(state, "lt_mt"), mt_ht: effectiveEmails(state, "mt_ht") },
      prix_lt: getPrixLT(state), prix_mt: getPrixMT(state), prix_ht: getPrixHT(state),
      taux_lt_mt: Number(d.ltv.taux_lt_mt) || 0,
      entry_level: ltvR.entry,
      entry_price: ltvR.entryPrice,
      ltv: ltvR.ltv,
      ltv_multiple: Number(ltvR.multiple.toFixed(2)),
      ltv_target_ok: ltvR.target_ok,
    },
    upstream_forced_inherited: !!state.upstream_forced,
    niche: m1.niche || null,
    avatar: m1.avatar_nom || null,
    programme_ht_nom: m12.programme_nom || (m6.or && m6.or.nom) || m14.programme_ht_nom || null,
    methode_nom: m12.methode_nom || m14.methode_nom || null,
    categorie_nouvelle: m12.categorie_nouvelle || m14.categorie_nouvelle || null,
    prix_ht: getPrixHT(state) || (m6.prix_ht || null),
    halal_no_riba: !!(m6.halal_no_riba || m14.halal_no_riba),
    handoff_to_m19: true,
    last_save: state.last_save || null,
  };
}
