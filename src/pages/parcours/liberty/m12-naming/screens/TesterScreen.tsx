import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { StepEyebrow, StepTitle, StepSub, Card, CardTitle, Btn, Actions } from "../../m1-niche/components/ui";
import { TECHNIQUES, type M12State, type TechKey } from "../lib/types";
import { evaluateName, autoScoreLevel, canEnterValider } from "../lib/validations";

interface Props { state: M12State; setState: (n: (p: M12State) => M12State) => void; onBack: () => void; onNext: () => void; }

export function TesterScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const candidats = d.candidats || [];
  const valid = candidats.map((c, i) => ({ c, i })).filter((x) => x.c && x.c.nom && x.c.nom.trim().length >= 2);
  const top3 = d.top3_indices || [];
  const top3Count = top3.length;

  function toggleTop3(idx: number) {
    setState((prev) => {
      const arr = [...(prev.data.top3_indices || [])];
      const pos = arr.indexOf(idx);
      if (pos >= 0) { arr.splice(pos, 1); }
      else { if (arr.length >= 3) { toast.error("Maximum 3 candidats dans le top — décoche-en un pour en ajouter un autre."); return prev; } arr.push(idx); }
      return { ...prev, data: { ...prev.data, top3_indices: arr } };
    });
  }
  function setNotes(idx: number, v: string) {
    setState((prev) => ({ ...prev, data: { ...prev.data, candidats: prev.data.candidats.map((c, k) => (k === idx ? { ...c, notes: v } : c)) } }));
  }

  const levelColor = (lvl: string) => (lvl === "good" ? "#4cc987" : lvl === "warn" ? "#c98a4c" : "#c94c4c");
  const flagIcon = (kind: string) => (kind === "ok" ? "✓" : kind === "ko" ? "✗" : "!");
  const flagColor = (kind: string) => (kind === "ok" ? "#4cc987" : kind === "ko" ? "#c94c4c" : "#c98a4c");

  return (
    <div>
      <StepEyebrow>Étape 3 / 5 · Tests auto</StepEyebrow>
      <StepTitle>Tester ton top 3 — auto-checks et sélection</StepTitle>
      <StepSub>D'abord les machines : un score automatique (longueur, syllabes, mots faibles…). Coche les 3 que tu veux pousser, et justifie en une phrase. <em>Les tests humains IRL viennent à l'étape suivante, une fois ton nom final choisi.</em></StepSub>

      <Card className="mb-5">
        <CardTitle>Ce que l'auto-check fait et ne fait pas</CardTitle>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">L'auto-check t'évite les erreurs grossières : trop court, imprononçable, « formation » dedans, une année qui périme ton nom. Mais il ne sait pas si ton nom <strong className="text-white">résonne</strong> — pour ça, il faut des humains, après avoir choisi ton nom final.</p>
        <p className="text-[13px] leading-[1.6] text-[#C9A84C] italic">Un nom qui passe l'auto-check 7/7 mais qui fait rire ta mère est un mauvais nom. Mais d'abord, passe l'auto-check.</p>
      </Card>

      {valid.length === 0 ? (
        <div className="mb-4 rounded-xl px-4 py-3 text-[13px] text-white/60" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>Tu n'as pas encore de candidat saisi. Reviens à l'étape précédente pour brainstormer.</div>
      ) : (
        <div className="mb-4 space-y-2.5">
          {valid.map(({ c, i }) => {
            const ev = evaluateName(c.nom);
            const level = autoScoreLevel(ev.score, ev.max);
            const techLabel = c.technique ? TECHNIQUES[c.technique as TechKey]?.label || "—" : "—";
            const inTop3 = top3.indexOf(i) >= 0;
            return (
              <div key={i} className="rounded-xl p-3.5" style={{ background: "#14130E", border: "0.5px solid " + (inTop3 ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.14)") }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-[15px] font-semibold text-white">{c.nom}</span>
                    <span className="text-[11px] text-white/45">{techLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: "rgba(0,0,0,0.3)", color: levelColor(level) }}>{ev.score}/{ev.max}</span>
                    <span className="text-[11px] text-white/40">{ev.length} car · {ev.syllables} syll</span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold" style={{ color: inTop3 ? "#C9A84C" : "rgba(255,255,255,0.5)" }}>
                      <input type="checkbox" checked={inTop3} onChange={() => toggleTop3(i)} className="h-4 w-4" style={{ accentColor: "#C9A84C" }} /> Top 3
                    </label>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5">
                  {ev.flags.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-1.5 text-[11.5px] leading-[1.4] text-white/60">
                      <span className="shrink-0 font-bold" style={{ color: flagColor(f.kind) }}>{flagIcon(f.kind)}</span><span>{f.txt}</span>
                    </div>
                  ))}
                </div>
                {inTop3 && (
                  <div className="mt-2.5 rounded-lg p-2.5" style={{ background: "rgba(201,168,76,0.06)", borderLeft: "2px solid #C9A84C" }}>
                    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">Pourquoi ce candidat dans ton top 3 ?</div>
                    <input type="text" value={c.notes || ""} onChange={(e) => setNotes(i, e.target.value)} placeholder="Ex. il sonne maison/famille immédiatement, ma sœur a réagi tout de suite" className="w-full rounded-[8px] px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/30" style={{ background: "#0C0B08", border: "1px solid rgba(201,168,76,0.18)" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {top3Count < 1 && <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>Coche au moins 1 candidat dans ton top 3 avant de passer à l'étape suivante.</div>}
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Brainstorm</Btn>
        <Btn variant="cta" disabled={!canEnterValider(d)} onClick={onNext}>Choisir mon nom final <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
