import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M5State } from "../lib/types";

interface Props { state: M5State; setState: (n: (p: M5State) => M5State) => void; onBack: () => void; onNext: () => void; }

export function PontScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={1} total={5} title="Le pont (à implémenter Sprint 2)" sub="Point A · douleur dominante · point B · résultat mesurable + délai." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
