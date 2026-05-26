import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M7State } from "../lib/types";

interface Props { state: M7State; setState: (n: (p: M7State) => M7State) => void; onBack: () => void; onNext: () => void; }

export function ExposeGarantieScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={5} total={6} title="Pitch d'exposition (Sprint 4)" sub="Pitch 120+ chars + formule marketing. Anti-cheat « montre, ne raconte pas »." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
