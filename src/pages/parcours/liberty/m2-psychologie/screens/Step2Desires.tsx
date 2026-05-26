import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStep } from "../lib/aiEvaluator";
import { getHint } from "../lib/hints";
import { pickAvatarName, pickMarket, type M2State } from "../lib/types";

interface Step2Props {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step2Desires({ state, setState, onBack, onNext }: Step2Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);
  const desires = state.data.step2.desires;

  const setDesire = (idx: number, key: "text" | "scene", val: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as M2State;
      next.data.step2.desires[idx][key] = val;
      return next;
    });
  };
  const setIdentity = (val: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as M2State;
      next.data.step2.identity = val;
      return next;
    });
  };

  const filledCount = desires.filter((d) => d.text.trim().length > 0).length;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStep("step2", state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, step2: fb.score },
        attempts: { ...prev.attempts, step2: prev.attempts.step2 + 1 },
        lastFb: { ...prev.lastFb, step2: fb },
      }));
    } catch (e: any) {
      toast.error("Erreur d'évaluation : " + (e?.message || "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, step2: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={2}
        total={8}
        title="Désir futur — l'identité aspirationnelle"
        sub={`L'inverse de la douleur. Mais pas un objectif chiffré (« plus de revenus ») — une scène que ${avatar} peut visualiser. Cinq désirs profonds, plus une formulation claire de l'identité aspirationnelle.`}
        hint={getHint("step2", pickMarket(state))}
      />

      {desires.map((d, i) => (
        <Card key={i} className="mb-3">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold"
              style={{
                background: d.text.trim() ? "#C9A84C" : "rgba(201,168,76,0.12)",
                color: d.text.trim() ? "#080808" : "#C9A84C",
              }}
            >
              {i + 1}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
              Désir {i + 1}
            </span>
          </div>

          <InputBlock>
            <InputLabel>Le désir, comme une scène vécue</InputLabel>
            <TextArea
              rows={2}
              value={d.text}
              onChange={(e) => setDesire(i, "text", e.target.value)}
              placeholder={`Ex : ${avatar} annonce à son conjoint, à table un samedi soir, qu'il vient de signer son 5e client à 1800€.`}
            />
          </InputBlock>

          <InputBlock>
            <InputLabel>Le détail sensoriel : ce qu'il/elle voit / sent / entend</InputLabel>
            <TextArea
              rows={2}
              value={d.scene}
              onChange={(e) => setDesire(i, "scene", e.target.value)}
              placeholder="Ce qui rend cette scène tangible : sons, expressions des autres, sensation physique."
            />
          </InputBlock>
        </Card>
      ))}

      <Card className="mb-3" accent="gold">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
          ★ Identité aspirationnelle
        </div>
        <InputLabel>{avatar} devient quelqu'un qui...</InputLabel>
        <TextArea
          rows={3}
          value={state.data.step2.identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder={`Ex : ${avatar} devient un entrepreneur reconnu dans sa communauté, qui anime une chaîne YouTube de 18K abonnés, qui transmet à ses enfants une autre vision du travail que celle du salariat subi.`}
        />
        <InputHelper>
          Pas un titre LinkedIn. Une transformation de statut social.
        </InputHelper>
      </Card>

      <StepFooter
        feedback={state.lastFb.step2}
        attempts={state.attempts.step2}
        forced={state.forced.step2}
        evaluating={evaluating}
        canEvaluate={filledCount >= 3 && state.data.step2.identity.length >= 20}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
