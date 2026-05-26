import { useState } from "react";
import { toast } from "sonner";
import { TextArea, InputBlock, InputLabel, InputHelper, Card, Option } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import { StepFooter } from "../components/StepFooter";
import { evaluateStep } from "../lib/aiEvaluator";
import { getHint } from "../lib/hints";
import { pickAvatarName, pickMarket, type M2State, type ParcoursPhase } from "../lib/types";

interface Step6Props {
  state: M2State;
  setState: (next: (prev: M2State) => M2State) => void;
  onBack: () => void;
  onNext: () => void;
}

const PHASES: Array<{ value: ParcoursPhase; label: string; desc: string }> = [
  {
    value: "inconscience",
    label: "1. Inconscience",
    desc: "L'avatar ne sait pas qu'il a un problème. Il vit avec sans le nommer. → Mission : l'éveiller.",
  },
  {
    value: "prise_de_conscience",
    label: "2. Prise de conscience",
    desc: "L'avatar identifie qu'il a un problème, mais cherche encore à le nommer. → Mission : nommer mieux que lui.",
  },
  {
    value: "consideration",
    label: "3. Considération",
    desc: "L'avatar sait ce qu'il veut. Il compare les solutions/méthodes. → Mission : se différencier.",
  },
  {
    value: "decision",
    label: "4. Décision",
    desc: "L'avatar a choisi sa direction. Il compare les offres. → Mission : faire pencher la balance.",
  },
];

export function Step6Phase({ state, setState, onBack, onNext }: Step6Props) {
  const [evaluating, setEvaluating] = useState(false);
  const avatar = pickAvatarName(state);
  const s6 = state.data.step6;

  const setPhase = (phase: ParcoursPhase) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, step6: { ...prev.data.step6, phase } },
    }));
  };
  const setField = (key: "justif" | "actions", val: string) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, step6: { ...prev.data.step6, [key]: val } },
    }));
  };

  const canEvaluate = !!s6.phase && s6.justif.length >= 30 && s6.actions.length >= 30;

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      const fb = await evaluateStep("step6", state);
      setState((prev) => ({
        ...prev,
        scores: { ...prev.scores, step6: fb.score },
        attempts: { ...prev.attempts, step6: prev.attempts.step6 + 1 },
        lastFb: { ...prev.lastFb, step6: fb },
      }));
    } catch (e: any) {
      toast.error("Erreur d'évaluation : " + (e?.message || "inconnue"));
    } finally {
      setEvaluating(false);
    }
  }
  function handleForce() {
    setState((prev) => ({ ...prev, forced: { ...prev.forced, step6: true } }));
    onNext();
  }

  return (
    <div>
      <StepHeader
        current={6}
        total={8}
        title="Phase du parcours d'achat"
        sub={`Tous les prospects ne se valent pas. Identifie où en est ${avatar} sur l'échelle de conscience — ça dicte ton angle de copy, ton lead magnet, ton funnel.`}
        hint={getHint("step6", pickMarket(state))}
      />

      <Card className="mb-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">
          Où en est {avatar} ?
        </div>
        <div className="flex flex-col gap-2">
          {PHASES.map((p) => (
            <Option key={p.value!} selected={s6.phase === p.value} onClick={() => setPhase(p.value)}>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">{p.label}</span>
                <span className="text-[11px] leading-snug text-white/50">{p.desc}</span>
              </div>
            </Option>
          ))}
        </div>
      </Card>

      <InputBlock>
        <InputLabel>Justification — pourquoi cette phase et pas une autre</InputLabel>
        <TextArea
          rows={3}
          value={s6.justif}
          onChange={(e) => setField("justif", e.target.value)}
          placeholder={`Ex : ${avatar} sait qu'il veut un revenu halal complémentaire (passé Inconscience et Prise de conscience). Il a regardé 5 chaînes YouTube. Il compare maintenant entre affiliation, e-com halal, content creation. → Phase Considération.`}
        />
        <InputHelper>Cite des comportements observables, pas des affirmations.</InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>Actions concrètes à mener pour cette phase</InputLabel>
        <TextArea
          rows={3}
          value={s6.actions}
          onChange={(e) => setField("actions", e.target.value)}
          placeholder="Ex : (1) 1 témoignage/sem d'un élève jumeau. (2) Lead magnet '5 erreurs en affiliation halal'. (3) Audit gratuit 30 min sans pitch."
        />
        <InputHelper>3 actions max. Concrètes. Tu pourrais les exécuter dès lundi.</InputHelper>
      </InputBlock>

      <StepFooter
        feedback={state.lastFb.step6}
        attempts={state.attempts.step6}
        forced={state.forced.step6}
        evaluating={evaluating}
        canEvaluate={canEvaluate}
        onEvaluate={handleEvaluate}
        onBack={onBack}
        onNext={onNext}
        onForce={handleForce}
      />
    </div>
  );
}
