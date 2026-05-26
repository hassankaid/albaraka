import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M7State } from "../lib/types";

interface Props { state: M7State; setState: (n: (p: M7State) => M7State) => void; onBack: () => void; onNext: () => void; }

export function TypeGarantieScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={1} total={6} title="Type de garantie (Sprint 2)" sub="3 types : Refund / Continuité / Paiement aux résultats + justification 80+." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
