/** Bandeau de contexte amont M18 (Niche, Avatar, High-Ticket, Middle-Ticket, Low-Ticket). */
import { type M18State, fmtEur } from "../lib/types";

function Cardlet({ label, val }: { label: string; val: string }) {
  return (
    <div className="rounded-[10px] px-3 py-2.5" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a" }}>
      <div className="text-[10px] uppercase tracking-[0.08em] text-white/40">{label}</div>
      <div className="mt-0.5 text-[12px] leading-[1.35] text-white/85">{val}</div>
    </div>
  );
}

export function UpstreamContext({ state }: { state: M18State }) {
  const m1 = state.m1_data, m6 = state.m6_data, m12 = state.m12_data, m14 = state.m14_data, m16 = state.m16_data;
  const cards: { label: string; val: string }[] = [];
  if (m1 && m1.niche) cards.push({ label: "Niche", val: m1.niche });
  if (m1 && m1.avatar_nom) cards.push({ label: "Avatar", val: m1.avatar_nom + (m1.avatar_age ? " · " + m1.avatar_age : "") });
  const htNom = (m12 && m12.programme_nom) || (m6 && m6.or && m6.or.nom) || (m14 && m14.programme_ht_nom);
  if (htNom) cards.push({ label: "High-Ticket", val: htNom + (m6 && m6.prix_ht ? " · " + fmtEur(m6.prix_ht) : "") });
  if (m14 && m14.mt_prix) cards.push({ label: "Middle-Ticket", val: (m14.mt_format_label || "MT") + " · " + fmtEur(m14.mt_prix_annualise || m14.mt_prix) });
  if (m16 && m16.lt_prix) cards.push({ label: "Low-Ticket", val: (m16.lt_nom || "Tripwire") + " · " + fmtEur(m16.lt_prix) });

  if (!cards.length) {
    return (
      <div className="my-4 rounded-xl px-4 py-3 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)", color: "#e8c9a0" }}>
        Aucun contexte amont détecté. Tu peux quand même utiliser le module — mais tu construiras une échelle plus solide si ton High-Ticket (M5/M6) et ton Middle-Ticket (M14) sont déjà posés.
      </div>
    );
  }
  return (
    <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c, i) => <Cardlet key={i} label={c.label} val={c.val} />)}
    </div>
  );
}
