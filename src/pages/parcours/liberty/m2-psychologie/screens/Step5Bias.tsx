import { useState } from "react";
import { toast } from "sonner";
import { TextInput, TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStep } from "../lib/aiEvaluator";
import { pickAvatarName, type M2State } from "../lib/types";

interface Step5Props {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  onBack: () => void;
  onNext: () => void;
}

const BIAIS_HELPER =
  "aversion_perte · confirmation · ikea · autorité · preuve_sociale · urgence · ancrage · réciprocité · familiarité · cadrage · disponibilité · sunk_cost…";

export function Step5Bias({ state, setState, onBack, onNext }: Step5Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);
  const top3 = state.data.step5.top3;

  const set = (idx: number, key: "bias" | "why_dominant" | "how_activate", val: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as M2State;
      next.data.step5.top3[idx][key] = val;
      return next;
    });
  };

  const filled = top3.filter((b) => b.bias.trim().length > 0).length;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStep("step5", state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, step5: fb.score },
        attempts: { ...prev.attempts, step5: prev.attempts.step5 + 1 },
        lastFb: { ...prev.lastFb, step5: fb },
      }));
    } catch (e: any) {
      toast.error("Erreur d'évaluation : " + (e?.message || "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, step5: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={5}
        total={8}
        title="Top 3 biais cognitifs à activer"
        sub={`Tu ne peux pas activer 30 biais. Tu choisis 3 biais DOMINANTS chez ${avatar} et tu construis ta stratégie autour. Pour chacun : pourquoi il est dominant, et comment l'activer concrètement.`}
      />

      {top3.map((b, i) => (
        <Card key={i} className="mb-3">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold"
              style={{
                background: b.bias.trim() ? "#C9A84C" : "rgba(201,168,76,0.12)",
                color: b.bias.trim() ? "#080808" : "#C9A84C",
              }}
            >
              {i + 1}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
              Biais {i + 1}
            </span>
          </div>

          <InputBlock>
            <InputLabel>Nom du biais</InputLabel>
            <TextInput
              value={b.bias}
              onChange={(e) => set(i, "bias", e.target.value)}
              placeholder="aversion_perte / confirmation / ikea / autorité …"
            />
            <InputHelper>Suggestions : {BIAIS_HELPER}</InputHelper>
          </InputBlock>

          <InputBlock>
            <InputLabel>Pourquoi ce biais est dominant chez {avatar}</InputLabel>
            <TextArea
              rows={2}
              value={b.why_dominant}
              onChange={(e) => set(i, "why_dominant", e.target.value)}
              placeholder={`Ex : ${avatar} a peur de re-perdre — il a déjà perdu 800€ en 2 formations vides. Aversion à la perte = son blocage n°1.`}
            />
          </InputBlock>

          <InputBlock>
            <InputLabel>Comment l'activer concrètement dans le copy / les ads / la VSL</InputLabel>
            <TextArea
              rows={2}
              value={b.how_activate}
              onChange={(e) => set(i, "how_activate", e.target.value)}
              placeholder="Ex : Calculer le coût de l'inaction lors de l'audit : « 3 mois × 1500€ de manque à gagner = 4500€ perdus avant même de me payer ». Cadrer en perte, pas en gain."
            />
          </InputBlock>
        </Card>
      ))}

      <StepFooter
        feedback={state.lastFb.step5}
        attempts={state.attempts.step5}
        forced={state.forced.step5}
        evaluating={evaluating}
        canEvaluate={filled >= 2}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
