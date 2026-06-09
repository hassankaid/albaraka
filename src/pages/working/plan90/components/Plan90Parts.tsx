import { useState } from "react";
import { C, DAYS_SHORT, EMOTIONS, TARGETS, inp, type DayData, type WeekData, type Plan90Data } from "../lib/config";
import { wStats, getRecap } from "../lib/stats";

export function MiniChart({ data, color = C.gold, height = 50 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return null;
  const mx = Math.max(...data, 1), mn = Math.min(...data, 0), r = mx - mn || 1, w = 100 / (data.length - 1);
  const pts = data.map((v, i) => (i * w) + "," + (100 - ((v - mn) / r) * 75 - 12)).join(" ");
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
      <defs><linearGradient id={"g" + color.slice(1)} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0.02" />
      </linearGradient></defs>
      <polygon points={pts + " " + (data.length - 1) * w + ",100 0,100"} fill={"url(#g" + color.slice(1) + ")"} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {data.map((v, i) => (
        <circle key={i} cx={i * w} cy={100 - ((v - mn) / r) * 75 - 12} r="3" fill={color} stroke={C.card} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function Ring({ cur, tgt, label, sz = 64 }: { cur: number; tgt: number; label: string; sz?: number }) {
  const pct = Math.min(cur / tgt * 100, 100), hit = cur >= tgt;
  const co = hit ? C.green : pct >= 50 ? C.gold : C.gray;
  const r = 24, ci = 2 * Math.PI * r;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={sz} height={sz} viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke={C.border} strokeWidth="4" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={co} strokeWidth="4" strokeDasharray={ci} strokeDashoffset={ci - pct / 100 * ci} strokeLinecap="round" transform="rotate(-90 30 30)" style={{ transition: "stroke-dashoffset 0.4s" }} />
        <text x="30" y="28" textAnchor="middle" fill={co} fontSize="14" fontWeight="bold" fontFamily="Georgia">{cur}</text>
        <text x="30" y="40" textAnchor="middle" fill={C.gray} fontSize="8" fontFamily="Calibri">/{tgt}</text>
      </svg>
      <div style={{ fontSize: "9px", color: hit ? C.green : C.gray, marginTop: "2px", fontFamily: "Calibri, sans-serif" }}>{label}</div>
    </div>
  );
}

function EmotionSelector({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((e) => e !== id));
    else onChange([...selected, id]);
  };
  const groups = [
    { label: "Énergie positive", ids: ["enthousiaste", "determine", "motive", "confiant"] },
    { label: "Calme / Focus", ids: ["serein", "concentre", "curieux", "neutre"] },
    { label: "Tension / Blocage", ids: ["impatient", "stresse", "anxieux", "peur", "frustre"] },
    { label: "Basse énergie", ids: ["fatigue", "indifferent", "decourage", "demotive"] },
  ];
  return (
    <div>
      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "9px", color: C.gray, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{g.label}</div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {g.ids.map((id) => {
              const em = EMOTIONS.find((e) => e.id === id);
              if (!em) return null;
              const active = selected.includes(id);
              return (
                <button key={id} onClick={() => toggle(id)} style={{
                  padding: "4px 10px", borderRadius: "14px", fontSize: "11px",
                  fontFamily: "Calibri, sans-serif", cursor: "pointer", transition: "all 0.15s",
                  background: active ? em.color + "22" : "transparent",
                  border: "1px solid " + (active ? em.color : C.border),
                  color: active ? em.color : C.dGray,
                }}>
                  {em.emoji} {em.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmotionBadges({ ids }: { ids: string[] }) {
  if (!ids || ids.length === 0) return null;
  return (
    <span style={{ display: "inline-flex", gap: "2px" }}>
      {ids.slice(0, 3).map((id) => {
        const em = EMOTIONS.find((e) => e.id === id);
        return em ? <span key={id} title={em.label} style={{ fontSize: "12px" }}>{em.emoji}</span> : null;
      })}
      {ids.length > 3 && <span style={{ fontSize: "10px", color: C.gray }}>+{ids.length - 3}</span>}
    </span>
  );
}

function DayCard({ dayIndex, data, onChange }: { dayIndex: number; data: DayData; onChange: (u: DayData) => void }) {
  const [expanded, setExpanded] = useState(false);
  const filled = data.rpD || data.rpC || data.ventes || (data.emotions && data.emotions.length > 0);
  const set = (f: keyof DayData, val: string) => {
    const num = ["rpD", "rpC", "ventes"];
    onChange({ ...data, [f]: num.includes(f) ? val.replace(/[^0-9]/g, "") : val });
  };
  return (
    <div style={{
      background: filled ? C.card2 : C.card, borderRadius: "10px",
      border: "1px solid " + (filled ? C.border : "transparent"),
      marginBottom: "6px", overflow: "hidden", transition: "all 0.2s",
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: filled ? C.gold + "15" : "transparent",
          border: "1px solid " + (filled ? C.gold + "40" : C.border),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "11px", fontWeight: "bold", color: filled ? C.gold : C.dGray,
          fontFamily: "Calibri, sans-serif", flexShrink: 0,
        }}>
          {DAYS_SHORT[dayIndex]}
        </div>
        <EmotionBadges ids={data.emotions} />
        <div style={{ display: "flex", gap: "8px", fontSize: "11px", fontFamily: "Calibri, sans-serif", flex: 1 }}>
          {data.rpD && <span style={{ color: C.gold }}>D:{data.rpD}</span>}
          {data.rpC && <span style={{ color: C.gold }}>C:{data.rpC}</span>}
          {data.ventes && parseInt(data.ventes) > 0 && <span style={{ color: C.green }}>🎉{data.ventes}</span>}
        </div>
        {data.learning && <span style={{ fontSize: "10px", color: C.goldD }}>💡</span>}
        <span style={{ fontSize: "12px", color: C.gray, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid " + C.border }}>
          <div style={{ padding: "12px 0" }}>
            <label style={{ fontSize: "11px", color: C.gold, fontWeight: "bold", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              État émotionnel avant l'appel
            </label>
            <EmotionSelector selected={data.emotions || []} onChange={(emotions) => onChange({ ...data, emotions })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <div>
              <label style={{ fontSize: "10px", color: C.gold, display: "block", marginBottom: "3px" }}>RP Découverte</label>
              <input type="text" value={data.rpD} onChange={(e) => set("rpD", e.target.value)} placeholder={"Obj: " + TARGETS.rpDecouverte + "/sem"} style={{ ...inp, textAlign: "center" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", color: C.gold, display: "block", marginBottom: "3px" }}>RP Closing</label>
              <input type="text" value={data.rpC} onChange={(e) => set("rpC", e.target.value)} placeholder={"Obj: " + TARGETS.rpClosing + "/sem"} style={{ ...inp, textAlign: "center" }} />
            </div>
            <div>
              <label style={{ fontSize: "10px", color: C.gold, display: "block", marginBottom: "3px" }}>Ventes</label>
              <input type="text" value={data.ventes} onChange={(e) => set("ventes", e.target.value)} placeholder="0" style={{ ...inp, textAlign: "center" }} />
            </div>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "10px", color: C.gold, display: "block", marginBottom: "3px" }}>Comment tu te sentais avant de décrocher ?</label>
            <textarea value={data.feeling} onChange={(e) => set("feeling", e.target.value)}
              placeholder="Décris ton état : confiance, appréhension, énergie..." rows={2}
              style={{ ...inp, resize: "vertical", lineHeight: "1.5" }} />
          </div>
          <div>
            <label style={{ fontSize: "10px", color: C.gold, display: "block", marginBottom: "3px" }}>💡 Ce que tu as appris aujourd'hui</label>
            <textarea value={data.learning} onChange={(e) => set("learning", e.target.value)}
              placeholder="Quelle leçon retiens-tu ? Qu'est-ce que tu feras différemment ?" rows={2}
              style={{ ...inp, resize: "vertical", lineHeight: "1.5" }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function WeekCard({ wd, wn, all, onChange, isOpen, onToggle }: {
  wd: WeekData; wn: number; all: Plan90Data; onChange: (u: WeekData) => void; isOpen: boolean; onToggle: () => void;
}) {
  const st = wStats(wd);
  const recap = getRecap(wd, wn, all);
  const upDay = (di: number, u: DayData) => { onChange({ ...wd, days: { ...wd.days, [di]: u } }); };
  return (
    <div style={{ background: C.card, borderRadius: "12px", border: "1px solid " + C.border, marginBottom: "10px", overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: st.act > 0 ? C.gold : C.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "13px", fontFamily: "Georgia, serif", fontWeight: "bold", color: st.act > 0 ? C.card : C.gray }}>{wn}</span>
          </div>
          <div>
            <span style={{ fontSize: "14px", color: C.white, fontFamily: "Georgia, serif", fontWeight: "bold" }}>Semaine {wn}</span>
            {st.topEmotions.length > 0 && (
              <span style={{ marginLeft: "8px" }}>
                {st.topEmotions.slice(0, 2).map(([id]) => EMOTIONS.find((e) => e.id === id)?.emoji).join("")}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {st.act > 0 && (
            <div style={{ display: "flex", gap: "10px", fontSize: "11px", fontFamily: "Calibri, sans-serif" }}>
              <span style={{ color: st.hitD ? C.green : C.gray }}>D {st.rpD}/{TARGETS.rpDecouverte}</span>
              <span style={{ color: st.hitC ? C.green : C.gray }}>C {st.rpC}/{TARGETS.rpClosing}</span>
              {st.vt > 0 && <span style={{ color: C.gold }}>🎉{st.vt}</span>}
              <span style={{ color: C.dGray }}>{st.act}j</span>
            </div>
          )}
          <span style={{ color: C.gray, fontSize: "14px", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        </div>
      </div>
      {isOpen && (
        <div style={{ borderTop: "2px solid " + C.gold }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", padding: "16px 0", borderBottom: "1px solid " + C.border }}>
            <Ring cur={st.rpD} tgt={TARGETS.rpDecouverte} label="RP Découverte" />
            <Ring cur={st.rpC} tgt={TARGETS.rpClosing} label="RP Closing" />
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: st.vt > 0 ? C.gold : C.card2, border: "3px solid " + (st.vt > 0 ? C.gold : C.border), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "20px", fontFamily: "Georgia, serif", fontWeight: "bold", color: st.vt > 0 ? C.card : C.gray }}>{st.vt || "—"}</span>
              </div>
              <div style={{ fontSize: "9px", color: st.vt > 0 ? C.gold : C.gray, marginTop: "2px" }}>Ventes</div>
            </div>
          </div>
          <div style={{ padding: "12px" }}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <DayCard key={d} dayIndex={d} data={wd.days[d]} onChange={(u) => upDay(d, u)} />
            ))}
          </div>
          {recap && (
            <div style={{ margin: "0 12px 16px", background: C.card2, borderRadius: "10px", padding: "16px", borderLeft: "4px solid " + C.gold }}>
              <div style={{ fontSize: "10px", color: C.gold, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
                Récap Semaine {wn}
              </div>
              <div style={{ fontSize: "17px", fontFamily: "Georgia, serif", color: C.white, marginBottom: "10px" }}>{recap.h}</div>
              <div style={{ fontSize: "12px", color: C.light, marginBottom: "10px", lineHeight: "1.6" }}>{recap.det}</div>
              {recap.emotionInsight && (
                <div style={{ background: C.card, borderRadius: "8px", padding: "12px", marginBottom: "10px", border: "1px solid " + C.border }}>
                  <div style={{ fontSize: "10px", color: C.gold, fontWeight: "bold", marginBottom: "6px" }}>ANALYSE ÉMOTIONNELLE</div>
                  {recap.emotionInsight.split("\n").map((line, i) => (
                    <div key={i} style={{ fontSize: "12px", lineHeight: "1.5", color: line.startsWith("→") ? C.gold : C.light, fontStyle: line.startsWith("→") ? "italic" : "normal" }}>{line}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: "12px", color: C.gold, fontStyle: "italic", lineHeight: "1.4", marginBottom: recap.learnings.length > 0 ? "12px" : 0 }}>
                💡 {recap.tip}
              </div>
              {recap.learnings.length > 0 && (
                <div style={{ borderTop: "1px solid " + C.border, paddingTop: "10px" }}>
                  <div style={{ fontSize: "10px", color: C.gold, fontWeight: "bold", marginBottom: "6px" }}>TES APPRENTISSAGES DE LA SEMAINE</div>
                  {recap.learnings.map((l, i) => (
                    <div key={i} style={{ fontSize: "11px", color: C.light, lineHeight: "1.4", marginBottom: "4px", paddingLeft: "10px", borderLeft: "2px solid " + C.border }}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
