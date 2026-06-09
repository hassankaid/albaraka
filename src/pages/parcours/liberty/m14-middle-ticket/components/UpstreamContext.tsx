/** Bandeau de contexte amont M14 (Niche, Avatar, Point B HT, Programme/Offre Or HT, Prix HT, Modules HT). */
import { type M14State } from "../lib/types";

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] px-3 py-2.5" style={{ background: "#0C0B08", border: "0.5px solid rgba(201,168,76,0.14)" }}>
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/40">{label}</div>
      <div className="mt-0.5 text-[12px] leading-[1.35] text-white/85">{value}</div>
    </div>
  );
}

export function UpstreamContext({ state }: { state: M14State }) {
  const m1 = state.m1_data || {};
  const m5 = state.m5_data || {};
  const m6 = state.m6_data || {};
  const m11 = state.m11_data || {};
  const m12 = state.m12_data || {};

  const cards: { label: string; value: string }[] = [];
  if (m1.niche) cards.push({ label: "Niche", value: m1.niche });
  if (m1.avatar_nom) cards.push({ label: "Avatar", value: m1.avatar_nom + (m1.avatar_age ? " · " + m1.avatar_age : "") });
  if (m5.ht_point_b) cards.push({ label: "Point B (HT)", value: m5.ht_point_b });
  if (m12.programme_nom) cards.push({ label: "Programme HT", value: m12.programme_nom });
  else if (m6.or && m6.or.nom) cards.push({ label: "Offre Or (HT)", value: m6.or.nom });
  if (m6.prix_ht) cards.push({ label: "Prix HT", value: Number(m6.prix_ht).toLocaleString("fr-FR") + " €" });
  if (m11.nb_modules) cards.push({ label: "Modules HT", value: m11.nb_modules + (m11.duree_programme_mois ? " modules · " + m11.duree_programme_mois + " mois" : "") });

  if (cards.length === 0) {
    return (
      <div className="mb-5 rounded-xl px-4 py-3 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)", color: "#e8c9a0" }}>
        Aucun contexte amont détecté. Tu peux quand même utiliser le module — mais tu vas avoir plus de mal à construire un MT cohérent si tu n'as pas posé ton HT en amont (M5, M6, M11).
      </div>
    );
  }
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cards.map((c, i) => <Card key={i} label={c.label} value={c.value} />)}
    </div>
  );
}
