import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  StepEyebrow, StepTitle, StepSub, InputBlock, InputLabel, InputHelper,
  TextInput, TextArea, Btn, Card, CardTitle, Actions,
} from "../components/ui";
import { HintBtn } from "../components/HintBtn";
import type { M1State } from "../lib/types";

interface BrainstormScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function BrainstormScreen({ state, setState, onBack, onNext }: BrainstormScreenProps) {
  const setNiche = (i: number, val: string) => {
    setState((prev) => {
      const niches = [...prev.brainstorm.niches];
      niches[i] = val;
      return { ...prev, brainstorm: { ...prev.brainstorm, niches } };
    });
  };
  const setCompetence = (i: number, val: string) => {
    setState((prev) => {
      const competences = [...prev.brainstorm.competences];
      competences[i] = val;
      return { ...prev, brainstorm: { ...prev.brainstorm, competences } };
    });
  };
  const setVecuLong = (val: string) => {
    setState((prev) => ({ ...prev, brainstorm: { ...prev.brainstorm, vecu_long: val } }));
  };

  const filledNiches = state.brainstorm.niches.filter((n) => n.length >= 2).length;
  const filledComps = state.brainstorm.competences.filter((c) => c.length >= 2).length;
  const vecuLen = state.brainstorm.vecu_long.length;
  const canNext = filledNiches >= 3 && filledComps >= 3 && vecuLen >= 50;

  return (
    <div>
      <StepEyebrow>Brainstorm matière première</StepEyebrow>
      <StepTitle>Sors la matière brute</StepTitle>
      <StepSub>
        5 niches qui te passionnent ou que tu connais. 5 compétences que tu maîtrises vraiment. Et
        le vécu qui les relie. <strong className="text-[#C9A84C]">L'IA ne fera rien tant que tu
        n'auras pas alimenté.</strong>
      </StepSub>

      <Card className="mb-4">
        <CardTitle>
          🎯 5 niches qui te passionnent ou que tu connais
          <HintBtn hintKey="brainstorm_niches" />
        </CardTitle>
        <div className="flex flex-col gap-2">
          {state.brainstorm.niches.map((n, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                style={{
                  background: n.length >= 2 ? "#C9A84C" : "rgba(201,168,76,0.12)",
                  color: n.length >= 2 ? "#080808" : "#C9A84C",
                }}
              >
                {n.length >= 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <TextInput
                value={n}
                onChange={(e) => setNiche(i, e.target.value)}
                placeholder="Ex : Pédagogie alternative, e-commerce, calligraphie…"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <CardTitle>
          💪 5 compétences que tu maîtrises vraiment
          <HintBtn hintKey="brainstorm_competences" />
        </CardTitle>
        <div className="flex flex-col gap-2">
          {state.brainstorm.competences.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                style={{
                  background: c.length >= 2 ? "#C9A84C" : "rgba(201,168,76,0.12)",
                  color: c.length >= 2 ? "#080808" : "#C9A84C",
                }}
              >
                {c.length >= 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <TextInput
                value={c}
                onChange={(e) => setCompetence(i, e.target.value)}
                placeholder="Ex : Méthode Montessori maison, négociation salariale…"
              />
            </div>
          ))}
        </div>
      </Card>

      <InputBlock>
        <InputLabel>
          📖 Vécu détaillé — la passerelle entre tes niches et tes compétences
          <HintBtn hintKey="brainstorm_vecu_long" />
        </InputLabel>
        <TextArea
          rows={5}
          value={state.brainstorm.vecu_long}
          onChange={(e) => setVecuLong(e.target.value)}
          placeholder="Raconte concrètement ce que tu as vécu et qui te qualifie sur ces niches. Pas une bio, un vécu : situations précises, déclics, transformations, failles surmontées."
        />
        <InputHelper>
          L'IA va croiser cette matière avec ton archétype et ton marché pour proposer 3 sous-niches
          2.0 candidates.
        </InputHelper>
      </InputBlock>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Retour Bilan
        </Btn>
        <Btn variant="primary" disabled={!canNext} onClick={onNext}>
          L'IA propose 3 sous-niches
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>

      <p className="mt-2 text-right text-[11px] text-white/40">
        {filledNiches < 3 && "Min. 3 niches · "}
        {filledComps < 3 && "Min. 3 compétences · "}
        {vecuLen < 50 && `Vécu min. 50 caractères (${vecuLen}/50)`}
        {canNext && "✓ Prêt"}
      </p>
    </div>
  );
}
