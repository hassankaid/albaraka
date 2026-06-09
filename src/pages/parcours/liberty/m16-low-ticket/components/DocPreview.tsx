import { type ReactNode } from "react";
import { type M16State } from "../lib/types";

/** Transforme « … » → surligné (à personnaliser) et ‹ … › → gris (exemple). */
function markup(text: string): ReactNode[] {
  const parts = String(text || "").split(/(«[^»]*»|‹[^›]*›)/g);
  return parts.map((p, i) => {
    if (/^«[^»]*»$/.test(p)) return <span key={i} style={{ background: "#FBE9A6", color: "#6b531a", borderRadius: 3, padding: "0 2px" }}>{p}</span>;
    if (/^‹[^›]*›$/.test(p)) return <span key={i} style={{ color: "#999999", fontStyle: "italic" }}>{p}</span>;
    return <span key={i}>{p}</span>;
  });
}

export function DocPreview({ state }: { state: M16State }) {
  const a = state.data.appearance;
  const albaraka = a.mode === "albaraka";
  const accent = albaraka ? "#A8842D" : a.primary || "#A8842D";
  const headFont = (albaraka ? "Crimson Pro" : a.headFont || "Inter") + ", serif";
  const bodyFont = (albaraka ? "Inter" : a.bodyFont || "Inter") + ", sans-serif";
  const d = state.data;

  return (
    <div className="rounded-lg p-6 shadow-inner" style={{ background: "#FFFFFF", color: "#1A1A1A", fontFamily: bodyFont, maxHeight: 560, overflowY: "auto" }}>
      {a.logo ? <img src={a.logo} alt="logo" style={{ maxHeight: 56, marginBottom: 12 }} /> : null}
      <h2 style={{ fontFamily: headFont, color: accent, fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>{markup(d.titre || "Mon produit")}</h2>
      {d.promesse_lt ? <div style={{ fontStyle: "italic", color: "#555", fontSize: 14, marginBottom: 16 }}>{markup(d.promesse_lt)}</div> : null}
      {(d.sections || []).map((s, i) => (
        <div key={i}>
          <h3 style={{ fontFamily: headFont, color: accent, fontSize: 16, fontWeight: 700, margin: "16px 0 6px" }}>{markup(s.heading)}</h3>
          {String(s.body || "").split("\n\n").map((p, j) => (
            <p key={j} style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 8px", whiteSpace: "pre-line" }}>{markup(p)}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
