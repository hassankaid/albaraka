/** M13 — buildM13Snapshot : poussé vers liberty_user_profile.data.m13 + handoff M14. */
import { type M13State, SCHEMA_VERSION, VERSION, countChecked, allChecked } from "./types";

export function buildM13Snapshot(state: M13State): any {
  const m12 = state.m12_data;
  return {
    schema_version: SCHEMA_VERSION,
    module: "M13_BILAN",
    version: VERSION,
    signed: !!state.signed,
    signed_at: state.signed_at,
    signed_by: state.signed_by || "",
    checks: {
      niche: !!state.checks.niche,
      offre: !!state.checks.offre,
      appels: !!state.checks.appels,
      closing: !!state.checks.closing,
      happy_clients: !!state.checks.happy_clients,
    },
    nb_checked: countChecked(state),
    all_checked: allChecked(state),
    m10_present_at_signature: !!state.m10_present,
    m12_programme_nom: m12 && m12.naming ? m12.naming.programme_nom || "" : "",
    m12_programme_baseline: m12 && m12.naming ? m12.naming.programme_baseline || "" : "",
    handoff_to_m14: !!state.signed,
    last_save: state.last_save || new Date().toISOString(),
  };
}
