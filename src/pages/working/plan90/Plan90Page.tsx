import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { C, PHASES, TARGETS } from "./lib/config";
import { wStats } from "./lib/stats";
import { usePlan90 } from "./lib/usePlan90";
import { MiniChart, WeekCard } from "./components/Plan90Parts";

export default function Plan90Page() {
  const { user } = useAuth();
  const { data, setData, isLoading, reset } = usePlan90(user?.id);
  const [ow, setOw] = useState<number | null>(1);

  const allSt = Object.values(data).map((w) => wStats(w));
  const tRPD = allSt.reduce((s, st) => s + st.rpD, 0);
  const tRPC = allSt.reduce((s, st) => s + st.rpC, 0);
  const tV = allSt.reduce((s, st) => s + st.vt, 0);
  const actW = allSt.filter((st) => st.act > 0).length;
  const hitW = allSt.filter((st) => st.hitB).length;
  const tDays = allSt.reduce((s, st) => s + st.act, 0);
  const cP = actW <= 4 ? 0 : actW <= 8 ? 1 : 2;
  const rpH = allSt.filter((st) => st.act > 0).map((st) => st.rpD + st.rpC);
  const energyH = allSt.filter((st) => st.avgEnergy).map((st) => st.avgEnergy as number);

  return (
    <div className="-mx-4 -my-4 md:-mx-6 md:-my-6" style={{ minHeight: "calc(100vh - 4rem)", background: C.bg, color: C.light, fontFamily: "Calibri, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid " + C.goldD, padding: "14px 0", textAlign: "center" }}>
        <div style={{ fontSize: "10px", color: C.goldD, letterSpacing: "5px" }}>AL BARAKA</div>
        <h1 style={{ fontSize: "22px", color: C.gold, fontWeight: "bold", margin: "4px 0 0", fontFamily: "Georgia, serif", letterSpacing: "2px" }}>MON PLAN 90 JOURS</h1>
        <p style={{ color: C.gray, fontSize: "11px", margin: "4px 0 0", fontStyle: "italic" }}>
          Suivi quotidien · {TARGETS.rpDecouverte} RP découverte + {TARGETS.rpClosing} RP closing / semaine
        </p>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px" }}>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" style={{ background: C.card }} />
            <Skeleton className="h-16 w-full" style={{ background: C.card }} />
            <Skeleton className="h-64 w-full" style={{ background: C.card }} />
          </div>
        ) : (
          <>
            {/* Progress */}
            <div style={{ background: C.card, borderRadius: "12px", padding: "16px", border: "1px solid " + C.border, marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: C.gold, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Progression</span>
                <span style={{ fontSize: "12px", color: C.gold, fontWeight: "bold" }}>Semaine {actW}/12 · {tDays} jours actifs</span>
              </div>
              <div style={{ height: "8px", background: C.border, borderRadius: "4px", overflow: "hidden", marginBottom: "8px" }}>
                <div style={{ height: "100%", width: (actW / 12 * 100) + "%", background: "linear-gradient(90deg," + C.goldD + "," + C.gold + ")", borderRadius: "4px", transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {PHASES.map((p, i) => (
                  <span key={p.id} style={{ fontSize: "10px", color: i === cP ? C.gold : C.dGray, fontWeight: i === cP ? "bold" : "normal" }}>
                    {i === cP ? "▸ " : ""}{p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "14px" }}>
              {[
                { l: "RP Total", v: tRPD + tRPC, c: C.gold },
                { l: "Ventes", v: tV, c: tV > 0 ? C.green : C.gray },
                { l: "Obj. atteints", v: hitW + "/12", c: hitW > 0 ? C.green : C.gray },
                { l: "Jours actifs", v: tDays, c: C.gold },
              ].map((s) => (
                <div key={s.l} style={{ background: C.card, borderRadius: "10px", padding: "12px", border: "1px solid " + C.border, textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: "bold", color: s.c, fontFamily: "Georgia, serif" }}>{s.v}</div>
                  <div style={{ fontSize: "10px", color: C.gray, marginTop: "2px" }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            {rpH.length >= 2 && (
              <div style={{ display: "grid", gridTemplateColumns: energyH.length >= 2 ? "1fr 1fr" : "1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{ background: C.card, borderRadius: "10px", padding: "12px", border: "1px solid " + C.border }}>
                  <div style={{ fontSize: "10px", color: C.gray, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>RP / semaine</div>
                  <MiniChart data={rpH} color={C.gold} />
                </div>
                {energyH.length >= 2 && (
                  <div style={{ background: C.card, borderRadius: "10px", padding: "12px", border: "1px solid " + C.border }}>
                    <div style={{ fontSize: "10px", color: C.gray, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Énergie émotionnelle</div>
                    <MiniChart data={energyH} color="#D4B966" />
                  </div>
                )}
              </div>
            )}

            {/* Phases */}
            {PHASES.map((phase) => (
              <div key={phase.id} style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "22px", fontFamily: "Georgia, serif", color: C.gold, fontWeight: "bold" }}>{String(phase.id).padStart(2, "0")}</div>
                  <div>
                    <div style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: C.white, fontWeight: "bold" }}>{phase.name}</div>
                    <div style={{ fontSize: "10px", color: C.gray }}>{phase.range} · {phase.target}</div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {phase.goals.map((g, i) => (
                      <span key={i} style={{ background: C.card2, border: "1px solid " + C.border, borderRadius: "12px", padding: "2px 8px", fontSize: "9px", color: C.light }}>{g}</span>
                    ))}
                  </div>
                </div>
                {phase.weeks.map((wn) => (
                  <WeekCard key={wn} wd={data[wn]} wn={wn} all={data}
                    onChange={(u) => setData((p) => ({ ...p, [wn]: u }))}
                    isOpen={ow === wn} onToggle={() => setOw(ow === wn ? null : wn)} />
                ))}
              </div>
            ))}

            {/* Reset */}
            <div style={{ textAlign: "center", padding: "20px 0 40px" }}>
              <button onClick={() => { if (window.confirm("Réinitialiser toutes les données ?")) reset(); }}
                style={{ background: "transparent", border: "1px solid " + C.border, color: C.gray, padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>
                Réinitialiser
              </button>
              <div style={{ marginTop: "10px", fontSize: "10px", color: C.dGray }}>Sauvegarde automatique dans le cloud</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
