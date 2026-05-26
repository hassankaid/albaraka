import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStep } from "../lib/aiEvaluator";
import { getHint } from "../lib/hints";
import { pickAvatarName, pickMarket, type M2State } from "../lib/types";

interface Step1Props {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step1Pains({ state, setState, onBack, onNext }: Step1Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);
  const pains = state.data.step1.pains;

  const set = (idx: number, key: "text" | "scene", val: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as M2State;
      next.data.step1.pains[idx][key] = val;
      return next;
    });
  };

  const filledCount = pains.filter((p) => p.text.trim().length > 0).length;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStep("step1", state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, step1: fb.score },
        attempts: { ...prev.attempts, step1: prev.attempts.step1 + 1 },
        lastFb: { ...prev.lastFb, step1: fb },
      }));
    } catch (e: any) {
      toast.error("Erreur d'évaluation : " + (e?.message || "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }

  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, step1: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={1}
        total={8}
        title="Douleur présente — le moteur d'évitement"
        sub={`Tes prospects n'achètent pas une formation, ils achètent la fin d'une douleur. Si tu ne nommes pas cette douleur avec plus de précision qu'eux-mêmes, tu ne vendras rien. Liste 5 douleurs vécues par ${avatar}, chacune ancrée dans une scène concrète.`}
        hint={getHint("step1", pickMarket(state))}
      />

      <div
        className="mb-5 rounded-xl p-3.5 text-[12px] leading-[1.6]"
        style={{
          background: "rgba(255,180,80,0.06)",
          border: "0.5px solid rgba(255,180,80,0.3)",
          color: "#FFB450",
        }}
      >
        ⚠️ L'IA refuse les phrases molles type « il manque de clients » ou « elle veut plus de
        revenus ». Tu dois descendre dans le quotidien : un moment, un lieu, une sensation, une
        phrase dite ou pensée.
      </div>

      {pains.map((p, i) => (
        <Card key={i} className="mb-3">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold"
              style={{
                background: p.text.trim() ? "#C9A84C" : "rgba(201,168,76,0.12)",
                color: p.text.trim() ? "#080808" : "#C9A84C",
              }}
            >
              {i + 1}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
              Douleur {i + 1}
            </span>
          </div>

          <InputBlock>
            <InputLabel>La douleur, formulée comme {avatar} la formulerait</InputLabel>
            <TextArea
              rows={2}
              value={p.text}
              onChange={(e) => set(i, "text", e.target.value)}
              placeholder={`Ex : Le dimanche soir, ${avatar} regarde son compte en banque et se rend compte qu'il ne pourra pas payer la facture d'électricité ce mois-ci.`}
            />
          </InputBlock>

          <InputBlock>
            <InputLabel>La scène concrète : où, quand, dialogue intérieur</InputLabel>
            <TextArea
              rows={2}
              value={p.scene}
              onChange={(e) => set(i, "scene", e.target.value)}
              placeholder={`Lieu, moment précis, ce que ${avatar} se dit dans sa tête à ce moment.`}
            />
            <InputHelper>Sois précis : moment + lieu + dialogue intérieur + 1-2 chiffres.</InputHelper>
          </InputBlock>
        </Card>
      ))}

      <StepFooter
        feedback={state.lastFb.step1}
        attempts={state.attempts.step1}
        forced={state.forced.step1}
        evaluating={evaluating}
        canEvaluate={filledCount >= 3}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
