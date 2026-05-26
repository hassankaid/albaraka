import { useState, useMemo } from "react";
import { toast } from "sonner";
import { TextInput, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateMathGarantie } from "../lib/aiEvaluator";
import { type M7State, validationThreshold, computeNetPositif } from "../lib/types";

interface Props {
  state: M7State;
  setState: (n: (p: M7State) => M7State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function MathGarantieScreen({ state, setState, onBack, onNext }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const d = state.data.math_garantie;
  const threshold = validationThreshold(state);

  const set = (patch: Partial<typeof d>) =>
    setState((prev) => ({ ...prev, data: { ...prev.data, math_garantie: { ...prev.data.math_garantie, ...patch } } }));

  const net = useMemo(() => computeNetPositif(d.clients_initiaux, d.delta_estime, d.taux_refund_pct), [d]);
  const netColor = net > 0 ? "#7FB069" : net === 0 ? "#FFB450" : "#E86B6B";
  const netLabel = net > 1 ? `Net positif : +${net} clients` : net === 1 ? "Net juste : +1 client" : net === 0 ? "Net neutre — garantie inutile" : `Net négatif : ${net} (perte)`;

  const canEvaluate = d.clients_initiaux > 0 && d.delta_estime >= 1 && d.taux_refund_pct >= 0 && d.taux_refund_pct <= 100;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateMathGarantie(state);
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, math_garantie: { ...prev.data.math_garantie, net_positif: net } },
        scores: { ...prev.scores, math_garantie: fb.score },
        attempts: { ...prev.attempts, math_garantie: prev.attempts.math_garantie + 1 },
        lastFb: { ...prev.lastFb, math_garantie: fb },
        highest: fb.score >= validationThreshold(prev) && prev.highest === "math_garantie" ? "expose_garantie" : prev.highest,
      }));
    } catch (e: any) { toast.error("Erreur évaluation : " + (e?.message ?? "inconnue")); }
    finally { setEvaluating(false); }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, math_garantie: true }, highest: prev.highest === "math_garantie" ? "expose_garantie" : prev.highest }));
  }

  const score = state.scores.math_garantie;
  const fb = state.lastFb.math_garantie;
  const validated = (score !== null && score >= threshold) || state.forced.math_garantie;

  return (
    <div>
      <StepHeader
        current={4}
        total={6}
        title="Math rentabilité · net positif obligatoire"
        sub="Une garantie n'est rentable que si elle te fait gagner plus de clients qu'elle ne t'en fait perdre. On calcule."
        hint="⚠ Anti-cheats F (delta négatif impossible) + G (taux refund < 3% optimiste ou > 50% alarmant)."
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InputBlock>
            <InputLabel>Clients initiaux (référence) *</InputLabel>
            <TextInput
              type="number"
              value={String(d.clients_initiaux || "")}
              onChange={(e) => set({ clients_initiaux: parseInt(e.target.value, 10) || 0 })}
              placeholder="10"
            />
            <InputHelper>Combien signes-tu actuellement sur 30 appels sans garantie ?</InputHelper>
          </InputBlock>
          <InputBlock>
            <InputLabel>Delta estimé (gagnés grâce à garantie) *</InputLabel>
            <TextInput
              type="number"
              value={String(d.delta_estime || "")}
              onChange={(e) => set({ delta_estime: parseInt(e.target.value, 10) || 0 })}
              placeholder="2"
            />
            <InputHelper>+2 minimum (prudent) · +5 à +15 réaliste.</InputHelper>
          </InputBlock>
          <InputBlock>
            <InputLabel>Taux refund estimé (%) *</InputLabel>
            <TextInput
              type="number"
              value={String(d.taux_refund_pct || "")}
              onChange={(e) => set({ taux_refund_pct: parseFloat(e.target.value) || 0 })}
              placeholder="10"
            />
            <InputHelper>Entre 5 et 15% raisonnable.</InputHelper>
          </InputBlock>
        </div>
      </Card>

      {/* Net positif live */}
      <div
        className="mb-5 rounded-xl p-4 text-center"
        style={{ background: "#0B0A07", border: `1px solid ${netColor}` }}
      >
        <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Net calculé</div>
        <div className="text-[32px] font-bold leading-tight" style={{ color: netColor }}>
          {net > 0 ? "+" : ""}{net}
        </div>
        <div className="text-[12px] font-semibold" style={{ color: netColor }}>{netLabel}</div>
        <div className="mt-2 text-[11px] text-white/40">
          Formule : ({d.clients_initiaux} + {d.delta_estime}) × (1 − {d.taux_refund_pct}%) − {d.clients_initiaux}
        </div>
      </div>

      <StepFooter
        feedback={fb}
        score={score}
        attempts={state.attempts.math_garantie}
        forced={state.forced.math_garantie}
        validated={validated}
        evaluating={evaluating}
        canEvaluate={canEvaluate}
        threshold={threshold}
        aiMode={fb?.ai_mode as "cloud" | "local" | null | undefined}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
