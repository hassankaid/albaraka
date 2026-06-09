import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, Btn, Actions } from "../../m1-niche/components/ui";
import { MIN_OBSTACLES, MAX_OBSTACLES, type M11State } from "../lib/types";
import { validateObstacle, canEnterOrdresStep, missingFieldsLabel } from "../lib/validations";

interface Props { state: M11State; setState: (n: (p: M11State) => M11State) => void; onBack: () => void; onNext: () => void; }

export function ObstaclesBrutScreen({ state, setState, onBack, onNext }: Props) {
  const obs = state.data.obstacles_brut || [];
  const ready = canEnterOrdresStep(state.data);

  const setObs = (next: string[]) => setState((prev) => ({ ...prev, data: { ...prev.data, obstacles_brut: next } }));
  const update = (i: number, v: string) => { const n = [...obs]; n[i] = v; setObs(n); };
  const addAfter = (i: number) => { const n = [...obs]; n.splice(i + 1, 0, ""); if (n.length > MAX_OBSTACLES) n.length = MAX_OBSTACLES; setObs(n); };
  const addEnd = () => { if (obs.length >= MAX_OBSTACLES) return; setObs([...obs, ""]); };
  const remove = (i: number) => { if (obs.length <= MIN_OBSTACLES) return; const n = [...obs]; n.splice(i, 1); setObs(n); };

  function next() {
    const nonVides = obs.filter((o) => (o || "").trim().length >= 5).map((o) => o.trim());
    setState((prev) => ({ ...prev, data: { ...prev.data, obstacles_ordonnes: nonVides } }));
    onNext();
  }

  return (
    <div>
      <StepEyebrow>Étape 3 / 6 · Obstacles</StepEyebrow>
      <StepTitle>Lister les obstacles entre A et B</StepTitle>
      <StepSub>
        Tu listes <strong className="text-white/80">tous</strong> les obstacles qui empêchent ton client de passer du Point A au
        Point B. Vise <code className="text-[#C9A84C]">{MIN_OBSTACLES}-{MAX_OBSTACLES}</code> obstacles. À cette étape, ne filtre pas, ne hiérarchise pas — sors tout ce qui te vient.
      </StepSub>

      <Card className="mb-5">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">La méthode : pense à tes 10 happy clients</div>
        <p className="mb-2 text-[13px] leading-[1.6] text-white/75">Ne pars pas de ton intuition. Repense aux 10 personnes accompagnées en humain : sur quoi as-tu dû passer du temps ? Quels patterns reviennent ? Ces patterns récurrents sont tes vrais obstacles.</p>
        <p className="text-[12.5px] leading-[1.55] text-white/55">Formulation utile : commence chaque obstacle par <em>« Ne sait pas… »</em>, <em>« Ne maîtrise pas… »</em>, <em>« Ne connaît pas… »</em> — ça force un déficit concret qui deviendra un module.</p>
      </Card>

      <div className="mb-4 space-y-2.5">
        {obs.map((o, i) => {
          const warn = (o || "").trim().length >= 5 ? validateObstacle(o) : null;
          return (
            <div key={i}>
              <div className="flex items-start gap-2">
                <div className="mt-2.5 w-6 shrink-0 text-center text-[13px] font-bold text-[#C9A84C]">{i + 1}</div>
                <input type="text" value={o} onChange={(e) => update(i, e.target.value)} placeholder="Ex. Ne sait pas..."
                  className="flex-1 rounded-[10px] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                  style={{ background: "#14130E", border: warn ? "1px solid rgba(232,180,80,0.5)" : "1px solid rgba(201,168,76,0.18)" }} />
                <button type="button" onClick={() => addAfter(i)} title="Ajouter après" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#C9A84C]" style={{ background: "rgba(201,168,76,0.08)", border: "0.5px solid rgba(201,168,76,0.3)" }}><Plus className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => remove(i)} disabled={obs.length <= MIN_OBSTACLES} title="Supprimer" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#E86B6B] disabled:opacity-30" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.3)" }}><X className="h-3.5 w-3.5" /></button>
              </div>
              {warn && <div className="ml-8 mt-1 text-[11px] leading-[1.45] text-amber-400/80">{warn.message}</div>}
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addEnd} disabled={obs.length >= MAX_OBSTACLES} className="mb-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold text-[#C9A84C] disabled:opacity-40" style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.4)" }}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un obstacle
      </button>

      {!ready && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>
          Pour passer au tri, il te manque <strong>{missingFieldsLabel("obstacles_brut", state.data)}</strong>.
        </div>
      )}

      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Point A et B</Btn>
        <Btn variant="cta" disabled={!ready} onClick={next}>Trier chronologiquement <ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
