import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M6State } from "../lib/types";

interface Props { state: M6State; setState: (n: (p: M6State) => M6State) => void; onBack: () => void; onNext: () => void; }

export function PrixValeurScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={2} total={7} title="Prix PAR la valeur — ROI ≥ 5 (Sprint 2)" sub="Résultat client 12 mois / Prix HT / ROI calculé / Justification chiffrage." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
