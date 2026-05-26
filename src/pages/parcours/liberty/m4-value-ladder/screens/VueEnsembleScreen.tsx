import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, Actions } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import type { M4State } from "../lib/types";

interface Props { state: M4State; setState: (n: (p: M4State) => M4State) => void; onBack: () => void; onNext: () => void; }

export function VueEnsembleScreen({ onBack, onNext }: Props) {
  return (
    <div>
      <StepHeader current={1} total={4} title="Vue d'ensemble (à implémenter Sprint 2)" sub="Les 4 marches conceptuelles + ladder SVG + High-ticket pré-rempli depuis M3." />
      <Actions>
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />Retour</Btn>
        <Btn variant="primary" onClick={onNext}>Suivant<ArrowRight className="h-4 w-4" /></Btn>
      </Actions>
    </div>
  );
}
