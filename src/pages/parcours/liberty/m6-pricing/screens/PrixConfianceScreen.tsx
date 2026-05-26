import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M6State } from "../lib/types";

interface Props { state: M6State; setState: (n: (p: M6State) => M6State) => void; onBack: () => void; onNext: () => void; }

export function PrixConfianceScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={4} total={7} title="Prix PAR la confiance (Sprint 3)" sub="Slider confiance 0-100 · prix temporaire si <70 · plan d'augmentation déclenché par X clients satisfaits." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
