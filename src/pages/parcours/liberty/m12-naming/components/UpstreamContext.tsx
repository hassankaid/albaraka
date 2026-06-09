import { type M12State } from "../lib/types";

export function UpstreamContext({ state }: { state: M12State }) {
  const m1 = state.m1_data, m3 = state.m3_data, m5 = state.m5_data, m6 = state.m6_data, m11 = state.m11_data;
  const cards: { label: string; value: string }[] = [];
  if (m1?.niche) cards.push({ label: "Niche", value: m1.niche });
  if (m1?.avatar_nom) cards.push({ label: "Avatar", value: m1.avatar_nom + (m1.avatar_age ? " · " + m1.avatar_age : "") });
  if (m3?.headline_promesse) cards.push({ label: "Promesse", value: m3.headline_promesse });
  if (m5?.ht_point_b) cards.push({ label: "Point B", value: m5.ht_point_b });
  if (m6?.or?.nom) cards.push({ label: "Offre Or", value: m6.or.nom });
  if (m6?.prix_ht) cards.push({ label: "Prix HT", value: m6.prix_ht + " €" });
  if (m11?.tier_bloom_target_label) cards.push({ label: "Tier programme", value: m11.tier_bloom_target_label });
  if (m11?.nb_modules) cards.push({ label: "Modules", value: m11.nb_modules + (m11.duree_programme_mois ? " modules · " + m11.duree_programme_mois + " mois" : "") });

  if (!cards.length) {
    return (
      <div className="mb-5 rounded-xl px-4 py-3 text-[13px] leading-[1.55] text-white/60" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
        Aucun contexte amont détecté. Tu peux quand même utiliser le module — mais tu vas avoir plus de mal à proposer un nom aligné si tu n'as pas posé ta niche et ta promesse en amont.
      </div>
    );
  }
  return (
    <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {cards.map((c, i) => (
        <div key={i} className="rounded-lg px-3 py-2" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">{c.label}</div>
          <div className="mt-0.5 text-[12.5px] leading-[1.4] text-white/75">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
