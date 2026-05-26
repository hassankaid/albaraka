import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M7State } from "../lib/types";

interface Props { state: M7State; setState: (n: (p: M7State) => M7State) => void; onBack: () => void; onNext: () => void; }

export function MathGarantieScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={4} total={6} title="Math rentabilité (Sprint 3)" sub="Calcul net positif obligatoire. Anti-cheat delta négatif." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
