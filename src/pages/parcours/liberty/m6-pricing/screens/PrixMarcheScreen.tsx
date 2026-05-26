import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M6State } from "../lib/types";

interface Props { state: M6State; setState: (n: (p: M6State) => M6State) => void; onBack: () => void; onNext: () => void; }

export function PrixMarcheScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={3} total={7} title="Prix PAR le marché (Sprint 3)" sub="3 concurrents · prix marché moyen calculé · positionnement (jamais le moins cher)." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
