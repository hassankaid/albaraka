import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import {
  StepEyebrow, StepTitle, StepSub, InputBlock, InputLabel, InputHelper,
  TextInput, TextArea, Btn, Actions,
} from "../components/ui";
import type { M1State } from "../lib/types";

interface CaptureScreenProps {
  state: M1State;
  setState: (next: (prev: M1State) => M1State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CaptureScreen({ state, setState, onBack, onNext }: CaptureScreenProps) {
  const set = (key: "idee" | "vecu" | "pourquoi") => (val: string) =>
    setState((prev) => ({ ...prev, capture: { ...prev.capture, [key]: val } }));

  const idee = state.capture.idee;
  const vecu = state.capture.vecu;
  const pourquoi = state.capture.pourquoi;

  const canNext = idee.length >= 10 && vecu.length >= 30 && pourquoi.length >= 20;

  return (
    <div>
      <StepEyebrow>Capture express</StepEyebrow>
      <StepTitle>Pose ton idée à plat</StepTitle>
      <StepSub>
        Pas de bilan. Pas de brainstorm. Tu sais ce que tu veux faire. Tu poses ça en 3 phrases
        honnêtes, et on passe au stress-test.
      </StepSub>

      <InputBlock>
        <InputLabel>💡 Mon idée en 1 phrase</InputLabel>
        <TextInput
          value={idee}
          onChange={(e) => set("idee")(e.target.value)}
          placeholder="Ex : Programme pour apprendre à vivre du cake design"
        />
        <InputHelper>
          Ne dis pas "coaching de vie". Sois concret sur le domaine et l'objectif.
        </InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>📖 Mon vécu sur ce sujet</InputLabel>
        <TextArea
          rows={4}
          value={vecu}
          onChange={(e) => set("vecu")(e.target.value)}
          placeholder="Ex : Je suis cake designer depuis 4 ans, passée d'amateur à 4500€/mois en 24 mois en travaillant depuis chez moi. Spécialisée wedding cakes premium."
        />
        <InputHelper>Pas une bio. Concrètement, qu'est-ce que tu as VÉCU sur ce sujet ?</InputHelper>
      </InputBlock>

      <InputBlock>
        <InputLabel>🎯 Pourquoi cette niche spécifiquement</InputLabel>
        <TextArea
          rows={3}
          value={pourquoi}
          onChange={(e) => set("pourquoi")(e.target.value)}
          placeholder="Ex : Parce que j'ai vu trop de passionnées de cake design galérer à monétiser, et j'ai trouvé une méthode qui marche."
        />
        <InputHelper>Pas "parce que ça paye bien". La vraie raison.</InputHelper>
      </InputBlock>

      <div
        className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-[12px] leading-[1.6]"
        style={{
          background: "rgba(255,180,80,0.06)",
          border: "0.5px solid rgba(255,180,80,0.3)",
          color: "#FFB450",
        }}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Ce qui suit va piquer.</strong> Si tes 3 réponses ci-dessus sont du bullshit, le
          stress-test va te le dire frontalement. Réponds vrai dès maintenant — ça t'évitera de
          revenir.
        </div>
      </div>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Btn>
        <Btn variant="primary" disabled={!canNext} onClick={onNext}>
          Stress-test
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
    </div>
  );
}
