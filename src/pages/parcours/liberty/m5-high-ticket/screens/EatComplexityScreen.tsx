import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M5State } from "../lib/types";

interface Props { state: M5State; setState: (n: (p: M5State) => M5State) => void; onBack: () => void; onNext: () => void; }

export function EatComplexityScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={3} total={5} title="Eat the Complexity (à implémenter Sprint 4)" sub="Pour chaque étape client, ce que TOI tu manges (digère pour lui) vs ce qui reste à sa charge." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
